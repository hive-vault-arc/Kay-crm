import { z } from "zod";
import { numberedPage } from "@/features/contacts/contracts";
import { offeringSchema } from "@/features/inventory/contracts";

export const criterionLabels = { category: "Catégorie", location: "Localisation", area_sqm: "Surface minimale (m²)", rooms: "Pièces minimales", parking: "Parking", elevator: "Ascenseur" } as const;
export const criterionKeys = ["category", "location", "area_sqm", "rooms", "parking", "elevator"] as const;
export const importanceLabels = { required: "Obligatoire", preferred: "Souhaité" } as const;
export const amount = z.string().regex(/^[0-9]{1,16}(\.[0-9]{1,2})?$/, "Saisissez un montant positif au format 1234.56.").refine(value => /[1-9]/.test(value), "Saisissez un montant positif, avec deux décimales au maximum.");
const derivedAmount = z.string().regex(/^[0-9]{1,18}\.[0-9]{2}$/);
const version = z.number().int().positive();
const date = z.iso.datetime({ offset: true });
export function cents(value: string) { const [whole, decimal = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(decimal.padEnd(2, "0")); }
export const criterionSchema = z.object({ key: z.enum(criterionKeys), importance: z.enum(["required", "preferred"]), value: z.union([z.string(), z.number().int(), z.boolean()]).nullable() }).strict().refine(c => {
  if (c.value === null) return true;
  if (c.key === "parking" || c.key === "elevator") return typeof c.value === "boolean";
  if (c.key === "rooms") return typeof c.value === "number" && c.value >= 1 && c.value <= 1000;
  if (c.key === "area_sqm") return amount.safeParse(c.value).success;
  if (c.key === "category") return ["villa", "house", "apartment", "land"].includes(String(c.value));
  return typeof c.value === "string" && c.value.trim().length > 0 && c.value.length <= 500;
}, { message: "Valeur invalide : vide signifie inconnu ; une surface ou un nombre de pièces doit être positif.", path: ["value"] });
const fields = { title: z.string().trim().min(1, "Nommez cette recherche.").max(160), intent: z.enum(["sale", "rental"]), currency: z.literal("MAD"), budget_min_mad: amount.nullable(), budget_max_mad: amount.nullable(), budget_period: z.enum(["month", "year"]).nullable(), criteria: z.array(criterionSchema).max(6) };
function coherent(value: z.infer<z.ZodObject<typeof fields>>) {
  return (value.intent === "sale") === (value.budget_period === null) && new Set(value.criteria.map(c => c.key)).size === value.criteria.length && (!value.budget_min_mad || !value.budget_max_mad || !amount.safeParse(value.budget_min_mad).success || !amount.safeParse(value.budget_max_mad).success || cents(value.budget_min_mad) <= cents(value.budget_max_mad));
}
export const fieldsSchema = z.object(fields).strict().refine(coherent, { message: "Vérifiez la période et l’ordre des budgets minimum et maximum.", path: ["budget_max_mad"] });
export const newRequirementSchema = z.object({ ...fields, contact_id: z.uuid() }).strict().refine(coherent);
export const editRequirementSchema = z.object({ ...fields, expected_version: version }).strict().refine(coherent);
export const shortlistSchema = z.object({ expected_version: version, offering_id: z.uuid(), expected_offering_version: version, feedback: z.string().trim().max(2000).nullable() }).strict();
export const removeSchema = z.object({ expected_version: version }).strict();
export const resultSchema = z.object({ id: z.uuid(), version }).strict();
export const requirementSchema = z.object({ ...fields, id: z.uuid(), contact_id: z.uuid(), version, annual_budget_min_mad: derivedAmount.nullable(), annual_budget_max_mad: derivedAmount.nullable(), shortlist_count: z.number().int().min(0).max(100), created_by_user_id: z.uuid(), updated_by_user_id: z.uuid(), created_at: date, updated_at: date }).strict();
export const detailSchema = requirementSchema.extend({ shortlist: z.array(z.object({ offering: offeringSchema, feedback: z.string().max(2000).nullable(), created_by_user_id: z.uuid(), updated_by_user_id: z.uuid(), created_at: date, updated_at: date }).strict()).max(100) });
export const requirementsSchema = numberedPage(requirementSchema);
export const querySchema = z.object({ contact_id: z.uuid(), page: z.coerce.number().int().min(1).max(1_000_000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() }).strict();
export type Requirement = z.infer<typeof detailSchema>;
export type RequirementSummary = z.infer<typeof requirementSchema>;
export type RequirementFields = z.infer<typeof fieldsSchema>;
export const blank: RequirementFields = { title: "", intent: "rental", currency: "MAD", budget_min_mad: null, budget_max_mad: null, budget_period: "month", criteria: criterionKeys.map(key => ({ key, importance: "preferred", value: null })) };
