import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { inventory, development, ExternalApiError } from "./external-stock-fixtures.mjs";

export const recordIntents = loadServer("src/features/inventory/record-command-intent.ts", { modules: { "./contracts": inventory, "./development-contracts": development } });
// Field-oriented fixtures supply receipt overrides; required receipt metadata and
// the subsequent server projection follow the submitted parent/offering counters.
export function loadRecordCommand(h, { source, ErrorType = ExternalApiError, command, dispatch, completeRead, hydrated = true, role = "manager", proof } = {}) {
  const root = source.inventoryLevel === "development" || "name" in source ? "developments" : "properties", actorId = randomUUID(), publications = [], denials = [], accepted = [], receipts = new Map(); let commits = 0, server = { ...source }; delete server.inventoryLevel;
  const host = { root, id: source.id, actorId, role, available: true, denied: (...args) => denials.push(args), accept: value => accepted.push(value) }, identity = proof ?? (async () => ({ user: { id: actorId, role }, must_change_password: false }));
  const context = { host: { value: host }, busy: { value: value => publications.push(value) } }, react = { ...h.react, useContext: value => value.value, useLayoutEffect: h.react.useLayoutEffect ?? h.react.useEffect };
  function applied(args, receipt) {
    const body = args[1], target = "property_id" in receipt ? receipt.property_id : receipt.development_id;
    if (target !== source.id) return;
    commits++; server = { ...server, version: receipt.version };
    if (root === "developments" && args[0] === `/api/v1/developments/${source.id}` && args[4] === "PATCH") {
      const contactId = body.developer_contact_id, display = body.developer_marketing_display, fields = { ...body }; delete fields.expected_version; delete fields.developer_contact_id; delete fields.developer_marketing_display;
      server = { ...server, ...fields, developer: { marketing_display: display, contact: Object.hasOwn(body, "developer_contact_id") ? contactId ? { id: contactId, name: "Synthetic selected developer" } : null : server.developer.contact } };
    }
    if (body.owners) server.owners = body.owners.map(value => ({ contact: { id: value.contact_id, name: source.owners.find(owner => owner.contact?.id === value.contact_id)?.contact?.name ?? "Synthetic current legal owner" }, marketing_display: value.marketing_display }));
    if (receipt.offering_id) {
      const previous = server.offerings.find(value => value.id === receipt.offering_id), confirmation = args[0].endsWith("confirm-availability");
      const offering = { ...(previous ?? { id: receipt.offering_id, property_id: root === "properties" ? source.id : null, ...(root === "developments" ? { development_id: source.id } : {}), target_level: root === "properties" ? "property" : "development", occupied: false, is_current: true, annual_equivalent_mad: null, availability_confirmed_at: null, created_at: "2026-10-29T12:00:00Z" }), kind: body.kind ?? previous?.kind, price_mad: Object.hasOwn(body, "price_mad") ? body.price_mad : previous?.price_mad ?? null, currency: "MAD", price_period: Object.hasOwn(body, "price_period") ? body.price_period : previous?.price_period ?? null, conditions: body.conditions ?? previous?.conditions ?? "", state: confirmation ? "available" : body.state ?? "draft", version: args[0].startsWith("/api/v1/offerings/") ? body.expected_version + 1 : confirmation ? body.expected_offering_version + 1 : 1 };
      server.offerings = [...server.offerings.filter(value => value.id !== receipt.offering_id), offering];
    }
  }
  const loaded = loadServer("src/features/inventory/use-record-command.ts", { modules: { react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": { ApiError: ErrorType, apiGet: async (path, schema, signal) => path.endsWith("/auth/me") ? identity() : completeRead ? completeRead(path, schema, signal, server) : schema.parse(server) }, "@/lib/api/command": { apiCommand: async (...args) => {
    args[7].beforeDispatch(await identity()); args[6].throwIfAborted(); args[7].dispatched();
    const body = args[1], offering = args[0] === "/api/v1/offerings" ? randomUUID() : args[0].startsWith("/api/v1/offerings/") ? args[0].split("/").at(-1) : args[0].endsWith("confirm-availability") ? body.offering_id : null;
    const receipt = { [root === "properties" ? "property_id" : "development_id"]: source.id, offering_id: offering, version: (body.expected_property_version ?? body.expected_development_version ?? body.expected_version) + 1, event_id: randomUUID() };
    const commit = () => { if (!receipts.has(args[3])) { applied(args, receipt); receipts.set(args[3], receipt); } return receipts.get(args[3]); };
    if (dispatch) return args[2].parse(await dispatch({ args, commit, server: () => server }));
    const override = command ? await command(...args) : undefined, parsed = args[2].parse({ ...receipt, ...override });
    if (!receipts.has(args[3])) { applied(args, parsed); receipts.set(args[3], parsed); } return receipts.get(args[3]);
  } }, "@/lib/auth/contracts": { meSchema: {} }, "./contracts": inventory, "./development-contracts": development, "./record-scope": { InventoryRecordContext: context.host }, "./use-command": { InventoryBusyContext: context.busy }, "./record-command-intent": recordIntents }, globals: { crypto: { randomUUID }, AbortController, structuredClone } });
  return { ...loaded, host, publications, denials, accepted, commits: () => commits, server: () => server };
}
