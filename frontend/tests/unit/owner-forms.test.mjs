import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.assignment, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
class ApiError extends Error { constructor(code, status, details) { super(code); Object.assign(this, { code, status, details }); } }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const model = loadServer("src/features/owners/owner-form-model.ts");
const at = "2026-10-20T12:00:00Z";
const metadata = { countries: [{ code: "MA", calling_code: "+212" }], languages: [{ value: "french", label: "Français" }], campaign_sources: [], purchase_reasons: [], budget_bands: [] };
function client(changes = {}) { return contacts.contactSchema.parse({ id: randomUUID(), name: "Synthetic canonical contact", type: "organization", primary_phone: "+212600000001", primary_email: "synthetic@example.invalid", primary_agent: { id: randomUUID(), display_name: "Synthetic retained agent" }, version: 7, archived_at: null, phones: [{ number: "+212600000001", label: "Principal conservé", is_primary: true }, { number: "+212600000002", label: "Secondaire conservé", is_primary: false }], emails: [{ email: "synthetic@example.invalid", label: "Bureau conservé", is_primary: true }], roles: ["buyer", "developer"], country: "MA", nationality: "FR", languages: ["french", "darija"], calling_code: "+212", source: "csv_import", source_submission_id: null, created_by_user_id: null, created_at: at, updated_at: at, collaborators: [], ...changes }); }

function harness() {
  const frames = new Map(); let frame, cursor = 0, formCursor = 0, prior = new Set();
  const effects = [], allForms = [];
  const react = {
    useState(initial) { const own = frame, i = cursor++; if (!(i in own.slots)) own.slots[i] = typeof initial === "function" ? initial() : initial; return [own.slots[i], next => { own.slots[i] = typeof next === "function" ? next(own.slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return frame.slots[i] ??= { current: initial }; },
    useCallback(run, deps) { const i = cursor++, old = frame.slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) frame.slots[i] = { deps, run }; return frame.slots[i].run; },
    useEffect(run, deps) { const i = cursor++, old = frame.slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; frame.slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  const hookForms = {
    useForm({ defaultValues }) { const i = formCursor++; if (!frame.forms[i]) { let fields = plain(defaultValues); const form = { control: {}, formState: { errors: {}, isSubmitting: false }, validations: 0, validationGate: undefined, getValues: name => name ? fields[name] : fields, reset: next => { fields = plain(next); }, setValue: (name, value) => { fields[name] = value; }, setFocus() {}, setError() {}, clearErrors() {}, handleSubmit: run => async event => { event.preventDefault(); form.validations++; if (form.validationGate) await form.validationGate; const parsed = contacts.contactFieldsSchema.safeParse(fields); if (parsed.success) await run(parsed.data); } }; form.control = { form }; frame.forms[i] = form; allForms.push(form); } return frame.forms[i]; },
    useWatch({ control }) { return control.form.getValues(); },
  };
  return { react, hookForms, allForms, render(root) { const active = new Set(); let type = root, props = {}, key = ""; for (;;) { if (!frames.has(type)) frames.set(type, new Map()); const owned = frames.get(type); if (!owned.has(key)) owned.set(key, { slots: [], forms: [] }); frame = owned.get(key); active.add(frame); cursor = 0; formCursor = 0; const node = type(props); if (typeof node.type !== "function") { prior.forEach(old => { if (!active.has(old)) old.slots.forEach(slot => slot?.cleanup?.()); }); prior = active; effects.splice(0).forEach(run => run()); return node; } type = node.type; props = node.props; key = node.key ?? ""; } }, unmount() { prior.forEach(old => old.slots.forEach(slot => slot?.cleanup?.())); } };
}
function setup({ role = "manager", original, read, command } = {}) {
  const h = harness(), calls = [], reads = [], navigations = [], events = []; let refreshes = 0;
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const loaded = loadServer("src/features/owners/owner-form.tsx", { modules: {
    react: h.react, "react/jsx-runtime": runtime, "react-hook-form": h.hookForms, "@hookform/resolvers/zod": { zodResolver() {} }, "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ push: path => navigations.push(path) }) },
    "@/components/shared/dossier-form": { ...draft, DossierFormHeader: "Header" }, "@/components/shared/record-header": { RecordHeader: "RecordHeader" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/form": { Form: "Form" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/features/contacts/agent-picker": { AgentPicker: "Agent" }, "@/features/contacts/contact-fields": { ContactFields: "ContactFields" }, "@/features/contacts/contact-selector": { ContactSelector: "ContactSelector" }, "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/contacts/record-states": { CommandError: "CommandError", RecordError: "RecordError" }, "@/features/contacts/use-query": { useQuery: path => ({ value: path.endsWith("metadata") ? metadata : original, refresh: () => refreshes++ }) }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError, apiGet: async (...args) => { reads.push(args); return read ? read(...args) : original; } }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); return command ? command(...args) : client({ roles: ["owner"] }); } }, "./owner-form-model": model, "./owner-form-parts": { OwnerContactChoice: "Choice", OwnerContactSnapshot: "Snapshot" }, "./owner-loading": { OwnerLoading: "Loading" },
  }, globals: { crypto: { randomUUID }, AbortController } });
  const root = () => loaded.OwnerForm({ role, id: original?.id }), render = () => h.render(root);
  render(); return { ...h, calls, reads, navigations, events, render, refreshes: () => refreshes, form: () => h.allForms.at(-1), fill(value = client()) { h.allForms.at(-1).reset(model.ownerValues(value)); }, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); }, mode(value) { find(render(), "Select")[0].props.onChange({ target: { value } }); }, async select(id) { find(render(), "ContactSelector")[0].props.choose({ id }); await delay(0); } };
}

test("Owner role payload preserves complete canonical fields and other roles without provenance, attribution or owner-link writes", () => {
  const original = client(), body = model.ownerRoleBody(original); assert.equal(contacts.editContactSchema.safeParse(body).success, true); assert.equal(body.expected_version, original.version);
  for (const field of ["name", "type", "phones", "emails", "country", "nationality", "languages"]) assert.deepEqual(plain(body[field]), plain(original[field]));
  assert.deepEqual(plain(body.roles), [...original.roles, "owner"]); for (const field of ["primary_agent_id", "source", "source_submission_id", "created_by_user_id", "owners"]) assert.equal(Object.hasOwn(body, field), false);
  body.phones[0].label = "Changed draft"; body.emails[0].label = "Changed draft"; body.languages.push("english"); assert.equal(original.phones[0].label, "Principal conservé"); assert.equal(original.emails[0].label, "Bureau conservé"); assert.equal(original.languages.includes("english"), false);
});

test("Owner creation requires explicit M/A assignment, forces the owner role and retains every contact collection", async () => {
  const s = setup(), original = client(); s.fill(original); s.submit(); await delay(0); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "CommandError")[0].props.error.code, "INVALID_ASSIGNEE");
  const assigned = randomUUID(); find(s.render(), "Agent")[0].props.change(assigned, "Synthetic chosen agent"); s.submit(); await delay(0);
  const [path, body, , , method] = s.calls[0]; assert.equal(path, "/api/v1/contacts"); assert.equal(method, "POST"); assert.equal(body.primary_agent_id, assigned); assert.deepEqual(plain(body.phones), original.phones); assert.deepEqual(plain(body.emails), original.emails); assert.ok(body.roles.includes("owner")); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  assert.equal(find(s.render(), "Header").length, 1); assert.equal(find(s.render(), "ContactFields")[0].props.ownerLayout, true);
});

test("Agent creation never submits an assignment override; same-body interruption retains the retry key and draft", async () => {
  let fail = true; const s = setup({ role: "agent", command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return client({ roles: ["owner"] }); } }); s.fill(); assert.equal(find(s.render(), "Agent").length, 0); s.submit(); await delay(0);
  assert.equal(s.navigations.length, 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], true); fail = false; s.submit(); await delay(0);
  assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1])); assert.equal(Object.hasOwn(s.calls[0][1], "primary_agent_id"), false); assert.equal(s.navigations.length, 1);
});

test("Owner submission locks during asynchronous validation and releases after invalid input", async () => {
  const s = setup({ role: "agent" }); let release; s.form().validationGate = new Promise(resolve => { release = resolve; }); s.fill(); s.submit(); s.submit(); assert.equal(s.form().validations, 1); assert.equal(s.calls.length, 0); release(); await delay(0); assert.equal(s.calls.length, 1);
  const invalid = setup({ role: "agent" }); invalid.submit(); await delay(0); assert.equal(invalid.calls.length, 0); assert.equal(find(invalid.render(), "form")[0].props["aria-busy"], false); invalid.fill(); invalid.submit(); await delay(0); assert.equal(invalid.calls.length, 1);
});

test("Existing-contact reuse reads current canonical data and adds only its owner role, ignoring the new-contact draft and chosen assignment", async () => {
  const current = client(), s = setup({ read: async () => current }); s.fill(client({ name: "Unused synthetic draft" })); find(s.render(), "Agent")[0].props.change(randomUUID(), "Unused assignment"); s.mode("existing"); await s.select(randomUUID());
  const view = s.render(); assert.equal(find(view, "Choice")[0].props.contact.id, current.id); assert.equal(find(view, "Agent").length, 0); assert.equal(find(view, "fieldset").find(node => node.props.hidden).props.disabled, true);
  s.submit(); await delay(0); assert.equal(s.calls[0][0], `/api/v1/contacts/${current.id}`); assert.equal(s.calls[0][4], "PATCH"); assert.deepEqual(plain(s.calls[0][1]), plain(model.ownerRoleBody(current))); assert.equal(s.calls[0][1].name, current.name); assert.equal(s.calls[0][1].primary_agent_id, undefined);
});

test("Changing an empty owner mode or searching is not an edit; switching modes retains a typed new-contact draft", () => {
  const s = setup(); s.mode("existing"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  s.mode("new"); s.fill(client({ name: "Retained inactive synthetic draft" })); s.mode("existing"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], true);
  s.mode("new"); assert.equal(s.form().getValues("name"), "Retained inactive synthetic draft"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], true);
});

test("An existing owner opens directly without another write, while an archived choice cannot receive a role", async () => {
  const current = client({ roles: ["buyer", "owner"] }), s = setup({ read: async () => current }); s.mode("existing"); await s.select(current.id); s.submit(); await delay(0); assert.equal(s.calls.length, 0); assert.deepEqual(s.navigations, [`/owners/${current.id}`]);
  const archived = client({ archived_at: at }), stopped = setup({ read: async () => archived }); stopped.mode("existing"); await stopped.select(archived.id); stopped.submit(); await delay(0); assert.equal(stopped.calls.length, 0); assert.equal(find(stopped.render(), "Button").find(node => node.props.type === "submit").props.disabled, true);
});

test("A superseded contact lookup is aborted and cannot replace the latest choice or a returned new-contact draft", async () => {
  const pending = [], s = setup({ read: (...args) => new Promise(resolve => pending.push({ args, resolve })) }); s.mode("existing"); find(s.render(), "ContactSelector")[0].props.choose({ id: randomUUID() }); find(s.render(), "ContactSelector")[0].props.choose({ id: randomUUID() });
  const latest = client({ name: "Latest synthetic choice" }); pending[1].resolve(latest); await delay(0); pending[0].resolve(client({ name: "Must remain hidden" })); await delay(0);
  assert.equal(pending[0].args[2].aborted, true); assert.equal(find(s.render(), "Choice")[0].props.contact.name, latest.name);
  find(s.render(), "Choice")[0].props.change(); find(s.render(), "ContactSelector")[0].props.choose({ id: randomUUID() }); s.mode("new"); pending[2].resolve(client({ name: "Late unused choice" })); await delay(0); assert.equal(find(s.render(), "Choice").length, 0); assert.equal(pending[2].args[2].aborted, true);
});

test("Owner-role conflict reload preserves the latest identity/roles and never offers to replace them with the new-contact draft", async () => {
  const original = client(), newer = { ...original, version: 8, name: "Updated synthetic identity", roles: ["buyer", "tenant"] }; let fail = true;
  const s = setup({ read: async () => original, command: async () => { if (fail) throw new ApiError("VERSION_CONFLICT", 409, { current: newer }); return { ...newer, roles: [...newer.roles, "owner"] }; } }); s.mode("existing"); await s.select(original.id); s.submit(); await delay(0);
  const view = s.render(); assert.equal(find(view, "Snapshot")[0].props.contact.name, newer.name); assert.equal(find(view, "Button").some(node => text(node) === "Conserver ma saisie sur cette version"), false);
  find(view, "Button").find(node => text(node) === "Charger la version actuelle").props.onClick(); fail = false; s.submit(); await delay(0); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].name, newer.name); assert.deepEqual(plain(s.calls[1][1].roles), [...newer.roles, "owner"]); assert.notEqual(s.calls[0][3], s.calls[1][3]);
});

test("Full owner edit keeps all fields/version and requires an explicit conflict choice; a foreign current snapshot is not adopted", async () => {
  const original = client({ roles: ["owner", "buyer"] }), newer = { ...original, name: "New server name", version: 8 }; let fail = true;
  const s = setup({ original, command: async () => { if (fail) throw new ApiError("VERSION_CONFLICT", 409, { current: newer }); return original; } }); s.form().setValue("name", "Retained owner draft"); s.submit(); await delay(0);
  assert.equal(s.form().getValues("name"), "Retained owner draft"); find(s.render(), "Button").find(node => text(node) === "Conserver ma saisie sur cette version").props.onClick(); fail = false; s.submit(); await delay(0); assert.equal(s.calls[1][1].expected_version, 8); assert.equal(s.calls[1][1].name, "Retained owner draft"); assert.deepEqual(plain(s.calls[1][1].phones), original.phones); assert.equal(find(s.render(), "Agent").length, 0);
  const wrong = setup({ original, command: async () => { throw new ApiError("VERSION_CONFLICT", 409, { current: client({ name: "Foreign snapshot" }) }); } }); wrong.submit(); await delay(0); assert.equal(find(wrong.render(), "Snapshot").length, 0);
});

test("Current command/read/lookup authority denial removes private owner fields and cached choices before retry", async () => {
  const s = setup({ role: "agent", command: async () => { throw new ApiError("FORBIDDEN", 403); } }); s.fill(); s.submit(); await delay(0); assert.equal(find(s.render(), "RecordError").length, 1); assert.equal(find(s.render(), "ContactFields").length, 0); assert.equal(find(s.render(), "Choice").length, 0);
  const read = setup({ read: async () => { throw new ApiError("NOT_FOUND", 404); } }); read.mode("existing"); await read.select(randomUUID()); assert.equal(find(read.render(), "ContactFields").length, 0); assert.equal(find(read.render(), "RecordError")[0].props.error.status, 404);
  const picker = setup(); find(picker.render(), "Agent")[0].props.denied(new ApiError("FORBIDDEN", 403)); assert.equal(find(picker.render(), "ContactFields").length, 0);
});

test("Unmount aborts a selected-contact lookup and suppresses a late mutation redirect", async () => {
  let resolve; const s = setup({ role: "agent", command: async () => new Promise(done => { resolve = done; }) }); s.fill(); s.submit(); await delay(0); s.unmount(); resolve(client({ roles: ["owner"] })); await delay(0); assert.equal(s.navigations.length, 0);
  const pending = setup({ read: async () => new Promise(() => {}) }); pending.mode("existing"); find(pending.render(), "ContactSelector")[0].props.choose({ id: randomUUID() }); pending.unmount(); assert.equal(pending.reads[0][2].aborted, true);
});

test("Owner field composition keeps one pair of collection controllers, labelled source sections and a non-removable owner role", () => {
  const value = model.ownerValues(client()), arrays = [], h = harness();
  const form = { control: {}, formState: { errors: {} }, getValues: name => value[name], setValue: (key, next) => { value[key] = next; }, clearErrors() {} };
  const loaded = loadServer("src/features/contacts/contact-fields.tsx", { modules: { react: { ...h.react, useId: () => "synthetic-owner-fields" }, "react/jsx-runtime": runtime, "react-hook-form": { useWatch: ({ name }) => value[name], useFieldArray: ({ name }) => { arrays.push(name); return { fields: value[name].map((item, index) => ({ ...item, id: `${name}-${index}` })), append() {}, replace() {} }; } }, "@/components/icons": { PhoneIcon: "Phone", EmailIcon: "Email" }, "@/components/shared/section-heading": { SectionHeading: "Heading" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/form": { FormControl: "Control", FormField: "Field", FormItem: "Item", FormLabel: "Label", FormMessage: "Message" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/radio-group": { RadioGroup: "Radios", RadioGroupItem: "Radio" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/button": { Button: "Button" }, "./contracts": contacts, "./qualification-inputs": { countryOptions: () => [], InternationalPhoneInput: "PhoneInput", LanguagePicker: "Languages" } } });
  const root = () => loaded.ContactFields({ form, metadata, ownerLayout: true, workspace: true, requiredRole: "owner", assignment: jsx("Assignment", {}) }), view = h.render(root);
  assert.deepEqual(arrays, ["phones", "emails"]); assert.deepEqual(find(view, "Section").map(node => node.props.title), ["Coordonnées", "Gestion du contact"]); assert.equal(find(view, "Assignment").length, 1); assert.equal(find(view, "details").length, 1);
  const names = find(view, "Field").map(node => node.props.name); for (const name of ["name", "type", "phones.0.number", "emails.0.email", "roles", "country", "nationality", "languages"]) assert.equal(names.filter(value => value === name).length, 1);
  const roles = find(view, "Field").find(node => node.props.name === "roles").props.render({ field: { value: [], onChange() {} } }); assert.equal(find(roles, "Checkbox").filter(node => node.props.disabled).length, 1); assert.equal(find(roles, "Checkbox").find(node => node.props.disabled).props.checked, true);
});

test("Owner duplicate confirmation describes only adding a role, preserves cancellation and never promises another enquiry or ownership link", () => {
  const reused = [], loaded = loadServer("src/features/contacts/record-states.tsx", { modules: { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/lib/api/client": { ApiError } } });
  const id = randomUUID(), view = loaded.CommandError({ error: new ApiError("DUPLICATE_CONTACT", 409, { contacts: [{ id, name: "Synthetic known identity" }] }), record: "propriétaire", reuse: id => reused.push(id), dismiss() {} });
  const description = text(find(view, "AlertDialogDescription")[0]); assert.ok(description.includes("rôle Propriétaire")); assert.ok(description.includes("seront conservés")); assert.ok(!description.includes("nouvelle demande")); assert.equal(find(view, "AlertDialogCancel").length, 1);
  find(view, "Button").find(node => text(node).startsWith("Réutiliser")).props.onClick(); assert.deepEqual(reused, [id]);
});

test("A contact choice lookup denial hides its previous private options and reaches the owner parent", () => {
  const h = harness(), failures = []; let error;
  const loaded = loadServer("src/features/contacts/contact-selector.tsx", { modules: { react: { ...h.react, useId: () => "synthetic-owner-choice" }, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "./contracts": contacts, "./use-query": { queryPath: () => "synthetic", useQuery: () => ({ value: error ? undefined : { items: [{ ...client(), primary_agent: { display_name: "Private synthetic agent" } }], total: 1 }, error, refresh() {} }) }, "./record-states": { RecordError: "RecordError" }, "./numbered-pages": { NumberedPages: "Pages" } } });
  const root = () => loaded.ContactSelector({ choose() {}, denied: failure => failures.push(failure) }); assert.ok(text(h.render(root)).includes("Private synthetic agent")); error = new ApiError("FORBIDDEN", 403); const view = h.render(root); assert.equal(failures[0].status, 403); assert.ok(!text(view).includes("Private synthetic agent")); assert.equal(find(view, "RecordError").length, 1);
});
