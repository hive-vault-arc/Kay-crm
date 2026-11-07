import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { runtime, find, text, button, tick } from "./external-stock-fixtures.mjs";
import { ApiError, contactContracts, dealContracts, lifecycleContract, lifecycleFixture } from "./record-lifecycle-fixtures.mjs";

for (const kind of ["enquiries", "deals"]) for (const operation of ["archive", "restore"]) test(`${kind} ${operation} verifies exact receipt/current root and awaits its original parent completion`, async () => {
  let release; const s = lifecycleFixture({ kind, operation, saved: () => new Promise(resolve => { release = resolve; }) }), owner = s.render(), draft = s.body();
  const running = owner.submit(draft); await owner.submit(draft); draft.reason = "Do not replace the snapshot"; await tick();
  assert.equal(s.calls.length, 1); assert.equal(s.calls[0][0], `/api/v1/${kind}/${s.source.id}/${operation}`); assert.equal(s.calls[0][1].reason, "Synthetic explicit lifecycle reason"); assert.equal(s.calls[0][4], "POST");
  assert.equal(s.render().busy, true); assert.equal(s.render().acknowledged, true); assert.equal(s.render().canEdit(), false); release(); assert.equal(await running, true); assert.equal(s.render().protected, false);
  await owner.submit(s.body()); assert.equal(s.calls.length, 1); assert.equal(s.server().version, 8); assert.equal(Boolean(s.server().archived_at), operation === "archive");
});

test("Strict reasons/versions/unknown fields and hydration cannot dispatch unreviewed lifecycle input", async () => {
  const s = lifecycleFixture(); for (const patch of [{ reason: " " }, { reason: "x".repeat(1001) }, { expected_version: 0 }, { expected_version: 8 }, { actor_user_id: randomUUID() }, { release_stock: true }]) await s.render().submit({ ...s.body(), ...patch });
  assert.equal(s.calls.length, 0); assert.equal(s.render().error.status, 422);
  const cold = lifecycleFixture({ hydrated: false }); await cold.render().submit(cold.body()); assert.equal(cold.calls.length, 0);
});

for (const kind of ["enquiries", "deals"]) test(`${kind} lost acknowledgement retains the original action/body/key/callback even when the displayed counter advances`, async () => {
  let lost = true; const s = lifecycleFixture({ kind, dispatch: ({ commit }) => { const receipt = commit(); if (lost) { lost = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return receipt; } });
  await s.render().submit(s.body("  Synthetic original reason  ")); assert.equal(s.render().uncertain, true); assert.equal(s.render().acknowledged, false); assert.equal(s.commits(), 1);
  s.options.version = 8; s.options.saved = () => assert.fail("must retain the original parent callback"); await s.render().submit({ expected_version: 8, reason: "replacement" }); await s.render().inspect(); assert.equal(s.calls.length, 1);
  assert.equal(await s.render().retry(), true); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(JSON.stringify(s.calls[0][1]), JSON.stringify(s.calls[1][1])); assert.equal(s.saves[0].record.version, 8); assert.equal(s.commits(), 1);
});

test("Acknowledged completion failures retry only current proof/read and the frozen callback", async () => {
  let unavailable = true, failedCallback = true, completions = 0;
  const s = lifecycleFixture({ kind: "deals", read: ({ server }) => { if (server.version > 7 && unavailable) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server; }, saved: async () => { completions++; if (failedCallback) throw Error("Synthetic callback outage"); } });
  await s.render().submit(s.body()); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); assert.equal(completions, 0);
  unavailable = false; await s.render().retry(); assert.equal(completions, 1); assert.equal(s.calls.length, 1);
  s.options.saved = () => assert.fail("replacement callback"); failedCallback = false; assert.equal(await s.render().retry(), true); assert.equal(completions, 2); assert.equal(s.calls.length, 1);
});

test("Receipt and current-record identity/version/state mismatches remain protected without claiming completion", async () => {
  for (const receipt of [{ id: randomUUID(), version: 8 }, { version: 7 }]) { const s = lifecycleFixture({ dispatch: () => ({ id: s.source.id, ...receipt }) }); await s.render().submit(s.body()); assert.equal(s.render().uncertain, true); assert.equal(s.render().acknowledged, false); assert.equal(s.saves.length, 0); }
  for (const patch of [{ id: randomUUID() }, { version: 7 }, { archived_at: null }]) { const s = lifecycleFixture({ read: ({ server }) => server.version > 7 ? { ...server, ...patch } : server }); await s.render().submit(s.body()); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); assert.equal(s.saves.length, 0); }
  const historical = lifecycleFixture({ read: ({ server }) => server.version > 7 ? { ...server, version: 9, archived_at: null } : server }); assert.equal(await historical.render().submit(historical.body()), true); assert.equal(historical.saves[0].record.archived_at, null);
});

test("Agent authority uses assigned prospect agent versus primary deal agent; managers and administrators retain both operations", async () => {
  for (const kind of ["enquiries", "deals"]) {
    const s = lifecycleFixture({ kind }); s.update(kind === "enquiries" ? { assigned_agent: { id: randomUUID(), display_name: "Synthetic other assignee" } } : { contact: { ...s.source.contact, primary_agent: { id: randomUUID(), display_name: "Synthetic other primary" } } });
    assert.equal(await s.render().submit(s.body()), false); assert.equal(s.render().review, "authority"); assert.equal(s.calls.length, 0); assert.equal(s.denials.length, 0); assert.equal(s.render().accept(s.render().comparison), false);
    for (const role of ["manager", "administrator"]) { const allowed = lifecycleFixture({ kind, role }); assert.equal(await allowed.render().submit(allowed.body()), true); }
  }
  const assigned = lifecycleFixture(); assigned.update({ contact: { ...assigned.source.contact, primary_agent: { id: randomUUID(), display_name: "Synthetic primary" } } }); assert.equal(await assigned.render().submit(assigned.body()), true);
});

test("Identity changes or password restriction stop first dispatch/replay and mask private completion after acknowledgement", async () => {
  for (const identity of [{ user: { id: randomUUID(), role: "agent" }, must_change_password: false }, { user: { id: randomUUID(), role: "manager" }, must_change_password: false }, { must_change_password: true }]) { const s = lifecycleFixture(); s.identity(identity); await s.render().submit(s.body()); assert.equal(s.calls.length, 0); assert.equal(s.denials.length, 1); }
  const s = lifecycleFixture({ dispatch: ({ commit }) => { const receipt = commit(); s.identity({ user: { id: randomUUID(), role: "agent" }, must_change_password: false }); return receipt; } }); await s.render().submit(s.body()); assert.equal(s.saves.length, 0); assert.equal(s.render().acknowledged, true); assert.equal(s.denials[0][1], true); assert.equal(s.render().protected, false);
});

test("Changed dossier comparison is explicit, preserves the chosen operation, and cannot accept invented or older versions", async () => {
  const s = lifecycleFixture(); s.update({ version: 8 }); await s.render().submit(s.body()); assert.equal(s.calls.length, 0); assert.equal(s.render().needsReview, true); const comparison = s.render().comparison;
  assert.equal(s.render().accept({ ...comparison }), false); assert.equal(s.render().accept(comparison), true); await s.render().submit({ expected_version: 8, reason: "Synthetic retained reason" }); assert.equal(s.calls[0][1].expected_version, 8);
  for (const patch of [{ archived_at: "2026-10-29T12:00:00Z" }, { contact: { ...s.source.contact, archived_at: "2026-10-29T12:00:00Z" } }]) { const blocked = lifecycleFixture(); blocked.update(patch); await blocked.render().submit(blocked.body()); assert.equal(blocked.render().accept(blocked.render().comparison), false); assert.equal(blocked.calls.length, 0); }
  const newerHost = lifecycleFixture(); newerHost.update({ version: 8 }); await newerHost.render().inspect(); const current = newerHost.render().comparison; newerHost.options.version = 9; newerHost.render(); assert.equal(newerHost.render().accept(current), false);
});

test("Authoritative restore expiry, reservation, task and visit blockers require review without mutating linked workflow", async () => {
  for (const code of ["RECORD_RESTORE_EXPIRED", "RESERVATION_RELEASE_REQUIRED", "RECORD_ACTIVE_TASK", "RECORD_ACTIVE_VISIT", "DEAL_VERSION_CONFLICT", "CONTACT_ARCHIVED"]) { const s = lifecycleFixture({ kind: "deals", operation: code === "RECORD_RESTORE_EXPIRED" ? "restore" : "archive", dispatch: () => { throw new ApiError(code, 409); } }); await s.render().submit(s.body()); assert.equal(s.render().uncertain, false); assert.equal(s.render().needsReview, true); assert.equal(s.render().canEdit(), false); assert.equal(s.commits(), 0); assert.equal(s.render().error.code, code); }
});

test("An unknown outcome followed by a pruned/conflicting receipt cannot become a fresh command", async () => {
  let first = true; const s = lifecycleFixture({ dispatch: ({ commit }) => { if (first) { first = false; commit(); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } throw new ApiError("RECORD_ALREADY_ARCHIVED", 409); } });
  await s.render().submit(s.body()); await s.render().retry(); assert.equal(s.render().uncertain, true); assert.equal(s.render().canEdit(), false); await s.render().submit(s.body("another reason")); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]);
});

test("Disposal aborts lifecycle ownership without late saves/state updates", async () => {
  let release; const s = lifecycleFixture({ dispatch: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().submit(s.body()); await tick(); const signal = s.calls[0][6]; s.h.dispose(); release({ id: s.source.id, version: 8 }); await pending; assert.equal(signal.aborted, true); assert.equal(s.saves.length, 0); assert.equal(s.h.lateUpdates(), 0);
});

function dialogFixture(config = {}) {
  const h = componentHarness(), s = lifecycleFixture({ ...config, harness: h }), held = [], decisions = [], draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} } });
  const ui = loadServer("src/features/discovery/record-lifecycle-action.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle", "AlertDialogTrigger"].map(name => [name, name])), "@/components/shared/dossier-form": draft, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: run => decisions.push(run) }) }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/contracts": contactContracts, "@/features/deals/contracts": dealContracts, "@/hooks/use-hydrated": { useHydrated: () => true }, "./use-record-lifecycle-command": s.hook } });
  const props = { kind: s.options.kind, id: s.source.id, version: 7, archivedAt: s.source.archived_at, label: "Synthetic lifecycle label", actorId: s.actorId, role: s.options.role, heldChanged: active => held.push(active), denied: s.options.denied, onChanged: s.options.saved };
  const render = () => { let view; for (let i = 0; i < 2; i++) view = h.render(() => ({ type: ui.RecordLifecycleAction, props })); return view; };
  return { ...s, held, decisions, props, render, open() { find(render(), "AlertDialog")[0].props.onOpenChange(true); return render(); }, reason(value) { find(render(), "Textarea")[0].props.onChange({ target: { value } }); }, async submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await tick(); } };
}

test("Actual dialog retains mandatory reason/30-day copy and blocks stale edits, cancellation and action-flips during unknown saves", async () => {
  let fail = true; const s = dialogFixture({ dispatch: ({ commit }) => { const receipt = commit(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt; } });
  const opened = s.open(), staleField = find(opened, "Textarea")[0], staleDialog = find(opened, "AlertDialog")[0]; assert.match(text(opened), /30 jours/); s.reason("Synthetic original dialog reason"); await s.submit();
  staleField.props.onChange({ target: { value: "replacement" } }); staleDialog.props.onOpenChange(false); s.props.archivedAt = "2026-10-29T12:00:00Z"; s.props.version = 8; const failed = s.render();
  assert.equal(s.decisions.length, 0); assert.equal(find(failed, "Textarea")[0].props.value, "Synthetic original dialog reason"); assert.match(text(failed), /Archiver le prospect/); assert.equal(find(failed, "form")[0].props["aria-busy"], true); assert.equal(button(failed, "Conserver la fiche").props.disabled, true);
  fail = false; await s.submit(); const completed = s.render(); assert.equal(find(completed, "form").length, 0); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(s.held, [true, false]); assert.equal(button(completed, "Restaurer le prospect").props.disabled, false); s.open(); assert.equal(find(s.render(), "Textarea")[0].props.value, ""); assert.match(text(s.render()), /Restaurer le prospect/);
});

test("Ordinary dialog cancellation retains the existing unsaved-draft confirmation", () => {
  const s = dialogFixture(); s.open(); s.reason("Synthetic unsubmitted reason"); find(s.render(), "AlertDialog")[0].props.onOpenChange(false); assert.equal(s.decisions.length, 1); assert.equal(find(s.render(), "form").length, 1); s.decisions[0](); assert.equal(find(s.render(), "form").length, 0);
});

test("A deferred lifecycle discard cannot close or refresh an unmounted host", () => {
  const s = dialogFixture(); s.open(); s.reason("Synthetic deferred discard"); find(s.render(), "AlertDialog")[0].props.onOpenChange(false); s.h.dispose(); s.decisions[0](); assert.equal(s.h.lateUpdates(), 0); assert.deepEqual(s.held, [true]);
});

test("Selected-page projection survives row-removing/temporary reads while current access denial still masks private rows", () => {
  const h = componentHarness(), hook = loadServer("src/features/discovery/use-lifecycle-projection.ts", { modules: { react: h.react } }); let remote = { items: [{ id: randomUUID() }], total: 1 }, error, current;
  function Host() { current = hook.useLifecycleProjection(remote, error); return null; } const render = () => h.render(() => ({ type: Host, props: {} })); render(); current.hold(true); render(); const original = current.value; remote = { items: [], total: 0 }; render(); assert.equal(current.value, original);
  error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); render(); assert.equal(current.error, undefined); assert.equal(current.value, original); error = new ApiError("FORBIDDEN", 403); render(); assert.equal(current.value, undefined); assert.equal(current.error.status, 403); error = undefined; render(); assert.equal(current.value.items.length, 0);
});

test("Lifecycle receipt/review contracts do not confuse roots, contact archive state or assigned versus primary authority", () => {
  const s = lifecycleFixture(), scope = { kind: "enquiries", id: s.source.id, operation: "archive" };
  assert.equal(lifecycleContract.recordLifecycleReview(scope, s.source, s.actorId, "agent"), "ready"); assert.equal(lifecycleContract.recordLifecycleReview({ ...scope, kind: "deals" }, s.source, s.actorId, "agent"), "changed");
  assert.equal(lifecycleContract.lifecycleReceiptMatches(s.source.id, 7, { id: s.source.id, version: 8 }), true); assert.equal(lifecycleContract.lifecycleReceiptMatches(s.source.id, 7, { id: randomUUID(), version: 8 }), false);
});

test("Both actual lifecycle facades reject wrong-target or nonadvancing receipts before publishing their result", async () => {
  const origin = "https://crm.synthetic.invalid"; let upstream; const modules = { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async () => upstream }, "@/lib/api/errors": { frenchApiError: code => code }, "@/features/contacts/contracts": contactContracts, "@/features/inventory/outcome-contracts": {}, "./qualification-contracts": {}, "./ownership-contracts": {}, "@/features/owners/contracts": {} };
  for (const kind of ["enquiries", "deals"]) {
    const loaded = loadServer(`src/features/${kind === "enquiries" ? "contacts" : "deals"}/facade.ts`, { modules: { ...modules, "./contracts": kind === "enquiries" ? contactContracts : dealContracts } }), relay = loaded[kind === "enquiries" ? "relayContacts" : "relayDeals"], id = randomUUID();
    for (const operation of ["archive", "restore"]) { const key = `${kind}/${id}/${operation}`, request = extra => new Request(`${origin}/api/v1/${key}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify({ expected_version: 7, reason: "Synthetic facade lifecycle scope", ...extra }) });
      for (const result of [{ id: randomUUID(), version: 8 }, { id, version: 7 }]) { upstream = { status: 200, body: result }; assert.equal((await relay(key, request(), randomUUID())).status, 503); }
      upstream = { status: 200, body: { id, version: 8 } }; assert.equal((await relay(key, request(), randomUUID())).status, 200); assert.equal((await relay(key, request({ release_stock: true }), randomUUID())).status, 422);
    }
  }
});

// Only leaf presentations are substituted; hosts, projection, contracts and
// current-record selection execute from source with real per-component hooks.
function leaves(path) { const ast = ts.createSourceFile(path, readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), modules = {}; for (const declaration of ast.statements) { if (!ts.isImportDeclaration(declaration) || declaration.importClause?.isTypeOnly) continue; const clause = declaration.importClause, exports = {}; if (clause?.name) exports.default = clause.name.text; for (const entry of clause?.namedBindings?.elements ?? []) if (!entry.isTypeOnly) exports[entry.propertyName?.text ?? entry.name.text] = entry.name.text; modules[declaration.moduleSpecifier.text] = exports; } return modules; }
function host(kind, detail = false) {
  const s = lifecycleFixture({ kind }), h = componentHarness(); h.react.useCallback = value => value;
  const record = s.source, summary = kind === "enquiries" ? contactContracts.enquirySummarySchema.parse({ ...Object.fromEntries(Object.entries(record).filter(([key]) => key !== "message")), message_preview: record.message }) : record;
  const query = { value: detail ? record : { items: [summary], total: 1, page: 1, page_size: 20 }, refresh: () => order.push("refresh"), refreshQuietly: () => order.push("quiet") }, order = [], path = `src/features/${kind === "enquiries" ? "contacts/lead" : "deals/deal"}-${detail ? "record" : "list"}.tsx`;
  const filters = { draft: { page_size: 20 }, filters: {}, page: 1, invalid: "", setDraft() {}, setPage() {}, apply() {}, reset() {}, activeCount: 0 }, columns = { visible: ["name"], change() {}, notice: "" }, queryModule = { useQuery: () => query, queryPath: () => `/api/v1/${kind}` };
  const modules = { ...leaves(path), "@/lib/format": { formatInstant: value => value }, react: h.react, "react/jsx-runtime": runtime, "./contracts": kind === "enquiries" ? contactContracts : dealContracts, "@/features/realtime/current-record": loadServer("src/features/realtime/current-record.ts"), "@/features/discovery/use-lifecycle-projection": loadServer("src/features/discovery/use-lifecycle-projection.ts", { modules: { react: h.react } }), "./use-query": queryModule, "@/features/contacts/use-query": queryModule, "./use-directory-filters": { useDirectoryFilters: () => filters }, "@/features/contacts/use-directory-filters": { useDirectoryFilters: () => filters }, "./column-chooser": { ColumnChooser: "Columns", useLeadColumns: () => columns }, "./columns": { DealColumns: "Columns", useDealColumns: () => columns }, "@/hooks/use-phone-layout": { usePhoneLayout: () => false }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/components/shared/directory-view-switch": { DirectoryViewSwitch: "Switch", useDirectoryView: () => ({ value: "list" }) }, "./use-deal-command": { useDealCommand() { const [fresh, setFresh] = h.react.useState(), [error, setError] = h.react.useState(), [notice, setNotice] = h.react.useState(""); return { fresh, setFresh, error, setError, notice, setNotice, busy: false, setBusy() {}, deny: setError, locked: () => false }; } } };
  const loaded = loadServer(path, { modules }), Component = loaded[kind === "enquiries" ? detail ? "LeadRecord" : "LeadList" : detail ? "DealRecord" : "DealList"], props = { id: record.id, role: "agent", actorId: s.actorId };
  const render = () => h.render(() => ({ type: Component, props })); return { h, record, query, order, summary, render };
}

for (const kind of ["enquiries", "deals"]) test(`Actual ${kind} directory holds the selected action/page through row removal and refreshes before clearing selection`, async () => {
  const s = host(kind), table = find(s.render(), "DataTable")[0], action = table.props.selectionAction([s.summary], () => s.order.push("clear")); assert.equal(action.props.actorId, s.record.contact.primary_agent.id);
  action.props.heldChanged(true); s.query.value = { ...s.query.value, items: [], total: 0 }; let current = find(s.render(), "DataTable")[0]; assert.equal(current.props.rows[0].id, s.record.id); assert.equal(current.props.selectionLocked, true);
  s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); assert.equal(find(s.render(), "DataTable").length, 1); await action.props.onChanged({ ...s.record, version: 8 }, new AbortController().signal); assert.deepEqual(s.order, ["quiet", "clear"]); s.query.error = undefined; assert.equal(find(s.render(), "DataTable").length, 0);
  s.query.error = new ApiError("FORBIDDEN", 403); assert.equal(find(s.render(), "DataTable").length, 0); s.h.dispose();
});

for (const kind of ["enquiries", "deals"]) test(`Actual ${kind} detail holds its action during quiet outage and installs verified lifecycle completion`, async () => {
  const s = host(kind, true), initial = s.render(), action = kind === "enquiries" ? find(initial, "RecordLifecycleAction")[0] : find(initial, "DealWorkspace")[0];
  (kind === "enquiries" ? action.props.heldChanged : action.props.lifecycleHeldChanged)(true); s.query.value = undefined; s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); const retained = s.render(); assert.equal(find(retained, kind === "enquiries" ? "RecordLifecycleAction" : "DealWorkspace").length, 1);
  await (kind === "enquiries" ? action.props.onChanged : action.props.lifecycleSaved)({ ...s.record, version: 8, archived_at: "2026-10-29T12:00:00Z" }, new AbortController().signal); (kind === "enquiries" ? action.props.heldChanged : action.props.lifecycleHeldChanged)(false); const completed = s.render();
  assert.equal((kind === "enquiries" ? find(completed, "RecordLifecycleAction")[0].props.version : find(completed, "DealWorkspace")[0].props.deal.version), 8); assert.deepEqual(s.order, ["quiet"]); s.query.error = new ApiError("FORBIDDEN", 403); assert.equal(find(s.render(), kind === "enquiries" ? "RecordLifecycleAction" : "DealWorkspace").length, 0); s.h.dispose();
});
