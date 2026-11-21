import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { inventory, development, inventoryHostFixture, find, text, runtime, ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";
import { stockContracts } from "./deal-action-fixtures.mjs";

function fixture({ root = "properties", role = "manager", hydrated = true, command } = {}) {
  const h = componentHarness(), id = randomUUID(), actorId = randomUUID(), calls = [], publications = [], navigations = [], receipts = new Map();
  const host = { value: { actorId, role } }, busy = { value: value => publications.push(value) };
  let identity = { user: { id: actorId, role }, must_change_password: false };
  const loaded = loadServer("src/features/discovery/lifecycle-panel.tsx", {
    modules: {
      react: { ...h.react, useContext: context => context.value }, "react/jsx-runtime": runtime,
      "next/navigation": { useRouter: () => ({ replace: value => navigations.push(value), refresh() {} }) },
      "@/components/ui/button": { Button: "Button" },
      "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogCancel", "AlertDialogTrigger", "AlertDialogContent", "AlertDialogTitle", "AlertDialogDescription"].map(name => [name, name])),
      "@/features/contacts/record-states": { RecordError: "Error" }, "@/hooks/use-hydrated": { useHydrated: () => hydrated },
      "@/lib/api/client": { ApiError }, "@/features/inventory/contracts": inventory,
      "@/features/inventory/record-scope": { InventoryRecordContext: host }, "@/features/inventory/use-command": { InventoryBusyContext: busy },
      "@/lib/api/command": { apiCommand: async (...args) => {
        args[7].beforeDispatch(identity); args[6].throwIfAborted(); args[7].dispatched(); calls.push(args);
        const commit = () => {
          if (!receipts.has(args[3])) receipts.set(args[3], { [root === "properties" ? "property_id" : "development_id"]: id, offering_id: null, version: 8, event_id: randomUUID() });
          return receipts.get(args[3]);
        };
        return args[2].parse(command ? await command({ args, commit }) : commit());
      } },
    }, globals: { AbortController, crypto: { randomUUID } },
  });
  const props = { kind: root, id, reference: "SYN-DELETE", returnHref: "/projects" };
  const render = () => h.render(() => ({ type: loaded.DeleteInventoryButton, props }));
  function button(label) { const node = find(render(), "Button").find(node => text(node).replace(/\s+/g, " ").trim() === label); assert.ok(node, label); return node; }
  render();
  return { ...h, id, actorId, calls, navigations, publications, render, button, receipts, identity: value => { identity = value; },
    open() { find(render(), "AlertDialog")[0].props.onOpenChange(true); render(); },
    async save() { button("Supprimer définitivement").props.onClick(); await tick(); },
    async retry() { button("Réessayer la suppression").props.onClick(); await tick(); },
  };
}

for (const root of ["properties", "developments"]) for (const role of ["agent", "manager", "administrator"]) {
  test(`${root}/${role}: lost deletion acknowledgement replays exactly once and keeps its confirmation open`, async () => {
    let lost = true;
    const s = fixture({ root, role, command: ({ commit }) => { const result = commit(); if (lost) { lost = false; throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } return result; } });
    s.open(); await s.save();
    assert.equal(s.receipts.size, 1); assert.equal(s.navigations.length, 0);
    assert.equal(s.button("Annuler").props.disabled, true);
    find(s.render(), "AlertDialog")[0].props.onOpenChange(false);
    assert.equal(find(s.render(), "AlertDialog")[0].props.open, true);
    let prevented = false; find(s.render(), "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { prevented = true; } }); assert.equal(prevented, true);
    await s.retry();
    assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.receipts.size, 1);
    assert.equal(JSON.stringify(s.calls[0][1]), '{"confirm":true}'); assert.equal(JSON.stringify(s.calls[0][1]), JSON.stringify(s.calls[1][1]));
    assert.equal(s.calls[0][0], `/api/v1/${root}/${s.id}/delete`);
    assert.deepEqual(s.navigations, ["/projects"]); assert.equal(s.publications.at(-1), false);
  });
}

test("Deletion refuses changed accounts, roles and password authority before dispatch", async () => {
  for (const change of [value => ({ ...value, user: { ...value.user, id: randomUUID() } }), value => ({ ...value, user: { ...value.user, role: "manager" } }), value => ({ ...value, must_change_password: true })]) {
    const s = fixture({ role: "agent" }); s.identity(change({ user: { id: s.actorId, role: "agent" }, must_change_password: false })); s.open(); await s.save();
    assert.equal(s.calls.length, 0); assert.equal(s.button("Supprimer définitivement").props.disabled, true); assert.equal(s.navigations.length, 0);
  }
});

test("Deletion blocks duplicate clicks, aborts on unmount and never navigates after disposal", async () => {
  let resolve, signal;
  const s = fixture({ command: ({ args, commit }) => { signal = args[6]; return new Promise(done => { resolve = () => done(commit()); }); } });
  s.open(); const submit = s.button("Supprimer définitivement"); submit.props.onClick(); submit.props.onClick(); await tick(); assert.equal(s.calls.length, 1);
  s.dispose(); assert.equal(signal.aborted, true); resolve(); await tick();
  assert.equal(s.navigations.length, 0); assert.equal(s.lateUpdates(), 0); assert.equal(s.publications.at(-1), false);
});

test("Inventory hosts expose permanent deletion to agents, managers and administrators", () => {
  for (const root of ["properties", "developments"]) {
    const s = inventoryHostFixture(root); const control = find(s.render(), "DeleteInventoryButton")[0];
    assert.equal(control.props.id, s.record.id); assert.equal(control.props.kind, root); assert.ok(control.props.returnHref.startsWith("/projects"));
    for (const role of ["agent", "manager", "administrator"]) { s.props.role = role; assert.equal(find(s.render(), "DeleteInventoryButton").length, 1); }
  }
});

test("Deletion facade requires a true confirmation and a matching root receipt", async () => {
  const origin = "https://crm.synthetic.invalid", calls = []; let result;
  const range = loadServer("src/features/inventory/inventory-range.ts", { modules: { "./contracts": inventory } });
  const facade = loadServer("src/features/inventory/facade.ts", { modules: {
    "./inventory-range": range, "next/headers": { cookies: async () => ({ get: () => ({ value: "synthetic-session" }) }) },
    "@/lib/auth/facade": { boundedJson: request => request.json(), frontendOrigin: () => origin }, "@/lib/auth/contracts": { SESSION_COOKIE: "synthetic-cookie" },
    "@/lib/api/facade": { facadeError: (status, code) => Response.json({ error: { code } }, { status }), upstreamRequest: async (...args) => { calls.push(args); return { status: 200, body: result }; } },
    "@/lib/api/errors": { frenchApiError: code => code }, "./outcome-contracts": stockContracts, "./contracts": inventory, "./development-contracts": development,
  } });
  for (const root of ["properties", "developments"]) {
    const id = randomUUID(), path = `${root}/${id}/delete`, good = { [root === "properties" ? "property_id" : "development_id"]: id, offering_id: null, version: 8, event_id: randomUUID() };
    const request = body => new Request(`${origin}/api/v1/${path}`, { method: "POST", headers: { Origin: origin, "Idempotency-Key": randomUUID() }, body: JSON.stringify(body) });
    for (const bad of [{ ...good, [root === "properties" ? "property_id" : "development_id"]: randomUUID() }, { ...good, offering_id: randomUUID() }]) { result = bad; assert.equal((await facade.relayInventory(path, request({ confirm: true }), randomUUID())).status, 503); }
    result = good; assert.equal((await facade.relayInventory(path, request({ confirm: true }), randomUUID())).status, 200);
    const before = calls.length;
    for (const invalid of [{}, { confirm: false }, { confirm: 1 }, { confirm: true, expected_version: 7 }]) assert.equal((await facade.relayInventory(path, request(invalid), randomUUID())).status, 422);
    assert.equal(calls.length, before);
  }
});
