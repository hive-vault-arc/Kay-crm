"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { EmptyFolderIcon } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { DirectoryRecordCard } from "@/components/shared/directory-record-card";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection } from "@/components/shared/record-workspace";
import { ExportAction } from "@/features/discovery/export-action";
import { RequirementPanel } from "@/features/requirements/requirement-panel";
import { dealsSchema, stageLabels } from "@/features/deals/contracts";
import { enquiriesSchema, statusLabels, type Contact, type StaffRole } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { NumberedPages } from "./numbered-pages";

// The API pages each kind independently. Keep both authoritative pagers instead
// of presenting a falsely merged total/page or dropping the second result set.
export function ContactDossiers({ contact, role }: { contact: Contact; role: StaffRole }) {
  const control = useId();
  const [archive, setArchive] = useState("active"), [leadPage, setLeadPage] = useState(1), [dealPage, setDealPage] = useState(1);
  const filters = { contact_id: contact.id, archive: contact.archived_at ? "archived" : "active", record_archive: archive, page_size: 20 };
  const leads = useQuery(queryPath("enquiries", { ...filters, page: leadPage }), enquiriesSchema, contact.version);
  const deals = useQuery(queryPath("deals", { ...filters, page: dealPage }), dealsSchema, contact.version);
  return <RecordSection title="Dossiers liés" action={<RecordDrawer label="Recherches" action="search" description="Les critères de recherche de ce contact."><RequirementPanel contactId={contact.id} writable={!contact.archived_at} /></RecordDrawer>}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div data-filter-panel="inline" className="flex min-w-0 items-center gap-2"><Label htmlFor={control}>Afficher</Label><NativeSelect id={control} value={archive} onChange={event => { setArchive(event.target.value); setLeadPage(1); setDealPage(1); }}><option value="active">Dossiers actifs</option><option value="archived">Dossiers archivés</option><option value="all">Tous les dossiers</option></NativeSelect></div>{!contact.archived_at ? <Button action="create" asChild variant="outline"><Link href={`/deals/new?contact_id=${contact.id}`}>Créer une affaire</Link></Button> : null}</div>
    <section className="grid min-w-0 gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">Prospects{leads.value ? ` · ${leads.value.total}` : ""}</h3>{role !== "agent" ? <ExportAction compact kind="enquiries" filters={{ contact_id: contact.id, archive: filters.archive }} total={leads.value?.total ?? 0} available={Boolean(leads.value && !leads.error && archive === "active")} scopeError={leads.error} /> : null}</div>
      {leads.error ? <RecordError error={leads.error} retry={leads.refresh} /> : !leads.value ? <DossierLoading label="Chargement des prospects…" /> : !leads.value.total ? <DossierEmpty>Aucun prospect dans cette sélection.</DossierEmpty> : <><DataTable rows={leads.value.items} getRowId={row => row.id} columns={[
        { id: "dossier", header: "Dossier", cell: ({ row }) => <Link className="inline-flex min-h-control items-center font-medium hover:underline" href={`/leads/${row.original.id}`}>{row.original.message_preview || "Demande du contact"}</Link> },
        { id: "status", header: "Statut", cell: ({ row }) => <CrmStatusBadge state={row.original.status}>{statusLabels[row.original.status]}</CrmStatusBadge> },
        { id: "budget", header: "Budget", cell: ({ row }) => row.original.initial_budget ?? "À qualifier" },
        { id: "agent", header: "Agent attribué", cell: ({ row }) => row.original.assigned_agent?.display_name ?? "File du responsable" },
      ]} caption="Prospects liés au contact" footerCaption emptyLabel="Aucun prospect dans cette sélection." mobileCard={row => <DirectoryRecordCard title={row.message_preview || "Demande du contact"} href={`/leads/${row.id}`} agent={row.assigned_agent?.display_name ?? "File du responsable"} phone={row.contact.primary_phone} status={<CrmStatusBadge state={row.status}>{statusLabels[row.status]}</CrmStatusBadge>} metadata={row.initial_budget ?? "À qualifier"} />} /><NumberedPages compact label="Pages des prospects liés" page={leadPage} total={leads.value.total} size={leads.value.page_size} change={setLeadPage} /></>}
    </section>
    <section className="grid min-w-0 gap-3 border-t pt-4"><h3 className="text-sm font-medium">Affaires{deals.value ? ` · ${deals.value.total}` : ""}</h3>
      {deals.error ? <RecordError error={deals.error} retry={deals.refresh} /> : !deals.value ? <DossierLoading label="Chargement des affaires…" /> : !deals.value.total ? <DossierEmpty>Aucune affaire dans cette sélection.</DossierEmpty> : <><DataTable rows={deals.value.items} getRowId={row => row.id} columns={[
        { id: "dossier", header: "Dossier", cell: ({ row }) => <Link className="inline-flex min-h-control items-center font-medium hover:underline" href={`/deals/${row.original.id}`}>{row.original.title}</Link> },
        { id: "status", header: "Étape", cell: ({ row }) => <CrmStatusBadge kind="deal" state={row.original.stage}>{stageLabels[row.original.stage]}</CrmStatusBadge> },
        { id: "budget", header: "Budget", cell: ({ row }) => row.original.initial_budget || "À qualifier" },
        { id: "action", header: "Prochaine action", cell: ({ row }) => row.original.next_action || "Non renseignée" },
      ]} caption="Affaires liées au contact" footerCaption emptyLabel="Aucune affaire dans cette sélection." mobileCard={row => <DirectoryRecordCard title={row.title} href={`/deals/${row.id}`} agent={row.contact.primary_agent.display_name} phone={row.contact.primary_phone} status={<CrmStatusBadge kind="deal" state={row.stage}>{stageLabels[row.stage]}</CrmStatusBadge>} metadata={row.initial_budget || "À qualifier"} details={[{ label: "Prochaine action", value: row.next_action || "Non renseignée" }]} />} /><NumberedPages compact label="Pages des affaires liées" page={dealPage} total={deals.value.total} size={deals.value.page_size} change={setDealPage} /></>}
    </section>
  </RecordSection>;
}

function DossierLoading({ label }: { label: string }) {
  return <div className="kay-party-section-loading" role="status" aria-busy="true"><span className="sr-only">{label}</span><Skeleton className="h-10" aria-hidden="true" /><Skeleton className="h-10" aria-hidden="true" /></div>;
}

function DossierEmpty({ children }: { children: string }) {
  return <div className="kay-party-section-empty"><EmptyFolderIcon size={18} aria-hidden="true" /><p>{children}</p></div>;
}
