import type { Contact, ContactFields } from "@/features/contacts/contracts";

export function ownerValues(contact?: Contact): ContactFields {
  return contact ? {
    name: contact.name, type: contact.type,
    phones: contact.phones.map(phone => ({ ...phone })), emails: contact.emails.map(email => ({ ...email })),
    roles: [...new Set([...contact.roles, "owner" as const])],
    country: contact.country, nationality: contact.nationality, languages: [...contact.languages],
  } : { name: "", type: "person", phones: [{ number: "", label: "", is_primary: true }], emails: [], roles: ["owner"], country: "", nationality: "", languages: [] };
}

// Reuse is a versioned role update, never a replacement by the new-contact draft.
export function ownerRoleBody(contact: Contact) {
  return { ...ownerValues(contact), expected_version: contact.version };
}
