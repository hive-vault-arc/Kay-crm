"use client";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { ResultsSkeleton } from "@/components/shared/results-skeleton";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmDirectoryToolbar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { CrmStatusFilter } from "@/components/shared/crm-status-filter";
import { SearchIcon } from "@/components/icons";
import { AgentPicker } from "@/features/contacts/agent-picker";
import type { StaffRole } from "@/features/contacts/contracts";
import { campaignLabels, languageLabels, ratingLabels } from "@/features/contacts/qualification-contracts";
import { countryLabel } from "@/features/contacts/qualification-inputs";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { DirectoryCountryFilter } from "@/features/contacts/directory-country-filter";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatInstant } from "@/lib/format";
import { dealsSchema, stageLabels, type Deal } from "./contracts";
import { DealColumns, useDealColumns, type ColumnId } from "./columns";

const columns: Record<ColumnId, ColumnDef<Deal>> = {
  name: { id: "name", header: "Contact", cell: ({ row: { original: deal } }) => <CrmContactCell contact={deal.contact} href={`/deals/${deal.id}`} describedBy={`deal-phone-${deal.id}`} /> },
  status: { id: "status", header: "Étape", cell: ({ row }) => <CrmStatusBadge state={row.original.stage}>{stageLabels[row.original.stage]}</CrmStatusBadge> },
  responsibleAgent: { id: "responsibleAgent", header: "Agent", cell: ({ row }) => <CrmAgent name={row.original.contact.primary_agent.display_name} /> },
  nextAction: { id: "nextAction", header: "Prochaine action", cell: ({ row }) => <span className="whitespace-pre-wrap wrap-anywhere">{row.original.next_action || "Non renseignée"}</span> },
  updatedAt: { id: "updatedAt", header: "Modifié le", cell: ({ row }) => <span className="crm-date-cell">{formatInstant(row.original.updated_at)}</span> },
  projects: { id: "projects", header: "Projets", cell: ({ row }) => <span className="crm-project-cell">{row.original.projects.map(project => project.name).join(" · ") || "Non renseignés"}</span> },
  budget: { id: "budget", header: "Budget", cell: ({ row }) => <span className="crm-budget-cell">{row.original.initial_budget || "Non renseigné"}</span> },
  rating: { id: "rating", header: "Qualification", cell: ({ row }) => <CrmStatusBadge dot={false} state={row.original.rating}>{ratingLabels[row.original.rating]}</CrmStatusBadge> },
  source: { id: "source", header: "Source", cell: ({ row }) => campaignLabels[row.original.campaign_source] },
  country: { id: "country", header: "Pays", cell: ({ row }) => countryLabel(row.original.contact.country) },
  languages: { id: "languages", header: "Langues", cell: ({ row }) => row.original.contact.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées" },
  email: { id: "email", header: "E-mail", cell: ({ row }) => <span className="wrap-anywhere">{row.original.contact.primary_email || "Non renseigné"}</span> },
};
const defaults = { q: "", stage: "", assigned_agent_id: "", offering_kind: "", campaign_source: "", rating: "", country: "", language: "", updated_from: "", updated_to: "", archive: "active", record_state: "active", sort: "-updated_at", page_size: 50 };

export function DealList({ role, contactId, archived = false }: { role: StaffRole; contactId?: string; archived?: boolean }) {
  const { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount } = useDirectoryFilters(defaults, "updated_from", "updated_to");
  const [agentLabel, setAgentLabel] = useState("");
  const hydrated = useHydrated();
  const { visible, change, notice } = useDealColumns();
  const query = useQuery(queryPath("deals", { ...filters, contact_id: contactId, archive: archived ? "archived" : filters.archive, page }), dealsSchema);
  function clearFilters() { reset(); setAgentLabel(""); }
  const toolbar = <CrmDirectoryToolbar primary={!archived ? <Button action="create" asChild variant="creation"><Link href={`/deals/new${contactId ? `?contact_id=${contactId}` : ""}`}>Créer une affaire</Link></Button> : null}>
    <Button action="contact" asChild variant="quiet" size="compact"><Link href="/leads?view=contacts">Contacts</Link></Button><DealColumns compact visible={visible} change={change} />
  </CrmDirectoryToolbar>;
  return <div className={!contactId ? "crm-directory" : "grid min-w-0 gap-3"}>
    {!contactId ? <CrmDirectoryHeader title="Affaires" count={query.value?.total} noun="affaires" description="Suivez vos projets et préparez les prochaines étapes de vos affaires." route="/deals" /> : null}
    <FilterResultsLayout title="Filtres des affaires" inline={Boolean(contactId)} reference={!contactId} active={activeCount > 0} activeCount={activeCount} reset={clearFilters} filters={close => <form className="crm-directory-filter-form" aria-label="Recherche et filtres des affaires" onSubmit={event => { event.preventDefault(); apply(close); }}>
      <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="deal-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input placeholder="Affaire, contact ou action" aria-label="Rechercher une affaire, un contact ou une action" id="deal-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div></div>
        <CrmStatusFilter label="Étape" labels={stageLabels} counts={query.value?.stage_counts} value={draft.stage} change={stage => setDraft({ ...draft, stage })} />
        <div className="grid gap-2"><Label htmlFor="deal-source">Source</Label><NativeSelect id="deal-source" value={draft.campaign_source} onChange={event => setDraft({ ...draft, campaign_source: event.target.value })}><option value="">Toutes les sources</option>{Object.entries(campaignLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="deal-rating">Qualification</Label><NativeSelect id="deal-rating" value={draft.rating} onChange={event => setDraft({ ...draft, rating: event.target.value })}><option value="">Toutes les qualifications</option>{Object.entries(ratingLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
        <details className="crm-filter-advanced"><summary>Filtres avancés</summary>
          {role !== "agent" && !contactId ? <details><summary>Agent responsable</summary><AgentPicker optional selectedLabel={agentLabel} label="Agent responsable" value={draft.assigned_agent_id} change={(id, label) => { setDraft({ ...draft, assigned_agent_id: id }); setAgentLabel(label ?? ""); }} /></details> : null}
          <details><summary>Type d’offre liée</summary><Label className="sr-only" htmlFor="deal-kind">Type d’offre liée</Label><NativeSelect id="deal-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option><option value="sale">Vente</option><option value="rental">Location</option></NativeSelect></details>
          <details><summary>Pays et langues</summary><div className="grid gap-3"><DirectoryCountryFilter id="deal-country" value={draft.country} change={country => setDraft({ ...draft, country })} /><Label htmlFor="deal-language">Langue</Label><NativeSelect id="deal-language" value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })}><option value="">Toutes les langues</option>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div></details>
          <details><summary>Dates</summary><div className="grid gap-3"><Label htmlFor="deal-from">Modifiée à partir du</Label><Input id="deal-from" type="date" value={draft.updated_from} onChange={event => setDraft({ ...draft, updated_from: event.target.value })} /><Label htmlFor="deal-to">Modifiée jusqu’au</Label><Input id="deal-to" type="date" value={draft.updated_to} onChange={event => setDraft({ ...draft, updated_to: event.target.value })} /></div></details>
          <details><summary>Affichage et archivage</summary><div className="grid gap-3"><Label htmlFor="deal-sort">Trier par</Label><NativeSelect id="deal-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="-created_at">Création récente</option><option value="title">Titre de l’affaire</option><option value="contact_name">Nom du contact</option></NativeSelect>{role !== "agent" && !contactId ? <><Label htmlFor="deal-archive">Contacts</Label><NativeSelect id="deal-archive" value={draft.archive} onChange={event => setDraft({ ...draft, archive: event.target.value })}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous</option></NativeSelect></> : null}<p className="text-sm text-muted-foreground">50 affaires par page.</p></div></details>
          {!contactId ? <details><summary>Archives des affaires</summary><div className="grid gap-2"><Label htmlFor="deal-record-state">Dossiers</Label><NativeSelect id="deal-record-state" value={draft.record_state} onChange={event => setDraft({ ...draft, record_state: event.target.value })}><option value="active">Affaires actives</option><option value="archived">Affaires archivées</option></NativeSelect><p className="text-sm text-muted-foreground">Restauration pendant 30 jours après l’archivage.</p></div></details> : null}
        </details>
        {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}<div className="crm-filter-submit"><Button action="filter" type="submit" variant="outline">Appliquer</Button><Button action="reset" type="button" variant="quiet" onClick={clearFilters}>Réinitialiser</Button></div>
      </fieldset><p className="crm-filter-note">Les filtres sont appliqués automatiquement.</p>
    </form>}>
      {toolbar}{notice ? <p role="status">{notice}</p> : null}
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <ResultsSkeleton label="Chargement des affaires…" /> : <>
        <h2 className="crm-results-title" role="status">{query.value.total} affaire{query.value.total > 1 ? "s" : ""}</h2>
        {query.value.items.length ? <ScrollableResultsTable bounded={!contactId}><DataTable className="crm-directory-table min-w-table" scrollLabel="Tableau des affaires, défilement vertical et horizontal" rows={query.value.items} getRowId={row => row.id} rowSelectionLabel={row => row.contact.name} footerCaption columns={visible.map(id => ({ ...columns[id], id, ...(id === "name" || id === "updatedAt" ? { header: () => <Button variant="quiet" size="compact" action={id === "name" ? "up" : "down"} className="crm-sort-heading" onClick={() => setDraft({ ...draft, sort: id === "name" ? "contact_name" : "-updated_at" })}>{id === "name" ? "Contact" : "Modifié le"}</Button> } : {}) }))} caption="Une affaire explicite par ligne. Le responsable suit la fiche contact." emptyLabel="Aucune affaire." /></ScrollableResultsTable> : <p>Aucune affaire sur cette page ou dans ces filtres. Créez une affaire, réinitialisez les filtres ou revenez à la première page.</p>}
        <NumberedPages compact={!contactId} label="Pages des affaires" page={page} total={query.value.total} size={query.value.page_size} change={setPage} />
      </>}
    </FilterResultsLayout>
  </div>;
}
