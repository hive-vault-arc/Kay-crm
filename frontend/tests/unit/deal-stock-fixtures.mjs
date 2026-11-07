import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { entryHarness } from "./entry-fixtures.mjs";
import { actionFixture, ApiError, dealContracts, stockContracts } from "./deal-action-fixtures.mjs";

const jsx = (type, props, key) => ({ type, props, key }), runtime = { jsx, jsxs: jsx, Fragment: "Fragment" };
export const tick = () => new Promise(resolve => setImmediate(resolve));
export function find(node, type) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(child => find(child, type)); return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)]; }
export function text(node) { return node == null || typeof node === "boolean" ? "" : Array.isArray(node) ? node.map(text).join(" ") : typeof node === "object" ? text(node.props?.children) : String(node); }
export function button(view, label) { const node = find(view, "Button").find(node => text(node) === label); if (!node) throw new Error("MISSING_SYNTHETIC_BUTTON: " + label); return node; }
export function offeringFixture() {
  const propertyId = randomUUID(); return { id: randomUUID(), property_id: propertyId, target_level: "property", kind: "rental", state: "available", occupied: false, is_current: true, version: 3, price_mad: "10000.00", currency: "MAD", price_period: "year", annual_equivalent_mad: "10000.00", conditions: "Synthetic stock conditions", availability_confirmed_at: null, created_at: "2026-10-29T10:00:00Z", target: { id: propertyId, version: 4, development_version: null, level: "standalone", reference: "SYN-STOCK", label: "Synthetic property", location: null, category: "apartment", area_sqm: "90", rooms: 3, development_reference: null, block_code: null, floor_code: null, unit_type_code: null, archived: false }, reservation_conflict: null };
}
export function stockReview(deal) {
  const offering = deal.offering; return { expected_version: deal.version, offering, stock: offering ? { offering_id: offering.id, expected_offering_version: offering.version, expected_target_version: offering.target.version, expected_development_version: offering.target.development_version, expected_stock_fingerprint: "a".repeat(64), conflict: null, effect_count: 1, effects: [{ offering_id: offering.id, kind: offering.kind, target_level: offering.target.level, reference: offering.target.reference, label: offering.target.label, before: offering.state, after: offering.kind === "sale" ? "sold" : "rented", releases_reservation: Boolean(deal.active_reservation) }] } : null };
}
export function stockPanelFixture(kind = "reserve", options = {}) {
  const h = entryHarness(), saved = [], closed = [], reads = []; let s;
  const offering = options.withoutOffering ? null : offeringFixture(), active = kind === "release" ? { id: randomUUID(), created_by_user_id: randomUUID(), created_at: "2026-10-29T10:00:00Z", previous_stage: "visit" } : null;
  if (active) offering.state = "reserved";
  const read = async ({ path, signal, server }) => { reads.push({ path, signal }); if (options.read) return options.read({ path, signal, server, stockReview }); return path.endsWith("stock-review") ? stockReview(server.deal) : server.deal; };
  s = actionFixture({ ...options, dealPatch: { offering, stage: kind === "reopen" ? "lost" : active ? "reserved" : "visit", active_reservation: active, ...options.dealPatch }, read, command: async context => {
    const commit = () => { const before = s.commits(), result = context.commit(); if (s.commits() === before) return result; const stage = kind === "reserve" ? "reserved" : kind === "release" ? "visit" : kind === "reopen" ? "new" : context.args[1].outcome; context.server.deal = { ...context.server.deal, stage, active_reservation: kind === "reserve" ? { id: randomUUID(), created_by_user_id: s.actorId, created_at: "2026-10-29T10:00:00Z", previous_stage: "visit" } : null }; return result; };
    return options.command ? options.command({ ...context, commit }) : commit();
  } });
  const apiGet = async (path, schema, signal) => schema.parse(await read({ path, signal, server: s.server }));
  const reader = loadServer("src/features/deals/deal-stock-review.ts", { modules: { "@/lib/api/client": { ApiError, apiGet }, "@/features/inventory/outcome-contracts": stockContracts, "./contracts": dealContracts } });
  const reviewHook = loadServer("src/features/deals/use-deal-stock-review.ts", { modules: { react: h.react, "@/lib/api/client": { ApiError }, "./deal-stock-review": reader }, globals: { AbortController } });
  const modules = { react: h.react, "react/jsx-runtime": runtime, "@/components/ui/button": { Button: "Button" }, "@/components/ui/label": { Label: "Label" }, "@/components/ui/input": { Input: "Input" }, "@/components/ui/textarea": { Textarea: "Textarea" }, "@/components/ui/native-select": { NativeSelect: "Select" }, "@/components/ui/alert-dialog": Object.fromEntries(["AlertDialog", "AlertDialogContent", "AlertDialogTitle", "AlertDialogDescription", "AlertDialogTrigger", "AlertDialogCancel"].map(name => [name, name])), "@/features/contacts/record-states": { RecordError: "Error" }, "@/features/inventory/contracts": { kindLabels: { rental: "Location" }, stateLabels: { available: "Disponible", reserved: "Réservée" } }, "@/features/inventory/outcome-contracts": stockContracts, "@/features/inventory/stock-review": { StockReviewFacts: "StockFacts" }, "@/features/requirements/offering-card": { targetLabels: { standalone: "Bien indépendant" }, OfferingFacts: "OfferingFacts" }, "@/hooks/use-hydrated": { useHydrated: () => options.hydrated ?? true }, "@/lib/format": { formatInstant: value => value }, "./contracts": dealContracts, "./use-deal-stock-review": reviewHook };
  const isReservation = ["reserve", "release"].includes(kind), file = isReservation ? "reservation-panel" : "outcome-panel", loaded = loadServer(`src/features/deals/${file}.tsx`, { modules }), Component = loaded[isReservation ? "ReservationPanel" : "OutcomePanel"];
  const props = { deal: s.deal, writable: true, dialogOnly: true, busyChanged() {}, saved: async value => { if (options.saved) await options.saved(value); saved.push(value); return value; }, closed: () => closed.push(true), ...(kind === "close" ? { initialOutcome: options.outcome ?? "won" } : {}) };
  const render = () => h.render(() => { const owner = s.render(); return Component({ ...props, busy: owner.busy, error: owner.error, mutate: owner.mutate, recovery: owner }); });
  return { ...s, props, render, owner: s.render, saved, closed, reads, reader, dispose: () => { h.dispose(); s.dispose(); }, lateUIUpdates: h.lateUpdates,
    async ready() { render(); await tick(); render(); await tick(); return render(); },
    change(id, value) { const node = ["Input", "Textarea", "Select"].flatMap(type => find(render(), type)).find(node => node.props.id === id); if (!node) throw new Error("MISSING_SYNTHETIC_FIELD: " + id); node.props.onChange({ target: { value } }); },
    submit() { const view = render(); if (isReservation) find(view, "Button").find(node => node.props.action === (kind === "reserve" ? "reserve" : "release")).props.onClick(); else find(view, "form")[0].props.onSubmit({ preventDefault() {} }); },
  };
}
export { ApiError };
