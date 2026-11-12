import { contactSchema, editContactSchema, type Contact, type ContactFields, type StaffRole } from "./contracts";

export type ContactEditBinding = { actorId?: string; role?: StaffRole };
export type ContactEditBody = ReturnType<typeof editContactSchema.parse>;

export function contactEditValues(contact: Contact): ContactFields {
  return { name: contact.name, type: contact.type, phones: contact.phones.map(value => ({ ...value })), emails: contact.emails.map(value => ({ ...value })), roles: [...contact.roles], country: contact.country, nationality: contact.nationality, birth_date: contact.birth_date, languages: [...contact.languages] };
}

export function contactProjectionValid(value: Contact) {
  const phones = value.phones.filter(item => item.is_primary), emails = value.emails.filter(item => item.is_primary);
  return phones.length === 1 && phones[0].number === value.primary_phone && (value.emails.length ? emails.length === 1 && emails[0].email === value.primary_email : !emails.length && value.primary_email === null);
}

export function contactEditReceipt(id: string, body: ContactEditBody, value: unknown): Contact | undefined {
  const parsed = contactSchema.safeParse(value);
  // Contact commands cache the complete post-edit projection. Server phone/email
  // normalizers remain authoritative; do not guess their output in the client.
  if (parsed.success && parsed.data.id === id && parsed.data.version === body.expected_version + 1 && contactProjectionValid(parsed.data)) return parsed.data;
}
