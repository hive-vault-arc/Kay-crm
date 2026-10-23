import { z } from "zod";
import { agentSchema, contactSchema, numberedPage } from "./contracts";

export const operationLabels = { assign: "Transférer le contact", collaborators: "Modifier les collaborateurs", archive: "Archiver le contact", restore: "Restaurer le contact", merge: "Fusionner les contacts" } as const;
const common = { expected_version: z.number().int().positive(), reason: z.string().trim().min(1).max(1000) };
const shapes = [
  z.object({ ...common, operation: z.literal("assign"), primary_agent_id: z.uuid(), retain_previous: z.boolean().optional() }).strict(),
  z.object({ ...common, operation: z.literal("collaborators"), collaborator_ids: z.array(z.uuid()).max(100) }).strict(),
  z.object({ ...common, operation: z.literal("archive") }).strict(),
  z.object({ ...common, operation: z.literal("restore") }).strict(),
  z.object({ ...common, operation: z.literal("merge"), survivor_id: z.uuid(), survivor_expected_version: z.number().int().positive() }).strict(),
] as const;
export const intentSchema = z.discriminatedUnion("operation", shapes);
const proof = { preview_token: z.string().regex(/^[a-f0-9]{64}$/) };
export const confirmedChangeSchema = z.discriminatedUnion("operation", [shapes[0].extend(proof), shapes[1].extend(proof), shapes[2].extend(proof), shapes[3].extend(proof), shapes[4].extend(proof)]);
export const commandResultSchema = z.object({ contact_id: z.uuid(), version: z.number().int().positive(), event_id: z.uuid(), operation: z.enum(["assign", "collaborators", "archive", "restore", "merge", "notes", "enquiry-assign"]) }).strict();
export const previewSchema = z.object({ ...proof, impact: z.object({
  contacts: z.array(contactSchema).min(1).max(2), enquiries: z.number().int().nonnegative(), unassigned_enquiries: z.number().int().nonnegative(),
  primary_agent_after: agentSchema,
  phones_after: z.number().int().min(1).max(10), emails_after: z.number().int().min(0).max(10),
  access_lost: z.array(agentSchema).max(101), access_gained: z.array(agentSchema).max(101), retained_collaborators: z.array(agentSchema).max(100), property_owner_links: z.number().int().nonnegative(), development_owner_links: z.number().int().nonnegative(), developer_links: z.number().int().nonnegative(), document_links: z.number().int().nonnegative(), requirement_links: z.number().int().nonnegative(), deal_links: z.number().int().nonnegative(), visit_links: z.number().int().nonnegative(), task_links: z.number().int().nonnegative(), linked_modules: z.array(z.enum(["enquiries", "property_owners", "development_owners", "developers", "documents", "requirements", "deals", "visits", "tasks"])).max(9),
}).strict() }).strict();
export const noteSchema = z.object({ kind: z.enum(["note", "call", "email", "meeting", "other"]), body: z.string().trim().min(1).max(4000) }).strict();
export const enquiryAssignmentSchema = z.object({ expected_version: z.number().int().positive(), assigned_agent_id: z.uuid().nullable(), reason: common.reason }).strict();
const eventFields = { id: z.uuid(), contact_id: z.uuid(), actor: agentSchema.extend({ id: z.uuid().nullable() }), action: z.string().min(1).max(40), reason: z.string().max(1000), occurred_at: z.iso.datetime({ offset: true }), enquiry_id: z.uuid().nullable() };
export const timelineSchema = numberedPage(z.object({ ...eventFields, body: z.string().max(4000), related_contact_id: z.uuid().nullable(), deal_id: z.uuid().nullable() }).strict());
export const assignmentsSchema = numberedPage(z.object({ ...eventFields, previous_user: agentSchema.nullable(), new_user: agentSchema.nullable() }).strict());
export type ChangeIntent = z.infer<typeof intentSchema>;
export type Operation = ChangeIntent["operation"];
export type Preview = z.infer<typeof previewSchema>;
export const dealActivityLabels = { "deals.created": "Affaire créée", "deals.updated": "Affaire modifiée", "deals.transition": "Étape de l’affaire modifiée", "deals.customer_offer.created": "Proposition client enregistrée", "deals.customer_offer.updated": "Proposition client modifiée", "deals.contact_merged": "Affaire rattachée après fusion", "deals.reservation.created": "Offre réservée", "deals.reservation.released": "Réservation libérée", "deals.closed": "Affaire clôturée", "deals.reopened": "Affaire rouverte", "deals.stock.flagged": "Stock de l’affaire à vérifier" };
Object.assign(dealActivityLabels, { "deals.archived": "Affaire archivée", "deals.restored": "Affaire restaurée" });
export const activityLabels: Record<string, string> = { "tasks.created": "Tâche créée", "tasks.updated": "Tâche modifiée", "tasks.completed": "Tâche terminée", "tasks.cancelled": "Tâche annulée", "tasks.contact_merged": "Tâche rattachée après fusion", "requirements.created": "Recherche créée", "requirements.updated": "Recherche modifiée", "requirements.shortlisted": "Offre sélectionnée ou avis modifié", "requirements.unshortlisted": "Offre retirée de la sélection", "contacts.created": "Contact créé", "contacts.updated": "Identité modifiée", "enquiries.created": "Demande reçue", "enquiries.updated": "Demande modifiée", "contacts.assign": "Responsable changé", "contacts.collaborators": "Collaborateurs modifiés", "contacts.archive": "Contact archivé", "contacts.restore": "Contact restauré", "contacts.merge": "Fusion de contacts", "enquiries.assign": "Demande réattribuée", note: "Note", call: "Appel consigné", email: "E-mail consigné", meeting: "Rendez-vous consigné", other: "Interaction consignée" };
Object.assign(activityLabels, { "visits.created": "Visite créée", "visits.updated": "Visite modifiée", "visits.confirmed": "Visite confirmée", "visits.rescheduled": "Visite replanifiée", "visits.completed": "Visite terminée", "visits.cancelled": "Visite annulée", "visits.contact_merged": "Visite rattachée après fusion" });
Object.assign(activityLabels, { message: "Message consigné", visit: "Visite consignée", "enquiries.converted": "Conversion en affaire" });
Object.assign(activityLabels, { "enquiries.archive": "Demande archivée", "enquiries.restore": "Demande restaurée", "deals.archived": "Affaire archivée", "deals.restored": "Affaire restaurée" });
