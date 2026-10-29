import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { policyFixture, policyIntent, previewForPolicy, ApiError, tick } from "./policy-command-fixtures.mjs";

test("Policy receipts bind the complete proposal, next counter, reviewed hash and bounded unique impact", () => {
  const s = policyFixture(), result = previewForPolicy(s.body), body = { ...s.body, preview_hash: result.preview_hash };
  assert.ok(policyIntent.policyPreviewReceipt(body, result));
  for (const value of [{ ...result, policy: { ...result.policy, version: result.policy.version + 1 } }, { ...result, policy: { ...result.policy, company_car_capacity_per_hour: 999 } }, { ...result, preview_hash: "b".repeat(64) }, { ...result, affected_total: 1 }]) assert.equal(policyIntent.policyPreviewReceipt(body, value), undefined);
});

test("A changed proposal invalidates an earlier policy save handler and a late preview cannot restore its lease", async () => {
  const s = policyFixture(); await s.render().verify(s.body); const stale = s.render(); s.render().invalidate();
  assert.equal(await stale.save(s.body), false); assert.equal(s.calls.length, 1);
  let finish; const pending = policyFixture({ dispatch: ({ args }) => new Promise(resolve => { finish = () => resolve(previewForPolicy(args[1])); }) });
  const task = pending.render().verify(pending.body); await tick(); pending.render().invalidate(); finish(); await task;
  assert.equal(pending.render().preview, undefined); assert.equal(await pending.render().save(pending.body), false);
});

test("Unknown working-hours saves retain original nested body, key and callback and later409 cannot rebase them", async () => {
  let first = true; const s = policyFixture({ dispatch: ({ args, respond }) => { if (args[4] === "POST") return respond(); const result = respond(); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
  await s.render().verify(s.body); const body = structuredClone(s.body); await s.render().save(body); body.working_windows[0].end_local = "11:00";
  assert.equal(s.render().uncertain, true); assert.equal(s.render().invalidate(), false); assert.equal(await s.render().verify(body), false); assert.equal(await s.render().save(body), false);
  s.props.saved = () => { throw Error("Replacement callback must not run"); }; await s.render().retry();
  const writes = s.calls.filter(args => args[4] === "PUT"); assert.equal(writes.length, 2); assert.equal(writes[0][3], writes[1][3]); assert.notEqual(writes[1][1].working_windows[0].end_local, body.working_windows[0].end_local); assert.equal(s.commits(), 1); assert.equal(s.completed.length, 1);
  let count = 0; const unknown = policyFixture({ dispatch: ({ args, respond }) => { if (args[4] === "POST") return respond(); throw new ApiError(++count === 1 ? "DEPENDENCY_UNAVAILABLE" : "VERSION_CONFLICT", count === 1 ? 503 : 409); } });
  await unknown.render().verify(unknown.body); await unknown.render().save(unknown.body); await unknown.render().retry(); await unknown.render().compare();
  assert.equal(unknown.render().uncertain, true); assert.equal(unknown.reads.length, 0); assert.equal(unknown.calls.at(-1)[3], unknown.calls.at(-2)[3]);
});

test("Acknowledged policy refresh and parent handoff retry completion only, including newer current policy", async () => {
  let outage = true, parent = true; const s = policyFixture({ read: (_path, schema, _signal, current) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(current); }, done: () => { if (parent) { parent = false; throw Error("Synthetic parent handoff failure"); } } });
  await s.render().verify(s.body); await s.render().save(s.body); assert.equal(s.render().acknowledged, true); outage = false; await s.render().retry(); assert.equal(s.render().uncertain, true);
  s.setServer({ ...s.server(), version: s.server().version + 1, company_car_capacity_per_hour: 4 }); await s.render().retry();
  assert.equal(s.calls.filter(args => args[4] === "PUT").length, 1); assert.equal(s.render().complete, true); assert.equal(s.completed.at(-1).company_car_capacity_per_hour, 4);
});

test("Definite policy conflict requires exact fresh comparison acceptance and another impact preview", async () => {
  let conflict = true; const s = policyFixture({ dispatch: ({ args, respond }) => { if (args[4] === "PUT" && conflict) throw new ApiError("SCHEDULE_REPREVIEW_REQUIRED", 409); return respond(); } });
  await s.render().verify(s.body); await s.render().save(s.body); const current = s.render().comparison;
  assert.equal(s.render().needsReview, true); assert.equal(await s.render().verify(s.body), false); assert.equal(s.render().accept({ ...current }), false); assert.equal(s.render().accept(current), true); assert.equal(await s.render().save(s.body), false);
  conflict = false; await s.render().verify(s.body); await s.render().save(s.body); assert.equal(s.render().complete, true);
});

test("Current administrator and original actor are required before preview and before private save completion", async () => {
  const s = policyFixture(); s.identity({ user: { id: s.actorId, role: "manager" }, must_change_password: false }); await s.render().verify(s.body); assert.equal(s.calls.length, 0); assert.equal(s.denied[0][0].status, 403);
  const changed = policyFixture(); await changed.render().verify(changed.body); changed.identity({ user: { id: randomUUID(), role: "administrator" }, must_change_password: false }); await changed.render().save(changed.body); assert.equal(changed.calls.length, 1);
  let acknowledged; acknowledged = policyFixture({ dispatch: ({ args, respond }) => { const value = respond(); if (args[4] === "PUT") acknowledged.identity({ user: { id: randomUUID(), role: "administrator" }, must_change_password: false }); return value; } });
  await acknowledged.render().verify(acknowledged.body); await acknowledged.render().save(acknowledged.body); assert.equal(acknowledged.completed.length, 0); assert.equal(acknowledged.denied[0][1], true);
});

test("Disposed policy saves abort current read and cannot publish a late private completion", async () => {
  let finish, signal; const s = policyFixture({ read: (_path, _schema, current, server) => { signal = current; return new Promise(resolve => { finish = () => resolve(server); }); } });
  await s.render().verify(s.body); const task = s.render().save(s.body); await tick(); s.dispose(); assert.equal(signal.aborted, true); finish(); await task; assert.equal(s.completed.length, 0); assert.equal(s.lateUpdates(), 0);
  const cold = policyFixture({ hydrated: false }); assert.equal(await cold.render().verify(cold.body), false); assert.equal(cold.calls.length, 0);
});

test("A newer host policy rejects an old completion and a failed conflict read cannot be bypassed by a stale handler", async () => {
  let finish; const s = policyFixture({ read: (_path, _schema, _signal, current) => new Promise(resolve => { finish = () => resolve(current); }) });
  await s.render().verify(s.body); const task = s.render().save(s.body); await tick(); s.props.initial = { ...s.source, version: s.source.version + 3 }; s.render(); finish(); await task; assert.equal(s.render().uncertain, true); assert.equal(s.completed.length, 0);
  const conflict = policyFixture({ dispatch: ({ args, respond }) => { if (args[4] === "PUT") throw new ApiError("VERSION_CONFLICT", 409); return respond(); }, read: () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await conflict.render().verify(conflict.body); const stale = conflict.render(); await stale.save(conflict.body); assert.equal(await stale.verify(conflict.body), false); assert.equal(conflict.calls.length, 2);
});
