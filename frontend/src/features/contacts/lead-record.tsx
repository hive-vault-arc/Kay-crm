"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CrmRecordHeader, CrmStatusBadge, CrmStatusBoard } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { SectionHeading } from "@/components/shared/section-heading";
import { CalendarIcon, ContactsIcon, EnquiryIcon, InboxIcon, RadioIndicatorIcon } from "@/components/icons";
import { formatInstant } from "@/lib/format";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { ConvertLead } from "@/features/deals/convert-lead";
import { enquirySchema, receivedSourceLabels as sourceLabels, statusLabels, type StaffRole } from "./contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { LeadEditor } from "./lead-editor";
import { EnquiryAssignment } from "./enquiry-assignment";
import { campaignLabels, ratingLabels } from "./qualification-contracts";
import { ContactProfilePanel } from "./contact-profile-panel";
import { LeadFollowUp } from "./lead-follow-up";
import { ActivityHistory } from "@/features/activities/activity-history";
import { RecordLifecycleAction } from "@/features/discovery/record-lifecycle-action";

export function LeadRecord({ id, edit = false, role = "agent", actorId }: { id: string; edit?: boolean; role?: StaffRole; actorId?: string }) {
  const [saved, setSaved] = useState(false);
  const { value: enquiry, error, refresh } = useQuery(`/api/v1/enquiries/${id}`, enquirySchema);
  const returnLink = <Button action="back" asChild variant="quiet" size="compact" className="crm-record-back justify-self-start"><Link href="/leads">Retour aux prospects</Link></Button>;
  const heading = !edit ? <div className="grid min-w-0 justify-items-start gap-2">{returnLink}<PageHeader title="Détail du Lead" description="La demande et les coordonnées accessibles de son contact." route={`/leads/${id}`} /></div> : null;
  if (error) return <>{heading}<RecordError error={error} retry={refresh} /></>;
  if (!enquiry) return <>{heading}<p role="status">Chargement de la demande…</p></>;
  if (edit && !enquiry.contact.archived_at && !enquiry.archived_at) return <LeadEditor key={id} enquiry={enquiry} />;
  const writable = !enquiry.contact.archived_at && !enquiry.archived_at;
  const canArchive = !enquiry.contact.archived_at && (role !== "agent" || (actorId && enquiry.assigned_agent?.id === actorId));
  return <div className="record-stack crm-record-view grid min-w-0 gap-4">
    {returnLink}
    <CrmRecordHeader contact={enquiry.contact} title={enquiry.contact.name} route={`/leads/${id}`} badges={<><CrmStatusBadge state={enquiry.status}>{statusLabels[enquiry.status]}</CrmStatusBadge><CrmStatusBadge state={enquiry.rating} dot={false}>{ratingLabels[enquiry.rating]}</CrmStatusBadge>{enquiry.archived_at ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : null}</>} actions={<><Button action="file" asChild variant="outline"><Link href={`/leads/${id}/documents`}>Documents et PDF</Link></Button>{writable ? <>{enquiry.status !== "converted" ? <Button action="edit" asChild variant="outline"><Link href={`/leads/${id}/edit`}>Modifier le prospect</Link></Button> : null}<ConvertLead enquiry={enquiry} onRefresh={refresh} /></> : null}{canArchive ? <RecordLifecycleAction kind="enquiries" id={id} version={enquiry.version} archivedAt={enquiry.archived_at} label={enquiry.contact.name} onChanged={refresh} /> : null}</>} />
    <div className="crm-record-layout">
      <ContactProfilePanel contact={enquiry.contact} />
      <div className="crm-record-primary">
        <CrmStatusBoard title="Statut de la demande" label="Statuts de la demande, lecture seule" current={enquiry.status} items={Object.entries(statusLabels).map(([id, label]) => ({ id, label }))} />
        {enquiry.contact.archived_at ? <p role="status">Le contact est archivé. Restaurez-le avant de modifier la demande.</p> : null}{enquiry.archived_at ? <p role="status">Prospect archivé. Restauration possible pendant 30 jours ; son historique reste consultable.</p> : null}
        <div className="crm-lead-work-grid">
          <div className="crm-record-primary">
            <section className="crm-panel crm-demand-panel" aria-label="Demande reçue"><SectionHeading compact icon={EnquiryIcon}>Demande reçue</SectionHeading>
              <div className="crm-demand-budget"><p>Budget</p><strong>{enquiry.initial_budget ?? "À qualifier"}</strong></div>
              <div className="crm-detail-facts"><RecordFacts columns={2}>
                <RecordFact icon={InboxIcon} label="Source initiale">{sourceLabels[enquiry.source]}</RecordFact>
                <RecordFact icon={CalendarIcon} label="Reçue le">{formatInstant(enquiry.received_at)}</RecordFact>
                <RecordFact icon={InboxIcon} label="Source du prospect">{campaignLabels[enquiry.campaign_source]}</RecordFact>
                <RecordFact icon={ContactsIcon} label="Attribuée à">{enquiry.assigned_agent?.display_name ?? "Non attribuée, file du responsable"}</RecordFact>
                <RecordFact icon={RadioIndicatorIcon} label="Qualification">{ratingLabels[enquiry.rating]}</RecordFact>
              </RecordFacts></div>
              {enquiry.source_submission_id ? <details className="crm-origin-reference"><summary>Référence initiale</summary><p className="wrap-anywhere">{enquiry.source_submission_id}</p></details> : null}
            </section>
            <section className="crm-panel crm-message-panel" aria-label="Message de la demande"><SectionHeading compact icon={EnquiryIcon}>Message de la demande</SectionHeading><p className="whitespace-pre-wrap wrap-anywhere">{enquiry.message || "Aucun message renseigné."}</p></section>
          </div>
          <div className="crm-record-primary">
            {writable ? <LeadFollowUp contactId={enquiry.contact.id} /> : null}
            {saved ? <p role="status" className="text-success">Attribution enregistrée.</p> : null}
            {role !== "agent" && writable ? <EnquiryAssignment key={enquiry.version} enquiry={enquiry} saved={() => { setSaved(true); refresh(); }} /> : null}
          </div>
        </div>
        <RequirementPanel key={enquiry.contact.id} contactId={enquiry.contact.id} writable={writable} />
        {enquiry.converted_at ? <p className="text-xs text-muted-foreground">Prospect converti le {formatInstant(enquiry.converted_at)}. Son origine et son historique sont conservés.</p> : null}
      </div>
    </div>
    <ActivityHistory key={id} scope="enquiries" id={id} writable={writable} revision={enquiry.version} />
    <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/contacts/${enquiry.contact.id}`}>Ouvrir le contact et son historique</Link>
  </div>;
}
