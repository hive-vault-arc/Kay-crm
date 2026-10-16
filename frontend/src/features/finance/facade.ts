import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { commissionSchema, commissionsSchema, correctionSchema, financeQuerySchema, newCommissionSchema, receiptCommandSchema, receiptsSchema, recognitionSchema, resultSchema, revisionsSchema } from "./contracts";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const errors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "IDEMPOTENCY_CONFLICT", "VERSION_CONFLICT", "COMMISSION_ALREADY_RECOGNIZED", "COMMISSION_NOT_RECOGNIZED", "COMMISSION_BELOW_COLLECTIONS", "OVER_COLLECTION", "RECEIPT_ALREADY_CORRECTED", "INVALID_FINANCIAL_EVIDENCE"]);
export async function relayFinance(key: string, request: Request, requestId: string) {
  const method = request.method, list = new RegExp(`^deals/${id}/commissions$`).test(key), detail = new RegExp(`^commissions/${id}$`).test(key), history = new RegExp(`^commissions/${id}/revisions$`).test(key), receipts = new RegExp(`^commissions/${id}/receipts$`).test(key), recognize = new RegExp(`^commissions/${id}/recognize$`).test(key), correct = new RegExp(`^commissions/${id}/correct$`).test(key);
  if (!((list && ["GET", "POST"].includes(method)) || ((detail || history || receipts) && method === "GET") || ((receipts || recognize || correct) && method === "POST"))) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url), params = [...url.searchParams], mutation = method === "POST";
  if (new Set(params.map(([k]) => k)).size !== params.length || !(method === "GET" && !detail ? financeQuerySchema : z.object({}).strict()).safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = list ? newCommissionSchema : recognize ? recognitionSchema : correct ? correctionSchema : receiptCommandSchema;
    try { const parsed = schema.safeParse(await boundedJson(request, 32768)); if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(parsed.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && errors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    return Response.json((mutation ? resultSchema : list ? commissionsSchema : detail ? commissionSchema : history ? revisionsSchema : receiptsSchema).parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
