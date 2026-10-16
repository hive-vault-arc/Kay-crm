import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { detailSchema, editRequirementSchema, newRequirementSchema, querySchema, removeSchema, requirementsSchema, resultSchema, shortlistSchema } from "./contracts";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const allowedErrors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "IDEMPOTENCY_CONFLICT", "REQUIREMENT_VERSION_CONFLICT", "REQUIREMENT_INTENT_IN_USE", "OFFERING_INTENT_MISMATCH", "OFFERING_VERSION_CONFLICT", "SHORTLIST_LIMIT"]);
export async function relayRequirements(key: string, request: Request, requestId: string) {
  const method = request.method;
  const list = key === "requirements";
  const record = new RegExp(`^requirements/${id}$`).test(key);
  const add = new RegExp(`^requirements/${id}/shortlist$`).test(key);
  const remove = new RegExp(`^requirements/${id}/shortlist/${id}$`).test(key);
  if (!((list && ["GET", "POST"].includes(method)) || (record && ["GET", "PATCH"].includes(method)) || (add && method === "POST") || (remove && method === "DELETE"))) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const params = [...url.searchParams];
  if (method === "GET" && list ? new Set(params.map(([k]) => k)).size !== params.length || !querySchema.safeParse(Object.fromEntries(params)).success : Boolean(url.search)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const mutation = method !== "GET";
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = remove ? removeSchema : add ? shortlistSchema : list ? newRequirementSchema : editRequirementSchema;
    try { const value = schema.safeParse(await boundedJson(request, 32768)); if (!value.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(value.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST" | "PATCH" | "DELETE", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && allowedErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    return Response.json((mutation ? resultSchema : list ? requirementsSchema : detailSchema).parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
