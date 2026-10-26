import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function stateHarness() {
  let cursor = 0;
  const state = [];
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial; return [state[index], next => { state[index] = typeof next === "function" ? next(state[index]) : next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useCallback(callback) { return callback; },
    useId() { return "synthetic-control"; },
  };
  return { react, render(callback) { cursor = 0; return callback(); } };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}

test("Unsaved navigation excludes same-page anchors, new tabs, downloads and non-page protocols", () => {
  const { navigationIntent } = loadServer("src/lib/navigation-intent.ts");
  const current = "https://crm.synthetic.invalid/contacts/record?tab=overview";
  for (const overrides of [{ href: "#identity" }, { href: "/leads", modified: true }, { href: "/leads", target: "_blank" }, { href: "/file", download: true }, { href: "tel:+212600000000" }, { href: "mailto:synthetic@example.invalid" }, { href: "javascript:invalid" }, { href: "http://[invalid" }]) assert.equal(navigationIntent({ current, ...overrides }), null);
  assert.equal(navigationIntent({ current, href: "/leads" }), "https://crm.synthetic.invalid/leads");
  assert.equal(navigationIntent({ current, href: "?tab=activity" }), "https://crm.synthetic.invalid/contacts/record?tab=activity");
});

test("Status menu preserves the reviewed version, immutable lead fields and retry identity after an interrupted response", async () => {
  const harness = stateHarness(), calls = [];
  const qualification = loadServer("src/features/contacts/qualification-contracts.ts");
  const contracts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": qualification } });
  class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
  let interrupted = true, saved = 0;
  const { LeadStatusMenu } = loadServer("src/features/contacts/lead-status-menu.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: harness.react, "react/jsx-runtime": runtime,
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" },
    "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" },
    "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "StatusMenu" },
    "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError },
    "@/lib/api/command": { apiCommand: async (path, body, schema, key, method) => { calls.push({ path, body, key, method }); assert.equal(schema, contracts.enquirySchema); if (interrupted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } },
    "./contracts": contracts, "./record-states": { RecordError: "Error" },
  } });
  const enquiry = { id: randomUUID(), version: 17, contact: { name: "Synthetic contact" }, status: "new", message: "Retain the original request", initial_budget: "1 400 000 MAD", campaign_source: qualification.campaignSchema.options[0], rating: "cold" };
  let current = enquiry;
  const render = () => harness.render(() => LeadStatusMenu({ enquiry: current, writable: true, changed: value => { if (value) saved++; } }));
  find(render(), "StatusMenu")[0].props.choose("qualified");
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(saved, 0); assert.equal(find(render(), "Dialog")[0].props.open, true);
  current = { ...enquiry, version: 19, message: "Newer authoritative snapshot" };
  interrupted = false; find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(calls.length, 2); assert.equal(calls[0].key, calls[1].key); assert.equal(calls[1].method, "PATCH");
  assert.equal(calls[1].path, `/api/v1/enquiries/${enquiry.id}`);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1].body)), { expected_version: 17, message: enquiry.message, status: "qualified", initial_budget: enquiry.initial_budget, campaign_source: enquiry.campaign_source, rating: enquiry.rating });
  assert.equal(saved, 1); assert.equal(find(render(), "Dialog")[0].props.open, false);
});

test("Dossier tabs retain visited controls and draft objects; unvisited panels stay lazy", () => {
  const harness = stateHarness();
  const { RecordWorkspace } = loadServer("src/components/shared/record-workspace.tsx", { modules: {
    react: harness.react, "react/jsx-runtime": runtime,
    "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Panel", TabsList: "List", TabsTrigger: "Tab" },
    "@/hooks/use-hydrated": { useHydrated: () => true },
  } });
  const draft = { value: "synthetic unsaved value" };
  const tabs = [{ id: "overview", label: "Aperçu", content: draft }, { id: "activity", label: "Activités", content: "history" }];
  const render = () => harness.render(() => RecordWorkspace({ tabs, label: "Contact", initialTab: "invalid" }));
  let view = render(); assert.equal(find(view, "Panel").length, 1); assert.equal(find(view, "Panel")[0].props.children, draft);
  find(view, "Tabs")[0].props.onValueChange("activity"); view = render();
  assert.equal(find(view, "Panel").length, 2); assert.equal(find(view, "Panel")[0].props.hidden, true); assert.equal(find(view, "Panel")[0].props.children, draft);
  find(view, "Tabs")[0].props.onValueChange("overview"); view = render();
  assert.equal(find(view, "Panel")[0].props.hidden, false); assert.equal(find(view, "Panel")[0].props.children.value, "synthetic unsaved value");
});

test("Controlled dossier links retain the outgoing panel after an external selection", () => {
  const harness = stateHarness();
  const { RecordWorkspace } = loadServer("src/components/shared/record-workspace.tsx", { modules: {
    react: harness.react, "react/jsx-runtime": runtime,
    "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Panel", TabsList: "List", TabsTrigger: "Tab" },
    "@/hooks/use-hydrated": { useHydrated: () => true },
  } });
  const draft = { q: "synthetic unit filter" }, tabs = [{ id: "overview", label: "Aperçu", content: "facts" }, { id: "units", label: "Unités", content: draft }];
  let activeTab = "overview";
  const render = () => harness.render(() => RecordWorkspace({ tabs, activeTab, label: "Programme" }));
  assert.equal(find(render(), "Panel").length, 1);
  activeTab = "units"; render(); activeTab = "overview";
  const units = find(render(), "Panel").find(panel => panel.props.value === "units");
  assert.equal(units.props.hidden, true); assert.equal(units.props.children, draft);
});

test("Programme presentation keeps agent fact/unit editing separate from managed offers, files and legal owners", () => {
  const harness = stateHarness();
  let development = { id: randomUUID(), name: "Synthetic programme", reference: "SYN-P1", version: 1, category: "mixed", location: null, unit_count: 0, available_unit_count: 0, archived_at: null, offerings: [], owners: [], developer: { marketing_display: null, contact: null }, briefing_text: null };
  const { DevelopmentRecord } = loadServer("src/features/inventory/development-record.tsx", { modules: {
    react: harness.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Panel", TabsList: "List", TabsTrigger: "Tab" },
    "@/components/shared/record-header": { RecordHeader: "Header" }, "@/components/shared/record-facts": { RecordFact: "Fact", RecordFacts: "Facts" },
    "@/components/shared/record-workspace": { RecordSection: "Section", RecordWorkspace: "Workspace" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" },
    "@/components/shared/record-actions": { RecordActions: "Actions" }, "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" },
    "@/components/shared/page-header": { PageHeader: "PageHeader" }, "@/components/icons": {},
    "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { useQuery: () => ({ value: development, refreshQuietly() {} }) },
    "@/features/discovery/lifecycle-panel": { LifecyclePanel: "Lifecycle" }, "@/features/files/file-panel": { FilePanel: "Files" },
    "./development-contracts": {}, "./development-editor": { DevelopmentEditor: "Editor" }, "./hierarchy-panel": { HierarchyPanel: "Hierarchy" },
    "./unit-directory": { UnitDirectory: "Units" }, "./owner-editor": { OwnerEditor: "OwnerEditor" }, "./inventory-history": { InventoryHistory: "History" },
    "./use-command": { InventoryBusyContext: { Provider: "Provider" } }, "./contracts": { categoryLabels: {} },
    "./inventory-support": { InventoryPhotoRail: "Photos", InventoryParty: "Party" }, "./inventory-offer-section": { InventoryOfferSection: "Offers" },
  } });
  const render = (role, edit = false) => harness.render(() => DevelopmentRecord({ id: development.id, role, edit }));
  for (const role of ["agent", "manager", "administrator"]) {
    const view = render(role), workspace = find(view, "Workspace")[0];
    assert.equal(render(role, true).type, "Editor");
    assert.equal(workspace.props.tabs[1].content.props.writable, true);
    assert.ok(find(workspace.props.tabs[1].content.props.structureAction, "Hierarchy").every(node => node.props.writable));
    assert.equal(find(workspace.props.tabs[0].content, "Offers")[0].props.writable, role !== "agent");
    assert.equal(find(workspace.props.aside, "Photos")[0].props.writable, role !== "agent");
    const header = find(view, "Header")[0];
    assert.equal(find(header.props.actions, "Files")[0].props.writable, role !== "agent");
    const owners = find(workspace.props.aside, "Section").find(section => section.props.title === "Propriétaires");
    assert.equal(Boolean(owners.props.action), role !== "agent");
    assert.equal(find(header.props.actions, "Lifecycle").length, role === "agent" ? 0 : 1);
  }
  development = { ...development, archived_at: "2026-10-26T00:00:00Z" };
  const archived = render("manager"), workspace = find(archived, "Workspace")[0];
  assert.equal(find(render("agent", true), "Editor").length, 0);
  assert.equal(workspace.props.tabs[1].content.props.writable, false);
  assert.equal(find(workspace.props.tabs[0].content, "Offers")[0].props.writable, false);
  assert.equal(find(find(archived, "Header")[0].props.actions, "Files").length, 0);
});

test("Inventory step buttons navigate directly without submitting and expose the current step accessibly", () => {
  const { InventoryWizardSteps } = loadServer("src/features/inventory/inventory-wizard-steps.tsx", { modules: {
    "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" },
  } });
  const calls = [], steps = [{ label: "Bien et offre", mobileLabel: "Bien" }, { label: "Vérification", mobileLabel: "Résumé" }];
  const view = InventoryWizardSteps({ steps, current: 0, disabled: false, change: value => calls.push(value) });
  const buttons = find(view, "Button");
  for (const button of buttons) { assert.equal(button.props.type, "button"); assert.equal(button.props.disabled, false); button.props.onClick(); }
  assert.deepEqual(calls, [0, 1]); assert.equal(buttons[0].props["aria-current"], "step");
  assert.equal(buttons[1].props["aria-label"], "Étape 2 sur 2 : Vérification");
  assert.ok(find(InventoryWizardSteps({ steps, current: 1, disabled: true, change() {} }), "Button").every(button => button.props.disabled));
});

test("Jumping around the property wizard preserves entered fields and final save still validates skipped sections", async () => {
  const harness = stateHarness(), calls = [];
  const qualification = loadServer("src/features/contacts/qualification-contracts.ts");
  const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": qualification } });
  const contracts = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
  const { PropertyListingWizard } = loadServer("src/features/inventory/property-listing-wizard.tsx", { globals: { requestAnimationFrame: callback => callback() }, modules: {
    react: harness.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "next/navigation": { useRouter: () => ({ push: path => calls.push(path) }) },
    "@/components/icons": {}, "@/components/shared/section-heading": { SectionHeading: "Heading" },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" },
    "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/radio-group": { RadioGroup: "Radio", RadioGroupItem: "RadioItem" }, "@/components/ui/textarea": { Textarea: "Textarea" },
    "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/format": { formatMAD: value => value },
    "./contracts": contracts, "./inventory-draft-summary": { InventoryDraftSummary: "Summary" }, "./inventory-wizard-steps": { InventoryWizardSteps: "Steps" }, "./states": { InventoryError: "Error", Price: "Price" },
    "./level-picker": { LevelPicker: "Picker" }, "./use-command": { useInventoryCommand: () => ({ pending: false, submit: (...args) => calls.push(args) }) },
  } });
  const render = () => harness.render(() => PropertyListingWizard({}));
  find(render(), "Input").find(field => field.props.id === "property-reference").props.onChange({ target: { value: "SYN-DRAFT" } });
  find(render(), "Steps")[0].props.change(3); find(render(), "Steps")[0].props.change(0);
  assert.equal(find(render(), "Input").find(field => field.props.id === "property-reference").props.value, "SYN-DRAFT");
  find(render(), "Steps")[0].props.change(4); find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(calls.length, 0); assert.equal(find(render(), "Steps")[0].props.current, 0);
  assert.ok(find(render(), "p").some(node => node.props.role === "alert"));
});

test("Unsaved guard retains drafts on cancel, blocks pending commands and discards only after confirmation", () => {
  const harness = stateHarness();
  class Element { dataset = {}; focus() {} }
  const dirty = new Element(); dirty.dataset.liveDirty = "true";
  let busy = false, ran = 0;
  const scope = { querySelector: () => busy ? {} : null, querySelectorAll: () => dirty.dataset.liveDirty ? [dirty] : [] };
  const { useUnsavedGuard } = loadServer("src/components/shared/unsaved-guard.tsx", { globals: { document: { ...scope, activeElement: new Element() }, HTMLElement: Element }, modules: {
    react: harness.react, "react/jsx-runtime": runtime, "next/navigation": {},
    "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" },
    "@/components/ui/button": { Button: "Button" }, "@/lib/navigation-intent": {},
  } });
  const render = () => harness.render(useUnsavedGuard);
  render().request(() => ran++, scope); let guard = render();
  assert.equal(ran, 0); assert.equal(guard.dialog.props.open, true);
  guard.dialog.props.onOpenChange(false); assert.equal(render().dialog.props.open, false); assert.equal(dirty.dataset.liveDirty, "true");
  busy = true; render().request(() => ran++, scope); assert.equal(render().dialog.props.open, false); assert.equal(ran, 0);
  busy = false; render().request(() => ran++, scope); guard = render();
  find(guard.dialog, "Button").find(node => node.props.action === "forward").props.onClick();
  assert.equal(ran, 1); assert.equal(dirty.dataset.liveDirty, undefined); assert.equal(render().dialog.props.open, false);
  render().request(() => ran++, scope); assert.equal(ran, 2);
});

test("Deal stage menu delegates stock actions and preserves the reviewed ordinary-transition version", async () => {
  const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
  const conversion = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
  const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
  const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
  const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
  const contracts = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": conversion } });
  const harness = stateHarness(), calls = [];
  const { DealStageMenu } = loadServer("src/features/deals/deal-stage-menu.tsx", { modules: {
    react: harness.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" },
    "@/components/ui/alert-dialog": { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" },
    "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "StatusMenu" }, "@/features/contacts/record-states": { RecordError: "Error" },
    "@/hooks/use-hydrated": { useHydrated: () => true }, "./contracts": contracts, "./reservation-panel": { ReservationPanel: "Reservation" }, "./outcome-panel": { OutcomePanel: "Outcome" },
  } });
  const reviewed = { id: randomUUID(), version: 7, title: "Synthetic deal", stage: "new", offering: {}, active_reservation: null };
  let deal = reviewed, accepted = false;
  const props = { writable: true, busy: false, busyChanged() {}, mutate: async (...args) => { calls.push(args); return accepted; }, saved: async () => {} };
  const render = () => harness.render(() => DealStageMenu({ ...props, deal }));
  find(render(), "StatusMenu")[0].props.choose("reserved"); let view = render();
  assert.equal(calls.length, 0); assert.equal(find(view, "Reservation")[0].props.deal, reviewed); assert.equal(find(view, "Reservation")[0].props.dialogOnly, true);
  find(view, "Reservation")[0].props.closed(); find(render(), "StatusMenu")[0].props.choose("lost"); view = render();
  assert.equal(find(view, "Outcome")[0].props.initialOutcome, "lost"); assert.equal(calls.length, 0);
  find(view, "Outcome")[0].props.closed(); find(render(), "StatusMenu")[0].props.choose("visit");
  find(render(), "Input")[0].props.onChange({ target: { value: "Synthetic transition reason" } });
  deal = { ...reviewed, version: 9 }; find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(calls[0][0], `/api/v1/deals/${deal.id}/transition`); assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { expected_version: 7, stage: "visit", reason: "Synthetic transition reason" });
  assert.equal(find(render(), "Input")[0].props.value, "Synthetic transition reason");
  accepted = true; find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(find(render(), "Dialog")[0].props.open, false);
  deal = { ...deal, stage: "won" }; const groups = find(render(), "StatusMenu")[0].props.groups;
  assert.equal(groups.length, 1); assert.equal(groups[0].items[0].id, "reopen");
  props.writable = false; assert.equal(render().type, "Badge");
});
