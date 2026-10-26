import Link from "next/link";
import { ContactIcon, ContactsIcon, EmailIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection } from "@/components/shared/record-workspace";
import { languageLabels } from "./qualification-contracts";
import { countryLabel } from "./qualification-inputs";
import type { ContactSummary } from "./contracts";

export function ContactProfilePanel({ contact }: { contact: ContactSummary }) {
  return <RecordSection title="Contact" action={<Button action="contact" asChild variant="outline"><Link href={`/contacts/${contact.id}`}>Voir le contact</Link></Button>}><RecordFacts>
    <RecordFact icon={ContactIcon} label="Nom">{contact.name}</RecordFact>
    <RecordFact icon={ContactsIcon} label="Agent responsable">{contact.primary_agent.display_name}</RecordFact>
    <RecordFact icon={PhoneIcon} label="Téléphone"><a className="inline-flex min-h-control items-center hover:underline" href={`tel:${contact.primary_phone}`}>{contact.primary_phone}</a></RecordFact>
    <RecordFact icon={EmailIcon} label="E-mail">{contact.primary_email ? <a className="inline-flex min-h-control items-center hover:underline" href={`mailto:${contact.primary_email}`}>{contact.primary_email}</a> : "Non renseigné"}</RecordFact>
  </RecordFacts><details className="kay-contact-more"><summary>Autres coordonnées</summary><RecordFacts>
    <RecordFact icon={LocationIcon} label="Pays de résidence">{countryLabel(contact.country)}</RecordFact>
    <RecordFact icon={LocationIcon} label="Nationalité">{countryLabel(contact.nationality)}</RecordFact>
    <RecordFact icon={ContactIcon} label="Langues parlées">{contact.languages.map(value => languageLabels[value] ?? value).join(", ") || "Non renseignées"}</RecordFact>
    <RecordFact icon={PhoneIcon} label="Indicatif">{contact.calling_code ?? "Non renseigné"}</RecordFact>
  </RecordFacts></details></RecordSection>;
}
