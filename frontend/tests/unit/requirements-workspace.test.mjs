import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve)), plain = value => JSON.parse(JSON.stringify(value));
const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...["children", "actions", "action", "related", "status", "meta"].flatMap(key => find(node.props?.[key], type))]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(view, label) { const result = find(view, "Button").find(node => text(node) === label); assert.ok(result, label); return result; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `requirement-${i}`; },
    useCallback(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, value: fn }; return slots[i].value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(effect => effect()); return result; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } }), contracts = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const ownership = loadServer("src/features/contacts/ownership-contracts.ts", { modules: { "./contracts": contacts } }), at = "2026-10-20T12:00:00Z";
const page = (items, extra = {}) => ({ items, page: 1, page_size: 20, total: items.length, has_next: false, has_previous: false, ...extra });
function contact() { return contacts.contactSchema.parse({ id: randomUUID(), name: "Synthetic requirement contact", type: "person", primary_phone: "+212600000000", primary_email: null, primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, version: 4, archived_at: null, country: "MA", nationality: "", languages: ["french"], calling_code: "+212", phones: [{ number: "+212600000000", label: "", is_primary: true }], emails: [], roles: [], source: "manual", source_submission_id: null, created_by_user_id: null, created_at: at, updated_at: at, collaborators: [] }); }
function offering() { const id = randomUUID(); return inventory.offeringSchema.parse({ id: randomUUID(), property_id: id, target_level: "property", kind: "rental", state: "available", occupied: false, is_current: true, version: 3, price_mad: "11999.99", currency: "MAD", price_period: "month", annual_equivalent_mad: "143999.88", conditions: "Synthetic retained conditions", availability_confirmed_at: at, created_at: at, target: { id, version: 4, development_version: 5, level: "unit", reference: "SYNTH-U201", label: "Synthetic physical unit", location: "Synthetic location", category: "apartment", area_sqm: "80.50", rooms: 2, development_reference: "SYNTH-P", block_code: "B1", floor_code: "F2", unit_type_code: "T2", archived: false } }); }
function requirement(contactId, selected = false) { const item = offering(); return contracts.detailSchema.parse({ ...contracts.blank, id: randomUUID(), contact_id: contactId, title: "Synthetic rental search", version: 1, budget_max_mad: "11999.99", annual_budget_min_mad: null, annual_budget_max_mad: "143999.88", shortlist_count: selected ? 1 : 0, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, shortlist: selected ? [{ offering: item, feedback: "Original feedback", created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at }] : [] }); }
const ui = { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/icons": { SearchIcon: "Icon" }, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/lib/format": { formatMAD: value => value ?? "Non renseigné", formatInstant: value => value }, "./contracts": contracts, "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory, "@/features/contacts/ownership-contracts": ownership, "./requirement-facts": { RequirementFacts: "Facts" }, "./offering-card": { OfferingFacts: "Offering", targetLabels: { standalone: "Bien indépendant", unit: "Unité physique", development: "Programme entier" } }, "./offering-search": { OfferingSearch: "Search" }, "./requirement-form": { RequirementForm: "Form" }, "./shortlist-form": { ShortlistForm: "Shortlist" } };
function setup({ kind = "hook", selected = false, existing = true, writable = true, hydrated = true, command, read, saved } = {}) {
  const h = harness(), parent = contact(), value = requirement(parent.id, selected), offer = selected ? value.shortlist[0].offering : offering(), calls = [], reads = [], denies = [], decisions = [];
  let completed = 0, closed = 0;
  const props = { contactId: parent.id, value: existing ? value : undefined, writable, originalId: selected ? offer.id : undefined, saved: async (result, signal) => { completed++; if (saved) await saved(result, signal); }, denied: error => denies.push(error), cancel: () => closed++ };
  const apiGet = async (path, schema, signal) => { reads.push({ path, signal }); return schema.parse(read ? await read(path, signal) : path.includes("/contacts/") ? parent : path.includes("offerings?") ? page([offer]) : value); };
  const model = loadServer("src/features/requirements/model.ts", { modules: { "@/lib/api/client": { apiGet, ApiError }, "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory, "./contracts": contracts } });
  const commands = loadServer("src/features/requirements/use-requirement-command.tsx", { modules: { ...ui, react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); return args[2].parse(command ? await command(...args) : { id: value.id, version: 2 }); } }, "./model": model }, globals: { AbortController, crypto: { randomUUID } } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} } });
  const modules = { ...ui, react: h.react, "@/components/shared/dossier-form": draft, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: (run, scope) => decisions.push({ run, scope }), dialog: null }) }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "./model": model, "./use-requirement-command": commands };
  const forms = loadServer("src/features/requirements/requirement-form.tsx", { modules }), shortlist = loadServer("src/features/requirements/shortlist-form.tsx", { modules });
  const render = () => h.render(() => kind === "form" ? forms.RequirementForm(props) : kind === "shortlist" ? shortlist.ShortlistForm({ ...props, value }) : commands.useRequirementCommand({ id: existing ? value.id : undefined, writable: props.writable, saved: props.saved, denied: props.denied, compare: signal => model.compareRequirement(parent.id, existing ? value.id : undefined, signal) }));
  const change = (name, next) => { const field = ["Input", "Select", "Textarea"].flatMap(type => find(render(), type)).find(node => node.props.name === name); assert.ok(field, name); field.props.onChange({ target: { value: next } }); };
  const submit = () => find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); render();
  return { h, parent, value, offer, props, calls, reads, denies, decisions, model, modules, commands, render, change, submit, get completed() { return completed; }, get closed() { return closed; } };
}

test("requirement drafts preserve null/false, importance, original rental period and exact large decimal budgets", () => {
  const s = setup(), draft = s.model.editableRequirement({ ...s.value, criteria: [{ key: "parking", value: false, importance: "required" }] });
  assert.equal(draft.criteria.length, 6); assert.equal(draft.criteria[4].value, false); assert.equal(draft.criteria[4].importance, "required"); assert.equal(draft.criteria[2].value, null);
  for (const value of ["0", "-1", "1e3", "1.001", "10000000000000000"]) assert.equal(contracts.fieldsSchema.safeParse({ ...draft, budget_max_mad: value }).success, false);
  assert.ok(contracts.fieldsSchema.safeParse({ ...draft, budget_max_mad: "9999999999999999.99", budget_period: "year" }).success);
  assert.equal(contracts.cents("11999.99") * 12n, 14399988n);
  assert.equal(contracts.fieldsSchema.safeParse({ ...draft, budget_min_mad: "20", budget_max_mad: "19.99" }).success, false);
});

test("requirement command lock rejects duplicate submits and unknown acknowledgement pins method, body and key", async () => {
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) }), path = `/api/v1/requirements/${s.value.id}/shortlist/${s.offer.id}`;
  const pending = s.render().save(path, { expected_version: 1 }, "DELETE"); await s.render().save(path, { expected_version: 2 }, "DELETE"); assert.equal(s.calls.length, 1); assert.ok(s.render().isBusy()); release({ id: s.value.id, version: 2 }); await pending;
  let fail = true; const other = setup({ command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { id: other.value.id, version: 2 }; } });
  const p = `/api/v1/requirements/${other.value.id}/shortlist`;
  await other.render().save(p, { expected_version: 1 }, "POST"); let m = other.render(); assert.ok(m.uncertain); await m.compare(); await m.save(p, { expected_version: 2 }, "POST"); await m.save(p, { expected_version: 1 }, "DELETE"); assert.equal(other.reads.length, 0); assert.equal(other.calls.length, 1);
  fail = false; await m.retry(); assert.equal(other.calls[1][3], other.calls[0][3]); assert.equal(other.calls[1][4], "POST"); assert.deepEqual(plain(other.calls[1][1]), { expected_version: 1 }); assert.equal(other.completed, 1);
});

test("acknowledged write retries only its completion read, including a later read-only context", async () => {
  let fail = true; const s = setup({ saved: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
  await s.render().save(`/api/v1/requirements/${s.value.id}`, { expected_version: 1 }, "PATCH"); assert.ok(s.render().acknowledged); assert.ok(s.render().uncertain);
  s.props.writable = false; fail = false; await s.render().retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed, 2); assert.equal(s.render().uncertain, false);
});

test("authority, hydration, original ID and unmount boundaries forbid late or foreign requirement completion", async () => {
  for (const status of [401, 403, 404]) { const s = setup({ command: async () => { throw new ApiError("FORBIDDEN", status); } }); await s.render().save(`/api/v1/requirements/${s.value.id}`, {}, "PATCH"); assert.equal(s.denies[0].status, status); }
  for (const options of [{ writable: false }, { hydrated: false }]) { const s = setup(options); await s.render().save("/api/v1/requirements", {}, "POST"); assert.equal(s.calls.length, 0); }
  const wrong = setup({ command: async () => ({ id: randomUUID(), version: 2 }) }); await wrong.render().save(`/api/v1/requirements/${wrong.value.id}`, {}, "PATCH"); assert.ok(wrong.render().uncertain); assert.equal(wrong.completed, 0);
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().save(`/api/v1/requirements/${s.value.id}`, {}, "PATCH"); s.h.unmount(); assert.ok(s.calls[0][6].aborted); release({ id: s.value.id, version: 2 }); await pending; assert.equal(s.completed, 0);
});

test("comparison rejects reparenting, archived contacts and foreign or duplicate detail identities", async () => {
  const s = setup({ read: path => path.includes("/contacts/") ? { ...s.parent, id: randomUUID() } : s.value }); assert.match((await s.model.compareRequirement(s.parent.id, s.value.id, new AbortController().signal)).blocked, /associé a changé/); assert.equal(s.reads.length, 1);
  const archived = setup({ read: path => path.includes("/contacts/") ? { ...archived.parent, archived_at: at } : archived.value }); assert.match((await archived.model.compareRequirement(archived.parent.id, archived.value.id, new AbortController().signal)).blocked, /archivé/);
  for (const change of [v => ({ ...v, id: randomUUID() }), v => ({ ...v, contact_id: randomUUID() }), v => ({ ...v, shortlist_count: 2 }), v => ({ ...v, shortlist_count: 2, shortlist: [v.shortlist[0], v.shortlist[0]] })]) { const other = setup({ selected: true, read: () => change(other.value) }); await assert.rejects(other.model.readRequirement(other.value.id, other.parent.id), error => error.status === 503); }
});

test("shortlist comparison rechecks only the exact selected offering page; missing/moved choices and removed originals block adoption", async () => {
  const s = setup(), signal = new AbortController().signal, choice = { offering: s.offer, path: "/api/v1/offerings?kind=rental&page=1&page_size=20&archive=active" };
  assert.equal((await s.model.compareShortlist(s.parent.id, s.value.id, choice, undefined, false, signal)).offering.id, s.offer.id);
  assert.equal(s.reads.filter(read => read.path.includes("offerings?")).length, 1);
  for (const value of [page([]), page([s.offer], { page: 2 }), page([s.offer, s.offer])]) { const other = setup({ read: path => path.includes("/contacts/") ? other.parent : path.includes("offerings?") ? value : other.value }); if (!value.items.length) assert.match((await other.model.compareShortlist(other.parent.id, other.value.id, choice, undefined, false, signal)).blocked, /plus sur la page/); else await assert.rejects(other.model.readChosenOffering(choice, signal), error => error.status === 503); }
  for (const path of ["/api/v1/offerings?page=1&page_size=100", "/api/v1/offerings?page=1&page=2&page_size=20", "/api/v1/offerings/" + s.offer.id]) await assert.rejects(s.model.readChosenOffering({ ...choice, path }, signal), error => error.status === 503);
  const removed = await s.model.compareShortlist(s.parent.id, s.value.id, undefined, s.offer.id, true, signal); assert.match(removed.blocked, /déjà été retirée/);
  const retained = setup({ selected: true, read: path => path.includes("/contacts/") ? retained.parent : { ...retained.value, shortlist: [{ ...retained.value.shortlist[0], offering: { ...retained.offer, target: { ...retained.offer.target, archived: true }, state: "withdrawn" } }] } });
  const current = await retained.model.compareShortlist(retained.parent.id, retained.value.id, undefined, retained.offer.id, false, signal); assert.equal(current.blocked, undefined); assert.equal(current.offering.target.archived, true); assert.equal(retained.reads.length, 2);
});

test("requirement form retains invalid drafts, normalizes decimal commas and sends all six explicit null/false criteria", async () => {
  const s = setup({ kind: "form", existing: false }); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], false);
  s.change("title", "New synthetic search"); s.change("budget_max_mad", "0"); s.submit(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "Input").find(item => item.props.name === "budget_max_mad").props["aria-invalid"], true);
  s.change("budget_max_mad", "11999,99"); s.change("criteria.4.value", "false"); s.change("criteria.2.value", "80,50"); s.change("criteria.2.importance", "required"); s.submit(); await tick();
  assert.equal(s.calls[0][0], "/api/v1/requirements"); const body = s.calls[0][1]; assert.equal(body.contact_id, s.parent.id); assert.equal(body.budget_max_mad, "11999.99"); assert.equal(body.budget_period, "month"); assert.equal(body.criteria[4].value, false); assert.equal(body.criteria[3].value, null); assert.equal(body.criteria[2].value, "80.50"); assert.equal(body.criteria[2].importance, "required");
});

test("requirement conflict comparison preserves entered values until explicit keep or guarded reload", async () => {
  let conflict = true; const s = setup({ kind: "form", command: async () => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409); return { id: s.value.id, version: 9 }; }, read: path => path.includes("/contacts/") ? s.parent : { ...s.value, version: 8, title: "Concurrent source" } });
  s.change("title", "My retained title"); s.submit(); await tick(); let error = find(s.render(), s.commands.RequirementFailure)[0]; await error.props.command.compare(); error = find(s.render(), s.commands.RequirementFailure)[0]; assert.equal(error.props.command.comparison.value.version, 8); assert.equal(find(s.render(), "Input")[0].props.value, "My retained title");
  error.props.reload(error.props.command.comparison); assert.equal(find(s.render(), "Input")[0].props.value, "My retained title"); assert.equal(s.decisions.length, 1);
  error.props.keep(error.props.command.comparison); error.props.command.clear(); conflict = false; s.submit(); await tick(); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].title, "My retained title"); assert.equal(s.calls[0][1].expected_version, 1); assert.notEqual(s.calls[1][3], s.calls[0][3]);
});

test("a populated shortlist locks intent; active writes synchronously refuse cancellation and unknown writes keep recovery guards", async () => {
  const filled = setup({ kind: "form", selected: true }); assert.equal(find(filled.render(), "Select").find(item => item.props.name === "intent").props.disabled, true);
  let release; const s = setup({ kind: "form", command: () => new Promise(resolve => { release = resolve; }) }); s.change("title", "Changed"); s.submit(); button(s.render(), "Annuler").props.onClick(); assert.equal(s.decisions.length, 0); release({ id: s.value.id, version: 2 }); await tick();
  const interrupted = setup({ kind: "form", command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); interrupted.change("title", "Retained after interruption"); interrupted.submit(); await tick(); const view = interrupted.render(); assert.equal(find(view, "form")[0].props["data-write-recovery"], true); assert.equal(find(view, "fieldset")[0].props.disabled, true); button(view, "Annuler").props.onClick(); assert.equal(interrupted.decisions.length, 1); assert.equal(interrupted.closed, 0);
});

test("shortlist add/edit/remove keeps one business draft, exact original IDs and a confirmed version-only deletion", async () => {
  const s = setup({ kind: "shortlist" }); const search = find(s.render(), "Search")[0]; search.props.select({ offering: s.offer, path: "/api/v1/offerings?kind=rental&page=1&page_size=20" }); s.change("feedback", "  Synthetic new opinion  "); s.submit(); await tick();
  assert.equal(s.calls[0][0], `/api/v1/requirements/${s.value.id}/shortlist`); assert.equal(s.calls[0][1].offering_id, s.offer.id); assert.equal(s.calls[0][1].expected_offering_version, s.offer.version); assert.equal(s.calls[0][1].feedback, "Synthetic new opinion"); assert.equal(s.calls[0][4], "POST");
  const original = setup({ kind: "shortlist", selected: true }); assert.equal(find(original.render(), "Search").length, 0); original.change("feedback", "Updated retained opinion"); original.submit(); await tick(); assert.equal(original.calls[0][1].offering_id, original.offer.id);
  const removing = setup({ kind: "shortlist", selected: true }); find(removing.render(), "Select")[0].props.onChange({ target: { value: "remove" } }); removing.submit(); let view = removing.render(); assert.equal(removing.calls.length, 0); assert.equal(find(view, "AlertDialog").length, 1); assert.equal(find(view, "Textarea").length, 0); button(view, "Confirmer le retrait").props.onClick(); button(view, "Confirmer le retrait").props.onClick(); await tick(); assert.equal(removing.calls.length, 1); assert.equal(removing.calls[0][0], `/api/v1/requirements/${removing.value.id}/shortlist/${removing.offer.id}`); assert.equal(removing.calls[0][4], "DELETE"); assert.deepEqual(plain(removing.calls[0][1]), { expected_version: 1 });
});

function workspace(h, s, query, extra = {}) { const calls = [], modules = { ...s.modules, ...extra, "./use-requirement-command": {}, "@/features/contacts/use-query": { queryPath: (kind, values) => `/api/v1/${kind}?${new URLSearchParams(values)}`, useQuery: path => { calls.push(path); return query; } }, react: h.react }; return { ...loadServer("src/features/requirements/requirement-panel.tsx", { modules }), calls }; }

test("collection shows compact cards and inline selections, one focused editor and conditional numbered navigation", async () => {
  const h = harness(), s = setup(), summary = contracts.requirementSchema.parse(Object.fromEntries(Object.entries(s.value).filter(([key]) => key !== "shortlist"))), query = { value: page([summary]), refresh() {} }, loaded = workspace(h, s, query), props = { contactId: s.parent.id, writable: true, denied: error => s.denies.push(error) }, render = () => h.render(() => loaded.RequirementWorkspace(props));
  let view = render(); assert.equal(find(view, "Entry").length, 1); assert.equal(find(view, "Pages").length, 0); assert.equal(find(view, loaded.RequirementShortlist).length, 0); assert.equal(find(view, "table").length, 0); assert.equal(loaded.calls[0].includes("page_size=20"), true);
  button(view, "Modifier").props.onClick(); view = render(); assert.equal(find(view, "Entry").length, 0); const editor = find(view, loaded.RequirementEditor)[0]; assert.equal(editor.props.selection.id, s.value.id); assert.equal(editor.props.selection.mode, "edit"); editor.props.cancel();
  query.value = page([{ ...summary, shortlist_count: 1 }]); view = render(); assert.equal(find(view, loaded.RequirementShortlist).length, 1); query.value = page([], { page: 2, has_previous: true, total: 1 }); query.value.page = 1; query.value.has_next = true; view = render(); assert.equal(find(view, "Pages").length, 1);
  query.error = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Entry").length, 0); assert.equal(find(view, loaded.RequirementEditor).length, 0); assert.equal(s.denies.at(-1).status, 403);
});

test("boundary retries a fresh private lifetime; canonical contact aliases select the survivor workspace", () => {
  const h = harness(), s = setup(), query = { value: s.parent, refresh() {} }, loaded = workspace(h, s, query), node = loaded.RequirementPanel({ contactId: s.parent.id, writable: true }), render = () => h.render(() => node.type(node.props));
  let view = render(), lifetime = view.key; const context = view; context.props.denied(new ApiError("FORBIDDEN", 403)); view = render(); assert.equal(view.type, "Error"); view.props.retry(); view = render(); assert.notEqual(view.key, lifetime);
  const contextHarness = harness(), canonical = contact(); query.value = canonical; const again = workspace(contextHarness, s, query), outer = again.RequirementPanel({ contactId: s.parent.id, writable: true }); const boundary = contextHarness.render(() => outer.type(outer.props)); const childHarness = harness(), contextModule = workspace(childHarness, s, query); const childBoundary = contextModule.RequirementPanel({ contactId: s.parent.id, writable: true }); const child = childHarness.render(() => childBoundary.type(childBoundary.props)); const result = child.type(child.props); assert.equal(result.props.contactId, canonical.id); assert.equal(boundary.props.contactId, s.parent.id);
});

test("inline shortlist/history masks private data after denial and keeps real actor, original offer and body", () => {
  const h = harness(), s = setup({ selected: true }), query = { value: s.value, refresh() {} }, loaded = workspace(h, s, query), props = { value: s.value, contactId: s.parent.id, writable: true, denied: error => s.denies.push(error), ready() {}, edit() {}, revision: 0 }, render = () => h.render(() => loaded.RequirementShortlist(props));
  let view = render(); assert.equal(find(view, "Entry")[0].props.variant, "related"); assert.ok(text(view).includes("Original feedback")); assert.equal(find(view, "Offering")[0].props.offering.id, s.offer.id); query.error = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Entry").length, 0); assert.ok(!text(view).includes("Original feedback"));
  const hh = harness(), event = { id: randomUUID(), contact_id: s.parent.id, actor: { id: randomUUID(), display_name: "Synthetic actual author" }, action: "requirements.updated", reason: "Synthetic reason", occurred_at: at, enquiry_id: null, body: "Synthetic actual change", related_contact_id: null, deal_id: null }, historyQuery = { value: ownership.timelineSchema.parse(page([event])), refresh() {} }, history = workspace(hh, s, historyQuery), renderHistory = () => hh.render(() => history.RequirementHistory({ contactId: s.parent.id, page: 1, changePage() {}, denied: props.denied, revision: 0 }));
  view = renderHistory(); assert.equal(find(view, "Entry")[0].props.title, "Recherche modifiée"); assert.equal(find(view, "Entry")[0].props.meta[1].value, "Synthetic actual author"); assert.ok(text(view).includes(event.body)); historyQuery.value = page([{ ...event, contact_id: randomUUID() }]); view = renderHistory(); assert.equal(find(view, "Entry").length, 0); assert.equal(find(view, "Error").length, 1);
});

test("picker filtering remains separate from the business draft and preserves explicit states, exact choices and hierarchy filters", () => {
  const h = harness(), s = setup(), query = { value: page([s.offer]), refresh() {} }, selections = [], paths = [];
  const loaded = loadServer("src/features/requirements/offering-search.tsx", { modules: { ...s.modules, react: h.react, "@/features/contacts/use-query": { queryPath: (kind, values) => `/api/v1/${kind}?${new URLSearchParams(Object.entries(values).filter(([,value]) => value !== ""))}`, useQuery: path => { paths.push(path); return query; } }, "@/features/inventory/level-picker": { LevelPicker: "Level" }, "./development-filter": { DevelopmentFilter: "Development" } } });
  const props = { requirement: s.value, disabled: false, select: value => selections.push(value), denied: error => s.denies.push(error) }, render = () => h.render(() => loaded.OfferingSearch(props)); let view = render(); assert.equal(find(view, "form").length, 0); assert.equal(view.props["data-filter-panel"], true); assert.equal(find(view, "Pages").length, 0); assert.equal(new URL(paths[0], "https://example.com").searchParams.has("archive"), false); assert.ok(paths[0].includes("kind=rental"));
  const state = find(view, "Select")[0]; assert.ok(text(state).includes("Tous les statuts")); assert.ok(text(state).includes("Retirées")); state.props.onChange({ target: { value: "all" } }); button(render(), "Filtrer les offres").props.onClick(); view = render(); assert.ok(paths.at(-1).includes("state=all"));
  find(view, "Select").at(-1).props.onChange({ target: { value: s.offer.id } }); assert.equal(selections[0].offering.id, s.offer.id); assert.equal(selections[0].path, paths.at(-1)); props.choice = selections[0];
  find(view, "Development")[0].props.change(randomUUID()); view = render(); assert.equal(find(view, "Level").length, 2); assert.ok(find(view, "Level").every(node => node.props.pageSize === 20));
  query.error = new ApiError("FORBIDDEN", 403); view = render(); assert.ok(!text(view).includes(s.offer.target.reference)); assert.equal(s.denies.at(-1).status, 403); assert.equal(find(view, "Error").length, 1);
});


test("explicit shortlist conflict acceptance adopts current versions while retaining the opinion and original offering ID", async () => {
  let fail = true; const s = setup({ kind: "shortlist", selected: true, command: async () => { if (fail) throw new ApiError("OFFERING_VERSION_CONFLICT", 409); return { id: s.value.id, version: 9 }; }, read: path => path.includes("/contacts/") ? s.parent : { ...s.value, version: 8, shortlist: [{ ...s.value.shortlist[0], feedback: "Concurrent opinion", offering: { ...s.offer, version: 7 } }] } });
  s.change("feedback", "My preserved opinion"); s.submit(); await tick(); let failure = find(s.render(), s.commands.RequirementFailure)[0]; await failure.props.command.compare(); failure = find(s.render(), s.commands.RequirementFailure)[0]; assert.equal(failure.props.command.comparison.offering.version, 7); assert.equal(find(s.render(), "Textarea")[0].props.value, "My preserved opinion");
  failure.props.keep(failure.props.command.comparison); failure.props.command.clear(); fail = false; s.submit(); await tick(); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].expected_offering_version, 7); assert.equal(s.calls[1][1].offering_id, s.offer.id); assert.equal(s.calls[1][1].feedback, "My preserved opinion");
});

test("comparison cannot turn a changed intent, newly selected offer or archived discovery target into an automatic add", async () => {
  const signal = new AbortController().signal;
  for (const mode of ["intent", "selected", "archived"]) {
    const s = setup({ read: path => path.includes("/contacts/") ? s.parent : path.includes("offerings?") ? page([{ ...s.offer, target: { ...s.offer.target, archived: mode === "archived" } }]) : mode === "intent" ? { ...s.value, intent: "sale", budget_period: null } : mode === "selected" ? { ...s.value, shortlist_count: 1, shortlist: [{ offering: s.offer, feedback: null, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at }] } : s.value });
    const current = await s.model.compareShortlist(s.parent.id, s.value.id, { offering: s.offer, path: "/api/v1/offerings?kind=rental&page=1&page_size=20" }, undefined, false, signal); assert.equal(typeof current.blocked, "string");
  }
});

test("collection completion requires a same-parent projection at least as new as the acknowledged result", async () => {
  const h = harness(), s = setup(), query = { value: page([]), refresh() {} }, loaded = workspace(h, s, query), render = () => h.render(() => loaded.RequirementWorkspace({ contactId: s.parent.id, writable: true, denied() {} })); button(render(), "Nouvelle recherche").props.onClick();
  const form = find(render(), "Form")[0]; await assert.rejects(form.props.saved({ id: s.value.id, version: 2 }, new AbortController().signal), error => error.status === 503); assert.equal(find(render(), "Form").length, 1);
  const signal = new AbortController(); signal.abort(); await form.props.saved({ id: s.value.id, version: 1 }, signal.signal); assert.equal(find(render(), "Form").length, 1);
  await form.props.saved({ id: s.value.id, version: 1 }, new AbortController().signal); assert.equal(find(render(), "Form").length, 0); assert.ok(text(render()).includes("Recherche, sélection ou avis enregistré."));
});

test("deferred shortlist focus restores the precise card action and scroll without stealing later user focus", () => {
  const s = setup(), focused = [], body = { scrollTop: 0 }, heading = { focus: () => focused.push("heading") }, target = { focus: () => focused.push("target") }, card = { querySelector: () => undefined }, root = { ownerDocument: { activeElement: heading }, querySelector: () => card, closest: () => body }, request = { id: s.value.id, offeringId: s.offer.id, action: "edit", scroll: 312 };
  assert.equal(s.model.restoreRequirementReturn(root, heading, request), false); assert.deepEqual(focused, ["heading"]); root.ownerDocument.activeElement = target; assert.equal(s.model.restoreRequirementReturn(root, heading, request, s.value.id), true); assert.deepEqual(focused, ["heading"]);
  const fresh = { ...request, started: false }; root.ownerDocument.activeElement = heading; card.querySelector = () => ({ querySelector: () => target }); assert.equal(s.model.restoreRequirementReturn(root, heading, fresh, s.value.id), true); assert.equal(focused.at(-1), "target"); assert.equal(body.scrollTop, 312);
});
