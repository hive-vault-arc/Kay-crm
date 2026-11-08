import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { inventory, development, recordFixture, inventoryHostFixture, find, button, text, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";
import { loadRecordCommand, recordIntents } from "./record-command-fixtures.mjs";

function fixture({ role = "agent", source = { ...recordFixture("developments"), phase: "marketing", phase_supported: true }, dispatch, completeRead, read, navigate, hydrated = true } = {}) {
  const h = entryHarness(), calls = [], navigations = [], decisions = [], focused = [], registrations = [], props = { development: source }; let values, errors = {};
  const form = { control: {}, formState: { errors }, register: name => ({ name, onChange: event => { values[name] = event.target.value; registrations.push(name); } }), getValues: () => ({ ...values }), reset(next) { values = { ...next }; }, clearErrors() { errors = {}; form.formState.errors = errors; }, setError(name, error) { errors[name] = error; }, setFocus: name => focused.push(name), handleSubmit: save => event => { event.preventDefault(); return save({ ...values }); } };
  const command = loadRecordCommand(h, { source, role, hydrated, completeRead, dispatch: async context => { calls.push(context.args); return dispatch ? dispatch(context) : context.commit(); } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} } });
  const loaded = loadServer("src/features/inventory/development-editor.tsx", { modules: {
    react: h.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ push: path => { navigations.push(path); return navigate?.(path); } }) },
    "react-hook-form": { useForm: options => { values ??= { ...options.defaultValues }; return form; }, useWatch: () => ({ ...values }) },
    "@/components/icons": { DevelopmentIcon: "Icon" }, "@/components/shared/section-heading": { SectionHeading: "Heading" }, "@/components/shared/dossier-form": draft,
    "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: (run, scope) => decisions.push({ run, scope }) }) },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" },
    "@/features/contacts/contact-selector": { ContactSelector: "Contact" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => schema.parse(read ? await read(path, signal) : source) },
    "@/features/contacts/record-states": { RecordError: "Error" }, "./contracts": inventory, "./development-contracts": development,
    "./use-record-command": command, "./states": { InventoryError: "InventoryError" }, "./inventory-draft-summary": { InventoryDraftSummary: "Summary" }, "./development-creation-wizard": { DevelopmentCreationWizard: "Create" },
  }, globals: { AbortController } });
  const render = () => h.render(() => loaded.DevelopmentEditor(props));
  render();
  return { ...h, ...command, source, props, render, calls, navigations, decisions, focused, registrations, values: () => values,
    change(name, value) { const input = [...find(render(), "Input"), ...find(render(), "Select"), ...find(render(), "Textarea")].find(node => node.props.name === name); assert.ok(input, name); input.props.onChange({ target: { value } }); },
    async save() { await find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await tick(); },
  };
}

test("Programme facts intent requires the exact development PATCH and strict counter/fields without changing agent grants", async () => {
  const source = recordFixture("developments"), scope = { kind: "development-facts", root: "developments", id: source.id, version: 7 }, path = `/api/v1/developments/${source.id}`;
  const body = { expected_version: 7, reference: source.reference, name: source.name, category: source.category, location: null, briefing_text: "", developer_marketing_display: null, phase: null };
  assert.equal(recordIntents.recordCommandIntent(scope, path, body, "PATCH").body.phase, null);
  for (const [target, value, method] of [[{ ...scope, root: "properties" }, body, "PATCH"], [{ ...scope, id: randomUUID() }, body, "PATCH"], [scope, body, "POST"], [scope, { ...body, expected_version: 0 }, "PATCH"], [scope, { ...body, phase_supported: true }, "PATCH"], [scope, { ...body, actor_user_id: randomUUID() }, "PATCH"]]) assert.equal(recordIntents.recordCommandIntent(target, path, value, method), undefined);
  for (const role of ["agent", "manager", "administrator"]) { const s = fixture({ role }); s.change("name", "Synthetic shared edited programme"); await s.save(); assert.equal(s.commits(), 1); assert.deepEqual(s.navigations, [`/projects/${s.source.id}`]); assert.equal(s.accepted[0].name, "Synthetic shared edited programme"); assert.equal(Object.hasOwn(s.calls[0][1], "developer_contact_id"), false); }
});

test("Programme edit freezes original fields, phase, developer intent, request key and navigation after a lost acknowledgement", async () => {
  let interrupted = true;
  const s = fixture({ dispatch: ({ commit }) => { const receipt = commit(); if (interrupted) { interrupted = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return receipt; } });
  s.change("name", "Synthetic original programme edit"); s.change("phase", ""); s.change("briefing_text", "");
  const staleField = find(s.render(), "Input").find(node => node.props.name === "name"), staleChoice = find(s.render(), "Contact")[0].props.choose, staleLink = find(s.render(), "Link")[0];
  await s.save(); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 0); assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], "true");
  staleField.props.onChange({ target: { value: "Unwanted replacement" } }); staleChoice({ id: randomUUID(), name: "Unwanted private contact" }); let prevented = false; staleLink.props.onClick({ preventDefault() { prevented = true; } }); assert.equal(prevented, true); assert.equal(s.values().name, "Synthetic original programme edit"); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true);
  await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(s.calls[0][1], s.calls[1][1]); assert.equal(s.calls[1][1].phase, null); assert.equal(s.calls[1][1].briefing_text, null); assert.equal(Object.hasOwn(s.calls[1][1], "developer_contact_id"), false); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 1); assert.equal(s.accepted[0].phase, null); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.navigations.length, 1);
});

test("Acknowledged programme edit retries only current result and original failed navigation", async () => {
  let outage = true;
  const s = fixture({ completeRead: (_path, schema, _signal, server) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(server); } });
  s.change("location", "Synthetic normalized locality"); await s.save(); assert.equal(s.navigations.length, 0); assert.ok(button(s.render(), "Actualiser le résultat")); outage = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1);
  let failed = true; const ui = fixture({ navigate: () => { if (failed) throw new Error("Synthetic navigation failure"); } }); ui.change("name", "Synthetic stable destination"); await ui.save(); failed = false; await ui.save(); assert.equal(ui.calls.length, 1); assert.equal(ui.commits(), 1); assert.equal(ui.navigations.length, 2); assert.equal(ui.accepted.length, 1);
});

test("Known programme conflict requires explicit current comparison while retaining omitted protected developer identity", async () => {
  let conflict = true, latest;
  const s = fixture({ dispatch: ({ commit }) => { if (conflict) throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); return commit(); }, read: () => latest });
  latest = { ...s.source, version: 9, name: "Synthetic current programme", developer: { marketing_display: "Synthetic public promoter", contact: null }, briefing_text: "Synthetic current shared presentation" };
  s.change("name", "Synthetic retained draft"); s.change("phase", ""); await s.save(); await s.save(); assert.equal(s.calls.length, 1);
  await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true); assert.equal(s.values().name, "Synthetic retained draft");
  button(s.render(), "Conserver ma saisie sur cette version").props.onClick(); conflict = false; await s.save(); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].name, "Synthetic retained draft"); assert.equal(s.calls[1][1].phase, null); assert.equal(Object.hasOwn(s.calls[1][1], "developer_contact_id"), false); assert.notEqual(s.calls[1][3], s.calls[0][3]); assert.equal(s.accepted[0].version, 10);
});

test("Explicit programme reload waits for draft approval, resets only on selection and leaves a clean current baseline", async () => {
  let latest; const s = fixture({ dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: () => latest }); latest = { ...s.source, version: 8, name: "Synthetic current accepted programme", phase: "preparation", briefing_text: null };
  s.change("name", "Synthetic unsaved change"); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); button(s.render(), "Recharger le programme").props.onClick(); assert.equal(s.decisions.length, 1); assert.equal(s.values().name, "Synthetic unsaved change"); s.decisions[0].run(); assert.equal(s.values().name, latest.name); assert.equal(s.values().phase, "preparation"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Foreign, stale or archived programme comparisons cannot rearm a save", async () => {
  for (const mode of ["foreign", "stale", "archived"]) {
    let latest; const s = fixture({ dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: () => latest }); latest = { ...s.source, ...(mode === "foreign" ? { id: randomUUID() } : mode === "stale" ? { version: 6 } : { archived_at: "2026-10-29T12:00:00Z" }) };
    s.change("name", "Synthetic retained after refusal"); await s.save(); await button(s.render(), "Comparer la version actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Button").some(node => node.props.action === "compare" && node.props.children === "Conserver ma saisie sur cette version"), false); await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 0);
  }
});

test("Programme input validation and current source failure do not discard the draft or manufacture a request", async () => {
  const s = fixture(); s.change("name", ""); await s.save(); assert.equal(s.calls.length, 0); assert.equal(s.focused[0], "name"); s.change("name", "Synthetic editable form"); s.host.available = false; await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
  const cold = fixture({ hydrated: false }); cold.change("name", "Unhydrated change"); await cold.save(); assert.equal(cold.calls.length, 0); assert.equal(cold.registrations.length, 0);
});

test("Programme developer intent distinguishes omission, explicit dissociation and selection without copying private names", async () => {
  const source = { ...recordFixture("developments"), developer: { contact: { id: randomUUID(), name: "Synthetic initially accessible developer" }, marketing_display: "Synthetic shared label" } }, masked = fixture({ source });
  masked.change("reference", ` ${source.reference} `); assert.equal(find(masked.render(), "form")[0].props["data-live-dirty"], undefined);
  masked.props.development = { ...source, version: 8, developer: { ...source.developer, contact: null } }; assert.equal(text(masked.render()).includes(source.developer.contact.name), false);
  const removed = fixture({ source }); button(removed.render(), "Dissocier le promoteur").props.onClick(); await removed.save(); assert.equal(removed.calls[0][1].developer_contact_id, null); assert.equal(removed.accepted[0].developer.contact, null); assert.equal(removed.calls[0][1].developer_marketing_display, "Synthetic shared label");
  const selected = fixture(), id = randomUUID(); find(selected.render(), "Contact")[0].props.choose({ id, name: "Synthetic newly chosen private name" }); await selected.save(); assert.equal(selected.calls[0][1].developer_contact_id, id); assert.equal(selected.calls[0][1].developer_marketing_display, null);
});

test("Programme developer picker denial masks private fields and disposed comparison cannot update late state", async () => {
  const s = fixture(); find(s.render(), "Contact")[0].props.denied(new ApiError("FORBIDDEN", 403)); assert.equal(find(s.render(), "form").length, 0); assert.equal(s.denials.length, 1);
  let resolve, signal; const disposed = fixture({ dispatch: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); }, read: (_path, current) => { signal = current; return new Promise(done => { resolve = done; }); } }); disposed.change("name", "Synthetic protected draft"); await disposed.save(); button(disposed.render(), "Comparer la version actuelle").props.onClick(); await tick(); disposed.dispose(); assert.equal(signal.aborted, true); resolve({ ...disposed.source, version: 8 }); await tick(); assert.equal(disposed.lateUpdates(), 0); assert.equal(disposed.navigations.length, 0);
});

test("Actual programme edit host supplies the same scoped record owner and retains it through busy source failure", () => {
  const s = inventoryHostFixture("developments"); s.props.edit = true;
  const view = s.render(), owner = find(view, "RecordScope")[0], busy = find(view, "BusyScope")[0]; assert.equal(owner.props.value.id, s.record.id); assert.equal(owner.props.value.actorId, s.props.actorId); assert.equal(find(view, "fieldset").length, 0);
  busy.props.value(true); s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); s.query.value = undefined; const retained = s.render(); assert.equal(find(retained, "DevelopmentEditor")[0].props.development.id, s.record.id); assert.equal(find(retained, "RecordScope")[0].props.value.available, false);
});
