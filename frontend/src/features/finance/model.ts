import { apiGet, ApiError } from "@/lib/api/client";
import { dealSchema } from "@/features/deals/contracts";
import { commissionSchema, receiptsSchema, type Commission, type Receipt } from "./contracts";

export const FINANCE_PAGE_SIZE = 20;
export const financePageValid = (value: { page: number; page_size: number; items: { id: string }[] }, page: number) => value.page === page && value.page_size === FINANCE_PAGE_SIZE && value.items.length <= FINANCE_PAGE_SIZE && new Set(value.items.map(item => item.id)).size === value.items.length;
export type FinanceSelection = { commission: Commission; mode?: "commission" | "receipt" | "recognize" };
export async function readCommission(id: string, dealId: string, signal?: AbortSignal) {
  const value = await apiGet(`/api/v1/commissions/${id}`, commissionSchema, signal);
  if (value.id !== id || value.deal_id !== dealId || value.current.version !== value.version) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  return value;
}
export async function readFinanceDeal(id: string, signal?: AbortSignal) {
  const value = await apiGet(`/api/v1/deals/${id}`, dealSchema, signal);
  if (value.id !== id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  return value;
}
export async function receiptStillCurrent(commissionId: string, original: Receipt, page: number, signal?: AbortSignal) {
  const value = await apiGet(`/api/v1/commissions/${commissionId}/receipts?page=${page}&page_size=${FINANCE_PAGE_SIZE}`, receiptsSchema, signal);
  if (!financePageValid(value, page) || value.items.some(item => item.commission_id !== commissionId)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const current = value.items.find(item => item.id === original.id);
  if (!current) return "Cet encaissement ne figure plus sur cette page. Revenez aux encaissements et rechargez la liste avant de le sélectionner.";
  if (!current.valid) return "Cet encaissement a déjà été remplacé ou annulé. Revenez aux encaissements pour sélectionner une entrée actuelle.";
  if (JSON.stringify(current) !== JSON.stringify(original)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
}
export const financeDenied = (error: ApiError) => [401, 403, 404].includes(error.status) || ["CONTACT_ARCHIVED", "RECORD_ARCHIVED"].includes(error.code);
