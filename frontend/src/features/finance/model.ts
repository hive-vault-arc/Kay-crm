import { apiGet, ApiError } from "@/lib/api/client";
import { dealSchema } from "@/features/deals/contracts";
import { commissionSchema, receiptsSchema, type Commission, type Receipt } from "./contracts";

export const FINANCE_PAGE_SIZE = 20;
export const financePageValid = (value: { page: number; page_size: number; items: { id: string }[] }, page: number) => value.page === page && value.page_size === FINANCE_PAGE_SIZE && value.items.length <= FINANCE_PAGE_SIZE && new Set(value.items.map(item => item.id)).size === value.items.length;
export type FinanceSelection = { commission: Commission; mode: "commission" | "receipt" | "recognize"; original?: Receipt; receiptPage?: number };
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

export type FinanceReturn = { id?: string; receiptId?: string; action: string; scroll: number; started?: boolean };
export function restoreFinanceReturn(root: HTMLElement | null, heading: HTMLElement | null, value: FinanceReturn, readyCommissionId?: string, collectionReady = true) {
  if (!root || !heading) return false;
  // A delayed receipt response must not take focus back after the user moved on.
  const active = root.ownerDocument?.activeElement;
  if (value.started && active && active !== heading) return true;
  const card = value.id ? root.querySelector<HTMLElement>(`[data-finance-id="${value.id}"]`) : root;
  const receipt = value.receiptId ? card?.querySelector<HTMLElement>(`[data-finance-receipt-id="${value.receiptId}"]`) : undefined;
  const target = (value.receiptId ? receipt : card)?.querySelector<HTMLElement>(`[data-action="${value.action}"]`);
  if (!collectionReady || card && value.receiptId && !target && readyCommissionId !== value.id) {
    if (!value.started) { heading.focus({ preventScroll: true }); value.started = true; }
    return false;
  }
  (target ?? heading).focus({ preventScroll: true });
  const body = root.closest<HTMLElement>(".kay-drawer-body"); if (body) body.scrollTop = value.scroll;
  return true;
}
