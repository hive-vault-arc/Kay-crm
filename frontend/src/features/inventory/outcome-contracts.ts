import { z } from "zod";
import { numberedPage, agentSchema } from "@/features/contacts/contracts";
import { amount } from "@/features/requirements/contracts";
import { offeringSchema } from "./contracts";

const version = z.number().int().positive();
const state = z.enum(["draft", "available", "reserved", "withdrawn", "sold", "rented", "review"]);
export const reviewedFields = { offering_id: z.uuid().nullable(), expected_offering_version: version.nullable(), expected_target_version: version.nullable(), expected_development_version: version.nullable(), expected_stock_fingerprint: z.string().regex(/^[0-9a-f]{64}$/).nullable() };
export const closeSchema = z.object({ ...reviewedFields, expected_version: version, outcome: z.enum(["won", "lost", "cancelled"]), agreed_amount_mad: amount.nullable(), completed_on: z.iso.date(), explanation: z.string().trim().min(1).max(1000) }).strict().refine(v => v.outcome === "won" ? Boolean(v.agreed_amount_mad && v.offering_id) : v.agreed_amount_mad === null);
export const reopenSchema = z.object({ ...reviewedFields, expected_version: version, reason: z.string().trim().min(1).max(1000) }).strict();
export const externalSchema = z.object({ expected_version: version, offering_id: z.uuid(), expected_offering_version: version, expected_development_version: version.nullable(), expected_stock_fingerprint: z.string().regex(/^[0-9a-f]{64}$/), completed_on: z.iso.date(), explanation: z.string().trim().min(1).max(1000) }).strict();
export const stockReviewSchema = z.object({ offering_id: z.uuid(), expected_offering_version: version, expected_target_version: version, expected_development_version: version.nullable(), expected_stock_fingerprint: z.string().regex(/^[0-9a-f]{64}$/), conflict: z.enum(["STOCK_REVIEW_REQUIRED", "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED", "DEVELOPMENT_OVERLAP", "RESERVATION_CONFLICT"]).nullable(), effect_count: z.number().int().nonnegative(), effects: z.array(z.object({ offering_id: z.uuid(), kind: z.enum(["sale", "rental"]), target_level: z.enum(["standalone", "unit", "development"]), reference: z.string().max(80), label: z.string().max(160).nullable(), before: state, after: state, releases_reservation: z.boolean() }).strict()).max(50) }).strict();
export const dealStockReviewSchema = z.object({ expected_version: version, stock: stockReviewSchema.nullable(), offering: offeringSchema.nullable() }).strict();
const instant = z.iso.datetime({ offset: true });
export const outcomesSchema = numberedPage(z.object({ id: z.uuid(), offering_id: z.uuid().nullable(), outcome: z.enum(["won", "lost", "cancelled"]), agreed_amount_mad: amount.nullable(), price_period: z.enum(["month", "year"]).nullable(), completed_on: z.iso.date(), explanation: z.string().max(1000), primary_agent_at_close_id: z.uuid(), primary_agent_at_close_name: z.string().max(160), actor: agentSchema, close_version: version, created_at: instant, reopening: z.object({ id: z.uuid(), reason: z.string().max(1000), actor: agentSchema, created_at: instant }).strict().nullable() }).strict());
export type StockReview = z.infer<typeof stockReviewSchema>;
export type DealStockReview = z.infer<typeof dealStockReviewSchema>;

export function reviewedBody(review: DealStockReview) {
  const stock = review.stock;
  return { expected_version: review.expected_version, offering_id: stock?.offering_id ?? null, expected_offering_version: stock?.expected_offering_version ?? null, expected_target_version: stock?.expected_target_version ?? null, expected_development_version: stock?.expected_development_version ?? null, expected_stock_fingerprint: stock?.expected_stock_fingerprint ?? null };
}
