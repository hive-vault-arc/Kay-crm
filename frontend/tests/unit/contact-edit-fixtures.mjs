import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContact } from "./ownership-fixtures.mjs";
import { ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";

export const contactEdits = loadServer("src/features/contacts/contact-edit-intent.ts", { modules: { "./contracts": contactContracts } });
export function loadContactEditCommand(h, { request, read, identity, hydrated = true, ErrorType = ApiError, contracts = contactContracts }) {
  const intent = contracts === contactContracts ? contactEdits : loadServer("src/features/contacts/contact-edit-intent.ts", { modules: { "./contracts": contracts } });
  return loadServer("src/features/contacts/use-contact-edit-command.ts", { globals: { crypto: { randomUUID }, structuredClone, AbortController }, modules: {
    react: { ...h.react, useLayoutEffect: h.react.useLayoutEffect ?? h.react.useEffect }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} },
    "@/lib/api/client": { ApiError: ErrorType, apiGet: async (path, schema, signal) => path.endsWith("/auth/me") ? identity(signal) : read(path, schema, signal) },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7].beforeDispatch(await identity(args[6])); args[6].throwIfAborted(); args[7].dispatched(); return args[2].parse(await request(...args)); } },
    "./contracts": contracts, "./contact-edit-intent": intent,
  } });
}
export function contactEditFormModules(h, { request, read, contracts = contactContracts, ErrorType = ApiError }) {
  let server;
  const command = loadContactEditCommand(h, { contracts, ErrorType, identity: async () => ({ user: { id: "11111111-1111-4111-8111-111111111111", role: "manager" }, must_change_password: false }),
    request: async (...args) => { try { const value = await request(...args); if (contracts.contactSchema.safeParse(value).success) server = value; return value; } catch (error) { if (contracts.contactSchema.safeParse(error.details?.current).success) server = error.details.current; throw error; } },
    read: async (path, schema, signal) => read ? read(path, schema, signal, server) : schema.parse(server),
  });
  const intent = loadServer("src/features/contacts/contact-edit-intent.ts", { modules: { "./contracts": contracts } });
  return { command, intent };
}
export function contactEditFixture({ source = ownershipContact(), dispatch, read, done, hydrated = true } = {}) {
  const h = entryHarness(), calls = [], reads = [], completions = [], denials = [], cache = new Map(), actorId = randomUUID();
  let server = source, commits = 0, identity = { user: { id: actorId, role: "manager" }, must_change_password: false };
  function commit(args) {
    if (cache.has(args[3])) return cache.get(args[3]);
    const body = args[1]; if (body.expected_version !== server.version) throw new ApiError("VERSION_CONFLICT", 409);
    const { expected_version, ...fields } = body;
    server = contactContracts.contactSchema.parse({ ...server, ...structuredClone(fields), primary_phone: fields.phones.find(value => value.is_primary).number, primary_email: fields.emails.find(value => value.is_primary)?.email ?? null, version: expected_version + 1 });
    commits++; const receipt = structuredClone(server); cache.set(args[3], receipt); return receipt;
  }
  const loaded = loadContactEditCommand(h, { hydrated, identity: async () => identity,
    request: async (...args) => { calls.push(args); return dispatch ? dispatch({ args, commit: () => commit(args), server }) : commit(args); },
    read: async (path, schema, signal) => { reads.push({ path, signal }); return read ? read(path, schema, signal, server) : schema.parse(server); },
  });
  const props = { contact: source, actorId, role: "manager", completed: async value => { completions.push(value); await done?.(value); }, denied: (...args) => denials.push(args) };
  const render = () => h.render(() => loaded.useContactEditCommand(props)); render();
  return { ...h, props, actorId, calls, reads, completions, denials, render, source, body: { ...contactEdits.contactEditValues(source), expected_version: source.version }, server: () => server, commits: () => commits, identity: value => { identity = value; }, setServer: value => { server = value; } };
}
export { ApiError, tick };
