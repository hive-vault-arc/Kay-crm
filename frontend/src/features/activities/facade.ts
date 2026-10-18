import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { activitiesSchema, activityQuerySchema, activityResultSchema, activityRoute, newActivitySchema } from "./contracts";

const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "CONTACT_MERGED", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED"]);
export async function relayActivities(key: string, request: Request, requestId: string) {
  if (!activityRoute(key, request.method)) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), mutation = request.method === "POST";
  const params = [...url.searchParams];
  if (mutation && url.search || new Set(params.map(([name]) => name)).size !== params.length || !activityQuerySchema.safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  let body: string | undefined;
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try {
      const parsed = newActivitySchema.safeParse(await boundedJson(request, 32768));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, {
      method: mutation ? "POST" : "GET", body, token: jar.get(SESSION_COOKIE)?.value,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined,
      idempotencyKey: mutation ? retryKey : undefined, maxResponseBytes: 4 * 1024 * 1024,
    });
    if (upstream.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = parsed.success && known.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId);
    }
    return Response.json((mutation ? activityResultSchema : activitiesSchema).parse(upstream.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
