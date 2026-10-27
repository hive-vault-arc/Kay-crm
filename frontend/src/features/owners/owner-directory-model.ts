import type { StaffRole } from "@/features/contacts/contracts";
import { queryPath } from "@/features/contacts/use-query";
import type { OwnerAsset } from "./contracts";

export const ownerDirectoryDefaults = { q: "", archive: "active" };
export function ownerDirectoryPath(filters: typeof ownerDirectoryDefaults, page: number, role: StaffRole) {
  return queryPath("contacts", { owner_directory: "true", q: filters.q.trim(), archive: role === "agent" ? "active" : filters.archive, page, page_size: 20 });
}
export function ownerAssetHref(asset: Pick<OwnerAsset, "kind" | "id">) {
  return asset.kind === "property" ? `/projects/properties/${asset.id}` : `/projects/${asset.id}`;
}
export function ownerDrawerIntent(event: { defaultPrevented: boolean; button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }, hydrated: boolean) {
  return hydrated && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
