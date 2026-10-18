import { propertyCategoryOrder } from "./contracts";

export const propertyDefaults = { archive: "active", q: "", categories: propertyCategoryOrder.join(","), offering_kind: "", state: "", sort: "-updated_at", page_size: 50 };
export type PropertyFilters = typeof propertyDefaults;
export function togglePropertyCategory(selection: string, category: typeof propertyCategoryOrder[number], emptyHouseHidden = false) {
  const selected = selection ? selection.split(",") : [];
  const next = propertyCategoryOrder.filter(item => item === category ? !selected.includes(item) : selected.includes(item));
  return emptyHouseHidden && next.length === 1 && next[0] === "house" ? "" : next.join(",");
}
export function propertyListPath(filters: PropertyFilters, page: number) {
  const params = new URLSearchParams({ page: String(page), target_level: "standalone" });
  for (const [key, value] of Object.entries(filters)) if (value !== "" || key === "categories") params.set(key, String(value));
  return `/api/v1/properties?${params.toString().replace(/\+/g, "%20")}` as const;
}
