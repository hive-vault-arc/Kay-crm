"use client";
import { PageHeader } from "@/components/shared/page-header";
import { ExportAction } from "@/features/discovery/export-action";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/data-table";
import { formatInstant } from "@/lib/format";
import { enquiriesSchema, receivedSourceLabels as sourceLabels, statusLabels, type LeadSummary, type StaffRole } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { AgentPicker } from "./agent-picker";
import { ColumnChooser, columnLabels, useLeadColumns, type ColumnId } from "./column-chooser";
import { NumberedPages } from "./numbered-pages";
import { useHydrated } from "@/hooks/use-hydrated";

const columnMap: Record<ColumnId, ColumnDef<LeadSummary>> = {
  name: { id: "name", header: "Contact", cell: ({ row }) => <Link aria-label={row.original.contact.name} aria-describedby={`lead-phone-${row.original.id}`} className="grid min-h-control min-w-0 content-center gap-0.5 wrap-anywhere text-foreground underline-offset-4 hover:underline" href={`/leads/${row.original.id}`}><span className="font-medium">{row.original.contact.name}</span><span id={`lead-phone-${row.original.id}`} className="whitespace-nowrap text-xs text-muted-foreground">{row.original.contact.primary_phone}</span></Link> },
  status: { id: "status", header: "Statut", cell: ({ row }) => <Badge variant={row.original.status === "new" ? "info" : row.original.status === "in_progress" ? "warning" : "neutral"}>{statusLabels[row.original.status]}</Badge> },
  responsibleAgent: { id: "responsibleAgent", header: "Agent responsable", cell: ({ row }) => <span className="wrap-anywhere">{row.original.contact.primary_agent.display_name}</span> },
  source: { id: "source", header: "Source", cell: ({ row }) => sourceLabels[row.original.source] },
  receivedAt: { id: "receivedAt", header: "Réception", cell: ({ row }) => formatInstant(row.original.received_at) },
  message: { id: "message", header: "Demande", cell: ({ row }) => <span className="wrap-anywhere">{row.original.message_preview || "Non renseignée"}</span> },
  updatedAt: { id: "updatedAt", header: "Modification", cell: ({ row }) => formatInstant(row.original.updated_at) },
};
type Filters = { q: string; status: string; source: string; assigned_agent_id: string; received_from: string; received_to: string; sort: string; page_size: number };
const defaults: Filters = { q: "", status: "", source: "", assigned_agent_id: "", received_from: "", received_to: "", sort: "-updated_at", page_size: 50 };
export function LeadList({ role, contactId, archived = false }: { role: StaffRole; contactId?: string; archived?: boolean }) {
  const hydrated = useHydrated();
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [filterError, setFilterError] = useState("");
  const { visible, change, notice } = useLeadColumns();
  const { value: result, error, refresh } = useQuery(queryPath("enquiries", { ...filters, page, contact_id: contactId, archive: archived ? "archived" : undefined }), enquiriesSchema);
  function apply(event: React.FormEvent) { event.preventDefault(); if (draft.received_from && draft.received_to && draft.received_from > draft.received_to) { setFilterError("La date de début doit précéder la date de fin."); return; } setFilterError(""); setFilters(draft); setPage(1); }
  const filtered = Object.entries(filters).some(([key, value]) => value !== defaults[key as keyof Filters]);
  return <div className="grid min-w-0 gap-3">
    {!contactId ? <PageHeader title="Prospects" description="Les demandes reçues, reliées à une même fiche contact." route="/leads" actions={<div className="flex flex-wrap gap-2"><Button asChild><Link href="/leads/new">Créer un Lead</Link></Button><Button asChild variant="outline"><Link href="/leads?view=contacts">Contacts</Link></Button>{role !== "agent" ? <Button asChild variant="outline"><Link href="/leads?view=import">Importer des contacts</Link></Button> : null}<ColumnChooser visible={visible} change={change} />{role !== "agent" && result ? <ExportAction compact kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result.total} /> : null}</div>} /> : <h2 className="text-section font-medium">Demandes liées</h2>}
    <form onSubmit={apply} className="filter-toolbar" aria-label="Recherche et filtres des Leads">
      <fieldset disabled={!hydrated} className="grid min-w-0 items-center gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(8rem,0.65fr)_minmax(8rem,0.65fr)_auto_auto]">
      <div className="contents"><div className="grid gap-2"><Label className="sr-only" htmlFor="lead-search">Rechercher un nom, téléphone ou e-mail</Label><Input placeholder="Nom, téléphone ou e-mail" id="lead-search" value={draft.q} maxLength={160} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div>
        <div className="grid gap-2"><Label className="sr-only" htmlFor="lead-status">Statut</Label><NativeSelect id="lead-status" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label className="sr-only" htmlFor="lead-source">Source</Label><NativeSelect id="lead-source" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })}><option value="">Toutes les sources</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        </div><details className="min-w-0 open:col-span-full"><summary className="flex min-h-control cursor-pointer items-center text-sm font-medium text-link">Filtres avancés</summary><div className="grid min-w-0 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-3"><div className="grid gap-2"><Label htmlFor="lead-from">Reçue à partir du</Label><Input id="lead-from" type="date" value={draft.received_from} onChange={event => setDraft({ ...draft, received_from: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="lead-to">Reçue jusqu’au</Label><Input id="lead-to" type="date" value={draft.received_to} onChange={event => setDraft({ ...draft, received_to: event.target.value })} /></div>
        <div className="grid gap-2"><Label htmlFor="lead-sort">Trier par</Label><NativeSelect id="lead-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="-received_at">Réception récente</option><option value="name">Nom du contact</option></NativeSelect></div>
      </div>
      {role !== "agent" && !contactId ? <details className="max-w-reading"><summary className="min-h-control cursor-pointer py-3">Filtrer par agent attribué</summary><AgentPicker optional label="Agent attribué" value={draft.assigned_agent_id} change={id => setDraft({ ...draft, assigned_agent_id: id })} /></details> : null}
      <div className="flex flex-wrap items-end gap-2"><div className="grid gap-2"><Label htmlFor="lead-page-size">Lignes par page</Label><NativeSelect id="lead-page-size" value={draft.page_size} onChange={event => setDraft({ ...draft, page_size: Number(event.target.value) })}>{[10, 25, 50, 100].map(size => <option value={size} key={size}>{size}</option>)}</NativeSelect></div></div></details><div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1"><Button type="submit" variant="outline">Appliquer</Button><Button type="button" variant="outline" onClick={() => { setDraft(defaults); setFilters(defaults); setPage(1); setFilterError(""); }}>Réinitialiser</Button></div>
      {filterError ? <p role="alert" className="text-danger">{filterError}</p> : null}
      </fieldset>
    </form>
    {notice ? <p role="status">{notice}</p> : null}
    {error ? <RecordError error={error} retry={refresh} /> : !result ? <p role="status">Chargement des Leads…</p> : <>
      {role !== "agent" && contactId ? <ExportAction kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result.total} /> : null}
      <p role="status">{result.total} demande(s) accessible(s).</p>
      {!result.items.length ? <p>{filtered ? "Aucune demande ne correspond à vos filtres." : "Aucune demande sur cette page. Créez un Lead ou revenez à la première page."}</p> : <><p className="text-sm text-muted-foreground lg:hidden">Faites défiler le tableau horizontalement pour lire les colonnes choisies.</p><div className="min-w-0"><DataTable className="min-w-table" scrollLabel="Tableau des Leads, défilement horizontal" rows={result.items} columns={visible.map(id => ({ ...columnMap[id], header: columnLabels[id] }))} caption="Une ligne par demande, même si le contact est déjà connu." emptyLabel="Aucune demande." /></div></>}
      <NumberedPages page={page} total={result.total} size={result.page_size} change={setPage} />
    </>}
  </div>;
}
