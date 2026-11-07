import { apiGet, ApiError } from "@/lib/api/client";
import { queryPath } from "@/features/contacts/use-query";
import type { InventoryTarget } from "./contracts";
import { blocksSchema, developmentSchema, floorsSchema, structureFieldsSchema, typeFieldsSchema, unitTypesSchema, type Block, type Development, type Floor, type UnitType } from "./development-contracts";

export type HierarchyKind = "blocks" | "floors" | "unit-types";
export type HierarchyItem = Block | Floor | UnitType;
export type HierarchyValues = { code: string; label: string; display_order: string; category: UnitType["category"]; default_area_sqm: string; default_rooms: string };
export type HierarchyComparison = { development: Development; item?: HierarchyItem };

export function legalOwnerValues(owners: InventoryTarget["owners"]) {
  return owners.flatMap(owner => owner.contact ? [{ id: owner.contact.id, name: owner.contact.name, display: owner.marketing_display ?? "" }] : []);
}

export function hierarchyValues(item?: HierarchyItem): HierarchyValues {
  const template = item && "category" in item ? item : undefined;
  return { code: item?.code ?? "", label: item?.label ?? "", display_order: item && "display_order" in item ? String(item.display_order) : "0", category: template?.category ?? "apartment", default_area_sqm: template?.default_area_sqm ?? "", default_rooms: template?.default_rooms == null ? "" : String(template.default_rooms) };
}

const integer = (value: string) => /^\d+$/.test(value.trim()) ? Number(value) : NaN;
export function hierarchyBody(kind: HierarchyKind, developmentId: string, version: number, values: HierarchyValues) {
  return kind === "unit-types"
    ? typeFieldsSchema.safeParse({ expected_version: version, development_id: developmentId, code: values.code, label: values.label, category: values.category, default_area_sqm: values.default_area_sqm.trim().replace(",", ".") || null, default_rooms: values.default_rooms.trim() ? integer(values.default_rooms) : null })
    : structureFieldsSchema.safeParse({ expected_version: version, code: values.code, label: values.label, display_order: integer(values.display_order) });
}

// The existing API has paged collections, not individual hierarchy GET routes.
// Read the real item and bracket it with the parent version before offering a rebase.
export async function readHierarchyComparison(developmentId: string, kind: HierarchyKind, parent: string, itemId: string | undefined, signal: AbortSignal): Promise<HierarchyComparison> {
  const path = `/api/v1/developments/${developmentId}` as const;
  const development = await apiGet(path, developmentSchema, signal);
  if (development.id !== developmentId) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  if (!itemId) return { development };
  const collection = kind === "floors" ? `blocks/${parent}/floors` : `developments/${developmentId}/${kind}`;
  let item: HierarchyItem | undefined;
  for (let page = 1; ; page++) {
    const target = queryPath(collection, { page, page_size: 100 });
    const result = kind === "unit-types" ? await apiGet(target, unitTypesSchema, signal) : kind === "floors" ? await apiGet(target, floorsSchema, signal) : await apiGet(target, blocksSchema, signal);
    if (result.page !== page || result.page_size !== 100) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    item = result.items.find(row => row.id === itemId);
    if (item || !result.has_next) break;
    if (!result.items.length || page * 100 >= result.total) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  }
  if (!item) throw new ApiError("NOT_FOUND", 404);
  if ("block_id" in item ? item.block_id !== parent : item.development_id !== developmentId) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const latest = await apiGet(path, developmentSchema, signal);
  if (latest.id !== developmentId) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  if (latest.version !== development.version) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409);
  return { development, item };
}
