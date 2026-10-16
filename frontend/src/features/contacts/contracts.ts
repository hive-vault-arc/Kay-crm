import { z } from "zod";

export const sourceLabels = { manual: "Saisie manuelle", phone: "Téléphone", email: "E-mail", in_person: "En personne", referral: "Recommandation" } as const;
export const statusLabels = { new: "Nouveau", in_progress: "En cours", closed: "Clôturé" } as const;
export const roleLabels = { buyer: "Acheteur", seller: "Vendeur", owner: "Propriétaire", tenant: "Locataire", developer: "Promoteur" } as const;
export const sourceSchema = z.enum(["manual", "phone", "email", "in_person", "referral"]);
export const receivedSourceLabels = { ...sourceLabels, website: "Site web" } as const;
const receivedSourceSchema = z.union([sourceSchema, z.literal("website")]);
export const contactSourceLabels = { ...receivedSourceLabels, csv_import: "Import CSV" } as const;
const contactSourceSchema = z.union([receivedSourceSchema, z.literal("csv_import")]);
export const statusSchema = z.enum(["new", "in_progress", "closed"]);
export const roleSchema = z.enum(["buyer", "seller", "owner", "tenant", "developer"]);
export const agentSchema = z.object({ id: z.uuid(), display_name: z.string().min(1).max(160) }).strict();
const instant = z.iso.datetime({ offset: true });
const phoneSchema = z.object({ number: z.string().trim().min(1, "Saisissez un téléphone.").max(48), label: z.string().trim().max(40), is_primary: z.boolean() }).strict();
const emailSchema = z.object({ email: z.string().trim().pipe(z.email("Saisissez un e-mail valide.").max(254)), label: z.string().trim().max(40), is_primary: z.boolean() }).strict();
export const contactFieldsSchema = z.object({
  name: z.string().trim().min(1, "Saisissez le nom du contact.").max(160),
  type: z.enum(["person", "organization"]),
  phones: z.array(phoneSchema).min(1, "Un téléphone est obligatoire.").max(10),
  emails: z.array(emailSchema).max(10),
  roles: z.array(roleSchema).max(5),
}).strict().superRefine((values, context) => {
  if (values.phones.filter(value => value.is_primary).length !== 1) context.addIssue({ code: "custom", path: ["phones"], message: "Choisissez exactement un téléphone principal." });
  if (values.emails.length && values.emails.filter(value => value.is_primary).length !== 1) context.addIssue({ code: "custom", path: ["emails"], message: "Choisissez exactement un e-mail principal." });
  if (new Set(values.roles).size !== values.roles.length) context.addIssue({ code: "custom", path: ["roles"], message: "Choisissez chaque rôle une seule fois." });
});
export const newContactSchema = contactFieldsSchema.safeExtend({ primary_agent_id: z.uuid().nullable().optional() });
export const editContactSchema = contactFieldsSchema.safeExtend({ expected_version: z.number().int().positive() });
export const newEnquirySchema = z.object({
  contact_id: z.uuid().nullable().optional(), new_contact: newContactSchema.nullable().optional(),
  message: z.string().trim().max(4000), source: sourceSchema,
  source_submission_id: z.uuid().nullable().optional(), assigned_agent_id: z.uuid().nullable().optional(),
}).strict().refine(value => Boolean(value.contact_id) !== Boolean(value.new_contact), "Choisissez un contact existant ou un nouveau contact.");
export const editEnquirySchema = z.object({ expected_version: z.number().int().positive(), message: z.string().trim().max(4000), status: statusSchema }).strict();
export const resolveSchema = z.object({ phone: z.string().trim().min(1).max(48) }).strict();
export const contactSummarySchema = z.object({
  id: z.uuid(), name: z.string().min(1).max(160), type: z.enum(["person", "organization"]),
  primary_agent: agentSchema, primary_phone: z.string().regex(/^\+[1-9][0-9]{6,14}$/), primary_email: z.string().max(254).nullable(), version: z.number().int().positive(),
  archived_at: instant.nullable(),
}).strict();
export const contactSchema = contactSummarySchema.extend({
  phones: z.array(phoneSchema).min(1).max(10), emails: z.array(emailSchema).max(10), roles: z.array(roleSchema).max(5),
  source: contactSourceSchema, source_submission_id: z.uuid().nullable(), created_by_user_id: z.uuid().nullable(), created_at: instant, updated_at: instant,
  collaborators: z.array(agentSchema).max(100),
}).strict();
const enquiryFields = {
  id: z.uuid(), contact: contactSummarySchema, source: receivedSourceSchema, source_submission_id: z.uuid().nullable(), assigned_agent: agentSchema.nullable(),
  received_at: instant, updated_at: instant, created_by_user_id: z.uuid().nullable(), status: statusSchema, version: z.number().int().positive(),
  origin_contact_id: z.uuid(),
};
export const enquirySchema = z.object({ ...enquiryFields, message: z.string().max(4000) }).strict();
export const enquirySummarySchema = z.object({ ...enquiryFields, message_preview: z.string().max(160) }).strict();
export function numberedPage<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item).max(100), page: z.number().int().positive(), page_size: z.number().int().min(1).max(100), total: z.number().int().nonnegative(), has_next: z.boolean(), has_previous: z.boolean() }).strict();
}
export const enquiriesSchema = numberedPage(enquirySummarySchema);
export const contactsSchema = numberedPage(contactSummarySchema);
export const agentsSchema = numberedPage(agentSchema);
export const privateConflictSchema = z.object({ responsible_agent: z.object({ display_name: z.string().min(1).max(160) }).strict() });
export const duplicateSchema = z.object({ contacts: z.array(z.object({ id: z.uuid(), name: z.string().min(1).max(160) }).strict()).min(1).max(10) });
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(160).optional(), sort: z.enum(["-updated_at", "-received_at", "name"]).optional(), status: statusSchema.optional(), source: receivedSourceSchema.optional(),
  assigned_agent_id: z.uuid().optional(), received_from: z.iso.date().optional(), received_to: z.iso.date().optional(), contact_id: z.uuid().optional(),
  archive: z.enum(["active", "archived", "all"]).optional(),
}).strict().refine(value => !value.received_from || !value.received_to || value.received_from <= value.received_to);
export type Contact = z.infer<typeof contactSchema>;
export type ContactSummary = z.infer<typeof contactSummarySchema>;
export type ContactFields = z.infer<typeof contactFieldsSchema>;
export type Enquiry = z.infer<typeof enquirySchema>;
export type LeadSummary = z.infer<typeof enquirySummarySchema>;
export type StaffRole = "administrator" | "manager" | "agent";

export function contactRoute(key: string, method: string) {
  if (["contacts", "enquiries"].includes(key)) return method === "GET" || method === "POST";
  if (key === "contacts/resolve-phone") return method === "POST";
  if (key === "contacts/assignment-options") return method === "GET";
  if (/^contacts\/[a-f0-9-]{36}\/(timeline|assignment-events)$/.test(key)) return method === "GET";
  if (/^contacts\/[a-f0-9-]{36}\/collaborators$/.test(key)) return method === "PUT";
  if (/^contacts\/[a-f0-9-]{36}\/(preview|assign|archive|restore|merge|notes)$/.test(key)) return method === "POST";
  if (/^enquiries\/[a-f0-9-]{36}\/assign$/.test(key)) return method === "POST";
  return /^(contacts|enquiries)\/[a-f0-9-]{36}$/.test(key) && (method === "GET" || method === "PATCH");
}
