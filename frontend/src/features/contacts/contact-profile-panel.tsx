import Link from "next/link";
import { ContactIcon, ContactsIcon, EmailIcon, LocationIcon, PhoneIcon, type KayIconComponent } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactAvatar } from "@/components/shared/crm-presentation";
import { languageLabels } from "./qualification-contracts";
import { countryLabel } from "./qualification-inputs";
import type { ContactSummary } from "./contracts";
import type { ReactNode } from "react";

function ProfileFact({ icon: Icon, label, children, action }: { icon: KayIconComponent; label: string; children: ReactNode; action?: ReactNode }) {
  return <div className="crm-profile-fact"><Icon aria-hidden="true" /><div><dt>{label}</dt><dd>{children}</dd></div>{action}</div>;
}

export function ContactProfilePanel({ contact }: { contact: ContactSummary }) {
  return <section data-record-contact aria-label="Contact" className="crm-contact-profile">
    <SectionHeading compact icon={ContactIcon}>Contact</SectionHeading>
    <dl className="crm-profile-primary">
      <ProfileFact icon={ContactIcon} label="Nom du contact"><Link className="inline-flex min-h-control items-center hover:underline" href={`/contacts/${contact.id}`}>{contact.name}</Link></ProfileFact>
      <ProfileFact icon={PhoneIcon} label="Téléphone principal" action={<Button action="phone" asChild variant="outline" size="compact"><a href={`tel:${contact.primary_phone}`}>Appeler</a></Button>}>{contact.primary_phone}</ProfileFact>
      <ProfileFact icon={EmailIcon} label="E-mail principal" action={contact.primary_email ? <Button action="email" asChild variant="outline" size="compact"><a href={`mailto:${contact.primary_email}`}>E-mail</a></Button> : undefined}>{contact.primary_email || "Non renseigné"}</ProfileFact>
    </dl>
    <dl className="crm-profile-secondary">
      <ProfileFact icon={LocationIcon} label="Pays de résidence">{countryLabel(contact.country)}</ProfileFact>
      <ProfileFact icon={LocationIcon} label="Nationalité (pays)">{countryLabel(contact.nationality)}</ProfileFact>
      <ProfileFact icon={ContactIcon} label="Langues parlées">{contact.languages.map(value => languageLabels[value] ?? value).join(", ") || "Non renseignées"}</ProfileFact>
      <ProfileFact icon={PhoneIcon} label="Indicatif téléphonique">{contact.calling_code ?? "Non renseigné"}</ProfileFact>
    </dl>
    <div className="crm-profile-agent"><SectionHeading compact icon={ContactsIcon}>Agent responsable</SectionHeading><div><ContactAvatar size="medium" name={contact.primary_agent.display_name} /><p>{contact.primary_agent.display_name}</p></div><Button action="forward" asChild variant="outline" className="justify-self-start"><Link href={`/contacts/${contact.id}`}>Voir le contact</Link></Button></div>
  </section>;
}
