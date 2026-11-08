import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { entryHarness } from "./entry-fixtures.mjs";
import { contactContracts } from "./ownership-fixtures.mjs";
import { enquiryFixture } from "./enquiry-fixtures.mjs";
import { dealContracts, dealFixture, ConversionApiError as ApiError } from "./conversion-fixtures.mjs";

export { ApiError, contactContracts, dealContracts };
export const lifecycleContract = loadServer("src/features/discovery/record-lifecycle-contract.ts", { modules: { "@/features/contacts/contracts": contactContracts } });
export function lifecycleFixture({ kind = "enquiries", operation = "archive", role = "agent", hydrated = true, dispatch, read, proof, saved, harness } = {}) {
  const h = harness ?? entryHarness(); h.react.useLayoutEffect ??= h.react.useEffect;
  const enquiry = enquiryFixture(), actorId = enquiry.contact.primary_agent.id;
  const source = kind === "enquiries" ? enquiry : dealFixture(enquiry.contact, actorId);
  source.archived_at = operation === "restore" ? "2026-10-28T12:00:00Z" : null;
  let server = structuredClone(source), commits = 0, identity;
  const calls = [], reads = [], saves = [], denials = [], receipts = new Map();
  const currentIdentity = async () => identity ?? (proof ? await proof() : { user: { id: actorId, role }, must_change_password: false });
  const client = { ApiError, apiGet: async (path, schema, signal) => { reads.push(path); if (path.endsWith("/auth/me")) return currentIdentity(); return schema.parse(read ? await read({ path, signal, server: structuredClone(server) }) : server); } };
  const hook = loadServer("src/features/discovery/use-record-lifecycle-command.ts", { modules: { react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": client, "@/lib/auth/contracts": { meSchema: {} }, "@/features/contacts/contracts": contactContracts, "@/features/deals/contracts": dealContracts, "./record-lifecycle-contract": lifecycleContract, "@/lib/api/command": { apiCommand: async (...args) => {
    args[7].beforeDispatch(await currentIdentity()); args[6]?.throwIfAborted(); args[7].dispatched(); calls.push(args);
    const commit = () => { if (!receipts.has(args[3])) { commits++; server = { ...server, version: server.version + 1, archived_at: operation === "archive" ? "2026-10-29T12:00:00Z" : null }; receipts.set(args[3], { id: server.id, version: server.version }); } return receipts.get(args[3]); };
    return args[2].parse(dispatch ? await dispatch({ args, commit, server: structuredClone(server) }) : commit());
  } } }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
  const options = { kind, id: source.id, operation, version: source.version, actorId, role, saved: saved ?? (async (record, signal) => saves.push({ record, signal })), denied: (...args) => denials.push(args) };
  return { h, hook, client, source, options, calls, reads, saves, denials, actorId, render: () => h.render(() => hook.useRecordLifecycleCommand(options)), body: reason => ({ expected_version: 7, reason: reason ?? "Synthetic explicit lifecycle reason" }), server: () => structuredClone(server), update: patch => { server = { ...server, ...patch }; }, identity: value => { identity = value; }, commits: () => commits };
}
