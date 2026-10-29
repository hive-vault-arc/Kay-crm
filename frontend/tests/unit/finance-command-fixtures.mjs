import { randomUUID } from "node:crypto";
import { entryHarness } from "./entry-fixtures.mjs";
import { loadServer } from "./load-server.mjs";
import { dealFixture, dealContracts, ConversionApiError as ApiError } from "./conversion-fixtures.mjs";
import { enquiryFixture } from "./enquiry-fixtures.mjs";

export { ApiError, dealContracts };
export const finance = loadServer("src/features/finance/contracts.ts");
export const intentModule = loadServer("src/features/finance/command-intent.ts", { modules: { "./contracts": finance } });
const at = "2026-10-29T12:00:00Z";
export function financeCommission(dealId, actorId, patch = {}) {
  return finance.commissionSchema.parse({ id: randomUUID(), deal_id: dealId, version: 7, current: { id: randomUUID(), version: 7, previous_revision_id: randomUUID(), kind: "fixed", base_mad: "100000.00000000", rate_percent: null, amount_mad: "10000.00", due_on: "2026-11-12", state: "recognized", review_required: false, action: "recognized", reason: "", actor: { id: actorId, display_name: "Synthetic finance manager" }, receipt_id: null, reopening_id: null, created_at: at, created_local: at, calculation_policy: "MAD_FINAL_ROUND_HALF_UP_2" }, collected_mad: "0.00", balance_mad: "10000.00", created_by_user_id: actorId, created_at: at, ...patch });
}
export function financeCommandFixture({ kind = "terms", role = "manager", hydrated = true, dispatch, read, saved, proof } = {}) {
  const h = entryHarness(); h.react.useLayoutEffect = h.react.useEffect;
  const actorId = randomUUID(), parent = dealFixture(enquiryFixture().contact, actorId), source = financeCommission(parent.id, actorId);
  if (kind === "recognize" || kind === "create") { source.current.state = "expected"; source.current.action = "created"; source.balance_mad = null; }
  const body = kind === "create" ? { kind: "fixed", base_mad: "100000", rate_percent: null, amount_mad: "10000", due_on: null, expected_deal_version: 7 } : kind === "recognize" ? { expected_version: 7 } : kind === "terms" ? { target: "commission", expected_version: 7, kind: "percentage", base_mad: "100000.00123456", rate_percent: "1.23456789", amount_mad: null, due_on: "2026-11-12", reason: "Synthetic financial correction" } : kind === "receipt" ? { expected_version: 7, amount_mad: "123.45", received_on: "2026-10-29", evidence_document_id: randomUUID(), reason: "Synthetic receipt" } : { target: "receipt", expected_version: 7, receipt_id: randomUUID(), replacement: { amount_mad: "100.00", received_on: "2026-10-29", evidence_document_id: randomUUID(), reason: "Synthetic replacement" }, reason: "Synthetic receipt correction" };
  const path = kind === "create" ? `/api/v1/deals/${parent.id}/commissions` : `/api/v1/commissions/${source.id}/${kind === "recognize" ? "recognize" : kind === "receipt" ? "receipts" : "correct"}`;
  const calls = [], reads = [], saves = [], denials = [], receipts = new Map(); let server = structuredClone(source), commits = 0, identity;
  const who = async () => identity ?? (proof ? proof() : { user: { id: actorId, role }, must_change_password: false });
  const client = { ApiError, apiGet: async (path, schema, signal) => { reads.push(path); if (path.endsWith("/auth/me")) return who(); return schema.parse(read ? await read({ path, signal, server: structuredClone(server), parent }) : path.includes("/deals/") ? parent : server); } };
  const model = loadServer("src/features/finance/model.ts", { modules: { "@/lib/api/client": client, "@/features/deals/contracts": dealContracts, "./contracts": finance } });
  const owner = loadServer("src/features/finance/use-finance-command.ts", { modules: { react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/api/client": client, "@/lib/auth/contracts": { meSchema: {} }, "./contracts": finance, "./command-intent": intentModule, "./model": model, "@/lib/api/command": { apiCommand: async (...args) => {
    args[7].beforeDispatch(await who()); args[6].throwIfAborted(); args[7].dispatched(); calls.push(args);
    const commit = () => { if (!receipts.has(args[3])) { const draft = args[1], previous = server.current, action = { create: "created", terms: "commission_corrected", recognize: "recognized", receipt: "receipt", "receipt-correct": "receipt_corrected" }[kind], version = kind === "create" ? 1 : server.version + 1, terms = kind === "create" || kind === "terms" ? { kind: draft.kind, base_mad: draft.base_mad, rate_percent: draft.rate_percent, amount_mad: finance.calculatedAmount(draft), due_on: draft.due_on } : {};
      server = finance.commissionSchema.parse({ ...server, id: kind === "create" ? randomUUID() : server.id, version, current: { ...previous, ...terms, id: randomUUID(), version, previous_revision_id: kind === "create" ? null : previous.id, actor: { id: actorId, display_name: "Synthetic finance manager" }, action, state: kind === "create" ? "expected" : "recognized", reason: draft.reason ?? "", receipt_id: kind === "receipt" || kind === "receipt-correct" ? randomUUID() : null } }); commits++; receipts.set(args[3], { id: server.id, version }); } return receipts.get(args[3]); };
    return args[2].parse(dispatch ? await dispatch({ args, commit, server: structuredClone(server) }) : commit());
  } } }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
  const options = { actorId, role, version: 7 }, callbacks = { saved: saved ?? (async result => saves.push(result)), denied: (...args) => denials.push(args), writable: true, verify: undefined };
  return { h, owner, client, model, actorId, parent, source, body, path, calls, reads, saves, denials, options, callbacks, server: () => structuredClone(server), update: value => { server = { ...server, ...value }; }, identity: value => { identity = value; }, commits: () => commits, render: () => h.render(() => owner.useFinanceMutation(parent.id, kind === "create" ? undefined : source.id, callbacks.saved, callbacks.denied, callbacks.verify, callbacks.writable, options)) };
}
