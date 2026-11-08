import { contactSchema, editContactSchema, newContactSchema, type Contact } from "@/features/contacts/contracts";
import { contactEditReceipt, contactProjectionValid } from "@/features/contacts/contact-edit-intent";
import type { z } from "zod";

export type OwnerFormIntent = { kind: "create"; body: z.infer<typeof newContactSchema> } | { kind: "edit" | "add-role"; id: string; body: z.infer<typeof editContactSchema> } | { kind: "open"; id: string; version: number };
export function ownerFormIntent(value: OwnerFormIntent): OwnerFormIntent | undefined {
  if (value.kind === "create") { const body = newContactSchema.safeParse(value.body); if (body.success && body.data.roles.includes("owner")) return { kind: value.kind, body: body.data }; return; }
  if (!contactSchema.shape.id.safeParse(value.id).success) return;
  if (value.kind === "open") { if (Number.isInteger(value.version) && value.version > 0) return { kind: value.kind, id: value.id, version: value.version }; return; }
  if (value.kind !== "edit" && value.kind !== "add-role") return;
  const body = editContactSchema.safeParse(value.body); if (body.success && body.data.roles.includes("owner")) return { kind: value.kind, id: value.id, body: body.data };
}
export function ownerFormReceipt(intent: Exclude<OwnerFormIntent, { kind: "open" }>, value: unknown, actor: string): Contact | undefined {
  if (intent.kind !== "create") { const contact = contactEditReceipt(intent.id, intent.body, value); return contact && contact.roles.length === intent.body.roles.length && intent.body.roles.every(role => contact.roles.includes(role)) ? contact : undefined; }
  const result = contactSchema.safeParse(value); if (!result.success) return;
  const contact = result.data;
  // Server phone/email normalizers stay authoritative. Bind the generated root
  // to its actual creating actor, intended responsibility and stable identity.
  if (contact.version === 1 && !contact.archived_at && contact.source === "manual" && contact.created_by_user_id === actor && contact.primary_agent.id === (intent.body.primary_agent_id || actor) && contact.name === intent.body.name && contact.type === intent.body.type && contact.roles.includes("owner") && contactProjectionValid(contact)) return contact;
}
