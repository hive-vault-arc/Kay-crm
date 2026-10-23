import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import {
  newProjectLinkSchema, projectLinkQuerySchema, projectLinkResultSchema,
  projectLinksSchema, removeProjectLinkSchema,
} from "./contracts";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const listRoute = new RegExp(`^(enquiries|deals)/${id}/project-links$`);
const itemRoute = new RegExp(`^(enquiries|deals)/${id}/project-links/${id}$`);
const allowedErrors = new Set([
  "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND",
  "VALIDATION_ERROR", "CONTACT_ARCHIVED", "IDEMPOTENCY_CONFLICT", "PROJECT_LINK_EXISTS",
]);

export async function relayProjectLinks(key: string, request: Request, requestId: string) {
  const list = listRoute.test(key); const item = itemRoute.test(key);
  const method = request.method;
  if (!(list && ["GET", "POST"].includes(method) || item && method === "DELETE")) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url); const params = [...url.searchParams];
  if (method === "GET" ? new Set(params.map(([name]) => name)).size !== params.length || !projectLinkQuerySchema.safeParse(Object.fromEntries(params)).success : Boolean(url.search)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const mutation = method !== "GET";
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try {
      const parsed = (method === "POST" ? newProjectLinkSchema : removeProjectLinkSchema).safeParse(await boundedJson(request, 32768));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, {
      method: method as "GET" | "POST" | "DELETE", body, token: jar.get(SESSION_COOKIE)?.value,
      csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128),
      origin: mutation ? frontendOrigin() : undefined,
      idempotencyKey: mutation ? retryKey : undefined, maxResponseBytes: 2 * 1024 * 1024,
    });
    if (upstream.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = parsed.success && allowedErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId);
    }
    return Response.json((mutation ? projectLinkResultSchema : projectLinksSchema).parse(upstream.body), {
      headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
    });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
