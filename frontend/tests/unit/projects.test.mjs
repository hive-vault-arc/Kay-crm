import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const model = loadServer("src/features/inventory/property-directory-model.ts", { modules: { "./contracts": contracts } });
const development = loadServer("src/features/inventory/development-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "./contracts": contracts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": contracts } });
const outcomes = loadServer("src/features/inventory/outcome-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/requirements/contracts": requirements, "./contracts": contracts } });
const empty = { items: [], total: 0, page: 1, page_size: 50, has_previous: false, has_next: false, category_counts: { land: 0, apartment: 0, villa: 0, house: 0, commercial: 0 }, unfiltered_total: 0 };

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
  for (const category of ["land", "apartment", "villa", "commercial"]) selection = model.togglePropertyCategory(selection, category, true);
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
    "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": contracts, "./development-contracts": development, "./outcome-contracts": outcomes,
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
