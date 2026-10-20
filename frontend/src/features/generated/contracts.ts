import { z } from "zod";

export const generatedParentSchema = z.object({ parent_kind: z.enum(["enquiry", "deal"]), parent_id: z.uuid() }).strict();
export const generatedFieldSchema = z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(160), group: z.string().min(1).max(80), multiline: z.boolean() }).strict();
export const templateSchema = z.object({ code: z.string().regex(/^(0[1-9]|1[0-2])$/), title: z.string().min(1).max(160), warning: z.string().min(1).max(800), fields: z.array(generatedFieldSchema).min(1).max(30) }).strict();
export const generatedContextSchema = z.object({ defaults: z.record(z.string(), z.string().max(500)), can_generate: z.boolean(), templates: z.array(templateSchema).min(1).max(12) }).strict();
export const generateBodySchema = generatedParentSchema.extend({ template_code: templateSchema.shape.code, values: z.record(z.string().max(40), z.string().max(1000)) }).strict();
export const generatedItemSchema = z.object({ id: z.uuid(), template_code: templateSchema.shape.code, filename: z.string().min(1).max(180), size_bytes: z.number().int().positive().max(20 * 1024 * 1024), version: z.number().int().positive(), version_id: z.uuid(), created_at: z.iso.datetime({ offset: true }) }).strict();
export const generatedHistorySchema = z.object({ items: z.array(generatedItemSchema).max(20), page: z.number().int().positive(), page_size: z.literal(20), total: z.number().int().nonnegative(), has_next: z.boolean(), has_previous: z.boolean() }).strict();
export type GeneratedItem = z.infer<typeof generatedItemSchema>;
export type GeneratedTemplate = z.infer<typeof templateSchema>;
