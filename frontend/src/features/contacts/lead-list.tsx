"use client";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { DataTable } from "@/components/shared/data-table";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmDirectoryToolbar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { CrmStatusFilter } from "@/components/shared/crm-status-filter";
import { SearchIcon } from "@/components/icons";
import { ExportAction } from "@/features/discovery/export-action";
import { formatInstant } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";
import { enquiriesSchema, receivedSourceLabels as sourceLabels, statusLabels, type LeadSummary, type StaffRole } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { AgentPicker } from "./agent-picker";
import { ColumnChooser, type ColumnId, useLeadColumns } from "./column-chooser";
import { NumberedPages } from "./numbered-pages";
import { campaignLabels, languageLabels, ratingLabels } from "./qualification-contracts";
import { countryLabel } from "./qualification-inputs";
import { useDirectoryFilters } from "./use-directory-filters";
import { DirectoryCountryFilter } from "./directory-country-filter";

const columns: Record<ColumnId, ColumnDef<LeadSummary>> = {
  name: { id: "name", header: "Contact", cell: ({ row: { original: lead } }) => <CrmContactCell contact={lead.contact} href={`/leads/${lead.id}`} describedBy={`lead-phone-${lead.id}`} /> },
  status: { id: "status", header: "Statut", cell: ({ row }) => <CrmStatusBadge state={row.original.status}>{statusLabels[row.original.status]}</CrmStatusBadge> },
  responsibleAgent: { id: "responsibleAgent", header: "Agent", cell: ({ row }) => <CrmAgent name={row.original.contact.primary_agent.display_name} /> },
  source: { id: "source", header: "Source", cell: ({ row }) => <span className="crm-source-cell">{campaignLabels[row.original.campaign_source]}</span> },
  provenance: { id: "provenance", header: "Provenance", cell: ({ row }) => sourceLabels[row.original.source] },
  budget: { id: "budget", header: "Budget", cell: ({ row }) => <span className="crm-budget-cell">{row.original.initial_budget ?? "À qualifier"}</span> },
  rating: { id: "rating", header: "Qualification", cell: ({ row }) => <CrmStatusBadge dot={false} state={row.original.rating}>{ratingLabels[row.original.rating]}</CrmStatusBadge> },
  country: { id: "country", header: "Pays", cell: ({ row }) => countryLabel(row.original.contact.country) },
  languages: { id: "languages", header: "Langues", cell: ({ row }) => row.original.contact.languages.map(value => languageLabels[value] ?? value).join(", ") || "À renseigner" },
  email: { id: "email", header: "E-mail", cell: ({ row }) => <span className="wrap-anywhere">{row.original.contact.primary_email ?? "Non renseigné"}</span> },
  receivedAt: { id: "receivedAt", header: "Réception", cell: ({ row }) => formatInstant(row.original.received_at) },
  message: { id: "message", header: "Demande", cell: ({ row }) => <span className="wrap-anywhere">{row.original.message_preview || "Non renseignée"}</span> },
  updatedAt: { id: "updatedAt", header: "Modifié le", cell: ({ row }) => <span className="crm-date-cell">{formatInstant(row.original.updated_at)}</span> },
};
const defaults = { q: "", status: "", campaign_source: "", source: "", rating: "", assigned_agent_id: "", received_from: "", received_to: "", country: "", language: "", sort: "-updated_at", page_size: 50 };

export function LeadList({ role, contactId, archived = false, revision }: { role: StaffRole; contactId?: string; archived?: boolean; revision?: number }) {
  const hydrated = useHydrated();
  const { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount } = useDirectoryFilters(defaults, "received_from", "received_to");
  const [agentLabel, setAgentLabel] = useState("");
  const { visible, change, notice } = useLeadColumns();
  const { value: result, error, refresh } = useQuery(queryPath("enquiries", { ...filters, page, contact_id: contactId, archive: archived ? "archived" : undefined }), enquiriesSchema, revision);
  function clearFilters() { reset(); setAgentLabel(""); }
  const toolbar = <CrmDirectoryToolbar primary={<Button action="create" asChild variant="creation"><Link href="/leads/new">Nouveau prospect</Link></Button>}>
    <Button action="contact" asChild variant="quiet" size="compact"><Link href="/leads?view=contacts">Contacts</Link></Button>
    {role !== "agent" ? <Button action="upload" asChild variant="quiet" size="compact"><Link href="/leads?view=import">Importer des contacts</Link></Button> : null}
    {role !== "agent" && result ? <ExportAction compact kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result.total} /> : null}
    <ColumnChooser compact visible={visible} change={change} />
  </CrmDirectoryToolbar>;
  return <div className={!contactId ? "crm-directory" : "grid min-w-0 gap-3"}>
    {!contactId ? <CrmDirectoryHeader title="Prospects" count={result?.total} noun="demandes" description="Qualifiez vos prospects et préparez vos prochaines affaires." route="/leads" /> : <h2 className="text-section font-medium">Demandes liées</h2>}
    <FilterResultsLayout title="Filtres des Leads" inline={Boolean(contactId)} reference={!contactId} active={activeCount > 0} activeCount={activeCount} reset={clearFilters} filters={close => <form onSubmit={event => { event.preventDefault(); apply(close); }} className="crm-directory-filter-form" aria-label="Recherche et filtres des Leads">
      <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="lead-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input placeholder="Nom, téléphone, e-mail" id="lead-search" aria-label="Rechercher un nom, téléphone ou e-mail" value={draft.q} maxLength={160} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div></div>
        <CrmStatusFilter label="Statut" labels={statusLabels} counts={result?.status_counts} value={draft.status} change={status => setDraft({ ...draft, status })} />
        <div className="grid gap-2"><Label htmlFor="lead-source">Source</Label><NativeSelect id="lead-source" value={draft.campaign_source} onChange={event => setDraft({ ...draft, campaign_source: event.target.value })}><option value="">Toutes les sources</option>{Object.entries(campaignLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="lead-rating">Qualification</Label><NativeSelect id="lead-rating" value={draft.rating} onChange={event => setDraft({ ...draft, rating: event.target.value })}><option value="">Toutes les qualifications</option>{Object.entries(ratingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <details className="crm-filter-advanced"><summary>Filtres avancés</summary>
          {role !== "agent" && !contactId ? <details><summary>Agent attribué</summary><AgentPicker optional selectedLabel={agentLabel} label="Agent attribué" value={draft.assigned_agent_id} change={(id, label) => { setDraft({ ...draft, assigned_agent_id: id }); setAgentLabel(label ?? ""); }} /></details> : null}
          <details><summary>Provenance</summary><Label className="sr-only" htmlFor="lead-provenance">Provenance</Label><NativeSelect id="lead-provenance" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })}><option value="">Toutes les provenances</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></details>
          <details><summary>Pays et langues</summary><div className="grid gap-3"><DirectoryCountryFilter id="lead-country" value={draft.country} change={country => setDraft({ ...draft, country })} /><Label htmlFor="lead-language">Langue</Label><NativeSelect id="lead-language" value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })}><option value="">Toutes les langues</option>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div></details>
          <details><summary>Dates</summary><div className="grid gap-3"><Label htmlFor="lead-from">Reçue à partir du</Label><Input id="lead-from" type="date" value={draft.received_from} onChange={event => setDraft({ ...draft, received_from: event.target.value })} /><Label htmlFor="lead-to">Reçue jusqu’au</Label><Input id="lead-to" type="date" value={draft.received_to} onChange={event => setDraft({ ...draft, received_to: event.target.value })} /></div></details>
          <details><summary>Affichage</summary><div className="grid gap-3"><Label htmlFor="lead-sort">Trier par</Label><NativeSelect id="lead-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="-received_at">Réception récente</option><option value="name">Nom du contact</option></NativeSelect><Label htmlFor="lead-page-size">Lignes par page</Label><NativeSelect id="lead-page-size" value={draft.page_size} onChange={event => setDraft({ ...draft, page_size: Number(event.target.value) })}>{[10, 25, 50, 100].map(size => <option value={size} key={size}>{size}</option>)}</NativeSelect></div></details>
        </details>
        {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}
        <div className="crm-filter-submit"><Button action="filter" type="submit" variant="outline">Appliquer</Button><Button action="reset" type="button" variant="quiet" onClick={clearFilters}>Réinitialiser</Button></div>
      </fieldset>
      <p className="crm-filter-note">Les filtres sont appliqués automatiquement.</p>
    </form>}>
      {!contactId ? toolbar : null}{notice ? <p role="status">{notice}</p> : null}
      {error ? <RecordError error={error} retry={refresh} /> : !result ? <p role="status">Chargement des Leads…</p> : <>
        {role !== "agent" && contactId ? <ExportAction kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result.total} /> : null}
        <h2 className="crm-results-title" role="status">{result.total} demande{result.total > 1 ? "s" : ""}</h2>
        {!result.items.length ? <p>{activeCount ? "Aucune demande ne correspond à vos filtres." : "Aucune demande sur cette page. Créez un Lead ou revenez à la première page."}</p> : <ScrollableResultsTable><DataTable className="crm-directory-table min-w-table" scrollLabel="Tableau des Leads, défilement horizontal" rows={result.items} getRowId={row => row.id} rowSelectionLabel={row => row.contact.name} footerCaption columns={visible.map(id => ({ ...columns[id], id, ...(id === "name" || id === "updatedAt" ? { header: () => <Button variant="quiet" size="compact" action={id === "name" ? "up" : "down"} className="crm-sort-heading" onClick={() => setDraft({ ...draft, sort: id === "name" ? "name" : "-updated_at" })}>{id === "name" ? "Contact" : "Modifié le"}</Button> } : {}) }))} caption="Une ligne par demande, même si le contact est déjà connu." emptyLabel="Aucune demande." /></ScrollableResultsTable>}
        <NumberedPages compact={!contactId} page={page} total={result.total} size={result.page_size} change={setPage} />
      </>}
    </FilterResultsLayout>
  </div>;
}
