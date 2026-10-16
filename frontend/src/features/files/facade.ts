import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { frenchApiError } from "@/lib/api/errors";
import { documentSchema, documentsSchema, fileCommandSchema, newDocumentSchema, parentSchema, permitRequestSchema, permitSchema } from "./contracts";

const querySchema = parentSchema.extend({ page: z.coerce.number().int().min(1).max(100000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() }).strict();
const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT", "RATE_LIMITED", "UNSUPPORTED_MEDIA_TYPE", "FILE_VERSION_CONFLICT", "FILE_NOT_CLEAN", "FILE_SCAN_NOT_PENDING", "FILE_SCAN_IN_PROGRESS"]);
export async function relayFiles(key: string, request: Request, requestId: string) {
  const parts = key.split("/");
  const documentTarget = parts[0] === "documents" && parts.length >= 2 && z.uuid().safeParse(parts[1]).success;
  const read = request.method === "GET" && (key === "documents" || (documentTarget && parts.length === 2));
  const write = request.method === "POST" && (key === "documents" || key === "files/permits" || (documentTarget && parts.length === 3 && ["archive", "retry-scan"].includes(parts[2])));
  if (!read && !write) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const entries = [...url.searchParams];
  if (new Set(entries.map(([name]) => name)).size !== entries.length || (key === "documents" && read ? !querySchema.safeParse(Object.fromEntries(entries)).success : entries.length > 0)) return facadeError(422, "VALIDATION_ERROR", requestId);
  let body: string | undefined;
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  if (write) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (key !== "files/permits" && !z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try {
      const schema = key === "files/permits" ? permitRequestSchema : key === "documents" ? newDocumentSchema : fileCommandSchema;
      const parsed = schema.safeParse(await boundedJson(request, 8192));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: request.method as "GET" | "POST", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: write ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (upstream.status !== 200) {
      const result = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = result.success && known.has(result.data.error.code) ? result.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return Response.json({ error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId } }, { status: code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
    }
    const schema = key === "files/permits" ? permitSchema : read && key === "documents" ? documentsSchema : documentSchema;
    const result = schema.parse(upstream.body);
    if ("transfer_url" in result) {
      const transfer = new URL(result.transfer_url);
      const expected = new URL(process.env.API_BASE_URL ?? "");
      if (transfer.origin !== expected.origin || transfer.pathname !== `/api/v1/transfers/${result.permit_id}` || transfer.search || transfer.hash || transfer.username || transfer.password) throw new Error("INVALID_TRANSFER_TARGET");
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
