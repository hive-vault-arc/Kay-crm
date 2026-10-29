import { z } from "zod";
import { calculatedAmount, correctCommissionSchema, correctReceiptSchema, financeResultMatches, newCommissionSchema, receiptCommandSchema, recognitionSchema, type Commission } from "./contracts";

export type FinanceScope = { dealId: string; commissionId?: string };
export type FinanceIntent = FinanceScope & { path: `/api/v1/${string}`; expectedVersion: number } & (
  { kind: "create"; body: z.infer<typeof newCommissionSchema> } |
  { kind: "terms"; body: z.infer<typeof correctCommissionSchema> } |
  { kind: "recognize"; body: z.infer<typeof recognitionSchema> } |
  { kind: "receipt"; body: z.infer<typeof receiptCommandSchema> } |
  { kind: "receipt-correct"; body: z.infer<typeof correctReceiptSchema> }
);
export function financeIntent(scope: FinanceScope, path: `/api/v1/${string}`, value: unknown): FinanceIntent | undefined {
  if (!z.uuid().safeParse(scope.dealId).success || scope.commissionId && !z.uuid().safeParse(scope.commissionId).success) return;
  if (!scope.commissionId) { const parsed = newCommissionSchema.safeParse(value); if (path === `/api/v1/deals/${scope.dealId}/commissions` && parsed.success) return { ...scope, path, kind: "create", body: parsed.data, expectedVersion: parsed.data.expected_deal_version }; return; }
  const root = `/api/v1/commissions/${scope.commissionId}`;
  if (path === `${root}/recognize`) { const parsed = recognitionSchema.safeParse(value); if (parsed.success) return { ...scope, path, kind: "recognize", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
  if (path === `${root}/receipts`) { const parsed = receiptCommandSchema.safeParse(value); if (parsed.success) return { ...scope, path, kind: "receipt", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
  if (path === `${root}/correct`) {
    const terms = correctCommissionSchema.safeParse(value); if (terms.success) return { ...scope, path, kind: "terms", body: terms.data, expectedVersion: terms.data.expected_version };
    const receipt = correctReceiptSchema.safeParse(value); if (receipt.success) return { ...scope, path, kind: "receipt-correct", body: receipt.data, expectedVersion: receipt.data.expected_version };
  }
}
function decimal(value: string | null) { if (value === null) return null; const [whole, fraction = ""] = value.split("."), suffix = fraction.replace(/0+$/, ""); return `${BigInt(whole)}${suffix ? `.${suffix}` : ""}`; }
export function financeCompletionMatches(intent: FinanceIntent, receipt: { id: string; version: number }, value: Commission, actorId: string) {
  if (!financeResultMatches(intent.commissionId, intent.expectedVersion, receipt) || value.id !== receipt.id || value.deal_id !== intent.dealId || value.version !== value.current.version || value.version < receipt.version || intent.kind === "create" && value.created_by_user_id !== actorId) return false;
  if (value.version > receipt.version) return true;
  const action = { create: "created", terms: "commission_corrected", recognize: "recognized", receipt: "receipt", "receipt-correct": "receipt_corrected" }[intent.kind], current = value.current;
  if (current.action !== action || current.actor.id !== actorId) return false;
  if (intent.kind === "create" || intent.kind === "terms") {
    const terms = intent.body;
    return current.receipt_id === null && current.kind === terms.kind && decimal(current.base_mad) === decimal(terms.base_mad) && decimal(current.rate_percent) === decimal(terms.rate_percent) && decimal(current.amount_mad) === decimal(calculatedAmount(terms)) && current.due_on === terms.due_on && current.reason === (intent.kind === "terms" ? intent.body.reason : "") && (intent.kind !== "create" || current.state === "expected");
  }
  if (intent.kind === "recognize") return current.state === "recognized" && current.receipt_id === null;
  return current.state === "recognized" && current.receipt_id !== null && current.reason === intent.body.reason;
}
