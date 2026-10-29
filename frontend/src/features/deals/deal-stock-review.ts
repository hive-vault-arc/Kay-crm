import { apiGet, ApiError } from "@/lib/api/client";
import { dealStockReviewSchema, type DealStockReview } from "@/features/inventory/outcome-contracts";
import { dealSchema, type Deal } from "./contracts";

export type ReviewedDealStock = { deal: Deal; stockReview?: DealStockReview };
export async function readDealStock(opening: Deal, effects: boolean, signal: AbortSignal): Promise<ReviewedDealStock> {
  const path = `/api/v1/deals/${opening.id}` as const;
  const deal = await apiGet(path, dealSchema, signal);
  if (signal.aborted || deal.id !== opening.id || deal.version < opening.version) throw new ApiError("INVALID_RESPONSE", 503);
  if (!effects) return { deal };
  const stockReview = await apiGet(`${path}/stock-review`, dealStockReviewSchema, signal), after = await apiGet(path, dealSchema, signal);
  if (signal.aborted || after.id !== opening.id || after.version !== deal.version || stockReview.expected_version !== deal.version || JSON.stringify(after.offering) !== JSON.stringify(deal.offering)) throw new ApiError("DEAL_VERSION_CONFLICT", 409);
  if (JSON.stringify(stockReview.offering) !== JSON.stringify(deal.offering)) throw new ApiError("INVALID_RESPONSE", 503);
  const offering = deal.offering, target = offering?.target, stock = stockReview.stock;
  if (offering ? !stock || !target || stock.offering_id !== offering.id || stock.expected_offering_version !== offering.version || stock.expected_target_version !== target.version || stock.expected_development_version !== target.development_version : Boolean(stock)) throw new ApiError("INVALID_RESPONSE", 503);
  return { deal, stockReview };
}
