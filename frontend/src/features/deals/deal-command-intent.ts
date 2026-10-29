import { z } from "zod";
import { editDealSchema, editOfferSchema, newOfferSchema, transitionSchema, reserveSchema, releaseSchema, type Deal } from "./contracts";
import { closeSchema, reopenSchema } from "@/features/inventory/outcome-contracts";

export type DealMutationContext = { dealId: string; proposalId?: string; completed?: (deal: Deal, signal: AbortSignal) => void | Promise<void> };
export type DealCommandIntent = { dealId: string; path: `/api/v1/${string}`; method: "POST" | "PATCH"; expectedVersion: number } & (
  { kind: "field"; body: z.infer<typeof editDealSchema> } |
  { kind: "transition"; body: z.infer<typeof transitionSchema> } |
  { kind: "proposal-create"; body: z.infer<typeof newOfferSchema> } |
  { kind: "proposal-edit"; proposalId: string; body: z.infer<typeof editOfferSchema> } |
  { kind: "reserve"; body: z.infer<typeof reserveSchema> } |
  { kind: "release"; body: z.infer<typeof releaseSchema> } |
  { kind: "close"; body: z.infer<typeof closeSchema> } |
  { kind: "reopen"; body: z.infer<typeof reopenSchema> }
);
export function dealCommandIntent(id: string, path: `/api/v1/${string}`, value: unknown, method: "POST" | "PATCH", context?: DealMutationContext): DealCommandIntent | undefined {
  if (!z.uuid().safeParse(id).success || context && context.dealId !== id) return;
  const common = { dealId: id, path, method };
  if (path === `/api/v1/deals/${id}` && method === "PATCH") {
    const parsed = editDealSchema.safeParse(value);
    // Full atomic contact editing has its own form owner and completion proof.
    if (parsed.success && !parsed.data.contact_fields) return { ...common, kind: "field", body: parsed.data, expectedVersion: parsed.data.expected_version };
  } else if (path === `/api/v1/deals/${id}/transition` && method === "POST") {
    const parsed = transitionSchema.safeParse(value);
    if (parsed.success) return { ...common, kind: "transition", body: parsed.data, expectedVersion: parsed.data.expected_version };
  } else if (path === `/api/v1/deals/${id}/customer-offers` && method === "POST") {
    const parsed = newOfferSchema.safeParse(value);
    if (parsed.success) return { ...common, kind: "proposal-create", body: parsed.data, expectedVersion: parsed.data.expected_version };
  } else if (context?.dealId === id && typeof context.proposalId === "string" && z.uuid().safeParse(context.proposalId).success && path === `/api/v1/customer-offers/${context.proposalId}` && method === "PATCH") {
    const parsed = editOfferSchema.safeParse(value);
    if (parsed.success) return { ...common, kind: "proposal-edit", proposalId: context.proposalId, body: parsed.data, expectedVersion: parsed.data.expected_deal_version };
  } else if (method === "POST") {
    if (path === `/api/v1/deals/${id}/reserve`) { const parsed = reserveSchema.safeParse(value); if (parsed.success) return { ...common, kind: "reserve", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
    if (path === `/api/v1/deals/${id}/release-reservation`) { const parsed = releaseSchema.safeParse(value); if (parsed.success) return { ...common, kind: "release", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
    if (path === `/api/v1/deals/${id}/close`) { const parsed = closeSchema.safeParse(value); if (parsed.success) return { ...common, kind: "close", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
    if (path === `/api/v1/deals/${id}/reopen`) { const parsed = reopenSchema.safeParse(value); if (parsed.success) return { ...common, kind: "reopen", body: parsed.data, expectedVersion: parsed.data.expected_version }; }
  }
}
export type DealCommandRecovery = {
  busy: boolean; uncertain: boolean; acknowledged: boolean; complete: boolean; needsReview: boolean; protected: boolean;
  locked: () => boolean; canEdit: () => boolean; active: () => boolean;
  retry: () => Promise<boolean>; inspect: (reader?: (signal: AbortSignal) => Promise<Deal>, callerSignal?: AbortSignal) => Promise<Deal>; accept: (current: Deal) => boolean;
};
