import { randomUUID } from "node:crypto";
import { loadServer } from "./load-server.mjs";

const vocabulary = loadServer("src/features/contacts/qualification-contracts.ts");
export const contactContracts = loadServer("src/features/contacts/contracts.ts", { modules: { "./qualification-contracts": vocabulary } });
export const ownershipContracts = loadServer("src/features/contacts/ownership-contracts.ts", { modules: { "./contracts": contactContracts } });
export function ownershipContact(patch = {}) {
  return contactContracts.contactSchema.parse({ id: randomUUID(), name: "Synthetic ownership contact", type: "person", primary_phone: "+212600000001", primary_email: "synthetic@example.invalid", primary_agent: { id: randomUUID(), display_name: "Synthetic responsible agent" }, phones: [{ number: "+212600000001", label: "Principal", is_primary: true }], emails: [{ email: "synthetic@example.invalid", label: "Principal", is_primary: true }], roles: ["buyer"], country: "MA", calling_code: "+212", nationality: "", languages: ["french"], collaborators: [], version: 7, archived_at: null, created_at: "2026-10-28T12:00:00Z", updated_at: "2026-10-28T12:00:00Z", source: "manual", source_submission_id: null, created_by_user_id: null, ...patch });
}
export function ownershipPreview(contact, intent, survivor) {
  return ownershipContracts.previewSchema.parse({ preview_token: "a".repeat(64), impact: {
    contacts: [contact, ...(survivor ? [survivor] : [])], enquiries: 2, unassigned_enquiries: 0,
    primary_agent_after: intent.operation === "assign" ? { id: intent.primary_agent_id, display_name: "Synthetic new responsible agent" } : survivor?.primary_agent ?? contact.primary_agent,
    phones_after: 1, emails_after: 1, access_lost: [], access_gained: [], retained_collaborators: [], property_owner_links: 0, development_owner_links: 0, developer_links: 0, document_links: 0, requirement_links: 0, deal_links: 0, visit_links: 0, task_links: 0, linked_modules: ["enquiries"],
  } });
}
export function ownershipReceipt(contact, operation, target = contact.id) {
  return ownershipContracts.commandResultSchema.parse({ contact_id: target, version: contact.version + 1, event_id: randomUUID(), operation });
}

export function loadOwnershipCommand(h, { ApiError, request, read = async () => { throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); }, identity = async () => {}, hydrated = true }) {
  return loadServer("src/features/contacts/use-ownership-command.ts", { modules: {
    react: h.react, "@/hooks/use-hydrated": { useHydrated: () => hydrated },
    "@/lib/api/client": { ApiError, apiGet: read }, "./contracts": contactContracts,
    "./ownership-contracts": ownershipContracts,
    "./ownership-client": { ownershipRequest: request, ownershipIdentity: identity },
  }, globals: { AbortController, structuredClone, crypto: { randomUUID } } });
}
