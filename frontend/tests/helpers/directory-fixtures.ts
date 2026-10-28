import { newEnquirySchema } from "@/features/contacts/contracts";

// Validate synthetic browser fixture payloads against the real facade contract
// before issuing a command. These are never development/customer records.
export function directoryLeadDraft(name: string, phone: string, options: { primaryAgentId?: string; assignedAgentId?: string } = {}) {
  return newEnquirySchema.parse({
    new_contact: {
      name, type: "person", phones: [{ number: phone, label: "", is_primary: true }],
      emails: [], roles: ["buyer"], country: "MA", languages: ["french"],
      ...(options.primaryAgentId ? { primary_agent_id: options.primaryAgentId } : {}),
    },
    message: "Demande synthétique de réconciliation", source: "phone", initial_budget: "500000", campaign_source: "facebook",
    ...(options.assignedAgentId ? { assigned_agent_id: options.assignedAgentId } : {}),
  });
}
