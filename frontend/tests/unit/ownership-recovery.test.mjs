import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContracts, ownershipContact, ownershipPreview, ownershipReceipt, loadOwnershipCommand } from "./ownership-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
function hooks() {
  const slots = [], effects = []; let cursor = 0, disposed = false, late = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], value => { if (disposed) late++; slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useId: () => "synthetic-ownership",
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const value = run(); effects.splice(0).forEach(effect => effect()); return value; }, dispose() { slots.forEach(slot => slot?.cleanup?.()); disposed = true; }, lateUpdates: () => late };
}
function fixture({ contact = ownershipContact(), role = "manager", request, read, completed, identity, hydrated = true } = {}) {
  const h = hooks(), calls = [], saved = [], denied = [];
  let dispatch = true;
  const loaded = loadOwnershipCommand(h, { ApiError, hydrated, read, identity, request: async (...args) => {
    calls.push(args); if (dispatch) args[7]?.();
    return request ? request(...args) : args[1] === "preview" ? ownershipPreview(contact, args[2]) : ownershipReceipt(contact, args[1]);
  } });
  const options = { sourceId: contact.id, role, completed: completed ?? (async (...args) => { saved.push(args); }), denied: (...args) => denied.push(args) };
  return { h, contact, calls, saved, denied, dispatch: value => { dispatch = value; }, render: () => h.render(() => loaded.useOwnershipCommand(options)) };
}
const intent = (contact, operation = "archive", extra = {}) => ownershipContracts.intentSchema.parse({ operation, expected_version: contact.version, reason: "Synthetic reviewed reason", ...extra });

test("Ownership preview/result coherence binds every operation, version, exact target and resulting responsible agent", () => {
  const contact = ownershipContact(), survivor = ownershipContact(), agent = randomUUID();
  for (const change of [intent(contact), intent(contact, "restore"), intent(contact, "assign", { primary_agent_id: agent }), intent(contact, "collaborators", { collaborator_ids: [agent] }), intent(contact, "merge", { survivor_id: survivor.id, survivor_expected_version: survivor.version })]) {
    const preview = ownershipPreview(contact, change, change.operation === "merge" ? survivor : undefined);
    assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, preview), true);
    assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, { ...preview, impact: { ...preview.impact, contacts: [...preview.impact.contacts].reverse() } }), true);
    assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, { ...preview, impact: { ...preview.impact, primary_agent_after: { id: randomUUID(), display_name: "Foreign" } } }), false);
    assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, { ...preview, impact: { ...preview.impact, contacts: preview.impact.contacts.map(row => ({ ...row, version: row.version + 1 })) } }), false);
    const result = ownershipReceipt(contact, change.operation, change.operation === "merge" ? survivor.id : contact.id);
    assert.equal(ownershipContracts.ownershipResultMatches({ sourceId: contact.id, intent: change }, result), true);
    assert.equal(ownershipContracts.ownershipResultMatches({ sourceId: contact.id, intent: change }, { ...result, contact_id: randomUUID() }), false);
    assert.equal(ownershipContracts.ownershipResultMatches({ sourceId: contact.id, intent: change }, { ...result, operation: "notes" }), false);
  }
  const change = intent(contact), preview = ownershipPreview(contact, change);
  assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, { ...preview, impact: { ...preview.impact, contacts: [contact, contact] } }), false);
  assert.equal(ownershipContracts.ownershipPreviewMatches(contact.id, change, { ...preview, impact: { ...preview.impact, contacts: [survivor] } }), false);
});

test("Merge impact labels follow source/survivor IDs even when the response contacts are reversed", () => {
  const contact = ownershipContact({ name: "Synthetic source" }), survivor = ownershipContact({ name: "Synthetic kept" }), change = intent(contact, "merge", { survivor_id: survivor.id, survivor_expected_version: survivor.version });
  const loaded = loadServer("src/features/contacts/ownership-impact.tsx", { modules: { "react/jsx-runtime": runtime } });
  const preview = ownershipPreview(contact, change, survivor); preview.impact.contacts.reverse();
  const view = loaded.OwnershipImpact({ preview, intent: change });
  const sections = view.props.children[0];
  const text = node => node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join("") : typeof node === "object" ? text(node.props?.children) : String(node);
  assert.ok(text(sections[0]).startsWith("Fiche conservée : Synthetic kept"));
  assert.ok(text(sections[1]).startsWith("Source fusionnée : Synthetic source"));
});

test("Preview is synchronously single-owned, immutable and unavailable for editing until explicitly dismissed", async () => {
  let release; const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => new Promise(resolve => { release = () => resolve(ownershipPreview(contact, body)); }) });
  const change = intent(contact), first = s.render().prepare(change); await s.render().prepare(change); assert.equal(s.calls.length, 1); change.reason = "Must not replace snapshot";
  release(); await first; let current = s.render(); assert.equal(current.prepared.intent.reason, "Synthetic reviewed reason"); assert.equal(current.canEdit(), false); assert.equal(current.dismiss(), true); current = s.render(); assert.equal(current.prepared, undefined); assert.equal(current.canEdit(), true);
});

test("Unknown ownership writes keep the original proof/body/key and refuse dismissal, refresh or replacement previews", async () => {
  let fail = true; const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => { if (action === "preview") return ownershipPreview(contact, body); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return ownershipReceipt(contact, action); } });
  await s.render().prepare(intent(contact)); const old = s.render(); await old.confirm(); let current = s.render(); assert.equal(current.uncertain, true); assert.equal(current.dismiss(), false); await current.refresh(); await current.prepare(intent(contact, "restore")); assert.equal(s.calls.length, 2);
  fail = false; await current.confirm(); assert.equal(s.calls.length, 3); assert.equal(s.calls[1][4], s.calls[2][4]); assert.deepEqual(plain(s.calls[1][2]), plain(s.calls[2][2])); assert.equal(s.saved.length, 1); assert.equal(s.render().prepared, undefined); await old.confirm(); assert.equal(s.calls.length, 3);
});

test("A failed confirm preflight is editable after dismissal; a later preflight failure preserves an earlier unknown outcome", async () => {
  const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => { if (action === "preview") return ownershipPreview(contact, body); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await s.render().prepare(intent(contact)); s.dispatch(false); await s.render().confirm(); assert.equal(s.render().uncertain, false); assert.equal(s.render().dismiss(), true);
  await s.render().prepare(intent(contact)); s.dispatch(true); await s.render().confirm(); assert.equal(s.render().uncertain, true); const key = s.calls.at(-1)[4]; s.dispatch(false); await s.render().confirm(); assert.equal(s.render().uncertain, true); assert.equal(s.calls.at(-1)[4], key);
});

test("Acknowledged completion retries its saved result without another contact mutation", async () => {
  let completions = 0; const s = fixture({ completed: async () => { if (++completions === 1) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await s.render().prepare(intent(s.contact)); await s.render().confirm(); let current = s.render(); assert.equal(current.uncertain, true); assert.equal(current.acknowledged, true); assert.equal(await current.confirm(), true); assert.equal(s.calls.length, 2); assert.equal(completions, 2);
});

test("Known conflicts require a new reviewed impact before a stale confirmation can dispatch again", async () => {
  const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => { if (action === "preview") return ownershipPreview(contact, body); throw new ApiError("IMPACT_CHANGED", 409); } });
  await s.render().prepare(intent(contact)); const old = s.render(); await old.confirm(); await old.confirm(); assert.equal(s.calls.length, 2); assert.equal(s.render().needsReview, true); assert.equal(s.render().dismiss(), true); await s.render().prepare(intent(contact)); assert.equal(s.calls.length, 3);
});

test("Foreign previews and acknowledgements never publish unrelated contacts or complete the reviewed operation", async () => {
  let foreignPreview = true, foreignResult = true; const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => action === "preview" ? ownershipPreview(foreignPreview ? ownershipContact() : contact, body) : ownershipReceipt(contact, action, foreignResult ? randomUUID() : contact.id) });
  await s.render().prepare(intent(contact)); assert.equal(s.render().prepared, undefined); assert.equal(s.render().error.code, "INVALID_RESPONSE"); foreignPreview = false;
  await s.render().prepare(intent(contact)); await s.render().confirm(); assert.equal(s.saved.length, 0); assert.equal(s.render().uncertain, true); foreignResult = false; await s.render().confirm(); assert.equal(s.saved.length, 1);
});

test("Refresh retains exact intent IDs and exposes only an explicit canonical link instead of retargeting a merge", async () => {
  const contact = ownershipContact(), survivor = ownershipContact(), canonical = ownershipContact();
  const s = fixture({ contact, read: async path => path.includes(contact.id) ? contact : canonical });
  const current = s.render(), result = await current.refresh(survivor.id); assert.equal(result, undefined); assert.equal(s.render().error.code, "CONTACT_MERGED"); assert.deepEqual(plain(s.render().aliases), [canonical.id]); assert.equal(s.calls.length, 0);
});

test("Authority loss masks prepared data and preserves whether the operation had already been acknowledged", async () => {
  for (const acknowledged of [false, true]) {
    const contact = ownershipContact(), s = fixture({ contact, completed: async () => { throw new ApiError("FORBIDDEN", 403); }, request: async (id, action, body) => { if (action === "preview") return ownershipPreview(contact, body); if (!acknowledged) throw new ApiError("FORBIDDEN", 403); return ownershipReceipt(contact, action); } });
    await s.render().prepare(intent(contact)); await s.render().confirm(); const current = s.render(); assert.equal(current.accessError.status, 403); assert.equal(current.prepared, undefined); assert.equal(current.acknowledged, acknowledged); assert.equal(s.denied[0][1], acknowledged); await current.confirm(); assert.equal(s.calls.length, 2);
  }
  let refuse = false; const contact = ownershipContact(), later = fixture({ contact, request: async (id, action, body) => { if (refuse) throw new ApiError("FORBIDDEN", 403); return action === "preview" ? ownershipPreview(contact, body) : ownershipReceipt(contact, action); } });
  await later.render().prepare(intent(contact)); await later.render().confirm(); refuse = true; await later.render().prepare(intent(contact)); assert.equal(later.render().acknowledged, false); assert.equal(later.denied[0][1], false);
});

test("Disposed ownership operations abort transport and reject late completion, reads and stale handlers", async () => {
  let release; const contact = ownershipContact(), s = fixture({ contact, request: async (id, action, body) => action === "preview" ? ownershipPreview(contact, body) : new Promise(resolve => { release = () => resolve(ownershipReceipt(contact, action)); }) });
  await s.render().prepare(intent(contact)); const old = s.render(), pending = old.confirm(); s.h.dispose(); assert.equal(s.calls.at(-1)[6].aborted, true); release(); await pending; await old.confirm(); await old.prepare(intent(contact)); await old.refresh(); assert.equal(s.saved.length, 0); assert.equal(s.calls.length, 2); assert.equal(s.h.lateUpdates(), 0);
});

test("Hydration and Agent operation boundaries prevent preview writes before current authority is checked", async () => {
  const cold = fixture({ hydrated: false }); await cold.render().prepare(intent(cold.contact)); assert.equal(cold.calls.length, 0);
  const agent = fixture({ role: "agent" }); await agent.render().prepare(intent(agent.contact)); assert.equal(agent.calls.length, 0);
});

test("Ownership transport binds fresh actor/role/password authority and reuses the exact confirmation proof and key", async () => {
  const actor = randomUUID(), contact = ownershipContact(), calls = [], savedEvents = [];
  let me = { user: { id: actor, role: "manager" }, csrf_token: "synthetic-csrf", must_change_password: false };
  const loaded = loadServer("src/features/contacts/ownership-client.ts", { modules: {
    "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0] === "/api/v1/auth/me" ? me : ownershipReceipt(contact, "collaborators"); } },
    "@/lib/auth/contracts": { meSchema: {} },
  }, globals: { window: { dispatchEvent: event => savedEvents.push(event.type) }, Event } });
  const binding = { role: "manager" }, controller = new AbortController(), key = randomUUID(), body = { ...intent(contact, "collaborators", { collaborator_ids: [] }), preview_token: "b".repeat(64) };
  let dispatched = 0;
  await loaded.ownershipRequest(contact.id, "collaborators", body, {}, key, binding, controller.signal, () => dispatched++);
  assert.equal(binding.actorId, actor); assert.equal(dispatched, 1); assert.equal(calls.length, 2);
  assert.equal(calls[1][0], `/api/v1/contacts/${contact.id}/collaborators`); assert.equal(calls[1][2], controller.signal);
  assert.deepEqual(plain(calls[1][3]), { body, csrf: "synthetic-csrf", key, method: "PUT" }); assert.deepEqual(savedEvents, ["kay:command-saved"]);
  for (const next of [{ ...me, user: { id: randomUUID(), role: "manager" } }, { ...me, user: { id: actor, role: "administrator" } }, { ...me, must_change_password: true }]) {
    me = next; await assert.rejects(() => loaded.ownershipRequest(contact.id, "collaborators", body, {}, key, binding, controller.signal, () => dispatched++), error => error.status === 403);
  }
  assert.equal(dispatched, 1); assert.equal(calls.filter(([path]) => !path.endsWith("/me")).length, 1);
  me = { ...me, user: { id: actor, role: "manager" }, must_change_password: false }; controller.abort();
  await assert.rejects(() => loaded.ownershipRequest(contact.id, "archive", body, {}, key, binding, controller.signal, () => dispatched++)); assert.equal(dispatched, 1);
});

test("Agent transport permits only merge and previews never broadcast a saved mutation", async () => {
  const contact = ownershipContact(), actor = randomUUID(), calls = [], events = [];
  const loaded = loadServer("src/features/contacts/ownership-client.ts", { modules: {
    "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/me") ? { user: { id: actor, role: "agent" }, csrf_token: "synthetic-csrf", must_change_password: false } : {}; } }, "@/lib/auth/contracts": { meSchema: {} },
  }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const binding = { role: "agent" }, signal = new AbortController().signal, change = intent(contact, "merge", { survivor_id: randomUUID(), survivor_expected_version: 3 });
  await loaded.ownershipRequest(contact.id, "preview", change, {}, randomUUID(), binding, signal);
  assert.equal(calls[1][3].method, "POST"); assert.deepEqual(events, []);
  await assert.rejects(() => loaded.ownershipRequest(contact.id, "archive", intent(contact), {}, randomUUID(), binding, signal), error => error.status === 403);
  assert.equal(calls.filter(([path]) => !path.endsWith("/me")).length, 1);
});

test("Ownership facade rejects foreign or incoherent impacts/receipts but preserves reversed merge order and canonical reads", async () => {
  const contact = ownershipContact(), survivor = ownershipContact(), change = intent(contact, "merge", { survivor_id: survivor.id, survivor_expected_version: survivor.version });
  const owners = loadServer("src/features/owners/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } });
  const origin = "https://synthetic.invalid", preview = ownershipPreview(contact, change, survivor); let body = preview;
  const loaded = loadServer("src/features/contacts/facade.ts", { modules: {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-session" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async () => ({ status: 200, body }) }, "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": contactContracts, "./ownership-contracts": ownershipContracts, "./qualification-contracts": {}, "@/features/owners/contracts": owners,
  } });
  const relay = (action, value) => loaded.relayContacts(`contacts/${contact.id}${action ? `/${action}` : ""}`, new Request(`${origin}/api/v1/contacts/${contact.id}${action ? `/${action}` : ""}`, action ? { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, body: JSON.stringify(value) } : {}), "synthetic-request");
  for (const contacts of [[contact, ownershipContact()], [contact, contact], [{ ...contact, version: contact.version + 1 }, survivor]]) {
    body = { ...preview, impact: { ...preview.impact, contacts } }; const result = await relay("preview", change); assert.equal(result.status, 503); assert.equal(JSON.stringify(await result.json()).includes(contact.name), false);
  }
  body = { ...preview, impact: { ...preview.impact, primary_agent_after: { id: randomUUID(), display_name: "Foreign responsible agent" } } }; assert.equal((await relay("preview", change)).status, 503);
  body = { ...preview, impact: { ...preview.impact, contacts: [...preview.impact.contacts].reverse() } }; assert.equal((await relay("preview", change)).status, 200);
  const receipt = ownershipReceipt(contact, "merge", survivor.id), confirmation = { ...change, preview_token: preview.preview_token };
  for (const invalid of [{ ...receipt, contact_id: contact.id }, { ...receipt, operation: "archive" }]) { body = invalid; assert.equal((await relay("merge", confirmation)).status, 503); }
  body = receipt; assert.equal((await relay("merge", confirmation)).status, 200);
  body = survivor; assert.equal((await relay()).status, 200);
});

function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...Object.values(node.props ?? {}).flatMap(value => find(value, type))]; }
const uiModules = { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/components/shared/dossier-form": { useDossierDraft: () => ({ dirty: false, accept() {} }) }, "@/lib/api/client": { ApiError }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./contracts": contactContracts, "./agent-picker": { AgentPicker: "AgentPicker" }, "./contact-selector": { ContactSelector: "Chooser" }, "./ownership-contracts": ownershipContracts, "./ownership-impact": { OwnershipImpact: "Impact" }, "./record-states": { RecordError: "Error" } };

test("The real ownership dialog protects its reviewed fields, cancel and Escape throughout unknown and acknowledged recovery", async () => {
  const contact = ownershipContact(), h = hooks(), calls = []; let fail = true, completionFail = true;
  const command = loadOwnershipCommand(h, { ApiError, request: async (...args) => { calls.push(args); args[7]?.(); if (args[1] === "preview") return ownershipPreview(contact, args[2]); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return ownershipReceipt(contact, args[1]); } });
  const controls = loadServer("src/features/contacts/ownership-controls.tsx", { modules: { ...uiModules, react: h.react, "./use-ownership-command": command } });
  const props = { contact, role: "manager", embedded: true, changed: async () => { if (completionFail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } };
  const render = () => h.render(() => { const root = controls.OwnershipControls(props); return root.type(root.props); });
  assert.equal(controls.OwnershipControls(props).key, `${contact.id}:manager`);
  find(render(), "Select")[0].props.onChange({ target: { value: "archive" } }); find(render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic reviewed reason" } });
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(find(render(), "fieldset")[0].props.disabled, true); find(render(), "Textarea")[0].props.onChange({ target: { value: "Must not replace the review" } });
  assert.equal(find(render(), "Textarea")[0].props.value, "Synthetic reviewed reason");
  find(render(), "Button").find(node => node.props.action === "archive").props.onClick(); await delay(0);
  let view = render(), escaped = false; find(view, "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { escaped = true; } }); assert.equal(escaped, true);
  assert.equal(find(view, "Button").find(node => node.props.action === "back").props.disabled, true); find(view, "AlertDialog")[0].props.onOpenChange(false); assert.equal(find(render(), "AlertDialog")[0].props.open, true);
  const first = calls[1]; fail = false; find(render(), "Button").find(node => node.props.action === "archive").props.onClick(); await delay(0);
  assert.equal(find(render(), "Button").find(node => node.props.action === "archive").props.children, "Actualiser le résultat");
  assert.equal(calls[2][4], first[4]); assert.deepEqual(plain(calls[2][2]), plain(first[2]));
  completionFail = false; find(render(), "Button").find(node => node.props.action === "archive").props.onClick(); await delay(0);
  assert.equal(calls.length, 3); assert.equal(find(render(), "AlertDialog")[0].props.open, false);
});

const recordModules = { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/shared/page-header": { PageHeader: "Header" }, "@/components/shared/crm-presentation": { CrmRecordHeader: "RecordHeader", CrmStatusBadge: "Badge" }, "@/components/shared/record-workspace": { RecordSection: "Section", RecordWorkspace: "Workspace" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/inline-record-field": { InlineEditScope: "Scope" }, "@/lib/api/client": { ApiError }, "@/lib/format": { formatInstant: value => value }, "@/components/icons": {} };

test("Contact management keeps one lifetime across version refresh and ignores an aborted completion read before masking acknowledged denial", async () => {
  const h = hooks(); let contact = ownershipContact(), release, done = 0, readSignal;
  const loaded = loadServer("src/features/contacts/contact-record.tsx", { modules: { ...recordModules, react: h.react,
    "@/components/shared/record-facts": { RecordFact: "Fact", RecordFacts: "Facts" }, "./contact-inline-field": { ContactInlineField: "Field" }, "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => { readSignal = signal; return new Promise(resolve => { release = resolve; }); } },
    "@/features/files/file-panel": { FilePanel: "Files" }, "@/features/work/task-panel": { TaskPanel: "Tasks" }, "@/features/schedule/contact-visits": { ContactVisits: "Visits" }, "@/features/realtime/current-record": { currentRecord: (fresh, edited) => edited ?? fresh }, "./contracts": contactContracts, "./use-query": { useQuery: () => ({ value: contact, refresh() {}, refreshQuietly() {} }) }, "./record-states": { RecordError: "Error" }, "./contact-editor": { ContactEditor: "Editor" }, "./contact-history": { ContactAssignments: "Assignments", ContactTimeline: "Timeline" }, "./ownership-controls": { OwnershipControls: "Controls" }, "./ownership-contracts": ownershipContracts, "./contact-dossiers": { ContactDossiers: "Dossiers" },
  } });
  const id = contact.id, render = () => h.render(() => loaded.ContactRecord({ id, role: "manager" }));
  const controls = () => { const workspace = find(render(), "Workspace")[0], responsibility = find(workspace.props.tabs[0].content, "Section").find(node => node.props.title === "Responsabilité"); return responsibility.props.action.props.children(() => {}, () => done++); };
  const first = controls(); contact = { ...contact, version: contact.version + 1 }; assert.equal(controls().key, first.key);
  const controller = new AbortController(), pending = controls().props.changed(id, "archive", controller.signal); assert.equal(readSignal, controller.signal); controller.abort(); release({ ...contact, name: "Must not be published" }); await pending;
  assert.equal(done, 0); assert.equal(find(render(), "RecordHeader")[0].props.title, contact.name);
  controls().props.denied(new ApiError("FORBIDDEN", 403), true);
  const masked = render(); assert.equal(find(masked, "RecordHeader").length, 0); assert.equal(find(masked, "Error")[0].props.error.status, 403); assert.ok(find(masked, "p").some(node => node.props.role === "status" && node.props.children.startsWith("L’opération est enregistrée.")));
});

test("Owner management completion respects its lifetime signal and retains an acknowledged generic notice when access disappears", async () => {
  const h = hooks(), contact = ownershipContact(), saved = []; let release, done = 0;
  const owner = { contact, saved: value => saved.push(value), denied: failure => { owner.error = failure; owner.contact = undefined; }, retry() {}, refresh() {} };
  const loaded = loadServer("src/features/owners/owner-record.tsx", { modules: { ...recordModules, react: h.react,
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Content", TabsList: "List", TabsTrigger: "Tab" }, "@/features/contacts/contact-history": { ContactTimeline: "Timeline" }, "@/features/contacts/contracts": contactContracts, "@/features/contacts/ownership-controls": { OwnershipControls: "Controls" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/lib/api/client": { apiGet: async () => new Promise(resolve => { release = resolve; }) }, "./owner-details": { OwnerDetails: "Details" }, "./owner-form": { OwnerForm: "Form" }, "./owner-loading": { OwnerLoading: "Loading" }, "./owner-portfolio": { OwnerPortfolio: "Portfolio" }, "./use-owner-contact": { useOwnerContact: () => owner },
  } });
  const render = () => h.render(() => loaded.OwnerRecord({ id: contact.id, role: "manager" }));
  const controls = () => find(render(), "Workspace")[0].props.tabs[0].content.props.managementAction.props.children(() => {}, () => done++);
  const controller = new AbortController(), pending = controls().props.changed(contact.id, "archive", controller.signal); controller.abort(); release(contact); await pending; assert.equal(saved.length, 0); assert.equal(done, 0);
  controls().props.denied(new ApiError("NOT_FOUND", 404), true); const masked = render(); assert.equal(find(masked, "RecordHeader").length, 0); assert.equal(find(masked, "Error")[0].props.error.status, 404); assert.ok(find(masked, "p").some(node => node.props.children.startsWith("L’opération est enregistrée.")));
});
