import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { childQuerySchema, dealSchema, dealsSchema, editDealSchema, editOfferSchema, historySchema, newDealSchema, newOfferSchema, offersSchema, querySchema, resultSchema, transitionSchema } from "./contracts";
import { releaseSchema, reserveSchema } from "./contracts";
import { closeSchema, reopenSchema, dealStockReviewSchema, outcomesSchema } from "@/features/inventory/outcome-contracts";
import { convertLeadSchema } from "./qualification-contracts";
import { duplicateSchema, privateConflictSchema } from "@/features/contacts/contracts";
import { frenchApiError } from "@/lib/api/errors";

const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
const allowedErrors = new Set(["UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONTACT_ARCHIVED", "IDEMPOTENCY_CONFLICT", "DEAL_VERSION_CONFLICT", "DEAL_STAGE_UNCHANGED", "DEAL_DEDICATED_COMMAND_REQUIRED", "INVALID_DEAL_CONTEXT", "OFFERING_INTENT_MISMATCH", "INVALID_PRICE_PERIOD", "OFFERING_VERSION_CONFLICT"]);
export async function relayDeals(key: string, request: Request, requestId: string) {
  for (const code of ["INVALID_PHONE", "INVALID_ASSIGNEE", "PHONE_OWNED_ELSEWHERE", "DUPLICATE_CONFIRMATION_REQUIRED"]) allowedErrors.add(code);
  for (const code of ["VERSION_CONFLICT", "LANGUAGES_REQUIRED", "LEAD_ALREADY_CONVERTED", "LEAD_CONVERSION_REQUIRED", "PROJECT_UNAVAILABLE", "PROJECT_DEVELOPMENT_REQUIRED", "PROJECT_REQUIRED"]) allowedErrors.add(code);
  allowedErrors.add("DEAL_OFFER_PERIOD_MISMATCH");
  for (const code of ["RESERVATION_CONFLICT", "DEVELOPMENT_OVERLAP", "RESERVATION_RELEASE_REQUIRED", "RESERVATION_NOT_ACTIVE", "DEAL_TARGET_CHANGED", "OFFERING_NOT_AVAILABLE", "INVENTORY_VERSION_CONFLICT", "STOCK_REVIEW_REQUIRED", "AVAILABILITY_PRICE_REQUIRED", "AVAILABILITY_OWNER_REQUIRED", "DEVELOPMENT_UNITS_REQUIRED"]) allowedErrors.add(code);
  const method = request.method;
  const list = key === "deals";
  const conversion = new RegExp(`^enquiries/${id}/convert$`).test(key);
  const record = new RegExp(`^deals/${id}$`).test(key);
  const transition = new RegExp(`^deals/${id}/transition$`).test(key);
  const offers = new RegExp(`^deals/${id}/customer-offers$`).test(key);
  const offer = new RegExp(`^customer-offers/${id}$`).test(key);
  const history = new RegExp(`^deals/${id}/history$`).test(key);
  const reserve = new RegExp(`^deals/${id}/reserve$`).test(key);
  const release = new RegExp(`^deals/${id}/release-reservation$`).test(key);
  const close = new RegExp(`^deals/${id}/close$`).test(key);
  const reopen = new RegExp(`^deals/${id}/reopen$`).test(key);
  const review = new RegExp(`^deals/${id}/stock-review$`).test(key);
  const outcomes = new RegExp(`^deals/${id}/outcomes$`).test(key);
  for (const code of ["DEAL_TARGET_REQUIRED", "DEAL_ALREADY_CLOSED", "DEAL_NOT_CLOSED", "STOCK_REVIEW_CHANGED", "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED"]) allowedErrors.add(code);
  if (!((list && ["GET", "POST"].includes(method)) || (record && ["GET", "PATCH"].includes(method)) || (offers && ["GET", "POST"].includes(method)) || ((conversion || transition || reserve || release || close || reopen) && method === "POST") || (offer && method === "PATCH") || ((history || review || outcomes) && method === "GET"))) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url); const params = [...url.searchParams];
  const qs = list ? querySchema : childQuerySchema;
  if (method === "GET" && !record && !review ? new Set(params.map(([k]) => k)).size !== params.length || !qs.safeParse(Object.fromEntries(params)).success : Boolean(url.search)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const mutation = method !== "GET"; const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = conversion ? convertLeadSchema : list ? newDealSchema : record ? editDealSchema : close ? closeSchema : reopen ? reopenSchema : reserve ? reserveSchema : release ? releaseSchema : transition ? transitionSchema : offers ? newOfferSchema : editOfferSchema;
    try { const parsed = schema.safeParse(await boundedJson(request, 32768)); if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId); body = JSON.stringify(parsed.data); }
    catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const response = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: method as "GET" | "POST" | "PATCH", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (response.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(response.body);
      const code = parsed.success && allowedErrors.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      if (code === "PHONE_OWNED_ELSEWHERE" || code === "DUPLICATE_CONFIRMATION_REQUIRED") {
        const details = (code === "PHONE_OWNED_ELSEWHERE" ? privateConflictSchema : duplicateSchema).parse(response.body);
        return Response.json({ error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId }, ...details }, { status: response.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
      }
      return facadeError(code === "DEPENDENCY_UNAVAILABLE" ? 503 : response.status, code, requestId);
    }
    const schema = mutation ? resultSchema : list ? dealsSchema : record ? dealSchema : review ? dealStockReviewSchema : outcomes ? outcomesSchema : offers ? offersSchema : historySchema;
    return Response.json(schema.parse(response.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
