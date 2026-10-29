"use client";

import Link from "next/link";
import { useState } from "react";
import { useLifecycleProjection } from "@/features/discovery/use-lifecycle-projection";
import { currentRecord } from "@/features/realtime/current-record";
import { LeadInlineField } from "./lead-inline-field";
import { InlineEditScope } from "@/components/shared/inline-record-field";
import type { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { CalendarIcon, ContactsIcon, FinanceIcon, InboxIcon, RadioIndicatorIcon } from "@/components/icons";
import { formatInstant } from "@/lib/format";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { ProjectLinksPanel } from "@/features/project-links/project-links-panel";
import { ConvertLead } from "@/features/deals/convert-lead";
import { ActivityHistory } from "@/features/activities/activity-history";
import { RecordLifecycleAction } from "@/features/discovery/record-lifecycle-action";
import { FilePanel } from "@/features/files/file-panel";
import { PreparedDocuments } from "@/features/generated/prepared-documents";
import { TaskForm } from "@/features/work/task-form";
import { TaskPanel } from "@/features/work/task-panel";
import { ContactVisits } from "@/features/schedule/contact-visits";
import { enquirySchema, receivedSourceLabels as sourceLabels, type Enquiry, type StaffRole } from "./contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { LeadEditor } from "./lead-editor";
import { EnquiryAssignment } from "./enquiry-assignment";
import { campaignLabels, ratingLabels } from "./qualification-contracts";
import { ContactProfilePanel } from "./contact-profile-panel";
import { LeadStatusMenu } from "./lead-status-menu";

type Props = { id: string; edit?: boolean; role?: StaffRole; actorId?: string; initialTab?: string };
export function LeadRecord(props: Props) { return <LeadRecordLifetime key={`${props.id}:${props.actorId ?? ""}:${props.role ?? "agent"}`} {...props} />; }
function LeadRecordLifetime({ id, edit = false, role = "agent", actorId, initialTab }: Props) {
  const [edited, setEdited] = useState<Enquiry>();
  const [scopeError, setScopeError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const { value: remote, error: readError, refresh, refreshQuietly } = useQuery(`/api/v1/enquiries/${id}`, enquirySchema);
  const projection = useLifecycleProjection(currentRecord(remote, edited, id), readError), enquiry = projection.value, error = projection.error;
  if (readError && [401, 403, 404].includes(readError.status) && edited) setEdited(undefined);
  const heading = <PageHeader title={edit ? "Modifier le prospect" : "Prospect"} description="Coordonnées, qualification et suivi." route={`/leads/${id}`} />;
  if (error && (!enquiry || [401, 403, 404].includes(error.status))) return <>{heading}<RecordError error={error} retry={refresh} /></>;
  if (scopeError) return <>{heading}{notice ? <p role="status">{notice}</p> : null}<RecordError error={scopeError} retry={() => { setScopeError(undefined); setEdited(undefined); setNotice(""); refresh(); }} /></>;
  if (!enquiry) return <>{heading}<p role="status">Chargement du prospect…</p></>;
  if (edit && !enquiry.contact.archived_at && !enquiry.archived_at) return <LeadEditor key={id} enquiry={enquiry} />;
  const writable = !enquiry.contact.archived_at && !enquiry.archived_at;
  const canArchive = !enquiry.contact.archived_at && (role !== "agent" || (actorId && enquiry.assigned_agent?.id === actorId));
  const inline = { enquiry, writable, saved: (value: Enquiry) => { setEdited(value); setNotice("Prospect enregistré."); refreshQuietly(); }, denied: (failure: ApiError, acknowledged?: boolean) => { setNotice(acknowledged ? "La modification est enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); } };
  return <InlineEditScope><div className="kay-record-page">
    {error ? <RecordError error={error} retry={refreshQuietly} /> : null}
    <CrmRecordHeader contact={enquiry.contact} title={enquiry.contact.name} route={`/leads/${id}`} backHref="/leads" badges={<><LeadStatusMenu enquiry={enquiry} writable={writable} denied={(failure, acknowledged) => { setNotice(acknowledged ? "Le statut est enregistré. Les droits d’accès ont changé." : ""); setScopeError(failure); }} changed={saved => { setNotice(saved ? "Statut enregistré." : "Version actualisée."); refreshQuietly(); }} /><CrmStatusBadge state={enquiry.rating} dot={false}>{ratingLabels[enquiry.rating]}</CrmStatusBadge>{enquiry.archived_at ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : null}</>} actions={<>{writable && enquiry.status !== "converted" ? <Button action="edit" asChild variant="outline"><Link href={`/leads/${id}/edit`}>Modifier</Link></Button> : null}<RecordActions>{writable ? <ConvertLead enquiry={enquiry} actorId={actorId} role={role} onRefresh={refreshQuietly} denied={(failure, acknowledged) => { setNotice(acknowledged ? "La conversion est enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); }} /> : null}{canArchive || projection.holding ? <RecordLifecycleAction role={role} actorId={actorId} heldChanged={projection.hold} denied={(failure, acknowledged) => { setNotice(acknowledged ? "L’opération est enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); }} kind="enquiries" id={id} version={enquiry.version} archivedAt={enquiry.archived_at} label={enquiry.contact.name} onChanged={async (record, signal) => { if (signal.aborted) return; setEdited(record); setNotice("État du prospect enregistré."); refreshQuietly(); }} /> : null}</RecordActions></>} />
    {!writable ? <p role="status" className="mb-3 text-sm text-muted-foreground">{enquiry.contact.archived_at ? "Contact archivé : restaurez-le pour modifier ce prospect." : "Prospect archivé : historique conservé, restauration possible pendant 30 jours."}</p> : null}
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}
    <RecordWorkspace label="Rubriques du prospect" initialTab={initialTab} tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <ContactProfilePanel contact={enquiry.contact} writable={writable && enquiry.status !== "converted"} changed={refreshQuietly} denied={setScopeError} />
        <RecordSection title="Qualification" action={<RecordDrawer label="Recherches" action="search" description="Critères de recherche liés à ce contact."><RequirementPanel contactId={enquiry.contact.id} writable={writable} /></RecordDrawer>}><RecordFacts>
          <LeadInlineField {...inline} field="initial_budget" icon={FinanceIcon} label="Budget" display={enquiry.initial_budget ?? "À qualifier"} />
          <LeadInlineField {...inline} field="rating" icon={RadioIndicatorIcon} label="Qualification" display={<CrmStatusBadge state={enquiry.rating} dot={false}>{ratingLabels[enquiry.rating]}</CrmStatusBadge>} />
          <LeadInlineField {...inline} field="campaign_source" icon={InboxIcon} label="Source du prospect" display={campaignLabels[enquiry.campaign_source]} />
          <RecordFact icon={ContactsIcon} label="Attribué à">{enquiry.assigned_agent?.display_name ?? "File du responsable"}</RecordFact>
          <RecordFact icon={InboxIcon} label="Provenance initiale">{sourceLabels[enquiry.source]}</RecordFact>
          <RecordFact icon={CalendarIcon} label="Reçu le">{formatInstant(enquiry.received_at)}</RecordFact>
        </RecordFacts>{enquiry.source_submission_id ? <details className="kay-contact-more"><summary>Référence initiale</summary><p className="wrap-anywhere text-sm">{enquiry.source_submission_id}</p></details> : null}</RecordSection>
        <RecordSection title="Message"><RecordFacts columns={1}><LeadInlineField {...inline} field="message" icon={InboxIcon} label="Description" display={<span className="whitespace-pre-wrap">{enquiry.message || "Aucun message renseigné."}</span>} /></RecordFacts></RecordSection>
        {enquiry.converted_at ? <RecordSection title="Conversion"><p className="text-sm text-muted-foreground">Converti le {formatInstant(enquiry.converted_at)}. L’origine et l’historique sont conservés.</p>{enquiry.converted_deal_id ? <Button action="forward" variant="outline" asChild><Link href={`/deals/${enquiry.converted_deal_id}`}>Voir l’affaire</Link></Button> : null}</RecordSection> : null}
      </> },
      { id: "projects", label: "Projets", content: <ProjectLinksPanel scope="enquiries" id={id} writable={writable} onChanged={() => setHistoryRevision(value => value + 1)} /> },
      { id: "activity", label: "Activités", content: <ActivityHistory key={id} scope="enquiries" id={id} writable={writable} denied={(failure, acknowledged) => { setNotice(acknowledged ? "Activité enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); }} revision={enquiry.version + historyRevision} /> },
      { id: "documents", label: "Documents", content: <><FilePanel parentKind="contact" parentId={enquiry.contact.id} writable={writable} /><PreparedDocuments parentKind="enquiry" id={id} /></> },
    ]} aside={<>
      <RecordSection title="Suivi" action={writable ? <RecordDrawer label="Planifier une relance" action="task" description="Créer une tâche reliée à ce prospect et à son contact.">{(close, saved) => <TaskForm contactId={enquiry.contact.id} enquiryId={enquiry.id} saved={async () => { saved(); setNotice("Relance planifiée."); }} cancel={close} />}</RecordDrawer> : undefined}><RecordDrawer label="Voir les tâches du contact" title="Tâches du contact" action="task" description="Tâches partagées entre les dossiers de ce contact."><TaskPanel contactId={enquiry.contact.id} writable={writable} /></RecordDrawer>{role !== "agent" && writable ? <RecordDrawer label="Attribuer le prospect" action="assign" description="Choisissez un agent autorisé sur le contact.">{(_close, saved) => <EnquiryAssignment key={enquiry.id} enquiry={enquiry} denied={(failure, acknowledged) => { setNotice(acknowledged ? "Attribution enregistrée. Les droits d’accès ont changé." : ""); setScopeError(failure); }} saved={() => { saved(); setNotice("Attribution enregistrée."); refreshQuietly(); }} />}</RecordDrawer> : null}</RecordSection>
      <ContactVisits contactId={enquiry.contact.id} writable={writable} />
    </>} />
  </div></InlineEditScope>;
}
