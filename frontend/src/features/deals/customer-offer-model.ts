import { apiGet, ApiError } from "@/lib/api/client";
import { queryPath } from "@/features/contacts/use-query";
import { dealSchema, editOfferSchema, newOfferSchema, offersSchema, ordinaryStages, type CustomerOffer, type Deal, type OfferFields } from "./contracts";

export type ProposalComparison = { deal: Deal; proposal?: CustomerOffer };
export function proposalValues(deal: Deal, proposal?: CustomerOffer): OfferFields {
  return proposal ? { amount_mad: proposal.amount_mad, currency: "MAD", price_period: proposal.price_period, conditions: proposal.conditions, expires_on: proposal.expires_on, status: proposal.status } : { amount_mad: "", currency: "MAD", price_period: deal.offering?.price_period === "month" || deal.offering?.price_period === "year" ? deal.offering.price_period : null, conditions: "", expires_on: null, status: "pending" };
}
export function proposalBody(source: ProposalComparison, fields: OfferFields) {
  const values = { ...fields, amount_mad: fields.amount_mad.trim().replace(",", ".") };
  return source.proposal ? editOfferSchema.refine(() => source.proposal?.deal_id === source.deal.id).safeParse({ ...values, expected_version: source.proposal.version, expected_deal_version: source.deal.version }) : newOfferSchema.safeParse({ ...values, expected_version: source.deal.version });
}
export function proposalWritable(deal: Deal) {
  return !deal.archived_at && !deal.contact.archived_at && (deal.stage === "reserved" || ordinaryStages.includes(deal.stage as typeof ordinaryStages[number]));
}
export function proposalPageSchema(dealId: string, page: number, size: number) {
  return offersSchema.refine(value => value.page === page && value.page_size === size && value.items.length <= size && value.items.every(item => item.deal_id === dealId));
}

// Proposals have a scoped paged collection, not a separate GET-by-ID route.
// Bracket a found immutable identity with the Deal revision before offering a rebase.
export async function readProposalComparison(id: string, proposalId: string | undefined, signal: AbortSignal): Promise<ProposalComparison> {
  const path = `/api/v1/deals/${id}` as const, deal = await apiGet(path, dealSchema, signal);
  if (deal.id !== id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  if (!proposalId) return { deal };
  let proposal: CustomerOffer | undefined;
  for (let page = 1; ; page++) {
    const result = await apiGet(queryPath(`deals/${id}/customer-offers`, { page, page_size: 100 }), proposalPageSchema(id, page, 100), signal);
    proposal = result.items.find(item => item.id === proposalId);
    if (proposal || !result.has_next) break;
    if (!result.items.length || page * 100 >= result.total || page >= 1_000_000) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  }
  if (!proposal) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const latest = await apiGet(path, dealSchema, signal);
  if (latest.id !== id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  if (latest.version !== deal.version) throw new ApiError("DEAL_VERSION_CONFLICT", 409);
  return { deal, proposal };
}
