import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContracts, ownershipContact, ownershipReceipt } from "./ownership-fixtures.mjs";
import { activityContracts, entryContracts, entryHarness, loadEntryCommand } from "./entry-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const bodies = { note: { kind: "call", body: "Synthetic unchanged note" }, activity: { kind: "call", body: "Synthetic unchanged activity", duration_minutes: 15, direction: "outbound", projects: ["Synthetic project"] }, assignment: { expected_version: 7, assigned_agent_id: null, reason: "Synthetic unchanged reason" } };
const receipt = (target, contact) => target.kind === "activity" ? { id: randomUUID() } : ownershipReceipt(contact, target.kind === "note" ? "notes" : "enquiry-assign");
function fixture({ kind = "note", request, saved, identity, hydrated = true } = {}) {
  const h = entryHarness(), contact = ownershipContact(), id = kind === "note" ? contact.id : randomUUID();
  const path = `/api/v1/${kind === "note" ? "contacts" : kind === "activity" ? "deals" : "enquiries"}/${id}/${kind === "note" ? "notes" : kind === "activity" ? "activities" : "assign"}`;
  const calls = [], saves = [], denials = []; let dispatched = true;
  const hook = loadEntryCommand(h, { ApiError, hydrated, identity, request: async (...args) => { calls.push(args); if (dispatched) args[5](); return request ? request(...args) : receipt(args[0], contact); } });
  const props = { path, contactId: kind === "assignment" ? contact.id : undefined, saved: saved ?? (async signal => saves.push(signal)), denied: (...args) => denials.push(args) };
  return { h, contact, props, calls, saves, denials, dispatch: value => { dispatched = value; }, render: () => h.render(() => hook.useEntryCommand(props)) };
}
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...Object.values(node.props ?? {}).flatMap(child => find(child, type))]; }

test("Entry routes and payloads admit only the three real commands with operation-specific receipt identity", () => {
  const contact = ownershipContact();
  for (const kind of ["note", "activity", "assignment"]) {
    const s = fixture({ kind }), target = entryContracts.entryTarget(s.props.path, s.props.contactId); assert.equal(target.kind, kind);
    assert.deepEqual(plain(entryContracts.entryBody(target, bodies[kind])), bodies[kind]); assert.equal(entryContracts.entryResultMatches(target, receipt(target, s.contact)), true);
    assert.throws(() => entryContracts.entryBody(target, { ...bodies[kind], actor_id: randomUUID() }));
    assert.equal(entryContracts.entryResultMatches(target, kind === "activity" ? ownershipReceipt(contact, "notes") : { id: randomUUID() }), false);
    if (kind !== "activity") assert.equal(entryContracts.entryResultMatches(target, ownershipReceipt(contact, kind === "note" ? "notes" : "enquiry-assign")), false);
  }
  for (const path of [`/api/v1/contacts/${contact.id}/archive`, `/api/v1/deals/${contact.id}/origin-activities`, `/api/v1/contacts/${contact.id}/notes?q=x`, `/api/v1/enquiries/${contact.id}/assign`, `/api/v1/contacts/invalid/notes`, `foreign/api/v1/contacts/${contact.id}/notes`, `https://foreign.invalid/api/v1/contacts/${contact.id}/notes`]) assert.equal(entryContracts.entryTarget(path), undefined);
});

test("Every entry command retains its original snapshot/key after lost response and excludes replacement submissions or refresh", async () => {
  for (const kind of ["note", "activity", "assignment"]) {
    let fail = true; const s = fixture({ kind, request: async target => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt(target, s.contact); } });
    const draft = structuredClone(bodies[kind]); await s.render().submit(draft); draft.reason = "replacement";
    const state = s.render(); assert.equal(state.uncertain, true); assert.equal(state.canEdit(), false); await state.submit(draft); await state.refresh(async () => assert.fail("Unknown command must exclude refresh")); assert.equal(s.calls.length, 1);
    fail = false; await state.retry(); assert.equal(s.calls.length, 2); assert.equal(s.calls[1][2], s.calls[0][2]); assert.deepEqual(plain(s.calls[1][1]), bodies[kind]); assert.equal(s.saves.length, 1); assert.equal(s.render().complete, true); await state.retry(); await state.submit(bodies[kind]); assert.equal(s.calls.length, 2);
  }
});

test("Preflight failure leaves correction available; another preflight failure cannot erase a prior unknown result", async () => {
  const s = fixture({ request: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  s.dispatch(false); await s.render().submit(bodies.note); assert.equal(s.render().uncertain, false); assert.equal(s.render().canEdit(), true);
  s.dispatch(true); await s.render().submit(bodies.note); const key = s.calls.at(-1)[2]; assert.equal(s.render().uncertain, true);
  s.dispatch(false); await s.render().retry(); assert.equal(s.render().uncertain, true); assert.equal(s.calls.at(-1)[2], key);
});

test("Acknowledged entry completion retries only its result and receives a cancellable lifetime signal", async () => {
  let completions = 0; const signals = [], s = fixture({ saved: async signal => { signals.push(signal); if (++completions === 1) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await s.render().submit(bodies.note); assert.equal(s.render().acknowledged, true); assert.equal(s.render().uncertain, true); await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(completions, 2); assert.equal(signals.every(signal => signal instanceof AbortSignal), true);
});

test("Known assignment conflicts release an unacknowledged request for explicit refresh and a new key", async () => {
  const s = fixture({ kind: "assignment", request: async () => { throw new ApiError("OWNERSHIP_VERSION_CONFLICT", 409); } });
  await s.render().submit(bodies.assignment); assert.equal(s.render().canEdit(), true); assert.equal(s.render().uncertain, false);
  let read = 0; await s.render().refresh(async signal => { assert.equal(signal.aborted, false); read++; }); assert.equal(read, 1);
  await s.render().submit({ ...bodies.assignment, expected_version: 9 }); assert.notEqual(s.calls[0][2], s.calls[1][2]); assert.equal(s.calls[1][1].expected_version, 9);
});

test("Foreign note/assignment receipts never acknowledge another contact or operation", async () => {
  for (const kind of ["note", "assignment"]) {
    const s = fixture({ kind, request: async () => ownershipReceipt(ownershipContact(), "notes") });
    await s.render().submit(bodies[kind]); assert.equal(s.render().error.code, "INVALID_RESPONSE"); assert.equal(s.render().acknowledged, false); assert.equal(s.render().uncertain, true); assert.equal(s.saves.length, 0);
  }
});

test("Entry denial masks before/after acknowledgement; disposal aborts and refuses late work and stale callbacks", async () => {
  for (const acknowledged of [false, true]) {
    const s = fixture({ request: async target => { if (!acknowledged) throw new ApiError("FORBIDDEN", 403); return receipt(target, s.contact); }, saved: async () => { throw new ApiError("NOT_FOUND", 404); } });
    await s.render().submit(bodies.note); assert.equal(s.render().accessError.status, acknowledged ? 404 : 403); assert.equal(s.denials[0][1], acknowledged); await s.render().retry(); await s.render().submit(bodies.note); assert.equal(s.calls.length, 1);
  }
  let release; const s = fixture({ request: target => new Promise(resolve => { release = () => resolve(receipt(target, s.contact)); }) });
  const old = s.render(), pending = old.submit(bodies.note); await old.submit(bodies.note); assert.equal(s.calls.length, 1); s.h.dispose(); assert.equal(s.calls[0][4].aborted, true); release(); await pending; await old.retry(); await old.submit(bodies.note); await old.refresh(async () => assert.fail()); assert.equal(s.saves.length, 0); assert.equal(s.h.lateUpdates(), 0);
  const cold = fixture({ hydrated: false }); await cold.render().submit(bodies.note); assert.equal(cold.calls.length, 0);
});

test("Entry transport uses fresh same-actor/role CSRF, rejects password/Agent assignment changes, and preserves exact request metadata", async () => {
  const actor = randomUUID(), contact = ownershipContact(), calls = [], events = []; let me = { user: { id: actor, role: "manager" }, csrf_token: "synthetic-csrf", must_change_password: false };
  const client = loadServer("src/features/activities/entry-client.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: async (...args) => { calls.push(args); return args[0].endsWith("/me") ? me : ownershipReceipt(contact, "notes"); } }, "@/lib/auth/contracts": { meSchema: {} }, "./entry-command": entryContracts }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const target = entryContracts.entryTarget(`/api/v1/contacts/${contact.id}/notes`), binding = {}, controller = new AbortController(), key = randomUUID(); let dispatched = 0;
  await client.entryRequest(target, bodies.note, key, binding, controller.signal, () => dispatched++);
  assert.equal(binding.actorId, actor); assert.equal(binding.role, "manager"); assert.equal(calls[1][2], controller.signal); assert.deepEqual(plain(calls[1][3]), { method: "POST", body: bodies.note, csrf: "synthetic-csrf", key }); assert.deepEqual(events, ["kay:command-saved"]);
  for (const next of [{ ...me, user: { id: randomUUID(), role: "manager" } }, { ...me, user: { id: actor, role: "administrator" } }, { ...me, must_change_password: true }]) { me = next; await assert.rejects(() => client.entryRequest(target, bodies.note, key, binding, controller.signal, () => dispatched++), error => error.status === 403); }
  me = { ...me, must_change_password: false, user: { id: actor, role: "agent" } }; const assignment = entryContracts.entryTarget(`/api/v1/enquiries/${randomUUID()}/assign`, contact.id);
  await assert.rejects(() => client.entryRequest(assignment, bodies.assignment, key, {}, controller.signal, () => dispatched++), error => error.status === 403);
  controller.abort(); await assert.rejects(() => client.entryRequest(target, bodies.note, key, {}, controller.signal, () => dispatched++)); assert.equal(dispatched, 1);
});

const ui = h => ({ react: h.react, "react/jsx-runtime": runtime, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/shared/dossier-form": { useDossierDraft: () => ({ dirty: false, accept() {} }) }, "@/lib/api/client": { ApiError }, "@/features/contacts/record-states": { RecordError: "Error" }, "./record-states": { RecordError: "Error" } });
const dataClass = class { constructor(value) { this.value = value; } get(key) { return this.value[key] ?? null; } [Symbol.iterator]() { return Object.entries(this.value)[Symbol.iterator](); } };

test("The activity form preserves every optional field, blocks cancel/change during unknown recovery, and rejects invalid new drafts locally", async () => {
  const h = entryHarness(), calls = []; let fail = true, cancelled = 0;
  const hook = loadEntryCommand(h, { ApiError, request: async (...args) => { calls.push(args); args[5](); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { id: randomUUID() }; } });
  const loaded = loadServer("src/features/activities/activity-form.tsx", { modules: { ...ui(h), "./contracts": activityContracts, "./use-entry-command": hook }, globals: { FormData: dataClass } });
  const props = { path: `/api/v1/deals/${randomUUID()}/activities`, saved() {}, cancel: () => cancelled++ }, render = () => h.render(() => loaded.ActivityForm(props));
  const values = { kind: "call", body: "Synthetic note", duration: "15", direction: "outbound", project1: "Synthetic project", project2: "", project3: "" };
  await find(render(), "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { ...values, project2: "synthetic PROJECT" } }); assert.equal(calls.length, 0);
  await find(render(), "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: values }); assert.equal(find(render(), "fieldset")[0].props.disabled, true); assert.equal(find(render(), "form")[0].props["data-write-recovery"], true);
  find(render(), "Button").find(node => node.props.action === "close").props.onClick(); assert.equal(cancelled, 0);
  fail = false; await find(render(), "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { ...values, body: "Replacement must be ignored" } }); assert.deepEqual(plain(calls[0][1]), plain(calls[1][1])); assert.equal(calls[1][1].duration_minutes, 15); assert.equal(calls[1][1].projects[0], "Synthetic project");
});

test("The contact note form freezes its original kind/text and keeps its existing no-send/no-booking explanation", async () => {
  const h = entryHarness(), contact = ownershipContact(), calls = []; let fail = true;
  const hook = loadEntryCommand(h, { ApiError, request: async (...args) => { calls.push(args); args[5](); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return ownershipReceipt(contact, "notes"); } });
  const loaded = loadServer("src/features/contacts/contact-note-form.tsx", { modules: { ...ui(h), "@/features/activities/use-entry-command": hook } });
  const props = { id: contact.id, saved() {} }, render = () => h.render(() => loaded.ContactNoteForm(props));
  find(render(), "Select")[0].props.onChange({ target: { value: "email" } }); find(render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic note" } }); find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  find(render(), "Textarea")[0].props.onChange({ target: { value: "Must not change" } }); assert.equal(find(render(), "Textarea")[0].props.value, "Synthetic note"); assert.ok(find(render(), "p").some(node => String(node.props.children).includes("ne l’envoie pas")));
  fail = false; find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.deepEqual(plain(calls[1][1]), { kind: "email", body: "Synthetic note" }); assert.equal(calls[1][2], calls[0][2]);
});

function assignmentFixture({ request, read } = {}) {
  const h = entryHarness(), contact = ownershipContact({ collaborators: [{ id: randomUUID(), display_name: "Synthetic collaborator" }] }), enquiry = { id: randomUUID(), version: 7, assigned_agent: contact.primary_agent, contact }, calls = [], denials = [];
  let queryError, latest = contact;
  const hook = loadEntryCommand(h, { ApiError, request: async (...args) => { calls.push(args); args[5](); if (request) return request(...args); throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  const current = loadServer("src/features/realtime/current-record.ts"), loaded = loadServer("src/features/contacts/enquiry-assignment.tsx", { modules: { ...ui(h), "@/components/icons": { ContactsIcon: "Icon" }, "@/components/shared/section-heading": { SectionHeading: "Heading" }, "@/features/activities/use-entry-command": hook, "@/features/realtime/current-record": current, "@/lib/api/client": { ApiError, apiGet: async (...args) => read ? read(enquiry, contact, ...args) : args[0].includes("/enquiries/") ? { ...enquiry, version: 9 } : { ...contact, version: 9 } }, "./contracts": contactContracts, "./use-query": { useQuery: () => ({ value: queryError ? undefined : latest, error: queryError, refresh() { queryError = undefined; } }) } } });
  const props = { enquiry, saved() {}, denied: (...args) => denials.push(args) }, render = () => h.render(() => loaded.EnquiryAssignment(props));
  return { h, contact, enquiry, calls, props, denials, render, query: (failure, value = contact) => { queryError = failure; latest = value; } };
}
test("Assignment retry keeps original enquiry/version/reason/agent through a newer parent or transient options failure", async () => {
  const s = assignmentFixture(); s.render(); find(s.render(), "Select")[0].props.onChange({ target: { value: s.contact.collaborators[0].id } }); find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic reason" } });
  find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); const first = s.calls[0]; s.props.enquiry = { ...s.enquiry, version: 42 }; s.query(new ApiError("DEPENDENCY_UNAVAILABLE", 503));
  find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Do not change" } }); find(s.render(), "Button").find(node => node.props.action === "refresh").props.onClick(); find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(s.calls.length, 2); assert.equal(s.calls[1][2], first[2]); assert.deepEqual(plain(s.calls[1][1]), { expected_version: 7, assigned_agent_id: s.contact.collaborators[0].id, reason: "Synthetic reason" });
  s.query(new ApiError("FORBIDDEN", 403)); assert.equal(find(s.render(), "form").length, 0); assert.equal(s.denials[0][0].status, 403); assert.equal(s.calls.at(-1)[4].aborted, true);
});

test("Explicit assignment refresh preserves draft choices, adopts actual versions and refuses alias retargeting", async () => {
  const s = assignmentFixture({ request: async () => { throw new ApiError("OWNERSHIP_VERSION_CONFLICT", 409); } }); s.render(); find(s.render(), "Select")[0].props.onChange({ target: { value: "" } }); find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic queue reason" } }); find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  find(s.render(), "Button").find(node => node.props.action === "refresh").props.onClick(); await delay(0); assert.equal(find(s.render(), "Textarea")[0].props.value, "Synthetic queue reason"); assert.equal(find(s.render(), "Select")[0].props.value, ""); find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].assigned_agent_id, null);
  const alias = assignmentFixture({ read: async (enquiry, contact, path) => path.includes("/contacts/") ? { ...contact, id: randomUUID() } : enquiry }); alias.render(); find(alias.render(), "Button").find(node => node.props.action === "refresh").props.onClick(); await delay(0); assert.equal(find(alias.render(), "Error").some(node => node.props.error.code === "CONTACT_MERGED"), true); assert.equal(alias.calls.length, 0);
  const unavailable = assignmentFixture(); unavailable.query(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); assert.equal(find(unavailable.render(), "fieldset")[0].props.disabled, true); find(unavailable.render(), "Button").find(node => node.props.action === "refresh").props.onClick(); await delay(0); assert.equal(find(unavailable.render(), "fieldset")[0].props.disabled, false);
});

test("Contact and activity history remove private rows and notify their parent on a command denial", () => {
  for (const kind of ["contact", "activity"]) {
    const h = entryHarness(), failures = [], id = randomUUID(), modules = { ...ui(h), "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/data-table": { DataTable: "Table" }, "@/components/shared/scrollable-results-table": { ScrollableResultsTable: "Results" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "./numbered-pages": { NumberedPages: "Pages" }, "@/lib/format": { formatInstant: value => value }, "@/features/contacts/ownership-contracts": ownershipContracts, "./ownership-contracts": ownershipContracts, "./contact-note-form": { ContactNoteForm: "Note" }, "./activity-form": { ActivityForm: "Activity" }, "./contracts": activityContracts, "next/link": { default: "Link" } };
    const query = { queryPath: path => path, useQuery: () => ({ value: { items: [], total: 0, page_size: 20 }, refresh() {}, refreshQuietly() {} }) }; modules[kind === "contact" ? "./use-query" : "@/features/contacts/use-query"] = query;
    const loaded = loadServer(`src/features/${kind === "contact" ? "contacts/contact-history" : "activities/activity-history"}.tsx`, { modules }), props = { id, scope: "enquiries", writable: true, archived: false, denied: (...args) => failures.push(args) };
    const render = () => h.render(() => kind === "contact" ? loaded.ContactTimeline(props) : loaded.ActivityHistory(props));
    if (kind === "activity") find(render(), "Button").find(node => node.props.action === "create").props.onClick();
    const form = find(render(), "Drawer")[0].props.children(() => {}, () => {}); form.props.denied(new ApiError("FORBIDDEN", 403), true);
    assert.equal(find(render(), "Table").length, 0); assert.equal(find(render(), "Drawer").length, 0); assert.equal(failures[0][1], true);
  }
});

test("Contact facade rejects foreign note identity and incorrect note/assignment operations without exposing a partial receipt", async () => {
  const contact = ownershipContact(), id = randomUUID(), origin = "https://synthetic.invalid", owners = loadServer("src/features/owners/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } }); let result;
  const loaded = loadServer("src/features/contacts/facade.ts", { modules: { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async () => ({ status: 200, body: result }) }, "@/lib/api/errors": { frenchApiError: code => code }, "./contracts": contactContracts, "./ownership-contracts": ownershipContracts, "./qualification-contracts": {}, "@/features/owners/contracts": owners } });
  for (const kind of ["note", "assignment"]) {
    const key = kind === "note" ? `contacts/${contact.id}/notes` : `enquiries/${id}/assign`, expected = kind === "note" ? "notes" : "enquiry-assign";
    const relay = () => loaded.relayContacts(key, new Request(`${origin}/api/v1/${key}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID(), "Content-Type": "application/json" }, body: JSON.stringify(bodies[kind]) }), "synthetic-request");
    result = ownershipReceipt(contact, "archive"); assert.equal((await relay()).status, 503); result = ownershipReceipt(contact, expected); assert.equal((await relay()).status, 200);
    if (kind === "note") { result = ownershipReceipt(ownershipContact(), expected); assert.equal((await relay()).status, 503); }
  }
});
