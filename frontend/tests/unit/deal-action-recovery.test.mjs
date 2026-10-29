import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actionFixture, intents, ApiError, dealContracts } from "./deal-action-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { contactContracts } from "./ownership-fixtures.mjs";
import { conversionContracts } from "./conversion-fixtures.mjs";

const clone = value => JSON.parse(JSON.stringify(value));
test("Affair intents strictly bind method, parent, proposal and qualification payload", () => {
  const s = actionFixture(), { dealCommandIntent: parse } = intents;
  assert.equal(parse(s.deal.id, s.path, s.body, "POST").kind, "transition");
  for (const [path, body, method, context] of [[s.path, s.body, "PATCH"], [s.path.replace(s.deal.id, randomUUID()), s.body, "POST"], [s.path, { ...s.body, contact_id: randomUUID() }, "POST"], [s.path, s.body, "POST", { dealId: randomUUID() }]]) assert.equal(parse(s.deal.id, path, body, method, context), undefined);
  const proposalId = randomUUID(), proposal = { expected_version: 2, expected_deal_version: 7, amount_mad: "123.45", currency: "MAD", price_period: null, conditions: "", expires_on: null, status: "pending" };
  assert.equal(parse(s.deal.id, `/api/v1/customer-offers/${proposalId}`, proposal, "PATCH", { dealId: s.deal.id, proposalId }).kind, "proposal-edit");
  assert.equal(parse(s.deal.id, `/api/v1/customer-offers/${proposalId}`, proposal, "PATCH"), undefined);
  assert.equal(parse(s.deal.id, `/api/v1/customer-offers/${proposalId}`, proposal, "PATCH", { dealId: s.deal.id, proposalId: randomUUID() }), undefined);
});
test("Unknown affair writes freeze the original body and key and reject replacement intents", async () => {
  let lost = true; const s = actionFixture({ command: ({ commit }) => { const receipt = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt; } });
  const body = clone(s.body); assert.equal(await s.render().mutate(s.path, body), false); body.reason = "Changed after dispatch";
  assert.equal(s.render().uncertain, true); assert.equal(s.render().canEdit(), false);
  assert.equal(await s.render().mutate(s.path, body), false); assert.equal(s.calls.length, 1);
  lost = false; assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].reason, s.body.reason); assert.equal(s.commits(), 1); assert.equal(s.render().complete, true);
  assert.equal(await s.render().mutate(s.path, s.body), false); assert.equal(s.calls.length, 2);
});
test("Acknowledged affair completion retries reads without another write", async () => {
  let outage = true; const s = actionFixture({ read: ({ server }) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server.deal; } });
  assert.equal(await s.render().mutate(s.path, s.body), false); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true);
  outage = false; assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 1); assert.equal(s.render().fresh.version, 8); assert.equal(s.completions.length, 1);
});
test("Failed parent completion retains the receipt and the original private completion callback", async () => {
  let outage = true, closed = 0; const s = actionFixture({ completed: () => { if (outage) throw new Error("synthetic completion outage"); } });
  assert.equal(await s.render().mutate(s.path, s.body, "POST", { dealId: s.deal.id, completed: () => closed++ }), false);
  assert.equal(closed, 0); outage = false; assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 1); assert.equal(closed, 1); assert.equal(await s.render().retry(), false); assert.equal(closed, 1);
});
test("Foreign or incoherent receipts only retry the original write and never install private reads", async () => {
  for (const patch of [{ id: randomUUID() }, { version: 7 }, { customer_offer_id: randomUUID(), offer_version: 1 }]) {
    let invalid = true; const s = actionFixture({ command: ({ commit }) => { const receipt = commit(); return invalid ? { ...receipt, ...patch } : receipt; } });
    assert.equal(await s.render().mutate(s.path, s.body), false); assert.equal(s.render().error.code, "INVALID_RESPONSE"); assert.equal(s.reads.length, 0);
    invalid = false; assert.equal(await s.render().retry(), true); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1);
  }
});
test("Foreign or stale current affair reads cannot complete an acknowledged command", async () => {
  for (const patch of [{ id: randomUUID() }, { version: 7 }]) {
    let invalid = true; const s = actionFixture({ read: ({ server }) => invalid ? { ...server.deal, ...patch } : server.deal });
    assert.equal(await s.render().mutate(s.path, s.body), false); assert.equal(s.render().fresh, undefined); invalid = false;
    assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 1);
  }
});
test("Current actor, role and restricted-password proofs fence first dispatch and recovery", async () => {
  for (const change of [value => ({ ...value, user: { ...value.user, id: randomUUID() } }), value => ({ ...value, user: { ...value.user, role: "agent" } }), value => ({ ...value, must_change_password: true })]) {
    let changed = false; const s = actionFixture({ proof: ({ actorId, role }) => { const value = { user: { id: actorId, role }, must_change_password: false }; return changed ? change(value) : value; }, command: ({ commit }) => { commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
    await s.render().mutate(s.path, s.body); changed = true; assert.equal(await s.render().retry(), false); assert.equal(s.calls.length, 1); assert.equal(s.denials.length, 1); assert.equal(s.render().active(), false);
    const first = actionFixture({ proof: ({ actorId, role }) => change({ user: { id: actorId, role }, must_change_password: false }) });
    assert.equal(await first.render().mutate(first.path, first.body), false); assert.equal(first.calls.length, 0);
  }
});
test("Authority loss after acknowledgement masks private state and retains a generic saved fact", async () => {
  const s = actionFixture({ read: () => { throw new ApiError("FORBIDDEN", 403); } }); await s.render().mutate(s.path, s.body);
  assert.equal(s.render().fresh, undefined); assert.equal(s.render().acknowledged, true); assert.equal(s.denials[0][1], true); assert.equal(s.render().uncertain, false); assert.equal(await s.render().retry(), false);
});
test("Known conflicts require an offered current version and explicit acceptance", async () => {
  let conflict = true; const s = actionFixture({ command: ({ commit }) => { if (conflict) throw new ApiError("DEAL_VERSION_CONFLICT", 409); return commit(); } });
  assert.equal(await s.render().mutate(s.path, s.body), false); assert.equal(s.render().needsReview, true); assert.equal(await s.render().mutate(s.path, s.body), false);
  s.server.deal = { ...s.server.deal, version: 9 }; const current = await s.render().inspect(); assert.equal(s.render().accept(clone(current)), false); assert.equal(s.render().accept(current), true);
  conflict = false; assert.equal(await s.render().mutate(s.path, { ...s.body, expected_version: current.version }), true); assert.equal(s.calls[1][1].expected_version, 9); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});
test("Conflict inspection and external setters cannot downgrade the reviewed affair", async () => {
  const s = actionFixture({ command: () => { throw new ApiError("DEAL_VERSION_CONFLICT", 409); } }); await s.render().mutate(s.path, s.body); s.server.deal = { ...s.deal, version: 6 };
  await assert.rejects(() => s.render().inspect(), { code: "INVALID_RESPONSE" }); s.render().setFresh(s.server.deal); assert.equal(s.render().fresh, undefined);
  s.render().setFresh({ ...s.deal, id: randomUUID(), version: 50 }); assert.equal(s.render().fresh, undefined);
});
test("Synchronous double dispatch is fenced and disposal aborts all late updates", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }); const s = actionFixture({ command: async ({ commit }) => { await pending; return commit(); } });
  const first = s.render().mutate(s.path, s.body); assert.equal(await s.render().mutate(s.path, s.body), false); await new Promise(resolve => setImmediate(resolve)); assert.equal(s.calls.length, 1);
  s.dispose(); assert.equal(s.calls[0][6].aborted, true); release(); assert.equal(await first, false); assert.equal(s.lateUpdates(), 0); assert.equal(s.completions.length, 0);
});
test("Changing the mounted owner cannot dispatch or complete an old affair operation", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }); const s = actionFixture({ command: async ({ commit }) => { await pending; return commit(); } });
  const original = s.render(), first = original.mutate(s.path, s.body); await new Promise(resolve => setImmediate(resolve)); s.props.actorId = randomUUID(); s.render(); release(); assert.equal(await first, false); assert.equal(await original.retry(), false); assert.equal(s.completions.length, 0);
});
test("Aborted comparison releases the owner and cannot offer a late snapshot", async () => {
  let release; const pending = new Promise(resolve => { release = resolve; }), s = actionFixture(), abort = new AbortController();
  const reading = s.render().inspect(async () => { await pending; return s.deal; }, abort.signal); await new Promise(resolve => setImmediate(resolve)); abort.abort(); release(); await assert.rejects(() => reading); assert.equal(s.render().busy, false); assert.equal(s.render().accept(s.deal), false); assert.equal(s.render().canEdit(), true);
});
test("Proposal create/edit receipts enforce exact parent, proposal and both newer versions", async () => {
  for (const edit of [false, true]) {
    const s = actionFixture(), proposalId = randomUUID(), context = { dealId: s.deal.id, ...(edit ? { proposalId } : {}) };
    const path = edit ? `/api/v1/customer-offers/${proposalId}` : `/api/v1/deals/${s.deal.id}/customer-offers`, body = { expected_version: edit ? 3 : 7, ...(edit ? { expected_deal_version: 7 } : {}), amount_mad: "9007199254740993.01", currency: "MAD", price_period: "year", conditions: "Synthetic conditions", expires_on: null, status: "pending" };
    assert.equal(await s.render().mutate(path, body, edit ? "PATCH" : "POST", context), true); assert.equal(s.calls[0][1].amount_mad, body.amount_mad);
    for (const patch of [{ customer_offer_id: null, offer_version: null }, ...(edit ? [{ customer_offer_id: randomUUID() }, { offer_version: 3 }] : [])]) {
      const invalid = actionFixture({ command: ({ commit }) => ({ ...commit(), ...patch }) }); const badPath = edit ? path : `/api/v1/deals/${invalid.deal.id}/customer-offers`;
      assert.equal(await invalid.render().mutate(badPath, body, edit ? "PATCH" : "POST", { ...context, dealId: invalid.deal.id }), false); assert.equal(invalid.render().error.code, "INVALID_RESPONSE"); assert.equal(invalid.reads.length, 0);
    }
  }
});

test("Actual affair facade rejects foreign record, mutation and proposal identities before private projection", async () => {
  const s = actionFixture(), proposalId = randomUUID(), origin = "https://crm.synthetic.invalid"; let result;
  const loaded = loadServer("src/features/deals/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin },
    "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { upstreamRequest: async () => ({ status: 200, body: result }), facadeError: (status, code) => Response.json({ error: { code } }, { status }) },
    "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": dealContracts,
    "./qualification-contracts": conversionContracts, "@/features/contacts/contracts": contactContracts, "@/features/inventory/outcome-contracts": {},
  } });
  const receipt = { id: s.deal.id, version: 8, customer_offer_id: null, offer_version: null };
  const proposal = { expected_version: 2, expected_deal_version: 7, currency: "MAD", amount_mad: "100.00", price_period: null, conditions: "", expires_on: null, status: "pending" };
  for (const [key, method, body, good, bad] of [
    [`deals/${s.deal.id}`, "GET", undefined, s.deal, { ...s.deal, id: randomUUID() }],
    [`deals/${s.deal.id}/transition`, "POST", s.body, receipt, { ...receipt, id: randomUUID() }],
    [`customer-offers/${proposalId}`, "PATCH", proposal, { ...receipt, customer_offer_id: proposalId, offer_version: 3 }, { ...receipt, customer_offer_id: randomUUID(), offer_version: 3 }],
  ]) {
    const request = () => new Request(`${origin}/api/v1/${key}`, { method, headers: { Origin: origin, "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    result = bad; const denied = await loaded.relayDeals(key, request(), randomUUID()); assert.equal(denied.status, 503); assert.equal((await denied.json()).error.code, "DEPENDENCY_UNAVAILABLE");
    result = good; assert.equal((await loaded.relayDeals(key, request(), randomUUID())).status, 200);
  }
});
