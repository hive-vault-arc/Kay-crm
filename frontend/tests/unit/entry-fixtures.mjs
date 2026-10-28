import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContracts } from "./ownership-fixtures.mjs";

export const activityContracts = loadServer("src/features/activities/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } });
export const entryContracts = loadServer("src/features/activities/entry-command.ts", { modules: { "@/features/contacts/ownership-contracts": ownershipContracts, "./contracts": activityContracts } });
export function loadEntryCommand(h, { ApiError, request, identity = async () => {}, hydrated = true }) {
  return loadServer("src/features/activities/use-entry-command.ts", { modules: {
    react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError },
    "./entry-command": entryContracts, "./entry-client": { entryRequest: request, entryIdentity: identity },
  }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
}
export function entryHarness() {
  const slots = [], effects = []; let cursor = 0, disposed = false, late = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], value => { if (disposed) late++; slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; }, useId: () => "synthetic-entry",
    useEffect(run, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const current = { deps }; slots[i] = current; effects.push(() => { old?.cleanup?.(); current.cleanup = run(); }); } },
  };
  return { react, render(run) { cursor = 0; let value = run(); if (typeof value?.type === "function") value = value.type(value.props); effects.splice(0).forEach(effect => effect()); return value; }, dispose() { slots.forEach(slot => slot?.cleanup?.()); disposed = true; }, lateUpdates: () => late };
}

// Per-component state/effects with disposal for composite workflow tests. Keys
// include the parent path so replacing an owner cannot reuse its child's hooks.
export function componentHarness() {
  const owners = new Map(), effects = []; let active, late = 0, serial = 0;
  function dispose(owner) { if (owner.disposed) return; owner.disposed = true; owner.slots.forEach(slot => slot?.cleanup?.()); }
  const react = {
    useState(initial) { const owner = active, i = owner.cursor++; if (!(i in owner.slots)) owner.slots[i] = typeof initial === "function" ? initial() : initial; return [owner.slots[i], value => { if (owner.disposed) late++; owner.slots[i] = typeof value === "function" ? value(owner.slots[i]) : value; }]; },
    useRef(initial) { const owner = active, i = owner.cursor++; return owner.slots[i] ??= { current: initial }; },
    useEffect(run, deps) { const owner = active, i = owner.cursor++, old = owner.slots[i]; if (!old || deps.some((value, n) => !Object.is(value, old.deps[n]))) { const slot = { deps }; owner.slots[i] = slot; effects.push(() => { old?.cleanup?.(); if (!owner.disposed) slot.cleanup = run(); }); } },
    useId() { const i = active.cursor++; return active.slots[i] ??= `synthetic-component-${++serial}`; },
  };
  react.useLayoutEffect = react.useEffect;
  function expand(node, path, seen) {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map((value, i) => expand(value, `${path}/${value?.key ?? i}`, seen));
    if (typeof node.type === "function") { const key = `${path}/${node.type.name}:${node.key ?? "default"}`; let owner = owners.get(key); if (!owner || owner.disposed) { owner = { slots: [] }; owners.set(key, owner); } seen.add(owner); active = owner; owner.cursor = 0; return expand(node.type(node.props), key, seen); }
    return { ...node, props: { ...node.props, ...Object.fromEntries(["children", "actions", "message"].filter(key => node.props?.[key] !== undefined).map(key => [key, expand(node.props[key], `${path}/${key}`, seen)])) } };
  }
  return { react, render(run) { const seen = new Set(), value = expand(run(), "root", seen); for (const owner of owners.values()) if (!seen.has(owner)) dispose(owner); effects.splice(0).forEach(effect => effect()); return value; }, dispose() { for (const owner of owners.values()) dispose(owner); }, lateUpdates: () => late };
}
