"use client";

import Link from "next/link";
import { useState, type ReactNode, type Ref } from "react";
import { DealInlineField } from "./deal-inline-field";
import { InlineEditScope } from "@/components/shared/inline-record-field";
import { Button } from "@/components/ui/button";
import { CrmRecordHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { DealIcon, EnquiryIcon, FinanceIcon, InboxIcon, PropertyIcon, RadioIndicatorIcon } from "@/components/icons";
import { ContactProfilePanel } from "@/features/contacts/contact-profile-panel";
import { campaignLabels, purchaseReasonLabels, ratingLabels } from "@/features/contacts/qualification-contracts";
import type { StaffRole } from "@/features/contacts/contracts";
import { ActivityHistory } from "@/features/activities/activity-history";
import { RecordLifecycleAction } from "@/features/discovery/record-lifecycle-action";
import { FilePanel } from "@/features/files/file-panel";
import { PreparedDocuments } from "@/features/generated/prepared-documents";
import { OfferingFacts } from "@/features/requirements/offering-card";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { ProjectLinksPanel } from "@/features/project-links/project-links-panel";
import { ContactVisits } from "@/features/schedule/contact-visits";
import { TaskPanel } from "@/features/work/task-panel";
import { FinancePanel } from "@/features/finance/finance-panel";
import type { ApiError } from "@/lib/api/client";
import { paymentLabels } from "./qualification-contracts";
import type { Deal } from "./contracts";
import type { MutateDeal } from "./pipeline";
import { DealStageMenu } from "./deal-stage-menu";
import { CustomerOffers } from "./customer-offers";
import { DealHistory } from "./deal-history";
import { OutcomeHistory } from "./outcome-history";

export function DealWorkspace({ deal, role, writable, canArchive, busy, busyChanged, mutate, reload, error, notice, commandState, onEdit, editRef, initialTask, initialTab, contactChanged, denied }: {
  deal: Deal; role: StaffRole; writable: boolean; canArchive: boolean; busy: boolean; busyChanged: (value: boolean) => void; mutate: MutateDeal;
  reload: () => Promise<unknown>; error?: ApiError; notice?: string; commandState?: ReactNode; onEdit: () => void; editRef?: Ref<HTMLButtonElement>; initialTask?: string; initialTab?: string; contactChanged?: () => void; denied?: (error: ApiError) => void;
}) {
  const [historyRevision, setHistoryRevision] = useState(0);
  const { request, dialog } = useUnsavedGuard();
  const canAct = !deal.contact.archived_at && !deal.archived_at;
  const edit = () => request(onEdit);
  const inline = { deal, writable, busy, mutate, error, denied };
  return <InlineEditScope><div className="kay-record-page">
    <CrmRecordHeader contact={deal.contact} title={deal.title} route={`/deals/${deal.id}`} backHref="/deals" badges={<><DealStageMenu deal={deal} writable={canAct} busy={busy} busyChanged={busyChanged} mutate={mutate} saved={reload} error={error} /><CrmStatusBadge state={deal.rating} dot={false}>{ratingLabels[deal.rating]}</CrmStatusBadge>{deal.archived_at ? <CrmStatusBadge state="archived">Archivée</CrmStatusBadge> : null}</>} actions={<>{writable ? <Button action="edit" ref={editRef} variant="outline" disabled={busy} onClick={edit}>Modifier</Button> : null}{canArchive ? <RecordActions><RecordLifecycleAction kind="deals" id={deal.id} version={deal.version} archivedAt={deal.archived_at} label={deal.title} onChanged={() => void reload()} /></RecordActions> : null}</>} />
    {!canAct ? <p role="status" className="mb-3 text-sm text-muted-foreground">{deal.contact.archived_at ? "Contact archivé : dossier conservé en lecture seule." : "Affaire archivée : historique conservé, restauration possible pendant 30 jours."}</p> : null}
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}{commandState}
    <RecordWorkspace label="Rubriques de l’affaire" initialTab={initialTab} tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <ContactProfilePanel contact={deal.contact} writable={writable} changed={contactChanged} denied={denied} />
        <RecordSection title="Qualification" action={<RecordDrawer label="Recherches" action="search" description="Critères de recherche liés au contact."><RequirementPanel contactId={deal.contact.id} writable={canAct} /></RecordDrawer>}><RecordFacts>
          <DealInlineField {...inline} icon={FinanceIcon} label="Budget" field="initial_budget" display={deal.initial_budget || "À qualifier"} />
          <DealInlineField {...inline} icon={RadioIndicatorIcon} label="Qualification" field="rating" display={ratingLabels[deal.rating]} />
          <DealInlineField {...inline} icon={DealIcon} label="Motifs d’achat" field="purchase_reasons" display={deal.purchase_reasons.map(code => purchaseReasonLabels[code]).join(", ") || "Non renseignés"} />
          <DealInlineField {...inline} icon={FinanceIcon} label="Financement" field="payment_method" display={deal.payment_method ? paymentLabels[deal.payment_method as keyof typeof paymentLabels] ?? deal.payment_method : "Non renseigné"} />
          <DealInlineField {...inline} icon={PropertyIcon} label="Pièces" field="number_of_rooms" display={deal.number_of_rooms ?? "Non renseigné"} />
          <DealInlineField {...inline} icon={InboxIcon} label="Source" field="campaign_source" display={campaignLabels[deal.campaign_source]} />
          <RecordFact icon={EnquiryIcon} label="Prospect d’origine">{deal.enquiry_id ? <Link className="inline-flex min-h-control items-center hover:underline" href={`/leads/${deal.enquiry_id}`}>Voir le prospect</Link> : "Aucun prospect lié"}</RecordFact>
        </RecordFacts></RecordSection>
        <RecordSection title="Notes"><RecordFacts columns={1}><DealInlineField {...inline} icon={InboxIcon} label="Notes" field="notes" display={<span className="whitespace-pre-wrap">{deal.notes || "Aucune note renseignée."}</span>} /></RecordFacts></RecordSection>
      </> },
      { id: "projects", label: "Projets", content: <><RecordSection title="Projet et offre retenus"><RecordFacts columns={1}><DealInlineField {...inline} icon={PropertyIcon} label="Projets" field="projects" display={deal.projects.map(project => project.name).join(" · ") || "Non renseignés"} /></RecordFacts><div className="grid min-w-0 gap-3"><h3 className="text-sm font-medium">Offre d’inventaire liée</h3>{deal.offering ? <OfferingFacts offering={deal.offering} /> : <p className="text-sm text-muted-foreground">Aucune offre d’inventaire liée.</p>}</div></RecordSection><ProjectLinksPanel scope="deals" id={deal.id} writable={canAct} onChanged={() => setHistoryRevision(value => value + 1)} /><CustomerOffers key={deal.id} deal={deal} writable={writable} busy={busy} busyChanged={busyChanged} mutate={mutate} error={error} denied={denied} /></> },
      { id: "activity", label: "Activités", content: <><ActivityHistory scope="deals" id={deal.id} writable={canAct} revision={deal.version + historyRevision} />{deal.enquiry_id ? <ActivityHistory scope="deals" id={deal.id} origin /> : null}<details className="kay-contact-more"><summary>Historique de l’affaire</summary><DealHistory id={deal.id} revision={deal.version} /></details><details className="kay-contact-more"><summary>Résultats, clôture et réouverture</summary><OutcomeHistory id={deal.id} revision={deal.version} /></details></> },
      { id: "documents", label: "Documents", content: <><FilePanel parentKind="deal" parentId={deal.id} writable={writable && !busy} /><PreparedDocuments parentKind="deal" id={deal.id} /></> },
    ]} aside={<>
      <RecordSection title="Suivi"><RecordFacts columns={1}><DealInlineField {...inline} icon={DealIcon} label="Action prévue" field="next_action" display={<span className="whitespace-pre-wrap">{deal.next_action || "Aucune prochaine action renseignée."}</span>} /></RecordFacts><RecordDrawer label="Voir les tâches" title="Tâches de l’affaire" action="task" description="Échéances et responsables de cette affaire." initialOpen={Boolean(initialTask)}><TaskPanel contactId={deal.contact.id} dealId={deal.id} writable={canAct} initialTask={initialTask} /></RecordDrawer></RecordSection>
      <ContactVisits contactId={deal.contact.id} writable={canAct} />
      <RecordSection title="Réservation"><p className="text-sm text-muted-foreground">{deal.active_reservation ? "Une réservation est active sur l’offre liée. Gérez-la depuis le menu Étape." : "Aucune réservation active. Réservez une offre depuis le menu Étape."}</p></RecordSection>
      {role !== "agent" ? <RecordSection title="Finance" action={<RecordDrawer label="Voir la finance" action="finance" description="Commissions et encaissements autorisés pour cette affaire." initialOpen={initialTab === "finance"}><FinancePanel deal={deal} /></RecordDrawer>}><p className="text-sm text-muted-foreground">Commissions et encaissements facultatifs.</p></RecordSection> : null}
    </>} />{dialog}
  </div></InlineEditScope>;
}
