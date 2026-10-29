import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { contactEdits, contactEditFixture, ApiError, tick } from "./contact-edit-fixtures.mjs";

test("Canonical contact receipts require the exact root, next counter and coherent primary methods", () => {
  const s = contactEditFixture(), good = { ...s.source, version: s.source.version + 1 };
  assert.ok(contactEdits.contactEditReceipt(s.source.id, s.body, good));
  for (const bad of [{ ...good, id: randomUUID() }, { ...good, version: good.version + 1 }, { ...good, primary_phone: "+212600000999" }]) assert.equal(contactEdits.contactEditReceipt(s.source.id, s.body, bad), undefined);
});

test("An interrupted contact edit retains its original nested body, key and callback and refuses replacement", async () => {
  let first = true; const s = contactEditFixture({ dispatch: ({ commit }) => { const result = commit(); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
  const body = structuredClone(s.body); body.name = "Synthetic original confirmed name"; await s.render().save(body);
  assert.equal(s.render().uncertain, true); body.phones[0].label = "Replacement must not enter retry";
  s.props.completed = () => { throw Error("Wrong replacement callback"); }; assert.equal(await s.render().save({ ...body, name: "Replacement" }), false);
  await s.render().retry(); assert.equal(s.commits(), 1); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]);
  assert.equal(s.calls[1][1].name, "Synthetic original confirmed name"); assert.notEqual(s.calls[1][1].phones[0].label, body.phones[0].label); assert.equal(s.completions.length, 1);
  assert.equal(s.render().complete, true); assert.equal(await s.render().save(body), false);
});

test("Acknowledged read and callback failures retry completion only, including a newer historical contact", async () => {
  let outage = true, callback = true; const s = contactEditFixture({ read: (_path, schema, _signal, current) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(current); }, done: () => { if (callback) { callback = false; throw Error("Synthetic parent handoff failure"); } } });
  await s.render().save(s.body); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); outage = false;
  await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.render().uncertain, true);
  s.setServer({ ...s.server(), version: s.server().version + 1, name: "Synthetic later authorized name" }); await s.render().retry();
  assert.equal(s.calls.length, 1); assert.equal(s.render().complete, true); assert.equal(s.completions.at(-1).name, "Synthetic later authorized name");
});

test("Definite conflicts require fresh exact comparison acceptance; unknown conflicts keep the original operation", async () => {
  let conflict = true; const s = contactEditFixture({ dispatch: ({ commit }) => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409); return commit(); } });
  await s.render().save(s.body); assert.equal(s.render().needsReview, true); assert.equal(await s.render().save(s.body), false);
  const fresh = { ...s.source, version: s.source.version + 2 }; s.setServer(fresh); await s.render().compare(); const current = s.render().comparison;
  assert.equal(s.render().accept({ ...current }), false); assert.equal(s.render().accept(current), true); conflict = false;
  await s.render().save({ ...s.body, expected_version: current.version }); assert.equal(s.render().complete, true);
  let first = true; const unknown = contactEditFixture({ dispatch: () => { if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("VERSION_CONFLICT", 409); } });
  await unknown.render().save(unknown.body); await unknown.render().retry(); assert.equal(unknown.render().uncertain, true); assert.equal(unknown.calls[0][3], unknown.calls[1][3]);
  await unknown.render().compare(); assert.equal(unknown.reads.length, 0); assert.equal(unknown.render().accept(fresh), false);
});

test("Current identity loss, alias changes and old projections cannot complete or install private fields", async () => {
  const s = contactEditFixture(); s.identity({ user: { id: randomUUID(), role: "manager" }, must_change_password: false }); await s.render().save(s.body);
  assert.equal(s.calls.length, 0); assert.equal(s.denials[0][0].status, 403);
  const alias = contactEditFixture({ read: (_path, schema, _signal, server) => schema.parse({ ...server, id: randomUUID() }) }); await alias.render().save(alias.body);
  assert.equal(alias.completions.length, 0); assert.equal(alias.denials[0][1], true); assert.equal(alias.render().denial.status, 404);
  const stale = contactEditFixture({ read: (_path, schema, _signal, server) => schema.parse({ ...server, version: server.version - 1 }) }); await stale.render().save(stale.body);
  assert.equal(stale.render().uncertain, true); assert.equal(stale.render().acknowledged, true); await stale.render().retry(); assert.equal(stale.calls.length, 1);
});

test("Disposal suppresses a pending private completion and unavailable or unhydrated new saves cannot dispatch", async () => {
  let finish, signal; const s = contactEditFixture({ read: (_path, _schema, current) => { signal = current; return new Promise(resolve => { finish = resolve; }); } });
  const task = s.render().save(s.body); await tick(); s.dispose(); assert.equal(signal.aborted, true); finish(s.server()); await task;
  assert.equal(s.completions.length, 0); assert.equal(s.lateUpdates(), 0);
  const loading = contactEditFixture({ hydrated: false }); assert.equal(await loading.render().save(loading.body), false); assert.equal(loading.calls.length, 0);
  const unavailable = contactEditFixture(); unavailable.props.available = false; assert.equal(await unavailable.render().save(unavailable.body), false); assert.equal(unavailable.calls.length, 0);
});

test("An acknowledged edit still refuses changed identity before private completion", async () => {
  let s; s = contactEditFixture({ dispatch: ({ commit }) => { const value = commit(); s.identity({ user: { id: s.actorId, role: "agent" }, must_change_password: false }); return value; } });
  await s.render().save(s.body); assert.equal(s.calls.length, 1); assert.equal(s.completions.length, 0); assert.equal(s.denials[0][1], true); assert.equal(s.render().denial.status, 403);
});

test("A newer host counter prevents an older private result or comparison from being installed", async () => {
  let finish; const s = contactEditFixture({ read: (_path, _schema, _signal, server) => new Promise(resolve => { finish = () => resolve(server); }) });
  const task = s.render().save(s.body); await tick(); s.props.contact = { ...s.source, version: s.source.version + 3 }; s.render(); finish(); await task;
  assert.equal(s.render().uncertain, true); assert.equal(s.completions.length, 0); assert.equal(s.calls.length, 1);
});
