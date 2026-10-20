import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { frenchApiError } from "@/lib/api/errors";
import { generateBodySchema, generatedContextSchema, generatedHistorySchema, generatedItemSchema, generatedParentSchema } from "./contracts";

const query = generatedParentSchema.extend({ page: z.coerce.number().int().min(1).max(1_000_000).optional() }).strict();
const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED", "FILE_TOO_LARGE", "FILE_STORAGE_UNAVAILABLE"]);

export async function relayGenerated(key: string, request: Request, requestId: string) {
  if (!["generated-documents", "generated-documents/context"].includes(key)) return facadeError(404, "NOT_FOUND", requestId);
  const read = request.method === "GET";
  const write = request.method === "POST" && key === "generated-documents";
  if (!read && !write) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const entries = [...url.searchParams];
  if (new Set(entries.map(([name]) => name)).size !== entries.length || (read ? !query.safeParse(Object.fromEntries(entries)).success || (key.endsWith("/context") && url.searchParams.has("page")) : entries.length > 0)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (write) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try {
      const parsed = generateBodySchema.safeParse(await boundedJson(request, 32 * 1024));
      if (!parsed.success || Object.keys(parsed.data.values).length > 30) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: request.method as "GET" | "POST", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: write ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 256 * 1024, timeoutMs: write ? 35_000 : 8_000 });
    if (upstream.status !== 200) {
      const result = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = result.success && known.has(result.data.error.code) ? result.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return Response.json({ error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId } }, { status: code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
    }
    const result = (write ? generatedItemSchema : key.endsWith("/context") ? generatedContextSchema : generatedHistorySchema).parse(upstream.body);
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
