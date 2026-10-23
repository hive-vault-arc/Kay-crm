import { z } from "zod";
import { numberedPage } from "@/features/contacts/contracts";

const link = z.object({
  id: z.uuid(), kind: z.enum(["discussed", "visited"]),
  development_id: z.uuid().nullable(), property_id: z.uuid().nullable(),
  name: z.string().min(1).max(160), created_at: z.iso.datetime({ offset: true }),
}).strict();
export const projectLinksSchema = numberedPage(link);
export const projectLinkResultSchema = z.object({ id: z.uuid() }).strict();
export const projectLinkQuerySchema = z.object({
  kind: z.enum(["discussed", "visited"]),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  page_size: z.coerce.number().int().min(1).max(50).optional(),
}).strict();
export const newProjectLinkSchema = z.object({
  kind: z.enum(["discussed", "visited"]), development_id: z.uuid().optional(),
  property_id: z.uuid().optional(),
}).strict().refine(value => Boolean(value.development_id) !== Boolean(value.property_id));
export const removeProjectLinkSchema = z.object({}).strict();
export const catalogueChoicesSchema = numberedPage(z.object({
  id: z.uuid(), reference: z.string(), name: z.string().optional(),
  marketing_name: z.string().nullable().optional(),
}).passthrough()).passthrough();
export type ProjectLink = z.infer<typeof link>;
