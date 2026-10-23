"use client";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { contactSchema, roleLabels, contactSourceLabels as sourceLabels, type Contact, type StaffRole } from "./contracts";
import { useQuery } from "./use-query";
import { currentRecord } from "@/features/realtime/current-record";
import { RecordError } from "./record-states";
import { ContactEditor } from "./contact-editor";
import { LeadList } from "./lead-list";
import { ContactAssignments, ContactTimeline } from "./contact-history";
import { OwnershipControls } from "./ownership-controls";
import { operationLabels, type Operation } from "./ownership-contracts";
import { FilePanel } from "@/features/files/file-panel";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { DealList } from "@/features/deals/deal-list";
import { TaskPanel } from "@/features/work/task-panel";

export function ContactRecord({ id, role, actorId, initialTask }: { id: string; role: StaffRole; actorId?: string; initialTask?: string }) {
  const hydrated = useHydrated();
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const [edited, setEdited] = useState<Contact>();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState(initialTask ? "tasks" : "identity");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const contact = currentRecord(query.value, edited, id);
  async function changed(target: string, operation: Operation) {
    const fresh = await apiGet(`/api/v1/contacts/${target}`, contactSchema);
    if (target === id) setEdited(fresh);
    else { setEdited(undefined); query.refreshQuietly(); }
    setSaved(false); setNotice(`${operationLabels[operation]} : opération enregistrée.`);
  }
  const heading = <PageHeader title="Fiche contact" description="Identité, coordonnées et demandes dans votre périmètre." route={`/contacts/${id}`} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (!contact) return <>{heading}<p role="status">Chargement du contact…</p></>;
  return <div className="record-stack grid min-w-0 gap-5">
    <PageHeader title={<><span className="sr-only">Contact : </span>{contact.name}</>} description="Fiche contact · Identité, coordonnées et demandes dans votre périmètre." route={`/contacts/${id}`} actions={!contact.archived_at && !editing ? <Button action="edit" disabled={!hydrated} onClick={() => { setTab("identity"); setEditing(true); setSaved(false); }}>Modifier le contact</Button> : undefined} />
    <div><Badge variant={contact.archived_at ? "neutral" : "success"}>{contact.archived_at ? "Contact archivé" : "Contact actif"}</Badge></div>
    {contact.id !== id ? <p>Cette ancienne fiche a été fusionnée. Vous consultez la <Link className="inline-flex min-h-control items-center text-link underline" href={`/contacts/${contact.id}`}>fiche conservée</Link>.</p> : null}
    {contact.archived_at ? <p role="status" className="text-muted-foreground">Contact archivé. Les liens et les auteurs sont conservés. Restaurez-le pour reprendre les modifications.</p> : null}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Rubriques du contact">
        <TabsTrigger value="identity" disabled={!hydrated}>Identité</TabsTrigger>
        <TabsTrigger value="enquiries" disabled={!hydrated}>Demandes</TabsTrigger>
        <TabsTrigger value="timeline" disabled={!hydrated}>Historique</TabsTrigger>
        <TabsTrigger value="assignments" disabled={!hydrated}>Attributions</TabsTrigger>
        <TabsTrigger value="documents" disabled={!hydrated}>Documents</TabsTrigger>
        <TabsTrigger value="requirements" disabled={!hydrated}>Recherches</TabsTrigger>
        <TabsTrigger value="deals" disabled={!hydrated}>Affaires</TabsTrigger>
        <TabsTrigger value="tasks" disabled={!hydrated}>Tâches</TabsTrigger>
      </TabsList>
      <TabsContent value="identity" className="grid gap-8">
    {editing ? <section className="grid gap-6"><h2 className="text-section font-medium">Modifier l’identité</h2><ContactEditor contact={contact} saved={value => { setEdited(value); setEditing(false); setSaved(true); }} cancel={() => setEditing(false)} /></section> : <section className="grid max-w-reading gap-6"><h2 className="wrap-anywhere text-section font-medium">{contact.name}</h2>{saved ? <p role="status" className="text-success">Contact enregistré.</p> : null}<dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Type</dt><dd>{contact.type === "person" ? "Personne" : "Organisation"}</dd></div><div><dt className="text-sm text-muted-foreground">Agent responsable</dt><dd className="wrap-anywhere">{contact.primary_agent.display_name}</dd></div><div><dt className="text-sm text-muted-foreground">Rôles du contact</dt><dd>{contact.roles.map(value => roleLabels[value]).join(", ") || "Non renseignés"}</dd></div><div><dt className="text-sm text-muted-foreground">Source initiale</dt><dd>{sourceLabels[contact.source]}</dd></div></dl>
      <section className="grid gap-2"><h3 className="font-medium">Téléphones</h3>{contact.phones.map(phone => <p key={phone.number} className="wrap-anywhere">{phone.number}{phone.label ? `, ${phone.label}` : ""}{phone.is_primary ? " (principal)" : ""}</p>)}</section>
      <section className="grid gap-2"><h3 className="font-medium">E-mails</h3>{contact.emails.length ? contact.emails.map(email => <p key={email.email} className="wrap-anywhere">{email.email}{email.label ? `, ${email.label}` : ""}{email.is_primary ? " (principal)" : ""}</p>) : <p>Non renseignés.</p>}</section>
      <section className="grid gap-2"><h3 className="font-medium">Collaborateurs actuels</h3><p className="wrap-anywhere">{contact.collaborators.map(value => value.display_name).join(", ") || "Aucun"}</p></section>
    </section>}
        {!editing && (!contact.archived_at || role !== "agent") ? <OwnershipControls key={`${contact.id}:${contact.version}`} contact={contact} role={role} changed={changed} /> : null}
      </TabsContent>
      <TabsContent value="enquiries"><LeadList key={contact.id} role={role} actorId={actorId} contactId={contact.id} archived={Boolean(contact.archived_at)} revision={contact.version} /></TabsContent>
      <TabsContent value="timeline"><ContactTimeline key={contact.id} id={contact.id} archived={Boolean(contact.archived_at)} revision={contact.version} /></TabsContent>
      <TabsContent value="assignments"><ContactAssignments key={contact.id} id={contact.id} revision={contact.version} /></TabsContent>
      <TabsContent value="documents"><FilePanel key={contact.id} parentKind="contact" parentId={contact.id} writable={!contact.archived_at} /></TabsContent>
      <TabsContent value="requirements"><RequirementPanel key={contact.id} contactId={contact.id} writable={!contact.archived_at} /></TabsContent>
      <TabsContent value="deals"><DealList key={contact.id} role={role} actorId={actorId} contactId={contact.id} archived={Boolean(contact.archived_at)} revision={contact.version} /></TabsContent>
      <TabsContent value="tasks"><TaskPanel key={contact.id} contactId={contact.id} writable={!contact.archived_at} initialTask={initialTask} /></TabsContent>
    </Tabs>
  </div>;
}
