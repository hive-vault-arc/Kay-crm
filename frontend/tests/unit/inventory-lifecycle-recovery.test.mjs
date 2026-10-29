import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { inventory, development, recordFixture, inventoryHostFixture, find, button, text, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";
import { stockContracts } from "./deal-action-fixtures.mjs";
import { loadRecordCommand, recordIntents } from "./record-command-fixtures.mjs";

function fixture({ root = "properties", operation = "archive", role = "manager", hydrated = true, dispatch, completeRead, read, saved } = {}) {
  const h = componentHarness(), source = { ...recordFixture(root), ...(root === "developments" ? { unit_count: 0, available_unit_count: 0 } : {}), offerings: [], archived_at: operation === "restore" ? "2026-10-28T12:00:00Z" : null }, calls = [], savedRecords = [], decisions = [], focused = []; let identity, refreshed = 0, owner;
  owner = loadRecordCommand(h, { source, role, hydrated, completeRead, proof: async () => identity ?? { user: { id: owner.host.actorId, role }, must_change_password: false }, dispatch: async context => { calls.push(context.args); return dispatch ? dispatch(context) : context.commit(); } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} } });
  const loaded = loadServer("src/features/discovery/lifecycle-panel.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/icons": {}, "@/components/shared/dossier-form": draft, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: (run, scope) => decisions.push({ run, scope }) }) }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => schema.parse(read ? await read(path, signal) : owner.server()) }, "@/features/inventory/contracts": inventory, "@/features/inventory/development-contracts": development, "@/features/inventory/record-command-intent": recordIntents, "@/features/inventory/use-record-command": owner }, globals: { AbortController } });
  const props = { kind: root, id: source.id, version: source.version, reference: source.reference, archived: Boolean(source.archived_at), refresh: () => { refreshed++; }, saved: async record => { if (saved) await saved(record); savedRecords.push(record); props.version = record.version; props.archived = Boolean(record.archived_at); } };
  function render() { let view; for (let i = 0; i < 2; i++) view = h.render(() => ({ type: loaded.LifecyclePanel, props })); const form = find(view, "form")[0]; if (form?.props.ref) form.props.ref.current = { querySelector: () => ({ focus: () => focused.push(true) }) }; return view; }
  render();
  return { ...h, ...owner, props, source, calls, savedRecords, decisions, focused, render, actorId: owner.host.actorId, identity: value => { identity = value; }, refreshed: () => refreshed,
    open() { button(render(), operation === "archive" ? "Archiver ce dossier" : "Restaurer ce dossier").props.onClick(); return render(); },
    reason(value) { find(render(), "Input")[0].props.onChange({ target: { value } }); },
    async save() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await tick(); },
  };
}

test("Inventory lifecycle intents pin exact root/id/operation/method/version and the existing strict reason body", () => {
  for (const root of ["properties", "developments"]) for (const operation of ["archive", "restore"]) {
    const scope = { root, id: randomUUID(), version: 7, kind: "lifecycle", operation }, path = `/api/v1/${root}/${scope.id}/${operation}`, body = { expected_version: 7, reason: "  Synthetic explicit lifecycle reason  " }, parse = recordIntents.recordCommandIntent;
    assert.equal(parse(scope, path, body, "POST").body.reason, body.reason.trim()); assert.equal(parse(scope, path, body, "PATCH"), undefined); assert.equal(parse({ ...scope, id: randomUUID() }, path, body, "POST"), undefined); assert.equal(parse({ ...scope, operation: operation === "archive" ? "restore" : "archive" }, path, body, "POST"), undefined);
    for (const extra of [{ reason: " " }, { reason: "x".repeat(1001) }, { expected_version: 0 }, { actor_user_id: randomUUID() }, { release_stock: true }, { offering_id: randomUUID() }]) assert.equal(parse(scope, path, { ...body, ...extra }, "POST"), undefined);
  }
});

test("Lifecycle review preserves the conservative current-campaign/any-child boundary and cannot retarget another root/state", () => {
  for (const root of ["properties", "developments"]) {
    const record = { ...recordFixture(root), ...(root === "developments" ? { unit_count: 0, available_unit_count: 0 } : {}), offerings: [] }, scope = { root, id: record.id, operation: "archive" }, review = recordIntents.lifecycleReview;
    assert.equal(review(scope, record), "ready"); assert.equal(review(scope, { ...record, offerings: [{ ...recordFixture(root).offerings[0], is_current: true }] }), "stock"); assert.equal(review(scope, { ...record, archived_at: "2026-10-29T12:00:00Z" }), "changed"); assert.equal(review({ ...scope, id: randomUUID() }, record), "changed");
    if (root === "developments") assert.equal(review(scope, { ...record, unit_count: 1, available_unit_count: 0 }), "stock");
    assert.equal(review({ ...scope, operation: "restore" }, { ...record, archived_at: "2026-10-29T12:00:00Z" }), "ready");
  }
});

for (const root of ["properties", "developments"]) for (const operation of ["archive", "restore"]) {
  test(`${root} ${operation} preserves the original reason/key/action and blocks stale outer toggle and Cancel after lost acknowledgement`, async () => {
    let lost = true; const s = fixture({ root, operation, dispatch: ({ commit }) => { const receipt = commit(); if (lost) { lost = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return receipt; } });
    const trigger = button(s.render(), operation === "archive" ? "Archiver ce dossier" : "Restaurer ce dossier"); s.open(); s.reason("  Synthetic retained lifecycle explanation  "); const input = find(s.render(), "Input")[0], cancel = button(s.render(), "Annuler"); await s.save();
    assert.equal(s.commits(), 1); assert.equal(s.savedRecords.length, 0); input.props.onChange({ target: { value: "Unwanted replacement" } }); cancel.props.onClick(); trigger.props.onClick(); assert.equal(s.decisions.length, 0); assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], "true"); assert.equal(find(s.render(), "Input")[0].props.disabled, true); assert.equal(button(s.render(), operation === "archive" ? "Archiver ce dossier" : "Restaurer ce dossier").props.disabled, true);
    s.host.available = false; await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(s.calls[0][1], s.calls[1][1]); assert.equal(s.calls[0][1].reason, "Synthetic retained lifecycle explanation"); assert.equal(s.calls[0][0], `/api/v1/${root}/${s.source.id}/${operation}`); assert.equal(s.savedRecords.length, 1); assert.equal(Boolean(s.savedRecords[0].archived_at), operation === "archive"); assert.equal(find(s.render(), "form").length, 0); assert.equal(s.publications.at(-1), false);
  });
}

test("Acknowledged lifecycle current-read and partially completed async parent failures retry completion without POST", async () => {
  let outage = true; const s = fixture({ completeRead: (_path, schema, _signal, server) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(server); } }); s.open(); s.reason("Synthetic archived record explanation"); await s.save(); assert.ok(button(s.render(), "Actualiser le résultat")); outage = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.savedRecords.length, 1);
  let fail = true, ui; ui = fixture({ root: "developments", saved: record => { ui.props.version = record.version; ui.props.archived = Boolean(record.archived_at); if (fail) throw new Error("Synthetic supplemental refresh failure"); } }); ui.open(); ui.reason("Synthetic programme explanation"); await ui.save(); assert.equal(find(ui.render(), "Input")[0].props.value, "Synthetic programme explanation"); assert.ok(button(ui.render(), "Actualiser le résultat")); fail = false; await ui.save(); assert.equal(ui.calls.length, 1); assert.equal(ui.savedRecords.length, 1); assert.equal(find(ui.render(), "form").length, 0);
});

test("Exact receipt-version state is verified, while a later inverse operation remains valid historical completion", async () => {
  let invalid = true; const s = fixture({ completeRead: (_path, schema, _signal, server) => schema.parse({ ...server, ...(invalid ? { archived_at: null } : {}) }) }); s.open(); s.reason("Synthetic state proof"); await s.save(); assert.ok(button(s.render(), "Actualiser le résultat")); assert.equal(s.savedRecords.length, 0); invalid = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.savedRecords.length, 1);
  const later = fixture({ completeRead: (_path, schema, _signal, server) => schema.parse({ ...server, version: server.version + 1, archived_at: null }) }); later.open(); later.reason("Synthetic historical archive"); await later.save(); assert.equal(later.calls.length, 1); assert.equal(later.savedRecords[0].archived_at, null); assert.equal(later.savedRecords[0].version, 9);
});

test("Known lifecycle conflict keeps the reason until exact current acceptance and never replaces the opening operation", async () => {
  let conflict = true, current; const s = fixture({ root: "developments", dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); }, read: () => current }); current = { ...s.source, version: 9 }; s.open(); s.reason("Synthetic preserved reason"); await s.save(); await s.save(); assert.equal(s.calls.length, 1);
  await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Input")[0].props.value, "Synthetic preserved reason"); button(s.render(), "Conserver le motif sur cette version").props.onClick(); conflict = false; await s.save(); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].reason, "Synthetic preserved reason"); assert.notEqual(s.calls[1][3], s.calls[0][3]); assert.ok(s.calls.every(args => args[0].endsWith("/archive"))); assert.equal(s.savedRecords[0].version, 10);
});

test("Current campaigns or any programme child leave lifecycle review read-only without stock release or another mutation", async () => {
  for (const mode of ["campaign", "child"]) {
    let current; const s = fixture({ root: mode === "child" ? "developments" : "properties", dispatch: () => { throw new ApiError("STOCK_REVIEW_REQUIRED", 409); }, read: () => current }); current = { ...s.source, version: 8, ...(mode === "child" ? { unit_count: 1 } : { offerings: [{ ...recordFixture().offerings[0], property_id: s.source.id }] }) };
    s.open(); s.reason("Synthetic reason retained during stock review"); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.ok(text(s.render()).includes("une campagne actuelle ou une unité physique nécessite une revue")); assert.equal(find(s.render(), "Button").some(node => text(node) === "Conserver le motif sur cette version"), false); await s.save(); assert.equal(s.calls.length, 1); button(s.render(), "Actualiser la fiche").props.onClick(); assert.equal(s.refreshed(), 0); assert.equal(s.decisions.length, 1); s.decisions[0].run(); assert.equal(s.refreshed(), 1); assert.equal(s.savedRecords.length, 0); assert.equal(find(s.render(), "form").length, 0);
  }
});

test("A changed archive state cannot silently turn the original form into a restore operation", async () => {
  let current; const s = fixture({ read: () => current }); s.open(); s.reason("Synthetic original archive intent"); current = { ...s.source, version: 8, archived_at: "2026-10-29T12:00:00Z" }; s.props.version = 8; s.props.archived = true;
  assert.equal(find(s.render(), "Input")[0].props.value, "Synthetic original archive intent"); await s.save(); assert.equal(s.calls.length, 0); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.ok(text(s.render()).includes("L’état du dossier a changé")); assert.equal(find(s.render(), "Button").some(node => text(node) === "Conserver le motif sur cette version"), false);
});

test("Lifecycle reason validation, hydration and unavailable source cannot dispatch unreviewed input", async () => {
  const s = fixture(); s.open(); s.reason(" "); await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "Input")[0].props["aria-invalid"], true); assert.equal(s.focused.length, 1); s.reason("x".repeat(1001)); await s.save(); assert.equal(s.calls.length, 0); s.reason("Synthetic valid reason"); s.host.available = false; await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
  const cold = fixture({ hydrated: false }); cold.open(); assert.equal(find(cold.render(), "form").length, 0); assert.equal(cold.calls.length, 0);
});

test("Both elevated roles retain lifecycle commands, while agent/current authority loss masks the confirmation", async () => {
  for (const role of ["manager", "administrator"]) { const s = fixture({ role, operation: "restore" }); s.open(); s.reason("Synthetic manager restore"); await s.save(); assert.equal(s.savedRecords.length, 1); }
  const agent = fixture({ role: "agent" }); agent.open(); agent.reason("Synthetic forbidden archive"); await agent.save(); assert.equal(agent.calls.length, 0); assert.equal(find(agent.render(), "form").length, 0);
  for (const mode of ["account", "role", "password"]) { const s = fixture(); s.open(); s.reason("Synthetic current authority proof"); s.identity({ user: { id: mode === "account" ? randomUUID() : s.actorId, role: mode === "role" ? "agent" : "manager" }, must_change_password: mode === "password" }); await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form").length, 0); }
});

test("Lifecycle denial after acknowledgement preserves only a generic saved fact", async () => {
  let s; s = fixture({ dispatch: ({ commit }) => { const receipt = commit(); s.identity({ user: { id: s.actorId, role: "agent" }, must_change_password: false }); return receipt; } }); s.open(); s.reason("Synthetic reason hidden after denial"); await s.save(); assert.equal(s.commits(), 1); assert.equal(s.savedRecords.length, 0); assert.equal(find(s.render(), "form").length, 0); assert.ok(text(s.render()).includes("L’opération est enregistrée. Les droits d’accès ont changé.")); assert.equal(s.denials[0][1], true);
});

test("Deferred discard and pending lifecycle result disposal cannot refresh, save or update late state", async () => {
  const cancelled = fixture(); cancelled.open(); cancelled.reason("Synthetic retained draft"); button(cancelled.render(), "Annuler").props.onClick(); assert.equal(cancelled.decisions.length, 1); cancelled.dispose(); cancelled.decisions[0].run(); assert.equal(cancelled.lateUpdates(), 0); assert.equal(cancelled.refreshed(), 0);
  let resolve, signal; const s = fixture({ completeRead: (_path, schema, current, server) => { signal = current; return new Promise(done => { resolve = () => done(schema.parse(server)); }); } }); s.open(); s.reason("Synthetic pending archive"); const one = s.save(), two = s.save(); await tick(); assert.equal(s.calls.length, 1); s.dispose(); assert.equal(signal.aborted, true); resolve(); await Promise.all([one, two]); assert.equal(s.lateUpdates(), 0); assert.equal(s.savedRecords.length, 0); assert.equal(s.publications.at(-1), false);
});

test("Actual property/programme lifecycle hosts install verified records and keep refresh separate from saved completion", () => {
  for (const root of ["properties", "developments"]) { const s = inventoryHostFixture(root), view = s.render(), lifecycle = find(view, "LifecyclePanel")[0]; assert.equal(typeof lifecycle.props.refresh, "function"); const current = { ...s.record, version: 8, archived_at: "2026-10-29T12:00:00Z" }; lifecycle.props.saved(current); find(s.render(), "BusyScope")[0].props.value(true); s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); s.query.value = undefined; const retained = s.render(); assert.ok(find(retained, "RecordScope")[0].props.value.id === current.id); assert.equal(find(retained, "LifecyclePanel")[0].props.version, 8); }
});

test("Actual lifecycle facade binds property/development receipts, versions and null offering before returning results", async () => {
  const origin = "https://crm.synthetic.invalid", calls = []; let result;
  const range = loadServer("src/features/inventory/inventory-range.ts", { modules: { "./contracts": inventory } }), facade = loadServer("src/features/inventory/facade.ts", { modules: { "./inventory-range": range, "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: result }; } }, "@/lib/api/errors": { frenchApiError: code => code }, "./outcome-contracts": stockContracts, "./contracts": inventory, "./development-contracts": development } });
  for (const root of ["properties", "developments"]) for (const operation of ["archive", "restore"]) { const id = randomUUID(), key = `${root}/${id}/${operation}`, good = { [root === "properties" ? "property_id" : "development_id"]: id, offering_id: null, version: 8, event_id: randomUUID() }, request = extra => new Request(`${origin}/api/v1/${key}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify({ expected_version: 7, reason: "Synthetic explicit archive scope", ...extra }) });
    for (const bad of [{ ...good, [root === "properties" ? "property_id" : "development_id"]: randomUUID() }, { ...good, offering_id: randomUUID() }, { ...good, version: 7 }]) { result = bad; assert.equal((await facade.relayInventory(key, request(), randomUUID())).status, 503); }
    result = good; assert.equal((await facade.relayInventory(key, request(), randomUUID())).status, 200); const count = calls.length; assert.equal((await facade.relayInventory(key, request({ release_stock: true }), randomUUID())).status, 422); assert.equal(calls.length, count);
  }
});
