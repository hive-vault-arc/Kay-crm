import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { recordFixture, inventoryHostFixture, find, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { loadRecordCommand, recordIntents } from "./record-command-fixtures.mjs";

function fixture(kind = "owners", { root = kind === "structure" ? "developments" : "properties", element = "blocks", edit = false, availability = false, role = "manager", dispatch, completeRead, proof, hydrated = true } = {}) {
  const h = entryHarness(), source = recordFixture(root), calls = [], completed = [], scope = { root, id: source.id, version: source.version, kind }, parent = element === "floors" ? randomUUID() : source.id;
  if (root === "developments") source.inventoryLevel = "development";
  let path, method, body;
  if (kind === "owners") { path = `/api/v1/${root}/${source.id}/owners`; method = "PUT"; body = { expected_version: 7, owners: [{ contact_id: randomUUID(), marketing_display: "Synthetic shared owner label" }] }; }
  if (kind === "offering") {
    Object.assign(scope, { campaign: source.offerings[0].kind, offeringId: edit || availability ? source.offerings[0].id : undefined, availability });
    const expected = root === "properties" ? { expected_property_version: 7 } : { expected_development_version: 7 };
    if (availability) { path = `/api/v1/${root}/${source.id}/confirm-availability`; method = "POST"; body = { expected_version: 7, offering_id: scope.offeringId, expected_offering_version: 3, reason: "Synthetic confirmation" }; }
    else { path = edit ? `/api/v1/offerings/${scope.offeringId}` : "/api/v1/offerings"; method = edit ? "PATCH" : "POST"; body = { ...expected, price_mad: "9007199254740993.01", currency: "MAD", price_period: null, conditions: "Synthetic exact original conditions", ...(edit ? { expected_version: 3, state: "withdrawn", reason: "Synthetic retirement" } : { [root === "properties" ? "property_id" : "development_id"]: source.id, kind: "sale" }) }; if (!edit) source.offerings = []; }
  }
  if (kind === "structure") { Object.assign(scope, { element, parent, itemId: edit ? randomUUID() : undefined }); path = edit ? `/api/v1/${element}/${scope.itemId}` : `/api/v1/${element === "floors" ? "blocks" : "developments"}/${parent}/${element}`; method = edit ? "PATCH" : "POST"; body = { expected_version: 7, code: "SYN-E", label: "Synthetic element", ...(element === "unit-types" ? { development_id: source.id, category: "apartment", default_area_sqm: "108.50", default_rooms: 3 } : { display_order: 0 }) }; }
  const loader = loadRecordCommand(h, { source, role, proof, hydrated, completeRead, dispatch: async context => { calls.push(context.args); return dispatch ? dispatch(context) : context.commit(); } });
  const render = () => h.render(() => loader.useInventoryRecordCommand(scope));
  return { ...h, ...loader, source, scope, path, method, body, calls, completed, render, save: (value = body, finish = record => completed.push(record)) => render().submit(path, value, method, finish) };
}
test("Record intents strictly bind legal owner, offer/availability and structure paths, counters and parent identities", () => {
  for (const [kind, options] of [["owners", {}], ["owners", { root: "developments" }], ["offering", {}], ["offering", { root: "developments", edit: true }], ["offering", { availability: true }], ["structure", {}], ["structure", { element: "floors" }], ["structure", { element: "unit-types", edit: true }]]) {
    const s = fixture(kind, options), parse = recordIntents.recordCommandIntent; assert.ok(parse(s.scope, s.path, s.body, s.method), kind);
    assert.equal(parse(s.scope, s.path + "/extra", s.body, s.method), undefined); assert.equal(parse(s.scope, s.path, { ...s.body, actor_user_id: randomUUID() }, s.method), undefined); if (kind === "offering" && options.edit) assert.equal(parse({ ...s.scope, offeringId: randomUUID() }, s.path, s.body, s.method), undefined); else if (kind === "structure" && options.element === "floors") assert.equal(parse({ ...s.scope, parent: randomUUID() }, s.path, s.body, s.method), undefined); else assert.equal(parse({ ...s.scope, id: randomUUID() }, s.path, s.body, s.method), undefined);
  }
  const offer = fixture("offering"); assert.equal(recordIntents.recordCommandIntent(offer.scope, offer.path, { ...offer.body, property_id: randomUUID() }, "POST"), undefined);
  const type = fixture("structure", { element: "unit-types" }); assert.equal(recordIntents.recordCommandIntent(type.scope, type.path, { ...type.body, development_id: randomUUID() }, "POST"), undefined);
  assert.equal(recordIntents.recordCommandIntent({ ...offer.scope, root: "developments", campaign: "holiday" }, offer.path, offer.body, "POST"), undefined);
});
for (const [kind, options] of [["owners", {}], ["owners", { root: "developments" }], ["offering", {}], ["offering", { edit: true }], ["offering", { root: "developments", availability: true }], ["structure", {}], ["structure", { element: "floors", edit: true }], ["structure", { element: "unit-types" }]]) {
  test(`Bound ${kind} ${JSON.stringify(options)} retains the original request and UI callback after a lost receipt`, async () => {
    let lost = true; const s = fixture(kind, { ...options, dispatch: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } }), original = JSON.stringify(s.body);
    await s.save(); assert.equal(s.render().uncertain, true); assert.equal(s.render().canEdit(), false); assert.equal(s.publications.at(-1), true); s.body.expected_version = 50; await s.save(); assert.equal(s.calls.length, 1);
    lost = false; await s.render().retry(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(JSON.stringify(s.calls[0][1]), JSON.stringify(s.calls[1][1])); assert.deepEqual(JSON.parse(JSON.stringify(s.calls[1][1])), JSON.parse(original)); assert.equal(s.commits(), 1); assert.equal(s.completed.length, 1); assert.equal(s.accepted.length, 1); assert.equal(s.publications.at(-1), false);
    await s.save(); assert.equal(s.calls.length, 2);
  });
}
test("Acknowledged record read or async UI failure retries completion without another PUT/PATCH/POST", async () => {
  for (const kind of ["owners", "offering", "structure"]) {
    let outage = true; const s = fixture(kind, { edit: kind === "offering", completeRead: (_path, schema, _signal, server) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(server); } }); await s.save(); assert.equal(s.render().acknowledged, true); assert.equal(s.completed.length, 0); outage = false; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed.length, 1);
  }
  let outage = true; const s = fixture(); await s.save(s.body, record => { if (outage) throw new Error("Synthetic UI completion failure"); s.completed.push(record); }); outage = false; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed.length, 1);
});
test("Foreign receipt kind, parent, offering and stale counters cannot install a private result", async () => {
  for (const [kind, options, patch] of [["owners", {}, { property_id: randomUUID() }], ["owners", {}, { offering_id: randomUUID() }], ["owners", {}, { version: 7 }], ["structure", {}, "wrong-root"], ["offering", { edit: true }, { offering_id: randomUUID() }], ["offering", {}, { offering_id: null }]]) {
    let invalid = true; const s = fixture(kind, { ...options, dispatch: ({ commit }) => { const receipt = commit(); return invalid ? patch === "wrong-root" ? { property_id: receipt.development_id, offering_id: null, version: 8, event_id: receipt.event_id } : { ...receipt, ...patch } : receipt; } });
    await s.save(); assert.equal(s.render().acknowledged, false); assert.equal(s.completed.length, 0); invalid = false; await s.render().retry(); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); assert.equal(s.completed.length, 1);
  }
});
test("Foreign/stale current records and nonadvanced same-offer counters cannot complete acknowledged edits", async () => {
  for (const mode of ["foreign", "stale", "offer-version"]) {
    let invalid = true; const s = fixture("offering", { edit: true, completeRead: (_path, schema, _signal, server) => schema.parse(invalid ? { ...server, ...(mode === "foreign" ? { id: randomUUID() } : mode === "stale" ? { version: 7 } : { offerings: server.offerings.map(value => ({ ...value, version: 3 })) }) } : server) });
    await s.save(); assert.equal(s.render().acknowledged, true); assert.equal(s.accepted.length, 0); invalid = false; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed.length, 1);
  }
});
test("Conflicts require an exact offered snapshot and reject old counters even from a stale handler", async () => {
  let conflict = true; const s = fixture("owners", { dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); } }), stale = s.render(); await s.save(); assert.equal(s.render().needsReview, true); await s.save(); assert.equal(s.calls.length, 1);
  const current = await s.render().inspect(async () => ({ ...s.source, version: 9 })); assert.equal(s.render().accept({ ...current }), false); assert.equal(s.render().accept(current), true); conflict = false;
  await stale.submit(s.path, s.body, s.method, () => {}); assert.equal(s.calls.length, 1); assert.equal(s.render().needsReview, true);
  const next = await s.render().inspect(async () => ({ ...s.source, version: 9 })); assert.equal(s.render().accept(next), true); await s.save({ ...s.body, expected_version: 9 }); assert.equal(s.calls[1][1].expected_version, 9); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});
test("Offered review cannot be foreign/stale, inspection abort releases ownership and source outage blocks new writes", async () => {
  const s = fixture(); s.render(); for (const patch of [{ id: randomUUID() }, { version: 6 }]) await assert.rejects(() => s.render().inspect(async () => ({ ...s.source, ...patch })), { code: "INVALID_RESPONSE" });
  let release; const pending = new Promise(resolve => { release = resolve; }), abort = new AbortController(), read = s.render().inspect(async () => { await pending; return s.source; }, abort.signal); await tick(); abort.abort(); release(); await assert.rejects(() => read); assert.equal(s.render().pending, false); assert.equal(s.publications.at(-1), false);
  const blocked = fixture(); blocked.host.available = false; await blocked.save(); assert.equal(blocked.calls.length, 0);
});

test("A programme or property comparison cannot lower a newer parent version received before acceptance", async () => {
  for (const root of ["properties", "developments"]) {
    let conflict = true; const s = fixture("owners", { root, dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); } });
    await s.save(); const offered = await s.render().inspect(async () => ({ ...s.source, version: 8 }));
    s.scope.version = 9; const current = s.render(); assert.equal(current.accept(offered), false); assert.equal(current.canEdit(), false); await s.save({ ...s.body, expected_version: 8 }); assert.equal(s.calls.length, 1);
    const latest = await s.render().inspect(async () => ({ ...s.source, version: 9 })); assert.equal(s.render().accept(latest), true); conflict = false; await s.save({ ...s.body, expected_version: 9 }); assert.equal(s.commits(), 1); assert.equal(s.completed[0].version, 10);
  }
});
test("Original uncertain recovery survives unavailable source but not a changed role/account/password authority", async () => {
  for (const change of [value => ({ ...value, user: { ...value.user, id: randomUUID() } }), value => ({ ...value, user: { ...value.user, role: "agent" } }), value => ({ ...value, must_change_password: true })]) {
    let revoked = false, id, roleValue; const s = fixture("owners", { proof: async () => { const value = { user: { id, role: roleValue }, must_change_password: false }; return revoked ? change(value) : value; }, dispatch: ({ commit }) => { commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); id = s.host.actorId; roleValue = s.host.role;
    await s.save(); revoked = true; s.host.available = false; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.denials.length, 1); assert.equal(s.publications.at(-1), false);
  }
  let lost = true; const s = fixture("structure", { dispatch: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } }); await s.save(); s.host.available = false; lost = false; await s.render().retry(); assert.equal(s.calls.length, 2); assert.equal(s.completed.length, 1);
});
test("Agent structure grants remain separate from manager-only owners and campaigns", async () => {
  const allowed = fixture("structure", { role: "agent" }); await allowed.save(); assert.equal(allowed.calls.length, 1); assert.equal(allowed.completed.length, 1);
  for (const kind of ["owners", "offering"]) { const denied = fixture(kind, { role: "agent" }); await denied.save(); assert.equal(denied.calls.length, 0); assert.equal(denied.denials.length, 1); }
});
test("Synchronous double dispatch, disposed readers/writes and an unmounting completion cannot mutate late state", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }), s = fixture("owners", { dispatch: async ({ commit }) => { await pending; return commit(); } }); const first = s.save(); await s.save(); await tick(); assert.equal(s.calls.length, 1); s.dispose(); assert.equal(s.calls[0][6].aborted, true); release(); await first; assert.equal(s.lateUpdates(), 0); assert.equal(s.completed.length, 0); assert.equal(s.publications.at(-1), false);
  const closing = fixture(); await closing.save(closing.body, () => closing.dispose()); assert.equal(closing.lateUpdates(), 0); assert.equal(closing.publications.at(-1), false);
});

test("Actual record saved callbacks install the verified parent before a drawer can dispose its owner", () => {
  for (const root of ["properties", "developments"]) {
    const s = inventoryHostFixture(root), initial = s.render(); find(initial, "BusyScope")[0].props.value(true);
    const offers = view => find(find(view, "RecordWorkspace")[0].props.tabs[0].content, "InventoryOfferSection")[0];
    const current = { ...s.record, version: 9 }; offers(s.render()).props.saved(current); assert.equal(offers(s.render()).props.target.version, 9); assert.equal(s.query.value.version, 7);
  }
});
test("Actual campaign drawer callback forwards the verified record before closing", () => {
  const source = recordFixture(), events = [], campaign = loadServer("src/features/inventory/campaign.tsx", { modules: { "react/jsx-runtime": runtime, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/lib/format": { formatInstant: value => value }, "./contracts": { kindLabels: { sale: "Vente" } }, "./offering-editor": { OfferingEditor: "Editor", Availability: "Availability" }, "./states": { InventoryStatus: "Status", Price: "Price" }, "./external-outcome": { ExternalOutcome: "External" } } });
  const view = campaign.CampaignActions({ property: source, offering: source.offerings[0], writable: true, busy: false, saved: record => events.push(record) }), current = { ...source, version: 8 };
  for (const drawer of find(view, "Drawer")) { const form = drawer.props.children(() => {}, () => events.push("closed")); form.props.saved(current); }
  assert.equal(events[0], current); assert.equal(events[1], "closed"); assert.equal(events[2], current); assert.equal(events[3], "closed");
});
