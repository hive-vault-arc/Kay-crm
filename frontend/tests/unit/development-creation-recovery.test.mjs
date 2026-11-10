import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { inventory, development, recordFixture, find, button, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";

function fixture({ role = "agent", hydrated = true, supported = true, dispatch, read, navigate } = {}) {
  const h = entryHarness(), actorId = randomUUID(), calls = [], receipts = new Map(), navigations = [], focused = [], registrations = [], base = { ...recordFixture("developments"), version: 1, unit_count: 0, available_unit_count: 0, offerings: [], owners: [] };
  let values, errors = {}, server, commits = 0, identity = { user: { id: actorId, role }, must_change_password: false }, capabilities = { value: { items: [], phase_supported: supported ? true : undefined }, refresh() {} };
  const form = { control: {}, formState: { errors }, register: name => ({ name, onChange: event => { values[name] = event.target.value; registrations.push(name); } }), getValues: () => ({ ...values }), clearErrors() { errors = {}; form.formState.errors = errors; }, setError(name, error) { errors[name] = error; }, getFieldState: name => ({ invalid: Boolean(errors[name]) }), setFocus: name => focused.push(name), handleSubmit: save => event => { event.preventDefault(); return save({ ...values }); } };
  const react = { ...h.react, useLayoutEffect: h.react.useEffect };
  const command = loadServer("src/features/inventory/use-development-creation.ts", { modules: { react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} }, "@/lib/api/client": { ApiError, apiGet: async (path, schema, signal) => path.endsWith("/auth/me") ? identity : read ? read(path, schema, signal, server) : schema.parse(server) }, "@/lib/api/command": { apiCommand: async (...args) => {
    args[7].beforeDispatch(identity); args[6].throwIfAborted(); args[7].dispatched(); calls.push(args);
    const commit = () => { if (!receipts.has(args[3])) { commits++; const { developer_contact_id: contact, developer_marketing_display: display, ...fields } = args[1]; server = development.developmentSchema.parse({ ...base, ...fields, ...(supported ? { phase: fields.phase ?? null, phase_supported: true } : {}), developer: { contact: contact ? { id: contact, name: "Synthetic selected private developer" } : null, marketing_display: display } }); receipts.set(args[3], { development_id: server.id, offering_id: null, version: 1, event_id: randomUUID() }); } return receipts.get(args[3]); };
    return args[2].parse(dispatch ? await dispatch({ args, commit, server: () => server }) : commit());
  } }, "./contracts": inventory, "./development-contracts": development }, globals: { crypto: { randomUUID }, AbortController, structuredClone } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} } });
  const loaded = loadServer("src/features/inventory/development-creation-wizard.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ push: path => { navigations.push(path); return navigate?.(path); } }) }, "react-hook-form": { useForm: options => { values ??= { ...options.defaultValues }; return form; }, useWatch: () => ({ ...values }) }, "@/components/icons": {}, "@/components/shared/section-heading": { SectionHeading: "Heading" }, "@/components/shared/dossier-form": draft, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/features/contacts/contact-selector": { ContactSelector: "Contact" }, "@/features/contacts/use-query": { useQuery: () => capabilities }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "./contracts": inventory, "./development-contracts": development, "./inventory-draft-summary": { InventoryDraftSummary: "Summary" }, "./inventory-wizard-steps": { InventoryWizardSteps: "Steps" }, "./states": { InventoryError: "InventoryError" }, "./use-development-creation": command }, globals: { requestAnimationFrame: run => run() } });
  const props = { actorId, role }, render = () => h.render(() => loaded.DevelopmentCreationWizard(props)); render();
  const step = value => find(render(), "Steps")[0].props.change(value);
  const change = (name, value) => { const field = [...find(render(), "Input"), ...find(render(), "Textarea"), ...find(render(), "Select")].find(node => node.props.name === name); assert.ok(field, name); field.props.onChange({ target: { value } }); };
  return { ...h, actorId, props, render, calls, navigations, focused, registrations, step, change, values: () => values, commits: () => commits, server: () => server, identity: next => { identity = next; }, capabilities: next => { capabilities = next; }, prepare() { step(0); change("reference", "SYN-NEW-P"); change("name", "Synthetic new programme"); }, async save() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await tick(); } };
}

test("Programme fields become editable when capabilities arrive after the first render", () => {
  const s = fixture();
  s.capabilities({ refresh() {} });
  assert.equal(find(s.render(), "fieldset")[0].props.disabled, true);
  s.capabilities({ value: { items: [], phase_supported: true }, refresh() {} });
  assert.equal(find(s.render(), "fieldset")[0].props.disabled, false);
});

test("All existing staff roles create one verified programme with the selected original fields before navigation", async () => {
  for (const role of ["agent", "manager", "administrator"]) {
    const s = fixture({ role }); s.prepare(); s.step(1); s.change("briefing_text", "  Synthetic shared programme context  "); s.step(2); await s.save(); assert.equal(s.commits(), 1); assert.equal(s.calls[0][0], "/api/v1/developments"); assert.equal(s.calls[0][4], "POST"); assert.equal(s.calls[0][1].briefing_text, "Synthetic shared programme context"); assert.equal(s.calls[0][1].phase, "preparation"); assert.equal(s.calls[0][1].developer_contact_id, null); assert.deepEqual(s.navigations, [`/projects/${s.server().id}`]); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined); await s.save(); assert.equal(s.calls.length, 1);
  }
});

test("Lost programme acknowledgement freezes parsed request, key, stepper, fields and original destination through metadata failure", async () => {
  let first = true; const s = fixture({ dispatch: ({ commit }) => { const receipt = commit(); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return receipt; } });
  s.prepare(); const staleName = find(s.render(), "Input").find(node => node.props.name === "name"); s.step(1); button(s.render(), "Ajouter un promoteur (facultatif)").props.onClick(); const staleChoice = find(s.render(), "Contact")[0].props.choose; s.step(2); const steps = find(s.render(), "Steps")[0], link = find(s.render(), "Link")[0]; await s.save();
  assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 0); assert.equal(find(s.render(), "form")[0].props["data-write-recovery"], "true"); staleName.props.onChange({ target: { value: "Unwanted replacement" } }); staleChoice({ id: randomUUID(), name: "Unwanted private developer" }); steps.props.change(0); assert.equal(find(s.render(), "Summary").length, 1); assert.equal(s.values().name, "Synthetic new programme"); let prevented = false; link.props.onClick({ preventDefault() { prevented = true; } }); assert.equal(prevented, true);
  s.capabilities({ error: new ApiError("DEPENDENCY_UNAVAILABLE", 503), refresh() {} }); await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(s.calls[0][1], s.calls[1][1]); assert.equal(s.calls[1][1].phase, "preparation"); assert.equal(s.calls[1][1].developer_contact_id, null); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 1);
});

test("Acknowledged programme current-read and awaited UI failures retry completion without another POST", async () => {
  let unavailable = true; const s = fixture({ read: (_path, schema, _signal, server) => { if (unavailable) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return schema.parse(server); } }); s.prepare(); s.step(2); await s.save(); assert.ok(button(s.render(), "Actualiser le résultat")); assert.equal(s.navigations.length, 0); unavailable = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.navigations.length, 1);
  let fail = true; const ui = fixture({ navigate: () => { if (fail) throw new Error("Synthetic navigation failure"); } }); ui.prepare(); ui.step(2); await ui.save(); fail = false; await ui.save(); assert.equal(ui.calls.length, 1); assert.equal(ui.commits(), 1); assert.equal(ui.navigations.length, 2);
});

test("Foreign receipt kind, unexpected offer and noncreation counters recover only the original programme request", async () => {
  for (const mode of ["property", "offering", "counter"]) {
    let invalid = true; const s = fixture({ dispatch: ({ commit }) => { const receipt = commit(); return invalid ? mode === "property" ? { property_id: receipt.development_id, offering_id: null, version: 1, event_id: receipt.event_id } : { ...receipt, ...(mode === "offering" ? { offering_id: randomUUID() } : { version: 2 }) } : receipt; } }); s.prepare(); s.step(2); await s.save(); assert.equal(s.navigations.length, 0); assert.ok(button(s.render(), "Réessayer la même opération")); invalid = false; await s.save(); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 1);
  }
});

test("Foreign current programme cannot complete an acknowledged creation and never causes a second create", async () => {
  let invalid = true; const s = fixture({ read: (_path, schema, _signal, server) => schema.parse({ ...server, ...(invalid ? { id: randomUUID() } : {}) }) }); s.prepare(); s.step(2); await s.save(); assert.equal(s.navigations.length, 0); invalid = false; await s.save(); assert.equal(s.calls.length, 1); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 1);
});

test("Known programme validation failure permits an explicit corrected body with a fresh key", async () => {
  let invalid = true; const s = fixture({ dispatch: ({ commit }) => { if (invalid) throw new ApiError("REFERENCE_ALREADY_EXISTS", 409); return commit(); } }); s.prepare(); s.step(2); await s.save(); s.step(0); s.change("reference", "SYN-CORRECTED-P"); s.step(2); invalid = false; await s.save(); assert.equal(s.calls.length, 2); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].reference, "SYN-CORRECTED-P"); assert.equal(s.commits(), 1);
});

test("Legacy programme phase stays omitted and a selected promoter name never fills the shared label", async () => {
  const s = fixture({ supported: false }); s.prepare(); assert.equal(find(s.render(), "Select").some(node => node.props.name === "phase"), false); s.step(1); button(s.render(), "Ajouter un promoteur (facultatif)").props.onClick(); const contact = { id: randomUUID(), name: "Synthetic private selected developer" }; find(s.render(), "Contact")[0].props.choose(contact); s.step(2); await s.save(); assert.equal(Object.hasOwn(s.calls[0][1], "phase"), false); assert.equal(s.calls[0][1].developer_contact_id, contact.id); assert.equal(s.calls[0][1].developer_marketing_display, null);
});

test("Programme capability/source/hydration and field validation cannot create a partial or unowned request", async () => {
  const waiting = fixture(); waiting.capabilities({ refresh() {} }); waiting.step(2); await waiting.save(); assert.equal(waiting.calls.length, 0);
  const invalid = fixture(); invalid.step(2); await invalid.save(); assert.equal(invalid.calls.length, 0); assert.equal(invalid.focused[0], "reference"); invalid.prepare(); invalid.capabilities({ error: new ApiError("DEPENDENCY_UNAVAILABLE", 503), refresh() {} }); invalid.step(2); await invalid.save(); assert.equal(invalid.calls.length, 0); assert.equal(find(invalid.render(), "form")[0].props["data-live-dirty"], "true");
  const cold = fixture({ hydrated: false }); cold.prepare(); cold.step(2); await cold.save(); assert.equal(cold.calls.length, 0); assert.equal(cold.registrations.length, 0);
});

test("Current account/role/password and developer-picker denial mask the programme form without another POST", async () => {
  for (const mode of ["account", "role", "password"]) {
    const s = fixture(); s.prepare(); s.step(2); s.identity({ user: { id: mode === "account" ? randomUUID() : s.actorId, role: mode === "role" ? "manager" : "agent" }, must_change_password: mode === "password" }); await s.save(); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "form").length, 0);
  }
  const denied = fixture(); denied.prepare(); denied.step(1); button(denied.render(), "Ajouter un promoteur (facultatif)").props.onClick(); find(denied.render(), "Contact")[0].props.denied(new ApiError("FORBIDDEN", 403)); assert.equal(find(denied.render(), "form").length, 0);
  const capabilitiesDenied = fixture(); capabilitiesDenied.prepare(); capabilitiesDenied.capabilities({ error: new ApiError("FORBIDDEN", 403), refresh() {} }); capabilitiesDenied.render(); assert.equal(find(capabilitiesDenied.render(), "form").length, 0); assert.equal(capabilitiesDenied.calls.length, 0);
});

test("Creation authority loss after acknowledgement keeps only the generic saved fact", async () => {
  let s; s = fixture({ dispatch: ({ commit }) => { const receipt = commit(); s.identity({ user: { id: s.actorId, role: "manager" }, must_change_password: false }); return receipt; } }); s.prepare(); s.step(2); await s.save(); assert.equal(s.commits(), 1); assert.equal(s.navigations.length, 0); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "p")[0].props.children, "Le programme est enregistré. Les droits d’accès ont changé.");
});

test("Synchronous double create and disposed current-read callbacks cannot duplicate or navigate late", async () => {
  let resolve, signal; const s = fixture({ read: (_path, schema, current, server) => { signal = current; return new Promise(done => { resolve = () => done(schema.parse(server)); }); } }); s.prepare(); s.step(2); const first = s.save(), second = s.save(); await tick(); assert.equal(s.calls.length, 1); s.dispose(); assert.equal(signal.aborted, true); resolve(); await Promise.all([first, second]); assert.equal(s.lateUpdates(), 0); assert.equal(s.navigations.length, 0);
});

test("The actual programme-creation route forwards and keys its authenticated account/role", async () => {
  const actorId = randomUUID(); const route = loadServer("src/app/(workspace)/projects/new/page.tsx", { modules: { "react/jsx-runtime": runtime, "@/components/shared/page-header": { PageHeader: "Header" }, "@/features/auth/auth-frame": { AuthUnavailable: "Unavailable" }, "@/features/inventory/development-editor": { DevelopmentEditor: "Editor" }, "@/lib/auth/server": { requireIdentity: async () => ({ state: "authenticated", profile: { user: { id: actorId, role: "agent" } } }) } } }); const editor = find(await route.default(), "Editor")[0]; assert.equal(editor.props.actorId, actorId); assert.equal(editor.props.role, "agent"); assert.equal(editor.key, `${actorId}:agent`);
});

test("The creation owner itself rejects copied server identity, counters, capability and assignment fields before dispatch", async () => {
  const h = entryHarness(); let dispatched = 0; const loaded = loadServer("src/features/inventory/use-development-creation.ts", { modules: { react: { ...h.react, useLayoutEffect: h.react.useEffect }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/auth/contracts": { meSchema: {} }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async () => { dispatched++; } }, "./contracts": inventory, "./development-contracts": development }, globals: { crypto: { randomUUID }, AbortController, structuredClone } });
  const options = { actorId: randomUUID(), role: "agent", available: true }, render = () => h.render(() => loaded.useDevelopmentCreation(options)), fields = { reference: "SYN-STRICT", name: "Synthetic strict creation", category: "mixed", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null };
  for (const extra of [{ id: randomUUID() }, { expected_version: 1 }, { phase_supported: true }, { agent_id: randomUUID() }, { actor_user_id: randomUUID() }]) { const failure = await render().submit({ ...fields, ...extra }, () => {}); assert.equal(failure.code, "VALIDATION_ERROR"); assert.equal(render().canEdit(), true); } assert.equal(dispatched, 0);
});

test("Programme creation enables its fields on the render that receives capabilities", () => {
  const h = entryHarness();
  const { useDevelopmentCreation } = loadServer("src/features/inventory/use-development-creation.ts", {
    modules: {
      react: { ...h.react, useLayoutEffect: h.react.useEffect },
      "@/hooks/use-hydrated": { useHydrated: () => true },
      "@/lib/auth/contracts": { meSchema: {} },
      "@/lib/api/client": { ApiError },
      "@/lib/api/command": {},
      "./contracts": inventory,
      "./development-contracts": development,
    },
  });
  const actorId = randomUUID();
  const canEdit = available => h.render(() => useDevelopmentCreation({ actorId, role: "agent", available }).canEdit());
  assert.equal(canEdit(false), false);
  assert.equal(canEdit(true), true);
  assert.equal(canEdit(false), false);
});
