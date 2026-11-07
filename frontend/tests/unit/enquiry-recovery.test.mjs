import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContracts, ownershipContact } from "./ownership-fixtures.mjs";
import { entryHarness } from "./entry-fixtures.mjs";
import { enquiryFixture, loadEnquiryCommand } from "./enquiry-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
class ApiError extends Error { constructor(code, status, details) { super(code); Object.assign(this, { code, status, details }); } }
const body = enquiry => ({ expected_version: enquiry.version, message: enquiry.message, status: "qualified", initial_budget: enquiry.initial_budget ?? "1000000", campaign_source: enquiry.campaign_source, rating: enquiry.rating });
function fixture({ enquiry = enquiryFixture(), command, saved, proof, hydrated = true } = {}) {
  const h = entryHarness(), calls = [], saves = [], denials = []; let dispatch = true;
  const hook = loadEnquiryCommand(h, { ApiError, hydrated, proof, dispatch: () => dispatch, command: async (...args) => { calls.push(args); return command ? command(...args) : { ...enquiry, version: enquiry.version + 1 }; } });
  const options = { id: enquiry.id, contactId: enquiry.contact.id, saved: saved ?? (async (...args) => saves.push(args)), denied: (...args) => denials.push(args) };
  return { h, enquiry, calls, saves, denials, dispatch: value => { dispatch = value; }, render: () => h.render(() => hook.useEnquiryCommand(options)) };
}
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type || typeof type === "function" && type(node) ? [node] : []), ...Object.values(node.props ?? {}).flatMap(child => find(child, type))]; }

test("Enquiry edits synchronously own a cloned strict payload and require a new explicit review after completion", async () => {
  let release; const s = fixture({ command: () => new Promise(resolve => { release = resolve; }) }), draft = body(s.enquiry), old = s.render();
  const first = old.submit(draft); await old.submit(draft); assert.equal(s.calls.length, 1); draft.message = "Must not alter the snapshot"; assert.equal(s.calls[0][1].message, s.enquiry.message);
  release({ ...s.enquiry, version: 8 }); await first; await old.submit(draft); assert.equal(s.calls.length, 1); assert.equal(s.render().complete, true);
  assert.equal(s.render().begin(), true); await s.render().submit({ ...body(s.enquiry), actor_id: randomUUID() }); assert.equal(s.calls.length, 1); assert.equal(s.render().error.status, 422);
});

test("Unknown enquiry saves retain the opening values/version/key and exclude new reviews, replacement bodies and refresh", async () => {
  let fail = true; const s = fixture({ command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return s.enquiry; } });
  await s.render().submit(body(s.enquiry)); const current = s.render(); assert.equal(current.uncertain, true); assert.equal(current.begin(), false); await current.submit({ ...body(s.enquiry), message: "replacement" }); await current.refresh(async () => assert.fail()); assert.equal(s.calls.length, 1);
  fail = false; await current.retry(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[1][1]), body(s.enquiry)); assert.equal(s.calls[1][4], "PATCH"); assert.equal(s.saves.length, 1);
});

test("A failed preflight permits correction but cannot erase an already unknown dispatch", async () => {
  const s = fixture({ command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  s.dispatch(false); await s.render().submit(body(s.enquiry)); assert.equal(s.render().uncertain, false); assert.equal(s.render().canEdit(), true);
  s.dispatch(true); await s.render().submit(body(s.enquiry)); s.dispatch(false); await s.render().retry(); assert.equal(s.render().uncertain, true); assert.equal(s.calls[1][3], s.calls[2][3]);
});

test("A saved enquiry result is completed without another PATCH and denial retains only its acknowledgement flag", async () => {
  let completions = 0; const s = fixture({ saved: async (value, signal) => { assert.equal(value.id, s.enquiry.id); assert.equal(signal.aborted, false); if (++completions === 1) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await s.render().submit(body(s.enquiry)); assert.equal(s.render().acknowledged, true); await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(completions, 2);
  const denied = fixture({ saved: async () => { throw new ApiError("FORBIDDEN", 403); } }); await denied.render().submit(body(denied.enquiry)); assert.equal(denied.render().accessError.status, 403); assert.equal(denied.denials[0][1], true); assert.equal(denied.render().begin(), false);
});

test("Known conflicts require an explicit rebase; foreign results never reach a saved callback", async () => {
  const s = fixture({ command: async () => { throw new ApiError("VERSION_CONFLICT", 409); } }); await s.render().submit(body(s.enquiry)); const stale = s.render(); await stale.submit(body(s.enquiry)); assert.equal(s.calls.length, 1); assert.equal(stale.needsReview, true); assert.equal(stale.begin(), true); await s.render().submit({ ...body(s.enquiry), expected_version: 9 }); assert.equal(s.calls.length, 2); assert.notEqual(s.calls[0][3], s.calls[1][3]);
  for (const patch of [{ id: randomUUID() }, { contact: enquiryFixture().contact }]) { const foreign = fixture({ command: async () => ({ ...foreign.enquiry, ...patch }) }); await foreign.render().submit(body(foreign.enquiry)); assert.equal(foreign.render().error.code, "INVALID_RESPONSE"); assert.equal(foreign.render().uncertain, true); assert.equal(foreign.saves.length, 0); }
});

test("Fresh enquiry proof binds actor/role/password and disposal aborts stale writes and callbacks", async () => {
  const actor = randomUUID(); let identity = { user: { id: actor, role: "agent" }, must_change_password: false };
  const s = fixture({ proof: async () => identity, command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); await s.render().submit(body(s.enquiry)); identity = { ...identity, user: { id: randomUUID(), role: "agent" } }; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.render().accessError.status, 403);
  for (const user of [{ id: actor, role: "manager" }, { id: actor, role: "agent" }]) { const fresh = fixture({ proof: async () => ({ user, must_change_password: true }) }); await fresh.render().submit(body(fresh.enquiry)); assert.equal(fresh.calls.length, 0); assert.equal(fresh.render().accessError.code, "PASSWORD_CHANGE_REQUIRED"); }
  let release; const disposed = fixture({ command: () => new Promise(resolve => { release = resolve; }) }), old = disposed.render(), pending = old.submit(body(disposed.enquiry)); await delay(0); disposed.h.dispose(); assert.equal(disposed.calls[0][6].aborted, true); release(disposed.enquiry); await pending; await old.submit(body(disposed.enquiry)); await old.retry(); await old.refresh(async () => assert.fail()); assert.equal(disposed.saves.length, 0); assert.equal(disposed.h.lateUpdates(), 0);
  const cold = fixture({ hydrated: false }); await cold.render().submit(body(cold.enquiry)); assert.equal(cold.calls.length, 0);
});

test("The shared API command exposes proof-before-dispatch and preserves old callers, exact metadata and cancellation", async () => {
  const calls = [], order = [], identity = { user: { id: randomUUID(), role: "agent" }, must_change_password: false, csrf_token: "synthetic-csrf" }, id = randomUUID(), value = { synthetic: true }, schema = {};
  const loaded = loadServer("src/lib/api/command.ts", { modules: { "./client": { apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/me") ? identity : value; } }, "@/lib/auth/contracts": { meSchema: {} } } });
  const signal = new AbortController().signal, path = `/api/v1/enquiries/${id}`, key = randomUUID();
  assert.equal(await loaded.apiCommand(path, value, schema, key, "PATCH", 1234, signal, { beforeDispatch: proof => { assert.equal(proof, identity); order.push("proof"); }, dispatched: () => order.push("dispatch") }), value);
  assert.deepEqual(order, ["proof", "dispatch"]); assert.deepEqual(plain(calls[1][3]), { body: value, csrf: identity.csrf_token, key, method: "PATCH", timeoutMs: 1234 }); assert.equal(calls[1][2], signal);
  await loaded.apiCommand(path, value, schema, key); assert.equal(calls[3][3].method, "POST");
  await assert.rejects(() => loaded.apiCommand(path, value, schema, key, "PATCH", undefined, signal, { beforeDispatch: () => { throw new ApiError("FORBIDDEN", 403); } }), error => error.status === 403); assert.equal(calls.filter(([path]) => !path.endsWith("/me")).length, 2);
  const aborted = new AbortController(); aborted.abort(); await assert.rejects(() => loaded.apiCommand(path, value, schema, key, "PATCH", undefined, aborted.signal, { dispatched: () => assert.fail() }));
});

const ui = h => ({ react: h.react, "react/jsx-runtime": runtime, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "Menu" }, "@/components/shared/dossier-form": { useDossierDraft: () => ({ dirty: false, accept() {} }) }, "./contracts": contactContracts, "./record-states": { RecordError: "Error" } });
function statusFixture({ command, changed } = {}) {
  const h = entryHarness(), enquiry = enquiryFixture({ initial_budget: null }), calls = []; let closes = 0;
  const hook = loadEnquiryCommand(h, { ApiError, command: async (...args) => { calls.push(args); return command ? command(enquiry, ...args) : { ...enquiry, initial_budget: args[1].initial_budget, version: 8 }; } });
  const loaded = loadServer("src/features/contacts/lead-status-menu.tsx", { modules: { ...ui(h), "./use-enquiry-command": hook }, globals: { structuredClone } }), props = { enquiry, writable: true, changed: changed ?? (() => {}), closed: () => closes++ };
  return { h, enquiry, calls, props, closes: () => closes, render: () => h.render(() => loaded.LeadStatusMenu(props)) };
}

test("The status review freezes its initial status/budget, blocks dismissal/Escape and survives newer readonly props", async () => {
  let fail = true; const s = statusFixture({ command: async (enquiry, path, body) => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...enquiry, initial_budget: body.initial_budget }; } });
  const oldChoose = find(s.render(), "Menu")[0].props.choose; oldChoose("qualified"); oldChoose("lost"); find(s.render(), "Input")[0].props.onChange({ target: { value: "1000000" } }); find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  s.props.enquiry = { ...s.enquiry, status: "converted", version: 99, message: "Later message" }; s.props.writable = false; find(s.render(), "Input")[0].props.onChange({ target: { value: "2000000" } }); assert.equal(find(s.render(), "Input")[0].props.value, "1000000");
  find(s.render(), "AlertDialog")[0].props.onOpenChange(false); let escape = false; find(s.render(), "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { escape = true; } }); assert.equal(escape, true); assert.equal(find(s.render(), "AlertDialog")[0].props.open, true); assert.equal(find(s.render(), "Button").find(node => node.props.action === "cancel").props.disabled, true);
  fail = false; find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(s.calls[1][3], s.calls[0][3]); assert.equal(s.calls[1][1].status, "qualified"); assert.equal(s.calls[1][1].initial_budget, "1000000"); assert.equal(s.calls[1][1].expected_version, 7); assert.equal(s.calls[1][1].message, s.enquiry.message);
});

test("A status completion failure retries the saved result, and an owned conflict refresh can close its own review", async () => {
  let fails = true; const s = statusFixture({ changed: async () => { if (fails) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); find(s.render(), "Menu")[0].props.choose("qualified"); find(s.render(), "Input")[0].props.onChange({ target: { value: "1000000" } }); find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(find(s.render(), "AlertDialog")[0].props.open, true); fails = false; find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.closes(), 1);
  let reloaded = 0; const conflict = statusFixture({ command: async enquiry => { throw new ApiError("VERSION_CONFLICT", 409, { current: { ...enquiry, version: 9, initial_budget: "1000000" } }); }, changed: value => { if (!value) reloaded++; } }); find(conflict.render(), "Menu")[0].props.choose("qualified"); find(conflict.render(), "Input")[0].props.onChange({ target: { value: "1000000" } }); find(conflict.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(find(conflict.render(), "Button").find(node => node.props.action === "confirm").props.disabled, true); find(conflict.render(), "Button").find(node => node.props.action === "refresh").props.onClick(); await delay(0); assert.equal(reloaded, 1); assert.equal(conflict.closes(), 1); assert.equal(find(conflict.render(), "AlertDialog")[0].props.open, false);
});

test("Inline prospect recovery freezes its fields and cancel path while the shared form keeps a usable retry action", async () => {
  const h = entryHarness(), enquiry = enquiryFixture(), calls = []; let cancelled = 0;
  const hook = loadEnquiryCommand(h, { ApiError, command: async (...args) => { calls.push(args); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  const loaded = loadServer("src/features/contacts/lead-inline-field.tsx", { modules: { ...ui(h), "./use-enquiry-command": hook, "@/components/shared/inline-record-field": { InlineFieldForm: "InlineForm", InlineRecordField: "Field" }, "./qualification-contracts": { campaignLabels: {}, ratingLabels: {} }, "./qualification-inputs": { BudgetInput: "Budget" }, "./use-query": {} } });
  const props = { enquiry, field: "message", label: "Description", metadata: {}, controls: { saved() {}, cancel: () => cancelled++ }, saved() {}, denied() {} }, render = () => h.render(() => loaded.LeadFieldEditor(props));
  find(render(), "Textarea")[0].props.onChange({ target: { value: "Original edited note" } }); find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); find(render(), "Textarea")[0].props.onChange({ target: { value: "Replacement" } }); find(render(), "InlineForm")[0].props.cancel(); assert.equal(cancelled, 0); assert.equal(find(render(), "Textarea")[0].props.value, "Original edited note"); assert.equal(find(render(), "InlineForm")[0].props.recovering, true);
  props.unavailable = true; find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls.length, 2); assert.equal(calls[1][3], calls[0][3]); assert.deepEqual(plain(calls[1][1]), plain(calls[0][1]));
  const shared = loadServer("src/components/shared/inline-record-field.tsx", { modules: { ...ui(entryHarness()), react: { ...entryHarness().react, createContext: () => ({}), useContext: () => ({}) }, "@/components/icons": {}, "./unsaved-guard": {} } });
  const view = shared.InlineFieldForm({ label: "Description", recovering: true, dirty: true, busy: false, cancel: () => cancelled++, submit() {}, children: "field" }); assert.equal(find(view, "fieldset")[0].props.disabled, true); assert.equal(find(view, "Button").find(node => node.props.action === "confirm").props.disabled, false); assert.equal(find(view, "Button").find(node => node.props.action === "cancel").props.disabled, true); let escaped = false; find(view, "form")[0].props.onKeyDown({ key: "Escape", preventDefault() { escaped = true; } }); assert.equal(escaped, false);
});

test("Inline metadata loading/failure retains its editor owner while current denial removes it", () => {
  const h = entryHarness(), enquiry = enquiryFixture(), metadata = { campaign_sources: [] }, failures = []; let value = metadata, failure;
  const loaded = loadServer("src/features/contacts/lead-inline-field.tsx", { modules: { ...ui(h), "./use-enquiry-command": {}, "@/components/shared/inline-record-field": { InlineFieldForm: "InlineForm", InlineRecordField: "Field" }, "./qualification-contracts": {}, "./qualification-inputs": {}, "./use-query": { useQuery: () => ({ value, error: failure, refresh() {} }) } } });
  const field = loaded.LeadInlineField({ enquiry, field: "message", label: "Description", writable: true, saved() {}, denied: error => failures.push(error) }), component = field.props.editor({ cancel() {}, saved() {} }), render = () => h.render(() => component.type(component.props));
  const first = find(render(), node => node.type?.name === "LeadFieldEditor")[0]; value = undefined; failure = new ApiError("DEPENDENCY_UNAVAILABLE", 503); const retained = find(render(), node => node.type?.name === "LeadFieldEditor")[0]; assert.equal(retained.key, first.key); assert.equal(retained.props.metadata, metadata); assert.equal(retained.props.unavailable, true);
  failure = new ApiError("FORBIDDEN", 403); assert.equal(find(render(), node => node.type?.name === "LeadFieldEditor").length, 0); assert.equal(failures[0].status, 403);
});

test("The board retains status/conversion reviews across reads/outages, communicates current conversion availability and removes on denial", () => {
  for (const target of ["qualified", "converted"]) {
  const parent = entryHarness(), child = entryHarness(); let active = parent, current = enquiryFixture(), failure; const opened = current, failures = [];
  const proxy = Object.fromEntries(Object.keys(parent.react).map(name => [name, (...args) => active.react[name](...args)]));
  const loaded = loadServer("src/features/contacts/lead-kanban.tsx", { modules: { ...ui(parent), react: { ...proxy, useCallback: value => value }, "next/link": { default: "Link" }, "@/components/shared/paged-kanban": { PagedKanban: "Board" }, "@/components/shared/kanban-record-card": { KanbanRecordCard: "Card" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/features/activities/activity-form": { ActivityForm: "Activity" }, "@/features/deals/convert-lead": { ConvertLead: "Convert" }, "./qualification-contracts": { ratingLabels: {} }, "./use-query": { useQuery: () => ({ value: current, error: failure, refresh() {} }) }, "./lead-status-menu": { LeadStatusMenu: "Status" } } });
  const props = { filters: {}, changed() {}, denied: error => failures.push(error), returnFocus: { current: null } }, renderParent = () => { active = parent; return parent.render(() => loaded.LeadKanban(props)); };
  find(renderParent(), "Board")[0].props.move(current, target); const moving = find(renderParent(), node => node.type?.name === "LeadBoardMove")[0], render = () => { active = child; return child.render(() => moving.type(moving.props)); };
  assert.equal(render().props.enquiry, opened); current = { ...opened, version: 42, status: target }; assert.equal(render().props.enquiry, target === "converted" ? current : opened); current = undefined; failure = new ApiError("DEPENDENCY_UNAVAILABLE", 503); assert.equal(render().type, target === "converted" ? "Convert" : "Status"); if (target === "converted") { assert.equal(render().props.unavailable, true); assert.equal(typeof render().props.denied, "function"); } failure = new ApiError("FORBIDDEN", 403); assert.equal(find(render(), target === "converted" ? "Convert" : "Status").length, 0); assert.equal(failures[0].status, 403);
  }
});

test("The contact facade rejects foreign enquiry reads, PATCH receipts and conflict snapshots while retaining canonical contact reads", async () => {
  const enquiry = enquiryFixture(), foreign = enquiryFixture(), origin = "https://synthetic.invalid", owners = loadServer("src/features/owners/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } }); let upstream = { status: 200, body: foreign };
  const loaded = loadServer("src/features/contacts/facade.ts", { modules: { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async () => upstream }, "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": contactContracts, "./ownership-contracts": ownershipContracts, "./qualification-contracts": {}, "@/features/owners/contracts": owners } });
  const relay = (method = "GET") => loaded.relayContacts(`enquiries/${enquiry.id}`, new Request(`${origin}/api/v1/enquiries/${enquiry.id}`, method === "GET" ? {} : { method, headers: { Origin: origin, "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, body: JSON.stringify(body(enquiry)) }), "synthetic-request");
  assert.equal((await relay()).status, 503); assert.equal((await relay("PATCH")).status, 503); upstream = { status: 409, body: { error: { code: "VERSION_CONFLICT" }, current: foreign } }; assert.equal((await relay("PATCH")).status, 503); upstream = { status: 200, body: enquiry }; assert.equal((await relay("PATCH")).status, 200);
  const canonical = ownershipContact(); upstream = { status: 200, body: canonical }; assert.equal((await loaded.relayContacts(`contacts/${randomUUID()}`, new Request(`${origin}/api/v1/contacts/${randomUUID()}`), "synthetic-request")).status, 200);
});
