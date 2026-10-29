import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { entryHarness } from "./entry-fixtures.mjs";
import { actionFixture, ApiError, dealContracts } from "./deal-action-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, tick = () => new Promise(resolve => setImmediate(resolve));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.review, type)]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(view, label) { const value = find(view, "Button").find(node => text(node) === label); assert.ok(value, label); return value; }
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const common = { "react/jsx-runtime": runtime, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "./contracts": dealContracts };
function stageFixture(options = {}) {
  const s = actionFixture(options), h = entryHarness(), closed = [], saved = [], policy = loadServer("src/features/deals/deal-stage-policy.ts", { modules: { "./contracts": dealContracts } });
  const loaded = loadServer("src/features/deals/deal-stage-menu.tsx", { modules: { ...common, react: h.react, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogContent", "AlertDialogTitle", "AlertDialogDescription", "AlertDialogCancel"].map(name => [name, name])), "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "Menu" }, "./deal-stage-policy": policy, "./reservation-panel": { ReservationPanel: "Reservation" }, "./outcome-panel": { OutcomePanel: "Outcome" } } });
  const props = { deal: s.deal, writable: true, busyChanged() {}, saved: async () => { saved.push(true); return s.server.deal; }, closed: () => closed.push(true) };
  const render = () => h.render(() => { const cmd = s.render(); return loaded.DealStageMenu({ ...props, recovery: cmd, busy: cmd.busy, error: cmd.error, mutate: cmd.mutate }); });
  return { ...s, props, render, owner: s.render, closed, saved, dispose: () => { h.dispose(); s.dispose(); }, choose: stage => find(render(), "Menu")[0].props.choose(stage), submit: () => find(render(), "form")[0].props.onSubmit({ preventDefault() {} }), reason: value => find(render(), "Input")[0].props.onChange({ target: { value } }) };
}
function fieldFixture(field, options = {}) {
  const s = actionFixture(options), h = entryHarness(), saved = [], cancelled = [], metadata = { campaign_sources: [], budget_bands: [], purchase_reasons: [], countries: [], languages: [] };
  const loaded = loadServer("src/features/deals/deal-inline-field.tsx", { modules: { ...common, react: h.react, "@/components/shared/inline-record-field": { InlineFieldForm: "Form", InlineFieldLoading: "Loading", InlineRecordField: "Field" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/features/contacts/qualification-inputs": { BudgetInput: "Budget" }, "@/features/contacts/qualification-contracts": vocabulary, "@/features/contacts/use-query": {}, "./qualification-contracts": qualification, "./project-picker": { ProjectPicker: "Project" } } });
  const props = { deal: s.deal, field, label: field, writable: true, metadata, controls: { saved: () => saved.push(true), cancel: () => cancelled.push(true) } };
  const render = () => h.render(() => { const cmd = s.render(); return loaded.DealFieldEditor({ ...props, recovery: cmd, busy: cmd.busy, error: cmd.error, mutate: cmd.mutate }); });
  return { ...s, props, render, saved, cancelled, owner: s.render, trigger: () => loaded.DealInlineField({ ...props, display: "Synthetic value", icon: "Icon", recovery: s.render(), busy: false }), submit: () => find(render(), "Form")[0].props.submit({ preventDefault() {} }) };
}
test("Selected stage dialog freezes dismissal, input and replacement while its original write is unknown", async () => {
  let lost = true; const s = stageFixture({ command: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } });
  s.choose("visit"); s.reason("Original stage reason"); const initial = s.render(); s.submit(); s.submit(); await tick(); assert.equal(s.calls.length, 1);
  let view = s.render(); assert.equal(find(view, "fieldset")[0].props.disabled, true); assert.equal(button(view, "Annuler").props.disabled, true);
  let prevented = false; find(view, "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { prevented = true; } }); assert.equal(prevented, true);
  find(view, "AlertDialog")[0].props.onOpenChange(false); find(initial, "Menu")[0].props.choose("documents"); s.reason("Replacement"); assert.equal(find(s.render(), "Input")[0].props.value, "Original stage reason"); assert.equal(s.closed.length, 0);
  lost = false; s.submit(); await tick(); assert.equal(s.closed.length, 1); assert.equal(s.saved.length, 0); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.calls[1][1].stage, "visit");
});
test("Global result recovery completes and closes the originating stage dialog exactly once", async () => {
  let outage = true; const s = stageFixture({ read: ({ server }) => { if (outage) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return server.deal; } });
  s.choose("documents"); s.reason("Synthetic reason"); s.submit(); await tick(); assert.equal(s.closed.length, 0); outage = false;
  assert.equal(await s.owner().retry(), true); assert.equal(s.calls.length, 1); assert.equal(s.closed.length, 1); assert.equal(find(s.render(), "AlertDialog")[0].props.open, false);
});
test("Stage conflicts explicitly re-review the intended transition with the current version", async () => {
  let conflict = true; const s = stageFixture({ command: ({ commit }) => { if (conflict) throw new ApiError("DEAL_VERSION_CONFLICT", 409); return commit(); } });
  s.choose("visit"); s.reason("Retained reason"); s.submit(); await tick(); assert.equal(find(s.render(), "fieldset")[0].props.disabled, true);
  s.server.deal = { ...s.deal, version: 9, stage: "negotiation" }; button(s.render(), "Charger la version actuelle").props.onClick(); await tick(); conflict = false;
  assert.equal(find(s.render(), "Input")[0].props.value, "Retained reason"); s.submit(); await tick(); assert.equal(s.calls[1][1].expected_version, 9); assert.equal(s.calls[1][1].stage, "visit");
});
test("All nine selected inline affair fields serialize through the real qualification contract", async () => {
  const cases = { initial_budget: ["Budget", "1700000"], rating: ["Select", "warm"], campaign_source: ["Select", "broker"], purchase_reasons: ["Checkbox", true], payment_method: ["Select", "mortgage"], number_of_rooms: ["Input", "0"], projects: ["Project", { label: "Synthetic alternate", choice: { external_name: "Synthetic alternate" } }], notes: ["Textarea", "Synthetic amended note"], next_action: ["Textarea", "Synthetic next action"] };
  for (const [field, [type, value]] of Object.entries(cases)) {
    const s = fieldFixture(field), control = find(s.render(), type)[type === "Checkbox" ? 1 : 0];
    if (type === "Project") control.props.choose(value); else if (type === "Budget") control.props.onChange(value); else if (type === "Checkbox") control.props.onCheckedChange(value); else control.props.onChange({ target: { value } });
    s.submit(); await tick(); assert.equal(s.calls.length, 1, field); assert.equal(s.calls[0][1].expected_version, 7); assert.equal(s.saved.length, 1, field); assert.equal(s.calls[0][4], "PATCH"); assert.equal(s.calls[0][1].number_of_rooms, 0);
  }
});
test("Unknown inline writes retain the original field and callback despite incoming props or global retry", async () => {
  let lost = true; const s = fieldFixture("notes", { command: ({ commit }) => { const result = commit(); if (lost) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return result; } });
  const trigger = s.trigger(); find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Original draft" } }); s.submit(); await tick(); const old = find(s.render(), "Textarea")[0];
  s.props.deal = { ...s.deal, version: 50, notes: "Incoming unrelated revision" }; old.props.onChange({ target: { value: "Replacement draft" } }); const form = find(s.render(), "Form")[0]; assert.equal(trigger.props.canOpen(), false); assert.equal(form.props.recovering, true); form.props.cancel(); assert.equal(s.cancelled.length, 0); assert.equal(find(s.render(), "Textarea")[0].props.value, "Original draft");
  lost = false; assert.equal(await s.owner().retry(), true); assert.equal(s.saved.length, 1); assert.equal(s.calls[1][1].notes, "Original draft"); assert.equal(s.calls[1][1].expected_version, 7);
});
test("Inline conflict keep preserves only that selected field and current unrelated qualification", async () => {
  let conflict = true; const s = fieldFixture("notes", { command: ({ commit }) => { if (conflict) throw new ApiError("DEAL_VERSION_CONFLICT", 409); return commit(); } });
  find(s.render(), "Textarea")[0].props.onChange({ target: { value: "Retained note" } }); s.submit(); await tick(); s.server.deal = { ...s.deal, version: 9, initial_budget: "2300000", next_action: "Concurrent next action", rating: "hot", payment_method: "mortgage" };
  button(s.render(), "Comparer le champ actuel").props.onClick(); await tick(); assert.match(text(find(s.render(), "Form")[0].props.review), /Version actuelle\s+9/); button(s.render(), "Conserver ma saisie").props.onClick(); conflict = false;
  s.submit(); await tick(); const body = s.calls[1][1]; assert.equal(body.expected_version, 9); assert.equal(body.notes, "Retained note"); assert.equal(body.initial_budget, "2300000"); assert.equal(body.next_action, "Concurrent next action"); assert.equal(body.rating, "hot");
});
test("Legacy financing is visible and requires explicit remediation before saving another inline field", async () => {
  const s = fieldFixture("notes"); s.props.deal = { ...s.deal, payment_method: "legacy-unmapped" }; // mounted review comes from this first render
  const view = s.render(); assert.match(text(view), /Financement à vérifier/); assert.equal(find(view, "Select")[0].props.value, "legacy-unmapped");
  find(view, "Textarea")[0].props.onChange({ target: { value: "Synthetic note" } }); s.submit(); await tick(); assert.equal(s.calls.length, 0);
  find(s.render(), "Select")[0].props.onChange({ target: { value: "" } }); s.submit(); await tick(); assert.equal(s.calls[0][1].payment_method, null); assert.equal(s.saved.length, 1);
});

test("Affair board carries the originating account and role into its keyed action owner", () => {
  const h = entryHarness(), s = actionFixture(), captured = [], actorId = randomUUID();
  const loaded = loadServer("src/features/deals/deal-kanban.tsx", { modules: { ...common, react: { ...h.react, useCallback: value => value }, "@/components/shared/paged-kanban": { PagedKanban: "Board" }, "@/components/shared/kanban-record-card": { KanbanRecordCard: "Card" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "Menu" }, "@/features/inventory/contracts": { kindLabels: {} }, "@/features/realtime/current-record": { currentRecord: (remote, local) => local ?? remote }, "@/components/ui/alert-dialog": {}, "./deal-stage-policy": loadServer("src/features/deals/deal-stage-policy.ts", { modules: { "./contracts": dealContracts } }), "./deal-stage-menu": { DealStageMenu: "StageMenu" }, "./use-deal-command": { useDealCommand: (id, starting, options) => { captured.push({ id, options }); return { busy: false }; } } } });
  const props = { actorId, role: "manager", filters: {}, changed() {}, denied() {}, returnFocus: { current: null } };
  const render = () => h.render(() => loaded.DealKanban(props)); find(render(), "Board")[0].props.move(s.deal, "visit");
  const action = find(render(), "Fragment")[0].props.children.find(node => typeof node?.type === "function"); assert.equal(action.props.actorId, actorId); assert.equal(action.props.role, "manager"); assert.match(action.key, new RegExp(actorId));
  action.type(action.props); assert.equal(captured[0].id, s.deal.id); assert.equal(captured[0].options.actorId, actorId); assert.equal(captured[0].options.role, "manager");
});
