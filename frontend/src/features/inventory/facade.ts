import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { boundedJson, frontendOrigin } from "@/lib/auth/facade";
import { SESSION_COOKIE } from "@/lib/auth/contracts";
import { facadeError, upstreamRequest } from "@/lib/api/facade";
import { frenchApiError } from "@/lib/api/errors";
import { externalSchema, stockReviewSchema } from "./outcome-contracts";
import { confirmSchema, editOfferingSchema, editPropertySchema, historySchema, inventoryQuerySchema, inventoryRoute, newOfferingSchema, offeringsSchema, ownersSchema, propertiesSchema, propertiesQuerySchema, propertyFieldsSchema, propertySchema, resultSchema } from "./contracts";
import { archiveDevelopmentSchema, blocksSchema, developmentFieldsSchema, developmentSchema, developmentsSchema, editDevelopmentSchema, floorsSchema, inventoryPageSchema, safeLinkSchema, structureFieldsSchema, typeFieldsSchema, unitTypesSchema } from "./development-contracts";

const known = new Set(["STOCK_REVIEW_CHANGED", "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED", "DEVELOPMENT_OVERLAP", "DEAL_TARGET_CHANGED", "RESERVATION_RELEASE_REQUIRED", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "INVENTORY_VERSION_CONFLICT", "AVAILABILITY_PRICE_REQUIRED", "AVAILABILITY_OWNER_REQUIRED", "INVALID_LEGAL_OWNER", "CURRENT_OFFERING_EXISTS", "PROPERTY_REFERENCE_EXISTS", "OFFERING_WITHDRAWN", "CONFIRM_AVAILABILITY_REQUIRED", "IDEMPOTENCY_CONFLICT", "INVALID_HIERARCHY", "STOCK_REVIEW_REQUIRED", "DEVELOPMENT_UNITS_REQUIRED", "DEVELOPMENT_REFERENCE_EXISTS", "HIERARCHY_CODE_EXISTS"]);
const ownerReadSchema = z.object({ owners: z.array(safeLinkSchema).max(100), version: z.number().int().positive() }).strict();
export async function relayInventory(key: string, request: Request, requestId: string) {
  if (!inventoryRoute(key, request.method)) return facadeError(404, "NOT_FOUND", requestId);
  const url = new URL(request.url);
  const mutation = request.method !== "GET";
  const suffix = key.split("/")[2];
  const list = ["properties", "offerings", "developments"].includes(key) || ["history", "inventory", "blocks", "floors", "unit-types", "stock-review"].includes(suffix);
  const params = [...url.searchParams];
  const parsedQuery = suffix === "stock-review" ? z.object({ offering_id: z.uuid() }).strict() : key === "properties" ? propertiesQuerySchema : key === "offerings" ? inventoryQuerySchema.extend({ offering_id: z.uuid().optional() }) : inventoryQuerySchema;
  if ((url.search && (!list || mutation)) || new Set(params.map(([name]) => name)).size !== params.length || !parsedQuery.safeParse(Object.fromEntries(params)).success) return facadeError(422, "VALIDATION_ERROR", requestId);
  const allowed = suffix === "stock-review" ? ["offering_id"] : ["history", "blocks", "floors", "unit-types"].includes(suffix) ? ["page", "page_size"] : suffix === "inventory" ? ["page", "page_size", "q", "category", "block_id", "floor_id", "unit_type_id", "offering_kind", "state"] : key === "offerings" ? ["page", "page_size", "property_id", "development_id", "kind", "state", "target_level", "q", "category", "block_id", "floor_id", "unit_type_id", "min_comparison_mad", "max_comparison_mad", "min_area_sqm", "min_rooms"] : key === "properties" ? ["page", "page_size", "q", "category", "offering_kind", "state", "sort", "development_id", "block_id", "floor_id", "unit_type_id", "target_level"] : key === "developments" ? ["page", "page_size", "q", "category", "offering_kind", "state", "sort"] : [];
  if (key === "offerings") allowed.push("offering_id");
  if (key === "properties") allowed.push("categories");
  if (["properties", "developments"].includes(key) || suffix === "inventory") allowed.push("archive");
  if (allowed && params.some(([name]) => !allowed.includes(name))) return facadeError(422, "VALIDATION_ERROR", requestId);
  if (key === "offerings" && url.searchParams.has("target_level") && !["property", "development", "standalone", "unit"].includes(url.searchParams.get("target_level")!)) return facadeError(422, "VALIDATION_ERROR", requestId);
  const retryKey = request.headers.get("Idempotency-Key") ?? undefined;
  let body: string | undefined;
  if (mutation) {
    if (request.headers.get("Origin") !== frontendOrigin()) return facadeError(403, "FORBIDDEN", requestId);
    if (!z.uuid().safeParse(retryKey).success) return facadeError(422, "VALIDATION_ERROR", requestId);
    const schema = suffix === "external-outcome" ? externalSchema : suffix === "owners" ? ownersSchema : suffix === "confirm-availability" ? confirmSchema : ["archive", "restore"].includes(suffix) ? archiveDevelopmentSchema : key === "developments" ? developmentFieldsSchema : key.startsWith("developments/") && request.method === "PATCH" ? editDevelopmentSchema : suffix === "unit-types" || key.startsWith("unit-types/") ? typeFieldsSchema : suffix === "blocks" || suffix === "floors" || /^(blocks|floors)\//.test(key) ? structureFieldsSchema : request.method === "PATCH" ? key.startsWith("properties/") ? editPropertySchema : editOfferingSchema : key === "properties" ? propertyFieldsSchema : newOfferingSchema;
    try {
      const parsed = schema.safeParse(await boundedJson(request, 131072));
      if (!parsed.success) return facadeError(422, "VALIDATION_ERROR", requestId);
      body = JSON.stringify(parsed.data);
    } catch { return facadeError(422, "VALIDATION_ERROR", requestId); }
  }
  try {
    const jar = await cookies();
    const upstream = await upstreamRequest(`/api/v1/${key}${url.search}`, requestId, { method: request.method as "GET" | "POST" | "PATCH" | "PUT", body, token: jar.get(SESSION_COOKIE)?.value, csrf: request.headers.get("X-CSRF-Token")?.slice(0, 128), origin: mutation ? frontendOrigin() : undefined, idempotencyKey: retryKey, maxResponseBytes: 2 * 1024 * 1024 });
    if (upstream.status !== 200) {
      const parsed = z.object({ error: z.object({ code: z.string() }) }).safeParse(upstream.body);
      const code = parsed.success && known.has(parsed.data.error.code) ? parsed.data.error.code : "DEPENDENCY_UNAVAILABLE";
      return Response.json({ error: { code, message: frenchApiError(code), field_errors: {}, request_id: requestId } }, { status: code === "DEPENDENCY_UNAVAILABLE" ? 503 : upstream.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
    }
    const schema = mutation ? resultSchema : suffix === "stock-review" ? stockReviewSchema : suffix === "history" ? historySchema : suffix === "owners" ? ownerReadSchema : suffix === "inventory" ? inventoryPageSchema : suffix === "blocks" ? blocksSchema : suffix === "floors" ? floorsSchema : suffix === "unit-types" ? unitTypesSchema : key === "developments" ? developmentsSchema : key.startsWith("developments/") ? developmentSchema : key === "properties" ? propertiesSchema : key === "offerings" ? offeringsSchema : propertySchema;
    return Response.json(schema.parse(upstream.body), { headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } });
  } catch { return facadeError(503, "DEPENDENCY_UNAVAILABLE", requestId); }
}
