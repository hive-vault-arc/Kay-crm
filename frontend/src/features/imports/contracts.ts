import { z } from "zod";

export const maxImportBytes = 20 * 1024 * 1024;
export const csvHeaders = "name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes";
const count = z.number().int().nonnegative().max(50000);
export const countsSchema = z.object({ eligible: count, invalid: count, skipped_existing: count, committed: count }).strict();
export const createSchema = z.object({ filename: z.string().min(5).max(180).regex(/\.csv$/i).refine(v => !/[\\/\x00\r\n]/.test(v)), size_bytes: z.number().int().positive().max(maxImportBytes) }).strict();
export const previewSchema = z.object({ fallback_agent_id: z.uuid().nullable().optional(), row_agents: z.array(z.object({ row_number: z.number().int().min(2).max(50001), agent_id: z.uuid().nullable() }).strict()).max(100).optional() }).strict();
export const approveSchema = z.object({ preview_hash: z.string().regex(/^[a-f0-9]{64}$/), fallback_agent_id: z.uuid().nullable().optional() }).strict();
const resultSchema = z.object({ batch_id: z.uuid(), committed: count, skipped_existing: count, approved_at: z.iso.datetime({ offset: true }), approved_by_user_id: z.uuid() }).strict();
export const batchSchema = z.object({ id: z.uuid(), filename: z.string().max(180), size_bytes: z.number().int().positive().max(maxImportBytes), state: z.enum(["awaiting_upload", "uploading", "uploaded", "previewed", "repreview_required", "committed"]), version: z.number().int().positive(), file_hash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), preview_hash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), fallback_agent_id: z.uuid().nullable(), counts: z.union([countsSchema, z.object({}).strict()]), result: resultSchema.nullable(), created_at: z.iso.datetime({ offset: true }) }).strict();
const cell = z.string().max(4096);
export const rowSchema = z.object({ row_number: z.number().int().min(2).max(50001), values: z.object({ name: cell, primary_phone: cell, other_phones: cell, primary_email: cell, other_emails: cell, roles: cell, agent_email: cell, notes: cell }).strict(), values_truncated: z.boolean(), status: z.enum(["eligible", "invalid", "skipped_existing", "committed"]), errors: z.array(z.enum(["INVALID_CONTACT_FIELDS", "INVALID_OR_MISSING_AGENT", "DUPLICATE_NEW_PHONE"])).max(3), agent_id: z.uuid().nullable(), agent_name: z.string().max(160).nullable(), contact_id: z.uuid().nullable() }).strict();
export const batchPageSchema = batchSchema.extend({ items: z.array(rowSchema).max(100), page: z.number().int().positive(), page_size: z.number().int().min(1).max(100), total: count, has_next: z.boolean(), has_previous: z.boolean() }).strict();
export const permitSchema = z.object({ batch_id: z.uuid(), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expires_at: z.iso.datetime({ offset: true }), transfer_url: z.url() }).strict();
export type Batch = z.infer<typeof batchSchema>;
export type ImportRow = z.infer<typeof rowSchema>;
export const rowLabels = { eligible: "À créer", invalid: "À corriger", skipped_existing: "Ignorée : téléphone existant", committed: "Contact créé" };
export const rowErrors = { INVALID_CONTACT_FIELDS: "Vérifiez le nom, les téléphones, les e-mails, les rôles et la longueur des champs dans le fichier.", INVALID_OR_MISSING_AGENT: "Choisissez un agent actif pour cette ligne, corrigez agent_email ou sélectionnez un agent de remplacement.", DUPLICATE_NEW_PHONE: "Un nouveau téléphone apparaît sur plusieurs lignes. Corrigez le fichier avant de l’approuver." };
