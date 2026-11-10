import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadServer } from "./load-server.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
function harness() {
  let cursor = 0; const state = [], effects = [];
  return { effects, react: {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial; return [state[index], value => { state[index] = typeof value === "function" ? value(state[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useId: () => "synthetic-time", useCallback: callback => callback, useEffect: effect => effects.push(effect),
  }, render(callback) { cursor = 0; return callback(); }, reset() { state.length = 0; effects.length = 0; cursor = 0; } };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  return [...(node.type === type || typeof type === "function" && type(node) ? [node] : []), ...find(node.props?.children, type)];
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
const contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const contracts = loadServer("src/features/schedule/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const model = loadServer("src/features/schedule/calendar-model.ts");
const time = loadServer("src/features/schedule/time.ts", { modules: { "@/lib/api/client": {}, "@/features/contacts/use-query": {} } });
const dialogs = { AlertDialog: "Dialog", AlertDialogCancel: "Cancel", AlertDialogContent: "Content", AlertDialogDescription: "Description", AlertDialogTitle: "Title", AlertDialogTrigger: "Trigger" };
class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
const visit = (overrides = {}) => ({ id: randomUUID(), version: 8, title: "Synthetic <visit>", contact_name: "Synthetic contact", type: "office", status: "confirmed", contact_archived: false, start_local: "2026-10-19T10:00:00+01:00", end_local: "2026-10-19T11:00:00+01:00", review_code: null, ...overrides });

function calendarModule(state, phone, query) {
  return loadServer("src/features/schedule/visit-calendar.tsx", { modules: {
    react: state.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" },
    "@/components/shared/page-header": { PageHeader: "Header" }, "@/components/ui/skeleton": { Skeleton: "Skeleton" },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/native-select": { NativeSelect: "Select" },
    "@/components/ui/tabs": { Tabs: "Tabs", TabsContent: "Panel", TabsList: "TabList", TabsTrigger: "Tab" }, "@/components/ui/sheet": { Sheet: "Sheet", SheetContent: "SheetContent", SheetHeader: "SheetHeader", SheetTitle: "SheetTitle", SheetDescription: "SheetDescription", SheetTrigger: "SheetTrigger" },
    "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/record-states": { RecordError: "Error" },
    "@/features/contacts/use-query": { useQuery: query, queryPath: (kind, params) => `/api/v1/${kind}?${new URLSearchParams(params)}` }, "@/hooks/use-phone-layout": { usePhoneLayout: phone }, "@/lib/api/client": { ApiError },
    "./contracts": contracts, "./time": { ...time, resolveLocal: async local => ({ choices: [{ instant: local + ":00Z" }] }) }, "./calendar-model": model,
    "./week-grid": { VisitWeekGrid: "WeekGrid", BusyWeekGrid: "BusyGrid" }, "./calendar-sidebar": { CalendarSidebar: "Filters" }, "./calendar-visit": { CalendarVisit: "Visit" }, "./calendar-frame": { CalendarFrame: "Frame" }, "./visit-record": { VisitAction: "Action" },
  } });
}

test("Calendar day creation context admits real dates, bounded IDs and no unknown/duplicate values", () => {
  for (const date of ["2000-01-01", "2028-02-29", "2100-12-31"]) assert.equal(contracts.visitCreateContextSchema.safeParse({ date, contact_id: randomUUID() }).success, true);
  for (const date of ["1999-12-31", "2101-01-01", "2026-02-29", "2026-10-33", ["2026-10-20", "2026-10-21"]]) assert.equal(contracts.visitCreateContextSchema.safeParse({ date }).success, false);
  assert.equal(contracts.visitCreateContextSchema.safeParse({ date: "2026-10-20", user_id: randomUUID() }).success, false);
  assert.equal(contracts.visitCreateContextSchema.safeParse({ contact_id: "synthetic-not-an-id" }).success, false);
});

test("Selected week cards retain every overlapping/multi-day visit and exclude the exact midnight end", () => {
  const icon = () => createElement("svg", { "aria-hidden": true }), calls = [];
  const cards = loadServer("src/features/schedule/calendar-visit.tsx", { modules: { "react/jsx-runtime": jsxRuntime, "next/link": { default: "a" }, "@/components/icons": { CarIcon: icon, ContactsIcon: icon, DevelopmentIcon: icon, CompletedIcon: icon, ClockIcon: icon, CloseIcon: icon }, "@/components/ui/button": { Button: "button" }, "@/components/shared/crm-presentation": { CrmStatusBadge: ({ state, children }) => createElement("span", { "data-crm-state": state }, children) }, "./contracts": contracts, "./time": time, "./visit-record": { VisitAction: () => null } } });
  const loaded = loadServer("src/features/schedule/week-grid.tsx", { modules: { "react/jsx-runtime": jsxRuntime, "next/link": { default: "a" }, "@/components/icons": { AddIcon: icon }, "./calendar-model": model, "./time": time, "./calendar-visit": { CalendarVisit: props => { calls.push(props); return createElement(cards.CalendarVisit, props); } } } });
  const overnight = visit({ start_local: "2026-10-19T23:30:00+01:00", end_local: "2026-10-21T00:00:00+01:00" }), overlap = visit();
  const days = Array.from({ length: 7 }, (_, index) => model.calendarDay("2026-10-19", index));
  const html = renderToStaticMarkup(createElement(loaded.VisitWeekGrid, { days, visits: [overnight, overlap], today: days[0] }));
  assert.equal(calls.filter(value => value.visit.id === overnight.id).length, 2);
  assert.equal(calls.find(value => value.day === "2026-10-20").tile, true);
  assert.equal((html.match(/class="kay-calendar-day"/g) ?? []).length, 7);
  assert.match(html, /\/visits\/new\?date=2026-10-19/); assert.match(html, /Synthetic &lt;visit&gt;/); assert.match(html, /Suite/);
  assert.match(html, /UTC\+01:00/); assert.doesNotMatch(html, /class="calendar-hour/);
  calls.length = 0;
  const busy = renderToStaticMarkup(createElement(loaded.BusyWeekGrid, { days, intervals: [{ start_at: overnight.start_local, end_at: overnight.end_local, busy: true }] }));
  assert.equal(calls.length, 0); assert.equal((busy.match(/<strong>Occupé<\/strong>/g) ?? []).length, 2);
  assert.doesNotMatch(busy, /Synthetic contact|\/visits\/new|href=/);
});

test("Calendar keeps desktop presentation and explicit filters across week/mode/phone changes while the cancellation draft stays owned", () => {
  const state = harness(); let phone = false;
  const loaded = calendarModule(state, () => phone, () => ({ value: undefined, refresh() {} }));
  const props = { initial: "2026-10-19", actorId: randomUUID(), administrator: false }, render = () => state.render(() => loaded.Calendar(props));
  const toolbar = view => find(view, "Header")[0].props.actions;
  const tabs = view => find(view, "Header")[0].props.navigation;
  let view = render(); assert.equal(view.props.value, "week");
  const filters = find(toolbar(view), "Filters")[0]; assert.equal(filters.props.compact, true); filters.props.toggleType("office");
  const selected = visit(); find(render(), node => node.type?.name === "Week")[0].props.cancel(selected);
  phone = true; view = render(); assert.equal(view.props.value, "agenda"); assert.equal(find(tabs(view), "Tab").some(node => node.props.value === "week"), false);
  assert.equal(find(view, "Action")[0].props.value, selected);
  find(view, "Input")[0].props.onChange({ target: { value: "2026-10-26" } }); view = render();
  assert.equal(find(toolbar(view), "Filters")[0].props.types.includes("office"), false); assert.equal(find(view, "Action")[0].props.value, selected);
  find(toolbar(view), "Select")[0].props.onChange({ target: { value: "busy" } }); view = render(); assert.equal(view.props.value, "agenda"); assert.equal(find(toolbar(view), "Filters").length, 0);
  phone = false; view = render(); assert.equal(view.props.value, "week");
  find(view, "Action")[0].props.denied(new ApiError("FORBIDDEN", 403)); view = render(); const failure = find(view, "Error")[0]; assert.equal(failure.props.error.status, 403);
  failure.props.retry(); view = render(); assert.equal(find(view, "Action").length, 0); assert.equal(view.props.value, "week");
});

test("Drawer filters retain authoritative whole-range facets and every zero-count status", () => {
  const state = harness(), icon = () => createElement("svg", { "aria-hidden": true });
  const { CalendarSidebar } = loadServer("src/features/schedule/calendar-sidebar.tsx", { modules: {
    react: state.react, "react/jsx-runtime": jsxRuntime, "@/components/ui/button": { Button: "button" }, "@/components/ui/checkbox": { Checkbox: ({ checked, onCheckedChange, ...props }) => createElement("input", { ...props, type: "checkbox", checked, onChange: onCheckedChange }) },
    "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" }, "@/components/icons": { ClockIcon: icon, CompletedIcon: icon, CloseIcon: icon }, "./calendar-model": model, "./contracts": contracts, "./calendar-visit": { visitIcons: { office: icon, company_car: icon, without_company_car: icon } },
  } });
  const value = { items: [], total: 34, type_counts: { office: 17, company_car: 24, without_company_car: 5 }, status_counts: { confirmed: 24, scheduled: 10, draft: 0, completed: 12, not_completed: 0, cancelled: 0 }, unfiltered_total: 46 };
  const html = renderToStaticMarkup(createElement(CalendarSidebar, { compact: true, date: "2026-10-19", today: "2026-10-19", choose() {}, value, types: [], statuses: ["cancelled"], toggleType() {}, toggleStatus() {} }));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 9);
  for (const count of [17, 24, 5, 10, 12, 0]) assert.ok(html.includes(`>${count}</span>`));
  assert.match(html, /aria-label="Annulée"[^>]*checked=""/);
  assert.doesNotMatch(html, /Pause déjeuner|calendar-month-choice/);
});

test("Free/busy presentation reads only its original safe interval endpoint without private type/status filters", async () => {
  const state = harness(), paths = [];
  const loaded = calendarModule(state, () => false, path => { paths.push(path); return { value: { items: [], total: 0, page: 1, page_size: 50, has_previous: false, has_next: false }, refresh() {} }; });
  const root = state.render(() => loaded.Calendar({ initial: "2026-10-19", actorId: randomUUID(), administrator: false }));
  const week = find(root, node => node.type?.name === "Week")[0]; state.reset();
  const props = { ...week.props, busy: true }; state.render(() => week.type(props)); state.effects[0](); await delay(0);
  const busy = state.render(() => week.type(props)); assert.equal(busy.type.name, "BusyWeek"); state.reset();
  const rendered = state.render(() => busy.type(busy.props));
  const path = new URL(paths.at(-1), "https://synthetic.invalid"); assert.equal(path.pathname, "/api/v1/calendar/free-busy");
  assert.equal(path.searchParams.has("types"), false); assert.equal(path.searchParams.has("statuses"), false); assert.equal(path.searchParams.get("page_size"), "50");
  assert.equal(find(rendered, "BusyGrid").length, 1); assert.equal(find(rendered, "Visit").length, 0);
});

test("Split local-time inputs keep a preselected date without inventing a time and defer repeated-time choice to the server", () => {
  let local = "2026-10-20T", chosen = "", response;
  const state = harness(); state.react.useEffect = callback => callback();
  const { LocalTimeField } = loadServer("src/features/schedule/local-time-field.tsx", { modules: { react: state.react, "react/jsx-runtime": runtime, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { useQuery: () => ({ value: response, refresh() {} }), queryPath: () => "/api/v1/calendar/local-time" }, "./contracts": contracts, "./time": time } });
  const render = () => LocalTimeField({ split: true, label: "Début", local, instant: chosen, changeLocal: value => { local = value; }, choose: value => { chosen = value; } });
  let view = render(), inputs = find(view, "Input"); assert.equal(inputs[0].props.value, "2026-10-20"); assert.equal(inputs[1].props.value, ""); assert.equal(find(view, node => node.type?.name === "Resolved").length, 0);
  inputs[1].props.onChange({ target: { value: "02:30" } }); view = render(); assert.equal(local, "2026-10-20T02:30");
  const resolved = find(view, node => node.type?.name === "Resolved")[0];
  response = { choices: [{ instant: "2026-10-20T01:30:00Z", local: "2026-10-20T02:30:00+01:00" }, { instant: "2026-10-20T02:30:00Z", local: "2026-10-20T02:30:00Z" }] };
  let choice = resolved.type(resolved.props); assert.equal(chosen, "");
  find(choice, "Select")[0].props.onChange({ target: { value: response.choices[1].instant } }); assert.equal(chosen, response.choices[1].instant);
  response = { choices: [] }; choice = resolved.type(resolved.props); assert.equal(find(choice, "Select").length, 0); assert.match(choice.props.children, /n’existe pas/);
  chosen = "previous"; find(render(), "Input")[0].props.onChange({ target: { value: "2026-10-21" } }); assert.equal(chosen, ""); assert.equal(local, "2026-10-21T02:30");
});

test("Root-owned visit cancellation retains reviewed version, reason and retry key after interruption and blocks duplicate submit", async () => {
  const state = harness(), calls = [], closed = [], denied = []; let fail = true, unlock;
  let pending = Promise.resolve();
  const { VisitAction } = loadServer("src/features/schedule/visit-record.tsx", { globals: { crypto: { randomUUID } }, modules: { react: state.react, "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/alert-dialog": dialogs, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": {}, "@/features/realtime/current-record": {}, "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); await pending; if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }, "./contracts": contracts, "./visit-form": { VisitForm: "Form" }, "./time": time, "@/components/shared/unsaved-guard": {}, "@/components/shared/crm-presentation": {}, "@/components/shared/record-actions": {}, "@/components/shared/record-entry": {}, "@/features/contacts/numbered-pages": {}, "./visit-route-drawer": {} } });
  let value = visit(); const props = { action: "cancel", dialogOnly: true, saved() {}, closed: () => closed.push(true), denied: error => denied.push(error) }, render = () => state.render(() => VisitAction({ ...props, value }));
  assert.equal(find(render(), "Trigger").length, 0);
  find(render(), "Textarea")[0].props.onChange({ target: { value: "Synthetic cancellation reason" } });
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(closed.length, 0); assert.equal(find(render(), "Textarea")[0].props.value, "Synthetic cancellation reason");
  value = { ...value, version: 11 };
  fail = false; pending = new Promise(resolve => { unlock = resolve; });
  find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); find(render(), "form")[0].props.onSubmit({ preventDefault() {} });
  assert.equal(calls.length, 2); assert.equal(calls[0][3], calls[1][3]); assert.equal(calls[1][1].expected_version, 8);
  unlock(); await delay(0); assert.equal(closed.length, 1); assert.equal(denied.length, 0);
});

test("The real booking form keeps date-only context clean, tracks controlled edits and refuses unresolved times", async () => {
  const state = harness(), commands = [], formState = { isSubmitting: false, isDirty: false };
  const { VisitForm } = loadServer("src/features/schedule/visit-form.tsx", { globals: { crypto: { randomUUID } }, modules: {
    react: state.react, "react/jsx-runtime": runtime, "react-hook-form": { useWatch: () => ({ title: "Synthetic booking", location: "Synthetic location", overlap_reason: "" }), useForm: () => ({ formState, control: {}, setFocus() {}, handleSubmit: callback => () => callback({ title: "Synthetic booking", location: "Synthetic location", overlap_reason: "" }) }) }, "@hookform/resolvers/zod": { zodResolver: () => ({}) },
    "@/components/shared/page-header": { PageHeader: "Header" }, "@/components/ui/skeleton": { Skeleton: "Skeleton" },
    "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/checkbox": { Checkbox: "Checkbox" },
    "@/components/ui/form": { Form: "Form", FormControl: "Control", FormField: "Field", FormItem: "Item", FormLabel: "FieldLabel", FormMessage: "Message" },
    "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ request() {}, dialog: null }) }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/use-query": { useQuery: () => ({ value: undefined, refresh() {} }), queryPath: () => "/api/v1/calendar/availability" },
    "@/hooks/use-hydrated": { useHydrated: () => true }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async (...args) => commands.push(args) },
    "@/components/shared/dossier-form": loadServer("src/components/shared/dossier-form.tsx", { modules: { react: state.react, "react/jsx-runtime": runtime, "./record-header": {} } }), "./visit-slot-preview": { VisitSlotPreview: "Preview" }, "@/features/work/work-property-select": { WorkPropertySelect: "Property" },
    "./contracts": contracts, "./local-time-field": { LocalTimeField: "LocalTime" }, "./time": time, "@/features/work/work-context-select": { WorkContextSelect: "Context" },
  } });
  const props = { actorId: randomUUID(), contactId: randomUUID(), contactName: "Synthetic contact", initialDate: "2026-10-20", saved() {} }, render = () => state.render(() => VisitForm(props));
  let view = render(); assert.equal(find(view, "form")[0].props["data-live-dirty"], undefined); assert.equal(find(view, "form")[0].props["aria-busy"], false);
  const times = find(view, "LocalTime"); assert.equal(times.length, 2); assert.equal(times[0].props.local, "2026-10-20T"); assert.equal(times[1].props.local, "2026-10-20T"); assert.equal(times[0].props.instant, "");
  find(view, "Context")[0].props.change({ enquiry_id: randomUUID(), deal_id: null }); view = render();
  assert.equal(find(view, "form")[0].props["data-live-dirty"], "true");
  find(view, "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0);
  assert.equal(commands.length, 0); assert.equal(find(render(), "Error")[0].props.error.code, "VALIDATION_ERROR");
  formState.isSubmitting = true; assert.equal(find(render(), "form")[0].props["aria-busy"], true);
});

test("Contact selection passes the calendar date through to the original authorized booking form", () => {
  const state = harness(), requested = [];
  const { VisitCreate } = loadServer("src/features/schedule/visit-create.tsx", { modules: {
    react: state.react, "react/jsx-runtime": runtime, "next/navigation": { useRouter: () => ({ replace: value => requested.push(value) }) }, "@/components/ui/button": { Button: "Button" }, "@/features/contacts/contact-selector": { ContactSelector: "ContactSelector" }, "@/components/icons": { ContactsIcon: "ContactsIcon" }, "@/components/shared/section-heading": { SectionHeading: "Heading" }, "@/features/contacts/contracts": contacts, "@/features/contacts/use-query": {}, "@/features/contacts/record-states": { RecordError: "Error" }, "./visit-form": { VisitForm: "Booking" }, "./visit-route-drawer": { VisitRouteDrawer: "Drawer" }, "@/components/shared/unsaved-guard": { useUnsavedGuard: () => ({ dialog: null, request: callback => callback() }) },
  } });
  const props = { actorId: randomUUID(), date: "2026-10-20" }, render = () => state.render(() => VisitCreate(props));
  find(render().props.children(() => {}), "ContactSelector")[0].props.choose({ id: randomUUID(), name: "Synthetic contact", archived_at: null });
  const selected = render().props.children(() => {}), body = selected.type(selected.props), booking = find(body, "Booking")[0];
  assert.equal(booking.props.initialDate, props.date); booking.props.saved("synthetic-id"); assert.deepEqual(requested, ["/visits/synthetic-id"]);
});
