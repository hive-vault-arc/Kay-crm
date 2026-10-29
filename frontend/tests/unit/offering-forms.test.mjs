import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { loadRecordCommand } from "./record-command-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type || node.type?.name === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.action, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(tree, label) { const found = find(tree, "Button").find(node => text(node) === label); assert.ok(found, label); return found; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const developments = loadServer("src/features/inventory/development-contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "./contracts": contracts } });
const at = "2026-10-20T12:00:00Z", tick = () => new Promise(resolve => setImmediate(resolve));
function target(level = "property", kind = "sale") {
  const id = randomUUID(), offering = contracts.offeringSchema.parse({ id: randomUUID(), property_id: level === "property" ? id : null, ...(level === "development" ? { development_id: id } : {}), target_level: level, kind, state: "available", occupied: false, is_current: true, version: 3, price_mad: "1234567890123456.78", currency: "MAD", price_period: kind === "sale" ? null : "year", annual_equivalent_mad: null, conditions: "Synthetic original conditions", availability_confirmed_at: at, created_at: at });
  const common = { id, reference: "SYN-OFFER", version: 7, location: null, archived_at: null, owners: [], offerings: [offering], created_at: at, updated_at: at };
  return level === "development" ? { ...developments.developmentSchema.parse({ ...common, name: "Synthetic programme", category: "mixed", unit_count: 0, available_unit_count: 0, developer: { marketing_display: null, contact: null }, briefing_text: null }), inventoryLevel: "development" } : contracts.propertySchema.parse({ ...common, category: "house", marketing_name: null, area_sqm: null, listing_details: { amenities: [] } });
}
function model(read = async () => { throw new Error("unexpected read"); }) { return loadServer("src/features/inventory/offering-form-model.ts", { modules: { "@/lib/api/client": { apiGet: read, ApiError }, "./contracts": contracts, "./development-contracts": developments } }); }
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `offering-${i}`; },
    createContext(value) { return { value }; }, useContext(context) { return context.value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const view = run(); effects.splice(0).forEach(effect => effect()); return view; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function setup({ source = target(), creating = false, availability = false, command, read, hydrated = true } = {}) {
  const h = harness(), calls = [], reads = [], decisions = [], focused = [], events = []; let saved = 0, cancelled = 0;
  const apiGet = async (...args) => { reads.push(args); if (!read) throw new Error("unexpected read"); return read(...args); };
  const fields = model(apiGet), props = { property: source, kind: source.offerings[0]?.kind ?? "sale", offering: creating ? undefined : source.offerings[0], saved: () => saved++, cancel: () => cancelled++ };
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const commands = loadRecordCommand(h, { source, ErrorType: ApiError, hydrated, command: async (...args) => { calls.push(args); return command ? command(...args) : undefined; } })
  const loaded = loadServer("src/features/inventory/offering-editor.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "@/components/icons": { PropertyIcon: "Icon" }, "@/components/shared/dossier-form": draft, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: (run, scope) => decisions.push({ run, scope }) }) }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "./contracts": contracts, "./offering-form-model": fields, "./states": { InventoryError: "InventoryError", InventoryStatus: "Status", Price: "Price" }, "./use-record-command": commands }, globals: { AbortController } });
  const render = () => h.render(() => { const wrapper = availability ? loaded.Availability(props) : loaded.OfferingEditor(props), view = wrapper.type(wrapper.props), form = find(view, "form")[0]; if (form?.props.ref) form.props.ref.current = { querySelector: name => ({ focus: () => focused.push(name) }) }; return view; });
  render();
  const change = (name, value) => { const input = ["Input", "Select", "Textarea"].flatMap(type => find(render(), type)).find(node => node.props.name === name); assert.ok(input, name); input.props.onChange({ target: { value } }); };
  return { ...h, render, props, fields, calls, reads, decisions, focused, events, change, accepted: commands.accepted, saved: () => saved, cancelled: () => cancelled, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); } };
}

test("Offering values retain exact original rent/conditions, unknown prices and market-specific defaults", () => {
  const m = model(), source = target("property", "rental"), offer = source.offerings[0];
  assert.equal(m.offeringValues("rental", offer).period, "year"); assert.equal(m.offeringValues("rental", offer).price, "1234567890123456.78"); assert.equal(m.offeringValues("holiday").period, "day");
  const values = { ...m.offeringValues("rental", offer), price: " 12345,67 ", reason: "Synthetic change" }, body = m.offeringBody(source, "rental", values, offer.id); assert.equal(body.success, true); assert.equal(body.data.price_mad, "12345.67"); assert.equal(body.data.price_period, "year");
  assert.equal(m.offeringBody(source, "rental", { ...values, price: "" }, offer.id).data.price_mad, null);
  for (const price of ["0", "-1", "1e3", "1.234", "1 000"]) assert.equal(m.offeringBody(source, "rental", { ...values, price }, offer.id).success, false);
  assert.equal(m.offeringBody(source, "rental", { ...values, period: "day" }, offer.id).success, false);
});

test("Offering create/edit/availability bodies use actual target and offering versions without unrelated fields", () => {
  const m = model(); for (const level of ["property", "development"]) {
    const source = target(level), offer = source.offerings[0], values = { ...m.offeringValues("sale", offer), reason: "Synthetic confirmation" }, expected = level === "property" ? "expected_property_version" : "expected_development_version";
    const edited = m.offeringBody(source, "sale", values, offer.id).data; assert.equal(edited[expected], 7); assert.equal(edited.expected_version, 3); assert.equal(edited.price_period, null);
    const created = m.offeringBody({ ...source, offerings: [] }, "sale", values).data; assert.equal(created[`${level}_id`], source.id); assert.equal(created[expected], 7); assert.equal("state" in created, false); assert.equal("reason" in created, false);
    assert.deepEqual(plain(m.offeringBody(source, "sale", values, offer.id, true).data), { expected_version: 7, offering_id: offer.id, expected_offering_version: 3, reason: "Synthetic confirmation" });
  }
});

test("Offering baselines reject foreign/replaced/noncurrent stock, archive and engaged states without inventing availability", () => {
  const m = model(), source = target(), offer = source.offerings[0], values = { ...m.offeringValues("sale", offer), reason: "Synthetic change" };
  assert.equal(m.offeringEditable(source, "sale", offer.id), true); assert.equal(m.offeringEditable(source, "sale"), false);
  for (const state of ["reserved", "sold", "rented", "review", "withdrawn"]) assert.equal(m.offeringEditable({ ...source, offerings: [{ ...offer, state }] }, "sale", offer.id), false);
  for (const changes of [{ is_current: false }, { id: randomUUID() }, { property_id: randomUUID() }, { target_level: "development" }]) assert.equal(m.offeringEditable({ ...source, offerings: [{ ...offer, ...changes }] }, "sale", offer.id), false);
  assert.equal(m.offeringEditable({ ...source, archived_at: at }, "sale", offer.id), false); assert.equal(m.offeringEditable({ ...target("development"), offerings: [] }, "holiday"), false);
  assert.equal(m.offeringEditable({ ...source, offerings: [{ ...offer, property_id: randomUUID() }] }, "rental"), false);
  assert.equal(m.offeringBody({ ...source, offerings: [{ ...offer, state: "draft" }] }, "sale", values, offer.id).success, false);
});

test("Offering comparison reads only the real parent route with abort support and rejects a foreign parent", async () => {
  for (const level of ["property", "development"]) { const source = target(level), controller = new AbortController(), calls = [], m = model(async (...args) => { calls.push(args); return source; }); assert.equal((await m.readOfferingTarget(source, controller.signal)).id, source.id); assert.equal(calls[0][0], `/api/v1/${level === "property" ? "properties" : "developments"}/${source.id}`); assert.equal(calls[0][2], controller.signal); }
  const source = target(); await assert.rejects(model(async () => target()).readOfferingTarget(source, new AbortController().signal), error => error.status === 503);
});

test("Offering creation is one managed focused form with shared sections/footer and no automatic submission", async () => {
  const source = { ...target(), offerings: [] }, s = setup({ source, creating: true }); let view = s.render(), form = find(view, "form")[0];
  assert.equal(form.props.className, "kay-drawer-form"); assert.equal(form.props["data-draft-managed"], true); assert.equal(form.props["data-live-dirty"], undefined); assert.equal(find(view, "form").length, 1); assert.equal(find(view, "Entry").length, 1); assert.equal(s.calls.length, 0);
  s.change("price", "100,25"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); s.submit(); await tick(); assert.equal(s.calls[0][0], "/api/v1/offerings"); assert.equal(s.calls[0][1].price_mad, "100.25"); assert.equal(s.calls[0][4], "POST"); assert.equal(s.saved(), 1); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Offering edit validates the real fields, retains original annual rent and does not coerce incomplete prices", async () => {
  const s = setup({ source: target("property", "rental") }); s.submit(); await tick(); assert.equal(s.calls.length, 0); assert.ok(s.focused.includes('[name="reason"]'));
  s.change("reason", "Synthetic edit"); s.change("price", ""); s.submit(); await tick(); assert.equal(s.calls[0][4], "PATCH"); assert.equal(s.calls[0][1].price_mad, null); assert.equal(s.calls[0][1].price_period, "year"); assert.equal(s.calls[0][1].expected_version, 3); assert.equal(s.calls[0][1].expected_property_version, 7); assert.equal(s.accepted[0].offerings[0].price_mad, null); assert.equal(s.accepted[0].offerings[0].price_period, "year");
});

test("Offering submissions serialize commands and retain the original request despite changed input handlers", async () => {
  let release, first = true; const s = setup({ command: () => first ? new Promise((_resolve, reject) => { release = () => { first = false; reject(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }; }) : Promise.reject(new ApiError("DEPENDENCY_UNAVAILABLE", 503)) });
  s.change("reason", "Synthetic retry"); s.submit(); s.submit(); await tick(); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); release(); await tick(); s.submit(); await tick(); assert.equal(s.calls.length, 2); assert.equal(s.calls[1][3], s.calls[0][3]); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true");
  s.change("price", "200"); s.submit(); await tick(); assert.equal(s.calls[2][3], s.calls[1][3]); assert.equal(s.calls[2][1].price_mad, s.calls[0][1].price_mad); const cold = setup({ hydrated: false }); cold.change("reason", "Synthetic"); cold.submit(); await tick(); assert.equal(cold.calls.length, 0);
});

test("Offering conflict comparison preserves inputs until explicit keep or guarded reload and uses both current versions", async () => {
  const source = target(), fresh = { ...source, version: 9, offerings: [{ ...source.offerings[0], version: 6, price_mad: "200.00" }] }; let conflict = true;
  const s = setup({ source, read: async () => fresh, command: () => { if (conflict) { conflict = false; throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } return { property_id: source.id }; } });
  s.change("price", "150"); s.change("reason", "Synthetic change"); s.submit(); await tick(); button(s.render(), "Comparer l’offre actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Input")[0].props.value, "150"); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true); s.submit(); assert.equal(s.calls.length, 1);
  button(s.render(), "Conserver ma saisie sur cette version").props.onClick(); s.submit(); await tick(); assert.equal(s.calls[1][1].expected_property_version, 9); assert.equal(s.calls[1][1].expected_version, 6); assert.equal(s.calls[1][1].price_mad, "150");
  const r = setup({ source, read: async () => fresh, command: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } }); r.change("reason", "Synthetic draft"); r.submit(); await tick(); button(r.render(), "Comparer l’offre actuelle").props.onClick(); await tick(); button(r.render(), "Recharger cette offre").props.onClick(); assert.equal(r.decisions.length, 1); assert.equal(find(r.render(), "Textarea").find(node => node.props.name === "reason").props.value, "Synthetic draft"); r.decisions[0].run(); assert.equal(find(r.render(), "Input")[0].props.value, "200.00"); assert.equal(find(r.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Archived, engaged or replaced comparison cannot become an editable baseline for the old campaign", async () => {
  const source = target();
  for (const fresh of [{ ...source, archived_at: at }, { ...source, offerings: [{ ...source.offerings[0], state: "reserved" }] }, { ...source, offerings: [{ ...source.offerings[0], id: randomUUID() }] }]) {
    const s = setup({ source, read: async () => fresh, command: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } }); s.change("reason", "Synthetic draft"); s.submit(); await tick(); button(s.render(), "Comparer l’offre actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Button").some(node => text(node) === "Conserver ma saisie sur cette version"), false); s.submit(); assert.equal(s.calls.length, 1);
  }
});

test("Offering current denial remains masked for that owner while transient failures retain drafts", async () => {
  const source = target(), s = setup({ source, read: async () => ({ ...source, version: 9 }), command: () => { throw new ApiError("FORBIDDEN", 403); } }); s.change("conditions", "Synthetic private edit"); s.change("reason", "Synthetic reason"); s.submit(); await tick(); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Textarea").length, 0); find(s.render(), "Error")[0].props.retry(); await tick(); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Textarea").length, 0);
  const transient = setup({ command: () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); transient.change("reason", "Synthetic retained"); transient.submit(); await tick(); assert.equal(find(transient.render(), "Textarea").find(node => node.props.name === "reason").props.value, "Synthetic retained");
});

test("Offering departure aborts comparison and suppresses late or foreign command success", async () => {
  const source = target(); let releaseRead, releaseSave;
  const r = setup({ source, read: () => new Promise(resolve => { releaseRead = resolve; }), command: () => { throw new ApiError("INVENTORY_VERSION_CONFLICT", 409); } }); r.change("reason", "Synthetic"); r.submit(); await tick(); button(r.render(), "Comparer l’offre actuelle").props.onClick(); await tick(); assert.equal(r.reads.length, 1); r.unmount(); assert.equal(r.reads[0][2].aborted, true); releaseRead({ ...source, version: 9 }); await tick(); assert.equal(r.saved(), 0);
  const s = setup({ source, command: () => new Promise(resolve => { releaseSave = resolve; }) }); s.change("reason", "Synthetic"); s.submit(); await tick(); s.unmount(); releaseSave({ property_id: source.id }); await tick(); assert.equal(s.saved(), 0);
  const foreign = setup({ source, command: async () => ({ property_id: randomUUID() }) }); foreign.change("reason", "Synthetic"); foreign.submit(); await tick(); assert.equal(foreign.saved(), 0); assert.equal(find(foreign.render(), "InventoryError")[0].props.error.status, 503);
});

test("Availability uses a focused reason-only form and exact target/offering versions for both physical and whole targets", async () => {
  for (const level of ["property", "development"]) { const source = target(level), s = setup({ source, availability: true }); assert.equal(find(s.render(), "Input").length, 0); assert.equal(find(s.render(), "Textarea").length, 1); s.submit(); await tick(); assert.equal(s.calls.length, 0); s.change("reason", "Synthetic stock verification"); s.submit(); await tick(); assert.equal(s.calls[0][0], `/api/v1/${level === "property" ? "properties" : "developments"}/${source.id}/confirm-availability`); assert.deepEqual(plain(s.calls[0][1]), { expected_version: 7, offering_id: source.offerings[0].id, expected_offering_version: 3, reason: "Synthetic stock verification" }); assert.equal(s.calls[0][4], "POST"); assert.equal(s.saved(), 1); }
});

test("Unknown offer/availability saves keep exact original fields and protect Cancel and comparison", async () => {
  for (const availability of [false, true]) {
    let lost = true; const s = setup({ source: target("property", "rental"), availability, command: () => { if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return {}; } }); s.change("reason", "Original shared reason"); const initial = s.render(); s.submit(); await tick(); const view = s.render(); assert.equal(find(view, "form")[0].props["data-write-recovery"], true); assert.equal(button(view, "Annuler").props.disabled, true); button(view, "Annuler").props.onClick(); assert.equal(s.cancelled(), 0);
    find(initial, "Textarea").find(node => node.props.name === "reason").props.onChange({ target: { value: "Replacement" } }); assert.equal(find(s.render(), "Textarea").find(node => node.props.name === "reason").props.value, "Original shared reason"); lost = false; s.submit(); await tick(); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].reason, "Original shared reason"); assert.equal(s.saved(), 1);
  }
});

test("Offer row actions open one focused editor per command and retain readonly/reservation/holiday boundaries", () => {
  const loaded = loadServer("src/features/inventory/campaign.tsx", { modules: { "react/jsx-runtime": runtime, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/lib/format": { formatInstant: value => value }, "./contracts": contracts, "./offering-editor": { OfferingEditor: "Editor", Availability: "Availability" }, "./states": { InventoryStatus: "Status", Price: "Price" }, "./external-outcome": { ExternalOutcome: "External" } } });
  const property = target(), offering = property.offerings[0], props = { property, offering, writable: true, busy: false, saved() {} }, active = loaded.CampaignActions(props); assert.equal(find(active, "Drawer").length, 2); assert.ok(find(active, "Drawer").every(node => node.props.iconOnly)); assert.equal(find(active, "External")[0].props.iconOnly, true); const cancel = () => {}, done = () => {}; assert.equal(find(active, "Drawer")[0].props.children(cancel, done).type, "Editor"); assert.equal(find(active, "Drawer")[1].props.children(cancel, done).type, "Availability");
  for (const state of ["reserved", "sold", "review"]) { const view = loaded.CampaignActions({ ...props, offering: { ...offering, state } }); assert.ok(find(view, "Drawer").every(node => node.props.action === "preview")); assert.equal(find(view, "External").length, state === "reserved" ? 1 : 0); }
  assert.equal(find(loaded.CampaignActions({ ...props, writable: false }), "External").length, 0); assert.equal(find(loaded.CampaignActions({ ...props, offering: { ...offering, kind: "holiday" } }), "External").length, 0); assert.equal(find(loaded.Campaign(props), "form").length, 0);
});
