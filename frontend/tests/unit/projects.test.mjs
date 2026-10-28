import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const ranges = loadServer("src/features/inventory/inventory-range.ts", { modules: { "./contracts": contracts } });
const model = loadServer("src/features/inventory/property-directory-model.ts", { modules: { "./contracts": contracts, "./inventory-range": ranges } });
const development = loadServer("src/features/inventory/development-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "./contracts": contracts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": contracts } });
const outcomes = loadServer("src/features/inventory/outcome-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/requirements/contracts": requirements, "./contracts": contracts } });
const empty = { items: [], total: 0, page: 1, page_size: 50, has_previous: false, has_next: false, category_counts: { land: 0, apartment: 0, villa: 0, house: 0, commercial: 0, riad: 0, room: 0, office: 0, farm: 0 }, unfiltered_total: 0 };

test("commercial premises remain valid across property, development, type and requirement contracts", () => {
  assert.equal(contracts.categoryLabels.commercial, "Local commercial");
  assert.equal(contracts.categorySchema.safeParse("commercial").success, true);
  assert.equal(development.developmentFieldsSchema.shape.category.safeParse("commercial").success, true);
  assert.equal(requirements.criterionSchema.safeParse({ key: "category", importance: "required", value: "commercial" }).success, true);
  assert.equal(contracts.propertiesSchema.safeParse(empty).success, true);
  assert.equal(contracts.propertiesSchema.safeParse({ ...empty, category_counts: { ...empty.category_counts, commercial: undefined } }).success, false);
});

test("property creation accepts one priced draft and rejects unpriced or activated offers", () => {
  const fields = { reference: "PRICED-1", category: "apartment", marketing_name: null, location: null, area_sqm: null };
  const draft = { kind: "sale", price_mad: "900000.01", price_period: null, currency: "MAD" };
  assert.equal(contracts.createPropertySchema.safeParse({ ...fields, initial_offering: draft }).success, true);
  for (const initial_offering of [
    { ...draft, price_mad: "0" },
    { ...draft, price_mad: null },
    { ...draft, price_period: "month" },
    { ...draft, state: "available" },
  ]) assert.equal(contracts.createPropertySchema.safeParse({ ...fields, initial_offering }).success, false);
  assert.equal(contracts.createPropertySchema.safeParse({ ...fields, initial_offering: { ...draft, kind: "rental", price_period: "year" } }).success, true);
});

test("property selections preserve all legacy categories and exact multiple/empty semantics", () => {
  for (const categories of ["land,villa", "house", "commercial", ""]) assert.equal(contracts.propertiesQuerySchema.safeParse({ categories }).success, true);
  for (const input of [{ categories: "land,land" }, { categories: " land" }, { categories: "castle" }, { categories: "land," }, { categories: "", category: "land" }]) assert.equal(contracts.propertiesQuerySchema.safeParse(input).success, false);
  assert.equal(contracts.propertiesQuerySchema.safeParse({ category: "house" }).success, true);
  assert.equal(contracts.inventoryQuerySchema.safeParse({ categories: "villa" }).success, false);
});
test("property paths keep empty selection, encoded literal search and server numbered sort", () => {
  const url = new URL(model.propertyListPath({ ...model.propertyDefaults, categories: "", q: "%_ &/", sort: "reference" }, 2), "https://synthetic.invalid");
  assert.equal(url.searchParams.get("categories"), ""); assert.equal(url.searchParams.get("q"), "%_ &/");
  assert.equal(url.searchParams.get("page"), "2"); assert.equal(url.searchParams.get("sort"), "reference");
  assert.equal(url.searchParams.has("offering_kind"), false); assert.equal(url.searchParams.get("target_level"), "standalone");
  assert.equal(url.search.includes("+"), false);
  assert.match(url.pathname + url.search, /^\/api\/v1\/[a-zA-Z0-9/?=&_.%-]+$/);
});
test("unchecking every visible category sends none without an invisible empty-house selection", () => {
  let selection = model.propertyDefaults.categories;
  for (const category of ["land", "apartment", "villa", "commercial", "riad", "room", "office", "farm"]) selection = model.togglePropertyCategory(selection, category, true);
  assert.equal(selection, "");
  assert.equal(model.togglePropertyCategory("villa,house", "villa", false), "house");
  assert.equal(model.togglePropertyCategory("", "house", false), "house");
});
function facade(response) {
  const calls = [];
  const { relayInventory: relay } = loadServer("src/features/inventory/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => "https://synthetic.invalid" },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return response; } },
    "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": contracts, "./development-contracts": development, "./outcome-contracts": outcomes, "./inventory-range": ranges,
  } });
  return { relay, calls };
}
test("property facade forwards current authority and exact filters; complete facets are mandatory", async () => {
  const { relay, calls } = facade({ status: 200, body: empty });
  const target = model.propertyListPath({ ...model.propertyDefaults, categories: "" }, 1);
  const result = await relay("properties", new Request("https://synthetic.invalid" + target), "request");
  assert.equal(result.status, 200); assert.equal(calls[0][0], target); assert.equal(calls[0][2].token, "synthetic-session"); assert.equal(result.headers.get("cache-control"), "no-store");
  const { relay: missing } = facade({ status: 200, body: { ...empty, category_counts: undefined } });
  assert.equal((await missing("properties", new Request("https://synthetic.invalid" + target), "request")).status, 503);
});
test("property facade rejects duplicate/ambiguous filters and category selection on other resources", async () => {
  const { relay, calls } = facade({ status: 200, body: empty });
  for (const suffix of ["categories=land&categories=villa", "categories=land&category=land", "categories=castle", "categories=land%20", "private_owner=1"]) assert.equal((await relay("properties", new Request("https://synthetic.invalid/api/v1/properties?" + suffix), "request")).status, 422);
  for (const route of ["offerings", "developments"]) assert.equal((await relay(route, new Request(`https://synthetic.invalid/api/v1/${route}?categories=land`), "request")).status, 422);
  assert.equal(calls.length, 0);
});

test("mixed programme filtering stays scoped to the development list and retains strict query guards", async () => {
  const page = { items: [], total: 0, page: 2, page_size: 20, has_previous: true, has_next: false };
  const { relay, calls } = facade({ status: 200, body: page });
  const target = "/api/v1/developments?category=mixed&page=2&page_size=20&sort=reference";
  assert.equal((await relay("developments", new Request("https://synthetic.invalid" + target), "request")).status, 200);
  assert.equal(calls[0][0], target); assert.equal(calls[0][2].token, "synthetic-session");
  for (const suffix of ["category=castle", "category=room", "category=mixed&category=land", "category=mixed&private_owner=1"]) assert.equal((await relay("developments", new Request("https://synthetic.invalid/api/v1/developments?" + suffix), "request")).status, 422);
  for (const route of ["properties", "offerings", "developments/00000000-0000-4000-8000-000000000001/inventory"]) assert.equal((await relay(route, new Request(`https://synthetic.invalid/api/v1/${route}?category=mixed`), "request")).status, 422);
  assert.equal(calls.length, 1);
});

test("property detail groups cover every listing field and preserve zero, empty and translated values", () => {
  const formatter = loadServer("src/features/inventory/listing-field-format.ts", { modules: { "./contracts": contracts } });
  const { listingDetailGroups } = loadServer("src/features/inventory/property-listing-details.tsx", { modules: {
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null }, "@/components/icons": {},
    "@/components/shared/record-facts": {}, "@/components/shared/record-workspace": {},
    "./contracts": contracts, "./listing-field-format": formatter,
  } });
  const displayed = [...Object.values(listingDetailGroups).flat(), "amenities", "description"];
  assert.equal(new Set(displayed).size, displayed.length);
  assert.deepEqual([...displayed].sort(), Object.keys(contracts.listingDetailsSchema.shape).sort());
  const property = { listing_details: { unit_floor: 0, garage_spaces: 0, city: null, amenities: ["sea_view", "elevator"], condition: "good" } };
  assert.equal(formatter.formatListingField(property, "unit_floor"), "0");
  assert.equal(formatter.formatListingField(property, "garage_spaces"), "0");
  assert.equal(formatter.formatListingField(property, "city"), null);
  assert.equal(formatter.formatListingField(property, "condition"), "Bon état");
  assert.equal(formatter.formatListingField(property, "amenities"), "Vue sur mer, Ascenseur");
});
test("property facade relays an initial holiday draft and rejects a foreign map host", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const { relay, calls } = facade({ status: 200, body: { property_id: id, offering_id: id, version: 2, event_id: id } });
  const property = {
    reference: "HOLIDAY-TEST", category: "riad", marketing_name: null, location: null,
    area_sqm: "170", rooms: 5,
    listing_details: { region: "Tanger-Tétouan-Al Hoceïma", city: "Tanger", bedrooms: 3, bathrooms: 2,
      capacity: 6, minimum_nights: 2, google_maps_url: "https://maps.app.goo.gl/example", amenities: [] },
    initial_offering: { kind: "holiday", price_mad: "950", price_period: "day", currency: "MAD" },
  };
  const request = body => new Request("https://synthetic.invalid/api/v1/properties", { method: "POST", body: JSON.stringify(body), headers: { Origin: "https://synthetic.invalid", "Idempotency-Key": id, "Content-Type": "application/json" } });
  assert.equal((await relay("properties", request(property), "request")).status, 200);
  assert.equal(JSON.parse(calls[0][2].body).initial_offering.kind, "holiday");
  assert.equal((await relay("properties", request({ ...property, listing_details: { ...property.listing_details, google_maps_url: "https://not-google.invalid/maps" } }), "request")).status, 422);
  assert.equal(calls.length, 1);
});

for (const resource of ["properties", "developments", "developments/00000000-0000-4000-8000-000000000001/inventory"]) test(`inventory range facade forwards exact ${resource} queries and rejects malformed or copied filters`, async () => {
  const id = "00000000-0000-4000-8000-000000000001", page = { items: [], total: 0, page: 1, page_size: 20, has_previous: false, has_next: false };
  const developmentBody = { id, reference: "SYN-1", name: "Synthetic programme", category: "mixed", location: null, version: 1, created_at: "2030-01-01T10:00:00Z", updated_at: "2030-01-01T10:00:00Z", archived_at: null, unit_count: 0, available_unit_count: 0, offerings: [] };
  const body = resource === "properties" ? empty : resource === "developments" ? page : { ...page, development: developmentBody };
  const { relay, calls } = facade({ status: 200, body });
  const suffix = "min_comparison_mad=9007199254740993.41&max_comparison_mad=9007199254740993.42" + (resource === "developments" ? "" : "&min_area_sqm=94.25&min_rooms=3");
  const target = `/api/v1/${resource}?${suffix}`;
  assert.equal((await relay(resource, new Request("https://synthetic.invalid" + target), "request")).status, 200);
  assert.equal(calls[0][0], target); assert.equal(calls[0][2].token, "synthetic-session");
  for (const invalid of ["min_comparison_mad=0", "min_comparison_mad=2&max_comparison_mad=1.99", "min_comparison_mad=-1", "min_comparison_mad=1.001", "min_rooms=1.5", "min_rooms=1001", "min_area_sqm=0", "min_comparison_mad=1&min_comparison_mad=2", "private_owner=1"])
    assert.equal((await relay(resource, new Request(`https://synthetic.invalid/api/v1/${resource}?${invalid}`), "request")).status, 422);
  if (resource === "developments") for (const copied of ["min_area_sqm=10", "min_rooms=2"])
    assert.equal((await relay(resource, new Request(`https://synthetic.invalid/api/v1/developments?${copied}`), "request")).status, 422);
  assert.equal(calls.length, 1);
});
