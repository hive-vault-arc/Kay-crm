import { developmentFieldsSchema } from "@/features/inventory/development-contracts";

export function unitProgrammeDraft(reference: string) {
  return developmentFieldsSchema.parse({
    reference, name: "Programme synthétique des unités", category: "mixed", phase: "preparation",
    location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null,
  });
}
