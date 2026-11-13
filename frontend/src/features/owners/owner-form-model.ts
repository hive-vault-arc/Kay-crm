import type { Contact, ContactFields } from "@/features/contacts/contracts";

export function ownerValues(contact?: Contact): ContactFields {
  return contact ? {
    name: contact.name, type: contact.type,
    phones: contact.phones.map(phone => ({ ...phone })), emails: contact.emails.map(email => ({ ...email })),
    roles: [...new Set([...contact.roles, "owner" as const])],
    country: contact.country, nationality: contact.nationality, birth_date: contact.birth_date, national_id_number: contact.national_id_number, ...(contact.important_remarks !== undefined ? { important_remarks: contact.important_remarks } : {}), languages: [...contact.languages],
  } : { name: "", type: "person", phones: [{ number: "", label: "", is_primary: true }], emails: [], roles: ["owner"], country: "", nationality: "", languages: [] };
}

export const blankOwnerEmail = { email: "", label: "", is_primary: true };

export function editableOwnerValues(contact?: Contact): ContactFields {
  const values = ownerValues(contact);
  return values.emails.length ? values : { ...values, emails: [{ ...blankOwnerEmail }] };
}

// Reuse is a versioned role update, never a replacement by the new-contact draft.
export function ownerRoleBody(contact: Contact) {
  const values = ownerValues(contact);
  delete values.national_id_number;
  delete values.important_remarks;
  return { ...values, expected_version: contact.version };
}
