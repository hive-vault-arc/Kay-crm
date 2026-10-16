import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { changeSchema, loginSchema, meSchema, SESSION_COOKIE } from "./contracts";

const tokenResponse = z.object({
  session_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expires_at: z.iso.datetime({ offset: true }),
}).strict();
const upstreamError = z.object({ error: z.object({ code: z.string() }) });
const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/" } as const;

export function frontendOrigin() {
  return process.env.FRONTEND_ORIGIN ?? "https://localhost:3000";
}

export async function boundedJson(request: Request, limit = 8192): Promise<unknown> {
  if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/json")
    throw new Error("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw new Error("INVALID_INPUT"); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}

export async function relayAuth(key: string, request: Request, requestId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const mutation = request.method === "POST";
  if (mutation && request.headers.get("Origin") !== frontendOrigin())
    return facadeError(403, "FORBIDDEN", requestId);
  let body: string | undefined;
  if (key === "auth/login" || key === "auth/change-password") {
    try {
      const schema = key === "auth/login" ? loginSchema : changeSchema;
      const parsed = schema.safeParse(await boundedJson(request));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const upstream = await upstreamRequest(`/api/v1/${key}`, requestId, {
      method: mutation ? "POST" : "GET", body,
      token: key === "auth/login" ? undefined : token,
      csrf: mutation ? request.headers.get("X-CSRF-Token")?.slice(0, 128) : undefined,
      origin: mutation ? frontendOrigin() : undefined,
    });
    if (upstream.status !== 200) {
      const parsed = upstreamError.safeParse(upstream.body);
      const allowed = new Set(["UNAUTHENTICATED", "INVALID_CREDENTIALS", "FORBIDDEN", "RATE_LIMITED", "PASSWORD_POLICY", "PASSWORD_UNCHANGED", "PASSWORD_CHANGE_REQUIRED", "VALIDATION_ERROR"]);
      const code = parsed.success && allowed.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      if (code === "UNAUTHENTICATED") jar.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId);
    }
    let result: unknown;
    if (key === "auth/login") {
      const parsed = tokenResponse.parse(upstream.body);
      const maxAge = Math.min(604800, Math.floor((Date.parse(parsed.expires_at) - Date.now()) / 1000));
      if (maxAge <= 0) throw new Error("INVALID_EXPIRY");
      jar.set(SESSION_COOKIE, parsed.session_token, { ...cookieOptions, maxAge });
      result = { signed_in: true };
    } else if (key === "auth/me") result = meSchema.parse(upstream.body);
    else {
      const schema = key === "auth/logout"
        ? z.object({ signed_out: z.literal(true) }).strict()
        : z.object({ fresh_login_required: z.literal(true) }).strict();
      result = schema.parse(upstream.body);
      jar.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
