import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { editorFixture, EditorApiError as ApiError } from "./editor-fixtures.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type)]; }
const submit = state => find(state.render(), "form")[0].props.onSubmit({ preventDefault() {} });
const loadCurrent = state => find(state.render(), "Button").find(node => node.props.action === "refresh").props.onClick();

test("Full prospect edit retains one atomic contact/qualification snapshot after lost response and newer props", async () => {
  let fail = true; const s = editorFixture({ command: async (contact, enquiry, path, body) => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...enquiry, message: body.message, version: 8 }; } });
  s.render(); s.forms()[0].setValue("name", "Synthetic changed name"); s.forms()[1].setValue("message", "Synthetic original request"); submit(s); await delay(0);
  s.setEnquiry({ ...s.enquiry, version: 99, message: "Later server message" }); s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; const view = s.render(); assert.equal(find(view, "fieldset").some(node => node.props.disabled), true); assert.equal(find(view, "form")[0].props["data-write-recovery"], true);
  find(view, "Qualification")[0].props.change({ rating: "warm", initial_budget: "2000000" }); assert.equal(s.forms()[1].getValues("rating"), s.enquiry.rating);
  fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[1][1]), plain(s.calls[0][1])); assert.equal(s.calls[1][1].expected_version, 7); assert.equal(s.calls[1][1].contact_fields.expected_version, 17); assert.deepEqual(plain(s.calls[1][1].contact_fields.phones), plain(s.contact.phones)); assert.deepEqual(plain(s.calls[1][1].contact_fields.emails), plain(s.contact.emails));
});

test("Acknowledged full edit retries only its contact read and resets from authoritative normalized values/versions", async () => {
  let unavailable = true; const s = editorFixture({ command: async (contact, enquiry, path, body) => ({ ...enquiry, message: body.message, version: 8, contact: s.summary({ ...contact, version: 18 }) }), read: async contact => { if (unavailable) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...contact, name: "Synthetic normalized server name", version: 18 }; } });
  s.render(); s.forms()[0].setValue("name", "Synthetic raw draft name"); s.forms()[1].setValue("message", "Synthetic accepted message"); submit(s); await delay(0);
  assert.equal(s.calls.length, 1); assert.equal(s.forms()[0].resets, 0); assert.equal(find(s.render(), "Button").find(node => node.props.action === "save").props.children, "Actualiser le résultat");
  unavailable = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.reads.length, 2); assert.equal(s.forms()[0].getValues("name"), "Synthetic normalized server name"); assert.equal(find(s.render(), "Header")[0].props.description, "Synthetic normalized server name"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  submit(s); await delay(0); assert.equal(s.calls.length, 1);
  s.forms()[1].setValue("message", "Synthetic second deliberate edit"); submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].contact_fields, undefined);
});

test("Full edit validation is synchronously owned and disposed validation cannot submit or update late state", async () => {
  const s = editorFixture(); s.render(); let release;
  s.forms()[0].trigger = () => new Promise(resolve => { release = resolve; }); submit(s); submit(s); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); release(false); await delay(0); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["aria-busy"], false);
  submit(s); s.dispose(); release(true); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.lateUpdates(), 0);
});

test("Full edit contact follow-up rejects foreign/stale DTOs and can recover the acknowledged result without another PATCH", async () => {
  for (const mode of ["foreign", "stale"]) {
    let valid = false; const s = editorFixture({ command: async (contact, enquiry) => ({ ...enquiry, version: 8, contact: s.summary({ ...contact, version: 18 }) }), read: async (contact, enquiry, path) => path.includes("/enquiries/") ? enquiry : ({ ...contact, id: !valid && mode === "foreign" ? randomUUID() : contact.id, version: valid ? 18 : 17 }) });
    s.render(); s.forms()[1].setValue("message", "Synthetic new message"); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.forms()[0].resets, 0); assert.equal(find(s.render(), "CommandError")[0].props.error.code, "INVALID_RESPONSE"); valid = true; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.forms()[0].resets, 1);
  }
});

test("A current denial after full-edit acknowledgement masks private fields and keeps only a generic saved notice", async () => {
  const s = editorFixture({ read: async () => { throw new ApiError("FORBIDDEN", 403); } }); s.render(); s.forms()[1].setValue("message", "Synthetic private draft"); submit(s); await delay(0);
  const view = s.render(); assert.equal(find(view, "form").length, 0); assert.equal(find(view, "ContactFields").length, 0); assert.equal(find(view, "Error")[0].props.error.status, 403); assert.ok(find(view, "p").some(node => node.props.children.startsWith("Le prospect est enregistré.")));
});

test("Explicit full conflict reload is scoped, replaces both baselines and uses the actual refreshed versions", async () => {
  let conflict = true; const s = editorFixture({ command: async (contact, enquiry, path, body) => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409, { current: { ...enquiry, version: 9 } }); return { ...enquiry, message: body.message, version: 10 }; }, read: async (contact, enquiry, path) => path.includes("/enquiries/") ? { ...enquiry, version: 9, message: "Synthetic current request" } : { ...contact, version: 21, name: "Synthetic current contact" } });
  s.render(); s.forms()[1].setValue("message", "Synthetic draft to replace explicitly"); submit(s); await delay(0); assert.equal(s.forms()[1].getValues("message"), "Synthetic draft to replace explicitly"); assert.equal(find(s.render(), "Button").find(node => node.props.action === "save").props.disabled, true);
  loadCurrent(s); await delay(0); assert.equal(s.forms()[1].getValues("message"), "Synthetic current request"); assert.equal(s.forms()[0].getValues("name"), "Synthetic current contact"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  conflict = false; s.forms()[0].setValue("name", "Synthetic deliberate contact edit"); submit(s); await delay(0); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].contact_fields.expected_version, 21);
});

test("Explicit reload refuses canonical retargeting and handles a newly converted prospect as read-only", async () => {
  for (const mode of ["alias", "converted"]) {
    const target = randomUUID(), s = editorFixture({ command: async (contact, enquiry) => { throw new ApiError("VERSION_CONFLICT", 409, { current: { ...enquiry, version: 9 } }); }, read: async (contact, enquiry, path) => path.includes("/enquiries/") ? { ...enquiry, version: 9, ...(mode === "converted" ? { status: "converted", converted_deal_id: target, converted_at: "2026-10-28T13:00:00Z" } : {}) } : { ...contact, id: mode === "alias" ? randomUUID() : contact.id } });
    s.render(); s.forms()[1].setValue("message", "Synthetic draft"); submit(s); await delay(0); loadCurrent(s); await delay(0);
    if (mode === "alias") { assert.equal(s.forms()[0].resets, 0); assert.equal(find(s.render(), "CommandError")[0].props.error.code, "CONTACT_MERGED"); }
    else { assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Link")[0].props.href, "/deals/" + target); }
    assert.equal(s.calls.length, 1);
  }
});

test("Full editor hosts retain drafts across read loading/transient failure and remove the owner on authority loss", async () => {
  const s = editorFixture(); s.render(); const forms = s.forms(); forms[1].setValue("message", "Synthetic retained draft");
  s.queries.contact = {}; s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; const unavailable = s.render(); assert.equal(s.forms(), forms); assert.equal(s.forms()[1].getValues("message"), "Synthetic retained draft"); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(find(unavailable, "Button").find(node => node.props.action === "save").props.disabled, true);
  s.queries.contact = { error: new ApiError("NOT_FOUND", 404) }; const denied = s.render(); assert.equal(find(denied, "ContactFields").length, 0); assert.equal(s.forms(), undefined); assert.equal(find(denied, "Error")[0].props.error.status, 404);
  const alias = editorFixture(); alias.queries.contact = { value: { ...alias.contact, id: randomUUID() } }; const blocked = alias.render(); assert.equal(alias.forms(), undefined); assert.equal(find(blocked, "Error")[0].props.error.code, "CONTACT_MERGED");
});

test("Disposed full-edit completion aborts its read and cannot reset forms or publish success", async () => {
  let release; const s = editorFixture({ read: contact => new Promise(resolve => { release = () => resolve(contact); }) }); s.render(); const forms = s.forms(); forms[1].setValue("message", "Synthetic committed request"); submit(s); await delay(0); s.dispose(); assert.equal(s.reads[0][2].aborted, true); release(); await delay(0); assert.equal(forms[0].resets, 0); assert.equal(forms[1].resets, 0); assert.equal(s.lateUpdates(), 0);
});

test("A verified canonical contact after acknowledgement or explicit reload finishes read-only without retargeting the editor", async () => {
  for (const acknowledged of [true, false]) {
    const canonical = randomUUID(), s = editorFixture({ command: async (contact, enquiry) => { if (!acknowledged) throw new ApiError("VERSION_CONFLICT", 409, { current: { ...enquiry, version: 9 } }); return { ...enquiry, version: 8 }; }, read: async (contact, enquiry, path) => path.includes("/enquiries/") ? { ...enquiry, version: 9, contact: { ...enquiry.contact, id: canonical } } : { ...contact, id: canonical, version: 1 } });
    s.render(); const forms = s.forms(); forms[1].setValue("message", "Synthetic original edit"); submit(s); await delay(0); if (!acknowledged) { loadCurrent(s); await delay(0); }
    const view = s.render(); assert.equal(find(view, "form").length, 0); assert.equal(find(view, "RecordHeader")[0].props.title, acknowledged ? "Prospect enregistré" : "Contact fusionné"); assert.equal(find(view, "Link")[0].props.href, "/leads/" + s.enquiry.id); assert.equal(s.calls.length, 1); assert.equal(forms[0].resets, 0);
  }
});

test("Full edit still requires contact languages and budget while preserving optional empty message and unrelated provenance", async () => {
  const s = editorFixture(); s.render(); s.forms()[0].setValue("languages", []); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.forms()[0].formState.errors.languages.message, "Choisissez au moins une langue.");
  s.forms()[0].setValue("languages", ["french"]); s.forms()[1].setValue("initial_budget", ""); submit(s); await delay(0); assert.equal(s.calls.length, 0);
  s.forms()[1].setValue("initial_budget", s.enquiry.initial_budget); s.forms()[1].setValue("message", ""); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.calls[0][1].message, ""); assert.equal(s.calls[0][1].source, undefined); assert.equal(s.calls[0][1].assigned_agent_id, undefined); assert.equal(s.calls[0][1].contact_fields, undefined);
});
