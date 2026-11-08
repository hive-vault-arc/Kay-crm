import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { loadServer } from "./load-server.mjs";
import { componentHarness, entryHarness } from "./entry-fixtures.mjs";
import { contactContracts } from "./ownership-fixtures.mjs";
import { stockContracts } from "./deal-action-fixtures.mjs";

export const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } });
export const development = loadServer("src/features/inventory/development-contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts, "./contracts": inventory } });
export class ExternalApiError extends Error { constructor(code, status) { super(code); Object.assign(this, { code, status }); } }
export const tick = () => new Promise(resolve => setImmediate(resolve)), jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
export function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type), ...find(node.props?.actions, type), ...find(node.props?.aside, type)]; }
export function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
export function button(view, label) { const value = find(view, "Button").find(node => text(node) === label || node.props["aria-label"] === label); if (!value) throw new Error("MISSING_EXTERNAL_BUTTON: " + label); return value; }
export function recordFixture(root = "properties", kind = "sale", unit = false) {
  const at = "2026-10-29T12:00:00Z", id = randomUUID(), parent = root === "developments" ? id : unit ? randomUUID() : null;
  const offering = inventory.offeringSchema.parse({ id: randomUUID(), property_id: root === "properties" ? id : null, ...(root === "developments" ? { development_id: id } : {}), target_level: root === "properties" ? "property" : "development", kind, state: "available", occupied: false, is_current: true, version: 3, price_mad: "12000.00", currency: "MAD", price_period: kind === "sale" ? null : "year", annual_equivalent_mad: kind === "sale" ? null : "12000.00", conditions: "Synthetic external offering", availability_confirmed_at: at, created_at: at, target: { id, version: 7, development_version: parent ? root === "developments" ? 7 : 11 : null, level: root === "developments" ? "development" : unit ? "unit" : "standalone", reference: "SYN-EXT", label: "Synthetic external target", location: null, category: root === "properties" ? "house" : null, area_sqm: null, rooms: null, development_reference: parent ? "SYN-PARENT" : null, block_code: null, floor_code: null, unit_type_code: null, archived: false } });
  const common = { id, reference: "SYN-EXT", version: 7, location: null, archived_at: null, owners: [], offerings: [offering], created_at: at, updated_at: at };
  return root === "properties" ? inventory.propertySchema.parse({ ...common, category: "house", marketing_name: null, area_sqm: null, listing_details: { amenities: [] }, ...(unit ? { development_id: parent } : {}) }) : development.developmentSchema.parse({ ...common, name: "Synthetic external programme", category: "mixed", unit_count: 1, available_unit_count: 1, developer: { marketing_display: null, contact: null }, briefing_text: null });
}
export function reviewFixture(record) {
  const offering = record.offerings[0]; return { offering_id: offering.id, expected_offering_version: offering.version, expected_target_version: record.version, expected_development_version: offering.target.development_version, expected_stock_fingerprint: "b".repeat(64), conflict: null, effect_count: 1, effects: [{ offering_id: offering.id, kind: offering.kind, target_level: offering.target.level, reference: record.reference, label: "Synthetic stock effect", before: offering.state, after: offering.kind === "sale" ? "sold" : "rented", releases_reservation: false }] };
}
export function externalFixture({ root = "properties", kind = "sale", unit = false, command, read, proof, saved, accept, hydrated = true, role = "manager" } = {}) {
  const h = componentHarness(), actorId = randomUUID(), record = recordFixture(root, kind, unit), offering = record.offerings[0], calls = [], reads = [], publications = [], denials = [], accepted = [], saves = [], receipts = new Map(); let commits = 0, owner;
  const server = { record }, host = { root, id: record.id, actorId, role, available: true, accept: value => { if (accept) accept(value); accepted.push(value); }, denied: (...args) => denials.push(args) };
  const scope = { root, id: record.id, version: record.version, offeringId: offering.id, offeringVersion: offering.version, kind, actorId, role };
  const contexts = { host: { value: host }, busy: { value: value => publications.push(value) } }, react = { ...h.react, useContext: context => context.value };
  const identity = () => proof ? proof({ actorId, role }) : { user: { id: actorId, role }, must_change_password: false };
  const apiGet = async (path, schema, signal) => { if (path.endsWith("/auth/me")) return identity(); reads.push({ path, signal }); const value = read ? await read({ path, signal, server, scope, reviewFixture }) : path.includes("/stock-review?") ? reviewFixture(server.record) : server.record; return schema.parse(value); };
  function commit(body, key) {
    if (receipts.has(key)) return receipts.get(key); commits++;
    const version = server.record.version + 1;
    server.record = { ...server.record, version, offerings: server.record.offerings.map(value => value.id === offering.id ? { ...value, version: value.version + 1, state: value.kind === "sale" ? "sold" : "rented", target: { ...value.target, version, ...(root === "developments" ? { development_version: version } : {}) } } : value) };
    const value = { [root === "properties" ? "property_id" : "development_id"]: record.id, offering_id: body.offering_id, version, event_id: randomUUID() }; receipts.set(key, value); return value;
  }
  const reader = loadServer("src/features/inventory/external-stock-review.ts", { modules: { "@/lib/api/client": { ApiError: ExternalApiError, apiGet }, "./contracts": inventory, "./development-contracts": development, "./outcome-contracts": stockContracts } });
  const hook = loadServer("src/features/inventory/use-external-outcome-command.ts", { modules: { react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError: ExternalApiError, apiGet }, "@/lib/api/command": { apiCommand: async (...args) => { args[7].beforeDispatch(await identity()); args[6].throwIfAborted(); args[7].dispatched(); calls.push(args); const value = command ? await command({ args, server, commit: () => commit(args[1], args[3]) }) : commit(args[1], args[3]); return args[2].parse(value); } }, "@/lib/auth/contracts": { meSchema: {} }, "./contracts": inventory, "./outcome-contracts": stockContracts, "./external-stock-review": reader, "./use-command": { InventoryBusyContext: contexts.busy } }, globals: { crypto: { randomUUID }, AbortController, structuredClone } });
  const ui = loadServer("src/features/inventory/external-outcome.tsx", { modules: { react, "react/jsx-runtime": runtime, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/features/contacts/record-states": { RecordError: "Error" }, "@/components/ui/button": { Button: "Button" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogContent", "AlertDialogTitle", "AlertDialogDescription", "AlertDialogTrigger", "AlertDialogCancel"].map(name => [name, name])), "./outcome-contracts": stockContracts, "./stock-review": { StockReviewFacts: "StockFacts" }, "./record-scope": { InventoryRecordContext: contexts.host }, "./use-external-outcome-command": { useExternalOutcomeCommand: (...args) => owner = hook.useExternalOutcomeCommand(...args) } } });
  const props = { target: root === "developments" ? { ...record, inventoryLevel: "development" } : record, offering, saved: async () => { if (saved) await saved(); saves.push(true); } };
  const render = () => h.render(() => ({ type: ui.ExternalOutcome, props }));
  function HookOnly() { owner = hook.useExternalOutcomeCommand(scope, host); return null; }
  const renderOwner = () => { h.render(() => ({ type: HookOnly, props: {} })); return owner; };
  return { h, actorId, record, offering, server, scope, host, props, calls, reads, publications, denials, accepted, saves, reader, apiGet, render, renderOwner, owner: () => owner, commits: () => commits, dispose: h.dispose, lateUpdates: h.lateUpdates,
    async open() { const view = render(); find(view, "AlertDialog")[0].props.onOpenChange(true); await tick(); return render(); },
    change(type, value) { find(render(), type)[0].props.onChange({ target: { value } }); },
    submit() { find(render(), "form")[0].props.onSubmit({ preventDefault() {} }); },
  };
}
export { stockContracts, contactContracts };

export function inventoryHostFixture(root = "properties") {
  const h = entryHarness(), record = recordFixture(root), actorId = randomUUID(), query = { value: record, error: undefined, refresh() {}, refreshQuietly() {} }, file = `src/features/inventory/${root === "properties" ? "property" : "development"}-record.tsx`;
  const ast = ts.createSourceFile(file, readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), modules = { "react/jsx-runtime": runtime };
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue;
    const clause = statement.importClause, value = modules[statement.moduleSpecifier.text] ??= {};
    if (clause?.name) value.default = "Link";
    for (const item of clause?.namedBindings?.elements ?? []) if (!item.isTypeOnly) value[item.propertyName?.text ?? item.name.text] = item.name.text;
  }
  Object.assign(modules, { react: { ...h.react, useCallback: value => value }, "@/features/contacts/use-query": { useQuery: () => ({ ...query }) }, "./use-command": { InventoryBusyContext: { Provider: "BusyScope" } }, "./record-scope": { InventoryRecordContext: { Provider: "RecordScope" } }, "./contracts": inventory, "./development-contracts": development });
  const loaded = loadServer(file, { modules }), Component = loaded[root === "properties" ? "PropertyRecord" : "DevelopmentRecord"], props = { id: record.id, actorId, role: "manager" };
  return { ...h, record, query, props, render: () => h.render(() => Component(props)) };
}
