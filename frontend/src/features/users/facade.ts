import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { commandSchema, editUserSchema, issuedSchema, namedUserSchema, resetUserSchema, userRoute, userSchema, usersSchema, versionSchema } from "./contracts";

const knownErrors = new Set(["UNAUTHENTICATED", "FORBIDDEN", "PASSWORD_CHANGE_REQUIRED", "VALIDATION_ERROR", "NOT_FOUND", "EMAIL_IN_USE", "VERSION_CONFLICT", "LAST_ADMIN_REQUIRED", "ADMIN_PASSWORD_INVALID", "TEMPORARY_EXPIRED", "INVALID_STATE", "IDEMPOTENCY_CONFLICT", "ONE_TIME_RESULT_UNAVAILABLE", "USE_OWN_PASSWORD_CHANGE", "BOOTSTRAP_REQUIRED", "RATE_LIMITED"]);
export async function relayUsers(key: string, request: Request, requestId: string) {
  if (!userRoute(key, request.method)) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const mutation = request.method !== "GET";
  if (url.search && (key !== "users" || mutation)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const params = [...url.searchParams];
  if (params.some(([k, v]) => !["page", "page_size"].includes(k) || !/^[1-9][0-9]{0,6}$/.test(v)) || new Set(params.map(([k]) => k)).size !== params.length)
    return facadeError(422, "VALIDATION_ERROR", requestId);
  if (mutation && request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
  let body: string | undefined;
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
  if (mutation) {
    if (!z.uuid().safeParse(idempotencyKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = key === "users" ? namedUserSchema : request.method === "PATCH" ? editUserSchema : key.endsWith("/reset-password") ? resetUserSchema : versionSchema;
    try {
      const parsed = schema.safeParse(await boundedJson(request));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, {
      method: request.method as "GET" | "POST" | "PATCH", body, token: jar.get(SESSION_COOKIE)?.value,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined,
      idempotencyKey: mutation ? idempotencyKey : undefined,
    });
    if (upstream.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = parsed.success && knownErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId);
    }
    const schema = mutation ? (key === "users" || key.endsWith("/reset-password") ? issuedSchema : commandSchema) : key === "users" ? usersSchema : userSchema;
    const result = schema.parse(upstream.body);
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
