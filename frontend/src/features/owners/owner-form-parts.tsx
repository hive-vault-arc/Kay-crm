"use client";

import Link from "next/link";
import { ContactIcon, EmailIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import type { Contact } from "@/features/contacts/contracts";
import { countryLabel } from "@/features/contacts/qualification-inputs";
import { languageLabels } from "@/features/contacts/qualification-contracts";
import { ownerCategory, ownerCategoryLabels } from "./owner-form-model";

export function OwnerContactSnapshot({ contact }: { contact: Contact }) {
  const owner = contact.roles.includes("owner");
  return <RecordEntry icon={ContactIcon} title={contact.name} status={<Badge variant={contact.archived_at ? "warning" : owner ? "success" : "info"}>{contact.archived_at ? "Contact archivé" : owner ? "Propriétaire" : "Contact existant"}</Badge>} meta={[{ label: "Téléphone principal", value: contact.primary_phone }, { label: "Agent responsable", value: contact.primary_agent.display_name }]}>
    <details><summary className="min-h-control cursor-pointer py-3 text-sm">Voir les coordonnées conservées</summary><RecordFacts>
      <RecordFact icon={ContactIcon} label="Type">{contact.type === "person" ? "Personne" : "Organisation"}</RecordFact>{owner ? <RecordFact icon={ContactIcon} label="Catégorie du propriétaire">{ownerCategoryLabels[ownerCategory(contact.roles)]}</RecordFact> : null}
      <RecordFact icon={PhoneIcon} label="Téléphones"><ul className="grid gap-1">{contact.phones.map(phone => <li className="wrap-anywhere" key={phone.number}>{phone.number}{phone.label ? ` · ${phone.label}` : ""}{phone.is_primary ? " · principal" : ""}</li>)}</ul></RecordFact>
      <RecordFact icon={EmailIcon} label="E-mails">{contact.emails.length ? <ul className="grid gap-1">{contact.emails.map(email => <li className="wrap-anywhere" key={email.email}>{email.email}{email.label ? ` · ${email.label}` : ""}{email.is_primary ? " · principal" : ""}</li>)}</ul> : "Non renseignés"}</RecordFact>
      <RecordFact icon={LocationIcon} label="Pays de résidence">{countryLabel(contact.country)}</RecordFact><RecordFact icon={LocationIcon} label="Nationalité">{countryLabel(contact.nationality)}</RecordFact><RecordFact icon={ContactIcon} label="Langues">{contact.languages.map(language => languageLabels[language]).join(", ") || "Non renseignées"}</RecordFact>
    </RecordFacts></details>
  </RecordEntry>;
}

export function OwnerContactChoice({ contact, change, disabled }: { contact: Contact; change: () => void; disabled: boolean }) {
  return <div className="grid min-w-0 gap-3" aria-live="polite"><OwnerContactSnapshot contact={contact} />
    <p className="text-sm text-muted-foreground">{contact.roles.includes("owner") ? "Ce contact figure déjà parmi les propriétaires. Ouvrez sa fiche pour poursuivre." : "Ce contact sera ajouté aux propriétaires. Son identité, ses coordonnées et son agent seront conservés."}</p>
    {contact.archived_at ? <p className="text-sm text-warning">Ce contact est archivé. Restaurez-le depuis sa fiche avant de l’ajouter aux propriétaires.</p> : null}
    <div className="flex flex-wrap gap-2"><Button action="edit" type="button" variant="outline" disabled={disabled} onClick={change}>Changer de contact</Button><Button action="contact" asChild variant="quiet"><Link prefetch={false} href={`/contacts/${contact.id}`}>Fiche du contact</Link></Button></div>
  </div>;
}
