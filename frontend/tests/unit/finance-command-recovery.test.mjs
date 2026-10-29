import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { tick, runtime, find } from "./external-stock-fixtures.mjs";
import { finance, intentModule, financeCommandFixture, ApiError } from "./finance-command-fixtures.mjs";

const kinds = ["create", "terms", "recognize", "receipt", "receipt-correct"];
for (const kind of kinds) test(`${kind} finance confirmation validates its exact intent, verifies the current commission and completes once`, async () => {
  let release; const s = financeCommandFixture({ kind, saved: () => new Promise(resolve => { release = resolve; }) }), owner = s.render(), pending = owner.save(s.path, s.body);
  await owner.save(s.path, s.body); await tick(); assert.equal(s.calls.length, 1); assert.equal(s.render().busy, true); assert.equal(s.render().acknowledged, true); assert.equal(s.render().canEdit(), false); release(); assert.equal(await pending, true); assert.equal(s.render().complete, true); await owner.save(s.path, s.body); assert.equal(s.commits(), 1); assert.equal(s.calls.length, 1);
});

test("Finance intents reject foreign routes, versions, unknown fields and cross-kind bodies while preserving exact decimal/evidence/receipt identity", () => {
  for (const kind of kinds) { const s = financeCommandFixture({ kind }), scope = { dealId: s.parent.id, commissionId: kind === "create" ? undefined : s.source.id }, parse = intentModule.financeIntent;
    const good = parse(scope, s.path, s.body); assert.equal(good.kind, kind); assert.deepEqual(JSON.parse(JSON.stringify(good.body)), s.body);
    for (const path of [s.path.replace(s.source.id, randomUUID()).replace(s.parent.id, randomUUID()), s.path + "/other"]) assert.equal(parse(scope, path, s.body), undefined);
    for (const extra of [{ actor_user_id: randomUUID() }, { expected_version: 0 }, { amount_mad: "1e2" }]) { assert.equal(parse(scope, s.path, { ...s.body, ...extra }), undefined); }
  }
});

test("Unknown finance dispatch retains its original nested replacement/body/key/callback and cannot be rebased or overwritten", async () => {
  let lost = true; const s = financeCommandFixture({ kind: "receipt-correct", dispatch: ({ commit }) => { const result = commit(); if (lost) { lost = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } }), draft = structuredClone(s.body);
  await s.render().save(s.path, draft); draft.replacement.amount_mad = "999.99"; draft.reason = "replacement"; s.callbacks.saved = () => assert.fail("replacement parent callback"); s.options.version = 8;
  await s.render().save(s.path, draft); await s.render().compare(); assert.equal(s.calls.length, 1); assert.equal(s.render().uncertain, true); assert.equal(s.render().acknowledged, false);
  assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].replacement.amount_mad, "100.00"); assert.equal(s.calls[1][1].reason, "Synthetic receipt correction"); assert.equal(s.saves.length, 1); assert.equal(s.commits(), 1);
});

test("Acknowledged financial read/callback recovery never sends another write and retains its original completion after read-only context", async () => {
  let outage = true, callbackFails = true, completed = 0; const s = financeCommandFixture({ read: ({ server }) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server; }, saved: () => { completed++; if (callbackFails) throw Error("Synthetic callback unavailable"); } });
  await s.render().save(s.path, s.body); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); assert.equal(completed, 0); outage = false; await s.render().retry(); assert.equal(completed, 1);
  s.callbacks.writable = false; s.callbacks.saved = () => assert.fail("new callback"); callbackFails = false; assert.equal(await s.render().retry(), true); assert.equal(completed, 2); assert.equal(s.calls.length, 1);
});

test("Foreign, nonadvancing, skipped and wrong initial financial receipts cannot acknowledge another operation", async () => {
  for (const kind of kinds) for (const patch of [kind === "create" ? { version: 2 } : { version: 7 }, kind === "create" ? { version: 3 } : { version: 9 }, { id: randomUUID() }]) {
    if (kind === "create" && patch.id) continue;
    const s = financeCommandFixture({ kind, dispatch: ({ commit }) => ({ ...commit(), ...patch }) }); await s.render().save(s.path, s.body); assert.equal(s.render().acknowledged, false); assert.equal(s.render().uncertain, true); assert.equal(s.saves.length, 0);
  }
});

test("Financial current proof binds dossier, counter, creator, true actor, action, exact terms and receipt context", async () => {
  const patches = [server => ({ ...server, id: randomUUID() }), server => ({ ...server, deal_id: randomUUID() }), server => ({ ...server, version: 7, current: { ...server.current, version: 7 } }), server => ({ ...server, current: { ...server.current, action: "recognized" } }), server => ({ ...server, current: { ...server.current, actor: { id: randomUUID(), display_name: "Synthetic foreign actor" } } }), server => ({ ...server, current: { ...server.current, amount_mad: "1.00" } })];
  for (const patch of patches) { const s = financeCommandFixture({ read: ({ server }) => patch(server) }); await s.render().save(s.path, s.body); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); assert.equal(s.saves.length, 0); }
  const creator = financeCommandFixture({ kind: "create", read: ({ server }) => ({ ...server, created_by_user_id: randomUUID() }) }); await creator.render().save(creator.path, creator.body); assert.equal(creator.saves.length, 0); assert.equal(creator.render().uncertain, true);
  const receipt = financeCommandFixture({ kind: "receipt", read: ({ server }) => ({ ...server, current: { ...server.current, receipt_id: null } }) }); await receipt.render().save(receipt.path, receipt.body); assert.equal(receipt.saves.length, 0);
});

test("A newer authorized financial revision retains historical completion without inventing another correction", async () => {
  const s = financeCommandFixture({ read: ({ server }) => ({ ...server, version: 9, current: { ...server.current, version: 9, action: "reopen_review", actor: { id: randomUUID(), display_name: "Synthetic later manager" }, review_required: true } }) }); assert.equal(await s.render().save(s.path, s.body), true); assert.equal(s.calls.length, 1); assert.equal(s.saves.length, 1);
});

test("Current financial proof allows canonical decimal padding without float conversion or changing the request body", async () => {
  const s = financeCommandFixture({ kind: "create", read: ({ server }) => ({ ...server, current: { ...server.current, base_mad: "000100000.00000000", amount_mad: "10000.00" } }) }); assert.equal(await s.render().save(s.path, s.body), true); assert.equal(s.calls[0][1].base_mad, "100000");
});

test("Current M/A identity is required for dispatch, comparison, replay and completion, with only generic saved acknowledgement on denial", async () => {
  for (const identity of [{ user: { id: randomUUID(), role: "manager" }, must_change_password: false }, { user: { id: randomUUID(), role: "agent" }, must_change_password: false }, { must_change_password: true }]) { const s = financeCommandFixture(); s.identity(identity); await s.render().save(s.path, s.body); assert.equal(s.calls.length, 0); assert.equal(s.denials.length, 1); assert.equal(s.render().accessError.status, 403); }
  const s = financeCommandFixture({ dispatch: ({ commit }) => { const result = commit(); s.identity({ user: { id: randomUUID(), role: "administrator" }, must_change_password: false }); return result; } }); await s.render().save(s.path, s.body); assert.equal(s.render().acknowledged, true); assert.equal(s.denials[0][1], true); assert.equal(s.saves.length, 0);
  const admin = financeCommandFixture({ role: "administrator" }); assert.equal(await admin.render().save(admin.path, admin.body), true);
});

test("Definite financial conflicts require explicit exact offered-version acceptance; arbitrary or older bodies cannot rebase the draft", async () => {
  let conflict = true; const s = financeCommandFixture({ dispatch: ({ commit }) => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409); return commit(); } }); await s.render().save(s.path, s.body); assert.equal(s.render().needsReview, true);
  await s.render().save(s.path, { ...s.body, expected_version: 8 }); assert.equal(s.calls.length, 1); s.update({ version: 8, current: { ...s.source.current, version: 8 } }); await s.render().compare(); const candidate = s.render().comparison; assert.equal(s.render().accept({ ...candidate }), false); assert.equal(s.render().accept(candidate), true); conflict = false;
  await s.render().save(s.path, { ...s.body, expected_version: 7 }); assert.equal(s.calls.length, 1); assert.equal(await s.render().save(s.path, { ...s.body, expected_version: 8 }), true); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});

test("Read-only/changed receipt comparison and newer host counters cannot authorize a fresh financial write", async () => {
  for (const blocked of ["This synthetic receipt was replaced", undefined]) { const s = financeCommandFixture({ kind: "receipt-correct" }); s.callbacks.verify = async () => blocked; if (!blocked) s.callbacks.writable = false; await s.render().compare(); assert.equal(s.render().accept(s.render().comparison), false); assert.equal(s.calls.length, 0); }
  const newer = financeCommandFixture(); await newer.render().compare(); const candidate = newer.render().comparison; newer.options.version = 8; newer.render(); assert.equal(newer.render().accept(candidate), false);
});

test("Unknown financial dispatch followed by a pruned or conflicting receipt remains bound to the original operation", async () => {
  let first = true; const s = financeCommandFixture({ dispatch: ({ commit }) => { if (first) { first = false; commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("VERSION_CONFLICT", 409); } }); await s.render().save(s.path, s.body); await s.render().retry(); assert.equal(s.render().uncertain, true); assert.equal(s.render().canEdit(), false); await s.render().compare(); await s.render().save(s.path, { ...s.body, reason: "new reason" }); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1);
});

test("Financial hydration, strict versions and disposal cannot dispatch or deliver late completion", async () => {
  const cold = financeCommandFixture({ hydrated: false }); await cold.render().save(cold.path, cold.body); assert.equal(cold.calls.length, 0);
  const wrong = financeCommandFixture(); await wrong.render().save(wrong.path, { ...wrong.body, expected_version: 8 }); assert.equal(wrong.calls.length, 0); assert.equal(wrong.render().error.status, 422);
  let release; const s = financeCommandFixture({ dispatch: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().save(s.path, s.body); await tick(); const signal = s.calls[0][6]; s.h.dispose(); release({ id: s.source.id, version: 8 }); await pending; assert.equal(signal.aborted, true); assert.equal(s.saves.length, 0); assert.equal(s.h.lateUpdates(), 0);
});

test("Actual finance facade binds every existing operation's receipt and distinguishes creation version1 from a dossier counter", async () => {
  const origin = "https://crm.synthetic.invalid"; let result; const loaded = loadServer("src/features/finance/facade.ts", { modules: { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic" }) }) }, "@/lib/auth/facade": { boundedJson: r => r.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic" }, "@/lib/api/facade": { upstreamRequest: async () => ({ status: 200, body: result }), facadeError: (status, code) => Response.json({ error: { code } }, { status }) }, "./contracts": finance } });
  for (const kind of kinds) { const s = financeCommandFixture({ kind }), request = () => new Request(`${origin}${s.path}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify(s.body) }), key = s.path.slice("/api/v1/".length);
    result = { id: s.source.id, version: kind === "create" ? 2 : 7 }; assert.equal((await loaded.relayFinance(key, request(), randomUUID())).status, 503);
    if (kind !== "create") { result = { id: randomUUID(), version: 8 }; assert.equal((await loaded.relayFinance(key, request(), randomUUID())).status, 503); result = { id: s.source.id, version: 9 }; assert.equal((await loaded.relayFinance(key, request(), randomUUID())).status, 503); }
    result = { id: s.source.id, version: kind === "create" ? 1 : 8 }; assert.equal((await loaded.relayFinance(key, request(), randomUUID())).status, 200);
  }
});

function presentations(path) { const ast = ts.createSourceFile(path, readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), modules = {}; for (const declaration of ast.statements) { if (!ts.isImportDeclaration(declaration) || declaration.importClause?.isTypeOnly) continue; const clause = declaration.importClause, value = {}; if (clause?.name) value.default = clause.name.text; for (const item of clause?.namedBindings?.elements ?? []) if (!item.isTypeOnly) value[item.propertyName?.text ?? item.name.text] = item.name.text; modules[declaration.moduleSpecifier.text] = value; } return modules; }

test("The real affair workspace forwards its originating finance identity and the drawer scopes fresh lifetimes to actor/role/dossier", () => {
  const s = financeCommandFixture(), h = entryHarness(), path = "src/features/deals/deal-workspace.tsx", workspace = loadServer(path, { modules: { ...presentations(path), react: h.react, "react/jsx-runtime": runtime, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request() {} }) } } });
  const view = h.render(() => workspace.DealWorkspace({ deal: s.parent, role: "manager", actorId: s.actorId, writable: true, busy: false, busyChanged() {}, mutate() {}, reload() {}, onEdit() {} })), panel = find(find(view, "RecordSection").find(section => section.props.title === "Finance").props.action, "FinancePanel")[0]; assert.equal(panel.props.actorId, s.actorId); assert.equal(panel.props.role, "manager");
  const panelPath = "src/features/finance/finance-panel.tsx", loaded = loadServer(panelPath, { modules: { ...presentations(panelPath), react: h.react, "react/jsx-runtime": runtime } });
  const initial = loaded.FinancePanel(panel.props), changed = loaded.FinancePanel({ ...panel.props, actorId: randomUUID() }); assert.equal(initial.props.binding.actorId, s.actorId); assert.equal(initial.props.binding.role, "manager"); assert.notEqual(initial.key, changed.key);
});

test("A changed finance origin cannot deliver an old pending result into the new scope", async () => {
  let release; const s = financeCommandFixture({ dispatch: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().save(s.path, s.body); await tick(); s.options.actorId = randomUUID(); s.render(); release({ id: s.source.id, version: 8 }); assert.equal(await pending, false); assert.equal(s.saves.length, 0); s.h.dispose(); assert.equal(s.h.lateUpdates(), 0);
});
