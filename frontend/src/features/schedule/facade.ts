import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { availabilityQuerySchema, availabilitySchema, calendarContextSchema, busySchema, calendarQuerySchema, colleaguesSchema, editVisitSchema, historySchema, localTimeSchema, newVisitSchema, policyEditSchema, policyPreviewSchema, policySaveSchema, policySchema, resultSchema, visitActionSchema, visitFinishSchema, visitSchema, visitsSchema } from "./contracts";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const allowedErrors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "IDEMPOTENCY_CONFLICT", "VERSION_CONFLICT", "SCHEDULE_REPREVIEW_REQUIRED", "VISIT_TERMINAL", "VISIT_STATE_UNCHANGED", "INVALID_STATE", "INVALID_VISIT_PARTICIPANT", "INVALID_VISIT_CONTEXT", "VISIT_SCHEDULE_NOT_CONFIGURED", "VISIT_OUTSIDE_WORKING_HOURS", "VISIT_LUNCH_BREAK", "COMPANY_CAR_CAPACITY_FULL", "VISIT_OVERLAP_REASON_REQUIRED"]);
export async function relaySchedule(key: string, request: Request, requestId: string) {
  const method = request.method;
  const policy = key === "visit-schedule/policy", preview = key === "visit-schedule/policy/preview", list = key === "visits";
  const record = new RegExp(`^visits/${id}$`).test(key), history = new RegExp(`^visits/${id}/history$`).test(key);
  const action = new RegExp(`^visits/${id}/(confirm|reschedule|complete|cancel)$`).test(key);
  const busy = key === "calendar/free-busy", availability = key === "calendar/availability", colleagues = key === "calendar/colleagues", clock = key === "calendar/local-time", context = key === "calendar/context";
  if (!((policy && ["GET", "PUT"].includes(method)) || (preview && method === "POST") || (list && ["GET", "POST"].includes(method)) || (record && ["GET", "PATCH"].includes(method)) || (action && method === "POST") || ((history || busy || availability || colleagues || clock || context) && method === "GET"))) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams], query = Object.fromEntries(params);
  const querySchema = list || busy ? calendarQuerySchema : availability ? availabilityQuerySchema : colleagues ? z.object({ contact_id: z.uuid().optional() }).strict() : clock ? z.object({ local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) }).strict() : z.object({}).strict();
  if (new Set(params.map(([k]) => k)).size !== params.length || !(method === "GET" ? querySchema : z.object({}).strict()).safeParse(query).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  const mutation = method !== "GET", retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = preview ? policyEditSchema : policy ? policySaveSchema : list ? newVisitSchema : record || key.endsWith("/reschedule") ? editVisitSchema : key.endsWith("/confirm") ? visitActionSchema : visitFinishSchema;
    try { const parsed = schema.safeParse(await boundedJson(request, 32768)); if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(parsed.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST" | "PATCH" | "PUT", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0,128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && allowedErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    const schema = policy || preview ? mutation ? policyPreviewSchema : policySchema : mutation ? resultSchema : list ? visitsSchema : record ? visitSchema : history ? historySchema : busy ? busySchema : availability ? availabilitySchema : clock ? localTimeSchema : context ? calendarContextSchema : colleaguesSchema;
    return Response.json(schema.parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
