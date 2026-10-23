import { z } from "zod";
import { numberedPage } from "@/features/contacts/contracts";

const instant = z.iso.datetime({ offset: true });
export const ownerAssetSchema = z.object({
  link_id: z.uuid(), kind: z.enum(["property", "development"]), id: z.uuid(),
  reference: z.string().min(1).max(80), name: z.string().max(160).nullable(),
  category: z.string().min(1).max(40), location: z.string().max(500).nullable(),
  asset_archived_at: instant.nullable(), linked_at: instant, unlinked_at: instant.nullable(),
}).strict();
export const ownerPortfolioSchema = numberedPage(ownerAssetSchema);
export const ownerPortfolioQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).optional(),
  page_size: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(["current", "past"]).optional(),
}).strict();
export type OwnerAsset = z.infer<typeof ownerAssetSchema>;
