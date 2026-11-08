import { createHash, randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { contactContracts } from "./ownership-fixtures.mjs";
import { ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";

export const policyContracts = loadServer("src/features/schedule/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } });
export const policyIntent = loadServer("src/features/schedule/policy-command-intent.ts", { modules: { "./contracts": policyContracts } });
export const policySource = () => policyContracts.policySchema.parse({ version: 9, time_zone: "Africa/Casablanca", company_car_capacity_per_hour: 2, working_windows: [{ weekday: 1, start_local: "09:00", end_local: "12:00" }, { weekday: 1, start_local: "14:00", end_local: "18:00" }], lunch_breaks: [{ weekday: 1, start_local: "12:00", end_local: "14:00" }] });
export function previewForPolicy(body) {
  const { expected_version, ...fields } = policyContracts.policyEditSchema.parse(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "preview_hash")));
  return policyContracts.policyPreviewSchema.parse({ policy: { ...fields, version: expected_version + 1, time_zone: "Africa/Casablanca" }, affected: [], affected_total: 0, preview_hash: createHash("sha256").update(JSON.stringify(body)).digest("hex") });
}
export function loadPolicyCommand(h, { request, read, identity, hydrated = true, ErrorType = ApiError, contracts = policyContracts }) {
  const intent = loadServer("src/features/schedule/policy-command-intent.ts", { modules: { "./contracts": contracts } });
  return loadServer("src/features/schedule/use-policy-command.ts", { globals: { crypto: { randomUUID }, structuredClone, AbortController }, modules: {
    react: { ...h.react, useLayoutEffect: h.react.useLayoutEffect ?? h.react.useEffect }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} },
    "@/lib/api/client": { ApiError: ErrorType, apiGet: async (path, schema, signal) => path.endsWith("/auth/me") ? identity(signal) : read(path, schema, signal) },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7].beforeDispatch(await identity(args[6])); args[6].throwIfAborted(); args[7].dispatched?.(); return args[2].parse(await request(...args)); } },
    "./contracts": contracts, "./policy-command-intent": intent,
  } });
}
export function policyFixture({ source = policySource(), dispatch, read, done, hydrated = true } = {}) {
  const h = entryHarness(), calls = [], reads = [], completed = [], denied = [], receipts = new Map(), actorId = randomUUID();
  let server = source, commits = 0, identity = { user: { id: actorId, role: "administrator" }, must_change_password: false };
  function response(args) {
    if (args[4] === "POST") return previewForPolicy(args[1]);
    if (receipts.has(args[3])) return receipts.get(args[3]);
    if (args[1].expected_version !== server.version) throw new ApiError("VERSION_CONFLICT", 409);
    const value = previewForPolicy(args[1]); value.preview_hash = args[1].preview_hash; server = value.policy; commits++; receipts.set(args[3], value); return value;
  }
  const loaded = loadPolicyCommand(h, { hydrated, identity: async () => identity,
    request: async (...args) => { calls.push(args); return dispatch ? dispatch({ args, respond: () => response(args), server }) : response(args); },
    read: async (path, schema, signal) => { reads.push({ path, signal }); return read ? read(path, schema, signal, server) : schema.parse(server); },
  });
  const props = { initial: source, actorId, available: true, saved: async (value, signal) => { completed.push(value); await done?.(value, signal); }, denied: (...args) => denied.push(args) }, body = { company_car_capacity_per_hour: source.company_car_capacity_per_hour, working_windows: source.working_windows, lunch_breaks: source.lunch_breaks, expected_version: source.version };
  const render = () => h.render(() => loaded.usePolicyCommand(props)); render();
  return { ...h, props, body, calls, reads, completed, denied, render, actorId, source, server: () => server, setServer: value => { server = value; }, commits: () => commits, identity: value => { identity = value; } };
}
export { ApiError, tick };
