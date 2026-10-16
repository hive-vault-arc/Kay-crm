import { z } from "zod";

const base = z.string().regex(/^[0-9]{1,16}(\.[0-9]{1,8})?$/).refine(value => /[1-9]/.test(value));
const rate = z.string().regex(/^[0-9]{1,4}(\.[0-9]{1,8})?$/).refine(value => /[1-9]/.test(value));
const amount = z.string().regex(/^[0-9]{1,16}(\.[0-9]{1,2})?$/).refine(value => /[1-9]/.test(value));
const version = z.number().int().positive(), reason = z.string().trim().min(1).max(1000);
const fields = { kind: z.enum(["fixed", "percentage"]), base_mad: base, rate_percent: rate.nullable(), amount_mad: amount.nullable(), due_on: z.iso.date().nullable() };
type Calculation = { kind: string; base_mad: string; rate_percent: string | null; amount_mad: string | null };
function scaled(value: string, places: number) { const [whole, fraction = ""] = value.split("."); return BigInt(whole + fraction.padEnd(places, "0")); }
export function calculatedAmount(value: Calculation): string | null {
  if (!base.safeParse(value.base_mad).success) return null;
  let cents: bigint;
  if (value.kind === "fixed") {
    if (!amount.safeParse(value.amount_mad).success || value.rate_percent !== null) return null;
    cents = scaled(value.amount_mad!, 2);
  } else {
    if (value.kind !== "percentage" || !rate.safeParse(value.rate_percent).success || value.amount_mad !== null) return null;
    const divisor = BigInt("10000000000000000");
    cents = (scaled(value.base_mad, 8) * scaled(value.rate_percent!, 8) + divisor / BigInt("2")) / divisor;
  }
  if (cents <= BigInt("0") || cents > BigInt("999999999999999999")) return null;
  return `${cents / BigInt("100")}.${String(cents % BigInt("100")).padStart(2, "0")}`;
}
function calculation(value: Calculation, context: z.RefinementCtx) { if (calculatedAmount(value) === null) context.addIssue({ code: "custom", path: [value.kind === "fixed" ? "amount_mad" : "rate_percent"], message: "Indiquez un montant calculable et strictement positif." }); }
export const termsSchema = z.object(fields).strict().superRefine(calculation);
export const newCommissionSchema = z.object({ ...fields, expected_deal_version: version }).strict().superRefine(calculation);
export const recognitionSchema = z.object({ expected_version: version }).strict();
export const receiptFieldsSchema = z.object({ amount_mad: amount, received_on: z.iso.date(), evidence_document_id: z.uuid().nullable(), reason }).strict();
export const receiptCommandSchema = receiptFieldsSchema.extend({ expected_version: version }).strict();
export const correctCommissionSchema = z.object({ ...fields, target: z.literal("commission"), expected_version: version, reason }).strict().superRefine(calculation);
export const correctReceiptSchema = z.object({ target: z.literal("receipt"), expected_version: version, receipt_id: z.uuid(), replacement: receiptFieldsSchema.nullable(), reason }).strict();
export const correctionSchema = z.union([correctCommissionSchema, correctReceiptSchema]);
export const resultSchema = z.object({ id: z.uuid(), version }).strict();
const actor = z.object({ id: z.uuid(), display_name: z.string().min(1).max(160) }).strict();
export const revisionSchema = z.object({ id: z.uuid(), version, previous_revision_id: z.uuid().nullable(), ...fields, amount_mad: amount,
  state: z.enum(["expected", "recognized"]), review_required: z.boolean(), action: z.enum(["created", "recognized", "commission_corrected", "receipt", "receipt_corrected", "reopen_review"]), reason: z.string().max(1000), actor, receipt_id: z.uuid().nullable(), reopening_id: z.uuid().nullable(), created_at: z.iso.datetime({ offset: true }), created_local: z.iso.datetime({ offset: true }), calculation_policy: z.literal("MAD_FINAL_ROUND_HALF_UP_2") }).strict();
const nonnegativeAmount = z.string().regex(/^[0-9]{1,16}\.[0-9]{2}$/);
export const commissionSchema = z.object({ id: z.uuid(), deal_id: z.uuid(), version, current: revisionSchema, collected_mad: nonnegativeAmount, balance_mad: nonnegativeAmount.nullable(), created_by_user_id: z.uuid(), created_at: z.iso.datetime({ offset: true }) }).strict();
export const receiptSchema = z.object({ id: z.uuid(), commission_id: z.uuid(), supersedes_id: z.uuid().nullable(), valid: z.boolean(), amount_mad: amount.nullable(), received_on: z.iso.date(), evidence_document_id: z.uuid().nullable(), evidence_version_id: z.uuid().nullable(), reason: z.string().min(1).max(1000), actor, created_at: z.iso.datetime({ offset: true }) }).strict();
const pages = { page: version, page_size: z.number().int().min(1).max(100), total: z.number().int().nonnegative(), has_next: z.boolean(), has_previous: z.boolean() };
export const commissionsSchema = z.object({ items: z.array(commissionSchema).max(100), ...pages }).strict();
export const revisionsSchema = z.object({ items: z.array(revisionSchema).max(100), ...pages }).strict();
export const receiptsSchema = z.object({ items: z.array(receiptSchema).max(100), ...pages }).strict();
export const financeQuerySchema = z.object({ page: z.string().regex(/^[1-9][0-9]{0,6}$/).refine(value => Number(value) <= 1000000).optional(), page_size: z.string().regex(/^[1-9][0-9]{0,2}$/).refine(value => Number(value) <= 100).optional() }).strict();
export type Commission = z.infer<typeof commissionSchema>;
export type Receipt = z.infer<typeof receiptSchema>;
export type Terms = z.infer<typeof termsSchema>;
export function mad(value: string) { const [whole, fraction] = value.split("."); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f")}${fraction ? `,${fraction.replace(/0+$/, "").padEnd(2, "0")}` : ""} MAD`; }
export const revisionLabels: Record<string, string> = { created: "Commission prévue", recognized: "Commission reconnue", commission_corrected: "Commission corrigée", receipt: "Encaissement confirmé", receipt_corrected: "Encaissement corrigé", reopen_review: "Revue demandée après réouverture" };
