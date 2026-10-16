import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { auditQuerySchema, auditSchema, exportSchema, exportsSchema, newExportSchema, pageQuerySchema, permitSchema, searchQuerySchema, searchSchema } from "./contracts";

const known = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "IDEMPOTENCY_CONFLICT", "EXPORT_NOT_READY", "FILE_INTEGRITY_ERROR", "FILE_STORAGE_UNAVAILABLE"]);
export async function relayDiscovery(key: string, request: Request, requestId: string) {
  const [module, id, action, extra] = key.split("/");
  const get = request.method === "GET", create = key === "exports" && request.method === "POST";
  const permit = module === "exports" && z.uuid().safeParse(id).success && action === "download-permit" && !extra && request.method === "POST";
  const detail = module === "exports" && z.uuid().safeParse(id).success && !action && get;
  if (!(get && ["search", "audit/events", "exports"].includes(key)) && !detail && !create && !permit) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams];
  const query = get && !detail ? key === "search" ? searchQuerySchema : key === "audit/events" ? auditQuerySchema : pageQuerySchema : z.object({}).strict();
  if (new Set(params.map(([name]) => name)).size !== params.length || !query.safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  let body: string | undefined;
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  if (!get) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (create && !z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    try { body = JSON.stringify((create ? newExportSchema : z.object({}).strict()).parse(await boundedJson(request, 8192))); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: get ? "GET" : "POST", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: get ? undefined : frontendOrigin(), idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (upstream.status !== 200) { const error = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body), code = error.success && known.has(error.data.error.code) ? error.data.error.code : "DEPENDENCY_UNAVAILABLE"; return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, code, requestId); }
    const result = (key === "search" ? searchSchema : key === "audit/events" ? auditSchema : permit ? permitSchema : create || detail ? exportSchema : exportsSchema).parse(upstream.body);
    if ("transfer_url" in result) { const transfer = new URL(result.transfer_url), origin = new URL(process.env.API_BASE_URL ?? ""); if (transfer.origin !== origin.origin || transfer.pathname !== `/api/v1/transfers/exports/${id}` || transfer.search || transfer.hash || transfer.username || transfer.password) throw new Error("INVALID_TRANSFER_TARGET"); }
    return Response.json(result, { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
