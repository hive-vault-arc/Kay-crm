import { z } from "zod";
import { campaignSchema, profileFields, purchaseReasonSchema, ratingSchema } from "@/features/contacts/qualification-contracts";

export const projectChoiceSchema = z.object({
  development_id: z.uuid().nullable().optional(), property_id: z.uuid().nullable().optional(),
  external_name: z.string().trim().min(1).max(160).nullable().optional(),
}).strict().refine(value => [value.development_id, value.property_id, value.external_name].filter(value => value != null).length === 1, "Choisissez un projet.");
export const convertLeadSchema = z.object({
  expected_version: z.number().int().positive(), project: projectChoiceSchema,
  initial_budget: z.string().trim().min(1, "Choisissez un budget.").max(160),
  purchase_reasons: z.array(purchaseReasonSchema).min(1, "Choisissez un motif d’achat.").max(8).refine(values => new Set(values).size === values.length),
}).strict();
export const paymentLabels = { cash: "Comptant", mortgage: "Crédit immobilier", installments: "Échelonnement", mixed: "Mixte", bank_finance: "Financement bancaire", developer_finance: "Financement promoteur" } as const;
export const paymentSchema = z.enum(["cash", "mortgage", "installments", "mixed", "bank_finance", "developer_finance"]);
export const editableQualificationFields = {
  initial_budget: convertLeadSchema.shape.initial_budget,
  purchase_reasons: convertLeadSchema.shape.purchase_reasons,
  projects: z.array(projectChoiceSchema).min(1, "Choisissez au moins un projet.").max(3).refine(values => new Set(values.map(value => value.development_id ? `d:${value.development_id}` : value.property_id ? `p:${value.property_id}` : `e:${value.external_name?.toLocaleLowerCase()}`)).size === values.length, "Choisissez chaque projet une seule fois."),
  campaign_source: campaignSchema, rating: ratingSchema,
  payment_method: paymentSchema.nullable(), number_of_rooms: z.number().int().min(0).max(50).nullable(), notes: z.string().trim().max(4000),
};
const project = z.object({
  position: z.number().int().min(1).max(3), name: z.string().min(1).max(160),
  development_id: z.uuid().nullable(), property_id: z.uuid().nullable(), external_name: z.string().max(160).nullable(),
}).strict();
const clientSnapshot = z.union([z.object({}).strict(), z.object({
  name: z.string().min(1).max(160), type: z.enum(["person", "organization"]), ...profileFields,
  calling_code: z.string().regex(/^\+[1-9][0-9]{0,2}$/).nullable(),
  phones: z.array(z.object({ number: z.string().max(48), label: z.string().max(40), is_primary: z.boolean() }).strict()).min(1).max(10),
  emails: z.array(z.object({ email: z.string().max(254), label: z.string().max(40), is_primary: z.boolean() }).strict()).max(10),
}).strict()]);
export const qualificationFields = {
  initial_budget: z.string().max(160).nullable(), campaign_source: campaignSchema, rating: ratingSchema,
  purchase_reasons: z.array(purchaseReasonSchema).max(8), client_snapshot: clientSnapshot,
  notes: z.string().max(4000), payment_method: z.string().max(24).nullable(), number_of_rooms: z.number().int().nullable(),
  projects: z.array(project).max(3),
};
export const qualificationSnapshotSchema = z.union([z.object({}).strict(), z.object(qualificationFields).strict()]);
