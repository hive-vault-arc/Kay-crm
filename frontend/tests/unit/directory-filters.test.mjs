import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { loadServer } from "./load-server.mjs";

const defaults = { q: "", country: "", from: "", to: "" };

function directory() {
  let cursor = 0;
  const states = [], dependencies = [], cleanup = [], pending = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], next => { states[index] = typeof next === "function" ? next(states[index]) : next; }];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!dependencies[index] || deps.some((value, offset) => !Object.is(value, dependencies[index][offset]))) {
        dependencies[index] = [...deps];
        pending.push(() => { cleanup[index]?.(); cleanup[index] = callback(); });
      }
    },
  };
  const { useDirectoryFilters } = loadServer("src/features/contacts/use-directory-filters.ts", { modules: { react } });
  function Harness() { cursor = 0; const result = useDirectoryFilters(defaults, "from", "to"); pending.splice(0).forEach(effect => effect()); return result; }
  return {
    render: Harness,
    close() { cleanup.forEach(effect => effect?.()); },
  };
}

test("an unchanged initial filter cannot reset a newly selected page", async () => {
  const hook = directory();
  try {
    hook.render().setPage(2); hook.render();
    await delay(450);
    assert.equal(hook.render().page, 2);
  } finally { hook.close(); }
});

test("explicit Apply cancels its pending debounce before later pagination", async () => {
  const hook = directory();
  try {
    hook.render().setDraft({ ...defaults, q: "synthetic" });
    let closed = false;
    hook.render().apply(() => { closed = true; });
    hook.render().setPage(2); hook.render();
    await delay(450);
    assert.equal(closed, true); assert.equal(hook.render().page, 2);
    assert.equal(hook.render().filters.q, "synthetic");
  } finally { hook.close(); }
});

test("a real draft change still debounces and resets the numbered page", async () => {
  const hook = directory();
  try {
    hook.render().setPage(2);
    hook.render().setDraft({ ...defaults, q: "synthetic" }); hook.render();
    await delay(450);
    const result = hook.render();
    assert.equal(result.page, 1); assert.equal(result.filters.q, "synthetic");
    assert.equal(result.activeCount, 1);
  } finally { hook.close(); }
});

test("invalid dates and incomplete country retain the applied page and filters", async () => {
  const hook = directory();
  try {
    hook.render().setPage(2);
    hook.render().setDraft({ ...defaults, country: "M" }); hook.render();
    await delay(450);
    assert.equal(hook.render().page, 2); assert.equal(hook.render().filters.country, "");
    hook.render().setDraft({ ...defaults, from: "2026-11-01", to: "2026-10-01" }); hook.render();
    await delay(450);
    const result = hook.render();
    assert.equal(result.page, 2); assert.equal(result.filters.from, "");
    assert.equal(result.invalid, "La date de début doit précéder la date de fin.");
  } finally { hook.close(); }
});
