import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContact } from "./ownership-fixtures.mjs";
import { contactEdits } from "./contact-edit-fixtures.mjs";
import { ExternalApiError as ApiError, tick } from "./external-stock-fixtures.mjs";

export const ownerModel = loadServer("src/features/owners/owner-form-model.ts");
export const ownerIntent = loadServer("src/features/owners/owner-form-intent.ts", { modules: { "@/features/contacts/contracts": contactContracts, "@/features/contacts/contact-edit-intent": contactEdits } });
export function loadOwnerFormCommand(h, { request, read, identity, hydrated = true, contracts = contactContracts, ErrorType = ApiError }) {
  const edits = loadServer("src/features/contacts/contact-edit-intent.ts", { modules: { "./contracts": contracts } }), intent = loadServer("src/features/owners/owner-form-intent.ts", { modules: { "@/features/contacts/contracts": contracts, "@/features/contacts/contact-edit-intent": edits } });
  return loadServer("src/features/owners/use-owner-form-command.ts", { globals: { crypto: { randomUUID }, AbortController, structuredClone }, modules: {
    react: { ...h.react, useLayoutEffect: h.react.useLayoutEffect ?? h.react.useEffect }, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} }, "@/features/contacts/contracts": contracts, "@/features/contacts/contact-edit-intent": edits, "./owner-form-intent": intent,
    "@/lib/api/client": { ApiError: ErrorType, apiGet: async (path, schema, signal) => path.endsWith("/auth/me") ? identity(signal) : read(path, schema, signal) },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7].beforeDispatch(await identity(args[6])); args[6].throwIfAborted(); args[7].dispatched(); return args[2].parse(await request(...args)); } },
  } });
}
export function ownerFixture({ kind = "edit", role = "manager", source = ownershipContact(), dispatch, read, done, hydrated = true } = {}) {
  const h = entryHarness(), actorId = randomUUID(), receipts = new Map(), calls = [], reads = [], completed = [], denied = []; let server = source, commits = 0, identity = { user: { id: actorId, role }, must_change_password: false };
  const intent = kind === "create" ? { kind, body: { ...ownerModel.ownerValues(source), ...(role === "agent" ? {} : { primary_agent_id: source.primary_agent.id }) } } : kind === "open" ? { kind, id: source.id, version: source.version } : { kind, id: source.id, body: ownerModel.ownerRoleBody(source) };
  function commit(args) {
    if (receipts.has(args[3])) return receipts.get(args[3]); const { expected_version, primary_agent_id, ...fields } = args[1];
    if (args[4] === "PATCH" && expected_version !== server.version) throw new ApiError("VERSION_CONFLICT", 409);
    server = contactContracts.contactSchema.parse({ ...server, ...structuredClone(fields), ...(args[4] === "POST" ? { id: randomUUID(), version: 1, source: "manual", source_submission_id: null, created_by_user_id: actorId, primary_agent: { id: primary_agent_id || actorId, display_name: "Synthetic current responsible agent" } } : { version: expected_version + 1 }), primary_phone: fields.phones.find(value => value.is_primary).number, primary_email: fields.emails.find(value => value.is_primary)?.email ?? null });
    commits++; const result = structuredClone(server); receipts.set(args[3], result); return result;
  }
  const loaded = loadOwnerFormCommand(h, { hydrated, identity: async () => identity, request: async (...args) => { calls.push(args); return dispatch ? dispatch({ args, commit: () => commit(args), server }) : commit(args); }, read: async (path, schema, signal) => { reads.push({ path, signal }); return read ? read(path, schema, signal, server) : schema.parse(server); } });
  const props = { contact: kind === "edit" ? source : undefined, subject: kind === "create" ? undefined : source, actorId, role, available: true, denied: (...args) => denied.push(args) }, saved = async (value, signal) => { completed.push(value); await done?.(value, signal); }, render = () => h.render(() => loaded.useOwnerFormCommand(props)); render();
  return { ...h, props, actorId, intent, source, calls, reads, completed, denied, saved, render, server: () => server, setServer: value => { server = value; }, commits: () => commits, identity: value => { identity = value; } };
}
export { ApiError, tick, ownershipContact };
