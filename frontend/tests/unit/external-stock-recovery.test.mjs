import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { externalFixture, inventoryHostFixture, recordFixture, reviewFixture, inventory, development, stockContracts, find, button, text, tick, runtime, ExternalApiError as ApiError } from "./external-stock-fixtures.mjs";
import { loadServer } from "./load-server.mjs";

const fields = { completed_on: "2026-10-29", explanation: "Synthetic shared external result" };
function fill(s) { s.change("Input", fields.completed_on); s.change("Textarea", fields.explanation); }
for (const options of [{ root: "properties", kind: "sale" }, { root: "properties", kind: "rental", unit: true }, { root: "developments", kind: "sale" }]) {
  test(`External ${options.root}/${options.kind}${options.unit ? "/unit" : ""} freezes reviewed facts and original key through lost acknowledgement`, async () => {
    let lost = true; const s = externalFixture({ ...options, command: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } });
    await s.open(); fill(s); const original = s.render(); s.submit(); s.submit(); await tick(); const view = s.render(); assert.equal(s.calls.length, 1); assert.equal(s.owner().uncertain, true); assert.equal(find(view, "fieldset")[0].props.disabled, true); assert.equal(button(view, "Retour").props.disabled, true); assert.equal(button(view, "Actualiser les effets").props.disabled, true);
    let prevented = false; find(view, "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); find(view, "AlertDialog")[0].props.onOpenChange(false); assert.equal(find(s.render(), "AlertDialog")[0].props.open, true);
    find(original, "Textarea")[0].props.onChange({ target: { value: "Replacement description" } }); assert.equal(find(s.render(), "Textarea")[0].props.value, fields.explanation); assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], true); assert.equal(s.publications.at(-1), true);
    lost = false; s.submit(); await tick(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(JSON.stringify(s.calls[0][1]), JSON.stringify(s.calls[1][1])); assert.equal(s.calls[0][1].explanation, fields.explanation); assert.equal(s.calls[0][1].expected_version, 7); assert.equal(s.calls[0][1].expected_stock_fingerprint, "b".repeat(64)); assert.equal(s.calls[0][1].expected_development_version, options.root === "developments" ? 7 : options.unit ? 11 : null);
    assert.equal(s.commits(), 1); assert.equal(s.saves.length, 1); assert.equal(s.accepted[0].id, s.record.id); assert.equal(s.accepted[0].version, 8); assert.equal(s.publications.at(-1), false); assert.equal(find(s.render(), "AlertDialog")[0].props.open, false);
  });
}
test("Acknowledged external result retries only its current read or awaited parent completion", async () => {
  for (const failure of ["read", "completion"]) {
    let outage = false; const s = externalFixture({ command: ({ commit }) => { const value = commit(); outage = true; return value; }, read: ({ path, server }) => { if (outage && failure === "read") throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return path.includes("stock-review?") ? reviewFixture(server.record) : server.record; }, saved: () => { if (outage && failure === "completion") throw new Error("synthetic parent failure"); } });
    await s.open(); fill(s); s.submit(); await tick(); s.render(); assert.equal(s.owner().acknowledged, true); assert.equal(s.owner().uncertain, true); assert.equal(s.saves.length, 0); assert.equal(s.accepted.length, 0); outage = false;
    s.submit(); await tick(); assert.equal(s.calls.length, 1); assert.equal(s.saves.length, 1); assert.equal(s.accepted.length, 1); s.render(); assert.equal(await s.owner().retry(), false);
  }
});
test("External review validates exact parent/offering/target identity, versions, effect count and the bracketing read", async () => {
  for (const mode of ["foreign-parent", "stale-parent", "foreign-target", "foreign-owner", "stale-offering", "changing-parent", "changing-offering", "foreign-review", "stale-review", "wrong-target-version", "wrong-parent-version", "duplicate-effects", "short-count"]) {
    let parentReads = 0; const s = externalFixture({ read: ({ path, server }) => {
      const record = server.record;
      if (!path.includes("stock-review?")) {
        parentReads++; if (mode === "foreign-parent") return { ...record, id: randomUUID() }; if (mode === "stale-parent") return { ...record, version: 6 }; if (mode === "changing-parent" && parentReads > 1) return { ...record, version: 8 };
        if (["foreign-target", "foreign-owner", "stale-offering", "changing-offering"].includes(mode)) return { ...record, offerings: record.offerings.map(value => ({ ...value, ...(mode === "foreign-target" ? { target: { ...value.target, id: randomUUID() } } : mode === "foreign-owner" ? { property_id: randomUUID() } : mode === "stale-offering" ? { version: 2 } : parentReads > 1 ? { conditions: "Concurrent offering" } : {}) })) }; return record;
      }
      const value = reviewFixture(record); if (mode === "foreign-review") value.offering_id = randomUUID(); if (mode === "stale-review") value.expected_offering_version--; if (mode === "wrong-target-version") value.expected_target_version--; if (mode === "wrong-parent-version") value.expected_development_version = 9; if (mode === "duplicate-effects") { value.effects.push(value.effects[0]); value.effect_count = 2; } if (mode === "short-count") value.effect_count = 0; return value;
    } }); await s.open(); assert.ok(find(s.render(), "Error").length, mode); assert.equal(s.owner().canEdit(), false, mode); s.submit(); await tick(); assert.equal(s.calls.length, 0, mode);
  }
});
test("Replaced, retired, archived and completed current offers finish read-only without retargeting", async () => {
  for (const change of [record => ({ ...record, archived_at: "2026-10-29T12:00:00Z" }), record => ({ ...record, offerings: [] }), record => ({ ...record, offerings: record.offerings.map(value => ({ ...value, id: randomUUID() })) }), record => ({ ...record, offerings: record.offerings.map(value => ({ ...value, is_current: false })) }), record => ({ ...record, offerings: record.offerings.map(value => ({ ...value, state: "sold" })) })]) {
    const s = externalFixture(); s.server.record = change(s.server.record); await s.open(); assert.match(text(s.render()), /n’est plus active/); assert.equal(s.owner().canEdit(), false); assert.equal(s.reads.length, 1); s.submit(); await tick(); assert.equal(s.calls.length, 0); find(s.render(), "AlertDialog")[0].props.onOpenChange(false); assert.equal(s.accepted[0].id, s.record.id);
  }
});
test("Foreign, wrong-kind and stale external receipts retain the original request without installing results", async () => {
  for (const patch of [{ property_id: randomUUID() }, { offering_id: randomUUID() }, { version: 7 }, "wrong-root"]) {
    let invalid = true; const s = externalFixture({ command: ({ commit }) => { const value = commit(); return invalid ? patch === "wrong-root" ? { development_id: value.property_id, offering_id: value.offering_id, version: value.version, event_id: value.event_id } : { ...value, ...patch } : value; } });
    await s.open(); fill(s); const before = s.reads.length; s.submit(); await tick(); s.render(); assert.equal(s.owner().acknowledged, false); assert.equal(s.owner().uncertain, true); assert.equal(s.reads.length, before); invalid = false; s.submit(); await tick(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); assert.equal(s.accepted.length, 1);
  }
});
test("Acknowledged external completion rejects a foreign or stale current record without another write", async () => {
  for (const patch of [{ id: randomUUID() }, { version: 7 }]) {
    let invalid = false; const s = externalFixture({ command: ({ commit }) => { const result = commit(); invalid = true; return result; }, read: ({ path, server }) => path.includes("stock-review?") ? reviewFixture(server.record) : invalid ? { ...server.record, ...patch } : server.record });
    await s.open(); fill(s); s.submit(); await tick(); s.render(); assert.equal(s.owner().acknowledged, true); assert.equal(s.accepted.length, 0); invalid = false; s.submit(); await tick(); assert.equal(s.calls.length, 1); assert.equal(s.accepted[0].version, 8);
  }
});
test("Known external conflicts require an explicit current review; stale handlers cannot replace it", async () => {
  let conflict = true; const s = externalFixture({ command: ({ commit }) => { if (conflict) throw new ApiError("STOCK_REVIEW_CHANGED", 409); return commit(); } }); await s.open(); fill(s); const initial = s.owner(), oldForm = s.render(); s.submit(); await tick(); s.render(); assert.equal(s.owner().needsReview, true);
  assert.equal(await initial.submit({ ...fields, explanation: "Replacement from stale handler" }, () => {}), false); find(oldForm, "Textarea")[0].props.onChange({ target: { value: "Replacement" } }); assert.equal(find(s.render(), "Textarea")[0].props.value, fields.explanation);
  s.server.record = { ...s.server.record, version: 9, offerings: s.server.record.offerings.map(value => ({ ...value, version: 5, target: { ...value.target, version: 9 } })) }; button(s.render(), "Actualiser les effets").props.onClick(); await tick(); s.render(); assert.equal(s.owner().canEdit(), true); conflict = false; s.submit(); await tick(); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].expected_offering_version, 5); assert.equal(s.calls[1][1].explanation, fields.explanation); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});
test("Source outages block a new external save but retain an original unknown retry", async () => {
  let lost = true; const s = externalFixture({ command: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } }); await s.open(); fill(s); s.host.available = false; s.submit(); await tick(); assert.equal(s.calls.length, 0); s.host.available = true; s.submit(); await tick(); s.render(); s.host.available = false; lost = false; s.submit(); await tick(); assert.equal(s.calls.length, 2); assert.equal(s.saves.length, 1);
});
test("Current actor/role/password proof fences initial inspection, write and uncertain replay", async () => {
  for (const change of [value => ({ ...value, user: { ...value.user, id: randomUUID() } }), value => ({ ...value, user: { ...value.user, role: "agent" } }), value => ({ ...value, must_change_password: true })]) {
    let revoked = false; const s = externalFixture({ proof: ({ actorId, role }) => { const value = { user: { id: actorId, role }, must_change_password: false }; return revoked ? change(value) : value; }, command: ({ commit }) => { commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
    await s.open(); fill(s); s.submit(); await tick(); revoked = true; s.submit(); await tick(); const view = s.render(); assert.equal(s.calls.length, 1); assert.equal(s.denials.length, 1); assert.equal(find(view, "form").length, 0); assert.equal(s.publications.at(-1), false);
    const initial = externalFixture({ proof: ({ actorId, role }) => change({ user: { id: actorId, role }, must_change_password: false }) }); await initial.open(); assert.equal(initial.reads.length, 0); assert.equal(initial.calls.length, 0); assert.equal(initial.denials.length, 1);
    let first = false; const before = externalFixture({ proof: ({ actorId, role }) => first ? change({ user: { id: actorId, role }, must_change_password: false }) : { user: { id: actorId, role }, must_change_password: false } }); await before.open(); fill(before); first = true; before.submit(); await tick(); assert.equal(before.calls.length, 0);
  }
});
test("Acknowledged external denial preserves only the saved fact and never accepts a private record", async () => {
  let denied = false; const s = externalFixture({ command: ({ commit }) => { const value = commit(); denied = true; return value; }, read: ({ path, server }) => { if (denied) throw new ApiError("FORBIDDEN", 403); return path.includes("stock-review?") ? reviewFixture(server.record) : server.record; } }); await s.open(); fill(s); s.submit(); await tick(); s.render(); assert.equal(s.denials[0][1], true); assert.equal(s.owner().review, undefined); assert.equal(s.accepted.length, 0); assert.equal(s.saves.length, 0); assert.equal(s.publications.at(-1), false);
});
test("Validation, agent visibility, hydration and invalid scope cannot dispatch an external result", async () => {
  const s = externalFixture(); await s.open(); s.submit(); await tick(); assert.equal(s.calls.length, 0); assert.match(text(s.render()), /Indiquez une date/); s.change("Input", "2026-02-30"); s.change("Textarea", fields.explanation); s.submit(); await tick(); assert.equal(s.calls.length, 0);
  const agent = externalFixture({ role: "agent" }); assert.equal(agent.render(), null); assert.equal(agent.reads.length, 0);
  const cold = externalFixture({ hydrated: false }); await cold.open(); assert.equal(cold.reads.length, 0); assert.equal(cold.calls.length, 0);
  for (const patch of [{ id: "invalid" }, { offeringId: "invalid" }, { version: -1 }, { offeringVersion: NaN }]) { const invalid = externalFixture(); Object.assign(invalid.scope, patch); const owner = invalid.renderOwner(); assert.equal(await owner.inspect(), false); assert.equal(invalid.reads.length, 0); }
  const extra = externalFixture(); const command = extra.renderOwner(); await command.inspect(); const current = extra.renderOwner(); assert.equal(await current.submit({ ...fields, outcome: "won" }, () => {}), false); assert.equal(extra.calls.length, 0);
  const wrongHost = externalFixture(); wrongHost.host.id = randomUUID(); assert.equal(await wrongHost.renderOwner().inspect(), false); assert.equal(wrongHost.reads.length, 0); assert.equal(wrongHost.denials.length, 1);
  const admin = externalFixture({ root: "developments", role: "administrator" }); await admin.open(); fill(admin); admin.submit(); await tick(); assert.equal(admin.calls.length, 1); assert.equal(admin.accepted.length, 1);
});
test("Inspection or mutation disposal aborts requests, releases record busy and suppresses late updates", async () => {
  for (const stage of ["read", "write"]) {
    let release, wait = stage === "read"; const pending = new Promise(resolve => { release = resolve; }); const s = externalFixture({ read: async ({ path, server }) => { if (wait) await pending; return path.includes("stock-review?") ? reviewFixture(server.record) : server.record; }, command: async ({ commit }) => { await pending; return commit(); } });
    if (stage === "read") { s.render(); find(s.render(), "AlertDialog")[0].props.onOpenChange(true); await tick(); } else { await s.open(); fill(s); wait = true; s.submit(); await tick(); }
    const signal = stage === "read" ? s.reads[0].signal : s.calls[0][6]; s.dispose(); assert.equal(signal.aborted, true); release(); await tick(); assert.equal(s.lateUpdates(), 0); assert.equal(s.publications.at(-1), false); assert.equal(s.accepted.length, 0);
  }
});
test("Replacing the rendered account scope aborts the originating external dialog instead of retargeting it", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }); const s = externalFixture({ command: async ({ commit }) => { await pending; return commit(); } }); await s.open(); fill(s); s.submit(); await tick(); s.host.actorId = randomUUID(); s.render(); assert.equal(s.calls[0][6].aborted, true); release(); await tick(); assert.equal(s.saves.length, 0); assert.equal(s.accepted.length, 0); assert.equal(s.lateUpdates(), 0);
});
test("A completed external operation cannot rearm a create from changed stale fields", async () => {
  const s = externalFixture(), initial = s.renderOwner(); await initial.inspect(); const reviewed = s.renderOwner(); assert.equal(await reviewed.submit(fields, () => {}), true); assert.equal(await reviewed.submit({ ...fields, explanation: "Second attempt" }, () => {}), false); assert.equal(s.calls.length, 1); await s.renderOwner().inspect(); assert.equal(s.renderOwner().review.readonly, true);
  let closing; closing = externalFixture({ accept: () => closing.dispose() }); await closing.open(); fill(closing); closing.submit(); await tick(); assert.equal(closing.accepted.length, 1); assert.equal(closing.saves.length, 1); assert.equal(closing.lateUpdates(), 0); assert.equal(closing.publications.at(-1), false);
});
test("Actual inventory facade rejects a foreign parent/review/receipt before returning private data", async () => {
  const origin = "https://crm.synthetic.invalid", record = recordFixture(), offeringId = record.offerings[0].id, calls = []; let result;
  const range = loadServer("src/features/inventory/inventory-range.ts", { modules: { "./contracts": inventory } }), facade = loadServer("src/features/inventory/facade.ts", { modules: { "./inventory-range": range, "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: result }; } }, "@/lib/api/errors": { frenchApiError: code => code }, "./outcome-contracts": stockContracts, "./contracts": inventory, "./development-contracts": development } });
  const review = reviewFixture(record), input = { ...fields, expected_version: 7, offering_id: offeringId, expected_offering_version: 3, expected_development_version: null, expected_stock_fingerprint: "b".repeat(64) }, receipt = { property_id: record.id, offering_id: offeringId, version: 8, event_id: randomUUID() };
  for (const [suffix, method, body, good, bad] of [["", "GET", undefined, record, { ...record, id: randomUUID() }], [`/stock-review?offering_id=${offeringId}`, "GET", undefined, review, { ...review, offering_id: randomUUID() }], ["/external-outcome", "POST", input, receipt, { ...receipt, property_id: randomUUID() }], ["/external-outcome", "POST", input, receipt, { ...receipt, offering_id: randomUUID() }], ["/external-outcome", "POST", input, receipt, { ...receipt, version: 7 }]]) {
    const url = `${origin}/api/v1/properties/${record.id}${suffix}`, key = new URL(url).pathname.slice("/api/v1/".length), request = () => new Request(url, { method, headers: { Origin: origin, "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    result = bad; assert.equal((await facade.relayInventory(key, request(), randomUUID())).status, 503); result = good; assert.equal((await facade.relayInventory(key, request(), randomUUID())).status, 200);
  }
  const count = calls.length; const rejected = await facade.relayInventory(`properties/${record.id}/external-outcome`, new Request(`${origin}/api/v1/properties/${record.id}/external-outcome`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify({ ...input, actor_user_id: randomUUID() }) }), randomUUID()); assert.equal(rejected.status, 422); assert.equal(calls.length, count);
});

for (const root of ["properties", "developments"]) test(`Actual ${root} host retains its protected offering, accepts verified results monotonically and masks current denial`, () => {
  const s = inventoryHostFixture(root), first = s.render(), busy = find(first, "BusyScope")[0].props.value;
  const record = view => find(view, "RecordWorkspace")[0].props.tabs[0].content, target = view => find(record(view), "InventoryOfferSection")[0].props.target;
  assert.equal(find(first, "RecordScope")[0].props.value.actorId, s.props.actorId); busy(true);
  const newer = { ...s.record, version: 8, offerings: s.record.offerings.map(value => ({ ...value, state: "sold", version: 4, target: { ...value.target, version: 8 } })) };
  s.query.value = newer; let view = s.render(); assert.equal(target(view).version, 7); assert.equal(target(view).offerings[0].state, "available");
  s.query.value = undefined; s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); view = s.render(); assert.equal(target(view).version, 7); assert.equal(find(view, "RecordScope")[0].props.value.available, false); assert.equal(find(view, "fieldset")[0].props.disabled, true); assert.equal(find(view, "RecordError").length, 1);
  find(view, "RecordScope")[0].props.value.accept(newer); view = s.render(); assert.equal(target(view).version, 8); assert.equal(target(view).offerings[0].state, "sold");
  const accepted = find(view, "RecordScope")[0].props.value; accepted.accept({ ...s.record, id: randomUUID(), version: 99 }); accepted.accept({ ...s.record, version: 6 }); assert.equal(target(s.render()).version, 8);
  busy(false); s.query.value = s.record; s.query.error = undefined; view = s.render(); assert.equal(target(view).version, 8); assert.equal(find(view, "RecordScope")[0].props.value.available, true);
  s.query.error = new ApiError("FORBIDDEN", 403); view = s.render(); assert.equal(find(view, "RecordWorkspace").length, 0); assert.equal(find(view, "RecordScope").length, 0);
});
test("Actual property/programme routes key their record and forward the authenticated account and role", async () => {
  const actorId = randomUUID(), id = randomUUID();
  for (const [file, component, route] of [["src/app/(workspace)/projects/properties/[id]/page.tsx", "PropertyRecord", "properties"], ["src/app/(workspace)/projects/[id]/page.tsx", "DevelopmentRecord", "developments"]]) {
    const loaded = loadServer(file, { modules: { "react/jsx-runtime": runtime, "next/navigation": { notFound() { throw new Error("UNEXPECTED_NOT_FOUND"); } }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" }, [`@/features/inventory/${route === "properties" ? "property" : "development"}-record`]: { [component]: "Record" }, "@/lib/auth/server": { requireIdentity: async () => ({ state: "authenticated", profile: { user: { id: actorId, role: "manager" } } }) } } });
    const view = await loaded.default({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }); assert.equal(view.props.actorId, actorId); assert.equal(view.props.role, "manager"); assert.equal(view.key, `${id}:${actorId}:manager`);
  }
});
