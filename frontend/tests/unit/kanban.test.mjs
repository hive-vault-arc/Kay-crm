import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServer } from "./load-server.mjs";
import { loadActionCommand } from "./deal-action-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key });
const runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function harness() {
  const state = []; let cursor = 0;
  return { react: {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial; return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useCallback: callback => callback, useEffect() {}, useId: () => "synthetic-control",
  }, render(fn) { cursor = 0; let value = fn(); while (typeof value?.type === "function") value = value.type(value.props); return value; }, reset() { state.length = 0; cursor = 0; } };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type || typeof type === "function" && type(node) ? [node] : []), ...find(node.props?.children, type)];
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/inventory/contracts": inventory } });
const qualification = loadServer("src/features/deals/qualification-contracts.ts", { modules: { "@/features/contacts/qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/deals/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/contacts/qualification-contracts": vocabulary, "@/features/inventory/contracts": inventory, "@/features/requirements/contracts": requirements, "./qualification-contracts": qualification } });
const policy = loadServer("src/features/deals/deal-stage-policy.ts", { modules: { "./contracts": contracts } });
const dialogs = { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title" };
const buttons = { Button: "Button" };
class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
function deal(overrides = {}) {
  const id = randomUUID(), at = "2026-10-20T12:00:00Z";
  return contracts.dealSchema.parse({ id, version: 7, title: "Synthetic deal", stage: "new", contact: { id: randomUUID(), name: "Synthetic contact", type: "person", primary_agent: { id: randomUUID(), display_name: "Synthetic agent" }, primary_phone: "+212600000000", primary_email: null, version: 1, archived_at: null, country: "MA", nationality: "", languages: ["french"], calling_code: "+212" }, origin_contact_id: randomUUID(), enquiry_id: null, requirement_id: null, offering: null, next_action: "", stock_review_required: false, archived_at: null, primary_agent_at_close_id: null, active_reservation: null, reservation_conflict: null, customer_offer_count: 0, created_by_user_id: randomUUID(), updated_by_user_id: randomUUID(), created_at: at, updated_at: at, initial_budget: "1 400 000 MAD", campaign_source: "unknown", rating: "cold", purchase_reasons: [], client_snapshot: {}, notes: "", payment_method: null, number_of_rooms: null, projects: [], ...overrides });
}
function boardModule(state, query = {}) {
  const queries = [];
  const queryPath = loadServer("src/features/contacts/use-query.ts", { modules: { react: state.react, "@/lib/api/client": {}, "@/features/realtime/query-topics": {}, "@/features/realtime/live-events": {} } }).queryPath;
  const loaded = loadServer("src/components/shared/paged-kanban.tsx", { modules: {
    react: state.react, "react/jsx-runtime": runtime, "@/components/ui/button": buttons, "./crm-presentation": { CrmStatusBadge: "Badge" }, "@/features/contacts/record-states": { RecordError: "Error" },
    "@/features/contacts/use-query": { queryPath, useQuery: path => { queries.push(path); return { ...query, refresh() {} }; } },
  } });
  return { ...loaded, queries };
}

test("Directory preferences are finite, duplicate-safe and never contain record data", () => {
  const { readDirectoryView, directoryViewCookie } = loadServer("src/lib/directory-view.ts");
  for (const kind of ["leads", "deals"]) {
    assert.equal(readDirectoryView(kind, `other=value; kay-${kind}-view=kanban`), "kanban");
    for (const tail of ["KANBAN", "kanban%3B", "table", "", "kanban; kay-" + kind + "-view=kanban"]) assert.equal(readDirectoryView(kind, `kay-${kind}-view=${tail}`), "list");
    assert.equal(directoryViewCookie(kind, "kanban", true), `kay-${kind}-view=kanban; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    assert.equal(directoryViewCookie(kind, "injected; Path=/api", false), `kay-${kind}-view=list; Path=/; Max-Age=31536000; SameSite=Lax`);
  }
});

test("Phone view exposes only List and keeps the saved desktop preference", () => {
  const state = harness(), changes = [], guarded = [];
  const { DirectoryViewSwitch } = loadServer("src/components/shared/directory-view-switch.tsx", { modules: { react: state.react, "react/jsx-runtime": runtime, "@/components/ui/button": buttons, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/directory-view": {}, "./unsaved-guard": { useUnsavedGuard: () => ({ request: callback => guarded.push(callback), dialog: null }) } } });
  const render = phone => state.render(() => DirectoryViewSwitch({ value: "kanban", phone, change: value => changes.push(value) }));
  const phone = find(render(true), "Button"); assert.equal(phone.length, 1); assert.equal(phone[0].props["aria-pressed"], true);
  phone[0].props.onClick(); assert.deepEqual(changes, []); assert.equal(guarded.length, 0);
  const desktop = find(render(false), "Button"); assert.equal(desktop.length, 2); assert.equal(desktop[1].props["aria-pressed"], true);
  desktop[1].props.onClick(); assert.equal(guarded.length, 0);
  desktop[0].props.onClick(); assert.equal(changes.length, 0); guarded[0](); assert.deepEqual(changes, ["list"]);
});

test("Each lane queries the complete scoped filter with its own status and numbered page", () => {
  const state = harness(), loaded = boardModule(state, { value: { items: [], total: 34, page: 2, page_size: 10, has_previous: true, has_next: true } });
  const filters = { q: "Synthetic & filtered", assigned_agent_id: randomUUID(), archive: "all", record_archive: "archived", sort: "name", page: 9, page_size: 100, status: "qualified" };
  const query = new URL(loaded.kanbanLaneQuery("leads", filters, "new", 2), "https://synthetic.invalid").searchParams;
  for (const key of ["q", "assigned_agent_id", "archive", "record_archive", "sort"]) assert.equal(query.get(key), filters[key]);
  assert.equal(query.get("status"), "new"); assert.equal(query.get("page"), "2"); assert.equal(query.get("page_size"), "10");
  let board = state.render(() => loaded.PagedKanban({ kind: "leads", filters, stages: contacts.statusLabels, schema: contacts.enquiriesSchema, card: () => null, movable: () => true, move() {}, denied() {} }));
  const lanes = find(board, node => node.type?.name === "KanbanLane"); assert.equal(lanes.length, 1); assert.equal(lanes[0].props.stage, "qualified");
  const laneState = harness();
  // Render the actual lane with an independent state cursor and actual query function.
  const laneModule = boardModule(laneState, { value: { items: [], total: 34, page: 2, page_size: 10, has_previous: true, has_next: true } });
  board = laneState.render(() => laneModule.PagedKanban({ ...lanes[0].props, stages: { qualified: "Qualifié" }, move() {}, movable: () => true }));
  const lane = find(board, node => node.type?.name === "KanbanLane")[0];
  laneState.reset();
  let view = laneState.render(() => lane.type(lane.props));
  assert.equal(find(view, "span").find(node => node.props.className === "kay-kanban-count").props.children, 34);
  find(view, "Button")[1].props.onClick(); view = laneState.render(() => lane.type(lane.props));
  assert.equal(new URL(laneModule.queries.at(-1), "https://synthetic.invalid").searchParams.get("page"), "2");
  assert.equal(find(view, "nav").length, 1);
});

test("Only an internal editable drag requests confirmation; outside, same-stage and button drags do nothing", () => {
  const state = harness(), { PagedKanban } = boardModule(state), moves = [], row = { id: randomUUID() };
  const render = () => state.render(() => PagedKanban({ kind: "deals", filters: {}, stages: { new: "Nouvelle", visit: "Visite" }, card: () => "Synthetic card", movable: () => true, move: (...args) => moves.push(args), denied() {} }));
  const lanes = () => find(render(), node => node.type?.name === "KanbanLane");
  let prevented = 0; const event = { preventDefault() { prevented++; }, dataTransfer: { setData(type, id) { assert.equal(type, "application/x-kay-record"); assert.equal(id, row.id); } } };
  lanes()[1].props.drop(event); assert.equal(moves.length, 0); assert.equal(prevented, 0);
  let card = lanes()[0].props.card(row); card.props.onPointerDownCapture({ target: { closest: () => ({}) } }); card.props.onDragStart(event); assert.equal(prevented, 1);
  card.props.onPointerDownCapture({ target: { closest: () => null } }); card.props.onDragStart(event);
  lanes()[0].props.drop(event); assert.equal(moves.length, 0);
  lanes()[1].props.drop(event); assert.equal(moves.length, 1); assert.equal(moves[0][0], row); assert.equal(moves[0][1], "visit");
  card = lanes()[0].props.card(row); card.props.onDragEnd();
  assert.match(find(render(), "p").at(-1).props.children, /Vérification/);
  card.props.onDragStart(event); render().props.onKeyDown({ key: "Escape" }); lanes()[1].props.drop(event); assert.equal(moves.length, 1);
});

test("Deal board policy cannot bypass archived state, stock reservation or explicit reopening", () => {
  const value = deal(), choose = policy.dealStageSelection;
  assert.equal(choose(value, "reserved"), undefined); assert.equal(choose(value, "won"), undefined); assert.equal(choose(value, "reopen"), undefined); assert.equal(choose(value, "unknown"), undefined);
  assert.equal(choose({ ...value, archived_at: value.created_at }, "visit"), undefined);
  assert.equal(choose({ ...value, contact: { ...value.contact, archived_at: value.created_at } }, "visit"), undefined);
  const reserved = { ...value, stage: "reserved", active_reservation: { id: randomUUID() } };
  assert.equal(choose(reserved, "visit").id, "reserved"); assert.equal(choose(reserved, "visit").nextStage, "visit");
  for (const stage of ["won", "lost", "cancelled"]) {
    const terminal = { ...value, stage };
    assert.equal(choose(terminal, "visit").id, "reopen"); assert.equal(choose(terminal, "visit").nextStage, "visit");
    assert.equal(choose(terminal, "reserved"), undefined); assert.equal(choose(terminal, "won"), undefined);
  }
});

test("Shared deal command serializes writes and retains the retry key even when the authoritative reload fails", async () => {
  const state = harness(), calls = [], current = deal(); let interrupted = true, release;
  const { useDealCommand } = loadActionCommand(state, { ErrorType: ApiError, read: async () => { if (interrupted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { ...current, version: 9 }; }, command: async (...args) => { calls.push(args); if (release) await release; return { id: current.id, version: 8, customer_offer_id: null, offer_version: null }; } });
  const render = () => state.render(() => useDealCommand(current.id));
  const path = `/api/v1/deals/${current.id}/transition`, body = { expected_version: 7, stage: "visit", reason: "Synthetic reason" };
  assert.equal(await render().mutate(path, body), false); assert.equal(render().error.code, "DEPENDENCY_UNAVAILABLE");
  interrupted = false; assert.equal(await render().mutate(path, body), true); assert.equal(calls.length, 1); assert.equal(calls[0][4], "POST"); assert.equal(render().fresh.id, current.id); assert.equal(render().fresh.version, 9);
  let unlock; release = new Promise(resolve => { unlock = resolve; });
  const pending = render().mutate(path, { ...body, reason: "Changed reviewed reason" });
  assert.equal(await render().mutate(path, body), false); await delay(0); assert.equal(calls.length, 2); assert.notEqual(calls[1][3], calls[0][3]);
  unlock(); await pending; assert.equal(render().busy, false);
});

test("Reopening from a board waits for a second reviewed ordinary transition with the new version", async () => {
  const state = harness(), calls = [], closed = [];
  const { DealStageMenu } = loadServer("src/features/deals/deal-stage-menu.tsx", { modules: { react: state.react, "react/jsx-runtime": runtime, "@/components/ui/button": buttons, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/alert-dialog": dialogs, "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/components/shared/record-status-menu": { RecordStatusMenu: "Menu" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./contracts": contracts, "./deal-stage-policy": policy, "./reservation-panel": { ReservationPanel: "Reservation" }, "./outcome-panel": { OutcomePanel: "Outcome" } } });
  const reviewed = deal({ stage: "lost" }), reopened = { ...reviewed, stage: "new", version: 8 };
  const props = { deal: reviewed, writable: true, busy: false, busyChanged() {}, dialogOnly: true, initialAction: "visit", closed: () => closed.push(true), mutate: async (...args) => { calls.push(args); return true; }, saved: async () => reopened };
  const render = () => state.render(() => DealStageMenu(props));
  const outcome = find(render(), "Outcome")[0]; assert.equal(calls.length, 0); assert.equal(outcome.props.deal.version, 7);
  await outcome.props.saved(); outcome.props.closed(); props.deal = reopened;
  assert.equal(closed.length, 0); assert.equal(calls.length, 0); assert.equal(find(render(), "Dialog")[0].props.open, true);
  find(render(), "Input")[0].props.onChange({ target: { value: "Synthetic next-stage reason" } });
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { expected_version: 8, stage: "visit", reason: "Synthetic next-stage reason" }); assert.equal(closed.length, 1);
});

test("Lead board editors sit outside keyed lane pages and survive a phone resize", () => {
  const state = harness(), row = { ...deal(), status: "new" };
  const { LeadKanban } = loadServer("src/features/contacts/lead-kanban.tsx", { modules: { react: state.react, "react/jsx-runtime": runtime, "next/link": "Link", "@/components/ui/button": buttons, "@/components/ui/alert-dialog": dialogs, "@/components/shared/paged-kanban": { PagedKanban: "Board" }, "@/components/shared/kanban-record-card": { KanbanRecordCard: "Card" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/crm-presentation": { CrmStatusBadge: "Badge" }, "@/features/activities/activity-form": { ActivityForm: "Activity" }, "@/features/deals/convert-lead": { ConvertLead: "Convert" }, "./contracts": contacts, "./qualification-contracts": vocabulary, "./use-query": {}, "./record-states": { RecordError: "Error" }, "./lead-status-menu": { LeadStatusMenu: "Menu" } } });
  let props = { filters: { q: "first" }, changed() {}, denied() {}, returnFocus: { current: null } };
  const render = () => state.render(() => LeadKanban(props));
  const board = find(render(), "Board")[0]; board.props.card(row).props.action.props.onClick();
  props = { ...props, filters: { q: "second" }, active: false };
  let view = render(); assert.equal(find(view, "Board").length, 0); assert.equal(find(view, "Drawer").length, 1);
  const drawer = find(view, "Drawer")[0]; assert.equal(drawer.props.hideTrigger, true); assert.equal(drawer.props.initialOpen, true);
  const editor = drawer.props.children(() => {}, () => {}); assert.equal(editor.props.path, `/api/v1/enquiries/${row.id}/activities`);
  drawer.props.onClosed(); view = render(); assert.equal(find(view, "Drawer").length, 0);
});

test("Both real directory controllers preserve the board owner across responsive/filter changes and remove it on denial", () => {
  for (const kind of ["leads", "deals"]) {
    const state = harness(); let phone = false, mode = "kanban", applied = { q: "Synthetic selection", sort: "-updated_at" };
    const query = { value: { items: [], total: 34, page: 1, page_size: 20 }, refresh() {}, refreshQuietly() {} };
    const columns = { visible: ["name"], change() {}, notice: "" };
    const filters = () => ({ draft: { ...applied, page_size: 20 }, setDraft() {}, filters: applied, page: 1, setPage() {}, invalid: "", apply() {}, reset() {}, activeCount: 1 });
    const common = {
      "@/features/discovery/use-lifecycle-projection": loadServer("src/features/discovery/use-lifecycle-projection.ts", { modules: { react: state.react } }), react: state.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" },
      "@/components/ui/button": buttons, "@/components/ui/input": { Input: "Input" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/skeleton": { Skeleton: "Skeleton" },
      "@/components/shared/filter-results-layout": { FilterResultsLayout: "Layout" }, "@/components/shared/scrollable-results-table": { ScrollableResultsTable: "Scroll" }, "@/components/shared/data-table": { DataTable: "Table" },
      "@/components/shared/crm-presentation": { CrmAgent: "Agent", CrmContactCell: "ContactCell", CrmDirectoryHeader: "Header", CrmDirectoryToolbar: "Toolbar", CrmStatusBadge: "Badge" },
      "@/components/shared/crm-status-filter": { CrmStatusFilter: "Filter" }, "@/components/icons": { SearchIcon: "Search" },
      "@/hooks/use-hydrated": { useHydrated: () => true }, "@/hooks/use-phone-layout": { usePhoneLayout: () => phone },
      "@/lib/format": { formatInstant: value => value }, "@/features/discovery/record-lifecycle-action": { RecordLifecycleAction: "Lifecycle" }, "@/features/discovery/export-action": { ExportAction: "Export" },
      "@/components/shared/directory-record-card": { DirectoryRecordCard: "Card" }, "@/components/shared/directory-view-switch": { DirectoryViewSwitch: "ViewSwitch", useDirectoryView: () => ({ value: mode, change: value => { mode = value; } }) },
    };
    const contactModules = { "./contracts": contacts, "./qualification-contracts": vocabulary, "./qualification-inputs": { countryLabel: value => value }, "./use-query": { queryPath: () => "/api/v1/enquiries", useQuery: () => query }, "./record-states": { RecordError: "Error" }, "./agent-picker": { AgentPicker: "AgentPicker" }, "./column-chooser": { ColumnChooser: "Columns", useLeadColumns: () => columns }, "./numbered-pages": { NumberedPages: "Pages" }, "./use-directory-filters": { useDirectoryFilters: filters }, "./directory-country-filter": { DirectoryCountryFilter: "Country" }, "./lead-kanban": { LeadKanban: "Board" } };
    const dealModules = { "./contracts": contracts, "./columns": { DealColumns: "Columns", useDealColumns: () => columns }, "./deal-kanban": { DealKanban: "Board" }, "@/features/contacts/use-query": { queryPath: () => "/api/v1/deals", useQuery: () => query }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/agent-picker": { AgentPicker: "AgentPicker" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/qualification-contracts": vocabulary, "@/features/contacts/qualification-inputs": { countryLabel: value => value }, "@/features/contacts/use-directory-filters": { useDirectoryFilters: filters }, "@/features/contacts/directory-country-filter": { DirectoryCountryFilter: "Country" } };
    const loaded = loadServer(`src/features/${kind === "leads" ? "contacts/lead-list" : "deals/deal-list"}.tsx`, { modules: { ...common, ...(kind === "leads" ? contactModules : dealModules) } });
    const Component = loaded[kind === "leads" ? "LeadList" : "DealList"], render = () => state.render(() => Component({ role: "agent" }));
    render(); let view = render(), board = find(view, "Board")[0]; assert.equal(board.props.active, true);
    assert.equal(board.props.filters.q, "Synthetic selection"); assert.equal(board.props.filters.record_archive, "active");
    const key = board.key; phone = true; applied = { ...applied, q: "Changed selection" };
    view = render(); board = find(view, "Board")[0]; assert.equal(board.props.active, false); assert.equal(board.key, key); assert.equal(board.props.filters.q, "Changed selection");
    assert.equal(find(view, "Layout")[0].props.leadingControl.type, "ViewSwitch"); assert.equal(mode, "kanban");
    phone = false; view = render(); assert.equal(find(view, "Board")[0].props.active, true);
    query.error = new ApiError("FORBIDDEN", 403); query.value = undefined; view = render();
    assert.equal(find(view, "Board").length, 0); assert.equal(find(view, "Table").length, 0);
  }
});

test("Kanban presentation escapes record strings and preserves the real phone, agent, budget and project", () => {
  const icon = () => createElement("svg", { "aria-hidden": true });
  const { KanbanRecordCard } = loadServer("src/components/shared/kanban-record-card.tsx", { modules: { "react/jsx-runtime": jsxRuntime, "next/link": { default: "a" }, "@/components/icons": { ContactIcon: icon, PhoneIcon: icon, PropertyIcon: icon, GripIcon: icon } } });
  const html = renderToStaticMarkup(createElement(KanbanRecordCard, { title: "Synthetic <contact>", href: "/deals/synthetic", phone: "+212600000000", agent: "Synthetic agent", budget: "1 400 000 MAD", projects: "Synthetic programme", movable: true }));
  assert.match(html, /Synthetic &lt;contact&gt;/); assert.match(html, /href="tel:\+212600000000"/);
  for (const value of ["Synthetic agent", "1 400 000 MAD", "Synthetic programme"]) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /<contact>/);
});
