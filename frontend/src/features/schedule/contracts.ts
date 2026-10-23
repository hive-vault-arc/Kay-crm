import { z } from "zod";
import { agentSchema, numberedPage } from "@/features/contacts/contracts";

export const typeLabels = { company_car: "Avec véhicule de société", without_company_car: "Sans véhicule de société", office: "Au bureau" } as const;
export const statusLabels = { draft: "Brouillon : aucun créneau garanti", scheduled: "Planifiée", confirmed: "Confirmée", completed: "Terminée", not_completed: "Non réalisée", cancelled: "Annulée" } as const;
export const actionLabels = { created: "Visite créée", updated: "Visite modifiée", confirmed: "Visite confirmée", rescheduled: "Visite replanifiée", completed: "Visite terminée", not_completed: "Visite non réalisée", cancelled: "Visite annulée", contact_merged: "Contact fusionné" } as const;
const version = z.number().int().positive();
const instant = z.iso.datetime({ offset: true });
const type = z.enum(["company_car", "without_company_car", "office"]);
const status = z.enum(["draft", "scheduled", "confirmed", "completed", "not_completed", "cancelled"]);
export const windowSchema = z.object({ weekday: z.number().int().min(1).max(7), start_local: z.string().regex(/^\d{2}:\d{2}$/), end_local: z.string().regex(/^\d{2}:\d{2}$/) }).strict();
const policyFields = { company_car_capacity_per_hour: z.number().int().min(1).max(1000), working_windows: z.array(windowSchema).max(42), lunch_breaks: z.array(windowSchema).max(42) };
export const policySchema = z.object({ ...policyFields, version, time_zone: z.literal("Africa/Casablanca") }).strict();
export const policyEditSchema = z.object({ ...policyFields, expected_version: version }).strict();
export const policySaveSchema = policyEditSchema.extend({ preview_hash: z.string().regex(/^[a-f0-9]{64}$/) });
export const policyPreviewSchema = z.object({ policy: policySchema, affected: z.array(z.object({ id: z.uuid(), title: z.string().max(160), start_at: instant, end_at: instant, type, status, version, code: z.string().max(80) }).strict()).max(100), affected_total: z.number().int().nonnegative(), preview_hash: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const fields = { title: z.string().trim().min(1).max(160), type, start_at: instant, end_at: instant, location: z.string().trim().min(1).max(1000), participant_ids: z.array(z.uuid()).min(1).max(100), overlap_reason: z.string().trim().max(1000), deal_id: z.uuid().nullable(), enquiry_id: z.uuid().nullable().optional(), property_id: z.uuid().nullable() };
export const newVisitSchema = z.object({ ...fields, contact_id: z.uuid(), status: z.enum(["draft", "scheduled"]) }).strict();
export const editVisitSchema = z.object({ ...fields, expected_version: version }).strict();
export const visitActionSchema = z.object({ expected_version: version, reason: z.string().trim().max(1000) }).strict();
export const visitFinishSchema = visitActionSchema.extend({ reason: z.string().trim().min(1).max(1000) });
export const resultSchema = z.object({ id: z.uuid(), version }).strict();
const snapshot = z.object({ ...fields, enquiry_id: z.uuid().nullable().optional(), contact_id: z.uuid(), origin_contact_id: z.uuid(), organizer_user_id: z.uuid(), status, outcome: z.string().max(1000), policy_version: version, schedule_version: version.optional() }).strict();
export const visitSchema = snapshot.extend({ id: z.uuid(), version, schedule_version: version, contact_name: z.string().max(160), contact_archived: z.boolean(), participants: z.array(agentSchema).max(100), created_at: instant, updated_at: instant, updated_by_user_id: z.uuid(), start_local: instant, end_local: instant, review_code: z.string().max(80).nullable() });
export const visitTypeOrder = ["office", "without_company_car", "company_car"] as const;
export const visitStatusOrder = ["confirmed", "scheduled", "draft", "completed", "not_completed", "cancelled"] as const;
export const visitsSchema = numberedPage(visitSchema).extend({
  type_counts: z.object({ office: z.number().int().nonnegative(), without_company_car: z.number().int().nonnegative(), company_car: z.number().int().nonnegative() }).strict(),
  status_counts: z.object({ draft: z.number().int().nonnegative(), scheduled: z.number().int().nonnegative(), confirmed: z.number().int().nonnegative(), completed: z.number().int().nonnegative(), not_completed: z.number().int().nonnegative(), cancelled: z.number().int().nonnegative() }).strict(),
  unfiltered_total: z.number().int().nonnegative(),
});
export const busySchema = numberedPage(z.object({ start_at: instant, end_at: instant, busy: z.literal(true) }).strict());
export const historySchema = z.object({ items: z.array(z.object({ id: z.uuid(), actor: agentSchema, action: z.enum(Object.keys(actionLabels) as [keyof typeof actionLabels, ...(keyof typeof actionLabels)[]]), version, snapshot, reason: z.string().max(1000), occurred_at: instant }).strict()).max(100) }).strict();
export const colleaguesSchema = z.object({ items: z.array(agentSchema) }).strict();
export const localTimeSchema = z.object({ time_zone: z.literal("Africa/Casablanca"), choices: z.array(z.object({ instant, local: instant }).strict()).max(2) }).strict();
export const calendarContextSchema = z.object({ today: z.iso.date(), time_zone: z.literal("Africa/Casablanca"), tzdata_version: z.string().max(32) }).strict();
export const availabilitySchema = z.object({ policy_version: version, time_zone: z.literal("Africa/Casablanca"), type, bookable: z.boolean(), code: z.string().max(80).nullable(), preview_only: z.literal(true), company_car_intervals: z.array(z.object({ start_at: instant, end_at: instant, local_label: instant, used: z.number().int().nonnegative(), capacity: version, remaining: z.number().int().nonnegative() }).strict()).max(170) }).strict();
const period = { start_at: instant, end_at: instant };
export const calendarQuerySchema = z.object({ ...period, page: z.coerce.number().int().min(1).max(1_000_000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional(), contact_id: z.uuid().optional(), user_id: z.uuid().optional() }).strict();
const selection = (allowed: readonly string[]) => z.string().max(80).refine(value => {
  const parts = value === "" ? [] : value.split(",");
  return new Set(parts).size === parts.length && parts.every(part => allowed.includes(part));
});
export const visitsQuerySchema = calendarQuerySchema.extend({ types: selection(visitTypeOrder).optional(), statuses: selection(visitStatusOrder).optional() });
export const availabilityQuerySchema = z.object({ ...period, type, exclude_visit_id: z.uuid().optional() }).strict();
export type Visit = z.infer<typeof visitSchema>;
export type VisitPage = z.infer<typeof visitsSchema>;
export type Policy = z.infer<typeof policySchema>;
export type PolicyEdit = z.infer<typeof policyEditSchema>;
export type PolicyPreview = z.infer<typeof policyPreviewSchema>;
