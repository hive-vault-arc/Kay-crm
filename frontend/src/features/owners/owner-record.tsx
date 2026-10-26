"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarIcon, ContactIcon, ContactsIcon, EmailIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contactSchema, roleLabels } from "@/features/contacts/contracts";
import { ContactTimeline } from "@/features/contacts/contact-history";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { countryLabel } from "@/features/contacts/qualification-inputs";
import { languageLabels } from "@/features/contacts/qualification-contracts";
import { formatInstant } from "@/lib/format";
import { OwnerPortfolio } from "./owner-portfolio";
import { OwnerLoading } from "./owner-loading";

export function OwnerRecord({ id }: { id: string }) {
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const [portfolio, setPortfolio] = useState("current");
  const heading = <PageHeader title="Fiche propriétaire" description="Coordonnées et patrimoine accessible." route={`/owners/${id}`} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (!query.value) return <>{heading}<OwnerLoading label="Chargement du propriétaire" /></>;
  const owner = query.value;
  return <div className="kay-record-page"><CrmRecordHeader contact={owner} title={owner.name} route={`/owners/${id}`} backHref="/owners" reference="Propriétaire" showContact={false} badges={<CrmStatusBadge state={owner.archived_at ? "archived" : "active"}>{owner.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} actions={<Button action="contact" asChild variant="outline"><Link href={`/contacts/${owner.id}`}>Fiche du contact</Link></Button>} />
    {owner.id !== id ? <p className="mb-3 text-sm">Cette fiche a été fusionnée. <Link href={`/owners/${owner.id}`} className="inline-flex min-h-control items-center underline">Voir la fiche conservée</Link>.</p> : null}
    <RecordWorkspace label="Rubriques du propriétaire" tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <RecordSection title="Coordonnées" action={!owner.archived_at ? <Button action="edit" asChild variant="outline"><Link href={`/owners/${owner.id}/edit`}>Modifier</Link></Button> : undefined}><RecordFacts>
          <RecordFact icon={ContactIcon} label="Type">{owner.type === "person" ? "Personne" : "Organisation"}</RecordFact>
          <RecordFact icon={ContactIcon} label="Rôles">{owner.roles.map(role => roleLabels[role]).join(", ") || "Non renseignés"}</RecordFact>
          <RecordFact icon={PhoneIcon} label="Téléphones">{owner.phones.map(phone => <div key={phone.number}><a href={`tel:${phone.number}`} className="inline-flex min-h-control items-center hover:underline">{phone.number}</a>{phone.is_primary ? " · principal" : ""}{phone.label ? ` · ${phone.label}` : ""}</div>)}</RecordFact>
          <RecordFact icon={EmailIcon} label="E-mails">{owner.emails.length ? owner.emails.map(email => <div key={email.email}><a href={`mailto:${email.email}`} className="inline-flex min-h-control items-center hover:underline">{email.email}</a>{email.label ? ` · ${email.label}` : ""}</div>) : "Non renseignés"}</RecordFact>
          <RecordFact icon={LocationIcon} label="Pays de résidence">{countryLabel(owner.country)}</RecordFact>
          <RecordFact icon={LocationIcon} label="Nationalité">{countryLabel(owner.nationality)}</RecordFact>
          <RecordFact icon={ContactIcon} label="Langues">{owner.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées"}</RecordFact>
        </RecordFacts></RecordSection>
        <RecordSection title="Responsabilité"><RecordFacts>
          <RecordFact icon={ContactsIcon} label="Agent responsable">{owner.primary_agent.display_name}</RecordFact>
          <RecordFact icon={ContactsIcon} label="Collaborateurs">{owner.collaborators.map(person => person.display_name).join(", ") || "Aucun"}</RecordFact>
          <RecordFact icon={CalendarIcon} label="Contact créé le">{formatInstant(owner.created_at)}</RecordFact>
        </RecordFacts></RecordSection>
      </> },
      { id: "activity", label: "Activités", content: <ContactTimeline id={owner.id} archived={Boolean(owner.archived_at)} revision={owner.version} /> },
    ]} aside={<RecordSection title="Patrimoine"><Tabs value={portfolio} onValueChange={setPortfolio} className="kay-owner-portfolio"><TabsList aria-label="Patrimoine du propriétaire"><TabsTrigger value="current">Biens actuels</TabsTrigger><TabsTrigger value="past">Anciens biens</TabsTrigger></TabsList><TabsContent forceMount value="current" hidden={portfolio !== "current"}><OwnerPortfolio compact id={owner.id} status="current" /></TabsContent><TabsContent forceMount value="past" hidden={portfolio !== "past"}><OwnerPortfolio compact id={owner.id} status="past" /></TabsContent></Tabs></RecordSection>} />
  </div>;
}
