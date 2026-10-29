import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { entryHarness } from "./entry-fixtures.mjs";
import { contactContracts, ownershipContact } from "./ownership-fixtures.mjs";
import { dealContracts, dealFixture, ConversionApiError as ApiError } from "./conversion-fixtures.mjs";

const inventory = loadServer("src/features/inventory/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts } }), requirements = loadServer("src/features/requirements/contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts, "@/features/inventory/contracts": inventory } });
export const stockContracts = loadServer("src/features/inventory/outcome-contracts.ts", { modules: { "@/features/contacts/contracts": contactContracts, "@/features/requirements/contracts": requirements, "./contracts": inventory } });
export const intents = loadServer("src/features/deals/deal-command-intent.ts", { modules: { "./contracts": dealContracts, "@/features/inventory/outcome-contracts": stockContracts } });
export function loadActionCommand(h, { command, read, proof, hydrated = true, ErrorType = ApiError } = {}) {
  const fallback = { user: { id: randomUUID(), role: "manager" }, must_change_password: false }, identity = proof ?? (async () => fallback);
  return loadServer("src/features/deals/use-deal-command.ts", { modules: {
    react: { ...h.react, useLayoutEffect: h.react.useLayoutEffect ?? h.react.useEffect },
    "@/hooks/use-hydrated": { useHydrated: () => hydrated },
    "@/lib/api/client": { ApiError: ErrorType, apiGet: async (...args) => args[0].endsWith("/auth/me") ? identity() : read(...args) },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7].beforeDispatch(await identity()); args[6].throwIfAborted(); args[7].dispatched(); return command(...args); } },
    "@/lib/auth/contracts": { meSchema: {} }, "./contracts": dealContracts, "./deal-command-intent": intents,
  }, globals: { crypto: { randomUUID }, AbortController, structuredClone } });
}
export function actionFixture({ command, read, proof, completed, hydrated = true, dealPatch = {} } = {}) {
  const h = entryHarness(), actorId = randomUUID(), role = "manager", contact = ownershipContact(), summary = contactContracts.contactSummarySchema.parse(Object.fromEntries(Object.keys(contactContracts.contactSummarySchema.shape).map(key => [key, contact[key]]))), deal = dealFixture(summary, actorId, dealPatch), calls = [], reads = [], denials = [], completions = [], receipts = new Map();
  const server = { deal }, props = { id: deal.id, actorId, role }; let commits = 0;
  function commit(path, body, key) {
    if (receipts.has(key)) return receipts.get(key);
    commits++;
    server.deal = dealContracts.dealSchema.parse({ ...server.deal, ...(!path.endsWith("/transition") ? {} : { stage: body.stage }), version: server.deal.version + 1 });
    const proposal = path.includes("customer-offers");
    const receipt = { id: deal.id, version: server.deal.version, customer_offer_id: proposal ? path.endsWith("/customer-offers") ? randomUUID() : path.split("/").at(-1) : null, offer_version: proposal ? (body.expected_deal_version ? body.expected_version + 1 : 1) : null };
    receipts.set(key, receipt); return receipt;
  }
  const hook = loadActionCommand(h, { hydrated, proof: () => proof ? proof({ actorId, role }) : { user: { id: actorId, role }, must_change_password: false }, read: async (path, schema, signal) => { reads.push({ path, signal }); return read ? read({ path, signal, server, deal }) : server.deal; }, command: async (...args) => { calls.push(args); return command ? command({ args, commit: () => commit(args[0], args[1], args[3]), server }) : commit(args[0], args[1], args[3]); } });
  return { ...h, props, actorId, deal, calls, reads, server, denials, completions, commits: () => commits,
    render: () => h.render(() => hook.useDealCommand(props.id, undefined, { actorId: props.actorId, role: props.role, denied: (...args) => denials.push(args), completed: async (...args) => { if (completed) await completed(...args); completions.push(args); } })),
    path: `/api/v1/deals/${deal.id}/transition`, body: { expected_version: deal.version, stage: "visit", reason: "Synthetic reviewed reason" },
  };
}
export { ApiError, dealContracts };
