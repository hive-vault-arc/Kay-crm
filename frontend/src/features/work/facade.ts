import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { calendarWorkQuerySchema, calendarWorkSchema, editTaskSchema, followUpSchema, newTaskSchema, notificationQuerySchema, notificationsSchema, pageQuerySchema, readSchema, resultSchema, taskActionSchema, taskHistorySchema, taskQuerySchema, taskSchema, tasksSchema, workContextSchema } from "./contracts";

import { holidayConfirmationSchema, holidaySettingsSchema } from "./holiday-contracts";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const allowedErrors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "RECORD_ARCHIVED", "IDEMPOTENCY_CONFLICT", "VERSION_CONFLICT", "TASK_TERMINAL", "INVALID_TASK_OWNER", "INVALID_TASK_CONTEXT", "INVALID_WORK_CONTEXT", "ENQUIRY_CONTEXT_REQUIRED", "HOLIDAYS_DISABLED"]);
export async function relayWork(key: string, request: Request, requestId: string) {
  const method = request.method, list = key === "tasks", inbox = key === "notifications", followup = key === "visits/follow-up", context = key === "work/context", calendar = key === "work/calendar";
  const record = new RegExp(`^tasks/${id}$`).test(key), history = new RegExp(`^tasks/${id}/history$`).test(key), action = new RegExp(`^tasks/${id}/(complete|cancel)$`).test(key), read = new RegExp(`^notifications/${id}/read$`).test(key);
  const holidays = key === "work/holidays", confirm = new RegExp(`^work/holidays/${id}/confirm$`).test(key);
  if (!((list && ["GET", "POST"].includes(method)) || (record && ["GET", "PATCH"].includes(method)) || ((history || inbox || followup || context || calendar || holidays) && method === "GET") || ((action || read || confirm) && method === "POST"))) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams];
  const querySchema = list ? taskQuerySchema : inbox ? notificationQuerySchema : calendar ? calendarWorkQuerySchema : followup || history ? pageQuerySchema : z.object({}).strict();
  if (new Set(params.map(([k]) => k)).size !== params.length || !(method === "GET" ? querySchema : z.object({}).strict()).safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  const mutation = method !== "GET", retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = list ? newTaskSchema : record ? editTaskSchema : read ? z.object({}).strict() : confirm ? holidayConfirmationSchema : taskActionSchema;
    try { const parsed = schema.safeParse(await boundedJson(request, 32768)); if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(parsed.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST" | "PATCH", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024, birthdayNotifications: inbox, holidayNotifications: inbox || read });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && allowedErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    const schema = mutation ? read ? readSchema : resultSchema : list ? tasksSchema : inbox ? notificationsSchema : record ? taskSchema : history ? taskHistorySchema : followup ? followUpSchema : calendar ? calendarWorkSchema : holidays ? holidaySettingsSchema : workContextSchema;
    const output = schema.parse(response.body);
    if (confirm && ("id" in output ? output.id !== key.split("/")[2] : true)) return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId);
    return Response.json(output, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
