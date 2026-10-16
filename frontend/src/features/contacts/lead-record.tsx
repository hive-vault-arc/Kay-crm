"use client";
import { PageHeader } from "@/components/shared/page-header";
import { RecordStatusStrip } from "@/components/shared/record-status-strip";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { SectionHeading } from "@/components/shared/section-heading";
import { CalendarIcon, ContactIcon, ContactsIcon, EmailIcon, EnquiryIcon, InboxIcon, PhoneIcon, RadioIndicatorIcon } from "@/components/icons";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatInstant } from "@/lib/format";
import { enquirySchema, receivedSourceLabels as sourceLabels, statusLabels, type StaffRole } from "./contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { LeadEditor } from "./lead-editor";
import { EnquiryAssignment } from "./enquiry-assignment";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { Badge } from "@/components/ui/badge";

export function LeadRecord({ id, edit = false, role = "agent" }: { id: string; edit?: boolean; role?: StaffRole }) {
  const [saved, setSaved] = useState(false);
  const { value: enquiry, error, refresh } = useQuery(`/api/v1/enquiries/${id}`, enquirySchema);
  const heading = !edit ? <PageHeader title="Détail du Lead" description="La demande et les coordonnées accessibles de son contact." route={`/leads/${id}`} /> : null;
  if (error) return <>{heading}<RecordError error={error} retry={refresh} /></>;
  if (!enquiry) return <>{heading}<p role="status">Chargement de la demande…</p></>;
  if (edit && !enquiry.contact.archived_at) return <LeadEditor key={id} enquiry={enquiry} />;
  return <div className="record-stack grid min-w-0 gap-5">
    {!edit ? <PageHeader title={enquiry.contact.name} description="Détail du Lead · La demande et les coordonnées accessibles de son contact." route={`/leads/${id}`} actions={!enquiry.contact.archived_at ? <><Button action="edit" asChild><Link href={`/leads/${id}/edit`}>Modifier le Lead</Link></Button><Button action="create" asChild variant="outline"><Link href={`/deals/new?contact_id=${enquiry.contact.id}&enquiry_id=${id}`}>Créer une affaire</Link></Button></> : undefined} /> : null}
    <RecordStatusStrip label="Statuts de la demande, lecture seule" current={enquiry.status} items={Object.entries(statusLabels).map(([id, label]) => ({ id, label }))} />
    <p className="flex flex-wrap items-center gap-2"><Badge variant={enquiry.status === "new" ? "info" : enquiry.status === "in_progress" ? "warning" : "neutral"}>{statusLabels[enquiry.status]}</Badge><span className="text-xs text-muted-foreground">Demande reçue le {formatInstant(enquiry.received_at)}</span></p>
    <section className="grid min-w-0 gap-5" aria-label="Contact"><SectionHeading icon={ContactIcon}>Contact</SectionHeading><RecordFacts>
      <RecordFact icon={ContactIcon} label="Nom du contact"><Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/contacts/${enquiry.contact.id}`}>{enquiry.contact.name}</Link></RecordFact>
      <RecordFact icon={PhoneIcon} label="Téléphone principal">{enquiry.contact.primary_phone}</RecordFact>
      <RecordFact icon={EmailIcon} label="E-mail principal">{enquiry.contact.primary_email || "Non renseigné"}</RecordFact>
      <RecordFact icon={ContactsIcon} label="Agent responsable">{enquiry.contact.primary_agent.display_name}</RecordFact>
    </RecordFacts></section>
    <section className="grid min-w-0 gap-5" aria-label="Demande reçue"><SectionHeading icon={EnquiryIcon} tone="purple">Demande reçue</SectionHeading><RecordFacts>
      <RecordFact icon={RadioIndicatorIcon} label="Statut">{statusLabels[enquiry.status]}</RecordFact>
      <RecordFact icon={InboxIcon} label="Source initiale">{sourceLabels[enquiry.source]}</RecordFact>
      <RecordFact icon={CalendarIcon} label="Reçue le">{formatInstant(enquiry.received_at)}</RecordFact>
      <RecordFact icon={ContactsIcon} label="Attribuée à">{enquiry.assigned_agent?.display_name ?? "Non attribuée, file du responsable"}</RecordFact>
      <RecordFact icon={EnquiryIcon} label="Message">{enquiry.message || "Aucun message renseigné."}</RecordFact>
      {enquiry.source_submission_id ? <RecordFact icon={EnquiryIcon} label="Référence initiale">{enquiry.source_submission_id}</RecordFact> : null}
    </RecordFacts></section>
    {saved ? <p role="status" className="text-success">Attribution enregistrée.</p> : null}
    {role !== "agent" && !enquiry.contact.archived_at ? <EnquiryAssignment key={enquiry.version} enquiry={enquiry} saved={() => { setSaved(true); refresh(); }} /> : null}
    <div className="flex flex-wrap gap-2">{enquiry.contact.archived_at ? <p>Le contact est archivé. Restaurez-le avant de modifier la demande.</p> : null}<Button action="back" asChild variant="outline"><Link href="/leads">Tous les Leads</Link></Button></div>
    <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/contacts/${enquiry.contact.id}`}>Ouvrir le contact et son historique</Link>
    <RequirementPanel key={enquiry.contact.id} contactId={enquiry.contact.id} writable={!enquiry.contact.archived_at} />
    <p className="text-sm text-muted-foreground">Créer une affaire ne convertit ni ne clôture cette demande.</p>
  </div>;
}
