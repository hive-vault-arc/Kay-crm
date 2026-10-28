"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { CalendarIcon, ContactIcon, ContactsIcon, EmailIcon, InboxIcon, LocationIcon, PhoneIcon } from "@/components/icons";
import { InlineEditScope } from "@/components/shared/inline-record-field";
import { ContactInlineField } from "./contact-inline-field";
import { apiGet, type ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { FilePanel } from "@/features/files/file-panel";
import { TaskPanel } from "@/features/work/task-panel";
import { ContactVisits } from "@/features/schedule/contact-visits";
import { currentRecord } from "@/features/realtime/current-record";
import { contactSchema, contactSourceLabels as sourceLabels, type Contact, type StaffRole } from "./contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { ContactEditor } from "./contact-editor";
import { ContactAssignments, ContactTimeline } from "./contact-history";
import { OwnershipControls } from "./ownership-controls";
import { operationLabels, type Operation } from "./ownership-contracts";
import { ContactDossiers } from "./contact-dossiers";

export function ContactRecord({ id, role, initialTask }: { id: string; role: StaffRole; actorId?: string; initialTask?: string }) {
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const [edited, setEdited] = useState<Contact>();
  const [scopeError, setScopeError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const contact = currentRecord(query.value, edited, id);
  async function changed(target: string, operation: Operation, signal: AbortSignal) {
    const fresh = await apiGet(`/api/v1/contacts/${target}`, contactSchema, signal);
    if (signal.aborted) return;
    if (target === id) setEdited(fresh); else { setEdited(undefined); query.refreshQuietly(); }
    setNotice(`${operationLabels[operation]} : opération enregistrée.`);
  }
  const heading = <PageHeader title="Fiche contact" description="Coordonnées et dossiers accessibles." route={`/contacts/${id}`} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (scopeError) return <>{heading}{notice ? <p role="status">{notice}</p> : null}<RecordError error={scopeError} retry={() => { setScopeError(undefined); setEdited(undefined); setNotice(""); query.refresh(); }} /></>;
  if (!contact) return <>{heading}<p role="status">Chargement du contact…</p></>;
  const writable = !contact.archived_at;
  const editAction = writable ? <RecordDrawer label="Modifier" action="edit" title="Coordonnées du contact" description="Les coordonnées sont partagées par les dossiers de ce contact.">{(close, saved) => <ContactEditor key={`${contact.id}:${contact.version}`} contact={contact} saved={value => { setEdited(value); setNotice("Contact enregistré."); saved(); }} cancel={close} />}</RecordDrawer> : undefined;
  const inline = { contact, writable, saved: (value: Contact) => { setEdited(value); setNotice("Contact enregistré."); }, denied: setScopeError };
  return <InlineEditScope><div className="kay-record-page">
    <CrmRecordHeader contact={contact} title={contact.name} route={`/contacts/${id}`} backHref="/contacts" showContact={false} reference="Contact" badges={<CrmStatusBadge state={contact.archived_at ? "archived" : "active"}>{contact.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} actions={editAction} />
    {contact.id !== id ? <p>Cette fiche a été fusionnée. Vous consultez la <Link className="inline-flex min-h-control items-center text-link underline" href={`/contacts/${contact.id}`}>fiche conservée</Link>.</p> : null}
    {contact.archived_at ? <p role="status" className="mb-3 text-sm text-muted-foreground">Contact archivé. Restaurez-le pour reprendre les modifications.</p> : null}
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}
    <RecordWorkspace label="Rubriques du contact" tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <RecordSection title="Coordonnées"><RecordFacts>
          <ContactInlineField {...inline} icon={ContactIcon} field="name" label="Nom" />
          <ContactInlineField {...inline} icon={ContactIcon} field="type" label="Type" />
          <ContactInlineField {...inline} icon={ContactIcon} field="roles" label="Rôles" />
          <ContactInlineField {...inline} icon={PhoneIcon} field="phones" label="Téléphones" />
          <ContactInlineField {...inline} icon={EmailIcon} field="emails" label="E-mails" />
          <ContactInlineField {...inline} icon={LocationIcon} field="country" label="Pays de résidence" />
          <ContactInlineField {...inline} icon={LocationIcon} field="nationality" label="Nationalité" />
          <ContactInlineField {...inline} icon={ContactIcon} field="languages" label="Langues" />
          <RecordFact icon={InboxIcon} label="Source initiale">{sourceLabels[contact.source]}</RecordFact>
        </RecordFacts></RecordSection>
        <RecordSection title="Responsabilité" action={writable || role !== "agent" ? <RecordDrawer label="Gérer le contact" action="settings" description="Attribution, collaboration et conservation avec aperçu de l’impact.">{(_close, saved) => <OwnershipControls embedded key={contact.id} contact={contact} role={role} denied={(failure, acknowledged) => { setNotice(acknowledged ? "L’opération est enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); }} changed={async (target, operation, signal) => { await changed(target, operation, signal); if (!signal.aborted) saved(); }} />}</RecordDrawer> : undefined}><RecordFacts>
          <RecordFact icon={ContactsIcon} label="Agent responsable">{contact.primary_agent.display_name}</RecordFact>
          <RecordFact icon={ContactsIcon} label="Collaborateurs">{contact.collaborators.map(value => value.display_name).join(", ") || "Aucun"}</RecordFact>
          <RecordFact icon={CalendarIcon} label="Contact créé le">{formatInstant(contact.created_at)}</RecordFact>
          <RecordFact icon={CalendarIcon} label="Modifié le">{formatInstant(contact.updated_at)}</RecordFact>
        </RecordFacts></RecordSection>
        <ContactDossiers key={contact.id} contact={contact} role={role} />
      </> },
      { id: "activity", label: "Activités", content: <><ContactTimeline id={contact.id} archived={!writable} revision={contact.version} /><details className="mt-6 border-t pt-3"><summary className="flex min-h-control cursor-pointer items-center font-medium">Historique des attributions</summary><div className="pt-4"><ContactAssignments id={contact.id} revision={contact.version} /></div></details></> },
    ]} aside={<>
      <ContactVisits contactId={contact.id} writable={writable} />
      <RecordSection title="Tâches" action={<RecordDrawer label="Voir les tâches" title="Tâches du contact" action="task" description="Tâches, échéances et responsables de ce contact." initialOpen={Boolean(initialTask)}><TaskPanel contactId={contact.id} writable={writable} initialTask={initialTask} /></RecordDrawer>}><p className="text-sm text-muted-foreground">Retrouvez les tâches et leurs échéances.</p></RecordSection>
      <RecordSection title="Documents" action={<RecordDrawer label="Voir les documents" title="Documents du contact" action="file" description="Documents privés accessibles sur ce contact."><FilePanel parentKind="contact" parentId={contact.id} writable={writable} /></RecordDrawer>}><p className="text-sm text-muted-foreground">Pièces jointes partagées avec les personnes autorisées.</p></RecordSection>
    </>} />
  </div></InlineEditScope>;
}
