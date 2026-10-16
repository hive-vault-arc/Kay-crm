"use client";
import { PageHeader } from "@/components/shared/page-header";
import { ListHeaderActions } from "@/components/shared/list-header-actions";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { AgentPicker } from "@/features/contacts/agent-picker";
import type { StaffRole } from "@/features/contacts/contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatInstant } from "@/lib/format";
import { dealsSchema, stageLabels, type Deal } from "./contracts";
import { columnLabels, DealColumns, useDealColumns, type ColumnId } from "./columns";
import { StageBadge } from "./stage-badge";

const columns: Record<ColumnId, ColumnDef<Deal>> = {
  name: { id: "name", header: columnLabels.name, cell: ({ row: { original: r } }) => <div className="grid min-w-0 gap-2 wrap-anywhere"><Link className="inline-flex min-h-control items-center font-medium text-link underline" href={`/deals/${r.id}`}>{r.title}</Link><span>{r.contact.name}</span>{r.offering?.target ? <span className="text-sm">{r.offering.target.reference}</span> : null}</div> },
  status: { id: "status", header: columnLabels.status, cell: ({ row }) => <StageBadge stage={row.original.stage} /> },
  responsibleAgent: { id: "responsibleAgent", header: columnLabels.responsibleAgent, cell: ({ row }) => <span className="wrap-anywhere">{row.original.contact.primary_agent.display_name}</span> },
  nextAction: { id: "nextAction", header: columnLabels.nextAction, cell: ({ row }) => <span className="whitespace-pre-wrap wrap-anywhere">{row.original.next_action || "Non renseignée"}</span> },
  updatedAt: { id: "updatedAt", header: columnLabels.updatedAt, cell: ({ row }) => formatInstant(row.original.updated_at) },
};
const defaults = { q: "", stage: "", assigned_agent_id: "", offering_kind: "", updated_from: "", updated_to: "", archive: "active", sort: "-updated_at", page_size: 50 };
export function DealList({ role, contactId, archived = false }: { role: StaffRole; contactId?: string; archived?: boolean }) {
  const [draft, setDraft] = useState(defaults); const [filters, setFilters] = useState(defaults); const [page, setPage] = useState(1); const [invalid, setInvalid] = useState("");
  const [agentLabel, setAgentLabel] = useState("");
  const hydrated = useHydrated(); const { visible, change, notice } = useDealColumns();
  const query = useQuery(queryPath("deals", { ...filters, contact_id: contactId, archive: archived ? "archived" : filters.archive, page }), dealsSchema);
  const counts = query.value?.stage_counts;
  return <div className="grid min-w-0 gap-3">{!contactId ? <PageHeader title="Affaires" description="Les affaires créées explicitement pour vos contacts accessibles." route="/deals" actions={
    <ListHeaderActions primary={<Button action="create" asChild variant="creation"><Link href="/deals/new">Créer une affaire</Link></Button>}>
      <DealColumns compact visible={visible} change={change} />
    </ListHeaderActions>
  } /> : <div className="flex flex-wrap gap-2">{!archived ? <Button action="create" asChild><Link href={`/deals/new${contactId ? `?contact_id=${contactId}` : ""}`}>Créer une affaire</Link></Button> : null}<DealColumns visible={visible} change={change} /></div>}
    <FilterResultsLayout title="Filtres des affaires" inline={Boolean(contactId)} active={Object.entries(filters).some(([key, value]) => value !== defaults[key as keyof typeof defaults])} filters={close => <form aria-label="Recherche et filtres des affaires" onSubmit={event => { event.preventDefault(); if (draft.updated_from && draft.updated_to && draft.updated_from > draft.updated_to) { setInvalid("La date de début doit précéder la date de fin."); return; } setInvalid(""); setFilters(draft); setPage(1); close(); }}><fieldset disabled={!hydrated} className="filter-toolbar grid min-w-0 items-center gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(8rem,0.65fr)_minmax(8rem,0.65fr)_auto_auto]"><div className="contents">
      <div className="grid gap-2"><Label className="sr-only" htmlFor="deal-search">Rechercher une affaire, un contact ou une action</Label><Input placeholder="Affaire, contact ou action" id="deal-search" maxLength={160} value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} /></div>
      <div className="grid gap-2"><Label className="sr-only" htmlFor="deal-stage">Étape</Label><NativeSelect id="deal-stage" value={draft.stage} onChange={e => setDraft({ ...draft, stage: e.target.value })}><option value="">Toutes les étapes</option>{Object.entries(stageLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label className="sr-only" htmlFor="deal-kind">Type d’offre liée</Label><NativeSelect id="deal-kind" value={draft.offering_kind} onChange={e => setDraft({ ...draft, offering_kind: e.target.value })}><option value="">Vente et location</option><option value="sale">Vente</option><option value="rental">Location</option></NativeSelect></div>
      </div><details className="min-w-0 open:col-span-full"><summary className="flex min-h-control cursor-pointer items-center text-sm font-medium text-link">Filtres avancés</summary><div className="grid min-w-0 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3"><div className="grid gap-2"><Label htmlFor="deal-from">Modifiée à partir du</Label><Input id="deal-from" type="date" value={draft.updated_from} onChange={e => setDraft({ ...draft, updated_from: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="deal-to">Modifiée jusqu’au</Label><Input id="deal-to" type="date" value={draft.updated_to} onChange={e => setDraft({ ...draft, updated_to: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor="deal-sort">Trier par</Label><NativeSelect id="deal-sort" value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value })}><option value="-updated_at">Modification récente</option><option value="-created_at">Création récente</option><option value="title">Titre de l’affaire</option><option value="contact_name">Nom du contact</option></NativeSelect></div>
      {role !== "agent" && !contactId ? <div className="grid gap-2"><Label htmlFor="deal-archive">Contacts</Label><NativeSelect id="deal-archive" value={draft.archive} onChange={e => setDraft({ ...draft, archive: e.target.value })}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous</option></NativeSelect></div> : null}
    </div>{role !== "agent" && !contactId ? <details className="max-w-reading"><summary className="min-h-control cursor-pointer py-3">Filtrer par responsable actuel</summary><AgentPicker optional selectedLabel={agentLabel} label="Agent responsable" value={draft.assigned_agent_id} change={(id, label) => { setDraft({ ...draft, assigned_agent_id: id }); setAgentLabel(label ?? ""); }} /></details> : null}
    <div className="flex flex-wrap items-end gap-2"><div className="grid gap-2"><Label htmlFor="deal-size">Lignes par page</Label><NativeSelect id="deal-size" value={draft.page_size} onChange={e => setDraft({ ...draft, page_size: Number(e.target.value) })}>{[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}</NativeSelect></div></div></details>{invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}<div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1"><Button action="filter" type="submit" variant="outline">Appliquer</Button><Button action="reset" type="button" variant="outline" onClick={() => { setDraft(defaults); setFilters(defaults); setPage(1); setInvalid(""); setAgentLabel(""); }}>Réinitialiser</Button></div></fieldset></form>}>
    {notice ? <p role="status">{notice}</p> : null}{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des affaires…</p> : <><p role="status">{query.value.total} affaire(s) accessible(s) dans ces filtres.</p><dl className="flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Résumé des étapes dans le périmètre filtré">{Object.entries(stageLabels).map(([id, label]) => <div key={id} className="flex gap-2"><dt>{label}</dt><dd className="tabular-nums font-medium">{counts?.[id as keyof typeof stageLabels]}</dd></div>)}</dl>{query.value.items.length ? <ScrollableResultsTable><DataTable className="min-w-table" scrollLabel="Tableau des affaires, défilement horizontal" rows={query.value.items} columns={visible.map(id => columns[id])} caption="Une affaire explicite par ligne. Le responsable suit la fiche contact." emptyLabel="Aucune affaire." /></ScrollableResultsTable> : <p>Aucune affaire sur cette page ou dans ces filtres. Créez une affaire, réinitialisez les filtres ou revenez à la première page.</p>}<NumberedPages label="Pages des affaires" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /></>}
    </FilterResultsLayout>
  </div>;
}
