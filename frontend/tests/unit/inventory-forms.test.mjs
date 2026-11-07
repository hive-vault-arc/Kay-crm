import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";
import { loadRecordCommand } from "./record-command-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type || node.type?.name === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.action, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(tree, label) { const found = find(tree, "Button").find(node => text(node) === label || node.props["aria-label"] === label); assert.ok(found, label); return found; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const developments = loadServer("src/features/inventory/development-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "./contracts": contracts } });
const queryPath = (kind, values) => `/api/v1/${kind}?${new URLSearchParams(values).toString()}`;
const owner = (name = "Synthetic legal owner") => ({ contact: { id: randomUUID(), name }, marketing_display: null });
const development = (changes = {}) => developments.developmentSchema.parse({ id: randomUUID(), reference: "SYN-P", name: "Synthetic programme", version: 7, category: "mixed", location: null, unit_count: 0, available_unit_count: 0, archived_at: null, offerings: [], owners: [], developer: { marketing_display: null, contact: null }, briefing_text: null, created_at: "2026-10-20T12:00:00Z", updated_at: "2026-10-20T12:00:00Z", ...changes });
const block = (parent, changes = {}) => ({ id: randomUUID(), development_id: parent, code: "B1", label: "Synthetic block", display_order: 0, ...changes });
const page = (items, changes = {}) => ({ items, total: items.length, page: 1, page_size: 100, has_previous: false, has_next: false, ...changes });
function model(read = async () => { throw new Error("unexpected read"); }) { return loadServer("src/features/inventory/inventory-form-model.ts", { modules: { "@/lib/api/client": { apiGet: read, ApiError }, "@/features/contacts/use-query": { queryPath }, "./development-contracts": developments } }); }

function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useId() { const i = cursor++; return slots[i] ??= `synthetic-${i}`; },
    createContext(value) { return { value }; }, useContext(context) { return context.value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const view = run(); effects.splice(0).forEach(effect => effect()); return view; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function setup(kind = "owners", { source = development(), item, read, command, hydrated = true } = {}) {
  const h = harness(), calls = [], reads = [], decisions = [], events = []; let saved = 0, cancelled = 0;
  const apiGet = async (...args) => { reads.push(args); if (!read) throw new Error("unexpected read"); return read(...args); };
  const fields = model(apiGet);
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const useCommand = loadRecordCommand(h, { source, ErrorType: ApiError, hydrated, command: async (...args) => { calls.push(args); return command ? command(...args) : undefined; } })
  const loaded = loadServer(`src/features/inventory/${kind === "owners" ? "owner-editor" : "hierarchy-editor"}.tsx`, { modules: {
    react: h.react, "react/jsx-runtime": runtime, "@/components/icons": { OwnerIcon: "OwnerIcon", BlockIcon: "BlockIcon" }, "@/components/shared/dossier-form": draft, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: "Discard dialog", request: (run, scope) => decisions.push({ run, scope }) }) }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/features/contacts/contact-selector": { ContactSelector: "Chooser" }, "@/features/contacts/record-states": { RecordError: "RecordError" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { apiGet, ApiError }, "./contracts": contracts, "./development-contracts": developments, "./inventory-form-model": fields, "./states": { InventoryError: "Error" }, "./use-record-command": useCommand,
  }, globals: { AbortController } });
  const props = kind === "owners" ? { property: { ...source, inventoryLevel: "development" }, saved: () => saved++, cancel: () => cancelled++ } : { development: source, kind, parent: kind === "floors" ? item?.block_id ?? randomUUID() : source.id, item, saved: () => saved++, cancel: () => cancelled++ };
  const render = () => { const tree = h.render(() => kind === "owners" ? loaded.OwnerEditor(props) : loaded.HierarchyEditor(props)); const form = find(tree, "form")[0]; if (form?.props.ref) form.props.ref.current = { querySelector: () => ({ focus() {} }) }; return tree; };
  render();
  return { ...h, render, calls, reads, decisions, events, props, saved: () => saved, cancelled: () => cancelled, change(key, value) { find(render(), "Input").find(node => node.props.name === key).props.onChange({ target: { value } }); }, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); } };
}

test("Hierarchy values preserve exact optional defaults and validate real, distinct block/type payloads", () => {
  const m = model(), id = randomUUID(), type = { ...block(id), category: "apartment", default_area_sqm: "108.50", default_rooms: 3 };
  const values = m.hierarchyValues(type); assert.equal(values.default_area_sqm, "108.50"); assert.equal(values.default_rooms, "3");
  const body = m.hierarchyBody("unit-types", id, 9, { ...values, default_area_sqm: "108,50" }); assert.equal(body.success, true); assert.equal(body.data.default_area_sqm, "108.50"); assert.equal(body.data.expected_version, 9); assert.equal(Object.hasOwn(body.data, "display_order"), false);
  for (const display_order of ["", "-1", "1.5", "1000001", "1e3"]) assert.equal(m.hierarchyBody("blocks", id, 7, { ...values, display_order }).success, false);
  assert.equal(m.hierarchyBody("floors", id, 7, { ...values, display_order: "0" }).success, true);
  for (const default_rooms of ["0", "-1", "1.2", "1001"]) assert.equal(m.hierarchyBody("unit-types", id, 7, { ...values, default_rooms }).success, false);
});

test("Hierarchy conflict read finds the exact item on numbered pages and brackets it with the parent version", async () => {
  const source = development(), current = block(source.id), paths = [], signal = new AbortController().signal;
  const m = model(async (path, schema, received) => { paths.push(path); assert.equal(received, signal); return schema.parse(path.includes("?") ? page(path.includes("page=2&") ? [current] : [block(source.id)], path.includes("page=2&") ? { page: 2, total: 101, has_previous: true } : { total: 101, has_next: true }) : source); });
  const result = await m.readHierarchyComparison(source.id, "blocks", source.id, current.id, signal);
  assert.equal(result.item.id, current.id); assert.equal(result.development.version, 7); assert.equal(paths.length, 4); assert.ok(paths[2].includes("page=2&page_size=100")); assert.equal(paths[0], paths[3]);
});

test("Hierarchy comparisons reject changing versions, foreign parents, missing items and malformed page identity", async () => {
  const source = development(), current = block(source.id), signal = new AbortController().signal;
  for (const scenario of ["changed", "foreign", "missing", "page"]) {
    let parents = 0; const m = model(async path => path.includes("?") ? page(scenario === "missing" ? [] : [{ ...current, development_id: scenario === "foreign" ? randomUUID() : source.id }], { page: scenario === "page" ? 2 : 1 }) : { ...source, version: scenario === "changed" && parents++ ? 8 : 7 });
    await assert.rejects(m.readHierarchyComparison(source.id, "blocks", source.id, current.id, signal), error => error.code === (scenario === "changed" ? "INVENTORY_VERSION_CONFLICT" : scenario === "missing" ? "NOT_FOUND" : "DEPENDENCY_UNAVAILABLE"));
  }
});

test("Floor/type comparisons keep their real parent routes and never infer placement from an item label", async () => {
  const source = development(), parent = randomUUID(), signal = new AbortController().signal;
  for (const kind of ["floors", "unit-types"]) {
    const item = kind === "floors" ? { id: randomUUID(), block_id: parent, code: "F1", label: "Floor", display_order: 0 } : { id: randomUUID(), development_id: source.id, code: "T3", label: "Type", category: "apartment", default_area_sqm: null, default_rooms: null };
    const paths = [], m = model(async (path, schema) => { paths.push(path); return schema.parse(path.includes("?") ? page([item]) : source); });
    const result = await m.readHierarchyComparison(source.id, kind, parent, item.id, signal);
    assert.equal(result.item.id, item.id); assert.equal(paths[1].split("?")[0], `/api/v1/${kind === "floors" ? `blocks/${parent}/floors` : `developments/${source.id}/unit-types`}`);
  }
});

test("Legal owners cannot replace a projection containing protected identities; explicit reload can recover a complete list", async () => {
  const known = owner(), source = development({ owners: [known, { contact: null, marketing_display: "Shared synthetic label" }] });
  const s = setup("owners", { source, read: async () => ({ ...source, owners: [known] }) });
  assert.equal(find(s.render(), "Chooser").length, 0); assert.equal(button(s.render(), "Enregistrer").props.disabled, true); s.submit(); assert.equal(s.calls.length, 0);
  button(s.render(), "Recharger les propriétaires").props.onClick(); await delay(0); assert.equal(find(s.render(), "Chooser").length, 1); assert.equal(find(s.render(), "Input")[0].props.value, "");
  s.submit(); await delay(0); assert.equal(s.calls[0][1].owners.length, 1); assert.equal(s.calls[0][1].owners[0].marketing_display, null);
});

test("Legal owner selection is managed data, deduplicates rapid choices and never copies private names to shared text", async () => {
  const s = setup(), selected = owner("Private synthetic name").contact, choose = find(s.render(), "Chooser")[0].props.choose;
  assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined); choose(selected); choose(selected);
  assert.equal(find(s.render(), "Input").length, 1); assert.equal(find(s.render(), "Input")[0].props.value, ""); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
  find(s.render(), "Input")[0].props.onChange({ target: { value: " Shared chosen label " } }); s.submit(); await delay(0);
  assert.deepEqual(plain(s.calls[0][1].owners), [{ contact_id: selected.id, marketing_display: "Shared chosen label" }]); assert.equal(s.saved(), 1);
});

test("Legal-owner interrupted commands retain exact retry identity, lock duplicates and protect the active draft", async () => {
  let release, fail = true; const source = development({ owners: [owner()] });
  const s = setup("owners", { source, command: async () => { if (fail) await new Promise(resolve => { release = resolve; }); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { development_id: source.id }; } });
  find(s.render(), "Input")[0].props.onChange({ target: { value: "Draft display" } }); s.submit(); s.submit(); await delay(0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); release(); await delay(0);
  assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); fail = false; s.submit(); await delay(0); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1])); assert.equal(s.saved(), 1);
});

test("Legal-owner conflicts compare complete current links before explicit rebase and guard destructive reload", async () => {
  const source = development({ owners: [owner()] }), newer = { ...source, version: 9, owners: [owner("Added concurrently")] };
  let fail = true; const s = setup("owners", { source, command: async () => { if (fail) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return { development_id: source.id }; }, read: async () => newer });
  find(s.render(), "Input")[0].props.onChange({ target: { value: "Retained draft" } }); s.submit(); await delay(0);
  button(s.render(), "Comparer les propriétaires actuels").props.onClick(); await delay(0); assert.equal(find(s.render(), "Input")[0].props.value, "Retained draft"); assert.equal(button(s.render(), "Enregistrer").props.disabled, true);
  button(s.render(), "Recharger cette liste").props.onClick(); assert.equal(s.decisions.length, 1); assert.equal(find(s.render(), "Input")[0].props.value, "Retained draft");
  button(s.render(), "Conserver ma liste sur cette version").props.onClick(); fail = false; s.submit(); await delay(0); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].owners[0].contact_id, source.owners[0].contact.id); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});

test("Legal-owner denial removes private fields, foreign snapshots cannot be adopted and unmount prevents late success", async () => {
  const source = development({ owners: [owner()] }), denied = setup("owners", { source, command: async () => { throw new ApiError("FORBIDDEN", 403); } }); denied.submit(); await delay(0); assert.equal(find(denied.render(), "Input").length, 0); assert.equal(find(denied.render(), "RecordError")[0].props.error.code, "FORBIDDEN");
  const foreign = setup("owners", { source: development({ owners: [{ contact: null, marketing_display: null }] }), read: async () => source }); button(foreign.render(), "Recharger les propriétaires").props.onClick(); await delay(0); assert.equal(find(foreign.render(), "Chooser").length, 0); assert.equal(find(foreign.render(), "RecordError")[0].props.error.code, "INVALID_RESPONSE");
  let release; const late = setup("owners", { source, command: () => new Promise(resolve => { release = resolve; }) }); late.submit(); await delay(0); late.unmount(); release({ development_id: source.id }); await delay(0); assert.equal(late.saved(), 0);
});

test("Hierarchy form validates before writing, retains the draft on failure and routes each kind correctly", async () => {
  for (const kind of ["blocks", "floors", "unit-types"]) {
    let fail = true; const s = setup(kind, { command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return {}; } });
    s.submit(); assert.equal(s.calls.length, 0); s.change("code", " New "); s.change("label", " New element "); s.submit(); await delay(0);
    assert.equal(s.calls[0][4], "POST"); assert.equal(s.calls[0][0], `/api/v1/${kind === "floors" ? "blocks" : "developments"}/${s.props.parent}/${kind}`); assert.equal(s.calls[0][1].expected_version, 7); assert.equal(s.calls[0][1].code, "New"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
    fail = false; s.submit(); await delay(0); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.saved(), 1);
  }
});

test("Hierarchy comparison keeps edited fields until a guarded reload; current item defaults and version are adopted together", async () => {
  const source = development(), original = block(source.id), newer = { ...original, label: "Current server label", display_order: 4 };
  const s = setup("blocks", { source, item: original, command: async () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: async path => path.includes("?") ? page([newer]) : { ...source, version: 9 } });
  s.change("label", "My draft"); s.submit(); await delay(0); button(s.render(), "Comparer la version actuelle").props.onClick(); await delay(0);
  assert.equal(find(s.render(), "Input").find(node => node.props.name === "label").props.value, "My draft"); button(s.render(), "Recharger cet élément").props.onClick(); assert.equal(s.decisions.length, 1);
  s.decisions[0].run(); assert.equal(find(s.render(), "Input").find(node => node.props.name === "label").props.value, newer.label); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  s.change("label", "After comparison"); s.submit(); await delay(0); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][4], "PATCH"); assert.equal(s.calls[1][0], `/api/v1/blocks/${original.id}`);
});

test("Archived hierarchy and protected comparison state cannot write; a denial clears the editor", async () => {
  const archived = setup("blocks", { source: development({ archived_at: "2026-10-21T12:00:00Z" }) }); archived.change("code", "X"); archived.change("label", "X"); archived.submit(); assert.equal(archived.calls.length, 0); assert.equal(button(archived.render(), "Enregistrer").props.disabled, true);
  const denied = setup("blocks", { command: async () => { throw new ApiError("FORBIDDEN", 403); } }); denied.change("code", "X"); denied.change("label", "X"); denied.submit(); await delay(0); assert.equal(find(denied.render(), "Input").length, 0); assert.equal(find(denied.render(), "form").length, 0);
});

test("Hierarchy comparison reads abort on unmount, and pre-hydration submissions never issue commands", async () => {
  let resolve, signal; const s = setup("blocks", { command: async () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: (...args) => { signal = args[2]; return new Promise(done => { resolve = done; }); } });
  s.change("code", "X"); s.change("label", "X"); s.submit(); await delay(0); button(s.render(), "Comparer la version actuelle").props.onClick(); await delay(0);
  assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); s.unmount(); assert.equal(signal.aborted, true); resolve(s.props.development); await delay(0);
  const cold = setup("blocks", { hydrated: false }); cold.change("code", "X"); cold.change("label", "X"); cold.submit(); assert.equal(cold.calls.length, 0);
});

test("Unknown legal-owner saves retain the full original list and block stale picker, input and cancel handlers", async () => {
  let lost = true; const source = development({ owners: [owner()] }), s = setup("owners", { source, command: () => { if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return {}; } });
  const initial = s.render(), input = find(initial, "Input")[0], chooser = find(initial, "Chooser")[0]; input.props.onChange({ target: { value: "Original shared owner label" } }); s.submit(); await delay(0);
  const view = s.render(); assert.equal(find(view, "form")[0].props["data-write-recovery"], true); assert.equal(button(view, "Annuler").props.disabled, true); button(view, "Annuler").props.onClick(); assert.equal(s.cancelled(), 0);
  input.props.onChange({ target: { value: "Replacement" } }); chooser.props.choose({ id: randomUUID(), name: "Other synthetic contact" }); assert.equal(find(s.render(), "Input")[0].props.value, "Original shared owner label");
  lost = false; s.submit(); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].owners.length, 1); assert.equal(s.calls[1][1].owners[0].marketing_display, "Original shared owner label"); assert.equal(s.saved(), 1);
});
test("Unknown hierarchy saves retain the opening block/type fields and protect Return without another intent", async () => {
  let lost = true; const s = setup("unit-types", { command: () => { if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return {}; } }); s.change("code", "SYN-TYPE"); s.change("label", "Synthetic type"); s.change("default_area_sqm", "108,50"); s.change("default_rooms", "3"); const original = s.render(); s.submit(); await delay(0);
  const view = s.render(); assert.equal(find(view, "fieldset")[0].props.disabled, true); assert.equal(button(view, "Retour").props.disabled, true); button(view, "Retour").props.onClick(); assert.equal(s.cancelled(), 0);
  find(original, "Input").find(node => node.props.name === "code").props.onChange({ target: { value: "OTHER" } }); assert.equal(find(s.render(), "Input").find(node => node.props.name === "code").props.value, "SYN-TYPE"); lost = false; s.submit(); await delay(0); assert.equal(s.calls[1][1].code, "SYN-TYPE"); assert.equal(s.calls[1][1].default_area_sqm, "108.50"); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.saved(), 1);
});

test("Structure panels query one collection, replace the list with one editor and guard returning to its cards", () => {
  const h = harness(), source = development(), original = block(source.id), requests = [], decisions = [];
  const loaded = loadServer("src/features/inventory/hierarchy-panel.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: run => decisions.push(run) }) }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { queryPath, useQuery: path => { requests.push(path); return { value: page([original], { page_size: 25 }), refresh() {} }; } }, "./development-contracts": developments, "./hierarchy-editor": { HierarchyEditor: "Editor", HierarchyEntry: "Entry" } } });
  const render = () => h.render(() => loaded.HierarchyPanel({ development: source, writable: true, saved() {} }));
  button(render(), "Modifier B1").props.onClick(); const tree = render(); assert.equal(find(tree, "Editor").length, 1); assert.equal(find(tree, "Entry").length, 0); assert.equal(find(tree, "Pages").length, 0); assert.ok(requests.every(path => path.includes("/blocks?")));
  find(tree, "Editor")[0].props.cancel(); assert.equal(decisions.length, 1); assert.equal(find(render(), "Editor").length, 1); decisions[0](); assert.equal(find(render(), "Entry").length, 1);
});
