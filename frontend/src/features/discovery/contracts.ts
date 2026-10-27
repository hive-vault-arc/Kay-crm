import { z } from "zod";
import { listQuerySchema, numberedPage } from "@/features/contacts/contracts";

const date = z.iso.datetime({ offset: true });
const page = { page: z.coerce.number().int().min(1).max(1000000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() };
export const kindLabels = { contact: "Contacts", enquiry: "Prospects", deal: "Affaires", development: "Programmes", property: "Biens et unités", unit_type: "Types réutilisables", document: "Documents", generated_document: "PDF préparés" } as const;
const legacyKindSchema = z.enum(["contact", "enquiry", "deal", "development", "property", "unit_type", "document"]);
export const kindSchema = z.enum(["contact", "enquiry", "deal", "development", "property", "unit_type", "document", "generated_document"]);
export const searchQuerySchema = z.object({ ...page, q: z.string().trim().min(2).max(160), kind: kindSchema.optional() }).strict();
export const searchPageQuerySchema = searchQuerySchema.omit({ page_size: true });
export type SearchPageQuery = z.infer<typeof searchPageQuerySchema>;
const destination = z.string().max(500).refine(value => /^\/(contacts|leads|deals|projects|projects\/properties)\/[a-f0-9-]{36}(\?tab=units&unit_type_id=[a-f0-9-]{36})?$/.test(value));
const searchHit = z.discriminatedUnion("kind", [
  z.object({ kind: legacyKindSchema, id: z.uuid(), label: z.string().max(500), href: destination }).strict(),
  z.object({ kind: z.literal("generated_document"), id: z.uuid(), label: z.string().max(500), template_title: z.string().min(1).max(200), href: z.string().regex(/^\/(?:leads|deals)\/[a-f0-9-]{36}\?tab=documents$/) }).strict(),
]);
export const searchSchema = numberedPage(searchHit).extend({ counts: z.partialRecord(kindSchema, z.number().int().nonnegative()), search_version: z.literal(2).optional() }).superRefine((value, context) => {
  if (value.search_version !== 2 && (value.counts.generated_document !== undefined || value.items.some(item => item.kind === "generated_document"))) context.addIssue({ code: "custom", message: "PREPARED_SEARCH_VERSION_REQUIRED" });
});
export type SearchHit = z.infer<typeof searchSchema>["items"][number];
export const pageQuerySchema = z.object(page).strict();
export const exportSchema = z.object({ id: z.uuid(), kind: z.enum(["contacts", "enquiries"]), state: z.enum(["queued", "ready", "failed", "denied"]), error_code: z.string().max(80).nullable(), row_count: z.number().int().nonnegative().nullable(), size_bytes: z.number().int().nonnegative().nullable(), created_at: date, completed_at: date.nullable() }).strict();
export const exportsSchema = numberedPage(exportSchema);
export const newExportSchema = z.object({ kind: z.enum(["contacts", "enquiries"]), filters: listQuerySchema }).strict().superRefine(({ kind, filters }, context) => {
  if (filters.page !== undefined && filters.page !== 1 || filters.page_size !== undefined && filters.page_size !== 50) context.addIssue({ code: "custom", message: "EXPORT_ALL_FILTERED_ROWS_NOT_A_PAGE" });
  if (kind === "contacts" && (filters.status || filters.source || filters.assigned_agent_id || filters.received_from || filters.received_to || filters.sort === "-received_at")) context.addIssue({ code: "custom", message: "CONTACT_FILTERS_REQUIRED" });
});
export type ExportJob = z.infer<typeof exportSchema>;
export const permitSchema = z.object({ token: z.string().min(20).max(128), expires_at: date, export_id: z.uuid(), transfer_url: z.url().max(500) }).strict();
export const familyLabels = { security: "Sécurité et comptes", contacts: "Contacts", enquiries: "Demandes", properties: "Biens", developments: "Programmes", offerings: "Offres", documents: "Documents", requirements: "Besoins", deals: "Affaires et finance", visits: "Visites", tasks: "Tâches", imports: "Imports", exports: "Exports" } as const;
export const auditQuerySchema = z.object({ ...page, family: z.enum(Object.keys(familyLabels) as [keyof typeof familyLabels, ...(keyof typeof familyLabels)[]]).optional(), actor_id: z.uuid().optional(), start_on: z.iso.date().optional(), end_on: z.iso.date().optional() }).strict().refine(v => !v.start_on || !v.end_on || v.start_on <= v.end_on);
export const auditSchema = numberedPage(z.object({ id: z.uuid(), action: z.string().max(100), actor_id: z.uuid().nullable(), actor_name: z.string().max(160), created_at: date, target_user_id: z.uuid().nullable(), targets: z.partialRecord(z.enum(["contact", "enquiry", "property", "development", "offering", "deal"]), z.uuid()) }).strict());
