import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value)), tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const contracts = loadServer("src/features/generated/contracts.ts");
const model = loadServer("src/features/generated/preparation-model.ts", { modules: { "./contracts": contracts }, globals: { TextEncoder } });
const template = (code = "01") => ({ code, title: `Synthetic model ${code}`, warning: "Synthetic draft warning", fields: [{ key: "client_name", label: "Client", group: "Identité", multiline: false }, { key: "notes", label: "Notes", group: "Préparation", multiline: true }] });
const id = randomUUID(), item = code => contracts.generatedItemSchema.parse({ id: randomUUID(), template_code: code, filename: "synthetic.pdf", version: 1, version_id: randomUUID(), size_bytes: 1024, created_at: "2026-10-20T12:00:00Z" });
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `preparation-${i}`; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(effect => effect()); return result; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function setup({ command, hydrated = true, canGenerate = true, workspace = false } = {}) {
  const h = harness(), calls = [], refreshes = [], events = [], props = { parentKind: "enquiry", id };
  const context = { value: contracts.generatedContextSchema.parse({ templates: [template(), template("02"), template("10")], defaults: { client_name: "Synthetic client", notes: "", other_model_field: "unrelated" }, can_generate: canGenerate }), refresh() { refreshes.push("context"); } };
  const documents = { context, history: { value: { total: 7 }, refresh() { refreshes.push("history"); } }, refresh() { refreshes.push("generated"); } };
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { Event, window: { dispatchEvent: event => events.push(event.type) } } });
  const { usePreparation } = loadServer("src/features/generated/use-preparation.ts", { modules: { react: h.react, "@/components/shared/dossier-form": draft, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); return command ? command(...args) : item(args[1].template_code); } }, "@/lib/api/client": { ApiError }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "./contracts": contracts, "./preparation-model": model }, globals: { crypto: { randomUUID }, AbortController, queueMicrotask } });
  let preparation;
  const useController = () => preparation = usePreparation({ ...props, documents });
  const loaded = workspace ? loadServer("src/features/generated/document-workspace.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/icons": { AlertIcon: "Icon", CheckIcon: "Check", FileIcon: "Icon" }, "@/components/shared/page-header": { PageHeader: "Header" }, "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "DialogContent", AlertDialogDescription: "Description", AlertDialogTitle: "DialogTitle" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/skeleton": { Skeleton: "Skeleton" }, "@/components/ui/tabs": { Tabs: "Tabs", TabsList: "TabsList", TabsTrigger: "Tab", TabsContent: "Panel" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/features/contacts/record-states": { RecordError: "Error" }, "./prepared-documents": { usePreparedDocuments: () => documents, PreparedDocumentHistory: "History" }, "./use-preparation": { usePreparation: useController } } }) : {};
  const render = () => h.render(() => workspace ? loaded.PreparationWorkspace(props) : useController());
  render();
  return { ...loaded, h, calls, refreshes, events, documents, context, render, get state() { return preparation; } };
}

test("preparation admits only the selected model fields and preserves exact Unicode strings and blank values", () => {
  const values = { client_name: "Élodie 🏡", notes: "Line one\n\tLine two", unknown: "must not send" };
  const parsed = model.preparationBody("deal", id, template(), values); assert.ok(parsed.success);
  assert.deepEqual(plain(parsed.body.values), { client_name: values.client_name, notes: values.notes });
  assert.deepEqual(plain(model.preparationValues(template(), { client_name: "Default" }, { client_name: "" })), { client_name: "", notes: "" });
  assert.equal(model.preparationBody("deal", id, template(), { client_name: "🏡".repeat(300) }).success, true);
  for (const values of [{ client_name: "x".repeat(301) }, { client_name: "line\nbreak" }, { notes: "x".repeat(1001) }, { notes: "\u202econtrol" }, { notes: "\u0000" }]) assert.equal(model.preparationBody("deal", id, template(), values).success, false);
});

test("catalog rejects duplicate model/field identities, and UTF-8 request bounds apply after exact field selection", () => {
  assert.equal(contracts.generatedContextSchema.safeParse({ defaults: {}, can_generate: true, templates: [template(), template()] }).success, false);
  assert.equal(contracts.templateSchema.safeParse({ ...template(), fields: [template().fields[0], template().fields[0]] }).success, false);
  const large = { ...template(), fields: Array.from({ length: 30 }, (_, i) => ({ key: `long_${i}`, label: "Notes", group: "Notes", multiline: true })) };
  assert.equal(model.preparationBody("deal", id, large, Object.fromEntries(large.fields.map(field => [field.key, "🏡".repeat(1000)]))).success, false);
});

test("prefill and model selection remain clean; edits survive model and history changes", async () => {
  const s = setup(); await tick(); assert.equal(s.render().dirty, false); s.state.choose("02"); assert.equal(s.render().dirty, false);
  s.state.change("client_name", "Synthetic edited B"); s.render(); s.state.choose("01"); assert.equal(s.render().values.client_name, "Synthetic client");
  s.state.change("notes", "Synthetic draft A"); s.render(); s.state.selectTab("history"); assert.equal(s.render().dirty, true); assert.equal(s.state.historyVisited, true);
  s.state.choose("02"); assert.equal(s.render().values.client_name, "Synthetic edited B"); s.state.choose("hidden"); assert.equal(s.render().selectedCode, "02"); assert.equal(s.calls.length, 0);
});

test("generating one model accepts only that model baseline, retaining another model's unsaved changes", async () => {
  const s = setup(); s.state.change("notes", "Synthetic A"); s.render(); s.state.choose("02"); s.render(); s.state.change("notes", "Synthetic B"); s.render();
  await s.state.generate(); assert.equal(s.render().tab, "history"); assert.equal(s.state.dirty, true); assert.deepEqual(s.refreshes, ["generated"]);
  assert.deepEqual(plain(s.calls[0][1]), { parent_kind: "enquiry", parent_id: id, template_code: "02", values: { client_name: "Synthetic client", notes: "Synthetic B" } });
  s.state.choose("01"); assert.equal(s.render().values.notes, "Synthetic A"); await s.state.generate(); assert.equal(s.render().dirty, false); assert.ok(s.events.includes("kay:draft-cleared"));
});

test("global synchronous lock blocks duplicate submits, field/model/tab changes until the command settles", async () => {
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) });
  const first = s.state.generate(), second = s.state.generate(); assert.equal(s.calls.length, 1); s.render();
  s.state.change("notes", "ignored"); s.state.choose("02"); s.state.selectTab("history"); assert.equal(s.render().selectedCode, "01"); assert.equal(s.state.tab, "prepare"); assert.equal(s.state.values.notes, "");
  release(item("01")); await Promise.all([first, second]); assert.equal(s.render().busy, false); assert.equal(s.state.tab, "history");
});

test("uncertain creation pins the exact body/key across model switches and retries instead of duplicating", async () => {
  let fail = true; const s = setup({ command: async (...args) => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return item(args[1].template_code); } });
  await s.state.generate(); assert.equal(s.render().uncertain, true); assert.equal(s.state.dirty, true);
  s.state.change("client_name", "cannot replace uncertain body"); assert.equal(s.render().values.client_name, "Synthetic client");
  s.state.choose("02"); s.render(); s.state.change("notes", "Synthetic B"); s.render(); s.state.choose("01"); s.render(); fail = false;
  await s.state.generate(); assert.equal(s.calls[1][3], s.calls[0][3]); assert.deepEqual(plain(s.calls[1][1]), plain(s.calls[0][1])); assert.equal(s.render().uncertain, false); assert.equal(s.state.dirty, true);
});

test("explicitly restarting an uncertain model retains entered values but uses a new key on the next generation", async () => {
  const s = setup({ command: async () => { throw new ApiError("FILE_STORAGE_UNAVAILABLE", 503); } });
  s.state.change("notes", "Synthetic draft"); s.render(); await s.state.generate(); s.render(); s.state.restart(); assert.equal(s.render().values.notes, "Synthetic draft"); assert.equal(s.state.uncertain, false); assert.equal(s.calls.length, 1);
  await s.state.generate(); assert.notEqual(s.calls[1][3], s.calls[0][3]); assert.deepEqual(plain(s.calls[1][1]), plain(s.calls[0][1]));
});

test("a changed uncertain field catalog cannot submit the prior preparation under the new catalog", async () => {
  const s = setup({ command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); await s.state.generate(); s.render();
  s.context.value = { ...s.context.value, templates: [{ ...template(), fields: [...template().fields, { key: "new_field", label: "Nouveau", group: "Préparation", multiline: false }] }] };
  s.render(); await tick(); assert.equal(s.render().changedTemplate, true); await s.state.generate(); assert.equal(s.calls.length, 1);
});

test("definite validation failures allow correction; same body retains a key and changed body receives a fresh key", async () => {
  const s = setup({ command: async () => { throw new ApiError("VALIDATION_ERROR", 422); } }); await s.state.generate(); s.render(); await s.state.generate(); assert.equal(s.calls[1][3], s.calls[0][3]);
  s.render(); s.state.change("notes", "Synthetic correction"); s.render(); await s.state.generate(); assert.notEqual(s.calls[2][3], s.calls[1][3]);
  s.render(); s.state.change("client_name", "x".repeat(301)); s.render(); await s.state.generate(); assert.equal(s.calls.length, 3); assert.deepEqual(plain(s.render().validation.fields), ["client_name"]);
});

test("archive, hydration, and removed finance capability never generate; lost models are removed from retained memory", async () => {
  for (const options of [{ canGenerate: false }, { hydrated: false }]) { const s = setup(options); await s.state.generate(); assert.equal(s.calls.length, 0); }
  const s = setup(); s.state.choose("10"); s.render(); s.state.change("notes", "Synthetic restricted draft"); s.render();
  s.context.value = { ...s.context.value, templates: [template()] }; s.render(); await tick(); assert.equal(s.render().selectedCode, "01"); assert.equal(s.state.dirty, false);
  s.context.value = { ...s.context.value, templates: [template(), template("10")] }; s.render(); await tick(); s.state.choose("10"); assert.equal(s.render().values.notes, "");
});

test("command or context authority denial hides all old values immediately and clears draft/attempt memory", async () => {
  for (const status of [401, 403, 404]) {
    const s = setup({ command: async () => { throw new ApiError("FORBIDDEN", status); } }); s.state.change("notes", "Synthetic private draft"); s.render(); await s.state.generate();
    assert.equal(s.render().context, undefined); assert.deepEqual(plain(s.state.values), {}); assert.equal(s.state.dirty, false); assert.deepEqual(s.refreshes, ["context", "history"]);
  }
  for (const projection of ["context", "history"]) {
    const s = setup(); s.state.change("notes", "Synthetic private draft"); s.render(); s.documents[projection].error = new ApiError("NOT_FOUND", 404);
    assert.equal(s.render().context, undefined); await tick(); assert.equal(s.render().dirty, false); s.state.retryContext(); assert.deepEqual(s.refreshes, ["context", "history"]);
  }
});

test("unmount aborts an outstanding command and ignores even a late successful completion", async () => {
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) }); const task = s.state.generate(); s.h.unmount(); assert.equal(s.calls[0][6].aborted, true);
  release(item("01")); await task; assert.deepEqual(s.refreshes, []);
});

test("workspace keeps one managed form mounted across two shared tabs and adds history only after visiting", async () => {
  const s = setup({ workspace: true }); await tick(); let view = s.render(); assert.deepEqual(find(view, "Tab").map(node => node.props.value), ["prepare", "history"]); assert.equal(find(view, "History").length, 0);
  assert.equal(find(view, "option").length, 3); assert.equal(find(view, "Input").length, 1); s.state.change("notes", "Synthetic retained draft"); s.render(); s.state.selectTab("history"); view = s.render();
  assert.equal(find(view, "form").length, 1); assert.equal(find(view, "form")[0].props["data-live-dirty"], true); assert.equal(find(view, "Panel")[0].props.hidden, true);
  assert.equal(find(view, "History")[0].props.presentation, "table"); assert.equal(find(view, "History")[0].props.documents, s.documents);
  const one = s.DocumentWorkspace({ parentKind: "enquiry", id }), two = s.DocumentWorkspace({ parentKind: "deal", id }); assert.notEqual(one.key, two.key);
});

test("workspace model navigation restores each scroll position and focuses its selected heading", () => {
  const s = setup({ workspace: true }), focused = [], view = s.render(), scroll = find(view, "div").find(node => node.props.className === "kay-document-form-body");
  scroll.props.ref.current = { scrollTop: 0 }; find(view, "h2").find(node => node.props.ref).props.ref.current = { focus: options => focused.push(options) };
  scroll.props.onScroll({ currentTarget: { scrollTop: 240 } }); const choices = find(view, "Button").filter(node => node.props.className === "kay-document-model"); choices[1].props.onClick(); s.render(); assert.equal(scroll.props.ref.current.scrollTop, 0);
  choices[0].props.onClick(); s.render(); assert.equal(scroll.props.ref.current.scrollTop, 240); assert.equal(focused.length, 2); assert.ok(focused.every(options => options.preventScroll));
});

test("uncertain reset is a deliberate confirmation, does not generate, and keeps private history masked on denial", async () => {
  const s = setup({ workspace: true, command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); await s.state.generate(); let view = s.render();
  find(view, "Button").find(node => text(node) === "Nouvelle préparation").props.onClick(); view = s.render(); assert.equal(find(view, "Dialog")[0].props.open, true); assert.equal(s.calls.length, 1);
  find(view, "Button").find(node => text(node) === "Commencer").props.onClick(); assert.equal((s.render(), s.state.uncertain), false); assert.equal(s.calls.length, 1);
  s.state.selectTab("history"); s.context.error = new ApiError("FORBIDDEN", 403); view = s.render(); assert.equal(find(view, "History")[0].props.documents.context.value, undefined); assert.equal(find(view, "Input").length, 0); assert.ok(!text(view).includes("Synthetic client"));
});
