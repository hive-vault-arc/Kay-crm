import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { ownershipPreview, ownershipReceipt, loadOwnershipCommand } from "./ownership-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.action, type), ...find(node.props?.aside, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/owners/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const queryPath = (kind, values) => `/api/v1/${kind}?${new URLSearchParams(Object.entries(values).filter(([, value]) => value !== "")).toString()}`;
const model = loadServer("src/features/owners/owner-directory-model.ts", { modules: { "@/features/contacts/use-query": { queryPath } } });
const currentRecord = loadServer("src/features/realtime/current-record.ts");
const at = "2026-10-20T12:00:00Z";
const client = (changes = {}) => contacts.contactSchema.parse({ id: randomUUID(), name: "Synthetic linked owner", type: "person", primary_phone: "+212600000001", primary_email: "synthetic@example.invalid", primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, phones: [{ number: "+212600000001", label: "Principal", is_primary: true }, { number: "+212600000002", label: "Secondaire", is_primary: false }], emails: [{ email: "synthetic@example.invalid", label: "Principal", is_primary: true }], roles: ["buyer"], country: "MA", calling_code: "+212", nationality: "", languages: ["french"], collaborators: [], version: 7, archived_at: null, created_at: at, updated_at: at, source: "manual", source_submission_id: null, created_by_user_id: null, ...changes });
const asset = (changes = {}) => ({ link_id: randomUUID(), kind: "property", id: randomUUID(), reference: "SYN-1", name: "Synthetic property", category: "house", location: "Synthetic place", asset_archived_at: null, linked_at: at, unlinked_at: null, ...changes });
const page = (items = [], changes = {}) => ({ items, total: items.length, page: 1, page_size: 3, has_previous: false, has_next: false, ...changes });
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `owner-${i}`; },
    createContext(value) { return { value }; }, useContext: context => context.value,
    useCallback(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, run }; return slots[i].run; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const view = run(); effects.splice(0).forEach(effect => effect()); return view; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const icons = Object.fromEntries(["CalendarIcon", "ContactIcon", "ContactsIcon", "EmailIcon", "LocationIcon", "PhoneIcon", "DevelopmentIcon", "ForwardIcon", "PropertyIcon", "SearchIcon", "MoreIcon"].map(name => [name, name]));
const common = { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/icons": icons, "@/components/ui/button": { Button: "Button" }, "@/components/shared/crm-presentation": { CrmAgent: "Agent", CrmContactCell: "Cell", CrmDirectoryHeader: "Header", CrmStatusBadge: "Badge", CrmRecordHeader: "RecordHeader" }, "@/components/shared/record-workspace": { RecordSection: "Section", RecordWorkspace: "Workspace" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/inline-record-field": { InlineEditScope: "Scope" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/contracts": contacts, "@/hooks/use-hydrated": { useHydrated: () => true } };

test("Owner directory paths preserve backend membership and literal search, with Agent archives forced active", () => {
  for (const role of ["agent", "manager", "administrator"]) {
    const url = new URL(model.ownerDirectoryPath({ q: "  %_ &/  ", archive: "all" }, 2, role), "https://synthetic.invalid");
    assert.equal(url.searchParams.get("owner_directory"), "true"); assert.equal(url.searchParams.get("q"), "%_ &/"); assert.equal(url.searchParams.get("archive"), role === "agent" ? "active" : "all"); assert.equal(url.searchParams.get("page_size"), "20"); assert.equal(url.searchParams.get("page"), "2"); assert.equal(url.searchParams.has("role"), false);
  }
  const id = randomUUID(); assert.equal(model.ownerAssetHref({ id, kind: "development" }), `/projects/${id}`); assert.equal(model.ownerAssetHref({ id, kind: "property" }), `/projects/properties/${id}`);
});

test("Owner drawer intent preserves modified/auxiliary clicks, prevented navigation and pre-hydration route fallback", () => {
  const event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
  assert.equal(model.ownerDrawerIntent(event, true), true); assert.equal(model.ownerDrawerIntent(event, false), false);
  for (const change of [{ defaultPrevented: true }, { button: 1 }, { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }]) assert.equal(model.ownerDrawerIntent({ ...event, ...change }, true), false);
});

test("Owner quick portfolio accepts only its bounded current-link page and rejects unexpected private fields", () => {
  assert.equal(contracts.ownerPortfolioPreviewSchema.safeParse(page([asset()])).success, true);
  for (const input of [page([asset()], { page: 2 }), page([asset()], { page_size: 20 }), page(Array.from({ length: 4 }, () => asset())), page([asset({ unlinked_at: at })]), { ...page(), private_phone: "+212600000001" }]) assert.equal(contracts.ownerPortfolioPreviewSchema.safeParse(input).success, false);
});

function stateSetup({ original = client(), requested = original.id } = {}) {
  const h = harness(); let remote = original, error, refreshes = 0, quiet = 0, changed = 0, denied = 0;
  const onChanged = () => changed++, onDenied = () => denied++;
  const loaded = loadServer("src/features/owners/use-owner-contact.ts", { modules: { react: h.react, "@/features/contacts/contracts": contacts, "@/features/contacts/use-query": { useQuery: () => ({ value: remote, error, refresh: () => { refreshes++; remote = undefined; }, refreshQuietly: () => quiet++ }) }, "@/features/realtime/current-record": currentRecord } });
  const render = () => h.render(() => loaded.useOwnerContact(requested, onChanged, onDenied)); render();
  return { ...h, render, remote: value => { remote = value; }, error: value => { error = value; }, counts: () => ({ refreshes, quiet, changed, denied }) };
}

test("Owner contact state keeps linked owners without the literal role and preserves newer accepted edits until a current read", () => {
  const original = client(), s = stateSetup({ original }); assert.equal(s.render().contact.id, original.id); assert.equal(original.roles.includes("owner"), false);
  s.render().saved({ ...original, name: "Accepted newer owner", version: 8 }); assert.equal(s.render().contact.name, "Accepted newer owner"); assert.equal(s.counts().changed, 1);
  s.remote({ ...original, version: 9, name: "Current canonical read" }); assert.equal(s.render().contact.name, "Current canonical read");
  s.render().saved(client()); assert.equal(s.render().contact, undefined); assert.equal(s.counts().refreshes, 1);
});

test("Owner contact aliases retain canonical updates, while denial/retry/unmount cannot reproject stale identity", () => {
  const canonical = client(), s = stateSetup({ original: canonical, requested: randomUUID() }); s.render().saved({ ...canonical, name: "Canonical saved", version: 8 }); assert.equal(s.render().contact.name, "Canonical saved");
  s.render().denied(new ApiError("FORBIDDEN", 403)); assert.equal(s.render().contact, undefined); s.render().retry(); assert.equal(s.render().contact, undefined);
  s.remote(canonical); assert.equal(s.render().contact.name, canonical.name); const pendingSaved = s.render().saved; s.unmount(); const before = s.counts().changed; pendingSaved({ ...canonical, version: 9 }); assert.equal(s.counts().changed, before);
  const queryDenied = stateSetup(); queryDenied.error(new ApiError("FORBIDDEN", 403)); assert.equal(queryDenied.render().contact, undefined); assert.equal(queryDenied.counts().denied, 1);
});

test("Owner details reuse shared one-field controllers and preserve primary/secondary methods without a literal-role gate", () => {
  const loaded = loadServer("src/features/owners/owner-details.tsx", { modules: { ...common, "@/components/shared/record-facts": { RecordFacts: "Facts", RecordFact: "Fact" }, "@/features/contacts/contact-inline-field": { ContactInlineField: "Inline" }, "@/lib/format": { formatInstant: value => value } } });
  const contact = client(), props = { contact, saved() {}, denied() {} }, full = loaded.OwnerDetails(props), compact = loaded.OwnerDetails({ ...props, compact: true });
  assert.equal(find(full, "Inline").length, 10); assert.equal(find(compact, "Inline").length, 5); assert.ok(find(full, "Inline").every(node => node.props.contact === contact && node.props.writable));
  assert.deepEqual(find(full, "Inline").filter(node => node.props.field === "phones").map(node => node.props.methodScope), ["primary", "secondary"]); assert.ok(!find(full, "Inline").some(node => node.props.field === "roles"));
  assert.ok(find(full, "Fact").some(node => node.props.label === "Rôles")); assert.ok(find(loaded.OwnerDetails({ ...props, contact: { ...contact, archived_at: at } }), "Inline").every(node => !node.props.writable));
});

function directorySetup(role = "manager") {
  const h = harness(), contact = client(), paths = [], navigation = []; let error, refreshes = 0;
  h.react.useCallback = callback => callback;
  h.react.useMemo = factory => factory();
  const state = { draft: { q: "", archive: "all" }, filters: { q: "", archive: "all" }, page: 2, setDraft() {}, setPage() {}, apply() {}, reset() {} };
  const result = { get value() { return { items: [contact], total: 21, page: 2, page_size: 20 }; }, get error() { return error; }, refresh: () => refreshes++, refreshQuietly() {} };
  const loaded = loadServer("src/features/owners/owner-directory.tsx", { modules: { ...common, react: h.react, "next/navigation": { useRouter: () => ({ push: path => navigation.push(path) }) }, "@/components/shared/data-table": { DataTable: "Table" }, "@/components/shared/directory-record-card": { DirectoryRecordCard: "Card" }, "@/components/shared/filter-results-layout": { FilterResultsLayout: "Filters" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-directory-filters": { useDirectoryFilters: () => state }, "@/features/contacts/use-query": { useQuery: path => { paths.push(path); return result; } }, "./owner-form": { OwnerForm: "Form" }, "./owner-directory-model": model, "@/components/shared/directory-presentation": { useDirectoryRail: () => ({ rail: {} }), DirectoryEmpty: "Empty", DirectoryLoading: "Loading" }, "@/components/shared/scrollable-results-table": { ScrollableResultsTable: "Scroll" }, "./owner-preview": { OwnerPreviewDrawer: "Preview" } } });
  const render = () => h.render(() => loaded.OwnerDirectory({ role })); render();
  return { ...h, render, contact, paths, navigation, state, error: value => { error = value; }, refreshes: () => refreshes };
}

test("Owner directory uses compact cards and header creation; both desktop and phone keep real hrefs and lazy preview entry", () => {
  const s = directorySetup(), event = { defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, currentTarget: {}, preventDefault() { this.defaultPrevented = true; } };
  let view = s.render(); assert.equal(find(view, "Preview").length, 0); assert.equal(find(view, "Table")[0].props.rows[0], s.contact); assert.equal(find(view, "Pages")[0].props.size, 20);
  const table = find(view, "Table")[0], card = table.props.mobileCard(s.contact); assert.equal(card.props.href, `/owners/${s.contact.id}`); assert.equal(card.props.phone, s.contact.primary_phone); card.props.onOpen(event); assert.equal(event.defaultPrevented, true); assert.equal(find(s.render(), "Preview")[0].props.id, s.contact.id);
  find(s.render(), "Preview")[0].props.onClosed(); view = s.render(); const cell = table.props.columns[0].cell({ row: { original: s.contact } }); cell.props.onOpen({ ...event, defaultPrevented: false, ctrlKey: true }); assert.equal(find(s.render(), "Preview").length, 0);
  const create = find(find(view, "Header")[0].props.actions, "Link")[0]; assert.equal(create.props.href, "/owners/new"); assert.equal(create.props.prefetch, false); create.props.onClick({ ...event, defaultPrevented: false });
  const drawer = find(s.render(), "Drawer")[0]; const form = drawer.props.children(() => {}, () => {}); assert.equal(form.props.presentation, "drawer"); form.props.onSaved(s.contact.id); assert.deepEqual(s.navigation, [`/owners/${s.contact.id}`]);
});

test("Owner directory query denial closes its private preview before retry; Agent state cannot request archived results", () => {
  const s = directorySetup("agent"); let view = s.render(); const filters = find(view, "Filters")[0].props.filters(() => {}); assert.equal(find(filters, "Select").length, 0); assert.ok(s.paths.every(path => new URL(path, "https://synthetic.invalid").searchParams.get("archive") === "active"));
  find(view, "Table")[0].props.mobileCard(s.contact).props.onOpen({ defaultPrevented: false, button: 0, preventDefault() {}, currentTarget: {} }); assert.equal(find(s.render(), "Preview").length, 1);
  s.error(new ApiError("FORBIDDEN", 403)); view = s.render(); assert.equal(find(view, "Preview").length, 0); assert.equal(find(view, "Table").length, 0); find(view, "Error")[0].props.retry(); s.error(undefined); assert.equal(find(s.render(), "Preview").length, 0);
});

test("Owner quick drawer titles come from its current canonical read and disappear with denied projection", () => {
  const contact = client(); let state = { contact, saved() {}, denied() {}, retry() {} };
  const loaded = loadServer("src/features/owners/owner-preview.tsx", { modules: { ...common, react: { useEffect() {} }, "@/features/contacts/use-query": { queryPath }, "./contracts": contracts, "./owner-details": { OwnerDetails: "Details" }, "./owner-directory-model": model, "./owner-loading": { OwnerLoading: "Loading" }, "./use-owner-contact": { useOwnerContact: () => state } } });
  const props = { id: contact.id, onClosed() {}, onChanged() {}, onDenied() {}, returnFocus: {}, fallbackFocus: {} };
  let view = loaded.OwnerPreviewDrawer(props); assert.equal(view.props.title, contact.name); assert.equal(find(view, "Details")[0].props.contact, contact); assert.ok(find(view, "Link").every(node => node.props.prefetch === false));
  state = { ...state, contact: undefined, error: new ApiError("FORBIDDEN", 403) }; view = loaded.OwnerPreviewDrawer(props); assert.equal(view.props.title, "Fiche propriétaire"); assert.equal(find(view, "Details").length, 0); assert.ok(!text(view).includes(contact.name));
});

test("Owner quick portfolio requests at most three current links with safe real destinations and hides previous rows on failure", () => {
  const h = harness(), paths = [], property = asset(), programme = asset({ kind: "development" }); let failure;
  const loaded = loadServer("src/features/owners/owner-preview.tsx", { modules: { ...common, react: h.react, "@/features/contacts/use-query": { queryPath, useQuery: path => { paths.push(path); return { value: failure ? undefined : page([property, programme], { total: 5 }), error: failure, refresh() {} }; } }, "./contracts": contracts, "./owner-details": {}, "./owner-directory-model": model, "./owner-loading": {}, "./use-owner-contact": {} } });
  const id = randomUUID(), errors = [], props = { id, denied: error => errors.push(error) }, render = () => h.render(() => loaded.OwnerPortfolioPreview(props));
  let view = render(); assert.ok(paths[0].includes(`contacts/${id}/portfolio?status=current&page=1&page_size=3`)); assert.equal(view.props.count, 5); assert.deepEqual(find(view, "Link").map(node => node.props.href), [`/projects/properties/${property.id}`, `/projects/${programme.id}`]);
  failure = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Link").length, 0); assert.equal(view.props.count, undefined); assert.equal(errors.length, 1);
});

test("Owner full record keeps two main tabs and one right-side portfolio, with lazy retained current/past panels", () => {
  const h = harness(), contact = client(), owner = { contact, saved() {}, denied() {}, retry() {}, refresh() {} };
  const loaded = loadServer("src/features/owners/owner-record.tsx", { modules: { ...common, react: h.react, "@/components/shared/page-header": { PageHeader: "PageHeader" }, "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "TabContent", TabsList: "TabsList", TabsTrigger: "Tab" }, "@/features/contacts/contact-history": { ContactTimeline: "History" }, "@/features/contacts/ownership-controls": { OwnershipControls: "Controls" }, "@/lib/api/client": { apiGet() {} }, "./owner-documents": { OwnerDocuments: "Documents" }, "./owner-details": { OwnerDetails: "Details" }, "./owner-form": { OwnerForm: "Form" }, "./owner-loading": { OwnerLoading: "Loading" }, "./owner-portfolio": { OwnerPortfolio: "Portfolio" }, "./use-owner-contact": { useOwnerContact: () => owner } } });
  const render = () => h.render(() => loaded.OwnerRecord({ id: contact.id, role: "manager", initialTab: "activity" }));
  let view = render(), workspace = find(view, "Workspace")[0]; assert.deepEqual(plain(workspace.props.tabs.map(tab => tab.id)), ["overview", "activity"]); assert.equal(workspace.props.initialTab, "activity"); assert.equal(find(workspace.props.aside, "Section")[0].props.title, "Patrimoine"); assert.equal(find(view, "Portfolio").length, 1); assert.equal(find(workspace.props.aside, "Documents")[0].props.contact, contact);
  const detail = workspace.props.tabs[0].content; assert.equal(detail.props.contact, contact); assert.ok(detail.props.managementAction); find(view, "Tabs")[0].props.onValueChange("past"); view = render(); assert.equal(find(view, "Portfolio").length, 2); assert.equal(find(view, "TabContent").find(node => node.props.value === "current").props.hidden, true);
  find(view, "Tabs")[0].props.onValueChange("current"); assert.equal(find(render(), "Portfolio").length, 2);
});

test("Owner portfolio shows actual archive and link dates without duplicate shortcuts, preserving link history and an empty-page escape", () => {
  const h = harness(), id = randomUUID(), first = asset({ asset_archived_at: at, unlinked_at: at }), second = { ...first, link_id: randomUUID() }; let rows = [first, second];
  const loaded = loadServer("src/features/owners/owner-portfolio.tsx", { modules: { ...common, react: h.react, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-query": { queryPath, useQuery: () => ({ value: page(rows, { page_size: 20, has_next: rows.length > 0 }), refresh() {} }) }, "@/features/inventory/contracts": { categoryLabels: { house: "Maison" } }, "@/lib/format": { formatInstant: value => value }, "./contracts": contracts, "./owner-directory-model": model, "./owner-loading": {} } });
  const render = () => h.render(() => loaded.OwnerPortfolio({ id, status: "past", compact: true }));
  let view = render(); assert.equal(find(view, "li").length, 2); assert.equal(find(view, "details").length, 0); assert.equal(find(view, "time").length, 4); assert.ok(find(view, "Badge").every(node => node.props.state === "archived")); assert.ok(find(view, "Link").every(node => !node.props.href.includes("history")));
  find(view, "Pages")[0].props.change(2); rows = []; view = render(); assert.equal(find(view, "Pages")[0].props.page, 2); assert.equal(find(view, "Pages")[0].props.total, 0); assert.equal(find(view, "Button").length, 0);
});

test("Owner portfolio denial reaches its contact boundary and never leaves old asset rows visible", () => {
  const h = harness(), rows = [asset()], failures = []; let error;
  const loaded = loadServer("src/features/owners/owner-portfolio.tsx", { modules: { ...common, react: h.react, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-query": { queryPath, useQuery: () => ({ value: page(rows, { page_size: 20 }), error, refresh() {} }) }, "@/features/inventory/contracts": { categoryLabels: { house: "Maison" } }, "@/lib/format": { formatInstant: value => value }, "./contracts": contracts, "./owner-directory-model": model, "./owner-loading": {} } });
  const denied = failure => failures.push(failure), render = () => h.render(() => loaded.OwnerPortfolio({ id: randomUUID(), status: "current", denied }));
  assert.equal(find(render(), "li").length, 1);
  for (const status of [503, 401, 403, 404]) { error = new ApiError("SYNTHETIC_ERROR", status); assert.equal(find(render(), "li").length, 0); }
  assert.deepEqual(failures.map(failure => failure.status), [401, 403, 404]);
});

test("Shared owner management bubbles current denial from preview, commit, follow-up and refresh while retaining transient errors", async () => {
  const ownership = loadServer("src/features/contacts/ownership-contracts.ts", { modules: { "./contracts": contacts } });
  for (const phase of ["preview", "commit", "follow-up", "refresh", "transient"]) {
    const h = harness(), contact = client(), failures = [], status = phase === "transient" ? 503 : phase === "refresh" ? 404 : 403;
    let commands = 0;
    const denied = failure => failures.push(failure);
    const command = loadOwnershipCommand(h, { ApiError, read: async () => { throw new ApiError("SYNTHETIC_ERROR", status); }, request: async (id, action, body, schema, key, binding, signal, dispatched) => { commands++; dispatched?.(); if (phase === "preview" || phase === "transient" || phase === "commit" && commands === 2) throw new ApiError("SYNTHETIC_ERROR", status); return action === "preview" ? ownershipPreview(contact, body) : ownershipReceipt(contact, action); } });
    const loaded = loadServer("src/features/contacts/ownership-controls.tsx", { modules: { ...common, react: h.react, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/components/shared/dossier-form": { useDossierDraft: () => ({ dirty: false, accept() {} }) }, "@/lib/api/client": { ApiError }, "./contracts": contacts, "./use-ownership-command": command, "./agent-picker": { AgentPicker: "AgentPicker" }, "./contact-selector": { ContactSelector: "Chooser" }, "./ownership-contracts": ownership, "./ownership-impact": { OwnershipImpact: "Impact" }, "./record-states": { RecordError: "Error" } } });
    const render = () => h.render(() => { const root = loaded.OwnershipControls({ contact, role: "manager", embedded: true, denied, changed: async () => { if (phase === "follow-up") throw new ApiError("SYNTHETIC_ERROR", status); } }); return root.type(root.props); });
    assert.equal(typeof find(render(), "AgentPicker")[0].props.denied, "function");
    if (phase === "refresh") find(render(), "Button").find(node => node.props.action === "refresh").props.onClick();
    else {
      find(render(), "Select")[0].props.onChange({ target: { value: "archive" } }); find(render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic reason" } });
      find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await new Promise(resolve => setImmediate(resolve));
      if (["commit", "follow-up"].includes(phase)) find(render(), "Button").find(node => node.props.action === "archive").props.onClick();
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(failures.map(failure => failure.status), phase === "transient" ? [] : [status]); assert.ok(find(render(), "Error").some(node => node.props.error.status === status));
  }
});

test("Owner title links retain native destinations and disable prefetch only for drawer interception", () => {
  const h = harness(), contact = client(), open = () => {};
  const cells = loadServer("src/components/shared/crm-presentation.tsx", { modules: { ...common, react: h.react, "@/components/ui/popover": {}, "./section-heading": {}, "./record-header": {} } });
  const cell = cells.CrmContactCell({ contact, href: `/owners/${contact.id}`, describedBy: "synthetic-phone", onOpen: open }); assert.equal(cell.props.onClick, open); assert.equal(cell.props.prefetch, false); assert.equal(cells.CrmContactCell({ contact, href: "/contacts/synthetic", describedBy: "phone" }).props.prefetch, undefined);
  const cards = loadServer("src/components/shared/directory-record-card.tsx", { modules: { ...common, react: h.react } });
  const card = h.render(() => cards.DirectoryRecordCard({ title: contact.name, href: `/owners/${contact.id}`, agent: "Synthetic", phone: contact.primary_phone, status: "Actif", onOpen: open })); assert.equal(find(card, "Link")[0].props.onClick, open); assert.equal(find(card, "Link")[0].props.prefetch, false);
});

test("Owner drawers finish their exit before notifying the parent and restore surviving focus", () => {
  const h = harness(), focused = [], returned = { current: { isConnected: false, focus: () => focused.push("row") } }, fallback = { current: { focus: () => focused.push("create") } };
  let notifications = 0;
  const loaded = loadServer("src/components/shared/record-drawer.tsx", {
    modules: { ...common, react: { ...h.react, useLayoutEffect: h.react.useEffect }, "@/components/ui/sheet": Object.fromEntries(["Sheet", "SheetContent", "SheetDescription", "SheetHeader", "SheetTitle", "SheetTrigger"].map(name => [name, name])), "./unsaved-guard": { useUnsavedGuard: () => ({ request: run => run() }) } },
    globals: { document: { getElementById: () => null } },
  });
  const render = () => h.render(() => loaded.RecordDrawer({ label: "Owner", description: "Synthetic", initialOpen: true, hideTrigger: true, returnFocus: returned, fallbackFocus: fallback, onClosed: () => { notifications++; } }));
  find(render(), "Sheet")[0].props.onOpenChange(false);
  assert.equal(find(render(), "Sheet")[0].props.open, false);
  assert.equal(notifications, 0);
  find(render(), "SheetContent")[0].props.onCloseAutoFocus({ preventDefault() {} });
  assert.deepEqual(focused, ["create"]);
  returned.current.isConnected = true;
  find(render(), "SheetContent")[0].props.onCloseAutoFocus({ preventDefault() {} });
  assert.deepEqual(focused, ["create", "row"]);
  assert.equal(notifications, 1);
});

test("Owner route passes the current authenticated role and only supported left/right deep-link selections", async () => {
  const id = randomUUID(), paths = [], loaded = loadServer("src/app/(workspace)/owners/[id]/page.tsx", { modules: { "react/jsx-runtime": runtime, "next/navigation": { notFound: () => { throw new Error("not found"); } }, "@/features/auth/auth-frame": {}, "@/features/owners/owner-record": { OwnerRecord: "Record" }, "@/lib/auth/server": { requireIdentity: async path => { paths.push(path); return { state: "authenticated", profile: { user: { role: "manager" } } }; } } } });
  const node = await loaded.default({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ tab: "activity", status: "past" }) }); assert.equal(node.props.role, "manager"); assert.equal(node.props.initialTab, "activity"); assert.equal(node.props.initialPortfolio, "past");
  const legacy = await loaded.default({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ tab: "portfolio", status: ["past"] }) }); assert.equal(legacy.props.initialTab, "overview"); assert.equal(legacy.props.initialPortfolio, "current"); assert.ok(paths.every(path => path === `/owners/${id}`));
});
