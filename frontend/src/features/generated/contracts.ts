import { z } from "zod";

export const generatedParentSchema = z.object({ parent_kind: z.enum(["enquiry", "deal"]), parent_id: z.uuid() }).strict();
export const generatedFieldSchema = z.object({ key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), label: z.string().min(1).max(160), group: z.string().min(1).max(80), multiline: z.boolean() }).strict();
export const templateSchema = z.object({ code: z.string().regex(/^(0[1-9]|1[0-2])$/), title: z.string().min(1).max(160), warning: z.string().min(1).max(800), fields: z.array(generatedFieldSchema).min(1).max(30) }).strict().refine(value => new Set(value.fields.map(field => field.key)).size === value.fields.length);
export const generatedContextSchema = z.object({ defaults: z.record(z.string(), z.string().max(500)), can_generate: z.boolean(), templates: z.array(templateSchema).min(1).max(12) }).strict().refine(value => new Set(value.templates.map(template => template.code)).size === value.templates.length);
export const generateBodySchema = generatedParentSchema.extend({ template_code: templateSchema.shape.code, values: z.record(z.string().max(40), z.string().refine(value => Array.from(value).length <= 1000 && !Array.from(value).some(char => /\p{C}/u.test(char) && char !== "\n" && char !== "\t"))) }).strict().refine(value => Object.keys(value.values).length <= 30);
export const generatedItemSchema = z.object({ id: z.uuid(), template_code: templateSchema.shape.code, filename: z.string().min(1).max(180), size_bytes: z.number().int().positive().max(20 * 1024 * 1024), version: z.number().int().positive(), version_id: z.uuid(), created_at: z.iso.datetime({ offset: true }) }).strict();
export const generatedHistorySchema = z.object({ items: z.array(generatedItemSchema).max(20), page: z.number().int().positive(), page_size: z.literal(20), total: z.number().int().nonnegative(), has_next: z.boolean(), has_previous: z.boolean() }).strict();
export const generatedActorSchema = z.object({ id: z.uuid(), display_name: z.string().min(1).max(160) }).strict();
export const generatedHistoryItemSchema = generatedItemSchema.extend({ actor: generatedActorSchema });
export const generatedHistoryWithActorsSchema = generatedHistorySchema.extend({ items: z.array(generatedHistoryItemSchema).max(20) });
export type GeneratedItem = z.infer<typeof generatedItemSchema>;
export type GeneratedHistoryItem = z.infer<typeof generatedHistoryItemSchema>;
export type GeneratedTemplate = z.infer<typeof templateSchema>;
export type GeneratedContext = z.infer<typeof generatedContextSchema>;
export type GenerateBody = z.infer<typeof generateBodySchema>;
