import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";
import { tick } from "./external-stock-fixtures.mjs";
import { ApiError, finance, financeCommandFixture } from "./finance-command-fixtures.mjs";
import { creationKeyResponse } from "./finance-creation-key-fixtures.mjs";

const issuedReads = s => s.reads.filter(path => path.endsWith("/commission-creation-key"));

test("Creation key contract checks UUID7, exact server expiry and strict fields without consulting the device clock", () => {
  const valid = { deal_id: randomUUID(), key: "017f22e2-79b0-7cc3-98c4-dc0c0c07398f", expires_at: "2022-02-22T19:27:22+00:00" };
  assert.equal(finance.creationKeySchema.safeParse(valid).success, true);
  for (const patch of [{ key: randomUUID() }, { key: "not-a-uuid" }, { expires_at: "2022-02-22T19:27:23Z" }, { extra: true }, { deal_id: "foreign" }]) assert.equal(finance.creationKeySchema.safeParse({ ...valid, ...patch }).success, false);
});

test("A creation owns its original financial fields while a scoped server key is pending, then dispatches exactly that key", async () => {
  let release; const s = financeCommandFixture({ kind: "create", issue: () => new Promise(resolve => { release = resolve; }) }), draft = structuredClone(s.body), owner = s.render(), pending = owner.save(s.path, draft);
  await tick(); assert.equal(owner.isBusy(), true); assert.equal(s.calls.length, 0); draft.amount_mad = "99999"; await owner.save(s.path, draft); assert.equal(issuedReads(s).length, 1);
  const issued = creationKeyResponse(s.parent.id); release(issued); assert.equal(await pending, true); assert.equal(s.calls[0][3], issued.key); assert.equal(s.calls[0][1].amount_mad, "10000"); assert.equal(s.commits(), 1);
});

test("Foreign key scope, malformed key and mismatched expiry cannot dispatch or create an unknown financial outcome", async () => {
  for (const patch of [{ deal_id: randomUUID() }, { key: randomUUID() }, { expires_at: "2026-10-29T12:06:00Z" }]) { const s = financeCommandFixture({ kind: "create", issue: () => ({ ...creationKeyResponse(s.parent.id), ...patch }) }); await s.render().save(s.path, s.body); assert.equal(s.calls.length, 0); assert.equal(s.render().uncertain, false); assert.equal(s.render().acknowledged, false); assert.equal(s.render().canEdit(), true); }
});

test("A failed stateless key read permits a fresh confirmation without treating it as an unknown business write", async () => {
  let fail = true; const s = financeCommandFixture({ kind: "create", issue: () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return creationKeyResponse(s.parent.id); } });
  await s.render().save(s.path, s.body); assert.equal(s.calls.length, 0); assert.equal(s.render().uncertain, false); assert.equal(s.render().canEdit(), true); fail = false; assert.equal(await s.render().save(s.path, s.body), true); assert.equal(issuedReads(s).length, 2); assert.equal(s.commits(), 1);
});

test("An issued key carries no authority when the origin loses its current M/A role before dispatch", async () => {
  const s = financeCommandFixture({ kind: "create", issue: () => { s.identity({ user: { id: s.actorId, role: "agent" }, must_change_password: false }); return creationKeyResponse(s.parent.id); } }); await s.render().save(s.path, s.body); assert.equal(s.calls.length, 0); assert.equal(s.denials.length, 1); assert.equal(s.render().accessError.status, 403);
});

test("Disposal during key issuance aborts the original scope and cannot deliver a late financial write", async () => {
  let release; const s = financeCommandFixture({ kind: "create", issue: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().save(s.path, s.body); await tick(); s.h.dispose(); release(creationKeyResponse(s.parent.id)); await pending; assert.equal(s.calls.length, 0); assert.equal(s.h.lateUpdates(), 0);
});

test("A lost creation acknowledgement followed by key expiry never obtains a replacement key or changes its original body", async () => {
  let first = true; const s = financeCommandFixture({ kind: "create", dispatch: ({ commit }) => { if (first) { first = false; commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("FINANCE_CREATION_KEY_EXPIRED", 409); } });
  await s.render().save(s.path, s.body); await s.render().retry(); assert.equal(s.render().uncertain, true); assert.equal(s.render().canEdit(), false); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(JSON.stringify(s.calls[0][1]), JSON.stringify(s.calls[1][1])); assert.equal(issuedReads(s).length, 1); assert.equal(s.commits(), 1);
});

test("An acknowledged creation retries completion without another key read or POST", async () => {
  let outage = true; const s = financeCommandFixture({ kind: "create", read: ({ server }) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server; } }); await s.render().save(s.path, s.body); assert.equal(s.render().acknowledged, true); outage = false; assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 1); assert.equal(issuedReads(s).length, 1);
});

test("A definite expired first attempt requires explicit comparison and a new confirmation before another key", async () => {
  let first = true; const s = financeCommandFixture({ kind: "create", dispatch: ({ commit }) => { if (first) { first = false; throw new ApiError("FINANCE_CREATION_KEY_EXPIRED", 409); } return commit(); } }); await s.render().save(s.path, s.body); assert.equal(s.render().uncertain, false); assert.equal(s.render().needsReview, true);
  await s.render().save(s.path, s.body); assert.equal(issuedReads(s).length, 1); await s.render().compare(); assert.equal(s.render().accept(s.render().comparison), true); assert.equal(await s.render().save(s.path, s.body), true); assert.equal(issuedReads(s).length, 2); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1);
});

function facadeFixture() {
  const origin = "https://crm.synthetic.invalid", calls = []; let response;
  const facade = loadServer("src/features/finance/facade.ts", { modules: { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: r => r.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" }, "@/lib/api/facade": { upstreamRequest: async (...args) => { calls.push(args); return response; }, facadeError: (status, code) => Response.json({ error: { code } }, { status }) }, "./contracts": finance } });
  return { ...facade, calls, origin, response: value => { response = value; } };
}

test("Creation-key facade forwards a bounded private GET, rejects foreign scope and preserves no-store", async () => {
  const s = facadeFixture(), id = randomUUID(), key = `deals/${id}/commission-creation-key`; s.response({ status: 200, body: creationKeyResponse(id) }); const response = await s.relayFinance(key, new Request(`${s.origin}/api/v1/${key}`), randomUUID()); assert.equal(response.status, 200); assert.equal(response.headers.get("Cache-Control"), "no-store"); assert.equal(s.calls[0][0], `/api/v1/${key}`); assert.equal(s.calls[0][2].method, "GET"); assert.equal(s.calls[0][2].body, undefined);
  s.response({ status: 200, body: creationKeyResponse(randomUUID()) }); assert.equal((await s.relayFinance(key, new Request(`${s.origin}/api/v1/${key}`), randomUUID())).status, 503);
});

test("Creation-key facade rejects query/body-method confusion before upstream dispatch and preserves definite key errors", async () => {
  const s = facadeFixture(), id = randomUUID(), key = `deals/${id}/commission-creation-key`;
  for (const [method, suffix] of [["POST", ""], ["DELETE", ""], ["GET", "?page=1"], ["GET", "?q=a&q=b"]]) assert.ok((await s.relayFinance(key, new Request(`${s.origin}/api/v1/${key}${suffix}`, { method }), randomUUID())).status >= 400);
  assert.equal(s.calls.length, 0);
  const root = `deals/${id}/commissions`, body = { kind: "fixed", base_mad: "100000", amount_mad: "1000", rate_percent: null, due_on: null, expected_deal_version: 7 };
  for (const code of ["FINANCE_CREATION_KEY_REQUIRED", "FINANCE_CREATION_KEY_EXPIRED"]) { s.response({ status: 409, body: { error: { code } } }); const response = await s.relayFinance(root, new Request(`${s.origin}/api/v1/${root}`, { method: "POST", headers: { Origin: s.origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify(body) }), randomUUID()); assert.equal(response.status, 409); assert.equal((await response.json()).error.code, code); }
});

test("Actual catch-all API dispatch routes key issuance to Finance rather than an ordinary Deal handler", async () => {
  const path = "src/app/api/v1/[...path]/route.ts", ast = ts.createSourceFile(path, readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true), modules = {}, calls = [];
  for (const item of ast.statements) { if (!ts.isImportDeclaration(item) || item.moduleSpecifier.text === "node:crypto") continue; modules[item.moduleSpecifier.text] = Object.fromEntries((item.importClause?.namedBindings?.elements ?? []).map(entry => [entry.name.text, async () => { throw Error("Unexpected ordinary route"); }])); }
  modules["@/features/finance/facade"] = { relayFinance: async (...args) => { calls.push(args); return Response.json({ selected: true }); } };
  const route = loadServer(path, { modules }), id = randomUUID(), key = `deals/${id}/commission-creation-key`; const response = await route.GET(new Request(`https://crm.synthetic.invalid/api/v1/${key}`), { params: Promise.resolve({ path: key.split("/") }) }); assert.equal(response.status, 200); assert.equal(calls[0][0], key);
});
