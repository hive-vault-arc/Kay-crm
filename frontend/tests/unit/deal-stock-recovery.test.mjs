import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { stockPanelFixture, offeringFixture, stockReview, find, text, button, tick, ApiError } from "./deal-stock-fixtures.mjs";

function fill(s, kind) { if (kind === "release") s.change("release-reason", "Original release reason"); if (kind === "close") { s.change("close-amount", "1234567890123456,78"); s.change("close-date", "2026-10-29"); s.change("outcome-reason", "Original result explanation"); } if (kind === "reopen") s.change("outcome-reason", "Original reopen reason"); }
for (const kind of ["reserve", "release", "close", "reopen"]) {
  test(`Selected ${kind} freezes original stock intent/key and dismissals until an exact result completes`, async () => {
    let lost = true; const s = stockPanelFixture(kind, { command: ({ commit }) => { const receipt = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt; } });
    await s.ready(); fill(s, kind); s.submit(); s.submit(); await tick(); assert.equal(s.calls.length, 1); assert.equal(s.owner().uncertain, true);
    const view = s.render(); assert.equal(button(view, "Retour").props.disabled, true); assert.equal(button(view, kind === "reserve" || kind === "release" ? "Actualiser la disponibilité" : "Actualiser les effets").props.disabled, true);
    let blocked = false; find(view, "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { blocked = true; } }); assert.equal(blocked, true); find(view, "AlertDialog")[0].props.onOpenChange(false); assert.equal(s.closed.length, 0);
    const body = JSON.stringify(s.calls[0][1]); s.props.deal = { ...s.deal, version: 50, stage: kind === "reopen" ? "new" : "lost" }; if (kind !== "reserve") s.change(kind === "release" ? "release-reason" : "outcome-reason", "Replacement reason");
    lost = false; s.submit(); await tick(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(JSON.stringify(s.calls[1][1]), body); assert.equal(s.saved.length, 1); assert.equal(s.closed.length, 1); assert.equal(s.commits(), 1);
    if (kind === "close") { assert.equal(s.calls[0][1].agreed_amount_mad, "1234567890123456.78"); assert.equal(s.calls[0][1].expected_stock_fingerprint, "a".repeat(64)); }
  });
}
test("Acknowledged stock read and originating completion outages retry completion without another write", async () => {
  for (const kind of ["reserve", "release", "close", "reopen"]) {
    let outage = false; const s = stockPanelFixture(kind, { read: ({ path, server }) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return path.endsWith("stock-review") ? stockReview(server.deal) : server.deal; }, command: ({ commit }) => { const result = commit(); outage = true; return result; } });
    await s.ready(); fill(s, kind); s.submit(); await tick(); assert.equal(s.owner().acknowledged, true); assert.equal(s.closed.length, 0); outage = false;
    assert.equal(await s.owner().retry(), true); assert.equal(s.calls.length, 1); assert.equal(s.saved.length, 1); assert.equal(s.closed.length, 1);
  }
  let fail = true; const s = stockPanelFixture("release", { saved: () => { if (fail) throw new Error("synthetic completion outage"); } }); await s.ready(); fill(s, "release"); s.submit(); await tick(); assert.equal(s.owner().acknowledged, true); fail = false; assert.equal(await s.owner().retry(), true); assert.equal(s.calls.length, 1); assert.equal(s.closed.length, 1);
});
test("Outcome stock review brackets the same parent/version and validates offering/target/version coherence", async () => {
  for (const mode of ["foreign-deal", "stale-deal", "changing-deal", "foreign-offering", "foreign-stock", "stale-stock", "foreign-target-version", "missing-target"]) {
    let count = 0; const s = stockPanelFixture("close", { read: ({ path, server }) => {
      const value = server.deal;
      if (!path.endsWith("stock-review")) { count++; if (mode === "foreign-deal") return { ...value, id: randomUUID() }; if (mode === "stale-deal") return { ...value, version: 6 }; if (mode === "changing-deal" && count > 1) return { ...value, version: 8 }; if (mode === "missing-target") return { ...value, offering: { ...value.offering, target: undefined } }; return value; }
      const review = stockReview(value); if (mode === "foreign-offering") review.offering = offeringFixture(); if (mode === "foreign-stock") review.stock.offering_id = randomUUID(); if (mode === "stale-stock") review.expected_version--; if (mode === "foreign-target-version") review.stock.expected_target_version++; return review;
    } });
    await s.ready(); assert.equal(s.calls.length, 0); assert.ok(find(s.render(), "Error").length, mode); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true, mode); s.submit(); await tick(); assert.equal(s.calls.length, 0, mode);
  }
});
test("A known stock conflict requires an explicit fresh review with all current versions before reconfirmation", async () => {
  let conflict = true; const s = stockPanelFixture("release", { command: ({ commit }) => { if (conflict) throw new ApiError("OFFERING_VERSION_CONFLICT", 409); return commit(); } }); await s.ready(); fill(s, "release"); s.submit(); await tick(); assert.equal(s.owner().needsReview, true);
  s.server.deal = { ...s.server.deal, version: 9, offering: { ...s.server.deal.offering, version: 5, target: { ...s.server.deal.offering.target, version: 6 } } }; button(s.render(), "Actualiser la disponibilité").props.onClick(); await tick(); assert.equal(s.owner().needsReview, false); conflict = false;
  s.submit(); await tick(); const body = s.calls[1][1]; assert.equal(body.expected_version, 9); assert.equal(body.expected_offering_version, 5); assert.equal(body.expected_target_version, 6); assert.equal(body.reason, "Original release reason"); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});
test("A changed offering, reservation, canonical contact or action direction ends the opening stock action read-only", async () => {
  for (const change of [() => ({ offering: offeringFixture() }), s => ({ active_reservation: { ...s.deal.active_reservation, id: randomUUID() } }), s => ({ contact: { ...s.deal.contact, id: randomUUID() } }), () => ({ stage: "won", active_reservation: null })]) {
    const s = stockPanelFixture("release"); await s.ready(); fill(s, "release"); s.server.deal = { ...s.server.deal, ...change(s), version: 9 }; button(s.render(), "Actualiser la disponibilité").props.onClick(); await tick(); assert.match(text(s.render()), /ne correspond plus/); s.submit(); await tick(); assert.equal(s.calls.length, 0);
  }
  const changed = stockPanelFixture("close"); await changed.ready(); fill(changed, "close"); changed.server.deal = { ...changed.server.deal, version: 9, offering: { ...changed.server.deal.offering, target: { ...changed.server.deal.offering.target, id: randomUUID() } } }; button(changed.render(), "Actualiser les effets").props.onClick(); await tick(); assert.match(text(changed.render()), /ne correspond plus/); changed.submit(); await tick(); assert.equal(changed.calls.length, 0);
});
test("Lost/cancelled outcomes without inventory retain null stock fields and cannot manufacture a win", async () => {
  const s = stockPanelFixture("close", { withoutOffering: true, outcome: "lost" }); await s.ready(); s.change("close-date", "2026-10-29"); s.change("outcome-reason", "Synthetic loss explanation"); s.submit(); await tick(); const body = s.calls[0][1]; assert.equal(body.outcome, "lost"); assert.equal(body.agreed_amount_mad, null); assert.equal(body.offering_id, null); assert.equal(body.expected_stock_fingerprint, null);
});
test("Stock review disposal aborts its scoped read and suppresses private late updates", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }), s = stockPanelFixture("close", { read: async ({ server }) => { await pending; return server.deal; } }); s.render(); await tick(); const read = s.reads[0]; s.dispose(); assert.equal(read.signal.aborted, true); release(); await tick(); assert.equal(s.lateUIUpdates(), 0); assert.equal(s.saved.length, 0); assert.equal(s.calls.length, 0);
});
test("Current role loss before a stock write prevents dispatch and removes its private command scope", async () => {
  let revoked = false; const s = stockPanelFixture("reserve", { proof: ({ actorId, role }) => ({ user: { id: actorId, role: revoked ? "agent" : role }, must_change_password: false }) }); await s.ready(); revoked = true; s.submit(); await tick(); assert.equal(s.calls.length, 0); assert.equal(s.denials.length, 1); assert.equal(s.owner().active(), false);
});
