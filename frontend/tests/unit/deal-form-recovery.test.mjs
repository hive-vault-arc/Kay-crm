import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { dealFormFixture } from "./deal-form-fixtures.mjs";
import { ConversionApiError as ApiError } from "./conversion-fixtures.mjs";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { dealContracts } from "./conversion-fixtures.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type)]; }
const submit = s => find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} });
const button = (s, action) => find(s.render(), "Button").find(node => node.props.action === action);
const field = (s, type, id) => find(s.render(), type).find(node => node.props.id === id);
function prepare(s) { const tree = s.render(); find(tree, "Agent")[0]?.props.change(s.contact.primary_agent.id); find(tree, "Project")[0].props.choose({ choice: { external_name: "Synthetic reviewed project" }, label: "Synthetic reviewed project" }); find(tree, "Budget")[0].props.onChange("1400000"); find(tree, "Checkbox")[0].props.onCheckedChange(true); s.render(); }

test("Atomic affair edit freezes both versions, collections, full qualification and linked context through lost acknowledgement", async () => {
  let fail = true; const s = dealFormFixture({ command: async ({ commit }) => { const receipt = commit(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt; } }); prepare(s); s.forms()[0].setValue("name", "Synthetic edited name"); field(s, "Textarea", "deal-notes").props.onChange({ target: { value: "Synthetic reviewed notes" } }); const requirement = randomUUID(), offering = { id: randomUUID(), version: 9 }; find(s.render(), "Requirement")[0].props.choose(requirement); find(s.render(), "Offering")[0].props.choose(offering); submit(s); await delay(0);
  s.setProps({ value: { ...s.deal, version: 99 } }); s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; const tree = s.render(); find(tree, "Budget")[0].props.onChange("9900000"); find(tree, "Project")[0].props.choose(undefined); button(s, "cancel").props.onClick(); assert.equal(s.guarded.length, 0); assert.equal(find(tree, "fieldset")[0].props.disabled, true); fail = false; submit(s); await delay(0);
  assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1])); const body = s.calls[1][1]; assert.equal(body.expected_version, 7); assert.equal(body.contact_fields.expected_version, 17); assert.deepEqual(plain(body.contact_fields.phones), plain(s.contact.phones)); assert.deepEqual(plain(body.contact_fields.emails), plain(s.contact.emails)); assert.equal(body.number_of_rooms, 0); assert.equal(body.requirement_id, requirement); assert.equal(body.offering_id, offering.id); assert.equal(body.expected_offering_version, 9); assert.equal(body.stage, undefined); assert.equal(s.commits(), 1);
});

test("Acknowledged edit retries only current deal/contact completion and resets authoritative normalized baselines", async () => {
  let fail = true; const s = dealFormFixture({ read: async ({ path, server }) => { if (path.includes("/contacts/") && fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return path.includes("/deals/") ? server.deal : { ...server.contact, name: "Synthetic normalized name" }; } }); prepare(s); s.forms()[0].setValue("name", "Synthetic raw draft"); submit(s); await delay(0); assert.equal(button(s, "save").props.children, "Actualiser le résultat"); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.forms()[0].getValues("name"), "Synthetic normalized name"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined); submit(s); await delay(0); assert.equal(s.calls.length, 1);
  field(s, "Textarea", "deal-notes").props.onChange({ target: { value: "Synthetic deliberate next edit" } }); submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].contact_fields, undefined);
});

test("Manual affair creation preserves explicit existing contact and initial stage with same-operation retry", async () => {
  let fail = true; const s = dealFormFixture({ mode: "create", prefilled: true, command: async ({ commit }) => { const receipt = commit(); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return receipt; } }); prepare(s); field(s, "Select", "initial-stage").props.onChange({ target: { value: "visit" } }); submit(s); await delay(0); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][1].contact_id, s.contact.id); assert.equal(s.calls[0][1].new_contact, undefined); assert.equal(s.calls[1][1].stage, "visit"); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(button(s, "create").props.disabled, true);
});

test("New-contact affair creation preserves collections and M/A assignment without an Agent override", async () => {
  for (const role of ["manager", "administrator", "agent"]) { const s = dealFormFixture({ mode: "create", role }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.deepEqual(plain(s.calls[0][1].new_contact.phones), plain(s.contact.phones)); assert.equal(s.calls[0][1].new_contact.primary_agent_id, role === "agent" ? undefined : s.contact.primary_agent.id); assert.equal(s.saves.length, 1); }
});

test("Known affair conflict retains draft until scoped explicit complete reload replaces both versions", async () => {
  let fail = true; const s = dealFormFixture({ command: async ({ commit }) => { if (fail) throw new ApiError("DEAL_VERSION_CONFLICT", 409); return commit(); } }); prepare(s); field(s, "Textarea", "deal-notes").props.onChange({ target: { value: "Synthetic retained draft" } }); s.server.deal = { ...s.deal, version: 11, notes: "Synthetic current note" }; s.server.contact = { ...s.contact, version: 21, name: "Synthetic current contact" }; submit(s); await delay(0); assert.equal(field(s, "Textarea", "deal-notes").props.value, "Synthetic retained draft"); assert.equal(button(s, "save").props.disabled, true); button(s, "refresh").props.onClick(); await delay(0); assert.equal(s.forms()[0].getValues("name"), "Synthetic current contact"); assert.equal(field(s, "Textarea", "deal-notes").props.value, "Synthetic current note"); fail = false; field(s, "Textarea", "deal-notes").props.onChange({ target: { value: "Synthetic reviewed next note" } }); submit(s); await delay(0); assert.equal(s.calls[1][1].expected_version, 11); assert.equal(s.calls[1][1].contact_fields, undefined); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});

test("Canonical or closed current affair completion ends read-only instead of retargeting another save", async () => {
  for (const mode of ["canonical", "closed"]) { const canonical = randomUUID(), s = dealFormFixture({ read: async ({ path, server }) => path.includes("/deals/") ? { ...server.deal, ...(mode === "closed" ? { stage: "won" } : { contact: { ...server.deal.contact, id: canonical, version: 3 } }) } : { ...server.contact, ...(mode === "canonical" ? { id: canonical, version: 3 } : {}) } }); prepare(s); s.forms()[0].setValue("name", "Synthetic atomic contact draft"); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Link")[0].props.href, `/deals/${s.deal.id}`); }
});

test("Changed actor/role or restricted identity cannot dispatch an affair form", async () => {
  for (const mode of ["actor", "role", "restricted"]) { const s = dealFormFixture({ proof: async ({ actorId }) => ({ user: { id: mode === "actor" ? randomUUID() : actorId, role: mode === "role" ? "agent" : "manager" }, must_change_password: mode === "restricted" }) }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "ContactFields").length, 0); assert.equal(s.denials[0][0].status, 403); }
});

test("Acknowledged affair completion denial masks private fields and retains only saved status", async () => {
  const s = dealFormFixture({ read: async () => { throw new ApiError("FORBIDDEN", 403); } }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form").length, 0); assert.equal(s.denials[0][1], true);
});

test("Metadata/contact outages retain edit values, block new saves and dispose on authority loss", async () => {
  const s = dealFormFixture(); prepare(s); const form = s.forms()[0]; form.setValue("name", "Synthetic retained draft"); s.queries.contact = {}; s.queries.metadata = { error: new ApiError("DEPENDENCY_UNAVAILABLE", 503) }; submit(s); await delay(0); assert.equal(s.forms()[0], form); assert.equal(s.calls.length, 0); assert.equal(s.forms()[0].getValues("name"), "Synthetic retained draft"); s.queries.contact = { error: new ApiError("NOT_FOUND", 404) }; assert.equal(find(s.render(), "ContactFields").length, 0);
});

test("Validation and disposed mutation cannot submit, update state or complete the departed affair", async () => {
  const s = dealFormFixture(); prepare(s); let release; s.forms()[0].trigger = () => new Promise(resolve => { release = resolve; }); submit(s); submit(s); assert.equal(s.calls.length, 0); s.dispose(); release(true); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.lateUpdates(), 0);
  let finish; const pending = dealFormFixture({ command: ({ commit }) => new Promise(resolve => { finish = () => resolve(commit()); }) }); prepare(pending); submit(pending); await delay(0); pending.dispose(); finish(); await delay(0); assert.equal(pending.calls[0][6].aborted, true); assert.equal(pending.saves.length, 0); assert.equal(pending.lateUpdates(), 0);
});

test("After-save callback failure retries completion without another POST/PATCH", async () => {
  let fail = true; const s = dealFormFixture({ saved: async () => { if (fail) throw Error("Synthetic parent completion failure"); } }); prepare(s); submit(s); await delay(0); assert.equal(button(s, "save").props.children, "Actualiser le résultat"); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.saves.length, 2); assert.equal(s.busy.at(-1), false);
});

test("Changing the creation contact removes only the now-invalid linked search and announces the change", async () => {
  const s = dealFormFixture({ mode: "create" }); prepare(s); field(s, "Select", "deal-client-mode").props.onChange({ target: { value: "existing" } }); find(s.render(), "ContactSelector")[0].props.choose(s.summary(s.contact)); find(s.render(), "Requirement")[0].props.choose(randomUUID()); find(s.render(), "Button").find(node => node.props.action === "contact").props.onClick(); find(s.render(), "ContactSelector")[0].props.choose({ ...s.summary(s.contact), id: randomUUID() }); assert.equal(find(s.render(), "Requirement")[0].props.selected, null); assert.ok(find(s.render(), "p").some(node => typeof node.props.children === "string" && node.props.children.startsWith("La recherche liée")));
});

test("Foreign edit/proposal receipts retrieve only the same original request and cannot complete another target", async () => {
  for (const mode of ["id", "proposal"]) { let valid = false; const s = dealFormFixture({ command: async ({ commit }) => { const result = commit(); return valid ? result : mode === "id" ? { ...result, id: randomUUID() } : { ...result, customer_offer_id: randomUUID(), offer_version: 1 }; } }); prepare(s); submit(s); await delay(0); assert.equal(s.saves.length, 0); valid = true; submit(s); await delay(0); assert.equal(s.saves.length, 1); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); }
});

test("Foreign or stale completion reads retain acknowledgement and retry reads without another write", async () => {
  for (const mode of ["deal", "contact", "version", "atomic"]) { let valid = false; const s = dealFormFixture({ read: async ({ path, server, contact }) => path.includes("/deals/") ? { ...server.deal, ...(!valid && mode === "deal" ? { id: randomUUID() } : !valid && mode === "atomic" ? { contact: { ...server.deal.contact, version: contact.version } } : {}) } : { ...server.contact, ...(!valid && mode === "contact" ? { id: randomUUID() } : !valid && ["version", "atomic"].includes(mode) ? { version: contact.version } : {}) } }); prepare(s); s.forms()[0].setValue("name", "Synthetic new contact value"); submit(s); await delay(0); assert.equal(s.saves.length, 0); valid = true; submit(s); await delay(0); assert.equal(s.saves.length, 1); assert.equal(s.calls.length, 1); }
});

test("Metadata loss during pending validation blocks the affair request before dispatch", async () => {
  const s = dealFormFixture(); prepare(s); let release; s.forms()[0].trigger = () => new Promise(resolve => { release = resolve; }); submit(s); s.queries.metadata = {}; s.render(); release(true); await delay(0); assert.equal(s.calls.length, 0); assert.equal(s.lateUpdates(), 0);
});

test("Known duplicate creation permits explicit canonical reuse and a fresh key without changing contact responsibility", async () => {
  let duplicate = true; const s = dealFormFixture({ mode: "create", command: async ({ commit }) => { if (duplicate) throw new ApiError("DUPLICATE_CONFIRMATION_REQUIRED", 409); return commit(); } }); prepare(s); submit(s); await delay(0); const canonical = randomUUID(); s.server.contact = { ...s.contact, id: canonical }; find(s.render(), "CommandError")[0].props.reuse(s.contact.id); await delay(0); assert.equal(s.reads[0].path, `/api/v1/contacts/${s.contact.id}`); assert.ok(s.reads[0].signal instanceof AbortSignal); duplicate = false; submit(s); await delay(0); assert.equal(s.calls[1][1].contact_id, canonical); assert.equal(s.calls[1][1].new_contact, undefined); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.saves.length, 1); assert.equal(s.saves[0][1].contact.primary_agent.id, s.contact.primary_agent.id);
});

test("Retry cannot use a changed account and replacing an affair owner aborts late completion", async () => {
  let changed = false; const s = dealFormFixture({ proof: async ({ actorId, role }) => ({ user: { id: changed ? randomUUID() : actorId, role }, must_change_password: false }), command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); prepare(s); submit(s); await delay(0); changed = true; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form").length, 0);
  let finish; const owner = dealFormFixture({ command: ({ commit }) => new Promise(resolve => { finish = () => resolve(commit()); }) }); prepare(owner); submit(owner); await delay(0); owner.setProps({ actorId: randomUUID() }); owner.render(); finish(); await delay(0); assert.equal(owner.calls[0][6].aborted, true); assert.equal(owner.saves.length, 0); assert.equal(owner.lateUpdates(), 0);
});

test("Affair create route binds actual actor/role, refuses unavailable identity and validates context before mounting", async () => {
  const actorId = randomUUID(); let authenticated = true;
  const loaded = loadServer("src/app/(workspace)/deals/new/page.tsx", { modules: { "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }, "@/components/shared/page-header": { PageHeader: "Header" }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" }, "@/features/deals/deal-create": { DealCreate: "Create" }, "@/features/deals/contracts": dealContracts, "@/lib/auth/server": { requireIdentity: async () => authenticated ? { state: "authenticated", profile: { user: { id: actorId, role: "manager" } } } : { state: "unavailable" } } } });
  const page = await loaded.default({ searchParams: Promise.resolve({}) }); assert.equal(page.type, "Create"); assert.equal(page.props.actorId, actorId); assert.equal(page.props.role, "manager"); const invalid = await loaded.default({ searchParams: Promise.resolve({ contact_id: "invalid" }) }); assert.equal(find(invalid, "Create").length, 0); authenticated = false; assert.equal((await loaded.default({ searchParams: Promise.resolve({}) })).type, "Unavailable");
});

test("Prefilled creation rejects foreign search/offering IDs and retains an authorized contact through read outage", async () => {
  for (const mode of ["requirement", "offering", "valid"]) {
    const s = dealFormFixture(), h = componentHarness(), requirementId = randomUUID(), offeringId = randomUUID(), query = { value: s.contact }, jsx = (type, props, key) => ({ type, props, key });
    const loaded = loadServer("src/features/deals/deal-create.tsx", { modules: { react: h.react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" }, "next/navigation": { useRouter: () => ({ push() {} }) }, "next/link": { default: "Link" }, "@/components/shared/record-header": { RecordHeader: "Header" }, "@/components/ui/button": { Button: "Button" }, "@/features/contacts/contracts": {}, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { useQuery: () => ({ ...query, refresh() {} }), queryPath: kind => `/api/v1/${kind}` }, "@/features/inventory/contracts": {}, "@/features/requirements/contracts": {}, "@/lib/api/client": { ApiError, apiGet: async path => path.includes("requirements") ? { id: mode === "requirement" ? randomUUID() : requirementId, contact_id: s.contact.id } : { items: [{ id: mode === "offering" ? randomUUID() : offeringId }] } }, "./deal-form": { DealForm: "CreateForm" } }, globals: { AbortController } });
    const props = { context: { contact_id: s.contact.id, requirement_id: requirementId, offering_id: offeringId }, role: "manager", actorId: s.actorId }, render = () => h.render(() => ({ type: loaded.DealCreate, props })); render(); await delay(0); let tree = render();
    if (mode !== "valid") { assert.equal(find(tree, "CreateForm").length, 0); assert.equal(find(tree, "Error")[0].props.error.code, "INVALID_DEAL_CONTEXT"); }
    else { assert.equal(find(tree, "CreateForm")[0].props.actorId, s.actorId); query.value = undefined; query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); tree = render(); assert.equal(find(tree, "CreateForm").length, 1); assert.equal(find(tree, "CreateForm")[0].props.unavailable, true); query.error = new ApiError("FORBIDDEN", 403); assert.equal(find(render(), "CreateForm").length, 0); }
  }
});

test("Affair record retains its opening editor through outage and adopts verified completion without a second reload or stuck busy state", async () => {
  const s = dealFormFixture(), h = componentHarness(), query = { value: s.deal }, jsx = (type, props, key) => ({ type, props, key }), reads = [];
  const commands = { useDealCommand() { const [fresh, setFresh] = h.react.useState(), [busy, setBusy] = h.react.useState(false), [error, setError] = h.react.useState(), [notice, setNotice] = h.react.useState(""); return { fresh, setFresh, busy, setBusy, error, setError, notice, setNotice, reload: async () => { reads.push(true); }, mutate() {} }; } };
  const loaded = loadServer("src/features/deals/deal-record.tsx", { modules: { react: { ...h.react, useCallback: value => value }, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" }, "next/link": { default: "Link" }, "@/components/ui/button": { Button: "Button" }, "@/components/shared/page-header": { PageHeader: "Header" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { useQuery: () => ({ ...query, refresh() {} }) }, "@/features/realtime/current-record": loadServer("src/features/realtime/current-record.ts"), "@/lib/api/client": { ApiError, apiGet() {} }, "./use-deal-command": commands, "./contracts": dealContracts, "./deal-form": { DealForm: "Editor" }, "./deal-workspace": { DealWorkspace: "Workspace" } }, globals: { structuredClone } });
  const render = () => h.render(() => ({ type: loaded.DealRecord, props: { id: s.deal.id, actorId: s.actorId, role: "manager" } })); find(render(), "Workspace")[0].props.onEdit(); let editor = find(render(), "Editor")[0]; assert.equal(editor.props.actorId, s.actorId); editor.props.busyChanged(true); query.value = undefined; query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); editor = find(render(), "Editor")[0]; assert.equal(editor.props.unavailable, true); assert.equal(editor.props.value.version, 7);
  await editor.props.saved(s.deal.id, { ...s.deal, version: 8 }, new AbortController().signal); const workspace = find(render(), "Workspace")[0]; assert.equal(workspace.props.deal.version, 8); assert.equal(workspace.props.busy, false); assert.equal(reads.length, 0); query.error = new ApiError("FORBIDDEN", 403); assert.equal(find(render(), "Workspace").length, 0);
});
