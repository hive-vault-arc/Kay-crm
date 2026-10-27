import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value)), tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.action, type), ...find(node.props?.aside, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(view, label) { const node = find(view, "Button").find(node => text(node) === label); assert.ok(node, label); return node; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } }), requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const deals = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": qualification } });
const at = "2026-10-20T12:00:00Z", queryPath = (kind, values) => `/api/v1/${kind}?${new URLSearchParams(values)}`;
function deal(changes = {}) {
  const contact = contacts.contactSummarySchema.parse({ id: randomUUID(), name: "Synthetic proposal contact", type: "person", primary_phone: "+212600000000", primary_email: null, primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, version: 4, archived_at: null, country: "MA", nationality: "", languages: ["french"], calling_code: "+212" });
  return deals.dealSchema.parse({ id: randomUUID(), version: 7, title: "Synthetic proposal deal", stage: "new", contact, origin_contact_id: contact.id, enquiry_id: null, requirement_id: null, offering: null, next_action: "", stock_review_required: false, archived_at: null, primary_agent_at_close_id: null, active_reservation: null, reservation_conflict: null, customer_offer_count: 1, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, initial_budget: "1000000", campaign_source: "broker", rating: "cold", purchase_reasons: ["residence"], client_snapshot: {}, notes: "", payment_method: null, number_of_rooms: null, projects: [{ position: 1, name: "Synthetic project", development_id: null, property_id: null, external_name: "Synthetic project" }], ...changes });
}
function proposal(dealId, changes = {}) { return deals.customerOfferSchema.parse({ id: randomUUID(), deal_id: dealId, amount_mad: "1234567890123456.78", currency: "MAD", price_period: "year", conditions: "Synthetic proposal conditions", expires_on: null, status: "pending", annual_amount_mad: "1234567890123456.78", version: 3, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, ...changes }); }
const page = (items, changes = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_previous: false, has_next: false, ...changes });
function model(read = async () => { throw new Error("unexpected read"); }) { return loadServer("src/features/deals/customer-offer-model.ts", { modules: { "@/lib/api/client": { ApiError, apiGet: read }, "@/features/contacts/use-query": { queryPath }, "./contracts": deals } }); }
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `proposal-${i}`; },
    useMemo(create, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, value: create() }; return slots[i].value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const view = run(); effects.splice(0).forEach(effect => effect()); return view; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const common = { "react/jsx-runtime": runtime, "@/components/icons": { DealIcon: "DealIcon", FinanceIcon: "FinanceIcon" }, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./contracts": deals };
function formSetup({ initial = { deal: deal() }, command, read, mutate, hydrated = true, writable = true } = {}) {
  const h = harness(), calls = [], reads = [], decisions = [], focused = [], events = [], denies = [], busyChanges = []; let saved = 0, cancelled = 0;
  const props = { initial, writable }, apiGet = async (path, schema, signal) => { reads.push({ path, signal }); const value = read ? await read(path, schema, signal) : path.includes("customer-offers") ? page(initial.proposal ? [initial.proposal] : [], { page_size: 100 }) : initial.deal; try { return schema.parse(value); } catch { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } };
  const fields = model(apiGet), commands = loadServer("src/features/deals/use-deal-command.ts", { modules: { react: h.react, "@/lib/api/client": { ApiError, apiGet }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); const result = command ? await command(...args) : { id: initial.deal.id, version: 8, customer_offer_id: initial.proposal?.id ?? randomUUID(), offer_version: 4 }; return args[2].parse(result); } }, "./contracts": deals }, globals: { crypto: { randomUUID } } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { window: { dispatchEvent: event => events.push(event.type) }, Event } });
  const loaded = loadServer("src/features/deals/customer-offer-form.tsx", { modules: { ...common, react: h.react, "@/components/shared/dossier-form": draft, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: (run, scope) => decisions.push({ run, scope }) }) }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "./customer-offer-facts": { OfferFacts: "Facts" }, "./customer-offer-model": fields }, globals: { AbortController } });
  const render = () => h.render(() => { const cmd = commands.useDealCommand(initial.deal.id), view = loaded.CustomerOfferForm({ ...props, busy: cmd.busy, error: props.error ?? cmd.error, mutate: mutate ?? cmd.mutate, busyChanged: value => busyChanges.push(value), denied: error => denies.push(error), saved: () => saved++, cancel: () => cancelled++ }); const form = find(view, "form")[0]; if (form?.props.ref) form.props.ref.current = { querySelector: selector => ({ focus: () => focused.push(selector) }) }; return view; }); render();
  return { ...h, props, render, calls, reads, decisions, focused, denies, busyChanges, events, saved: () => saved, cancelled: () => cancelled, change(name, value) { const input = ["Input", "Select", "Textarea"].flatMap(type => find(render(), type)).find(node => node.props.name === name); assert.ok(input, name); input.props.onChange({ target: { value } }); }, submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); } };
}

test("Proposal fields keep exact amounts/original periods and serialize only the real create/edit contracts", () => {
  const d = deal(), value = proposal(d.id), m = model(), fields = m.proposalValues(d, value); assert.equal(fields.amount_mad, value.amount_mad); assert.equal(fields.price_period, "year"); assert.equal("annual_amount_mad" in fields, false);
  const edited = m.proposalBody({ deal: d, proposal: value }, { ...fields, amount_mad: " 11999,99 " }); assert.equal(edited.success, true); assert.equal(edited.data.amount_mad, "11999.99"); assert.equal(edited.data.expected_version, 3); assert.equal(edited.data.expected_deal_version, 7);
  const created = m.proposalBody({ deal: d }, fields); assert.equal(created.data.expected_version, 7); assert.equal("expected_deal_version" in created.data, false); assert.equal(m.proposalValues(d).price_period, null);
  assert.equal(m.proposalBody({ deal: d, proposal: { ...value, deal_id: randomUUID() } }, fields).success, false);
  for (const amount_mad of ["0", "-1", "1e3", "1.234", "1 000"]) assert.equal(m.proposalBody({ deal: d }, { ...fields, amount_mad }).success, false);
  assert.equal(m.proposalBody({ deal: d }, { ...fields, expires_on: "2026-02-30" }).success, false);
});

test("Proposal editability preserves active/reserved, terminal and archive boundaries without inferring a role grant", () => {
  const d = deal(), m = model(); for (const stage of ["new", "visit", "negotiation", "documents", "reserved"]) assert.equal(m.proposalWritable({ ...d, stage }), true);
  for (const stage of ["won", "lost", "cancelled"]) assert.equal(m.proposalWritable({ ...d, stage }), false);
  assert.equal(m.proposalWritable({ ...d, archived_at: at }), false); assert.equal(m.proposalWritable({ ...d, contact: { ...d.contact, archived_at: at } }), false);
});

test("Proposal page schemas reject foreign scope, wrong page/size, excess rows and unexpected private fields", () => {
  const d = deal(), value = proposal(d.id), schema = model().proposalPageSchema(d.id, 1, 20); assert.equal(schema.safeParse(page([value])).success, true);
  for (const input of [page([proposal(randomUUID())]), page([value], { page: 2 }), page([value], { page_size: 100 }), page(Array.from({ length: 21 }, () => value)), { ...page([value]), private_note: "Synthetic forbidden field" }]) assert.equal(schema.safeParse(input).success, false);
});

test("Proposal comparison finds the exact scoped paged item and brackets it with the current Deal revision", async () => {
  const d = deal(), value = proposal(d.id), paths = [], controller = new AbortController();
  const m = model(async (path, schema, signal) => { paths.push(path); assert.equal(signal, controller.signal); return schema.parse(path.includes("customer-offers") ? new URL(path, "https://synthetic.invalid").searchParams.get("page") === "1" ? page(Array.from({ length: 100 }, () => proposal(d.id)), { total: 101, page_size: 100, has_next: true }) : page([value], { total: 101, page: 2, page_size: 100, has_previous: true }) : d); });
  const current = await m.readProposalComparison(d.id, value.id, controller.signal); assert.equal(current.proposal.id, value.id); assert.equal(current.deal.version, d.version); assert.equal(paths.length, 4); assert.ok(paths[1].includes("page_size=100")); assert.ok(paths[2].includes("page=2")); assert.equal(paths[0], paths[3]);
});

test("Proposal comparison rejects changing versions, malformed/foreign pages, missing identity and foreign parents", async () => {
  const d = deal(), value = proposal(d.id);
  for (const mode of ["changed", "foreign-parent", "foreign-row", "empty-next", "missing"]) {
    let reads = 0; const m = model(async (path, schema) => { if (!path.includes("customer-offers")) { reads++; return schema.parse(mode === "foreign-parent" ? deal() : { ...d, version: mode === "changed" && reads > 1 ? d.version + 1 : d.version }); } const result = mode === "foreign-row" ? page([proposal(randomUUID())], { page_size: 100 }) : mode === "empty-next" ? page([], { total: 101, page_size: 100, has_next: true }) : mode === "missing" ? page([], { page_size: 100 }) : page([value], { page_size: 100 }); try { return schema.parse(result); } catch { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } });
    await assert.rejects(m.readProposalComparison(d.id, value.id, new AbortController().signal), error => error.code === (mode === "changed" ? "DEAL_VERSION_CONFLICT" : "DEPENDENCY_UNAVAILABLE"));
  }
  const paths = [], m = model(async path => { paths.push(path); return d; }); assert.equal((await m.readProposalComparison(d.id, undefined, new AbortController().signal)).proposal, undefined); assert.equal(paths.length, 1);
});

test("New proposal is one managed focused form with exact mutable fields and no immediate write", async () => {
  const s = formSetup(); const form = find(s.render(), "form")[0]; assert.equal(form.props.className, "kay-drawer-form"); assert.equal(form.props["data-draft-managed"], true); assert.equal(form.props["data-live-dirty"], undefined); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "Input").length, 2); assert.equal(find(s.render(), "Textarea").length, 1); const stale = formSetup(); stale.props.error = new ApiError("DEAL_VERSION_CONFLICT", 409); assert.equal(find(stale.render(), "Error").length, 0); assert.equal(find(stale.render(), "Button").some(node => text(node) === "Comparer la proposition actuelle"), false);
  s.change("amount_mad", "11999,99"); s.change("price_period", "month"); s.change("status", "accepted"); s.change("conditions", "Synthetic accepted terms"); s.submit(); await tick(); assert.equal(s.saved(), 1); assert.equal(s.calls[0][0], `/api/v1/deals/${s.props.initial.deal.id}/customer-offers`); assert.equal(s.calls[0][1].amount_mad, "11999.99"); assert.equal(s.calls[0][1].status, "accepted"); assert.equal(s.calls[0][4], "POST"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
});

test("Proposal edit retains original annual price/conditions/date and requires both reviewed versions", async () => {
  const d = deal(), value = proposal(d.id, { expires_on: "2026-11-12" }), s = formSetup({ initial: { deal: d, proposal: value } }); s.change("conditions", "Synthetic changed terms"); s.submit(); await tick(); assert.equal(s.calls[0][0], `/api/v1/customer-offers/${value.id}`); assert.equal(s.calls[0][4], "PATCH"); assert.equal(s.calls[0][1].price_period, "year"); assert.equal(s.calls[0][1].amount_mad, value.amount_mad); assert.equal(s.calls[0][1].expires_on, "2026-11-12"); assert.equal(s.calls[0][1].expected_version, 3); assert.equal(s.calls[0][1].expected_deal_version, 7);
});

test("Proposal validation focuses the invalid field and blocks writes without hydration or current editability", async () => {
  const s = formSetup(); s.submit(); await tick(); assert.equal(s.calls.length, 0); assert.ok(s.focused.includes('[name="amount_mad"]')); assert.equal(find(s.render(), "Input")[0].props["aria-invalid"], true);
  for (const options of [{ hydrated: false }, { writable: false }, { initial: { deal: deal({ stage: "won" }) } }]) { const blocked = formSetup(options); blocked.change("amount_mad", "100"); blocked.submit(); await tick(); assert.equal(blocked.calls.length, 0); }
});

test("Interrupted proposal acknowledgement/reload preserves exact body/key and dirty fields until a confirmed retry", async () => {
  const d = deal(); let reads = 0; const s = formSetup({ initial: { deal: d }, read: async () => { if (++reads === 1) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...d, version: 8 }; } }); s.change("amount_mad", "100.25"); s.submit(); await tick(); assert.equal(s.saved(), 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); s.submit(); await tick(); assert.equal(s.saved(), 1); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1]));
});

test("Proposal commands serialize immediately and preserve the form across unrelated incoming revisions", async () => {
  let release; const d = deal(), value = proposal(d.id), s = formSetup({ initial: { deal: d, proposal: value }, command: () => new Promise(resolve => { release = resolve; }) }); s.change("amount_mad", "150"); s.submit(); s.submit(); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "form")[0].props["aria-busy"], true); s.props.initial = { deal: { ...d, version: 20 }, proposal: { ...value, version: 10 } }; assert.equal(find(s.render(), "Input")[0].props.value, "150"); release({ id: d.id, version: 8, customer_offer_id: value.id, offer_version: 4 }); await tick(); assert.equal(s.calls[0][1].expected_deal_version, 7); assert.equal(s.calls[0][1].expected_version, 3);
});

test("An unexpected proposal mutation failure keeps exact retry fields without offering an ambiguous-result rebase", async () => {
  const s = formSetup({ mutate: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); s.change("amount_mad", "100.25"); s.submit(); await tick();
  assert.equal(s.saved(), 0); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], "true"); assert.equal(find(s.render(), "Error")[0].props.error.code, "DEPENDENCY_UNAVAILABLE"); assert.equal(find(s.render(), "Error")[0].props.retry, undefined); assert.equal(s.reads.length, 0); assert.equal(find(s.render(), "Button").some(node => text(node) === "Comparer la proposition actuelle"), false);
});

test("Proposal conflict comparison preserves input and explicitly adopts both current versions before retry", async () => {
  const d = deal(), value = proposal(d.id), fresh = { ...d, version: 9 }, changed = { ...value, version: 6, amount_mad: "200.00" }; let fail = true;
  const s = formSetup({ initial: { deal: d, proposal: value }, command: () => { if (fail) { fail = false; throw new ApiError("DEAL_VERSION_CONFLICT", 409); } return { id: d.id, version: 10, customer_offer_id: value.id, offer_version: 7 }; }, read: path => path.includes("customer-offers") ? page([changed], { page_size: 100 }) : fresh });
  s.change("amount_mad", "150"); s.submit(); await tick(); button(s.render(), "Comparer la proposition actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "Input")[0].props.value, "150"); assert.equal(find(s.render(), "Facts")[0].props.value.amount_mad, "200.00"); s.submit(); assert.equal(s.calls.length, 1); button(s.render(), "Conserver ma saisie sur cette version").props.onClick(); s.submit(); await tick(); assert.equal(s.calls[1][1].expected_version, 6); assert.equal(s.calls[1][1].expected_deal_version, 9); assert.equal(s.calls[1][1].amount_mad, "150"); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.saved(), 1);
});

test("Proposal reload is discard-guarded and closed/archived current contexts cannot authorize keeping a draft", async () => {
  const d = deal(), value = proposal(d.id), changed = { ...value, version: 6, amount_mad: "200.00" };
  const setup = current => formSetup({ initial: { deal: d, proposal: value }, command: () => { throw new ApiError("DEAL_VERSION_CONFLICT", 409); }, read: path => path.includes("customer-offers") ? page([changed], { page_size: 100 }) : current });
  const s = setup({ ...d, version: 9 }); s.change("amount_mad", "150"); s.submit(); await tick(); button(s.render(), "Comparer la proposition actuelle").props.onClick(); await tick(); button(s.render(), "Recharger cette version").props.onClick(); assert.equal(s.decisions.length, 1); assert.equal(find(s.render(), "Input")[0].props.value, "150"); s.decisions[0].run(); assert.equal(find(s.render(), "Input")[0].props.value, "200.00"); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], undefined);
  for (const current of [{ ...d, stage: "won" }, { ...d, archived_at: at }, { ...d, contact: { ...d.contact, archived_at: at } }]) { const r = setup(current); r.change("amount_mad", "150"); r.submit(); await tick(); button(r.render(), "Comparer la proposition actuelle").props.onClick(); await tick(); assert.equal(find(r.render(), "Button").some(node => text(node) === "Conserver ma saisie sur cette version"), false); r.submit(); assert.equal(r.calls.length, 1); }
});

test("Proposal denial clears private form values before retry; departure aborts comparison and suppresses late success", async () => {
  const d = deal(), value = proposal(d.id); let forbidden = true, releaseRead, releaseSave;
  const s = formSetup({ initial: { deal: d, proposal: value }, command: () => { throw new ApiError("DEAL_VERSION_CONFLICT", 409); }, read: path => { if (forbidden) throw new ApiError("FORBIDDEN", 403); return path.includes("customer-offers") ? page([value], { page_size: 100 }) : d; } }); s.change("conditions", "Synthetic unsaved private terms"); s.submit(); await tick(); button(s.render(), "Comparer la proposition actuelle").props.onClick(); await tick(); assert.equal(find(s.render(), "form").length, 0); assert.equal(s.denies.length, 1); forbidden = false; find(s.render(), "Error")[0].props.retry(); await tick(); assert.equal(find(s.render(), "Textarea")[0].props.value, value.conditions);
  const r = formSetup({ initial: { deal: d, proposal: value }, command: () => { throw new ApiError("DEAL_VERSION_CONFLICT", 409); }, read: () => new Promise(resolve => { releaseRead = resolve; }) }); r.change("amount_mad", "150"); r.submit(); await tick(); button(r.render(), "Comparer la proposition actuelle").props.onClick(); r.unmount(); assert.equal(r.reads[0].signal.aborted, true); assert.equal(r.busyChanges.at(-1), false); releaseRead(d); await tick(); assert.equal(r.saved(), 0);
  const late = formSetup({ initial: { deal: d }, mutate: () => new Promise(resolve => { releaseSave = resolve; }) }); late.change("amount_mad", "100"); late.submit(); late.unmount(); releaseSave(true); await tick(); assert.equal(late.saved(), 0);
});

function rootSetup() {
  const h = harness(), d = deal(), value = proposal(d.id), paths = [], denies = []; let result = page([value]), error, refreshes = 0;
  const loaded = loadServer("src/features/deals/customer-offers.tsx", { modules: { ...common, react: h.react, "@/components/shared/data-table": { DataTable: "Table" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-query": { queryPath, useQuery: path => { paths.push(path); return { value: result, error, refresh: () => refreshes++, refreshQuietly() {} }; } }, "@/lib/format": { formatBusinessDate: value => value }, "./customer-offer-facts": { ProposalAmount: "Amount", ProposalDetails: "Details", ProposalStatus: "Status" }, "./customer-offer-model": model(), "./customer-offer-form": { CustomerOfferForm: "Form" } } });
  const props = { deal: d, writable: true, busy: false, mutate: async () => true, denied: error => denies.push(error) }, render = () => h.render(() => loaded.CustomerOffers(props)); render();
  return { ...h, props, render, value, paths, denies, rows: next => { result = next; }, error: next => { error = next; }, refreshes: () => refreshes };
}

test("Proposal section uses selected desktop columns/compact phone cards and opens one independent drawer only on demand", () => {
  const s = rootSetup(); assert.equal(find(s.render(), "Drawer").length, 0); const view = s.render(), table = find(view, "Table")[0]; assert.deepEqual(plain(table.props.columns.map(column => column.header)), ["Montant", "Statut", "Échéance", "Conditions", "Actions"]); const card = table.props.mobileCard(s.value); assert.equal(card.type, "Entry"); assert.equal(find(card, "Details").length, 1);
  const rowAction = table.props.columns.at(-1).cell({ row: { original: s.value } }); rowAction.props.onClick({ currentTarget: { focus() {} } }); let drawer = find(s.render(), "Drawer")[0]; assert.equal(drawer.props.initialOpen, true); assert.equal(drawer.props.hideTrigger, true); assert.equal(drawer.props.children(() => {}, () => {}).props.initial.proposal.id, s.value.id);
  s.rows(page([])); s.props.deal = { ...s.props.deal, version: 20 }; drawer = find(s.render(), "Drawer")[0]; assert.equal(drawer.key, s.value.id); assert.equal(drawer.props.children(() => {}, () => {}).props.initial.deal.version, 7); assert.ok(drawer.props.fallbackFocus); drawer.props.onClosed(); assert.equal(find(s.render(), "Drawer").length, 0);
});

test("Proposal paging keeps an empty-page escape and denial hides old rows/drawer while transient retry preserves it", () => {
  const s = rootSetup(); s.rows(page([s.value], { total: 21, has_next: true })); find(s.render(), "Pages")[0].props.change(2); s.rows(page([], { total: 0, page: 2 })); assert.equal(find(s.render(), "Pages")[0].props.page, 2);
  button(s.render(), "Nouvelle proposition").props.onClick({ currentTarget: {} }); s.error(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); find(s.render(), "Error")[0].props.retry(); assert.equal(find(s.render(), "Drawer").length, 1);
  s.error(new ApiError("FORBIDDEN", 403)); assert.equal(find(s.render(), "Drawer").length, 0); assert.equal(find(s.render(), "Table").length, 0); assert.equal(s.denies.at(-1).status, 403); find(s.render(), "Error")[0].props.retry(); s.error(undefined); assert.equal(find(s.render(), "Drawer").length, 0);
});

test("Proposal facts preserve selected neutral status labels, exact derived amounts and bounded long-condition disclosure", () => {
  const loaded = loadServer("src/features/deals/customer-offer-facts.tsx", { modules: { ...common, "@/components/ui/badge": { Badge: "Badge" }, "@/lib/format": { formatBusinessDate: value => value, formatInstant: value => value, formatMAD: value => value } } }), d = deal(), value = proposal(d.id);
  for (const status of ["pending", "accepted", "rejected", "withdrawn"]) { const badge = loaded.ProposalStatus({ status }); assert.equal(badge.props.variant, "neutral"); assert.equal(text(badge), deals.offerStatusLabels[status]); }
  assert.equal(text(loaded.ProposalAmount({ value })).replace(/\s+/g, " "), `${value.amount_mad} / an`); assert.ok(text(loaded.OfferFacts({ value })).includes(value.annual_amount_mad)); const long = { ...value, conditions: "Synthetic condition ".repeat(100) }, view = loaded.ProposalDetails({ value: long }); assert.equal(find(view, "details").length, 1); assert.ok(text(view).includes(long.conditions)); assert.equal(text(find(view, "summary")[0]), "Conditions et détails");
});

test("Actual Deal workspace has four tabs and proposals only under Projects, with supported deep-link selections", async () => {
  const h = harness(), source = readFileSync(new URL("../../src/features/deals/deal-workspace.tsx", import.meta.url), "utf8"), ast = ts.createSourceFile("workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), modules = { "react/jsx-runtime": runtime };
  for (const statement of ast.statements) if (ts.isImportDeclaration(statement)) { const clause = statement.importClause; if (!clause || clause.isTypeOnly) continue; const names = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements.filter(item => !item.isTypeOnly).map(item => item.propertyName?.text ?? item.name.text) : []; modules[statement.moduleSpecifier.text] ??= {}; for (const name of names) modules[statement.moduleSpecifier.text][name] = name; if (clause.name) modules[statement.moduleSpecifier.text].default = "Link"; }
  modules.react = h.react; modules["@/components/shared/unsaved-guard"] = { useUnsavedGuard: () => ({ request() {}, dialog: null }) }; modules["@/features/contacts/qualification-contracts"] = vocabulary; modules["./qualification-contracts"] = qualification;
  const loaded = loadServer("src/features/deals/deal-workspace.tsx", { modules }), d = deal(), view = h.render(() => loaded.DealWorkspace({ deal: d, role: "agent", writable: true, busy: false, busyChanged() {}, mutate: async () => true, reload: async () => {}, onEdit() {}, initialTab: "projects" })), workspace = find(view, "RecordWorkspace")[0];
  assert.deepEqual(plain(workspace.props.tabs.map(tab => tab.id)), ["overview", "projects", "activity", "documents"]); assert.equal(workspace.props.initialTab, "projects"); assert.equal(find(workspace.props.tabs[0].content, "CustomerOffers").length, 0); assert.equal(find(workspace.props.tabs[1].content, "CustomerOffers").length, 1); assert.equal(find(workspace.props.tabs[0].content, "DealInlineField").some(node => node.props.field === "projects"), false); assert.equal(find(workspace.props.tabs[1].content, "DealInlineField").find(node => node.props.field === "projects").props.deal, d); assert.equal(find(workspace.props.tabs[1].content, "RecordSection")[0].props.title, "Projet et offre retenus");
  const route = loadServer("src/app/(workspace)/deals/[id]/page.tsx", { modules: { "react/jsx-runtime": runtime, "next/navigation": {}, "@/features/auth/auth-frame": {}, "@/features/deals/deal-record": { DealRecord: "Record" }, "@/lib/auth/server": { requireIdentity: async () => ({ state: "authenticated", profile: { user: { role: "agent", id: randomUUID() } } }) } } });
  for (const tab of ["overview", "projects", "activity", "documents", "finance"]) assert.equal((await route.default({ params: Promise.resolve({ id: d.id }), searchParams: Promise.resolve({ tab }) })).props.initialTab, tab);
  assert.equal((await route.default({ params: Promise.resolve({ id: d.id }), searchParams: Promise.resolve({ tab: ["projects"] }) })).props.initialTab, undefined);
});
