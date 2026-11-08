import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const tick = () => new Promise(resolve => setImmediate(resolve));
const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" }, plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...["children", "actions", "action", "related", "status"].flatMap(key => find(node.props?.[key], type))]; }
function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
function button(view, label) { const result = find(view, "Button").find(node => text(node).replace(/\s+/g, " ").trim() === label || node.props["aria-label"] === label); assert.ok(result, label); return result; }
class ApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
function harness() {
  const slots = [], effects = []; let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId() { const i = cursor++; return slots[i] ??= `notification-${i}`; },
    useCallback(fn, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, value: fn }; return slots[i].value; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(effect => effect()); return result; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts"), contacts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
const schedule = loadServer("src/features/schedule/contracts.ts", { modules: { "@/features/contacts/contracts": contacts } });
const work = loadServer("src/features/work/contracts.ts", { modules: { "@/features/contacts/contracts": contacts, "@/features/schedule/contracts": schedule } });
const item = (extra = {}) => work.notificationSchema.parse({ id: randomUUID(), kind: "task.due", title: "Synthetic task reminder", context: "Synthetic permitted context", href: `/contacts/${randomUUID()}?task=${randomUUID()}`, due_local: "2026-10-28T11:00:00+01:00", created_at: "2026-10-28T09:00:00Z", read_at: null, ...extra });
const page = (items, extra = {}) => work.notificationsSchema.parse({ items, page: 1, page_size: 10, total: items.length, unread_total: items.filter(row => !row.read_at).length, has_previous: false, has_next: false, ...extra });
const ui = { "react/jsx-runtime": runtime, "next/link": { default: "Link" }, "@/components/icons": { NotificationIcon: "Icon", CalendarIcon: "Calendar", TaskIcon: "Task", CompletedIcon: "Completed", FileIcon: "File" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/badge": { Badge: "Badge" }, "@/components/ui/popover": { Popover: "Popover", PopoverContent: "PopoverContent", PopoverTrigger: "Trigger" }, "@/components/shared/record-drawer": { RecordDrawer: "Drawer" }, "@/components/shared/record-entry": { RecordEntry: "Entry" }, "@/components/shared/crm-presentation": { CrmStatusBadge: "Status" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/realtime/notification-bell": { LiveNotificationIcon: "Bell" }, "@/features/realtime/push-control": { PushControl: "Push" }, "@/lib/format": { formatInstant: value => value }, "@/features/schedule/time": { localLabel: value => value }, "./notification-panel": { NotificationPanel: "Panel" }, "./notification-controls": { NotificationFilters: "Filters", NotificationProblem: "Problem" } };
function setup({ size = 10, state = "all", hydrated = true, command, rows } = {}) {
  const h = harness(), first = item(), second = item({ kind: "visit.follow_up", href: `/visits/${randomUUID()}` }), query = { value: page(rows ?? [first, second], { page_size: size }), refresh() { query.value = undefined; delete query.error; refreshes++; } }, calls = [], paths = [], events = [];
  let refreshes = 0;
  const modules = { ...ui, react: h.react, "./contracts": work, "@/features/contacts/use-query": { queryPath: (kind, values) => `/api/v1/${kind}?${new URLSearchParams(values)}`, useQuery: path => { paths.push(path); return query; } }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError }, "@/lib/api/command": { apiCommand: async (...args) => { calls.push(args); return args[2].parse(command ? await command(...args) : { read: true }); } } };
  const feed = loadServer("src/features/work/notification-feed.ts", { modules, globals: { AbortController, crypto: { randomUUID }, CustomEvent, window: { dispatchEvent: event => events.push({ type: event.type, detail: event.detail }) } } });
  const render = () => h.render(() => feed.useNotificationFeed(size, state)); render();
  return { h, first, second, query, calls, paths, events, modules, feed, render, get refreshes() { return refreshes; } };
}
function fakeFeed(extra = {}) { return { state: "all", page: 1, size: 10, value: page([]), hydrated: true, uncertain: false, filter() {}, changePage() {}, refresh() {}, markRead: async () => true, retry: async () => true, locked: () => false, ...extra }; }
function inbox(h, feed, extra = {}) { return loadServer("src/features/work/notification-inbox.tsx", { modules: { ...ui, react: h.react, "next/navigation": { usePathname: () => "/dashboard" }, "@/hooks/use-hydrated": { useHydrated: () => true }, "./notification-feed": { useNotificationFeed: () => feed }, ...extra }, globals: { queueMicrotask } }); }

test("notification pages validate exact server page/size, unique IDs and requested read state before display", () => {
  const s = setup(), valid = page([s.first]); assert.equal(s.feed.notificationPageValid(valid, 1, 10, "all"), true);
  for (const value of [page([s.first], { page: 2 }), page([s.first], { page_size: 20 }), page([s.first, s.first]), page([s.first], { total: 0 })]) assert.equal(s.feed.notificationPageValid(value, 1, 10, "all"), false);
  assert.equal(s.feed.notificationPageValid(valid, 1, 10, "read"), false); assert.equal(s.feed.notificationPageValid(valid, 1, 10, "unread"), true);
  assert.equal(s.feed.notificationPageValid(page([item({ read_at: "2026-10-28T10:00:00Z" })]), 1, 10, "unread"), false);
  assert.equal(s.feed.notificationPageValid(page([], { page: 2, total: 1, has_previous: true }), 2, 10, "all"), true);
});

test("read-state write is synchronously locked, exact and limited to currently displayed unread notifications", async () => {
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) });
  assert.equal(await s.render().markRead(randomUUID()), false); assert.equal(s.calls.length, 0);
  const pending = s.render().markRead(s.first.id); await s.render().markRead(s.first.id); await s.render().markRead(s.second.id); assert.equal(s.calls.length, 1); assert.equal(s.render().busy, s.first.id);
  assert.equal(s.calls[0][0], `/api/v1/notifications/${s.first.id}/read`); assert.deepEqual(plain(s.calls[0][1]), {}); assert.equal(s.calls[0][4], "POST"); assert.ok(s.calls[0][6] instanceof AbortSignal);
  release({ read: true }); assert.equal(await pending, true); assert.equal(s.refreshes, 1); assert.deepEqual(plain(s.events), [{ type: "kay:live-invalidate", detail: ["notifications"] }]); assert.equal(s.render().busy, undefined);
});

test("unknown read acknowledgement pins the same recipient item/body/key and cannot be replaced by another read/filter/page", async () => {
  let fail = true; const s = setup({ command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return { read: true }; } });
  await s.render().markRead(s.first.id); const m = s.render(); assert.equal(m.uncertain, true); assert.equal(m.value.items[0].id, s.first.id); assert.equal(s.events.length, 0);
  await m.markRead(s.second.id); m.filter("read"); m.changePage(2); m.refresh(); assert.equal(s.calls.length, 1); assert.equal(s.render().state, "all"); assert.equal(s.render().page, 1); assert.equal(s.refreshes, 0);
  fail = false; assert.equal(await m.retry(), true); assert.equal(s.calls[1][0], s.calls[0][0]); assert.equal(s.calls[1][3], s.calls[0][3]); assert.deepEqual(plain(s.calls[1][1]), {}); assert.equal(s.events.length, 1); assert.equal(s.render().uncertain, false);
});

test("malformed read acknowledgement retains recovery rather than inventing success or unread time", async () => {
  const s = setup({ command: async () => ({ read: false }) }); assert.equal(await s.render().markRead(s.first.id), false); assert.equal(s.render().uncertain, true); assert.equal(s.events.length, 0); assert.equal(s.refreshes, 0); assert.equal(s.query.value.items[0].read_at, null);
});

test("read denial masks every previous entry/count and refresh requires a fresh query without resurrecting an attempt", async () => {
  for (const status of [401, 403, 404]) {
    const s = setup({ command: async () => { throw new ApiError("FORBIDDEN", status); } }); await s.render().markRead(s.first.id); let feed = s.render(); assert.equal(feed.value, undefined); assert.equal(feed.authority.status, status); assert.equal(feed.uncertain, false);
    await feed.markRead(s.second.id); assert.equal(s.calls.length, 1); feed.refresh(); feed = s.render(); assert.equal(feed.value, undefined); assert.equal(feed.authority, undefined); assert.equal(s.refreshes, 1); await feed.retry(); assert.equal(s.calls.length, 1);
    s.query.value = page([s.second]); assert.equal(s.render().value.items[0].id, s.second.id);
  }
});

test("current query denial aborts an in-flight mark and also releases an older uncertain operation for fresh authority retry", async () => {
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().markRead(s.first.id);
  s.query.error = new ApiError("FORBIDDEN", 403); assert.equal(s.render().value, undefined); assert.equal(s.calls[0][6].aborted, true); release({ read: true }); assert.equal(await pending, false); assert.equal(s.events.length, 0); s.render().refresh(); assert.equal(s.refreshes, 1);
  const other = setup({ command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); await other.render().markRead(other.first.id); assert.equal(other.render().uncertain, true); other.query.error = new ApiError("FORBIDDEN", 403); let feed = other.render(); assert.equal(feed.uncertain, false); feed.refresh(); feed = other.render(); assert.equal(feed.authority, undefined); assert.equal(feed.uncertain, false); assert.equal(other.refreshes, 1);
});

test("hydration, already-read items and unmount prevent writes and late completion/invalidation", async () => {
  const cold = setup({ hydrated: false }); await cold.render().markRead(cold.first.id); cold.render().filter("read"); cold.render().changePage(2); cold.render().refresh(); assert.equal(cold.calls.length, 0); assert.equal(cold.refreshes, 0); assert.equal(cold.render().state, "all");
  const done = item({ read_at: "2026-10-28T10:00:00Z" }), read = setup({ rows: [done] }); await read.render().markRead(done.id); assert.equal(read.calls.length, 0);
  let release; const s = setup({ command: () => new Promise(resolve => { release = resolve; }) }), pending = s.render().markRead(s.first.id); s.h.unmount(); assert.equal(s.calls[0][6].aborted, true); release({ read: true }); assert.equal(await pending, false); assert.equal(s.events.length, 0); assert.equal(s.refreshes, 0); await s.render().markRead(s.first.id); assert.equal(s.calls.length, 1);
});

test("filter/page transitions issue bounded server queries and never derive totals from a local page", () => {
  const s = setup({ size: 20 }); assert.equal(s.paths.at(-1), "/api/v1/notifications?state=all&page=1&page_size=20");
  s.render().changePage(2); s.render(); assert.equal(s.paths.at(-1), "/api/v1/notifications?state=all&page=2&page_size=20"); assert.equal(s.render().value, undefined);
  s.render().filter("read"); s.query.value = page([item({ read_at: "2026-10-28T10:00:00Z" })], { page_size: 20, total: 45, unread_total: 100, has_next: true }); assert.equal(s.render().value.total, 45); assert.equal(s.paths.at(-1), "/api/v1/notifications?state=read&page=1&page_size=20");
  s.render().filter("foreign"); s.render().changePage(-1); s.render().changePage(1.5); assert.equal(s.render().state, "read"); assert.equal(s.render().page, 1);
});

test("compact preview renders only the bounded feed, one native destination link and a named read action per entry", async () => {
  const h = harness(), row = item(), clicked = [], all = [], feed = fakeFeed({ value: page([row], { total: 27, has_next: true }), markRead: async id => { clicked.push(id); return false; } }), loaded = inbox(h, feed), props = { heading: { current: null }, close() {}, navigate() {}, all: state => all.push(state) }, view = h.render(() => loaded.NotificationPreview(props));
  assert.equal(find(view, "Link").length, 1); assert.equal(find(view, "Link")[0].props.href, row.href); assert.equal(find(view, "Pages").length, 0); assert.equal(find(view, "Push").length, 0); assert.equal(find(view, "Entry").length, 0);
  button(view, `Marquer comme lue · ${row.title}`).props.onClick(); await tick(); assert.deepEqual(clicked, [row.id]); button(view, "Tout voir · 27").props.onClick(); assert.deepEqual(all, ["all"]); assert.ok(text(view).includes(row.context));
});

test("empty preview preserves the complete inbox entry and a read entry never offers a second read action", () => {
  const h = harness(), feed = fakeFeed(), loaded = inbox(h, feed), props = { heading: { current: null }, close() {}, navigate() {}, all() {} }, render = () => h.render(() => loaded.NotificationPreview(props));
  let view = render(); assert.ok(text(view).includes("Aucune notification pour le moment.")); assert.ok(button(view, "Tout voir"));
  feed.value = page([item({ read_at: "2026-10-28T10:00:00Z" })]); view = render(); assert.equal(find(view, "Button").filter(node => node.props.action === "read").length, 0); assert.ok(text(view).includes("Lue"));
  feed.value = undefined; feed.problem = new ApiError("FORBIDDEN", 403); view = render(); assert.equal(find(view, "Link").length, 0); assert.equal(find(view, "Badge").length, 0); assert.equal(find(view, "Button").filter(node => node.props.action === "forward").length, 0);
});

test("preview actions cannot switch to the full inbox during read/recovery and preserve the active filter when allowed", () => {
  const h = harness(), calls = [], feed = fakeFeed({ state: "unread", value: page([]), uncertain: true }), loaded = inbox(h, feed), render = () => h.render(() => loaded.NotificationPreview({ heading: { current: null }, close() {}, navigate() {}, all: state => calls.push(state) })); let view = render(); button(view, "Tout voir").props.onClick(); assert.deepEqual(calls, []);
  feed.uncertain = false; view = render(); button(view, "Tout voir").props.onClick(); assert.deepEqual(calls, ["unread"]);
});

test("inbox root uses one compact popover and only opens the shared full drawer through Tout voir", () => {
  const h = harness(), loaded = inbox(h, fakeFeed()), render = () => h.render(() => loaded.NotificationInbox()); let view = render(); assert.equal(find(view, "Popover")[0].props.open, false); assert.equal(find(view, "Drawer").length, 0);
  find(view, "Popover")[0].props.onOpenChange(true); view = render(); assert.equal(find(view, "Popover")[0].props.open, true); const preview = find(view, loaded.NotificationPreview)[0]; assert.ok(preview); assert.equal(find(view, "PopoverContent")[0].props.collisionPadding, 12);
  button(view, "Ouvrir les notifications").props.ref.current = { isConnected: true, focus() {} }; preview.props.all("unread"); view = render(); assert.equal(find(view, "Popover")[0].props.open, false); assert.equal(find(view, loaded.NotificationPreview).length, 0); const drawer = find(view, "Drawer")[0]; assert.equal(drawer.props.hideTrigger, true); assert.equal(drawer.props.initialOpen, true); assert.equal(find(drawer, "Panel")[0].props.initialState, "unread");
  let prevented = false; find(view, "PopoverContent")[0].props.onCloseAutoFocus({ preventDefault: () => prevented = true }); assert.equal(prevented, true); find(view, "Popover")[0].props.onOpenChange(false); assert.equal(find(render(), "Drawer").length, 1); drawer.props.onClosed(); assert.equal(find(render(), "Drawer").length, 0);
});

test("route/link closure suppresses return-focus theft and hydration never opens an inbox controller", async () => {
  const h = harness(); let path = "/dashboard"; const loaded = inbox(h, fakeFeed(), { "next/navigation": { usePathname: () => path } }), render = () => h.render(() => loaded.NotificationInbox()); let view = render(); find(view, "Popover")[0].props.onOpenChange(true); view = render(); path = "/contacts"; render(); await tick(); view = render(); assert.equal(find(view, "Popover")[0].props.open, false); let prevented = false; find(view, "PopoverContent")[0].props.onCloseAutoFocus({ preventDefault: () => prevented = true }); assert.equal(prevented, true);
  const hh = harness(), cold = inbox(hh, fakeFeed(), { "@/hooks/use-hydrated": { useHydrated: () => false } }); view = hh.render(() => cold.NotificationInbox()); assert.equal(button(view, "Ouvrir les notifications").props.disabled, true); find(view, "Popover")[0].props.onOpenChange(true); assert.equal(find(hh.render(() => cold.NotificationInbox()), cold.NotificationPreview).length, 0);
});

test("quick filters keep their selected state and uncertainty/authority disables every transition", () => {
  const s = setup(), controls = loadServer("src/features/work/notification-controls.tsx", { modules: { ...ui, "./notification-feed": s.feed } }), calls = [], feed = fakeFeed({ state: "unread", filter: value => calls.push(value) }); let view = controls.NotificationFilters({ feed }); assert.equal(find(view, "Button").length, 3); assert.equal(button(view, "Non lues").props["aria-pressed"], true); button(view, "Lues").props.onClick(); assert.deepEqual(calls, ["read"]);
  feed.authority = new ApiError("FORBIDDEN", 403); view = controls.NotificationFilters({ feed }); assert.ok(find(view, "Button").every(node => node.props.disabled));
  const error = controls.NotificationProblem({ feed: { ...feed, problem: feed.authority, uncertain: true } }); assert.equal(find(error, "Error").length, 1); assert.equal(find(error, "Button").length, 0);
});

test("full inbox retains task/visit/file details, push controls, twenty-row pages and an empty-later-page escape", async () => {
  const h = harness(), row = item(), calls = [], feed = fakeFeed({ size: 20, value: page([row], { page_size: 20 }), markRead: async id => { calls.push(id); return true; } }), panel = loadServer("src/features/work/notification-panel.tsx", { modules: { ...ui, react: h.react, "./notification-feed": { useNotificationFeed: (size, state) => { assert.equal(size, 20); assert.equal(state, "unread"); return feed; } } } }), props = { initialState: "unread", navigate() {} }, render = () => h.render(() => panel.NotificationPanel(props)); let view = render(); assert.equal(find(view, "Entry").length, 1); assert.equal(find(view, "Push").length, 1); assert.equal(find(view, "Pages").length, 0); assert.equal(find(view, "Entry")[0].props.meta[0].value, row.due_local); assert.equal(find(view, "Link")[0].props.href, row.href); button(view, "Marquer comme lue").props.onClick(); await tick(); assert.deepEqual(calls, [row.id]);
  feed.value = page([], { page: 2, page_size: 20, total: 1, has_previous: true }); feed.page = 2; view = render(); assert.equal(find(view, "Pages").length, 1); assert.equal(find(view, "Pages")[0].props.page, 2);
  feed.authority = new ApiError("FORBIDDEN", 403); feed.value = undefined; feed.problem = feed.authority; view = render(); assert.equal(find(view, "Entry").length, 0); assert.equal(find(view, "Push").length, 0); assert.equal(find(view, "span").some(node => node.props.className === "kay-work-count"), false);
});

test("bell shows the selected discreet indicator with the real full accessible count, and hides denied or malformed counts", () => {
  const s = setup(), query = { value: page([s.first], { page_size: 1, total: 120, unread_total: 120, has_next: true }) }, loaded = loadServer("src/features/realtime/notification-bell.tsx", { modules: { ...ui, "@/features/contacts/use-query": { useQuery: () => query }, "@/features/work/contracts": work, "@/features/work/notification-feed": s.feed } });
  let view = loaded.LiveNotificationIcon(); const dot = find(view, "span").find(node => node.props.className === "kay-notification-dot"); assert.equal(dot.props["aria-label"], "120 notifications non lues"); assert.ok(!text(view).includes("99+")); query.error = new ApiError("FORBIDDEN", 403); assert.equal(find(loaded.LiveNotificationIcon(), "span").some(node => node.props.className === "kay-notification-dot"), false); delete query.error; query.value = page([s.first], { page_size: 20 }); assert.equal(find(loaded.LiveNotificationIcon(), "span").some(node => node.props.className === "kay-notification-dot"), false);
});


test("read completion restores compact filter focus/scroll only while the user has not moved to another control", async () => {
  for (const moved of [false, true]) {
    const h = harness(), row = item(), focus = [], origin = {}, other = {}, body = {}, document = { activeElement: origin, body }, feed = fakeFeed({ value: page([row]) }), loaded = inbox(h, feed), render = () => h.render(() => loaded.NotificationPreview({ heading: { current: null }, close() {}, navigate() {}, all() {} }));
    let view = render(), list = find(view, "div").find(node => node.props.className === "kay-notification-preview-list"), filters = find(view, "div").find(node => node.props.ref && find(node, "Filters").length);
    list.props.ref.current = { ownerDocument: document, scrollTop: 231 }; filters.props.ref.current = { querySelector: () => ({ focus: options => focus.push(options) }) };
    button(view, `Marquer comme lue · ${row.title}`).props.onClick(); await tick(); document.activeElement = moved ? other : origin; list.props.ref.current.scrollTop = 71; feed.value = page([{ ...row, read_at: "2026-10-28T11:00:00Z" }]); view = render();
    assert.equal(focus.length, moved ? 0 : 1); assert.equal(list.props.ref.current.scrollTop, moved ? 71 : 231); if (!moved) assert.equal(focus[0].preventScroll, true);
  }
});
