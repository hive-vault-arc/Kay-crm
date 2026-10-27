"use client";

import Link from "next/link";
import { ContactIcon, EmailIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { type Contact, roleLabels } from "@/features/contacts/contracts";
import { countryLabel } from "@/features/contacts/qualification-inputs";
import { languageLabels } from "@/features/contacts/qualification-contracts";

export function OwnerContactSnapshot({ contact }: { contact: Contact }) {
  return <RecordEntry icon={ContactIcon} title={contact.name} status={<Badge variant={contact.archived_at ? "warning" : contact.roles.includes("owner") ? "success" : "info"}>{contact.archived_at ? "Contact archivé" : contact.roles.includes("owner") ? "Rôle Propriétaire présent" : "Rôle Propriétaire à ajouter"}</Badge>} meta={[{ label: "Téléphone principal", value: contact.primary_phone }, { label: "Agent responsable", value: contact.primary_agent.display_name }]}>
    <details><summary className="min-h-control cursor-pointer py-3 text-sm">Voir les coordonnées et rôles conservés</summary><RecordFacts>
      <RecordFact icon={ContactIcon} label="Type">{contact.type === "person" ? "Personne" : "Organisation"}</RecordFact><RecordFact icon={ContactIcon} label="Rôles">{contact.roles.map(role => roleLabels[role]).join(", ") || "Non renseignés"}</RecordFact>
      <RecordFact icon={PhoneIcon} label="Téléphones"><ul className="grid gap-1">{contact.phones.map(phone => <li className="wrap-anywhere" key={phone.number}>{phone.number}{phone.label ? ` · ${phone.label}` : ""}{phone.is_primary ? " · principal" : ""}</li>)}</ul></RecordFact>
      <RecordFact icon={EmailIcon} label="E-mails">{contact.emails.length ? <ul className="grid gap-1">{contact.emails.map(email => <li className="wrap-anywhere" key={email.email}>{email.email}{email.label ? ` · ${email.label}` : ""}{email.is_primary ? " · principal" : ""}</li>)}</ul> : "Non renseignés"}</RecordFact>
      <RecordFact icon={LocationIcon} label="Pays de résidence">{countryLabel(contact.country)}</RecordFact><RecordFact icon={LocationIcon} label="Nationalité">{countryLabel(contact.nationality)}</RecordFact><RecordFact icon={ContactIcon} label="Langues">{contact.languages.map(language => languageLabels[language]).join(", ") || "Non renseignées"}</RecordFact>
    </RecordFacts></details>
  </RecordEntry>;
}

export function OwnerContactChoice({ contact, change, disabled }: { contact: Contact; change: () => void; disabled: boolean }) {
  return <div className="grid min-w-0 gap-3" aria-live="polite"><OwnerContactSnapshot contact={contact} />
    <p className="text-sm text-muted-foreground">{contact.roles.includes("owner") ? "Ce contact possède déjà le rôle Propriétaire. Ouvrez sa fiche pour poursuivre." : "Seul le rôle Propriétaire sera ajouté. Son identité, ses coordonnées, ses autres rôles et son agent seront conservés. Le serveur vérifie votre droit de modification."}</p>
    {contact.archived_at ? <p className="text-sm text-warning">Ce contact est archivé. Consultez sa fiche pour gérer sa restauration avant de lui ajouter un rôle.</p> : null}
    <div className="flex flex-wrap gap-2"><Button action="edit" type="button" variant="outline" disabled={disabled} onClick={change}>Changer de contact</Button><Button action="contact" asChild variant="quiet"><Link prefetch={false} href={`/contacts/${contact.id}`}>Fiche du contact</Link></Button></div>
  </div>;
}
