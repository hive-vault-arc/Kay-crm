import type { HistoryNavigation } from "./history-draft-guard";

declare global { interface Window { __kayClassicHistoryV1?: HistoryNavigation } }

// This function must stay closed over browser globals and its own locals: its
// compiled source runs before hydration, including before Next patches history.
export function bootstrapClassicHistory() {
  const navigation = (window as Window & { navigation?: HistoryNavigation }).navigation;
  if (window.__kayClassicHistoryV1 || navigation?.currentEntry && typeof navigation.traverseTo === "function") return;
  const field = "__kayHistoryEntryV1", nativePush = history.pushState, nativeReplace = history.replaceState;
  type Marker = { scope: string; position: number; id: string };
  type Entry = { key: string; url: string; marker?: Marker };
  type Pending = { key: string; resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
  let pending: Pending | undefined;
  const unavailable = () => new Error("NAVIGATION_UNAVAILABLE");
  const id = () => crypto.randomUUID();
  function marker(state: unknown): Marker | undefined {
    if (!state || typeof state !== "object" || !Object.hasOwn(state, field)) return;
    const value = (state as Record<string, unknown>)[field];
    if (!value || typeof value !== "object") return;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.scope !== "string" || !/^[a-f0-9-]{36}$/.test(candidate.scope) || typeof candidate.id !== "string" || !/^[a-f0-9-]{36}$/.test(candidate.id) || !Number.isSafeInteger(candidate.position) || (candidate.position as number) < 0) return;
    return { scope: candidate.scope, id: candidate.id, position: candidate.position as number };
  }
  const key = (value: Marker) => `${value.scope}:${value.position}:${value.id}`;
  const entry = (value?: Marker): Entry => ({ key: value ? key(value) : `unknown:${id()}`, url: location.href, marker: value });
  const initial = marker(history.state) ?? { scope: id(), position: 0, id: id() };
  let current = entry(initial);
  const api = new EventTarget() as HistoryNavigation;
  Object.defineProperty(api, "currentEntry", { get: () => current });
  function changed(navigationType: "push" | "replace") {
    const event = new Event("currententrychange") as Event & { navigationType: string };
    event.navigationType = navigationType; api.dispatchEvent(event);
  }
  function interrupt() { if (pending) { const previous = pending; pending = undefined; clearTimeout(previous.timer); previous.reject(unavailable()); } }
  function stamp(state: unknown, value: Marker) {
    // Next owns all other keys. Their opaque values pass through unchanged; no
    // tree, credential, input value or private record is inspected or retained.
    if (state !== null && state !== undefined && (typeof state !== "object" || Object.prototype.toString.call(state) !== "[object Object]")) return state;
    return { ...state as Record<string, unknown> | undefined, [field]: value };
  }
  try { nativeReplace.call(history, stamp(history.state, initial), ""); }
  catch { /* Untracked entries fail closed instead of guessing a direction. */ }
  current = entry(marker(history.state));
  history.pushState = function (state: unknown, unused: string, url?: string | URL | null) {
    const base = current.marker ?? { scope: id(), position: 0, id: id() };
    const next = { scope: base.scope, position: base.position + 1, id: id() };
    const result = nativePush.call(history, stamp(state, next), unused, url);
    interrupt(); current = entry(marker(history.state)); changed("push"); return result;
  };
  history.replaceState = function (state: unknown, unused: string, url?: string | URL | null) {
    const next = current.marker ?? { scope: id(), position: 0, id: id() };
    const result = nativeReplace.call(history, stamp(state, next), unused, url);
    interrupt(); current = entry(marker(history.state)); changed("replace"); return result;
  };
  api.traverseTo = destination => ({ finished: new Promise<void>((resolve, reject) => {
    const parts = destination.split(":"), base = current.marker, position = Number(parts[1]);
    if (!base || parts.length !== 3 || parts[0] !== base.scope || !Number.isSafeInteger(position) || position < 0 || !/^[a-f0-9-]{36}$/.test(parts[2])) { reject(unavailable()); return; }
    if (destination === current.key) { resolve(); return; }
    const delta = position - base.position;
    if (!delta) { reject(unavailable()); return; } // go(0) would reload, never restore.
    interrupt();
    const timer = setTimeout(() => { if (pending?.key === destination) { pending = undefined; reject(unavailable()); } }, 2000);
    pending = { key: destination, resolve, reject, timer };
    try { history.go(delta); } catch { interrupt(); }
  }) });
  window.addEventListener("popstate", event => {
    const previous = current, from = new URL(previous.url), to = new URL(location.href);
    const hashOnly = from.origin === to.origin && from.pathname === to.pathname && from.search === to.search && from.hash !== to.hash;
    let value = marker(event.state);
    if (hashOnly && previous.marker && (!value || key(value) === previous.key)) {
      value = { scope: previous.marker.scope, position: previous.marker.position + 1, id: id() };
      try { nativeReplace.call(history, stamp(history.state, value), ""); } catch { value = undefined; }
    }
    current = entry(value);
    if (pending) { const operation = pending; pending = undefined; clearTimeout(operation.timer); if (operation.key === current.key) operation.resolve(); else operation.reject(unavailable()); }
    // Fragment-only traversal leaves this editor's React tree in place. In
    // particular, a native fragment entry may not have Next-owned router state.
    if (hashOnly) { event.stopImmediatePropagation(); changed("replace"); }
  }, true);
  window.__kayClassicHistoryV1 = api;
}

// No request/record/form interpolation and no remote script dependency.
export const classicHistoryScript = `(${bootstrapClassicHistory.toString()})();`;
