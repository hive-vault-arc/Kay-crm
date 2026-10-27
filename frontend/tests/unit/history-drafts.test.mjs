import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";

const { protectHistoryDrafts } = loadServer("src/lib/history-draft-guard.ts");
const { discardDraftAction } = loadServer("src/lib/discard-draft-action.ts");
const entry = (key, path) => ({ key, url: `https://crm.synthetic.invalid${path}`, state: { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: key } } });
class WindowEvents {
  listeners = [];
  addEventListener(type, run, capture = false) { this.listeners.push({ type, run, capture }); }
  removeEventListener(type, run, capture = false) { this.listeners = this.listeners.filter(value => value.type !== type || value.run !== run || value.capture !== capture); }
  dispatch(event) { for (const value of this.listeners.filter(value => value.type === event.type).sort((a, b) => Number(Boolean(b.capture)) - Number(Boolean(a.capture)))) { value.run(event); if (event.stopped) break; } }
}
class Pop extends Event { stopped = false; constructor(state) { super("popstate"); this.state = state; } stopImmediatePropagation() { this.stopped = true; super.stopImmediatePropagation(); } }
class Navigate extends Event { constructor(destination, cancelable, sameDocument = true) { super("navigate", { cancelable }); this.navigationType = "traverse"; this.destination = { ...destination, sameDocument }; } }
function fixture() {
  const entries = [entry("a", "/leads"), entry("b", "/contacts/record"), entry("c", "/projects"), entry("anchor", "/contacts/record#notes"), entry("same", "/contacts/record")];
  const target = new WindowEvents(), navigation = new EventTarget(), commands = [], decisions = [], nextRestores = [], errors = [];
  let current = entries[1], failure = false, state = { dirty: true, busy: false };
  Object.defineProperty(navigation, "currentEntry", { get: () => current });
  // The actual Next16.4.2 listener is non-capture, regardless of registration order.
  target.addEventListener("popstate", event => nextRestores.push(event.state));
  function moved(key, cancelable = true, sameDocument = true) {
    const destination = entries.find(value => value.key === key), event = new Navigate(destination, cancelable, sameDocument);
    navigation.dispatchEvent(event);
    if (event.defaultPrevented) return false;
    current = destination;
    const changed = new Event("currententrychange"); changed.navigationType = "traverse"; navigation.dispatchEvent(changed);
    target.dispatch(new Pop(destination.state)); return true;
  }
  navigation.traverseTo = key => { commands.push(key); return { finished: Promise.resolve().then(() => { if (failure) throw new Error("Synthetic traversal interrupted"); if (!moved(key)) throw new Error("Synthetic traversal prevented"); }) }; };
  const dispose = protectHistoryDrafts({ navigation, target, protection: () => state, confirm: resume => decisions.push(resume), restoreFailed: retry => errors.push(retry) });
  return { entries, navigation, target, commands, decisions, nextRestores, errors, dispose, moved, current: () => current, state: next => { state = next; }, fail: value => { failure = value; }, changed(key, type) { current = entries.find(value => value.key === key); const event = new Event("currententrychange"); event.navigationType = type; navigation.dispatchEvent(event); } };
}

test("Cancelable Back/Forward keeps the live entry on cancel and resumes only the confirmed destination", async () => {
  const s = fixture(); assert.equal(s.moved("a"), false); assert.equal(s.current().key, "b"); assert.equal(s.decisions.length, 1); assert.equal(s.nextRestores.length, 0); assert.deepEqual(s.commands, []);
  assert.equal(s.moved("c"), false); assert.equal(s.decisions.length, 2); s.state({ dirty: false, busy: false }); await s.decisions[1]();
  assert.equal(s.current().key, "c"); assert.equal(s.nextRestores.length, 1); assert.equal(s.nextRestores[0], s.entries[2].state); s.dispose();
});

test("An uncancelable traversal returns to the current editor before asking and does not send either popstate to Next", async () => {
  const s = fixture(); assert.equal(s.moved("a", false), true); assert.equal(s.current().key, "a"); assert.equal(s.nextRestores.length, 0);
  await delay(0); assert.equal(s.current().key, "b"); assert.equal(s.decisions.length, 1); assert.equal(s.nextRestores.length, 0); assert.deepEqual(s.commands, ["b"]);
  s.state({ dirty: false, busy: false }); await s.decisions[0](); assert.equal(s.current().key, "a"); assert.equal(s.nextRestores[0], s.entries[0].state); s.dispose();
});

test("A pending command blocks traversal without a discard prompt, including a command started after the prompt opened", async () => {
  const s = fixture(); s.state({ dirty: false, busy: true }); assert.equal(s.moved("a"), false); s.moved("c", false); await delay(0);
  assert.equal(s.current().key, "b"); assert.equal(s.decisions.length, 0); assert.equal(s.nextRestores.length, 0);
  s.state({ dirty: true, busy: false }); s.moved("a"); s.state({ dirty: true, busy: true }); await assert.rejects(s.decisions[0]()); assert.equal(s.current().key, "b"); s.dispose();
});

test("Rapid opposite uncancelable history actions restore once and retain the latest requested destination", async () => {
  const s = fixture(); s.moved("a", false); s.moved("c", false); await delay(0);
  assert.equal(s.current().key, "b"); assert.equal(s.nextRestores.length, 0); assert.equal(s.decisions.length, 1); assert.deepEqual(s.commands, ["b"]);
  s.state({ dirty: false, busy: false }); await s.decisions[0](); assert.equal(s.current().key, "c"); assert.equal(s.nextRestores.length, 1); s.dispose();
});

test("A previous confirmation cannot resume after a newer uncancelable traversal supersedes its destination", async () => {
  const s = fixture(); s.moved("a", true); const stale = s.decisions[0]; s.moved("c", false);
  await assert.rejects(stale()); await delay(0); assert.equal(s.current().key, "b"); assert.equal(s.nextRestores.length, 0); assert.equal(s.decisions.length, 2);
  s.state({ dirty: false, busy: false }); await s.decisions[1](); assert.equal(s.current().key, "c"); assert.equal(s.nextRestores.length, 1); s.dispose();
});

test("Hash-only movement stays usable, while a distinct cached entry with the identical URL still requires a decision", () => {
  const s = fixture(); assert.equal(s.moved("anchor"), true); assert.equal(s.moved("b"), true); assert.equal(s.decisions.length, 0);
  assert.equal(s.moved("same"), false); assert.equal(s.decisions.length, 1); assert.equal(s.current().key, "b"); s.dispose();
});

test("Framework push/replace entry changes establish the live return entry without intercepting those writes", async () => {
  for (const type of ["push", "replace"]) {
    const s = fixture(); s.changed("c", type); s.moved("a", false); await delay(0); assert.equal(s.current().key, "c"); assert.deepEqual(s.commands, ["c"]); assert.equal(s.nextRestores.length, 0); s.dispose();
  }
});

test("Interrupted return traversal retries only three times, retains the editor and exposes an explicit retry of that same return", async () => {
  const s = fixture(); s.fail(true); s.moved("a", false); await delay(0);
  assert.equal(s.current().key, "a"); assert.deepEqual(s.commands, ["b", "b", "b"]); assert.equal(s.nextRestores.length, 0); assert.equal(s.decisions.length, 0); assert.equal(s.errors.length, 1);
  s.fail(false); s.errors[0](); await delay(0); assert.equal(s.current().key, "b"); assert.equal(s.decisions.length, 1); assert.equal(s.nextRestores.length, 0); s.dispose();
});

test("A completed save releases a pending return and cross-document navigations remain with the native unload boundary", async () => {
  const s = fixture(); const cross = new Navigate(s.entries[0], true, false); s.navigation.dispatchEvent(cross); assert.equal(cross.defaultPrevented, false);
  s.moved("a", false); s.state({ dirty: false, busy: false }); await delay(0); assert.equal(s.current().key, "b"); assert.equal(s.decisions.length, 0);
  s.moved("c"); assert.equal(s.current().key, "c"); assert.equal(s.nextRestores.at(-1), s.entries[2].state); s.dispose();
});

test("Unmount removes capture listeners and prevents late return/error prompts without editing history or router state", async () => {
  const s = fixture(), before = JSON.stringify(s.entries); s.moved("a", false); s.dispose(); await delay(0);
  assert.equal(s.target.listeners.length, 1); assert.equal(s.decisions.length, 0); assert.equal(s.errors.length, 0); assert.equal(JSON.stringify(s.entries), before);
  s.moved("c"); assert.equal(s.nextRestores.at(-1), s.entries[2].state);
});

test("Failed approved navigation restores only still-connected draft markers and never signals a successful discard", async () => {
  const live = { dataset: { liveDirty: "true" }, isConnected: true, value: "Synthetic retained draft" }, gone = { dataset: { liveDirty: "true" }, isConnected: false };
  let cleared = 0, reject;
  discardDraftAction(() => new Promise((resolve, fail) => { reject = fail; }), [live, gone], () => cleared++); assert.equal(live.dataset.liveDirty, undefined); assert.equal(cleared, 0);
  reject(new Error("Synthetic interrupted navigation")); await delay(0); assert.equal(live.dataset.liveDirty, "true"); assert.equal(gone.dataset.liveDirty, undefined); assert.equal(live.value, "Synthetic retained draft"); assert.equal(cleared, 0);
  discardDraftAction(() => { throw new Error("Synthetic immediate failure"); }, [live], () => cleared++); assert.equal(live.dataset.liveDirty, "true"); assert.equal(cleared, 0);
});

test("Successful approved navigation releases the draft once after settlement, and ordinary synchronous actions remain supported", async () => {
  const live = { dataset: { liveDirty: "true" }, isConnected: true }; let cleared = 0, resolve;
  discardDraftAction(() => new Promise(done => { resolve = done; }), [live], () => cleared++); assert.equal(cleared, 0); resolve(); await delay(0); assert.equal(cleared, 1); assert.equal(live.dataset.liveDirty, undefined);
  discardDraftAction(() => cleared++, [], () => cleared++); assert.equal(cleared, 3);
});

function componentHarness() {
  let cursor = 0; const slots = [], effects = [];
  return { react: {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) slots[i] = { deps, run }; return slots[i].run; },
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  }, render(run) { cursor = 0; const result = run(); effects.splice(0).forEach(run => run()); return result; }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function workspaceSetup() {
  const h = componentHarness(), target = new WindowEvents(), docEvents = new WindowEvents(), marker = { dataset: { liveDirty: "true" }, isConnected: true };
  let busy = false, dirty = false; const navigations = [];
  const document = { querySelector: selector => selector.includes("aria-busy") ? busy ? {} : null : dirty ? marker : null, querySelectorAll: () => dirty ? [marker] : [], activeElement: null, addEventListener: (...args) => docEvents.addEventListener(...args), removeEventListener: (...args) => docEvents.removeEventListener(...args) };
  class Element { constructor(form) { this.form = form; } closest(selector) { return selector === "[data-filter-panel]" ? null : selector.startsWith("form,") ? this.form : null; } get value() { throw new Error("The navigation guard must not read field values"); } }
  const router = { push: value => navigations.push(value) }, jsx = (type, props) => ({ type, props }); target.dispatchEvent = event => { target.dispatch(event); return true; };
  const loaded = loadServer("src/components/shared/unsaved-guard.tsx", { modules: { react: h.react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" }, "next/navigation": { useRouter: () => router }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogTitle"].map(name => [name, name])), "@/components/ui/button": { Button: "Button" }, "@/lib/navigation-intent": loadServer("src/lib/navigation-intent.ts"), "@/lib/discard-draft-action": { discardDraftAction }, "@/lib/history-draft-guard": { protectHistoryDrafts } }, globals: { window: target, document, Element, HTMLElement: Element, Event, location: { href: "https://crm.synthetic.invalid/contacts/record" } } });
  const render = () => h.render(() => loaded.WorkspaceNavigationGuard()); render();
  return { target, docEvents, marker, navigations, render, unmount: h.unmount, Element, busy: value => { busy = value; }, dirty: value => { dirty = value; } };
}
test("The real workspace unload boundary also warns for a clean-but-pending command and leaves unsupported history APIs untouched", () => {
  const s = workspaceSetup(); assert.equal(s.target.listeners.filter(value => value.type === "popstate").length, 0);
  const unload = () => { const event = { type: "beforeunload", prevented: false, preventDefault() { this.prevented = true; } }; s.target.dispatch(event); return event; };
  assert.equal(unload().prevented, false); s.busy(true); assert.equal(unload().prevented, true); s.busy(false); s.dirty(true); assert.equal(unload().returnValue, "");
  s.unmount(); assert.equal(s.target.listeners.length, 0); assert.equal(s.docEvents.listeners.length, 0); assert.equal(s.navigations.length, 0);
});

test("The workspace tracker marks only ordinary business forms, without reading or retaining any input values", () => {
  const s = workspaceSetup();
  const ordinary = { dataset: {}, hasAttribute: () => false, querySelector: () => null }, managed = { dataset: {}, hasAttribute: () => true, querySelector: () => null }, readonly = { dataset: {}, hasAttribute: () => false, querySelector: selector => selector === '[data-action="search"]' ? {} : null };
  for (const form of [ordinary, managed, readonly]) s.docEvents.dispatch({ type: "input", target: new s.Element(form) });
  assert.equal(ordinary.dataset.liveDirty, "true"); assert.equal(managed.dataset.liveDirty, undefined); assert.equal(readonly.dataset.liveDirty, undefined); assert.equal(s.navigations.length, 0); s.unmount();
});

test("The installed Next router still restores history through a non-capture popstate listener with its untouched owned state", () => {
  const source = readFileSync(new URL("../../node_modules/next/dist/client/components/app-router.js", import.meta.url), "utf8");
  const ast = ts.createSourceFile("app-router.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), listeners = [];
  function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === "window.addEventListener" && node.arguments[0]?.text === "popstate") listeners.push(node); ts.forEachChild(node, visit); }
  visit(ast); assert.equal(listeners.length, 1); assert.equal(listeners[0].arguments.length, 2); assert.equal(listeners[0].arguments[1].getText(ast), "onPopState");
  assert.match(source, /const onPopState = \(event\)=>handlePopState\(event.state\)/); assert.match(source, /_navigator\.traverse\)\(window.location.href, state.__PRIVATE_NEXTJS_INTERNALS_TREE\)/);
});
