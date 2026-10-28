import { inventoryQuerySchema } from "./contracts";

export const inventoryRangeDefaults = { min_comparison_mad: "", max_comparison_mad: "", min_area_sqm: "", min_rooms: "" };
export type InventoryRangeValues = typeof inventoryRangeDefaults;
export type InventoryRangeKey = keyof InventoryRangeValues;
export const inventoryRangeLabels: Record<InventoryRangeKey, string> = {
  min_comparison_mad: "Prix ou loyer annuel minimum (MAD)", max_comparison_mad: "Prix ou loyer annuel maximum (MAD)",
  min_area_sqm: "Surface minimale (m²)", min_rooms: "Pièces minimales",
};
const fields = inventoryQuerySchema.pick({ min_comparison_mad: true, max_comparison_mad: true, min_area_sqm: true, min_rooms: true });

export function inventoryRangeQuery(values: Partial<InventoryRangeValues>) {
  return Object.fromEntries((Object.keys(inventoryRangeDefaults) as InventoryRangeKey[]).map(key => {
    const input = values[key]?.trim() ?? "";
    return [key, key === "min_rooms" ? /^\d{1,4}$/.test(input) ? String(Number(input)) : input : input.replace(",", ".")];
  })) as InventoryRangeValues;
}

export function inventoryRangeProblem(values: Partial<InventoryRangeValues>): { field: InventoryRangeKey; message: string } | undefined {
  const normalized = inventoryRangeQuery(values), rooms = normalized.min_rooms;
  for (const field of ["min_comparison_mad", "max_comparison_mad"] as const) {
    if (normalized[field] && !/[1-9]/.test(normalized[field])) return { field, message: `${inventoryRangeLabels[field]} : saisissez une valeur positive, avec deux décimales maximum.` };
  }
  if (rooms && (!/^\d{1,4}$/.test(rooms) || Number(rooms) < 1 || Number(rooms) > 1000)) {
    return { field: "min_rooms", message: "Saisissez entre 1 et 1 000 pièces, sans décimales." };
  }
  const result = fields.safeParse(Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== "")));
  if (!result.success) {
    const field = result.error.issues[0].path[0] as InventoryRangeKey;
    return { field, message: `${inventoryRangeLabels[field]} : saisissez une valeur positive, avec deux décimales maximum.` };
  }
  const cents = (value: string) => { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0")); };
  if (normalized.min_comparison_mad && normalized.max_comparison_mad && cents(normalized.min_comparison_mad) > cents(normalized.max_comparison_mad)) {
    return { field: "max_comparison_mad", message: "Le maximum doit être supérieur ou égal au minimum." };
  }
}

export const inventoryRangeError = (values: Partial<InventoryRangeValues>) => inventoryRangeProblem(values)?.message ?? "";
