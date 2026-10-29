import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { ownerFixture, ownerIntent, ownerModel, ownershipContact, ApiError, tick } from "./owner-form-command-fixtures.mjs";

test("Owner intents/receipts preserve the owner purpose, exact edited root/counter/roles and new-contact creator/responsibility", async () => {
  const s = ownerFixture({ kind: "create" }); await s.render().start(s.intent, s.saved); const receipt = s.server(); assert.ok(ownerIntent.ownerFormReceipt(s.intent, receipt, s.actorId));
  for (const change of [{ version: 2 }, { created_by_user_id: randomUUID() }, { primary_agent: { id: randomUUID(), display_name: "Synthetic wrong responsible agent" } }, { source: "csv_import" }]) assert.equal(ownerIntent.ownerFormReceipt(s.intent, { ...receipt, ...change }, s.actorId), undefined);
  assert.equal(ownerIntent.ownerFormIntent({ ...s.intent, body: { ...s.intent.body, roles: ["buyer"] } }), undefined);
  const edited = ownerFixture(); await edited.render().start(edited.intent, edited.saved); assert.equal(ownerIntent.ownerFormReceipt(edited.intent, { ...edited.server(), id: randomUUID() }, edited.actorId), undefined); assert.equal(ownerIntent.ownerFormReceipt(edited.intent, { ...edited.server(), roles: [] }, edited.actorId), undefined);
});

test("Unknown owner creation freezes the original nested body, assignee, key and completion callback", async () => {
  let first = true; const s = ownerFixture({ kind: "create", dispatch: ({ commit }) => { const result = commit(); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
  const intent = structuredClone(s.intent); await s.render().start(intent, s.saved); intent.body.phones[0].label = "Synthetic unsent replacement"; intent.body.primary_agent_id = randomUUID();
  assert.equal(s.render().uncertain, true); assert.equal(s.render().reset(), false); assert.equal(await s.render().start(intent, () => { throw Error("Wrong callback"); }), false); await s.render().retry();
  assert.equal(s.commits(), 1); assert.equal(s.calls[0][3], s.calls[1][3]); assert.notEqual(s.calls[1][1].phones[0].label, intent.body.phones[0].label); assert.notEqual(s.calls[1][1].primary_agent_id, intent.body.primary_agent_id); assert.equal(s.completed.length, 1); assert.equal(s.render().complete, true);
});

test("Unknown role addition remains bound to its original selected contact through replacement state and later409", async () => {
  let first = true; const s = ownerFixture({ kind: "add-role", dispatch: () => { if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("VERSION_CONFLICT", 409); } });
  await s.render().start(s.intent, s.saved); const other = ownershipContact(); s.props.subject = other; assert.equal(await s.render().start({ kind: "add-role", id: other.id, body: ownerModel.ownerRoleBody(other) }, s.saved), false);
  await s.render().retry(); await s.render().compare(); assert.equal(s.render().uncertain, true); assert.equal(s.reads.length, 0); assert.equal(s.calls[0][0], s.calls[1][0]); assert.equal(s.calls[0][3], s.calls[1][3]);
});

test("Acknowledged owner edits retry only current read and original handoff, including a newer current record", async () => {
  let outage = true, parent = true; const s = ownerFixture({ read: (_path, schema, _signal, value) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(value); }, done: () => { if (parent) { parent = false; throw Error("Synthetic handoff failure"); } } });
  await s.render().start(s.intent, s.saved); assert.equal(s.render().acknowledged, true); outage = false; await s.render().retry(); assert.equal(s.render().uncertain, true);
  s.setServer({ ...s.server(), version: s.server().version + 1, name: "Synthetic newer owner identity" }); await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed.at(-1).name, "Synthetic newer owner identity"); assert.equal(s.render().complete, true);
});

test("Opening an existing owner performs a current scoped read without mutation and cannot accept archived/stale membership", async () => {
  const source = ownershipContact({ roles: ["owner"] }), s = ownerFixture({ kind: "open", source }); s.setServer({ ...source, version: source.version + 1, name: "Synthetic current owner" }); await s.render().start(s.intent, s.saved); assert.equal(s.calls.length, 0); assert.equal(s.completed[0].name, "Synthetic current owner"); assert.equal(s.render().acknowledged, false);
  const changed = ownerFixture({ kind: "open", source }); changed.setServer({ ...source, version: source.version + 1, roles: ["buyer"] }); await changed.render().start(changed.intent, changed.saved); assert.equal(changed.completed.length, 0); assert.equal(changed.render().needsReview, true); await changed.render().compare(); const current = changed.render().comparison; assert.equal(changed.render().accept(current), true);
  changed.props.subject = current; await changed.render().start({ kind: "add-role", id: current.id, body: ownerModel.ownerRoleBody(current) }, changed.saved); assert.equal(changed.calls.length, 1); assert.equal(changed.completed.length, 1);
});

test("A definite owner conflict needs exact fresh comparison; accepted versions cannot be bypassed by old handlers", async () => {
  let conflict = true; const s = ownerFixture({ dispatch: ({ commit }) => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409); return commit(); } }); await s.render().start(s.intent, s.saved); assert.equal(s.render().comparison, undefined);
  s.setServer({ ...s.source, version: s.source.version + 2 }); await s.render().compare(); const current = s.render().comparison; assert.equal(s.render().accept({ ...current }), false); assert.equal(s.render().accept(current), true); assert.equal(await s.render().start(s.intent, s.saved), false);
  conflict = false; await s.render().start({ ...s.intent, body: { ...s.intent.body, expected_version: current.version } }, s.saved); assert.equal(s.render().complete, true);
});

test("Owner operations require the original current actor/role and refuse alias retargeting before private completion", async () => {
  const s = ownerFixture(); s.identity({ user: { id: randomUUID(), role: "manager" }, must_change_password: false }); await s.render().start(s.intent, s.saved); assert.equal(s.calls.length, 0); assert.equal(s.denied[0][0].status, 403);
  const alias = ownerFixture({ read: (_path, schema, _signal, current) => schema.parse({ ...current, id: randomUUID() }) }); await alias.render().start(alias.intent, alias.saved); assert.equal(alias.completed.length, 0); assert.equal(alias.denied[0][1], true);
  let after; after = ownerFixture({ dispatch: ({ commit }) => { const result = commit(); after.identity({ user: { id: after.actorId, role: "agent" }, must_change_password: false }); return result; } }); await after.render().start(after.intent, after.saved); assert.equal(after.completed.length, 0); assert.equal(after.denied[0][1], true);
});

test("Owner disposal aborts current read; hydration/unavailable starts and older host completion are refused", async () => {
  let finish, signal; const s = ownerFixture({ read: (_path, _schema, current, value) => { signal = current; return new Promise(resolve => { finish = () => resolve(value); }); } }); const task = s.render().start(s.intent, s.saved); await tick(); s.dispose(); assert.equal(signal.aborted, true); finish(); await task; assert.equal(s.completed.length, 0); assert.equal(s.lateUpdates(), 0);
  const cold = ownerFixture({ hydrated: false }); assert.equal(await cold.render().start(cold.intent, cold.saved), false); assert.equal(cold.calls.length, 0);
  const unavailable = ownerFixture(); unavailable.props.available = false; assert.equal(await unavailable.render().start(unavailable.intent, unavailable.saved), false); assert.equal(unavailable.calls.length, 0);
  const stale = ownerFixture({ read: (_path, schema, _signal, current) => schema.parse({ ...current, version: current.version - 1 }) }); await stale.render().start(stale.intent, stale.saved); assert.equal(stale.render().uncertain, true); assert.equal(stale.completed.length, 0); await stale.render().retry(); assert.equal(stale.calls.length, 1);
});
