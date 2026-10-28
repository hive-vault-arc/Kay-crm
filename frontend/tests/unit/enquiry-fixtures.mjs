import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";
import { contactContracts, ownershipContact } from "./ownership-fixtures.mjs";

export function enquiryFixture(patch = {}) {
  const full = ownershipContact(), contact = contactContracts.contactSummarySchema.parse(Object.fromEntries(Object.keys(contactContracts.contactSummarySchema.shape).map(key => [key, full[key]])));
  return contactContracts.enquirySchema.parse({ id: randomUUID(), version: 7, contact, origin_contact_id: contact.id, source: "manual", source_submission_id: null, assigned_agent: contact.primary_agent, received_at: "2026-10-28T12:00:00Z", updated_at: "2026-10-28T12:00:00Z", created_by_user_id: null, status: "new", initial_budget: "1000000", campaign_source: "facebook", rating: "cold", converted_deal_id: null, converted_at: null, archived_at: null, message: "Synthetic original message", ...patch });
}
export function loadEnquiryCommand(h, { ApiError, command, hydrated = true, proof, dispatch = () => true, read, identity = { user: { id: randomUUID(), role: "agent" }, must_change_password: false, csrf_token: "synthetic-csrf" } }) {
  return loadServer("src/features/contacts/use-enquiry-command.ts", { modules: {
    react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated }, "@/lib/auth/contracts": { meSchema: {} }, "./contracts": contactContracts,
    "@/lib/api/client": { ApiError, apiGet: read ?? (async () => proof ? proof() : identity) },
    "@/lib/api/command": { apiCommand: async (...args) => { args[7]?.beforeDispatch?.(proof ? await proof() : identity); if (dispatch()) args[7]?.dispatched?.(); return command(...args); } },
  }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
}
