import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

class ApiError extends Error { constructor(code, status) { super(code); this.code = code; this.status = status; } }
function queryHarness(path) {
  let cursor = 0, dirty = false, busy = false, currentPath = path;
  const states = [], deps = [], cleanups = [], effects = [], reads = [], events = [];
  const differs = (old, next) => !old || next.some((value, index) => !Object.is(value, old[index]));
  const react = {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial; return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }]; },
    useRef(initial) { const index = cursor++; if (!(index in states)) states[index] = { current: initial }; return states[index]; },
    useCallback(callback, dependencies) { const index = cursor++; if (differs(deps[index], dependencies)) { deps[index] = [...dependencies]; states[index] = callback; } return states[index]; },
    useEffect(callback, dependencies) { const index = cursor++; if (differs(deps[index], dependencies)) { deps[index] = [...dependencies]; effects.push(() => { cleanups[index]?.(); cleanups[index] = callback(); }); } },
  };
  const { useQuery } = loadServer("src/features/contacts/use-query.ts", { globals: { AbortController, Event, window: { dispatchEvent: event => events.push(event.type) }, document: { visibilityState: "visible", querySelector: selector => dirty || busy && selector.includes("aria-busy") ? {} : null } }, modules: { react, "@/lib/api/client": { ApiError, apiGet: (target, schema, signal) => new Promise((resolve, reject) => reads.push({ target, signal, resolve, reject })) }, "@/features/realtime/query-topics": { matchesTopics: () => true }, "@/features/realtime/live-events": { subscribeLive: () => () => {} } } });
  const schema = {};
  function Harness(next = currentPath) { currentPath = next; cursor = 0; const result = useQuery(currentPath, schema); effects.splice(0).forEach(effect => effect()); return result; }
  return { reads, events, setDirty: value => { dirty = value; }, setBusy: value => { busy = value; }, render: Harness, close() { cleanups.forEach(cleanup => cleanup?.()); } };
}

test("Quiet detail and field-metadata failures retain the validated projection while a draft is active", async () => {
  for (const path of [`/api/v1/contacts/${randomUUID()}`, "/api/v1/contacts/metadata"]) {
    const hook = queryHarness(path), original = { value: "Original synthetic projection" };
    try {
      hook.render(); hook.reads[0].resolve(original); await delay(0); assert.equal(hook.render().value, original);
      hook.render().refreshQuietly(); hook.render(); hook.setDirty(true); hook.reads[1].reject(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); await delay(0);
      assert.equal(hook.render().value, original); assert.equal(hook.render().error, undefined); assert.deepEqual(hook.events, ["kay:live-deferred"]);
      hook.setDirty(false); hook.render().refreshQuietly(); hook.render(); const current = { value: "Current synthetic projection" }; hook.reads[2].resolve(current); await delay(0); assert.equal(hook.render().value, current);
    } finally { hook.close(); }
  }
});

test("Current authority loss is never deferred by an active draft or stale metadata", async () => {
  for (const [code, status] of [["UNAUTHENTICATED", 401], ["FORBIDDEN", 403], ["NOT_FOUND", 404]]) {
    const hook = queryHarness("/api/v1/contacts/metadata");
    try {
      hook.render(); hook.reads[0].resolve({ value: "Authorized synthetic projection" }); await delay(0);
      hook.render().refreshQuietly(); hook.render(); hook.setDirty(true); hook.reads[1].reject(new ApiError(code, status)); await delay(0);
      assert.equal(hook.render().value, undefined); assert.equal(hook.render().error.code, code); assert.deepEqual(hook.events, []);
    } finally { hook.close(); }
  }
});

test("Dirty drafts do not hide list failures and explicit hard refresh still clears the current result", async () => {
  const hook = queryHarness("/api/v1/enquiries?page=1"), original = { items: [] };
  try {
    hook.render(); hook.reads[0].resolve(original); await delay(0);
    hook.render().refreshQuietly(); hook.render(); hook.setDirty(true); hook.reads[1].reject(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); await delay(0);
    assert.equal(hook.render().value, undefined); assert.equal(hook.render().error.code, "DEPENDENCY_UNAVAILABLE");
    hook.render().refresh(); assert.equal(hook.render().value, undefined); assert.equal(hook.render().error, undefined);
  } finally { hook.close(); }
});

test("Quiet draft deferral never blocks an initial or different record projection", async () => {
  const first = "/api/v1/contacts/" + randomUUID(), second = "/api/v1/contacts/" + randomUUID(), hook = queryHarness(first);
  try {
    hook.render().refreshQuietly(); hook.render(); hook.setDirty(true);
    const initial = { value: "First authorized synthetic record" }; hook.reads[1].resolve(initial); await delay(0);
    assert.equal(hook.render().value, initial); assert.equal(hook.events.length, 0);
    hook.render().refreshQuietly(); hook.render(second);
    const next = { value: "Different authorized synthetic record" }; hook.reads[2].resolve(next); await delay(0);
    assert.equal(hook.render().value, next); assert.equal(hook.events.length, 0);
  } finally { hook.close(); }
});


test("A pending managed command protects its same-path projection even with no dirty values, but cannot mask authority loss", async () => {
  for (const failure of [null, new ApiError("DEPENDENCY_UNAVAILABLE", 503), new ApiError("FORBIDDEN", 403)]) {
    const hook = queryHarness("/api/v1/visits/" + randomUUID()), original = { version: 1 };
    try {
      hook.render(); hook.reads[0].resolve(original); await delay(0); hook.render();
      hook.setBusy(true); hook.render().refreshQuietly(); hook.render();
      if (failure) hook.reads[1].reject(failure); else hook.reads[1].resolve({ version: 2 });
      await delay(0);
      if (failure?.status === 403) { assert.equal(hook.render().value, undefined); assert.equal(hook.render().error.code, "FORBIDDEN"); }
      else { assert.equal(hook.render().value, original); assert.deepEqual(hook.events, ["kay:live-deferred"]); }
      hook.setBusy(false); hook.render().refreshQuietly(); hook.render(); const current = { version: 3 }; hook.reads[2].resolve(current); await delay(0); assert.equal(hook.render().value, current);
    } finally { hook.close(); }
  }
});
