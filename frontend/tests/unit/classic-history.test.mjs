import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";
import ts from "typescript";

const { classicHistoryScript } = loadServer("src/lib/classic-history-bootstrap.ts");
const { protectHistoryDrafts } = loadServer("src/lib/history-draft-guard.ts");
const field = "__kayHistoryEntryV1";
class Pop extends Event { stopped = false; constructor(state) { super("popstate"); this.state = state; } stopImmediatePropagation() { this.stopped = true; super.stopImmediatePropagation(); } }
class WindowEvents {
  listeners = [];
  addEventListener(type, run, capture = false) { this.listeners.push({ type, run, capture }); }
  removeEventListener(type, run, capture = false) { this.listeners = this.listeners.filter(item => item.type !== type || item.run !== run || item.capture !== capture); }
  emit(event) { for (const item of this.listeners.filter(item => item.type === event.type).sort((a, b) => Number(Boolean(b.capture)) - Number(Boolean(a.capture)))) { item.run(event); if (event.stopped) break; } }
}
function fixture({ navigation, state, initialUrl = "/contacts", beforeBootstrap, initialWriteFailure = false, deferBootstrap = false } = {}) {
  const target = new WindowEvents(), entries = [{ state: state ?? { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: "contacts" } }, url: new URL(initialUrl, "https://crm.synthetic.invalid").href }], go = [], writes = [], next = [], decisions = [], failures = [], timers = new Map(); let index = 0, sequence = 0, failGo = false, failWrite = initialWriteFailure, protection = { dirty: false, busy: false }, release;
  const location = { get href() { return entries[index].url; } };
  function url(value) { const parsed = new URL(value ?? location.href, location.href); if (parsed.origin !== new URL(location.href).origin) throw new DOMException("Synthetic origin refusal", "SecurityError"); return parsed.href; }
  const history = {
    get state() { return structuredClone(entries[index].state); }, get length() { return entries.length; },
    pushState(data, unused, value) { if (failWrite) throw new DOMException("Synthetic write refusal", "DataCloneError"); const next = { state: structuredClone(data), url: url(value) }; entries.splice(index + 1); entries.push(next); index++; writes.push({ kind: "push", unused }); },
    replaceState(data, unused, value) { if (failWrite) throw new DOMException("Synthetic write refusal", "DataCloneError"); entries[index] = { state: structuredClone(data), url: url(value) }; writes.push({ kind: "replace", unused }); },
    go(delta) { go.push(delta); const destination = index + delta; if (failGo || destination < 0 || destination >= entries.length) return; queueMicrotask(() => move(destination)); },
  };
  const nativePush = history.pushState;
  target.history = history;
  beforeBootstrap?.(history, target);
  function move(destination) { index = destination; target.emit(new Pop(history.state)); }
  target.navigation = navigation;
  const globals = { window: target, history, location, crypto: { randomUUID }, Event, EventTarget, URL, setTimeout: run => { const value = ++sequence; timers.set(value, run); return value; }, clearTimeout: value => timers.delete(value), document: new Proxy({}, { get() { throw new Error("PRIVATE_DOM_ACCESS_FORBIDDEN"); } }), fetch() { throw new Error("NETWORK_ACCESS_FORBIDDEN"); } };
  if (!deferBootstrap) runInNewContext(classicHistoryScript, globals);
  target.addEventListener("popstate", event => next.push(event.state));
  const stateFor = label => ({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: label } });
  return { target, entries, history, writes, go, next, decisions, failures, location, globals, get api() { return target.__kayClassicHistoryV1; }, current: () => index, move, stateFor,
    protected() { release = protectHistoryDrafts({ navigation: target.__kayClassicHistoryV1, target, protection: () => protection, confirm: resume => decisions.push(resume), restoreFailed: retry => failures.push(retry) }); },
    clean() { protection = { dirty: false, busy: false }; }, dirty() { protection = { dirty: true, busy: false }; }, busy() { protection = { dirty: false, busy: true }; }, dispose() { release?.(); },
    async prepare() { history.pushState(stateFor("leads"), "", "/leads"); history.pushState(stateFor("projects"), "", "/projects"); move(1); next.length = 0; },
    hash(value, inherit = false) { nativePush.call(history, inherit ? history.state : null, "", value); target.emit(new Pop(history.state)); },
    expire() { for (const [id, run] of [...timers]) { timers.delete(id); run(); } }, failGo(value) { failGo = value; }, failWrite(value) { failWrite = value; }, timers,
  };
}

test("classic bootstrap runs as a closed pre-hydration script, preserves Next values and writes only its own small metadata", () => {
  const s = fixture(); assert.equal(s.history.length, 1); assert.equal(s.writes.length, 1); assert.equal(s.writes[0].kind, "replace");
  assert.deepEqual(s.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "contacts" }); assert.equal(s.history.state.__NA, true); assert.deepEqual(Object.keys(s.history.state[field]).sort(), ["id", "position", "scope"]); assert.equal(s.history.state[field].position, 0);
  const before = s.history.state[field]; s.history.pushState(s.stateFor("leads"), "", "/leads"); const pushed = s.history.state[field]; assert.equal(pushed.position, 1); assert.equal(pushed.scope, before.scope); assert.notEqual(pushed.id, before.id);
  s.history.replaceState({ ...s.stateFor("new-tree"), custom: { retained: true } }, "", "/leads?q=synthetic"); assert.deepEqual(s.history.state[field], pushed); assert.deepEqual(s.history.state.custom, { retained: true }); assert.deepEqual(s.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "new-tree" }); assert.equal(s.history.length, 2);
  assert.ok(!classicHistoryScript.includes("</script"));
});

test("modern Navigation API skips classic stamping entirely and the bootstrap is idempotent", () => {
  const s = fixture({ navigation: { currentEntry: { key: "native" }, traverseTo() {} } }); assert.equal(s.api, undefined); assert.equal(s.writes.length, 0); assert.equal(s.target.listeners.length, 1); assert.equal(s.history.state[field], undefined);
  const old = fixture(), count = old.writes.length, push = old.history.pushState; runInNewContext(classicHistoryScript, old.globals); assert.equal(old.writes.length, count); assert.equal(old.history.pushState, push);
});

test("classic dirty Back restores the live entry before asking, preserves Forward entries and resumes only the reviewed destination", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.dirty(); const length = s.history.length, before = s.writes.length;
  s.move(0); assert.equal(s.next.length, 0); await delay(0); assert.equal(s.current(), 1); assert.equal(s.decisions.length, 1); assert.equal(s.next.length, 0); assert.deepEqual(s.go, [1]); assert.equal(s.history.length, length); assert.equal(s.writes.length, before);
  s.clean(); await s.decisions[0](); assert.equal(s.current(), 0); assert.equal(s.next.length, 1); assert.deepEqual(s.next[0].__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "contacts" }); assert.equal(s.history.length, length); s.dispose();
});

test("classic Forward and duplicate URLs retain distinct entry identity, with pending commands blocked before Next", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.busy(); s.move(2); await delay(0); assert.equal(s.current(), 1); assert.equal(s.decisions.length, 0); assert.equal(s.next.length, 0);
  s.clean(); s.history.pushState(s.stateFor("same-url"), "", "/leads"); s.dirty(); s.move(1); await delay(0); assert.equal(s.current(), 2); assert.equal(s.decisions.length, 1); assert.equal(s.location.href, "https://crm.synthetic.invalid/leads"); s.dispose();
});

test("rapid opposite classic traversals invalidate earlier decisions and keep the most recent destination", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.dirty(); s.move(0); s.move(2); await delay(0); assert.equal(s.current(), 1); assert.equal(s.next.length, 0); assert.equal(s.decisions.length, 1);
  s.clean(); await s.decisions[0](); assert.equal(s.current(), 2); assert.equal(s.next.length, 1); s.dispose();
});

test("a classic interrupted return is bounded and an explicit retry restores only its original live entry", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.dirty(); s.failGo(true); s.move(0);
  for (let n = 0; n < 3; n++) { s.expire(); await delay(0); }
  assert.equal(s.failures.length, 1); assert.equal(s.go.length, 3); assert.equal(s.next.length, 0); assert.equal(s.decisions.length, 0);
  s.failGo(false); s.failures[0](); await delay(0); assert.equal(s.current(), 1); assert.equal(s.decisions.length, 1); assert.equal(s.next.length, 0); s.dispose();
});

test("native hash entries and hash Back preserve the live editor without sending incomplete state to Next", async () => {
  for (const inherit of [false, true]) {
    const s = fixture(); await s.prepare(); s.protected(); s.dirty(); const home = s.api.currentEntry.key;
    s.hash("#notes", inherit); assert.notEqual(s.api.currentEntry.key, home); assert.equal(s.history.state[field].position, 2); assert.equal(s.decisions.length, 0); assert.equal(s.next.length, 0);
    s.move(1); assert.equal(s.api.currentEntry.key, home); assert.equal(s.next.length, 0); assert.equal(s.decisions.length, 0); s.move(0); await delay(0); assert.equal(s.current(), 1); assert.equal(s.decisions.length, 1); s.dispose();
  }
});

test("untracked or non-record state is never guessed into a relative traversal or released into a dirty router restore", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.dirty(); delete s.entries[0].state[field]; s.move(0); await delay(0); assert.equal(s.next.length, 0); assert.equal(s.go.length, 0); assert.equal(s.failures.length, 1); assert.equal(s.decisions.length, 0);
  await assert.rejects(s.api.traverseTo("bad:key").finished); assert.equal(s.go.length, 0); s.dispose();
  const plain = fixture(); plain.history.pushState(["opaque array state"], "", "/external-owned"); assert.deepEqual(plain.history.state, ["opaque array state"]);
});

test("failed classic push/replace leave current identity, URL, length and notifications unchanged", () => {
  const s = fixture(), original = s.api.currentEntry.key, url = s.location.href, length = s.history.length; let changes = 0; s.api.addEventListener("currententrychange", () => changes++); s.failWrite(true);
  assert.throws(() => s.history.pushState(s.stateFor("refused"), "", "/refused")); assert.throws(() => s.history.replaceState(s.stateFor("refused"), "", "/refused")); assert.equal(s.api.currentEntry.key, original); assert.equal(s.location.href, url); assert.equal(s.history.length, length); assert.equal(changes, 0);
});

test("guard cleanup removes its own capture handler and suppresses late prompts while document metadata tracking remains usable", async () => {
  const s = fixture(); await s.prepare(); s.protected(); s.dirty(); const count = s.target.listeners.length; s.move(0); s.dispose(); await delay(0); assert.equal(s.target.listeners.length, count - 1); assert.equal(s.decisions.length, 0); assert.equal(s.failures.length, 0);
  s.clean(); s.move(2); assert.equal(s.api.currentEntry.url, "https://crm.synthetic.invalid/projects"); assert.deepEqual(s.next.at(-1).__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "projects" });
});

test("root layout installs the closed bootstrap before hydration with no values or request interpolation", () => {
  const source = readFileSync(new URL("../../src/app/layout.tsx", import.meta.url), "utf8"); assert.match(source, /import Script from "next\/script"/); assert.match(source, /strategy="beforeInteractive" dangerouslySetInnerHTML=\{\{ __html: classicHistoryScript \}\}/); assert.ok(!classicHistoryScript.includes("document.querySelector"));
});

test("the actual installed Next history wrappers preserve opaque state when nested before or after classic tracking", () => {
  const source = readFileSync(new URL("../../node_modules/next/dist/client/components/app-router.js", import.meta.url), "utf8"), ast = ts.createSourceFile("app-router.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); let copy, push, replace;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "copyNextJsInternalHistoryState") copy = node.getText(ast);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isFunctionExpression(node.right)) { if (node.left.getText(ast) === "window.history.pushState") push = node.right.getText(ast); if (node.left.getText(ast) === "window.history.replaceState") replace = node.right.getText(ast); }
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(copy && push && replace);
  function install(history, window) {
    const patched = runInNewContext(`${copy}; ({ push: ${push}, replace: ${replace} })`, { window, originalPushState: history.pushState.bind(history), originalReplaceState: history.replaceState.bind(history), applyUrlFromHistoryPushReplace() {} }); history.pushState = patched.push; history.replaceState = patched.replace;
  }
  for (const order of ["before", "after"]) {
    const s = fixture({ beforeBootstrap: order === "before" ? install : undefined }); if (order === "after") install(s.history, s.target);
    s.history.pushState(s.stateFor("next-owned"), "", "/leads"); const first = s.history.state[field]; s.history.pushState({ caller: "opaque external value" }, "", "/leads?q=synthetic"); const second = s.history.state[field];
    assert.equal(second.position, first.position + 1); assert.equal(second.scope, first.scope); assert.deepEqual(s.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "next-owned" }); assert.equal(s.history.state.caller, "opaque external value");
    s.history.replaceState(s.stateFor("new-tree"), "", "/leads?q=synthetic"); assert.deepEqual(s.history.state[field], second); assert.equal(s.history.length, 3); assert.deepEqual(s.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE, { synthetic: "new-tree" });
  }
});

test("retained entry metadata survives a document reload and a forged same-position key cannot trigger go(0)", async () => {
  const saved = { scope: randomUUID(), position: 42, id: randomUUID() }, s = fixture({ state: { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { synthetic: "retained" }, [field]: saved } });
  assert.deepEqual(s.history.state[field], saved); await assert.rejects(s.api.traverseTo(`${saved.scope}:42:${randomUUID()}`).finished); assert.equal(s.go.length, 0);
  s.history.pushState(s.stateFor("next"), "", "/leads"); assert.equal(s.history.state[field].position, 43); assert.equal(s.history.state[field].scope, saved.scope);
});

test("initial metadata write failure retains a fail-closed controller rather than silently disabling same-document draft protection", async () => {
  const s = fixture({ initialWriteFailure: true }); assert.ok(s.api); assert.match(s.api.currentEntry.key, /^unknown:/); s.protected(); s.dirty(); s.entries.push({ url: "https://crm.synthetic.invalid/leads", state: s.stateFor("untracked") }); s.move(1); await delay(0); assert.equal(s.next.length, 0); assert.equal(s.go.length, 0); assert.equal(s.failures.length, 1); s.dispose();
});

test("the installed Next bootstrap executes this inline beforeInteractive script before calling hydration", async () => {
  const s = fixture({ deferBootstrap: true }), order = []; let finish;
  const done = new Promise(resolve => { finish = resolve; });
  const document = { createElement: () => ({}), head: { appendChild: element => { order.push("script"); runInNewContext(element.innerHTML, s.globals); } } };
  const { appBootstrap } = loadServer("node_modules/next/dist/client/app-bootstrap.js", { modules: { "./asset-prefix": { getAssetPrefix: () => "" }, "./set-attributes-from-props": { setAttributesFromProps: (element, props) => Object.assign(element, props) } }, globals: { window: s.target, document, self: { __next_s: [[0, { children: classicHistoryScript, id: "kay-classic-history" }]] }, setTimeout: run => setImmediate(run) } });
  appBootstrap(() => { assert.ok(s.api); order.push("hydrate"); finish(); }); await done; assert.deepEqual(order, ["script", "hydrate"]); assert.equal(s.history.length, 1);
});
