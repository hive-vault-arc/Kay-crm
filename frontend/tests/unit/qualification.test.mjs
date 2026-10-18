import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const conversion = loadServer("src/features/deals/qualification-contracts.ts", {
  modules: { "@/features/contacts/qualification-contracts": vocabulary },
});
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const deals = loadServer("src/features/deals/contracts.ts", { modules: {
  "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary,
  "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": conversion,
} });
const eid = "00000000-0000-4000-8000-000000000001";
const result = { id: "00000000-0000-4000-8000-000000000002", version: 1, customer_offer_id: null, offer_version: null };
const body = { expected_version: 1, project: { external_name: "Projet synthétique" }, initial_budget: "500000", purchase_reasons: ["residence"] };
const origin = "https://frontend.synthetic.invalid";

test("qualification vocabulary and conversion reject a missing project, budget, intent or invented title", () => {
  assert.equal(Object.keys(vocabulary.campaignLabels).length, 20);
  assert.equal(conversion.convertLeadSchema.safeParse(body).success, true);
  for (const missing of ["project", "initial_budget", "purchase_reasons"]) {
    const incomplete = { ...body }; delete incomplete[missing];
    assert.equal(conversion.convertLeadSchema.safeParse(incomplete).success, false);
  }
  for (const patch of [{ title: "Arbitrary" }, { project: {} }, { purchase_reasons: [] }, { purchase_reasons: ["residence", "residence"] }, { project: { development_id: eid, external_name: "Both" } }])
    assert.equal(conversion.convertLeadSchema.safeParse({ ...body, ...patch }).success, false);
});

function facade() {
  const calls = [];
  const schema = z.object({ id: z.uuid(), version: z.number().int().positive(), customer_offer_id: z.uuid().nullable(), offer_version: z.number().int().positive().nullable() }).strict();
  const loaded = loadServer("src/features/deals/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: result }; } },
    "./contracts": { resultSchema: schema },
    "./qualification-contracts": conversion,
    "@/features/contacts/contracts": contacts,
    "@/lib/api/errors": { frenchApiError: code => code },
    "@/features/inventory/outcome-contracts": {},
  } });
  return { calls, relay: loaded.relayDeals };
}

function request(value = body, extra = {}) {
  return new Request(`${origin}/api/v1/enquiries/${eid}/convert`, { method: "POST", headers: {
    "Content-Type": "application/json", Origin: origin, "Idempotency-Key": eid, "X-CSRF-Token": "synthetic-csrf", ...extra,
  }, body: JSON.stringify(value) });
}

test("conversion facade forwards the exact versioned command and existing session protection", async () => {
  const { calls, relay } = facade();
  const response = await relay(`enquiries/${eid}/convert`, request(), "synthetic-request");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), result);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], `/api/v1/enquiries/${eid}/convert`);
  assert.deepEqual(JSON.parse(calls[0][2].body), body);
  assert.equal(calls[0][2].token, "synthetic-session");
  assert.equal(calls[0][2].csrf, "synthetic-csrf");
  assert.equal(calls[0][2].idempotencyKey, eid);
});

test("manual deal and edit use required qualification and forbid title and conversion bypass", () => {
  const qualified = { initial_budget: "500000", projects: [{ external_name: "Projet synthétique" }], purchase_reasons: ["residence"], campaign_source: "facebook", rating: "hot", payment_method: null, number_of_rooms: null, notes: "", requirement_id: null, offering_id: null, expected_offering_version: null, next_action: "Rappeler" };
  assert.equal(deals.newDealSchema.safeParse({ ...qualified, contact_id: eid, stage: "new" }).success, true);
  assert.equal(deals.editDealSchema.safeParse({ ...qualified, expected_version: 1 }).success, true);
  for (const patch of [{ title: "Libre" }, { enquiry_id: eid }, { projects: [] }, { projects: [{ external_name: "Projet" }, { external_name: "PROJET" }] }, { purchase_reasons: [] }, { payment_method: "invented" }, { offering_id: eid }, { number_of_rooms: -1 }]) {
    assert.equal(deals.newDealSchema.safeParse({ ...qualified, contact_id: eid, stage: "new", ...patch }).success, false);
    assert.equal(deals.editDealSchema.safeParse({ ...qualified, expected_version: 1, ...patch }).success, false);
  }
  const client = { name: "Client synthétique", type: "person", phones: [{ number: "+33600000002", is_primary: true, label: "" }], emails: [], roles: ["buyer"], languages: ["french"] };
  assert.equal(deals.newDealSchema.safeParse({ ...qualified, new_contact: client, stage: "new" }).success, true);
  assert.equal(deals.newDealSchema.safeParse({ ...qualified, new_contact: client, contact_id: eid, stage: "new" }).success, false);
  assert.equal(deals.newDealSchema.safeParse({ ...qualified, new_contact: { ...client, languages: [] }, stage: "new" }).success, false);
});

test("lead list requires a complete bounded status distribution", () => {
  const counts = Object.fromEntries(Object.keys(contacts.statusLabels).map(status => [status, 0]));
  const page = { items: [], page: 1, page_size: 1, total: 0, has_next: false, has_previous: false };
  assert.equal(contacts.enquiriesSchema.safeParse({ ...page, status_counts: counts }).success, true);
  assert.equal(contacts.enquiriesSchema.safeParse(page).success, false);
  for (const invalid of [{ ...counts, follow_up: undefined }, { ...counts, qualified: -1 }, { ...counts, new: 0.5 }, { ...counts, invented: 1 }]) {
    assert.equal(contacts.enquiriesSchema.safeParse({ ...page, status_counts: invalid }).success, false);
  }
});

test("rich table preferences retain only bounded unique column identifiers", () => {
  const preferences = loadServer("src/lib/table/column-preferences.ts");
  const visibleColumns = ["name", "projects", "status", "budget", "rating", "country", "source", "responsibleAgent", "updatedAt"];
  assert.equal(preferences.parseColumnPreference({ version: 1, list: "deals", visibleColumns })?.visibleColumns.length, 9);
  for (const value of [
    { version: 1, list: "deals", visibleColumns: ["name", "name"] },
    { version: 1, list: "deals", visibleColumns, contact: "Private client fact" },
    { version: 1, list: "deals", visibleColumns: ["private_client_name"] },
  ]) assert.equal(preferences.parseColumnPreference(value), null);
});

test("conversion facade rejects foreign origins, missing retry keys and free titles before upstream", async () => {
  for (const [value, headers, expected] of [
    [body, { Origin: "https://foreign.synthetic.invalid" }, 403],
    [body, { "Idempotency-Key": "" }, 422],
    [{ ...body, title: "Not a conversion input" }, {}, 422],
  ]) {
    const { calls, relay } = facade();
    assert.equal((await relay(`enquiries/${eid}/convert`, request(value, headers), "synthetic-request")).status, expected);
    assert.equal(calls.length, 0);
  }
});
