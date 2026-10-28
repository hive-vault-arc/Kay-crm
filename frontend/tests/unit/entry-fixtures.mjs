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
