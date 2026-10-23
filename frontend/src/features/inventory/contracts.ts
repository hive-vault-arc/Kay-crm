import { z } from "zod";
import { numberedPage } from "@/features/contacts/contracts";

export const categoryLabels = { villa: "Villa", house: "Maison", apartment: "Appartement", riad: "Riad", room: "Chambre", land: "Terrain", commercial: "Local commercial", office: "Bureau", farm: "Ferme" } as const;
export const kindLabels = { sale: "Vente", rental: "Location", holiday: "Location vacances" } as const;
export const stateLabels = { draft: "Brouillon", available: "Disponible", reserved: "Réservée", withdrawn: "Retirée", sold: "Vendue", rented: "Louée", review: "Revue nécessaire" } as const;
export const categorySchema = z.enum(["villa", "house", "apartment", "riad", "room", "land", "commercial", "office", "farm"]);
const amount = z.string().regex(/^[0-9]{1,16}(\.[0-9]{1,2})?$/).refine(value => /[1-9]/.test(value));
const version = z.number().int().positive();
const date = z.iso.datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();
const optionalCount = (min: number, max: number) => z.number().int().min(min).max(max).nullable().optional();
const optionalAmount = amount.nullable().optional();
export const amenityLabels = {
  garden: "Jardin", terrace: "Terrasse", garage: "Garage", elevator: "Ascenseur", sea_view: "Vue sur mer", mountain_view: "Vue sur les montagnes", pool: "Piscine", concierge: "Concierge", storage_room: "Chambre rangement", furnished: "Meublé", exterior_facade: "Façade extérieure", entresol: "Entre-seul", moroccan_lounge: "Salon marocain", european_lounge: "Salon européen", satellite: "Antenne parabolique", fireplace: "Cheminée", air_conditioning: "Climatisation", central_heating: "Chauffage central", security: "Sécurité", double_glazing: "Double vitrage", reinforced_door: "Porte blindée", fitted_kitchen: "Cuisine équipée", fridge: "Réfrigérateur", oven: "Four", tv: "TV", washing_machine: "Machine à laver", microwave: "Micro-ondes", internet: "Internet", pets_allowed: "Animaux domestiques autorisés",
} as const;
export const amenitySchema = z.enum(Object.keys(amenityLabels) as [keyof typeof amenityLabels, ...(keyof typeof amenityLabels)[]]);
export const listingDetailsSchema = z.object({
  condition: z.enum(["new_or_renovated", "good", "to_renovate"]).nullable().optional(),
  address: optionalText(500), region: optionalText(120), city: optionalText(120), district: optionalText(120), neighborhood: optionalText(120),
  google_maps_url: z.url().max(2048).refine(value => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && !url.port && ((["google.com", "www.google.com"].includes(url.hostname) && url.pathname.startsWith("/maps")) || ["maps.google.com", "maps.app.goo.gl"].includes(url.hostname)); } catch { return false; } }).nullable().optional(),
  bedrooms: optionalCount(0, 1000), bathrooms: optionalCount(0, 1000), capacity: optionalCount(1, 1000), minimum_nights: optionalCount(1, 365),
  age_band: z.enum(["under_1", "1_5", "5_10", "10_20", "20_30", "30_50", "50_70", "70_100", "over_100"]).nullable().optional(),
  floor_type: z.enum(["parquet", "marble", "tile", "other"]).nullable().optional(), unit_floor: optionalCount(0, 20), building_floors: optionalCount(1, 4),
  orientation: z.enum(["north", "west", "east", "south"]).nullable().optional(), plot_area_sqm: optionalAmount,
  land_delivery: z.enum(["planned", "titled"]).nullable().optional(), land_status: z.enum(["subdivided", "not_subdivided"]).nullable().optional(),
  amenities: z.array(amenitySchema).max(29).default([]), garden_area_sqm: optionalAmount, terrace_area_sqm: optionalAmount, garage_spaces: optionalCount(1, 1000),
  description: optionalText(5000),
}).strict().refine(value => new Set(value.amenities).size === value.amenities.length).refine(value => (["garden", "terrace", "garage"] as const).every(option => value.amenities.includes(option) === Boolean(value[option === "garage" ? "garage_spaces" : option === "garden" ? "garden_area_sqm" : "terrace_area_sqm"])));
export const offeringTargetSchema = z.object({ id: z.uuid(), version, development_version: version.nullable(), level: z.enum(["standalone", "unit", "development"]), reference: z.string().max(80), label: z.string().max(160).nullable(), location: z.string().max(500).nullable(), category: categorySchema.nullable(), area_sqm: amount.nullable(), rooms: z.number().int().min(1).max(1000).nullable(), development_reference: z.string().max(80).nullable(), block_code: z.string().max(80).nullable(), floor_code: z.string().max(80).nullable(), unit_type_code: z.string().max(80).nullable(), archived: z.boolean() }).strict();
export const initialPropertyOfferingSchema = z.object({ kind: z.enum(["sale", "rental"]), price_mad: amount, price_period: z.enum(["month", "year"]).nullable(), currency: z.literal("MAD") }).strict().refine(value => (value.kind === "sale") === (value.price_period === null));
export const propertyFieldsSchema = z.object({ reference: z.string().trim().min(1).max(80), category: categorySchema, marketing_name: z.string().trim().min(1).max(160).nullable(), location: z.string().trim().min(1).max(500).nullable(), area_sqm: amount.nullable(), development_id: z.uuid().nullable().optional(), floor_id: z.uuid().nullable().optional(), unit_type_id: z.uuid().nullable().optional(), rooms: z.number().int().min(1).max(1000).nullable().optional(), listing_details: listingDetailsSchema.nullable().optional() }).strict();
export const editPropertySchema = propertyFieldsSchema.extend({ expected_version: version });
export const ownersSchema = z.object({ expected_version: version, owners: z.array(z.object({ contact_id: z.uuid(), marketing_display: z.string().trim().min(1).max(160).nullable() }).strict()).max(100) }).strict().refine(value => new Set(value.owners.map(owner => owner.contact_id)).size === value.owners.length);
const pricePeriodSchema = z.enum(["day", "week", "month", "year"]).nullable();
const validPricePeriod = (kind: string, period: string | null) => kind === "sale" ? period === null : kind === "rental" ? period === "month" || period === "year" : period === "day" || period === "week" || period === "month";
const offeringFields = { price_mad: amount.nullable(), currency: z.literal("MAD"), price_period: pricePeriodSchema, conditions: z.string().trim().max(2000) };
export const initialOfferingSchema = z.object({ kind: z.enum(["sale", "rental", "holiday"]), price_mad: amount, price_period: pricePeriodSchema, currency: z.literal("MAD") }).strict().refine(value => validPricePeriod(value.kind, value.price_period));
export const createPropertySchema = propertyFieldsSchema.extend({ initial_offering: initialOfferingSchema.nullable().optional() }).refine(value => !value.initial_offering || (value.initial_offering.kind !== "holiday" || (["apartment", "house", "villa", "riad", "room"].includes(value.category) && !value.development_id))).refine(value => value.category !== "room" || value.initial_offering?.kind !== "sale");
export const newOfferingSchema = z.object({ ...offeringFields, property_id: z.uuid().nullable().optional(), development_id: z.uuid().nullable().optional(), expected_property_version: version.optional(), expected_development_version: version.optional(), kind: z.enum(["sale", "rental", "holiday"]) }).strict().refine(value => validPricePeriod(value.kind, value.price_period)).refine(value => Boolean(value.property_id) !== Boolean(value.development_id)).refine(value => value.kind !== "holiday" || !value.development_id);
export const editOfferingSchema = z.object({ ...offeringFields, expected_property_version: version.optional(), expected_development_version: version.optional(), expected_version: version, state: z.enum(["draft", "available", "withdrawn"]), reason: z.string().trim().min(1).max(1000) }).strict();
export const confirmSchema = z.object({ expected_version: version, offering_id: z.uuid(), expected_offering_version: version, reason: z.string().trim().min(1).max(1000) }).strict();
export const stockConflictSchema = z.enum(["RESERVATION_CONFLICT", "DEVELOPMENT_OVERLAP"]);
export const offeringSchema = z.object({ id: z.uuid(), property_id: z.uuid().nullable(), development_id: z.uuid().optional(), target_level: z.enum(["property", "development"]), kind: z.enum(["sale", "rental", "holiday"]), state: z.enum(["draft", "available", "reserved", "withdrawn", "sold", "rented", "review"]), occupied: z.boolean(), is_current: z.boolean(), version, price_mad: amount.nullable(), currency: z.literal("MAD"), price_period: pricePeriodSchema, annual_equivalent_mad: z.string().regex(/^[0-9]{1,18}\.[0-9]{2}$/).nullable(), conditions: z.string().max(2000), availability_confirmed_at: date.nullable(), created_at: date, target: offeringTargetSchema.optional(), reservation_conflict: stockConflictSchema.nullable().optional() }).strict();
const scopeLabel = z.object({ id: z.uuid(), code: z.string().max(40), label: z.string().max(160) }).strict();
const hierarchySchema = z.object({ development: z.object({ id: z.uuid(), reference: z.string().max(80), name: z.string().max(160) }).strict(), block: scopeLabel.nullable(), floor: scopeLabel.nullable(), unit_type: scopeLabel.nullable() }).strict();
const propertyShape = { ...propertyFieldsSchema.shape, listing_details: listingDetailsSchema, archived_at: date.nullable(), hierarchy: hierarchySchema.optional(), id: z.uuid(), version, created_at: date, updated_at: date, offerings: z.array(offeringSchema).max(3) };
export const propertySummarySchema = z.object(propertyShape).strict();
export const propertySchema = z.object({ ...propertyShape, owners: z.array(z.object({ marketing_display: z.string().max(160).nullable(), contact: z.object({ id: z.uuid(), name: z.string().max(160) }).strict().nullable() }).strict()).max(100) }).strict();
export const propertyCategoryOrder = ["land", "apartment", "villa", "house", "riad", "room", "commercial", "office", "farm"] as const;
export const propertiesSchema = numberedPage(propertySummarySchema).extend({
  category_counts: z.object({ land: z.number().int().nonnegative(), apartment: z.number().int().nonnegative(), villa: z.number().int().nonnegative(), house: z.number().int().nonnegative(), riad: z.number().int().nonnegative(), room: z.number().int().nonnegative(), commercial: z.number().int().nonnegative(), office: z.number().int().nonnegative(), farm: z.number().int().nonnegative() }).strict(),
  unfiltered_total: z.number().int().nonnegative(),
});
export const offeringsSchema = numberedPage(offeringSchema);
export const resultSchema = z.union([z.object({ property_id: z.uuid(), offering_id: z.uuid().nullable(), version, event_id: z.uuid() }).strict(), z.object({ development_id: z.uuid(), offering_id: z.uuid().nullable(), version, event_id: z.uuid() }).strict()]);
export const historySchema = numberedPage(z.object({ id: z.uuid(), offering_id: z.uuid().nullable(), actor: z.object({ id: z.uuid(), display_name: z.string().max(160) }).strict(), action: z.string().max(40), property_version: version, offering_version: version.nullable(), state: z.enum(["draft", "available", "reserved", "withdrawn", "sold", "rented", "review"]).nullable(), price_mad: amount.nullable(), price_period: pricePeriodSchema, conditions: z.string().max(2000).nullable(), completed_on: z.iso.date().nullable(), external_outcome: z.boolean().nullable(), reason: z.string().max(1000), occurred_at: date }).strict());
export const inventoryQuerySchema = z.object({ archive: z.enum(["active", "archived", "all"]).optional(), page: z.coerce.number().int().min(1).max(1_000_000).optional(), page_size: z.coerce.number().int().min(1).max(100).optional(), q: z.string().max(160).optional(), category: categorySchema.optional(), kind: z.enum(["sale", "rental", "holiday"]).optional(), offering_kind: z.enum(["sale", "rental", "holiday"]).optional(), target_level: z.enum(["property", "development", "standalone", "unit"]).optional(), state: z.enum(["draft", "available", "reserved", "withdrawn", "sold", "rented", "review", "all"]).optional(), property_id: z.uuid().optional(), development_id: z.uuid().optional(), block_id: z.uuid().optional(), floor_id: z.uuid().optional(), unit_type_id: z.uuid().optional(), sort: z.enum(["reference", "-updated_at"]).optional(), min_comparison_mad: z.string().regex(/^[0-9]{1,18}(\.[0-9]{1,2})?$/).optional(), max_comparison_mad: z.string().regex(/^[0-9]{1,18}(\.[0-9]{1,2})?$/).optional(), min_area_sqm: amount.optional(), min_rooms: z.coerce.number().int().min(1).max(1000).optional() }).strict();
export type Property = z.infer<typeof propertySchema>;
export const propertiesQuerySchema = inventoryQuerySchema.extend({ categories: z.string().max(120).refine(value => value === "" || (value.split(",").every(category => propertyCategoryOrder.includes(category as typeof propertyCategoryOrder[number])) && new Set(value.split(",")).size === value.split(",").length)).optional() }).refine(value => value.category === undefined || value.categories === undefined);
export type PropertyPage = z.infer<typeof propertiesSchema>;
export type PropertySummary = z.infer<typeof propertySummarySchema>;
export type Offering = z.infer<typeof offeringSchema>;
export type InventoryTarget = Pick<Property, "id" | "version" | "owners" | "offerings"> & { inventoryLevel?: "development" };

export function inventoryRoute(key: string, method: string) {
  const id = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
  if (["properties", "offerings", "developments"].includes(key)) return ["GET", "POST"].includes(method);
  if (new RegExp(`^(properties|developments)/${id}$`).test(key)) return ["GET", "PATCH"].includes(method);
  if (new RegExp(`^properties/${id}/owners$`).test(key)) return method === "PUT";
  if (new RegExp(`^developments/${id}/owners$`).test(key)) return ["GET", "PUT"].includes(method);
  if (new RegExp(`^(properties|developments)/${id}/stock-review$`).test(key)) return method === "GET";
  if (new RegExp(`^(properties|developments)/${id}/(external-outcome|confirm-availability|archive|restore)$`).test(key)) return method === "POST";
  if (new RegExp(`^(properties|developments)/${id}/history$`).test(key)) return method === "GET";
  if (new RegExp(`^developments/${id}/inventory$`).test(key)) return method === "GET";
  if (new RegExp(`^developments/${id}/(blocks|unit-types)$`).test(key)) return ["GET", "POST"].includes(method);
  if (new RegExp(`^blocks/${id}/floors$`).test(key)) return ["GET", "POST"].includes(method);
  if (new RegExp(`^(blocks|floors|unit-types|offerings)/${id}$`).test(key)) return method === "PATCH";
  return false;
}
