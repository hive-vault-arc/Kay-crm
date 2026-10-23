"use client";

import Link from "next/link";
import { useState } from "react";
import { ContactIcon, EmailIcon, PhoneIcon } from "@/components/icons";
import { CrmAgent, CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contactSchema } from "@/features/contacts/contracts";
import { ContactTimeline } from "@/features/contacts/contact-history";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { OwnerPortfolio } from "./owner-portfolio";
import { OwnerLoading } from "./owner-loading";

export function OwnerRecord({ id }: { id: string }) {
  const hydrated = useHydrated();
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const [tab, setTab] = useState("current");
  const heading = <PageHeader title="Fiche propriétaire" description="Coordonnées et biens liés à ce contact." route={`/owners/${id}`} icon={ContactIcon} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (!query.value) return <>{heading}<OwnerLoading label="Chargement du propriétaire" /></>;
  const owner = query.value;
  return <div className="crm-record-view record-stack grid min-w-0 gap-5">
    <Button action="back" asChild variant="quiet" className="crm-record-back justify-self-start"><Link href="/owners">Tous les propriétaires</Link></Button>
    <CrmRecordHeader contact={owner} title={owner.name} route={`/owners/${id}`} badges={<CrmStatusBadge state={owner.archived_at ? "archived" : "active"}>{owner.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} actions={!owner.archived_at ? <Button action="edit" asChild variant="outline"><Link href={`/owners/${owner.id}/edit`}>Modifier le propriétaire</Link></Button> : undefined} />
    {owner.id !== id ? <p>Cette fiche a été fusionnée. <Link href={`/owners/${owner.id}`} className="text-link underline">Ouvrir la fiche conservée</Link>.</p> : null}
    <section className="surface grid min-w-0 gap-4" aria-label="Coordonnées du propriétaire"><h2 className="text-section font-medium">Coordonnées</h2><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><PhoneIcon aria-hidden="true" className="size-4" /> Téléphone</dt><dd className="grid gap-1">{owner.phones.map(phone => <a key={phone.number} href={`tel:${phone.number}`} className="inline-flex min-h-control items-center justify-self-start text-link underline">{phone.number}{phone.is_primary ? " (principal)" : ""}</a>)}</dd></div><div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><EmailIcon aria-hidden="true" className="size-4" /> E-mail</dt><dd className="grid gap-1">{owner.emails.length ? owner.emails.map(email => <a key={email.email} href={`mailto:${email.email}`} className="inline-flex min-h-control items-center justify-self-start text-link underline wrap-anywhere">{email.email}</a>) : "Non renseigné"}</dd></div><div><dt className="text-sm text-muted-foreground">Type</dt><dd>{owner.type === "person" ? "Personne" : "Organisation"}</dd></div><div><dt className="text-sm text-muted-foreground">Agent responsable</dt><dd><CrmAgent name={owner.primary_agent.display_name} /></dd></div></dl><Link href={`/contacts/${owner.id}`} className="inline-flex min-h-control items-center justify-self-start text-link underline">Voir la fiche contact complète</Link></section>
    <Tabs value={tab} onValueChange={setTab}><TabsList aria-label="Patrimoine et historique du propriétaire"><TabsTrigger value="current" disabled={!hydrated}>Biens actuels</TabsTrigger><TabsTrigger value="past" disabled={!hydrated}>Anciens biens</TabsTrigger><TabsTrigger value="timeline" disabled={!hydrated}>Historique du contact</TabsTrigger></TabsList><TabsContent value="current"><OwnerPortfolio key={`${owner.id}:current`} id={owner.id} status="current" /></TabsContent><TabsContent value="past"><OwnerPortfolio key={`${owner.id}:past`} id={owner.id} status="past" /></TabsContent><TabsContent value="timeline"><ContactTimeline id={owner.id} archived={Boolean(owner.archived_at)} /></TabsContent></Tabs>
  </div>;
}
