import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.action, type), ...find(node.props?.status, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(view, label) { const node = find(view, "Button").find(node => text(node) === label); assert.ok(node, label); return node; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
const finance = loadServer("src/features/finance/contracts.ts");
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } }), requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const deals = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": qualification } });
const files = loadServer("src/features/files/contracts.ts"), at = "2026-10-20T12:00:00Z";
function deal() {
  const contact = contacts.contactSummarySchema.parse({ id: randomUUID(), name: "Synthetic finance contact", type: "person", primary_phone: "+212600000000", primary_email: null, primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, version: 4, archived_at: null, country: "MA", nationality: "", languages: ["french"], calling_code: "+212" });
  return deals.dealSchema.parse({ id: randomUUID(), version: 7, title: "Synthetic finance deal", stage: "new", contact, origin_contact_id: contact.id, enquiry_id: null, requirement_id: null, offering: null, next_action: "", stock_review_required: false, archived_at: null, primary_agent_at_close_id: null, active_reservation: null, reservation_conflict: null, customer_offer_count: 0, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, initial_budget: "1000000", campaign_source: "broker", rating: "cold", purchase_reasons: ["residence"], client_snapshot: {}, notes: "", payment_method: null, number_of_rooms: null, projects: [{ position: 1, name: "Synthetic project", development_id: null, property_id: null, external_name: "Synthetic project" }] });
}
function commission(dealId, recognized = false) { return finance.commissionSchema.parse({ id: randomUUID(), deal_id: dealId, version: 1, current: { id: randomUUID(), version: 1, previous_revision_id: null, kind: "fixed", base_mad: "100000", rate_percent: null, amount_mad: "10000.00", due_on: "2026-11-12", state: recognized ? "recognized" : "expected", review_required: false, action: recognized ? "recognized" : "created", reason: "", actor: { id: randomUUID(), display_name: "Synthetic original creator" }, receipt_id: null, reopening_id: null, created_at: at, created_local: at, calculation_policy: "MAD_FINAL_ROUND_HALF_UP_2" }, collected_mad: recognized ? "200.00" : "0.00", balance_mad: recognized ? "9800.00" : null, created_by_user_id: randomUUID(), created_at: at }); }
function receipt(id) { return finance.receiptSchema.parse({ id: randomUUID(), commission_id: id, supersedes_id: null, valid: true, amount_mad: "200.00", received_on: "2026-10-20", evidence_document_id: null, evidence_version_id: null, reason: "Synthetic receipt reason", actor: { id: randomUUID(), display_name: "Synthetic cashier" }, created_at: at }); }
const page = (items = [], changes = {}) => ({ items, total: items.length, page: 1, page_size: 20, has_next: false, has_previous: false, ...changes });
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `finance-${i}`; },
    useCallback(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, value: fn }; return slots[i].value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(effect => effect()); return result; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const ui = { "react/jsx-runtime": runtime, "@/components/icons": { FinanceIcon: "Icon" }, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/record-workspace": { RecordSection: "Section" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/badge": { Badge: "Badge" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/record-states": { RecordError: "Error" }, "./confirmation": { FinanceConfirmation: "Confirmation" }, "./contracts": finance, "@/features/deals/contracts": deals, "@/features/files/contracts": files };
function setup({ recognized = false, existing = true, kind = "terms", command, read, saved, hydrated = true, writable = true, verify, original: editingReceipt = false } = {}) {
  const h = harness(), parent = deal(), value = commission(parent.id, recognized), original = editingReceipt ? receipt(value.id) : undefined, calls = [], reads = [], denies = [], decisions = [], events = []; let completed = 0, closed = 0;
  const props = { dealId: parent.id, dealVersion: parent.version, value: existing ? value : undefined, contactId: parent.contact.id, original, writable, denied: error => denies.push(error), saved: async result => { completed++; if (saved) await saved(result); }, cancel: () => closed++ };
  const apiGet = async (path, schema, signal) => { reads.push({ path, signal }); return schema.parse(read ? await read(path, schema, signal) : path.includes("receipts?") ? page(original ? [original] : []) : path.includes("/deals/") ? parent : value); };
  const model = loadServer("src/features/finance/model.ts", { modules: { "@/lib/api/client": { apiGet, ApiError }, "@/features/deals/contracts": deals, "./contracts": finance } });
  const commands = loadServer("src/features/finance/mutation.tsx", { modules: { ...ui, react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); return args[2].parse(command ? await command(...args) : { id: value.id, version: 2 }); } }, "./model": model }, globals: { AbortController, crypto: { randomUUID } } });
  const draft = loadServer("src/components/shared/dossier-form.tsx", { modules: { react: h.react, "react/jsx-runtime": runtime, "./record-header": {} }, globals: { Event, window: { dispatchEvent: event => events.push(event.type) } } });
  const modules = { ...ui, react: h.react, "@/components/shared/dossier-form": draft, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: (run, scope) => decisions.push({ run, scope }), dialog: null }) }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/features/contacts/use-query": { useQuery: () => ({}) }, "@/features/schedule/time": { localLabel: value => value }, "@/lib/api/client": { ApiError }, "./model": model, "./mutation": commands, "./terms-form": { FinanceField: "Field", TermsForm: "Terms" }, "./receipt-form": { ReceiptForm: "Receipt" } };
  const terms = loadServer("src/features/finance/terms-form.tsx", { modules });
  const receipts = loadServer("src/features/finance/receipt-form.tsx", { modules });
  const record = loadServer("src/features/finance/commission-record.tsx", { modules });
  function expandFields(node) { if (Array.isArray(node)) return node.map(expandFields); if (!node || typeof node !== "object" || !node.props) return node; if (typeof node.type === "function" && node.type.name === "FinanceField") return expandFields(node.type(node.props)); return { ...node, props: { ...node.props, children: expandFields(node.props.children) } }; }
  const render = () => { const result = h.render(() => kind === "hook" ? commands.useFinanceMutation(parent.id, existing ? value.id : undefined, props.saved, props.denied, verify, props.writable) : kind === "receipt" ? receipts.ReceiptForm({ ...props, value }) : kind === "recognize" ? record.RecognitionForm({ ...props, value }) : terms.TermsForm(props)); return kind === "hook" ? result : expandFields(result); };
  const change = (name, value) => { const view = render(), field = ["Input", "Select", "Textarea", "Field"].flatMap(type => find(view, type)).find(node => node.props.name === name); assert.ok(field, name); if (field.type === "Field") field.props.changed(value); else field.props.onChange({ target: { value } }); };
  const submit = () => find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); render();
  return { h, parent, value, original, props, calls, reads, denies, decisions, events, commands, model, record, receipts, render, change, submit, get completed() { return completed; }, get closed() { return closed; } };
}

test("Finance arithmetic retains exact half-up calculation, large decimal strings, modes and positive bounds", () => {
  assert.equal(finance.calculatedAmount({ kind: "percentage", base_mad: "10.05", rate_percent: "10", amount_mad: null }), "1.01");
  assert.equal(finance.calculatedAmount({ kind: "fixed", base_mad: "9999999999999999.12345678", rate_percent: null, amount_mad: "9999999999999999.99" }), "9999999999999999.99");
  for (const patch of [{ rate_percent: "0" }, { base_mad: "1e6" }, { base_mad: "0" }, { amount_mad: "1.00" }, { rate_percent: "10000" }]) assert.equal(finance.termsSchema.safeParse({ kind: "percentage", base_mad: "10.05", rate_percent: "10", amount_mad: null, due_on: null, ...patch }).success, false);
});

test("a synchronous finance lock prevents duplicate commands, fresh comparison and premature cancellation", async () => {
  let release; const s = setup({ kind: "hook", command: () => new Promise(resolve => { release = resolve; }) }); let m = s.render(); const first = m.save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }), second = m.save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); await m.compare(); assert.equal(s.calls.length, 1); assert.equal(s.reads.length, 0); assert.equal(m.isBusy(), true); release({ id: s.value.id, version: 2 }); await Promise.all([first, second]); m = s.render(); assert.equal(m.busy, false); assert.equal(s.completed, 1);
});

test("unknown acknowledgement pins path/body/key and never allows comparison to rebase a possibly committed write", async () => {
  let fail = true; const s = setup({ kind: "hook", command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { id: s.value.id, version: 2 }; } }), path = `/api/v1/commissions/${s.value.id}/recognize`;
  await s.render().save(path, { expected_version: 1 }); let m = s.render(); assert.equal(m.uncertain, true); await m.compare(); await m.save(path, { expected_version: 2 }); assert.equal(s.calls.length, 1); assert.equal(s.reads.length, 0);
  fail = false; await m.retry(); assert.equal(s.calls.length, 2); assert.equal(s.calls[1][3], s.calls[0][3]); assert.deepEqual(plain(s.calls[1][1]), { expected_version: 1 }); assert.equal(s.render().uncertain, false);
});

test("confirmed write followed by failed refresh retries only the completion read, even after the context becomes read-only", async () => {
  let fail = true; const s = setup({ kind: "hook", saved: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); const path = `/api/v1/commissions/${s.value.id}/recognize`;
  await s.render().save(path, { expected_version: 1 }); let m = s.render(); assert.equal(m.acknowledged, true); assert.equal(m.uncertain, true); await m.compare(); assert.equal(s.reads.length, 0);
  s.props.writable = false; fail = false; m = s.render(); await m.retry(); assert.equal(s.calls.length, 1); assert.equal(s.completed, 2); assert.equal(s.render().uncertain, false);
});

test("definite conflict compares current exact parent identity and only explicit acceptance changes the next request version", async () => {
  const s = setup({ kind: "hook", command: async () => { throw new ApiError("VERSION_CONFLICT", 409); } }); const path = `/api/v1/commissions/${s.value.id}/recognize`;
  await s.render().save(path, { expected_version: 1 }); await s.render().compare(); const m = s.render(); assert.equal(m.comparison.commission.id, s.value.id); assert.equal(s.calls.length, 1);
  let accepted; const view = s.commands.FinanceFailure({ mutation: m, acceptVersion: version => accepted = version }); button(view, "Conserver ma saisie avec cette version").props.onClick(); assert.equal(accepted, 1); await s.render().save(path, { expected_version: 2 }); assert.notEqual(s.calls[1][3], s.calls[0][3]);
});

test("foreign or incoherent financial reads cannot provide a comparison baseline", async () => {
  for (const change of [value => ({ ...value, id: randomUUID() }), value => ({ ...value, deal_id: randomUUID() }), value => ({ ...value, version: 2 })]) {
    const s = setup({ kind: "hook", command: async () => { throw new ApiError("VERSION_CONFLICT", 409); }, read: () => change(s.value) }); await s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); await s.render().compare(); assert.equal(s.render().comparison, undefined); assert.equal(s.render().error.status, 503);
  }
  const s = setup({ kind: "hook", existing: false, read: () => ({ ...s.parent, id: randomUUID() }) }); await assert.rejects(s.model.readFinanceDeal(s.parent.id), error => error.status === 503);
});

test("receipt correction verifies its original on the selected current page, blocks missing/replaced rows and rejects foreign pages", async () => {
  const s = setup({ kind: "hook", recognized: true, original: true }); assert.equal(await s.model.receiptStillCurrent(s.value.id, s.original, 1), undefined);
  for (const result of [page([]), page([{ ...s.original, valid: false }])]) { const other = setup({ kind: "hook", read: () => result }); assert.equal(typeof await other.model.receiptStillCurrent(s.value.id, s.original, 1), "string"); }
  for (const result of [page([s.original], { page: 2 }), page([{ ...s.original, commission_id: randomUUID() }]), page([s.original, s.original])]) { const other = setup({ kind: "hook", read: () => result }); await assert.rejects(other.model.receiptStillCurrent(s.value.id, s.original, 1), error => error.status === 503); }
});

test("finance authority loss is propagated; hydration/read-only/unmount never initiate or deliver a late command", async () => {
  for (const status of [401, 403, 404]) { const s = setup({ kind: "hook", command: async () => { throw new ApiError("FORBIDDEN", status); } }); await s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); assert.equal(s.denies[0].status, status); }
  for (const options of [{ hydrated: false }, { writable: false }]) { const s = setup({ kind: "hook", ...options }); await s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); assert.equal(s.calls.length, 0); }
  let release; const s = setup({ kind: "hook", command: () => new Promise(resolve => { release = resolve; }) }); const pending = s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); s.h.unmount(); assert.equal(s.calls[0][6].aborted, true); release({ id: s.value.id, version: 2 }); await pending; assert.equal(s.completed, 0);
});

test("malformed success identity is treated as unknown rather than completing a different commission", async () => {
  const s = setup({ kind: "hook", command: async () => ({ id: randomUUID(), version: 2 }) }); await s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); assert.equal(s.render().uncertain, true); assert.equal(s.completed, 0);
});

test("terms form is clean at first, becomes managed/dirty on editing and snapshots a correction before confirmation", async () => {
  const s = setup(); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], false); s.change("amount", "10001,25"); s.change("reason", "Synthetic correction reason"); s.submit(); const view = s.render(), confirmation = find(view, "Confirmation")[0]; assert.ok(confirmation); assert.equal(s.calls.length, 0); assert.equal(find(view, "form")[0].props["data-live-dirty"], true); s.change("amount", "999.00"); await confirmation.props.confirm(); await tick();
  assert.equal(s.calls[0][0], `/api/v1/commissions/${s.value.id}/correct`); assert.deepEqual(plain(s.calls[0][1]), { kind: "fixed", base_mad: "100000", rate_percent: null, amount_mad: "10001.25", due_on: "2026-11-12", target: "commission", expected_version: 1, reason: "Synthetic correction reason" }); assert.equal(find(s.render(), "form")[0].props["data-live-dirty"], false);
});

test("new percentage commission keeps exact preview and body mode; no inferred base or financial recognition", async () => {
  const s = setup({ existing: false }); s.change("kind", "percentage"); s.change("base", "10,05"); s.change("rate", "10"); const view = s.render(); assert.equal(find(view, "Entry")[0].props.title, "1,01 MAD"); s.submit(); await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(plain(s.calls[0][1]), { kind: "percentage", base_mad: "10.05", rate_percent: "10", amount_mad: null, due_on: null, expected_deal_version: 7 }); assert.equal(s.calls[0][0], `/api/v1/deals/${s.parent.id}/commissions`);
});

test("unknown form mutation keeps fields, recovery markers and the original request instead of opening another confirmation", async () => {
  const s = setup({ command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); s.change("reason", "Synthetic correction"); s.submit(); await find(s.render(), "Confirmation")[0].props.confirm(); await tick(); const view = s.render(); assert.equal(find(view, "form")[0].props["data-write-recovery"], true); assert.equal(find(view, "fieldset")[0].props.disabled, true); s.change("amount", "11.00"); s.submit(); assert.equal(find(s.render(), "Confirmation").length, 0); assert.equal(s.calls.length, 1); assert.equal(find(s.render(), "Input").find(node => node.props.name === "amount").props.value, "10000.00");
});

test("terms cancel uses the shared dirty boundary and current comparison keeps the draft rather than replacing inputs", async () => {
  const s = setup({ command: async () => { throw new ApiError("VERSION_CONFLICT", 409); } }); s.change("amount", "12345.67"); s.change("reason", "Synthetic reason"); button(s.render(), "Annuler").props.onClick(); assert.equal(s.closed, 0); assert.equal(s.decisions.length, 1); s.submit(); await find(s.render(), "Confirmation")[0].props.confirm(); await tick(); const failure = find(s.render(), s.commands.FinanceFailure)[0]; await failure.props.mutation.compare(); const next = find(s.render(), s.commands.FinanceFailure)[0]; next.props.acceptVersion(2, { ...s.value, version: 2, current: { ...s.value.current, version: 2, amount_mad: "11000.00" } }); next.props.mutation.clear(); assert.equal(find(s.render(), "Input").find(node => node.props.name === "amount").props.value, "12345.67");
});

test("receipt create/replacement/void snapshots retain exact original IDs, reasons and versioned command boundaries", async () => {
  for (const mode of ["new", "replace", "void"]) {
    const s = setup({ kind: "receipt", recognized: true, original: mode !== "new" }); if (mode === "void") s.change("mode", "void"); else { s.change("amount", "99,99"); s.change("date", "2026-10-21"); s.change("reason", "Synthetic receipt justification"); } if (mode !== "new") s.change("correctionReason", "Synthetic correction explanation");
    s.submit(); const confirmation = find(s.render(), "Confirmation")[0]; assert.ok(confirmation); assert.equal(s.calls.length, 0); await confirmation.props.confirm(); await tick(); const body = s.calls[0][1]; assert.equal(body.expected_version, 1);
    if (mode === "new") { assert.equal(body.amount_mad, "99.99"); assert.equal(body.evidence_document_id, null); assert.ok(s.calls[0][0].endsWith("/receipts")); }
    else { assert.equal(body.receipt_id, s.original.id); assert.equal(body.reason, "Synthetic correction explanation"); assert.ok(s.calls[0][0].endsWith("/correct")); if (mode === "void") assert.equal(body.replacement, null); else assert.equal(body.replacement.amount_mad, "99.99"); }
  }
});

test("recognition remains a separate confirmed version-only command and blocks adoption after someone already recognized it", async () => {
  const s = setup({ kind: "recognize", command: async () => { throw new ApiError("VERSION_CONFLICT", 409); }, read: () => ({ ...s.value, current: { ...s.value.current, state: "recognized" } }) }); await find(s.render(), "Confirmation")[0].props.confirm(); await tick(); assert.deepEqual(plain(s.calls[0][1]), { expected_version: 1 }); const failure = find(s.render(), s.commands.FinanceFailure)[0]; await failure.props.mutation.compare(); const current = find(s.render(), s.commands.FinanceFailure)[0]; assert.ok(current.props.mutation.comparison,JSON.stringify({error:current.props.mutation.error?.code,status:current.props.mutation.error?.status,reads:s.reads.map(item=>item.path),calls:s.calls.length})); assert.ok(current.props.mutation.comparison.blocked.includes("déjà reconnue")); const view = s.commands.FinanceFailure(current.props); assert.equal(find(view, "Button").filter(node => text(node) === "Conserver ma saisie avec cette version").length, 0);
});

test("cancel during an active write is synchronously refused; archive/hydration guards also cover confirmation handlers", async () => {
  let release; const s = setup({ existing: false, command: () => new Promise(resolve => { release = resolve; }) }); s.change("base", "100"); s.change("amount", "10"); s.submit(); button(s.render(), "Annuler").props.onClick(); assert.equal(s.decisions.length, 0); release({ id: s.value.id, version: 1 }); await new Promise(resolve => setImmediate(resolve));
  const archived = setup(); archived.change("reason", "Synthetic correction"); archived.submit(); archived.props.writable = false; const view = archived.render(); assert.equal(find(view, "Confirmation")[0].props.disabled, true); await find(view, "Confirmation")[0].props.confirm(); await tick(); assert.equal(archived.calls.length, 0);
});

test("finance workspace uses tonal cards and direct actions, keeps one focused editor, and clears the active selection before authority retry", async () => {
  const h = harness(), parent = deal(), value = commission(parent.id), result = { value: page([value]), refresh() { result.value = undefined; }, refreshQuietly() {} }, parentQuery = { value: parent, refresh() { parentQuery.value = undefined; } };
  const modules = { ...ui, react: h.react, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request: run => run(), dialog: null }) }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/features/contacts/use-query": { useQuery: path => path.includes("/commissions?") ? result : parentQuery }, "@/lib/api/client": { ApiError }, "./commission-record": { CommissionRecord: "Record" }, "./model": { FINANCE_PAGE_SIZE: 20, financePageValid: (value, n) => value.page === n && value.page_size === 20 && value.items.length <= 20, financeDenied: error => [401, 403, 404].includes(error.status) }, "./terms-form": { TermsForm: "Terms" } };
  const denied = [], onDenied = error => denied.push(error), loaded = loadServer("src/features/finance/finance-panel.tsx", { modules, globals: { queueMicrotask } }), render = () => h.render(() => loaded.FinanceWorkspace({ deal: parent, onDenied })); let view = render(); assert.equal(find(view, "Entry").length, 1); assert.equal(find(view, "table").length, 0); assert.equal(find(view, "Pages").length, 0); assert.equal(find(view, "Badge")[0].props.variant, "neutral");
  button(view, "Corriger la commission").props.onClick(); view = render(); assert.equal(find(view, "Record").length, 1); assert.equal(find(view, "Entry").length, 0); assert.equal(find(view, "Record")[0].props.initial.mode, "commission"); button(view, "Commissions et encaissements").props.onClick(); view = render(); assert.equal(find(view, "Entry").length, 1);
  button(view, "Corriger la commission").props.onClick(); assert.equal(find(render(), "Record").length, 1);
  result.error = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Entry").length, 0); assert.equal(find(view, "Record").length, 0); assert.equal(find(view, "Error")[0].props.error.status, 403); assert.ok(!text(view).includes("Synthetic finance contact"));
  await tick(); assert.equal(denied[0], result.error); find(render(), "Error")[0].props.retry(); delete result.error; view = render(); assert.equal(find(view, "Record").length, 0); assert.equal(find(view, "Terms").length, 0); assert.match(text(view), /Chargement du contexte financier/);
  parentQuery.value = parent; result.value = page([value]); assert.equal(find(render(), "Entry").length, 1); assert.equal(find(render(), "Record").length, 0);
  parentQuery.error = new ApiError("FORBIDDEN", 403); assert.equal(find(render(), "Entry").length, 0); h.unmount(); await tick(); assert.equal(denied.length, 1);
});

test("finance authority boundary removes the private controller and retries with a fresh lifetime for the same dossier", () => {
  const h = harness(), parent = deal(), loaded = loadServer("src/features/finance/finance-panel.tsx", { modules: { ...ui, react: h.react, "@/components/shared/unsaved-guard": {}, "@/hooks/use-hydrated": {}, "@/features/contacts/use-query": {}, "@/lib/api/client": { ApiError }, "./commission-record": {}, "./model": {}, "./terms-form": {} } });
  const panel = loaded.FinancePanel({ deal: parent }), other = loaded.FinancePanel({ deal: deal() }); assert.equal(panel.key, parent.id); assert.notEqual(other.key, panel.key);
  const render = () => h.render(() => panel.type(panel.props)), controller = render(); assert.equal(controller.type, loaded.FinanceWorkspace); assert.equal(controller.props.deal.id, parent.id);
  const error = new ApiError("FORBIDDEN", 403); controller.props.onDenied(error); let view = render(); assert.equal(view.type, "Error"); assert.equal(view.props.error, error); assert.equal(find(view, loaded.FinanceWorkspace).length, 0);
  view.props.retry(); view = render(); assert.equal(view.type, loaded.FinanceWorkspace); assert.notEqual(view.key, controller.key); assert.equal(view.props.deal.id, parent.id);
});

test("finance detail keeps receipts and audit in full-width cards with retained actors, original status and server-local time", () => {
  const h = harness(), parent = deal(), value = commission(parent.id, true), original = receipt(value.id), replaced = { ...receipt(value.id), valid: false }, queries = { current: { value }, receipts: { value: page([original, replaced]), refresh() {} }, revisions: { value: page([value.current]), refresh() {} } }, opened = [], denies = [];
  const modules = { ...ui, react: h.react, "@/components/shared/dossier-form": {}, "@/components/shared/unsaved-guard": {}, "@/features/contacts/use-query": { useQuery: path => path.includes("/receipts?") ? queries.receipts : path.includes("/revisions?") ? queries.revisions : queries.current }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/features/schedule/time": { localLabel: value => `Server civil ${value}` }, "@/lib/api/client": { ApiError }, "./model": { FINANCE_PAGE_SIZE: 20, financePageValid: (value, n) => value.page === n && value.page_size === 20, financeDenied: error => [401, 403, 404].includes(error.status) }, "./mutation": {}, "./receipt-form": {}, "./terms-form": {} };
  const { CommissionDetail } = loadServer("src/features/finance/commission-record.tsx", { modules }); const props = { value, dealId: parent.id, writable: true, receiptPage: 1, setReceiptPage() {}, historyPage: 1, setHistoryPage() {}, notice: "", denied: error => denies.push(error), close() {}, open: (...args) => opened.push(args) }, render = () => h.render(() => CommissionDetail(props)); let view = render();
  assert.equal(find(view, "Entry").length, 4); assert.equal(find(view, "table").length, 0); assert.equal(find(view, "Pages").length, 0); const history = find(view, "Entry").find(node => node.props.title === "Commission reconnue"); assert.equal(history.props.meta.find(item => item.label === "Date").value, `Server civil ${at}`); assert.equal(history.props.meta.find(item => item.label === "Auteur").value, "Synthetic original creator");
  button(view, "Corriger cet encaissement").props.onClick(); assert.equal(opened[0][2].id, original.id); queries.receipts.error = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Entry").length, 0); assert.equal(denies[0].status, 403);
});

test("finance evidence picker masks denied/invalid pages and offers only current clean optional documents", () => {
  const h = harness(), parent = deal(), changed = [], denies = [], calls = [], document = state => files.documentSchema.parse({ id: randomUUID(), filename: `synthetic-${state}-${randomUUID().slice(0,8)}.pdf`, mime_type: "application/pdf", purpose: "attachment", size_bytes: 1024, version: 1, archived: false, versions: [{ id: randomUUID(), state, scan_error: null, created_at: at }] });
  const clean = document("clean"), quarantined = document("pending_scan"), archived = { ...document("clean"), archived: true }, query = { value: page([clean, quarantined, archived]), refresh() {} };
  const modules = { ...ui, react: h.react, "@/components/shared/dossier-form": {}, "@/components/shared/unsaved-guard": {}, "@/features/contacts/use-query": { useQuery: path => { calls.push(path); return query; } }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError }, "./model": { FINANCE_PAGE_SIZE: 20, financePageValid: (value, n) => value.page === n && value.page_size === 20 && value.items.length <= 20, financeDenied: error => [401, 403, 404].includes(error.status) }, "./mutation": {}, "./terms-form": {} };
  const { EvidencePicker } = loadServer("src/features/finance/receipt-form.tsx", { modules }), props = { dealId: parent.id, contactId: parent.contact.id, value: null, changed: value => changed.push(value), disabled: false, denied: error => denies.push(error) }, render = () => h.render(() => EvidencePicker(props)); let view = render(); assert.ok(text(view).includes(clean.filename)); assert.ok(!text(view).includes(quarantined.filename)); assert.ok(!text(view).includes(archived.filename)); assert.equal(find(view, "Pages").length, 0); assert.ok(calls[0].endsWith("&page=1&page_size=20"));
  find(view, "Select")[0].props.onChange({ target: { value: "contact" } }); render(); assert.ok(calls.at(-1).includes(`parent_kind=contact&parent_id=${parent.contact.id}`)); assert.equal(changed.at(-1), null);
  query.value = page([clean], { page: 2 }); view = render(); assert.equal(find(view, "Error").length, 1); assert.ok(!text(view).includes(clean.filename)); query.value = page([clean]); query.error = new ApiError("FORBIDDEN", 403); view = render(); assert.ok(!text(view).includes(clean.filename)); assert.equal(denies[0].status, 403);
});

test("financial form return follows its entry point instead of leaving a duplicate list beneath the editor", async () => {
  for (const direct of [true, false]) {
    const h = harness(), parent = deal(), value = commission(parent.id), events = [], modules = { ...ui, react: h.react, "@/components/shared/dossier-form": {}, "@/components/shared/unsaved-guard": {}, "@/features/contacts/use-query": {}, "@/hooks/use-hydrated": {}, "@/features/schedule/time": {}, "@/lib/api/client": { ApiError }, "./model": { readCommission: async () => value }, "./mutation": {}, "./terms-form": { TermsForm: "Terms" }, "./receipt-form": { ReceiptForm: "Receipt" } };
    const { CommissionRecord } = loadServer("src/features/finance/commission-record.tsx", { modules }), props = { initial: { commission: value, ...(direct ? { mode: "commission" } : {}) }, dealId: parent.id, contactId: parent.contact.id, dealVersion: 7, writable: true, changed: () => events.push("changed"), denied() {}, close: () => events.push("close") }, render = () => h.render(() => CommissionRecord(props)); let view = render();
    if (!direct) { view.props.open("commission", value); view = render(); } assert.equal(view.type, "Terms"); view.props.cancel(); assert.equal(events.includes("close"), direct);
  }
});

test("acknowledged finance completion refuses an older projection and closes only after the recorded revision becomes readable", async () => {
  const h = harness(), parent = deal(), value = commission(parent.id), events = []; let current = value;
  const modules = { ...ui, react: h.react, "@/components/shared/dossier-form": {}, "@/components/shared/unsaved-guard": {}, "@/features/contacts/use-query": {}, "@/hooks/use-hydrated": {}, "@/features/schedule/time": {}, "@/lib/api/client": { ApiError }, "./model": { readCommission: async () => current }, "./mutation": {}, "./terms-form": { TermsForm: "Terms" }, "./receipt-form": {} };
  const { CommissionRecord } = loadServer("src/features/finance/commission-record.tsx", { modules, globals: { AbortController } }), props = { initial: { commission: value, mode: "commission" }, dealId: parent.id, contactId: parent.contact.id, dealVersion: parent.version, writable: true, changed: () => events.push("changed"), denied() {}, close: () => events.push("close") }, render = () => h.render(() => CommissionRecord(props));
  const result = { id: value.id, version: 2 }; await assert.rejects(render().props.saved(result), error => error.status === 503); assert.deepEqual(events, []); assert.equal(render().type, "Terms");
  current = { ...value, version: 2, current: { ...value.current, version: 2 } }; await render().props.saved(result); assert.deepEqual(events, ["changed", "close"]);
});

test("shared discard prompt tells the truth about an operation awaiting recovery and keeps the default wording for ordinary drafts", () => {
  for (const recovery of [false, true]) {
    const h = harness(); let completed = 0; class Element {}
    const dirty = {}, scope = { matches: selector => selector.includes("write-recovery") && recovery, querySelector: () => null, querySelectorAll: () => [dirty] };
    const modules = { ...ui, react: h.react, "next/navigation": {}, "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogContent: "Content", AlertDialogTitle: "Title", AlertDialogDescription: "Description", AlertDialogCancel: "Cancel" }, "@/lib/navigation-intent": {}, "@/lib/discard-draft-action": { discardDraftAction: run => run() }, "@/lib/history-draft-guard": {} };
    const { useUnsavedGuard } = loadServer("src/components/shared/unsaved-guard.tsx", { modules, globals: { HTMLElement: Element, document: { activeElement: new Element() }, window: { dispatchEvent() {} }, Event } }), render = () => h.render(() => useUnsavedGuard()); render().request(() => completed++, scope); const dialog = render().dialog; assert.equal(dialog.props.open, true);
    const description = text(find(dialog, "Description")[0]); assert.equal(description.includes("peut déjà être enregistrée"), recovery); button(dialog, recovery ? "Quitter le formulaire" : "Quitter sans enregistrer").props.onClick(); assert.equal(completed, 1);
  }
});

test("finance facade preserves the backend's archive refusal instead of turning a definite failure into an uncertain write", async () => {
  const parent = deal(), calls = [], origin = "https://finance.synthetic.invalid";
  const { relayFinance } = loadServer("src/features/finance/facade.ts", { modules: { "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) }, "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic" }, "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 409, body: { error: { code: "RECORD_ARCHIVED" } } }; } }, "./contracts": finance } });
  const request = new Request(`${origin}/api/v1/deals/${parent.id}/commissions`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID(), "X-CSRF-Token": "synthetic-csrf", "Content-Type": "application/json" }, body: JSON.stringify({ kind: "fixed", base_mad: "100", amount_mad: "10", rate_percent: null, due_on: null, expected_deal_version: 7 }) });
  const result = await relayFinance(`deals/${parent.id}/commissions`, request, "synthetic"); assert.equal(result.status, 409); assert.equal((await result.json()).error.code, "RECORD_ARCHIVED"); assert.equal(calls[0][2].token, "synthetic-session"); assert.equal(calls[0][2].csrf, "synthetic-csrf");
  const s = setup({ kind: "hook", command: async () => { throw new ApiError("RECORD_ARCHIVED", 409); } }); await s.render().save(`/api/v1/commissions/${s.value.id}/recognize`, { expected_version: 1 }); assert.equal(s.denies[0].code, "RECORD_ARCHIVED"); assert.equal(s.render().uncertain, false);
});
