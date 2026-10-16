import { z } from "zod";

export const maxFileBytes = 20 * 1024 * 1024;
export const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
export type ParentKind = "contact" | "development" | "property" | "deal";
export const parentSchema = z.object({ parent_kind: z.enum(["contact", "development", "property", "deal"]), parent_id: z.uuid() }).strict();
export const newDocumentSchema = parentSchema.extend({
  filename: z.string().min(1).max(180).refine(value => value === value.trim() && !/[\\/:"<>|?*\p{C}]/u.test(value)),
  mime_type: z.string().min(1).max(120), size_bytes: z.number().int().positive().max(maxFileBytes),
}).strict();
export const versionSchema = z.object({
  id: z.uuid(), state: z.enum(["awaiting_upload", "pending_scan", "clean", "rejected"]),
  scan_error: z.enum(["ANTIVIRUS_UNAVAILABLE", "FILE_STORAGE_UNAVAILABLE", "FILE_INTEGRITY_ERROR", "WORKER_INTERRUPTED", "FILE_TRANSFER_INTERRUPTED"]).nullable(),
  created_at: z.iso.datetime({ offset: true }),
}).strict();
export const documentSchema = z.object({ id: z.uuid(), filename: z.string().min(1).max(180), mime_type: z.string().max(120), size_bytes: z.number().int().positive().max(maxFileBytes), version: z.number().int().positive(), archived: z.boolean(), versions: z.array(versionSchema).max(50) }).strict();
export const documentsSchema = z.object({ items: z.array(documentSchema).max(100), page: z.number().int().positive(), page_size: z.number().int().min(1).max(100), total: z.number().int().nonnegative(), has_next: z.boolean(), has_previous: z.boolean() }).strict();
export const permitRequestSchema = z.object({ action: z.enum(["upload", "download"]), document_id: z.uuid(), expected_version: z.number().int().positive(), version_id: z.uuid().optional() }).strict();
export const permitSchema = z.object({ permit_id: z.uuid(), token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/), expires_at: z.iso.datetime({ offset: true }), version_id: z.uuid(), document_version: z.number().int().positive(), transfer_url: z.url() }).strict();
export const fileCommandSchema = z.object({ expected_version: z.number().int().positive() }).strict();
export type ProtectedDocument = z.infer<typeof documentSchema>;
export type FileVersion = z.infer<typeof versionSchema>;
export type TransferPermit = z.infer<typeof permitSchema>;
