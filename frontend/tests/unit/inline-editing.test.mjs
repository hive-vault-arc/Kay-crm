import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServer } from "./load-server.mjs";
import { loadEnquiryCommand } from "./enquiry-fixtures.mjs";
import { contactEditFormModules } from "./contact-edit-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function harness() {
  let cursor = 0; const state = [], prefix = randomUUID();
  return { react: {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial; return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useId() { const index = cursor++; return prefix + index; }, useEffect() {}, useCallback: callback => callback,
  }, render(callback) { cursor = 0; return callback(); } };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type || typeof type === "function" && type(node) ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.review, type)];
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const deals = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": qualification } });
const at = "2026-10-20T12:00:00Z", metadata = { countries: [{ code: "MA", calling_code: "+212" }], languages: [{ value: "french", label: "Français" }], campaign_sources: [], budget_bands: [], purchase_reasons: [] };
class ApiError extends Error { constructor(code, status, details) { super(code); this.code = code; this.status = status; this.details = details; } }
function contact(overrides = {}) {
  return contacts.contactSchema.parse({ id: randomUUID(), name: "Synthetic contact", type: "person", primary_phone: "+212600000000", primary_email: "synthetic@example.invalid", primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, version: 17, archived_at: null, country: "MA", nationality: "", languages: ["french"], calling_code: "+212", phones: [{ number: "+212600000000", label: "Mobile", is_primary: true }, { number: "+212600000001", label: "Bureau", is_primary: false }], emails: [{ email: "synthetic@example.invalid", label: "Bureau", is_primary: true }], roles: ["buyer"], source: "manual", source_submission_id: null, created_by_user_id: null, created_at: at, updated_at: at, collaborators: [], ...overrides });
}
function summary(value) { return contacts.contactSummarySchema.parse(Object.fromEntries(Object.keys(contacts.contactSummarySchema.shape).map(key => [key, value[key]]))); }
function enquiry(overrides = {}) {
  const client = contact();
  return contacts.enquirySchema.parse({ id: randomUUID(), version: 7, contact: summary(client), source: "manual", source_submission_id: null, assigned_agent: null, received_at: at, updated_at: at, created_by_user_id: null, status: "in_progress", origin_contact_id: client.id, initial_budget: "1 400 000 MAD", campaign_source: "broker", rating: "cold", converted_deal_id: null, converted_at: null, archived_at: null, message: "Original synthetic message", ...overrides });
}
function deal(overrides = {}) {
  const client = contact();
  return deals.dealSchema.parse({ id: randomUUID(), version: 7, title: "Synthetic deal", stage: "new", contact: summary(client), origin_contact_id: client.id, enquiry_id: null, requirement_id: null, offering: null, next_action: "Original synthetic action", stock_review_required: false, archived_at: null, primary_agent_at_close_id: null, active_reservation: null, reservation_conflict: null, customer_offer_count: 0, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, initial_budget: "1 400 000 MAD", campaign_source: "broker", rating: "cold", purchase_reasons: ["residence"], client_snapshot: {}, notes: "Original synthetic note", payment_method: "mortgage", number_of_rooms: 0, projects: [{ position: 1, name: "Synthetic programme", development_id: randomUUID(), property_id: null, external_name: null }], ...overrides });
}
function formHarness(value) {
  let values = structuredClone(value);
  const state = { isDirty: false, isSubmitting: false, errors: {} };
  const form = { control: {}, formState: state,
    getValues: field => field ? values[field] : values,
    setValue(path, value) { const [key, index, prop] = path.split("."); if (index !== undefined) values[key][Number(index)][prop] = value; else values[key] = value; state.isDirty = true; },
    reset(value) { values = structuredClone(value); state.isDirty = false; },
    handleSubmit: (callback, invalid) => async event => { event.preventDefault(); const parsed = contacts.contactFieldsSchema.safeParse(values); if (!parsed.success) { invalid?.(); return; } state.isSubmitting = true; try { await callback(parsed.data); } finally { state.isSubmitting = false; } },
  };
  return form;
}
function contactInline(state, form, command, { read } = {}) {
  const contact = contactEditFormModules(state, { request: command, read, contracts: contacts, ErrorType: ApiError });
  const recovery = loadServer("src/features/contacts/contact-edit-recovery.tsx", { modules: { "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "./record-states": { CommandError: "CommandError" } } });
  const invoke = (type, props, key) => type === recovery.ContactEditRecovery ? type(props) : jsx(type, props, key);
  return loadServer("src/features/contacts/contact-inline-field.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: state.react, "react/jsx-runtime": { jsx: invoke, jsxs: invoke, Fragment: "Fragment" }, "./contact-edit-intent": contact.intent, "./use-contact-edit-command": contact.command, "./contact-edit-recovery": recovery, "@hookform/resolvers/zod": { zodResolver() {} }, "react-hook-form": { useForm: () => form }, "@/components/icons": { PhoneIcon: "Phone", EmailIcon: "Mail" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/form": { Form: "Form" }, "@/components/shared/inline-record-field": { InlineFieldForm: "InlineForm", InlineRecordField: "Field" },
    "@/lib/api/command": { apiCommand: command }, "@/lib/api/client": { ApiError }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./contact-fields": { ContactFields: "ContactFields" }, "./contracts": contacts, "./qualification-inputs": { countryLabel: value => value }, "./qualification-contracts": vocabulary, "./record-states": { RecordError: "Error", CommandError: "CommandError" }, "./use-query": {},
  } });
}
function leadInline(state, command) {
  const hook = loadEnquiryCommand(state, { ApiError, command });
  return loadServer("src/features/contacts/lead-inline-field.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: state.react, "react/jsx-runtime": runtime, "@/components/shared/inline-record-field": { InlineFieldForm: "InlineForm", InlineRecordField: "Field" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/button": { Button: "Button" }, "./use-enquiry-command": hook, "@/lib/api/client": { ApiError }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./qualification-inputs": { BudgetInput: "Budget" }, "./qualification-contracts": vocabulary, "./contracts": contacts, "./record-states": { RecordError: "Error" }, "./use-query": {},
  } });
}
function dealInline(state) {
  return loadServer("src/features/deals/deal-inline-field.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: state.react, "react/jsx-runtime": runtime, "@/components/shared/inline-record-field": { InlineFieldForm: "InlineForm", InlineRecordField: "Field" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/features/contacts/qualification-inputs": { BudgetInput: "Budget" }, "@/features/contacts/qualification-contracts": vocabulary, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": {}, "./qualification-contracts": qualification, "./contracts": deals, "./project-picker": { ProjectPicker: "Project" },
  } });
}

test("Only one inline editor opens after guarded consent; explicit cancel restores the value without a write", () => {
  const root = harness(), one = harness(), two = harness(), guarded = [], focused = []; let dispatcher = root, scope;
  const runtimeReact = { ...root.react, useState: (...args) => dispatcher.react.useState(...args), useRef: (...args) => dispatcher.react.useRef(...args), useId: (...args) => dispatcher.react.useId(...args), createContext: () => ({ Provider: "Scope" }), useContext: () => scope };
  const loaded = loadServer("src/components/shared/inline-record-field.tsx", { globals: { requestAnimationFrame: callback => callback(), document: { getElementById: id => ({ focus: () => focused.push(id) }) } }, modules: { react: runtimeReact, "react/jsx-runtime": runtime, "@/components/icons": { EditIcon: "Edit" }, "@/components/ui/button": { Button: "Button" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./unsaved-guard": { useUnsavedGuard: () => ({ request: callback => guarded.push(callback), dialog: null }) } } });
  const renderScope = () => { dispatcher = root; scope = root.render(() => loaded.InlineEditScope({ children: "Fields" })).props.value; };
  const render = (state, label, writable = true) => { dispatcher = state; return state.render(() => loaded.InlineRecordField({ label, writable, icon: "Icon", display: "Original", editor: controls => jsx("Editor", controls) })); };
  renderScope(); find(render(one, "Nom"), "Button")[0].props.onClick(); assert.equal(find(render(one, "Nom"), "Editor").length, 0);
  guarded.shift()(); renderScope(); assert.equal(find(render(one, "Nom"), "Editor").length, 1);
  find(render(two, "Budget"), "Button")[0].props.onClick(); assert.equal(find(render(one, "Nom"), "Editor").length, 1);
  guarded.shift()(); renderScope(); assert.equal(find(render(one, "Nom"), "Editor").length, 0);
  find(render(two, "Budget"), "Editor")[0].props.cancel(); renderScope(); assert.equal(find(render(two, "Budget"), "Editor").length, 0); assert.equal(focused.length, 1);
  assert.equal(find(render(one, "Nom", false), "Button").length, 0);
  find(render(one, "Nom"), "Button")[0].props.onClick(); guarded.shift()(); renderScope();
  const escape = blocked => ({ key: "Escape", defaultPrevented: false, currentTarget: { querySelector: () => blocked ? {} : null }, preventDefault() {}, stopPropagation() {} });
  render(one, "Nom").props.onKeyDown(escape(true)); renderScope(); assert.equal(find(render(one, "Nom"), "Editor").length, 1);
  render(one, "Nom").props.onKeyDown(escape(false)); renderScope(); assert.equal(find(render(one, "Nom"), "Editor").length, 0);
});

test("Contact inline save preserves complete collections, original version and same retry identity", async () => {
  const state = harness(), value = contact(), calls = [], acknowledged = [], form = formHarness({ name: value.name, type: value.type, phones: value.phones, emails: value.emails, roles: value.roles, country: value.country, nationality: value.nationality, languages: value.languages }); let fail = true;
  const loaded = contactInline(state, form, async (...args) => { calls.push(args); assert.equal(args[2], contacts.contactSchema); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...value, name: "Edited synthetic contact", version: 18 }; }, { read: (_path, schema) => schema.parse(props.contact) });
  let props = { contact: value, metadata, field: "name", label: "Nom", controls: { saved: () => acknowledged.push(true), cancel() {} }, saved() {}, denied() {} };
  const render = () => state.render(() => loaded.ContactFieldEditor(props)); render(); form.setValue("name", "Edited synthetic contact");
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(acknowledged.length, 0);
  props = { ...props, contact: { ...value, version: 21 } }; fail = false; find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  assert.equal(calls.length, 2); assert.equal(calls[0][3], calls[1][3]); assert.equal(calls[1][4], "PATCH"); assert.equal(calls[1][1].expected_version, 17);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1].phones)), value.phones); assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1].emails)), value.emails); assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1].roles)), value.roles); assert.equal(acknowledged.length, 1);
});

test("Keeping a conflicted contact field rebases only that field onto the current full contact", async () => {
  const state = harness(), original = contact(), calls = [], current = { ...original, name: "Current synthetic name", version: 19, nationality: "FR" }, form = formHarness({ name: original.name, type: original.type, phones: original.phones, emails: original.emails, roles: original.roles, country: original.country, nationality: original.nationality, languages: original.languages });
  const loaded = contactInline(state, form, async (...args) => { calls.push(args); if (calls.length === 1) throw new ApiError("VERSION_CONFLICT", 409, { current }); return { ...current, country: args[1].country, version: 20 }; });
  const props = { contact: original, metadata, field: "country", label: "Pays", controls: { saved() {}, cancel() {} }, saved() {}, denied() {} }, render = () => state.render(() => loaded.ContactFieldEditor(props));
  render(); form.setValue("country", "ES"); find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  find(render(), "Button").find(node => node.props.children === "Comparer les coordonnées actuelles").props.onClick(); await delay(0);
  find(render(), "Button").find(node => node.props.children === "Conserver ma saisie").props.onClick();
  assert.equal(form.getValues("country"), "ES"); assert.equal(form.formState.isDirty, true); assert.equal(form.getValues("name"), current.name); assert.equal(form.getValues("nationality"), "FR");
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls[1][1].expected_version, 19); assert.equal(calls[1][1].name, current.name); assert.notEqual(calls[0][3], calls[1][3]);
});

test("Contact current-denial is propagated and never acknowledged as a successful inline save", async () => {
  const state = harness(), original = contact(), denied = [], saved = [], form = formHarness({ name: original.name, type: original.type, phones: original.phones, emails: original.emails, roles: original.roles, country: original.country, nationality: original.nationality, languages: original.languages });
  const loaded = contactInline(state, form, async () => { throw new ApiError("FORBIDDEN", 403); });
  const render = () => state.render(() => loaded.ContactFieldEditor({ contact: original, metadata, field: "name", label: "Nom", controls: { saved: () => saved.push(true), cancel() {} }, saved() {}, denied: error => denied.push(error) }));
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(denied[0].code, "FORBIDDEN"); assert.equal(saved.length, 0);
});

test("Narrow contact collection editing retains primary selection and labels while rendering only the requested group", () => {
  const state = harness(), value = contact(), form = formHarness({ name: value.name, type: value.type, phones: value.phones, emails: value.emails, roles: value.roles, country: value.country, nationality: value.nationality, languages: value.languages });
  const { ContactFields } = loadServer("src/features/contacts/contact-fields.tsx", { modules: {
    react: state.react, "react/jsx-runtime": runtime, "@/components/icons": { PhoneIcon: "Phone", EmailIcon: "Mail" }, "@/components/shared/section-heading": { SectionHeading: "Heading" },
    "@/components/shared/record-workspace": { RecordSection: "Section" },
    "react-hook-form": { useWatch: ({ name }) => form.getValues(name), useFieldArray: ({ name }) => ({ fields: form.getValues(name).map((row, index) => ({ ...row, id: String(index) })), replace: rows => form.setValue(name, rows), append: row => form.setValue(name, [...form.getValues(name), row]) }) },
    "@/components/ui/form": { FormControl: "Control", FormField: "Field", FormItem: "Item", FormLabel: "Label", FormMessage: "Message" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/radio-group": { RadioGroup: "Radios", RadioGroupItem: "Radio" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/button": { Button: "Button" }, "./contracts": contacts, "./qualification-inputs": { countryOptions: () => [], InternationalPhoneInput: "PhoneInput", LanguagePicker: "Languages" },
  } });
  const render = only => state.render(() => ContactFields({ form, metadata, compact: true, only }));
  assert.equal(find(render("phones"), "Field").some(node => node.props.name.startsWith("emails")), false);
  find(render("phones"), "Radios")[0].props.onValueChange("1"); assert.equal(form.getValues("phones")[1].is_primary, true);
  find(render("phones"), "Button").find(node => node.props["aria-label"] === "Retirer le téléphone 2").props.onClick();
  assert.equal(form.getValues("phones").length, 1); assert.equal(form.getValues("phones")[0].is_primary, true); assert.equal(form.getValues("phones")[0].label, "Mobile");
  assert.equal(form.getValues("emails")[0].email, value.emails[0].email);
  assert.deepEqual(find(render("languages"), "Field").map(node => node.props.name), ["languages"]);
});

test("Lead inline changes preserve message/status/provenance boundary, reviewed version and retry key", async () => {
  const state = harness(), original = enquiry(), calls = []; let fail = true;
  const loaded = leadInline(state, async (...args) => { calls.push(args); if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return original; });
  let props = { enquiry: original, metadata, field: "initial_budget", label: "Budget", controls: { saved() {}, cancel() {} }, saved() {}, denied() {} };
  const render = () => state.render(() => loaded.LeadFieldEditor(props)); find(render(), "Budget")[0].props.onChange("2 000 000 MAD");
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); props = { ...props, enquiry: { ...original, version: 12, message: "Later synthetic message" } }; fail = false;
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  assert.equal(calls[0][3], calls[1][3]); assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1])), { ...loaded.leadInlineValues(original), initial_budget: "2 000 000 MAD", expected_version: 7 }); assert.equal("source" in calls[1][1], false); assert.equal("contact_fields" in calls[1][1], false);
});

test("Legacy missing budget remains required when editing a lead message", async () => {
  const state = harness(), original = enquiry({ initial_budget: null }), calls = [];
  const loaded = leadInline(state, async (...args) => { calls.push(args); return original; });
  const props = { enquiry: original, metadata, field: "message", label: "Description", controls: { saved() {}, cancel() {} }, saved() {}, denied() {} }, render = () => state.render(() => loaded.LeadFieldEditor(props));
  assert.equal(find(render(), "Budget").length, 1); find(render(), "Textarea")[0].props.onChange({ target: { value: "Edited synthetic message" } });
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls.length, 0);
  find(render(), "Budget")[0].props.onChange("1 000 000 MAD"); find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls.length, 1); assert.equal(calls[0][1].initial_budget, "1 000 000 MAD");
});

test("Deal inline save uses the original atomic edit boundary, preserves projects/offering versions and serializes submits", async () => {
  const state = harness(), original = deal(), calls = [], loaded = dealInline(state); let unlock, accepted = false, pending = Promise.resolve();
  let props = { deal: original, field: "notes", label: "Notes", metadata, writable: true, busy: false, controls: { saved() {}, cancel() {} }, mutate: async (...args) => { calls.push(args); await pending; return accepted; } };
  const render = () => state.render(() => loaded.DealFieldEditor(props)); find(render(), "Textarea")[0].props.onChange({ target: { value: "Edited synthetic note" } });
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  props = { ...props, deal: { ...original, version: 20, next_action: "Later action" } }; accepted = true; pending = new Promise(resolve => { unlock = resolve; });
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); assert.equal(calls.length, 2); unlock(); await delay(0);
  assert.equal(calls[1][0], `/api/v1/deals/${original.id}`); assert.equal(calls[1][2], "PATCH");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1])), { ...loaded.dealInlineValues(original), projects: [{ development_id: original.projects[0].development_id }], expected_version: 7, notes: "Edited synthetic note" });
  assert.equal(calls.some(args => /reserve|release|transition|close/.test(args[0])), false);
});

test("Deal required qualification is visible and cannot be bypassed by editing notes; zero room counts remain valid", async () => {
  const state = harness(), original = deal({ initial_budget: null, purchase_reasons: [], projects: [] }), calls = [], loaded = dealInline(state);
  const props = { deal: original, field: "notes", label: "Notes", metadata, writable: true, busy: false, controls: { saved() {}, cancel() {} }, mutate: async (...args) => { calls.push(args); return true; } }, render = () => state.render(() => loaded.DealFieldEditor(props));
  assert.equal(find(render(), "Budget").length, 1); assert.equal(find(render(), "Project").length, 1); assert.ok(find(render(), "Checkbox").length > 0);
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls.length, 0);
  find(render(), "Budget")[0].props.onChange("2 000 000 MAD"); find(render(), "Checkbox")[0].props.onCheckedChange(true); find(render(), "Project")[0].props.choose({ label: "Synthetic external project", choice: { external_name: "Synthetic external project" } });
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0); assert.equal(calls.length, 1); assert.equal(calls[0][1].number_of_rooms, 0);
  const readonly = loaded.DealInlineField({ ...props, deal: { ...original, stage: "won" }, icon: "Icon", display: "value" }); assert.equal(readonly.props.writable, false);
});

test("Empty or unmatched phone metadata preserves full international input without assuming a country", () => {
  const loaded = loadServer("src/features/contacts/qualification-inputs.tsx", { modules: { react, "react/jsx-runtime": jsxRuntime, "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" }, "@/components/ui/native-select": { NativeSelect: "select" } } });
  const html = renderToStaticMarkup(react.createElement(loaded.InternationalPhoneInput, { metadata: { ...metadata, countries: [] }, label: "Téléphone", value: "+212600000000", onChange() {} }));
  assert.match(html, /role="status"/); assert.match(html, /Saisissez le numéro international complet/); assert.match(html, /value="\+212600000000"/); assert.doesNotMatch(html, /<select/);
  const unmatched = renderToStaticMarkup(react.createElement(loaded.InternationalPhoneInput, { metadata: { ...metadata, countries: [{ code: "FR", calling_code: "+33" }] }, label: "Téléphone", value: "+212600000000", onChange() {} }));
  assert.match(unmatched, /value="\+212600000000"/); assert.doesNotMatch(unmatched, /<select/);
});

test("Contact profile keeps primary methods stable and loads secondary methods only after disclosure", () => {
  const owner = harness(), extra = harness(), calls = [], original = contact(); let dispatcher = owner, remote = summary(original);
  const loaded = loadServer("src/features/contacts/contact-profile-panel.tsx", { modules: {
    react: { ...owner.react, useState: (...args) => dispatcher.react.useState(...args) }, "react/jsx-runtime": runtime, "next/link": { default: "Link" },
    "@/components/icons": { ContactIcon: "Contact", ContactsIcon: "People", EmailIcon: "Mail", LocationIcon: "Location", PhoneIcon: "Phone" }, "@/components/ui/button": { Button: "Button" }, "@/components/shared/record-facts": { RecordFact: "Fact", RecordFacts: "Facts" }, "@/components/shared/record-workspace": { RecordSection: "Section" },
    "@/features/realtime/current-record": loadServer("src/features/realtime/current-record.ts"), "./contracts": contacts, "./use-query": { useQuery: path => { calls.push(path); return { value: original, refresh() {}, refreshQuietly() {} }; } }, "./record-states": { RecordError: "Error" }, "./contact-inline-field": { ContactInlineField: "Field" },
  } });
  const render = () => { dispatcher = owner; return owner.render(() => loaded.ContactProfilePanel({ contact: remote, writable: true, denied() {} })); };
  let view = render(); assert.equal(calls.length, 0);
  find(view, "Field").find(node => node.props.field === "name").props.saved({ ...original, version: 18 });
  view = render(); assert.equal(find(view, "Field").find(node => node.props.field === "phones").props.display, original.primary_phone); assert.equal(find(view, "Field").find(node => node.props.field === "phones").props.methodScope, "primary");
  find(view, "details")[0].props.onToggle({ currentTarget: { open: true } }); view = render();
  const methods = find(view, node => node.type?.name === "ContactAdditionalMethods")[0]; dispatcher = extra;
  const body = extra.render(() => methods.type(methods.props)); assert.equal(calls[0], `/api/v1/contacts/${original.id}`);
  assert.equal(find(body, "Field").length, 3); assert.ok(find(body, "Field").some(node => node.props.field === "birth_date"));
  const secondary = find(body, "Field").find(node => node.props.field === "phones");
  assert.equal(secondary.props.methodScope, "secondary"); assert.match(secondary.props.display.props.children, /Bureau/);
  remote = { ...remote, version: 18, name: "Authoritative same-version name" }; view = render();
  assert.equal(find(view, "Field").find(node => node.props.field === "name").props.contact.name, remote.name);
});

test("Canonical inline recovery freezes nested methods and permits only its original retry during metadata outage", async () => {
  const state = harness(), client = contact(), calls = [], form = formHarness({ name: client.name, type: client.type, phones: client.phones, emails: client.emails, roles: client.roles, country: client.country, nationality: client.nationality, languages: client.languages }); let first = true, completed = 0;
  const loaded = contactInline(state, form, async (...args) => { calls.push(args); if (first) { first = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return { ...client, version: client.version + 1 }; });
  const props = { contact: client, metadata, field: "phones", label: "Téléphones", controls: { saved: () => completed++, cancel() {} }, saved() {}, denied() {} }, render = () => state.render(() => loaded.ContactFieldEditor(props));
  find(render(), "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  let tree = render(); assert.equal(find(tree, "InlineForm")[0].props.recovering, true);
  const changed = client.phones.map(value => ({ ...value, label: "Synthetic unsent label" })); form.setValue("phones", changed); props.unavailable = true;
  tree = render(); find(tree, "InlineForm")[0].props.submit({ preventDefault() {} }); await delay(0);
  assert.equal(calls.length, 2); assert.equal(calls[0][3], calls[1][3]); assert.deepEqual(calls[1][1].phones, client.phones); assert.equal(completed, 1);
});
