import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { conversionFixture, ConversionApiError as ApiError } from "./conversion-fixtures.mjs";
import { componentHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";

const plain = value => JSON.parse(JSON.stringify(value));
function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; }
const button = (s, action) => find(s.render(), "Button").find(node => node.props.action === action);
const submit = s => find(s.render(), "form")[0].props.onSubmit({ preventDefault() {} });
function prepare(s) { const tree = s.render(); find(tree, "Project")[0].props.choose({ choice: { external_name: "Synthetic selected project" }, label: "Synthetic selected project" }); find(tree, "Budget")[0].props.onChange("1400000"); find(tree, "Checkbox")[0].props.onCheckedChange(true); s.render(); }

test("Conversion owns the opening source/version/project/budget/reasons and same key across interruption/newer converted props", async () => {
  let fail = true; const s = conversionFixture({ command: async () => { if (fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return s.receipt; } }); prepare(s); const before = s.render(); submit(s); submit(s); await delay(0); assert.equal(s.calls.length, 1);
  s.setProps({ enquiry: { ...s.source, version: 99, initial_budget: "9900000" } }); s.query.value = undefined; s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); const tree = s.render();
  find(tree, "Project")[0].props.choose({ choice: { external_name: "Synthetic replacement" }, label: "Synthetic replacement" }); find(tree, "Budget")[0].props.onChange("9900000"); find(tree, "Checkbox")[0].props.onCheckedChange(false);
  find(tree, "AlertDialog")[0].props.onOpenChange(false); let blocked = false; find(tree, "AlertDialogContent")[0].props.onEscapeKeyDown({ preventDefault() { blocked = true; } }); assert.equal(blocked, true); assert.equal(s.closed.length, 0); assert.equal(find(tree, "fieldset")[0].props.disabled, true); assert.equal(button(s, "confirm").props.disabled, false);
  fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1])); assert.equal(s.calls[0][1].expected_version, s.enquiry.version); assert.equal(s.calls[0][1].initial_budget, "1400000"); assert.deepEqual(plain(s.calls[0][1].purchase_reasons), ["residence"]); assert.equal(s.calls[0][1].project.external_name, "Synthetic selected project"); assert.deepEqual(s.navigated, [`/deals/${s.receipt.id}`]);
  find(before, "form")[0].props.onSubmit({ preventDefault() {} }); await delay(0); assert.equal(s.calls.length, 2);
});

test("Acknowledged conversion retries only source/destination proof after a read outage", async () => {
  let fail = true; const s = conversionFixture({ read: async ({ path, source, deal }) => { if (path.includes("/deals/") && fail) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return path.includes("/deals/") ? deal : source; } }); prepare(s); submit(s); await delay(0);
  assert.equal(button(s, "confirm").props.children, "Actualiser le résultat"); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.reads.filter(value => value.path.includes("/deals/")).length, 2); assert.equal(s.navigated.length, 1);
});

test("Acknowledged navigation failure never repeats conversion and completed closing keeps its destination", async () => {
  let fail = true; const s = conversionFixture({ navigate: () => { if (fail) throw Error("Synthetic navigation failure"); } }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 1); fail = false; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 1);
  find(s.render(), "AlertDialog")[0].props.onOpenChange(false); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Link")[0].props.href, `/deals/${s.receipt.id}`);
});

test("Known conversion conflict requires explicit current source read before a fresh reviewed version/key", async () => {
  let conflict = true; const s = conversionFixture({ command: async () => { if (conflict) throw new ApiError("VERSION_CONFLICT", 409); return s.receipt; }, read: async ({ path, source, deal, enquiry }) => path.includes("/deals/") ? deal : conflict ? { ...enquiry, version: 11 } : source }); prepare(s); submit(s); await delay(0); assert.equal(button(s, "confirm").props.disabled, true); submit(s); await delay(0); assert.equal(s.calls.length, 1);
  button(s, "refresh").props.onClick(); await delay(0); assert.equal(find(s.render(), "Budget")[0].props.value, "1400000"); conflict = false; submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[1][1].expected_version, 11); assert.notEqual(s.calls[0][3], s.calls[1][3]); assert.equal(s.navigated.length, 1);
});

test("Conflict refresh ends read-only for canonical, archived or already converted source without retargeting", async () => {
  for (const mode of ["canonical", "archived", "converted"]) {
    const s = conversionFixture({ command: async () => { throw new ApiError("VERSION_CONFLICT", 409); }, read: async ({ source, enquiry }) => mode === "converted" ? source : { ...enquiry, ...(mode === "canonical" ? { contact: { ...enquiry.contact, id: randomUUID() } } : { archived_at: "2026-10-28T13:00:00Z" }) } }); prepare(s); submit(s); await delay(0); button(s, "refresh").props.onClick(); await delay(0); assert.equal(find(s.render(), "form").length, 0); assert.equal(find(s.render(), "Link")[0].props.href, mode === "converted" ? `/deals/${s.receipt.id}` : `/leads/${s.enquiry.id}`); assert.equal(s.calls.length, 1);
  }
});

test("Current canonical source/destination proof permits saved conversion navigation without rewriting the source", async () => {
  const canonical = randomUUID(), s = conversionFixture({ read: async ({ path, source, deal }) => path.includes("/deals/") ? { ...deal, contact: { ...deal.contact, id: canonical } } : { ...source, contact: { ...source.contact, id: canonical } } }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 1);
});

test("Foreign/stale destination or source reads remain read-only recovery and cannot navigate", async () => {
  for (const mode of ["deal-id", "source-id", "version", "contact"]) {
    let valid = false; const s = conversionFixture({ read: async ({ path, source, deal }) => path.includes("/deals/") ? !valid && mode === "deal-id" ? { ...deal, id: randomUUID() } : !valid && mode === "version" ? { ...deal, version: 0 } : !valid && mode === "contact" ? { ...deal, contact: { ...deal.contact, id: randomUUID() } } : deal : !valid && mode === "source-id" ? { ...source, id: randomUUID() } : source }); prepare(s); submit(s); await delay(0); assert.equal(s.navigated.length, 0); assert.equal(button(s, "confirm").props.children, "Actualiser le résultat"); valid = true; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 1);
  }
});

test("A proven foreign conversion receipt retrieves only the same original operation and key", async () => {
  let valid = false; const s = conversionFixture({ read: async ({ path, source, deal }) => path.includes("/deals/") ? { ...deal, enquiry_id: valid ? s.enquiry.id : randomUUID() } : source }); prepare(s); submit(s); await delay(0); assert.equal(s.navigated.length, 0); assert.equal(button(s, "confirm").props.children, "Réessayer la même opération"); valid = true; submit(s); await delay(0); assert.equal(s.calls.length, 2); assert.equal(s.calls[0][3], s.calls[1][3]); assert.deepEqual(plain(s.calls[0][1]), plain(s.calls[1][1])); assert.equal(s.navigated.length, 1);
});

test("Conversion refuses originating actor/role mismatch or restricted identity before dispatch", async () => {
  for (const mode of ["actor", "role", "restricted"]) {
    const actorId = randomUUID(), s = conversionFixture({ actorId, proof: async () => ({ user: { id: mode === "actor" ? randomUUID() : actorId, role: mode === "role" ? "manager" : "agent" }, must_change_password: mode === "restricted" }) }); prepare(s); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(find(s.render(), "Project").length, 0); assert.equal(s.denials[0][0].status, 403);
  }
});

test("Current denial during acknowledged conversion completion masks private context and retains only saved notice", async () => {
  const s = conversionFixture({ read: async () => { throw new ApiError("FORBIDDEN", 403); } }); prepare(s); submit(s); await delay(0); const tree = s.render(); assert.equal(s.calls.length, 1); assert.equal(find(tree, "Project").length, 0); assert.equal(find(tree, "AlertDialogDescription").length, 0); assert.equal(s.denials[0][1], true); assert.ok(find(tree, "p").some(node => node.props.children.startsWith("La conversion est enregistrée.")));
});

test("Conversion proof/retry account replacement cannot send a mutation or complete navigation under another actor", async () => {
  let changed = false; const actorId = randomUUID(), s = conversionFixture({ actorId, proof: async () => ({ user: { id: changed ? randomUUID() : actorId, role: "agent" }, must_change_password: false }), command: async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); } }); prepare(s); submit(s); await delay(0); changed = true; submit(s); await delay(0); assert.equal(s.calls.length, 1); assert.equal(s.navigated.length, 0); assert.equal(find(s.render(), "Project").length, 0);
});

test("Metadata loading/failure retains conversion choices, blocks new submissions and masks current denial", async () => {
  const s = conversionFixture(); prepare(s); s.query.value = undefined; s.query.error = new ApiError("DEPENDENCY_UNAVAILABLE", 503); let tree = s.render(); assert.equal(find(tree, "Project")[0].props.selected.label, "Synthetic selected project"); assert.equal(find(tree, "Budget")[0].props.value, "1400000"); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.equal(button(s, "confirm").props.disabled, true);
  s.query.error = new ApiError("UNAUTHENTICATED", 401); s.render(); tree = s.render(); assert.equal(find(tree, "Project").length, 0); assert.equal(s.denials[0][0].status, 401);
});

test("Disposal or identity replacement aborts conversion and cannot update departed dialog or navigate late", async () => {
  for (const mode of ["dispose", "identity"]) {
    let finish; const s = conversionFixture({ command: () => new Promise(resolve => { finish = resolve; }) }); prepare(s); submit(s); await delay(0); if (mode === "dispose") s.dispose(); else { s.setProps({ actorId: randomUUID() }); s.render(); } finish(s.receipt); await delay(0); assert.equal(s.calls[0][6].aborted, true); assert.equal(s.navigated.length, 0); assert.equal(s.lateUpdates(), 0);
  }
});

test("Conversion requires hydrated project/budget/purchase intent and languages without dispatching invalid drafts", async () => {
  const s = conversionFixture(); submit(s); await delay(0); assert.equal(s.calls.length, 0); assert.ok(find(s.render(), "p").some(node => node.props.role === "alert"));
  const cold = conversionFixture({ hydrated: false }); prepare(cold); submit(cold); await delay(0); assert.equal(cold.calls.length, 0); assert.equal(button(cold, "confirm").props.disabled, true);
  const noLanguages = conversionFixture({ enquiry: { ...s.enquiry, contact: { ...s.enquiry.contact, languages: [] } } }); prepare(noLanguages); submit(noLanguages); await delay(0); assert.equal(noLanguages.calls.length, 0); assert.equal(button(noLanguages, "confirm").props.disabled, true);
});

test("A receipt carrying customer-proposal fields cannot masquerade as a conversion result", async () => {
  let valid = false; const s = conversionFixture({ command: async () => valid ? s.receipt : { ...s.receipt, customer_offer_id: randomUUID(), offer_version: 1 } }); prepare(s); submit(s); await delay(0); assert.equal(s.navigated.length, 0); assert.equal(s.reads.length, 0); valid = true; submit(s); await delay(0); assert.equal(s.calls[0][3], s.calls[1][3]); assert.equal(s.navigated.length, 1);
});

test("Both catalog project pickers propagate current authority denial without granting another scope", () => {
  for (const mode of ["development", "property"]) {
    const h = componentHarness(), denials = [], changes = [], failure = new ApiError("FORBIDDEN", 403), jsx = (type, props, key) => ({ type, props, key });
    const loaded = loadServer("src/features/deals/project-picker.tsx", { modules: { react: h.react, "react/jsx-runtime": { jsx, jsxs: jsx }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/contacts/numbered-pages": { NumberedPages: "Pages" }, "@/features/contacts/use-query": { queryPath: kind => `/api/v1/${kind}`, useQuery: () => ({ error: failure, refresh() {} }) }, "@/features/inventory/development-contracts": { developmentsSchema: {} }, "@/features/inventory/contracts": { propertiesSchema: {} } } });
    const props = { selected: mode === "property" ? { choice: { property_id: randomUUID() }, label: "Synthetic property" } : undefined, choose: value => changes.push(value), denied: value => denials.push(value) };
    const tree = h.render(() => ({ type: loaded.ProjectPicker, props })); assert.equal(find(tree, "Error")[0].props.error.status, 403); assert.equal(denials.length, 1); assert.equal(changes.length, 0);
  }
});
