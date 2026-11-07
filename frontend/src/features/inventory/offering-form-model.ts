import { apiGet, ApiError } from "@/lib/api/client";
import { confirmSchema, editOfferingSchema, newOfferingSchema, propertySchema, type InventoryTarget, type Offering } from "./contracts";
import { developmentSchema } from "./development-contracts";

export type OfferTarget = InventoryTarget & { reference?: string; archived_at?: string | null };
export type OfferingValues = { price: string; period: "day" | "week" | "month" | "year"; conditions: string; state: Offering["state"]; reason: string };
export const offeringPeriods = { sale: [], rental: ["month", "year"], holiday: ["day", "week", "month"] } as const;
export const periodLabels = { day: "Par jour", week: "Par semaine", month: "Par mois", year: "Par an" };

export function offeringValues(kind: Offering["kind"], offering?: Offering): OfferingValues {
  return { price: offering?.price_mad ?? "", period: offering?.price_period ?? (kind === "holiday" ? "day" : "month"), conditions: offering?.conditions ?? "", state: offering?.state ?? "draft", reason: "" };
}
function belongsToTarget(target: OfferTarget, item: Offering) {
  return target.inventoryLevel === "development" ? item.target_level === "development" && item.development_id === target.id : item.target_level === "property" && item.property_id === target.id;
}
export function currentOffering(target: OfferTarget, kind: Offering["kind"], id?: string) {
  return target.offerings.find(item => item.kind === kind && item.is_current && (!id || item.id === id) && belongsToTarget(target, item));
}
export function offeringEditable(target: OfferTarget, kind: Offering["kind"], id?: string) {
  if (target.archived_at || target.inventoryLevel === "development" && kind === "holiday" || target.offerings.some(item => !belongsToTarget(target, item))) return false;
  const current = currentOffering(target, kind, id);
  return id ? Boolean(current && ["draft", "available"].includes(current.state)) : !currentOffering(target, kind);
}
export function offeringBody(target: OfferTarget, kind: Offering["kind"], values: OfferingValues, id?: string, availability = false) {
  const current = currentOffering(target, kind, id);
  if (availability) return confirmSchema.safeParse({ expected_version: target.version, offering_id: current?.id, expected_offering_version: current?.version, reason: values.reason });
  const common = { price_mad: values.price.trim().replace(",", ".") || null, currency: "MAD", price_period: kind === "sale" ? null : values.period, conditions: values.conditions };
  const expected = target.inventoryLevel === "development" ? { expected_development_version: target.version } : { expected_property_version: target.version };
  return id
    ? editOfferingSchema.refine(value => kind === "sale" ? value.price_period === null : (offeringPeriods[kind] as readonly string[]).includes(value.price_period ?? ""), { path: ["price_period"] }).refine(value => value.state !== "available" || current?.state === "available", { path: ["state"] }).safeParse({ ...common, ...expected, expected_version: current?.version, state: values.state, reason: values.reason })
    : newOfferingSchema.safeParse({ ...common, ...expected, ...(target.inventoryLevel === "development" ? { development_id: target.id } : { property_id: target.id }), kind });
}
export async function readOfferingTarget(target: OfferTarget, signal: AbortSignal): Promise<OfferTarget> {
  const current = target.inventoryLevel === "development"
    ? { ...await apiGet(`/api/v1/developments/${target.id}`, developmentSchema, signal), inventoryLevel: "development" as const }
    : await apiGet(`/api/v1/properties/${target.id}`, propertySchema, signal);
  if (current.id !== target.id || current.offerings.some(item => !belongsToTarget(current, item))) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  return current;
}
