"use client";
import Link from "next/link";
import { useState } from "react";
import { CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { InlineEditScope } from "@/components/shared/inline-record-field";
import { PageHeader } from "@/components/shared/page-header";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactTimeline } from "@/features/contacts/contact-history";
import { contactSchema, type StaffRole } from "@/features/contacts/contracts";
import { OwnershipControls } from "@/features/contacts/ownership-controls";
import { RecordError } from "@/features/contacts/record-states";
import { apiGet } from "@/lib/api/client";
import { OwnerDetails } from "./owner-details";
import { OwnerForm } from "./owner-form";
import { OwnerLoading } from "./owner-loading";
import { OwnerPortfolio } from "./owner-portfolio";
import { useOwnerContact } from "./use-owner-contact";

export function OwnerRecord({ id, actorId, role = "agent", initialTab = "overview", initialPortfolio = "current" }: { id: string; actorId?: string; role?: StaffRole; initialTab?: "overview" | "activity"; initialPortfolio?: "current" | "past" }) {
  const owner = useOwnerContact(id), contact = owner.contact;
  const [portfolio, setPortfolio] = useState(initialPortfolio), [visited, setVisited] = useState(() => new Set([initialPortfolio]));
  const [managementNotice, setManagementNotice] = useState("");
  const heading = <PageHeader title="Fiche propriétaire" description="Coordonnées et patrimoine accessible." route={`/owners/${id}`} />;
  if (owner.error) return <>{heading}{managementNotice ? <p role="status">{managementNotice}</p> : null}<RecordError error={owner.error} retry={() => { setManagementNotice(""); owner.retry(); }} /></>;
  if (!contact) return <>{heading}<OwnerLoading label="Chargement du propriétaire" record /></>;
  const editAction = <RecordDrawer className="kay-party-drawer" hideTrigger={Boolean(contact.archived_at)} label="Modifier" action="edit" title="Modifier le propriétaire" description="Coordonnées du contact propriétaire, partagées par ses dossiers.">{(close, done) => <OwnerForm id={contact.id} actorId={actorId} role={role} presentation="drawer" cancel={close} onDenied={(failure, acknowledged) => { setManagementNotice(acknowledged ? "La modification est enregistrée. Les droits d’accès ont changé." : ""); owner.denied(failure); }} onSaved={(_id, value) => { if (value) owner.saved(value); else owner.refresh(); done(); }} />}</RecordDrawer>;
  const managementAction = role !== "agent" ? <RecordDrawer label="Gérer le contact" action="settings" description="Attribution, collaboration et conservation avec aperçu de l’impact.">{(_close, done) => <OwnershipControls embedded contact={contact} role={role} denied={(failure, acknowledged) => { setManagementNotice(acknowledged ? "L’opération est enregistrée. Les droits d’accès ont changé." : ""); owner.denied(failure); }} changed={async (target, _operation, signal) => { const fresh = await apiGet(`/api/v1/contacts/${target}`, contactSchema, signal); if (!signal.aborted) { owner.saved(fresh); done(); } }} />}</RecordDrawer> : undefined;
  return <InlineEditScope><div className="kay-record-page kay-sales-record kay-party-record kay-owner-record-page">
    <CrmRecordHeader contact={contact} title={contact.name} route={`/owners/${id}`} backHref="/owners" reference="Propriétaire" showContact={false} badges={<CrmStatusBadge state={contact.archived_at ? "archived" : "active"}>{contact.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} actions={<Button action="contact" asChild variant="outline"><Link prefetch={false} href={`/contacts/${contact.id}`}>Fiche du contact</Link></Button>} />
    {contact.id !== id ? <p className="mb-3 text-sm">Cette fiche a été fusionnée. <Link prefetch={false} href={`/owners/${contact.id}`} className="inline-flex min-h-control items-center underline">Voir la fiche conservée</Link>.</p> : null}
    {contact.archived_at ? <p role="status" className="mb-3 text-sm text-muted-foreground">Contact archivé : les coordonnées restent en lecture seule.</p> : null}
    {owner.notice ? <p role="status" className="mb-3 text-sm text-success">{owner.notice}</p> : null}
    <RecordWorkspace initialTab={initialTab} label="Rubriques du propriétaire" tabs={[
      { id: "overview", label: "Aperçu", content: <OwnerDetails actorId={actorId} role={role} contact={contact} saved={owner.saved} denied={owner.denied} editAction={editAction} managementAction={managementAction} /> },
      { id: "activity", label: "Activités", content: <ContactTimeline key={contact.id} id={contact.id} archived={Boolean(contact.archived_at)} revision={contact.version} denied={(failure, acknowledged) => { setManagementNotice(acknowledged ? "L’entrée est enregistrée. Les droits d’accès ont changé." : ""); owner.denied(failure); }} /> },
    ]} aside={<RecordSection title="Patrimoine" action={<Button action="inventory" asChild variant="outline"><Link prefetch={false} href="/projects">Projets</Link></Button>}><Tabs value={portfolio} onValueChange={value => { const next = value === "past" ? "past" : "current"; setVisited(current => new Set([...current, next])); setPortfolio(next); }} className="kay-owner-portfolio"><TabsList aria-label="Patrimoine du propriétaire"><TabsTrigger value="current">Biens actuels</TabsTrigger><TabsTrigger value="past">Anciens biens</TabsTrigger></TabsList>{visited.has("current") ? <TabsContent forceMount value="current" hidden={portfolio !== "current"}><OwnerPortfolio compact id={contact.id} status="current" denied={owner.denied} /></TabsContent> : null}{visited.has("past") ? <TabsContent forceMount value="past" hidden={portfolio !== "past"}><OwnerPortfolio compact id={contact.id} status="past" denied={owner.denied} /></TabsContent> : null}</Tabs></RecordSection>} />
  </div></InlineEditScope>;
}
