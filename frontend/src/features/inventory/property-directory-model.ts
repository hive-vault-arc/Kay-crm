import { propertyCategoryOrder } from "./contracts";
import { inventoryRangeDefaults, inventoryRangeQuery } from "./inventory-range";

export const propertyDefaults = { archive: "active", q: "", categories: propertyCategoryOrder.join(","), offering_kind: "", state: "", sort: "-updated_at", page_size: 20, ...inventoryRangeDefaults };
export type PropertyFilters = typeof propertyDefaults;
export function propertyCategoryChoice(selection: string) {
  const selected = selection.split(",");
  if (selected.length === propertyCategoryOrder.length && propertyCategoryOrder.every(category => selected.includes(category))) return "all";
  return selected.length === 1 && propertyCategoryOrder.some(category => category === selection) ? selection : "";
}
export function propertyListPath(filters: PropertyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), target_level: "standalone" });
  for (const [key, value] of Object.entries({ ...filters, ...inventoryRangeQuery(filters) })) if (value !== "" || key === "categories") params.set(key, String(value));
  return `/api/v1/properties?${params.toString().replace(/\+/g, "%20")}` as const;
}
