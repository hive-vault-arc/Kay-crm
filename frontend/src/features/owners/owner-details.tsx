"use client";
import type { ReactNode } from "react";
import { CalendarIcon, ContactIcon, ContactsIcon, EmailIcon, FileIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { ImportantRemarks } from "@/components/shared/important-remarks";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection } from "@/components/shared/record-workspace";
import { ContactInlineField } from "@/features/contacts/contact-inline-field";
import { roleLabels, type Contact } from "@/features/contacts/contracts";
import { formatInstant } from "@/lib/format";
import type { ApiError } from "@/lib/api/client";
import type { ContactEditBinding } from "@/features/contacts/contact-edit-intent";

export function OwnerDetails({ contact, compact = false, saved, denied, editAction, managementAction, actorId, role }: {
  contact: Contact; compact?: boolean; saved: (value: Contact) => void; denied: (error: ApiError) => void; editAction?: ReactNode; managementAction?: ReactNode;
} & ContactEditBinding) {
  const inline = { contact, saved, denied, actorId, role, writable: !contact.archived_at };
  const methods = (field: "phones" | "emails", primary: boolean) => {
    const values = field === "phones" ? contact.phones.filter(item => item.is_primary === primary).map(item => `${item.number}${item.label ? ` · ${item.label}` : ""}`) : contact.emails.filter(item => item.is_primary === primary).map(item => `${item.email}${item.label ? ` · ${item.label}` : ""}`);
    return <span className="whitespace-pre-wrap">{values.join("\n") || (primary ? "Non renseigné" : "Aucun")}</span>;
  };
  return <>
    {!compact && contact.important_remarks ? <ImportantRemarks value={contact.important_remarks} /> : null}
    <RecordSection title="Coordonnées" action={editAction}><RecordFacts>
      <ContactInlineField {...inline} icon={ContactIcon} field="name" label="Nom complet" />
      <ContactInlineField {...inline} icon={PhoneIcon} field="phones" phoneAction="whatsapp" methodScope="primary" label="Téléphone principal" display={methods("phones", true)} />
      <ContactInlineField {...inline} icon={EmailIcon} field="emails" methodScope="primary" label="E-mail principal" display={methods("emails", true)} />
      <ContactInlineField {...inline} icon={ContactIcon} field="languages" label="Langues" />
      {!compact ? <>
        <ContactInlineField {...inline} icon={LocationIcon} field="country" label="Pays de résidence" />
        <ContactInlineField {...inline} icon={LocationIcon} field="nationality" label="Nationalité" />
        {contact.type === "person" ? <>
          <ContactInlineField {...inline} icon={CalendarIcon} field="birth_date" label="Date de naissance" />
          <RecordFact icon={FileIcon} label="Numéro de carte nationale (CIN)">{contact.national_id_number ? `•••• ${contact.national_id_number.slice(-2)}` : "Non renseigné"}</RecordFact>
        </> : null}
        <ContactInlineField {...inline} icon={PhoneIcon} field="phones" phoneAction="whatsapp" methodScope="secondary" label="Téléphones secondaires" display={methods("phones", false)} />
        <ContactInlineField {...inline} icon={EmailIcon} field="emails" methodScope="secondary" label="E-mails secondaires" display={methods("emails", false)} />
      </> : null}
    </RecordFacts></RecordSection>
    <RecordSection title="Gestion du contact" action={managementAction}><RecordFacts>
      <ContactInlineField {...inline} icon={ContactIcon} field="type" label="Type" />
      <RecordFact icon={ContactsIcon} label="Agent responsable">{contact.primary_agent.display_name}</RecordFact>
      {!compact ? <>
        <RecordFact icon={ContactIcon} label="Rôles">{contact.roles.map(role => roleLabels[role]).join(", ") || "Non renseignés"}</RecordFact>
        <RecordFact icon={ContactsIcon} label="Collaborateurs">{contact.collaborators.map(person => person.display_name).join(", ") || "Aucun"}</RecordFact>
        <RecordFact icon={CalendarIcon} label="Contact créé le">{formatInstant(contact.created_at)}</RecordFact>
      </> : null}
    </RecordFacts></RecordSection>
  </>;
}
