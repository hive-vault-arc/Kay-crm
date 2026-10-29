import { apiGet, ApiError } from "@/lib/api/client";
import { propertySchema } from "./contracts";
import { developmentSchema } from "./development-contracts";
import { stockReviewSchema, type StockReview } from "./outcome-contracts";
import type { InventoryRecord } from "./record-scope";

export type ExternalStockScope = { root: "properties" | "developments"; id: string; offeringId: string; kind: "sale" | "rental"; version: number; offeringVersion: number; actorId?: string; role?: string };
export type ExternalStockReview = { record: InventoryRecord; review?: StockReview; readonly: boolean };
export async function readExternalRecord(scope: ExternalStockScope, minimum: number, signal: AbortSignal): Promise<InventoryRecord> {
  const path = `/api/v1/${scope.root}/${scope.id}` as const;
  const value = scope.root === "properties" ? await apiGet(path, propertySchema, signal) : await apiGet(path, developmentSchema, signal);
  if (signal.aborted || value.id !== scope.id || value.version < minimum) throw new ApiError("INVALID_RESPONSE", 503);
  return value;
}
export async function readExternalStock(scope: ExternalStockScope, minimum: number, offeringMinimum: number, signal: AbortSignal): Promise<ExternalStockReview> {
  const record = await readExternalRecord(scope, minimum, signal), offering = record.offerings.find(value => value.id === scope.offeringId);
  if (record.archived_at || !offering || !offering.is_current || offering.kind !== scope.kind || !["available", "reserved"].includes(offering.state)) return { record, readonly: true };
  const target = offering.target;
  if (!target || target.id !== scope.id || target.version !== record.version || offering.version < offeringMinimum || (scope.root === "properties" ? offering.property_id !== scope.id || target.level === "development" : offering.development_id !== scope.id || target.level !== "development")) throw new ApiError("INVALID_RESPONSE", 503);
  const review = await apiGet(`/api/v1/${scope.root}/${scope.id}/stock-review?offering_id=${scope.offeringId}`, stockReviewSchema, signal), after = await readExternalRecord(scope, record.version, signal);
  if (after.version !== record.version || JSON.stringify(after.offerings.find(value => value.id === scope.offeringId)) !== JSON.stringify(offering)) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409);
  if (review.offering_id !== offering.id || review.expected_target_version !== record.version || review.expected_offering_version !== offering.version || review.expected_development_version !== target.development_version || review.effect_count < review.effects.length || new Set(review.effects.map(value => value.offering_id)).size !== review.effects.length) throw new ApiError("INVALID_RESPONSE", 503);
  return { record: after, review, readonly: false };
}
