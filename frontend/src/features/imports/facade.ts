import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { approveSchema, batchPageSchema, batchSchema, createSchema, permitSchema, previewSchema } from "./contracts";

const errors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT", "INVALID_ASSIGNEE", "IMPORT_HEADER_INVALID", "IMPORT_CSV_INVALID", "IMPORT_EMPTY", "IMPORT_ROW_LIMIT", "IMPORT_FILE_TOO_LARGE", "IMPORT_REPREVIEW_REQUIRED", "INVALID_IMPORT_ROWS", "IMPORT_ALREADY_APPROVED", "IMPORT_UPLOAD_REQUIRED", "IMPORT_ALREADY_UPLOADED", "FILE_STORAGE_UNAVAILABLE", "FILE_INTEGRITY_ERROR"]);
export async function relayImports(key: string, request: Request, requestId: string) {
  const [module, id, action, extra] = key.split("/"), method = request.method;
  const create = key === "imports" && method === "POST", read = module === "imports" && z.uuid().safeParse(id).success && !action && method === "GET";
  const write = module === "imports" && z.uuid().safeParse(id).success && ["preview", "approve", "upload-permit"].includes(action) && !extra && method === "POST";
  if (!create && !read && !write) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams];
  const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(1000000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() }).strict();
  if (new Set(params.map(([name]) => name)).size !== params.length || !(read ? pageQuery : z.object({}).strict()).safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (create || write) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if ((create || action === "approve") && !z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try { const schema = create ? createSchema : action === "preview" ? previewSchema : action === "approve" ? approveSchema : z.object({}).strict(); const parsed = schema.safeParse(await boundedJson(request, 32768)); if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(parsed.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: read ? undefined : frontendOrigin(), idempotencyKey: retryKey, maxResponseBytes: 4 * 1024 * 1024, timeoutMs: 60_000 });
    if (upstream.status !== 200) { const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body); const code = parsed.success && errors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE"; return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId); }
    const result = (read ? batchPageSchema : action === "upload-permit" ? permitSchema : batchSchema).parse(upstream.body);
    if ("transfer_url" in result) { const transfer = new URL(result.transfer_url), expected = new URL(process.env.API_BASE_URL ?? ""); if (transfer.origin !== expected.origin || transfer.pathname !== `/api/v1/transfers/imports/${id}` || transfer.search || transfer.hash || transfer.username || transfer.password) throw new Error("INVALID_TRANSFER_TARGET"); }
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
