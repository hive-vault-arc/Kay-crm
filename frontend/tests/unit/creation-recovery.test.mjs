import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { editorFixture, EditorApiError as ApiError } from "./editor-fixtures.mjs";
import { loadServer } from "./load-server.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.message, type)]; }
const submit = state => find(state.render(), "form")[0].props.onSubmit({ preventDefault() {} });
const action = (state, name) => find(state.render(), "Button").find(node => node.props.action === name);
function prepare(state) { const tree = state.render(); find(tree, "Agent")[0]?.props.change(state.contact.primary_agent.id); find(tree, "Qualification")[0].props.change({ initial_budget: "1400000", campaign_source: "facebook", rating: "warm", status: "in_progress" }); state.render(); }
function accepted(state, enquiry, body, patch = {}) { return { ...enquiry, source: body.source, source_submission_id: body.source_submission_id, created_by_user_id: state.actorId, ...patch }; }

test("Prospect creation freezes contact/qualification/provenance and same key through lost response and metadata failure", async () => {
  let fail = true; const s = editorFixture({ create: true, command: async (contact, enquiry, path, body) => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return accepted(s, enquiry, body); } });
  prepare(s); find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic reviewed message" } }); submit(s); await delay(0);
  const initial = s.calls[0]; s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; const tree = s.render();
  find(tree, "Qualification")[0].props.change({ initial_budget: "9900000" }); find(tree, "Agent")[0].props.change(randomUUID()); find(tree, "Select").find(node => node.props.id === "contact-mode").props.onChange({ target: { value: "existing" } }); find(tree, "Textarea")[0].props.onChange({ target: { value: "Synthetic changed message" } }); action(s, "cancel").props.onClick();
  assert.equal(s.guarded.length, 0); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true); assert.equal(action(s, "create").props.disabled, false); assert.equal(find(tree, "form")[0].props["data-write-recovery"], true);
  fail = false; submit(s); await delay(0);
  assert.equal(s.calls.length, 2); assert.equal(initial[0], "/api/v1/enquiries"); assert.equal(initial[4], "POST"); assert.equal(initial[3], s.calls[1][3]); assert.deepEqual(plain(initial[1]), plain(s.calls[1][1])); assert.equal(initial[1].initial_budget, "1400000"); assert.equal(initial[1].message, "Synthetic reviewed message"); assert.equal(initial[1].assigned_agent_id, s.contact.primary_agent.id); assert.equal(initial[1].new_contact.primary_agent_id, s.contact.primary_agent.id); assert.equal(initial[1].campaign_source, "facebook"); assert.equal(initial[1].rating, "warm"); assert.equal(initial[1].status, "in_progress"); assert.deepEqual(plain(initial[1].new_contact.phones), plain(s.contact.phones)); assert.deepEqual(plain(initial[1].new_contact.emails), plain(s.contact.emails)); assert.equal(s.navigated.length, 1);
});

test("Successful creation cannot be submitted again or rearmed by stale field/cancel handlers", async () => {
  const s = editorFixture({ create: true }); prepare(s); const tree = s.render(), oldSubmit = find(tree, "form")[0].props.onSubmit, oldChange = find(tree, "Qualification")[0].props.change, cancel = action(s, "cancel").props.onClick;
  oldSubmit({ preventDefault() {} }); await delay(0); oldChange({ initial_budget: "9000000" }); cancel(); oldSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 1); assert.equal(s.guarded.length, 0); assert.equal(action(s, "create").props.disabled, true); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Known duplicate rejection permits explicit scoped canonical contact reuse with a new key and the same submission identity", async () => {
  const canonical = randomUUID(); let duplicate = true; const s = editorFixture({ create: true, command: async (contact, enquiry, path, body) => { if (duplicate) throw new ApiError("DUPLICATE_PHONE", 409, { contacts: [s.summary(contact)] }); return accepted(s, enquiry, body, { contact: s.summary({ ...contact, id: canonical }) }); }, read: async contact => ({ ...contact, id: canonical }) });
  prepare(s); submit(s); await delay(0); const first = s.calls[0]; find(s.render(), "CommandError")[0].props.reuse(s.contact.id); await delay(0);
  assert.equal(s.reads[0][0], `/api/v1/contacts/${s.contact.id}`); assert.ok(s.reads[0][2] instanceof AbortSignal); assert.equal(find(s.render(), "ContactFields").length, 0);
  duplicate = false; submit(s); await delay(0); const next = s.calls[1]; assert.notEqual(next[3], first[3]); assert.equal(next[1].source_submission_id, first[1].source_submission_id); assert.equal(next[1].contact_id, canonical); assert.equal(next[1].new_contact, undefined); assert.equal(next[1].assigned_agent_id, s.contact.primary_agent.id); assert.equal(s.navigated.length, 1);
});

test("Creation preserves explicit M/A queue choice and leaves Agent responsibility assignment authoritative", async () => {
  for (const role of ["manager", "administrator", "agent"]) {
    const s = editorFixture({ create: true, role }); prepare(s); const tree = s.render(); find(tree, "Select").find(node => node.props.id === "enquiry-queue")?.props.onChange({ target: { value: "queue" } }); submit(s); await delay(0);
    assert.equal(s.calls.length, 1); assert.equal(s.calls[0][1].assigned_agent_id, role === "agent" ? undefined : null); assert.equal(s.calls[0][1].new_contact.primary_agent_id, role === "agent" ? undefined : s.contact.primary_agent.id);
  }
});

test("Creation refuses different originating actor/role or restricted identity before first dispatch", async () => {
  for (const failure of ["actor", "role", "password"]) {
    const actorId = randomUUID(), s = editorFixture({ create: true, actorId, proof: async () => ({ user: { id: failure === "actor" ? randomUUID() : actorId, role: failure === "role" ? "agent" : "manager" }, must_change_password: failure === "password" }) }); prepare(s); submit(s); await delay(0);
    assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "ContactFields").length, 0); assert.equal(find(s.render(), "Error")[0].props.error.status, 403);
  }
});

test("Unknown creation cannot retry under a changed account or read denial", async () => {
  let changed = false; const actorId = randomUUID(), s = editorFixture({ create: true, actorId, proof: async () => { if (changed) throw new ApiError("UNAUTHENTICATED", 401); return { user: { id: actorId, role: "manager" }, must_change_password: false }; }, command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  prepare(s); submit(s); await delay(0); changed = true; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Error")[0].props.error.status, 401);
});

test("Creation validation is synchronously owned and disposed validation cannot write or update state", async () => {
  const s = editorFixture({ create: true }); prepare(s); let release; s.forms()[0].trigger = () => new Promise(resolve => { release = resolve; }); submit(s); submit(s); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); const change = find(s.render(), "Qualification")[0].props.change; change({ initial_budget: "9900000" });
  s.dispose(); release(true); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.lateUpdates(), 0);
});

test("Disposed duplicate reuse aborts the scoped read and cannot populate a departed creation form", async () => {
  let finish; const s = editorFixture({ create: true, command: async contact => { throw new ApiError("DUPLICATE_PHONE", 409, { contacts: [s.summary(contact)] }); }, read: () => new Promise(resolve => { finish = resolve; }) });
  prepare(s); submit(s); await delay(0); find(s.render(), "CommandError")[0].props.reuse(s.contact.id); await delay(0); assert.equal(s.reads.length, 1); s.dispose(); finish(s.contact); await delay(0); assert.equal(s.reads[0][2].aborted, true); assert.equal(s.lateUpdates(), 0);
});

test("Acknowledged creation retries only navigation without another POST", async () => {
  let fail = true; const s = editorFixture({ create: true, navigate: () => { if (fail) throw new Error("Synthetic navigation failure"); } }); prepare(s); submit(s); await delay(0);
  assert.equal(s.calls.length, 1); assert.equal(action(s, "create").props.children, "Ouvrir le prospect créé"); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 1);
});

test("Foreign submission/source/actor/contact creation results remain recoverable without wrong navigation", async () => {
  for (const failure of ["submission", "source", "actor", "contact"]) {
    let valid = false; const s = editorFixture({ create: true, command: async (contact, enquiry, path, body) => accepted(s, enquiry, body, valid ? {} : failure === "submission" ? { source_submission_id: randomUUID() } : failure === "source" ? { source: "referral" } : failure === "actor" ? { created_by_user_id: randomUUID() } : { contact: s.summary({ ...contact, id: randomUUID() }) }) });
    prepare(s); if (failure === "contact") { find(s.render(), "Select").find(node => node.props.id === "contact-mode").props.onChange({ target: { value: "existing" } }); find(s.render(), "ContactSelector")[0].props.choose(s.summary(s.contact)); }
    submit(s); await delay(0); assert.equal(s.navigated.length, 0); assert.equal(find(s.render(), "CommandError")[0].props.error.code, "INVALID_RESPONSE"); valid = true; submit(s); await delay(0); assert.equal(s.navigated.length, 1); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1]));
  }
});

test("Metadata reload preserves creation fields, blocks new saves while absent and masks on current denial", async () => {
  const s = editorFixture({ create: true }); prepare(s); const forms = s.forms(); forms[0].setValue("name", "Synthetic retained new contact"); s.queries.metadata = {}; let tree = s.render(); assert.equal(s.forms(), forms); assert.equal(s.forms()[0].getValues("name"), "Synthetic retained new contact"); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(action(s, "create").props.disabled, true);
  s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; tree = s.render(); assert.equal(s.forms(), forms); assert.equal(find(tree, "fieldset")[0].props.disabled, true);
  s.queries.metadata = { error: new ApiError("FORBIDDEN", 403) }; tree = s.render(); assert.equal(find(tree, "ContactFields").length, 0); assert.equal(s.forms(), undefined);
});

test("Live metadata loss during validation cannot dispatch a draft based on missing current options", async () => {
  const s = editorFixture({ create: true }); prepare(s); let release; s.forms()[0].trigger = () => new Promise(resolve => { release = resolve; }); submit(s); s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; s.render(); release(true); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.lateUpdates(), 0);
});

test("Creation disposal/identity replacement aborts an in-flight submission and discards the old draft owner", async () => {
  let finish; const s = editorFixture({ create: true, command: (contact, enquiry, path, body) => new Promise(resolve => { finish = () => resolve(accepted(s, enquiry, body)); }) }); prepare(s); submit(s); await delay(0); const oldForm = s.forms(); s.setActor({ role: "agent", actorId: randomUUID() }); s.render(); assert.notEqual(s.forms(), oldForm); finish(); await delay(0); assert.equal(s.calls[0][6].aborted, true); assert.equal(s.navigated.length, 0); assert.equal(s.lateUpdates(), 0);
});

test("Creation route binds the real originating account and never mounts the form for unavailable identity", async () => {
  const actorId = randomUUID(); let authenticated = true;
  const loaded = loadServer("src/app/(workspace)/leads/new/page.tsx", { modules: { "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" }, "@/features/contacts/lead-create": { LeadCreate: "Create" }, "@/lib/auth/server": { requireIdentity: async path => { assert.equal(path, "/leads/new"); return authenticated ? { state: "authenticated", profile: { user: { id: actorId, role: "manager" } } } : { state: "unavailable" }; } } } });
  const page = await loaded.default(); assert.equal(page.type, "Create"); assert.equal(page.props.actorId, actorId); assert.equal(page.props.role, "manager"); authenticated = false; assert.equal((await loaded.default()).type, "Unavailable");
});
