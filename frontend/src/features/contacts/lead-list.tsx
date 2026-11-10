"use client";
import Link from "next/link";
import { useCallback, useRef, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { DirectoryViewSwitch, useDirectoryView } from "@/components/shared/directory-view-switch";
import type { ApiError } from "@/lib/api/client";
import { LeadKanban } from "./lead-kanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { DataTable } from "@/components/shared/data-table";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmDirectoryToolbar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { CrmStatusFilter } from "@/components/shared/crm-status-filter";
import { ContactsIcon, SearchIcon } from "@/components/icons";
import { ExportAction } from "@/features/discovery/export-action";
import { businessTimeZone, formatInstant } from "@/lib/format";
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
import { RecordLifecycleAction } from "@/features/discovery/record-lifecycle-action";
import { useLifecycleProjection } from "@/features/discovery/use-lifecycle-projection";
import { DirectoryRecordCard } from "@/components/shared/directory-record-card";

const columns: Record<ColumnId, ColumnDef<LeadSummary>> = {
  name: { id: "name", header: "Contact", cell: ({ row: { original: lead } }) => <CrmContactCell contact={lead.contact} href={`/leads/${lead.id}`} describedBy={`lead-phone-${lead.id}`} /> },
  status: { id: "status", header: "Statut", cell: ({ row }) => <CrmStatusBadge dot={false} state={row.original.status}>{statusLabels[row.original.status]}</CrmStatusBadge> },
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
const prospectWidths: Record<ColumnId, number> = {
  name: 190, status: 117, budget: 130, rating: 112, source: 139, responsibleAgent: 114, updatedAt: 115,
  provenance: 145, country: 112, languages: 145, email: 220, receivedAt: 160, message: 250,
};
const localDay = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeZone: businessTimeZone });

type Props = { role: StaffRole; actorId?: string; contactId?: string; archived?: boolean; revision?: number };
export function LeadList(props: Props) { return <LeadListLifetime key={`${props.actorId ?? ""}:${props.role}:${props.contactId ?? ""}:${props.archived ?? false}`} {...props} />; }
function LeadListLifetime({ role, actorId, contactId, archived = false, revision }: Props) {
  const hydrated = useHydrated();
  const { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount } = useDirectoryFilters(defaults, "received_from", "received_to");
  const [agentLabel, setAgentLabel] = useState("");
  const [railOpen, setRailOpen] = useState(true);
  const railTrigger = useRef<HTMLButtonElement>(null);
  const [recordArchive, setRecordArchive] = useState<"active" | "archived">("active");
  const { visible, change, notice } = useLeadColumns();
  const { value: remote, error: remoteError, refresh, refreshQuietly } = useQuery(queryPath("enquiries", { ...filters, page, contact_id: contactId, archive: archived ? "archived" : undefined, record_archive: recordArchive }), enquiriesSchema, revision);
  const [lifecycleError, setLifecycleError] = useState<ApiError>();
  const projection = useLifecycleProjection(remote, lifecycleError ?? remoteError), result = projection.value, error = projection.error;
  const phone = usePhoneLayout(), preference = useDirectoryView("leads"), listRef = useRef<HTMLButtonElement>(null);
  const [boardVisited, setBoardVisited] = useState(false), [boardEpoch, setBoardEpoch] = useState(0), [boardFailure, setBoardFailure] = useState<ApiError>();
  const board = !contactId && !phone && preference.value === "kanban";
  if (board && !boardVisited) setBoardVisited(true);
  const boardDenied = useCallback((reason: ApiError) => { setBoardFailure(reason); refresh(); }, [refresh]);
  const scopeDenied = error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(error.code);
  const viewControl = <DirectoryViewSwitch value={preference.value} phone={phone} listRef={listRef} change={value => { if (value === "list") { setBoardEpoch(epoch => epoch + 1); setBoardFailure(undefined); } preference.change(value); }} />;
  function clearFilters() { reset(); setAgentLabel(""); }
  const tableColumns = visible.map<ColumnDef<LeadSummary>>(id => {
    const column = { ...columns[id], id };
    if (!contactId) {
      column.size = prospectWidths[id];
      if (id === "updatedAt") column.cell = ({ row }) => <time dateTime={row.original.updated_at} title={formatInstant(row.original.updated_at)}>{localDay.format(new Date(row.original.updated_at))}</time>;
    }
    if (id === "name" || id === "updatedAt") {
      const sort = id === "name" ? "name" : "-updated_at";
      column.header = () => <Button variant="quiet" size="compact" action={id === "name" ? "up" : "down"} className="crm-sort-heading" aria-pressed={filters.sort === sort} onClick={() => setDraft({ ...draft, sort })}>{id === "name" ? "Contact" : "Modifié le"}</Button>;
    }
    return column;
  });
  const newProspect = <Button action="create" asChild variant="creation"><Link href="/leads/new">Nouveau prospect</Link></Button>;
  const tools = (exportActions?: ReactNode) => <CrmDirectoryToolbar primary={newProspect} controls={<>
    {!phone ? <Button action="filter" type="button" ref={railTrigger} variant={railOpen ? "secondary" : "outline"} disabled={!hydrated} aria-expanded={railOpen} aria-controls="prospect-filter-rail" onClick={() => setRailOpen(open => !open)}>Filtres{activeCount ? ` · ${activeCount}` : ""}</Button> : null}
    {!phone && !board ? <ColumnChooser visible={visible} change={change} /> : null}
  </>}>
    <Button action="contact" asChild variant="quiet" size="compact"><Link href="/contacts">Contacts</Link></Button>
    <Button action={recordArchive === "active" ? "archive" : "back"} variant="quiet" size="compact" aria-pressed={recordArchive === "archived"} onClick={() => { setRecordArchive(value => value === "active" ? "archived" : "active"); setPage(1); }}>{recordArchive === "active" ? "Archives des prospects" : "Prospects actifs"}</Button>
    {role !== "agent" ? <Button action="upload" asChild variant="quiet" size="compact"><Link href="/leads?view=import">Importer des contacts</Link></Button> : null}
    {exportActions}
    {phone ? <ColumnChooser compact visible={visible} change={change} /> : null}
  </CrmDirectoryToolbar>;
  // The review Sheet stays outside the transient utilities Popover.
  const toolbar = role !== "agent" ? <ExportAction compact kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result?.total ?? 0} available={Boolean(result && !error && recordArchive === "active")} scopeError={error} renderActions={tools} /> : tools();
  return <div className={!contactId ? "crm-directory kay-sales-directory" : "grid min-w-0 gap-3"} data-sales-view={!contactId ? board ? "board" : "list" : undefined}>
    {!contactId ? <CrmDirectoryHeader title="Prospects" count={error ? undefined : result?.total} unavailable={Boolean(error)} noun="demandes" description="Qualifiez vos prospects et préparez vos prochaines affaires." route="/leads" navigation={!phone ? viewControl : undefined} actions={toolbar} /> : <h2 className="text-section">Demandes liées</h2>}
    <FilterResultsLayout leadingControl={!contactId && phone ? viewControl : undefined} title="Filtres des Leads" inline={Boolean(contactId)} reference={!contactId} active={activeCount > 0} activeCount={activeCount} reset={clearFilters} railId={!contactId ? "prospect-filter-rail" : undefined} railHidden={!contactId && !railOpen} panelHeading={!contactId ? <div className="kay-sales-filter-heading">
      <h2>Filtres</h2>
      <Button action="reset" type="button" size="compact" variant="quiet" onClick={clearFilters}>Réinitialiser</Button>
      <Button action="close" type="button" size="icon" variant="outline" aria-label="Masquer le panneau de filtres" onClick={() => { setRailOpen(false); railTrigger.current?.focus(); }} />
      {activeCount ? <small>{activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}</small> : null}
    </div> : undefined} filters={close => <form onSubmit={event => { event.preventDefault(); apply(close); }} className={contactId ? "crm-directory-filter-form" : "crm-directory-filter-form kay-sales-filters"} aria-label="Recherche et filtres des Leads">
      <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="lead-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input placeholder="Nom, téléphone, e-mail" id="lead-search" aria-label="Rechercher un nom, téléphone ou e-mail" value={draft.q} maxLength={160} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div></div>
        <CrmStatusFilter label="Statut" labels={statusLabels} counts={result?.status_counts} value={draft.status} change={status => setDraft({ ...draft, status })} />
        <div className="grid gap-2"><Label htmlFor="lead-source">Source</Label><NativeSelect id="lead-source" value={draft.campaign_source} onChange={event => setDraft({ ...draft, campaign_source: event.target.value })}><option value="">Toutes les sources</option>{Object.entries(campaignLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="lead-rating">Qualification</Label><NativeSelect id="lead-rating" value={draft.rating} onChange={event => setDraft({ ...draft, rating: event.target.value })}><option value="">Toutes les qualifications</option>{Object.entries(ratingLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <details className="crm-filter-advanced"><summary>Filtres avancés</summary>
          {!contactId ? <details><summary>Agent attribué</summary><AgentPicker purpose="enquiry-filter" unassigned={role !== "agent"} optional selectedLabel={agentLabel} label="Agent attribué" value={draft.assigned_agent_id} change={(id, label) => { setDraft({ ...draft, assigned_agent_id: id }); setAgentLabel(label ?? ""); }} /></details> : null}
          <details><summary>Provenance</summary><Label className="sr-only" htmlFor="lead-provenance">Provenance</Label><NativeSelect id="lead-provenance" value={draft.source} onChange={event => setDraft({ ...draft, source: event.target.value })}><option value="">Toutes les provenances</option>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></details>
          <details><summary>Pays et langues</summary><div className="grid gap-3"><DirectoryCountryFilter id="lead-country" value={draft.country} change={country => setDraft({ ...draft, country })} /><Label htmlFor="lead-language">Langue</Label><NativeSelect id="lead-language" value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })}><option value="">Toutes les langues</option>{Object.entries(languageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div></details>
          <details><summary>Dates</summary><div className="grid gap-3"><Label htmlFor="lead-from">Reçue à partir du</Label><Input id="lead-from" type="date" value={draft.received_from} onChange={event => setDraft({ ...draft, received_from: event.target.value })} /><Label htmlFor="lead-to">Reçue jusqu’au</Label><Input id="lead-to" type="date" value={draft.received_to} onChange={event => setDraft({ ...draft, received_to: event.target.value })} /></div></details>
          <details><summary>Affichage</summary><div className="grid gap-3"><Label htmlFor="lead-sort">Trier par</Label><NativeSelect id="lead-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="-received_at">Réception récente</option><option value="name">Nom du contact</option></NativeSelect><Label htmlFor="lead-page-size">Lignes par page</Label><NativeSelect id="lead-page-size" value={draft.page_size} onChange={event => setDraft({ ...draft, page_size: Number(event.target.value) })}>{[10, 20, 25, 50, 100].map(size => <option value={size} key={size}>{size}</option>)}</NativeSelect></div></details>
        </details>
        {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}
      </fieldset>
      <div className="crm-filter-submit">
        <Button action="filter" type="submit" variant={contactId ? "outline" : "default"} disabled={!hydrated}>Appliquer</Button>
        <Button action="reset" type="button" variant="quiet" disabled={!hydrated} onClick={clearFilters}>Réinitialiser</Button>
      </div>
      {contactId ? <p className="crm-filter-note">Les filtres sont appliqués automatiquement.</p> : null}
    </form>}>
      {notice ? <p role="status">{notice}</p> : null}
      {boardFailure && board ? <RecordError error={boardFailure} retry={() => { setBoardFailure(undefined); setBoardEpoch(epoch => epoch + 1); refresh(); }} /> : null}
      {role !== "agent" && contactId ? <ExportAction kind="enquiries" filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined }} total={result?.total ?? 0} available={Boolean(result && !error && recordArchive === "active")} scopeError={error} /> : null}
      {error ? <RecordError error={error} retry={() => { setLifecycleError(undefined); refresh(); }} /> : !result ? <div className="kay-sales-loading" role="status">
        <span className="sr-only">Chargement des prospects…</span>
        {[0, 1, 2, 3, 4, 5].map(index => <Skeleton key={index} aria-hidden="true" className="motion-reduce:animate-none" />)}
      </div> : <>
        <h2 className={!contactId && recordArchive === "active" ? "sr-only" : "crm-results-title"} role="status">{recordArchive === "archived" ? "Archives · " : ""}{result.total} demande{result.total > 1 ? "s" : ""}</h2>
        <div hidden={board} className={!contactId ? "kay-sales-list" : undefined}>
        {!result.items.length ? <div className="kay-sales-empty">
          <ContactsIcon size={24} aria-hidden="true" />
          <h2>{recordArchive === "archived" ? "Aucun prospect archivé" : "Aucune demande"}</h2>
          <p>{activeCount ? "Aucune demande ne correspond à vos filtres." : result.total ? "Revenez à la première page pour retrouver vos demandes." : recordArchive === "archived" ? "Vos prospects archivés apparaîtront ici." : "Les nouvelles demandes apparaîtront ici."}</p>
          {activeCount ? <Button action="reset" variant="outline" onClick={clearFilters}>Réinitialiser les filtres</Button> : null}
        </div> : <ScrollableResultsTable><DataTable mobileCard={(lead, selection) => <DirectoryRecordCard title={lead.contact.name} href={`/leads/${lead.id}`} agent={lead.assigned_agent?.display_name ?? "File du responsable"} status={<CrmStatusBadge dot={false} state={lead.status}>{statusLabels[lead.status]}</CrmStatusBadge>} phone={lead.contact.primary_phone} selection={selection} metadata={<><CrmStatusBadge dot={false} state={lead.rating}>{ratingLabels[lead.rating]}</CrmStatusBadge><strong>{lead.initial_budget ?? "À qualifier"}</strong><span className="kay-prospect-card-source" title={campaignLabels[lead.campaign_source]}>{campaignLabels[lead.campaign_source]}</span></>} details={[...(!contactId ? [{ label: "Source", value: campaignLabels[lead.campaign_source] }] : []), { label: "E-mail", value: lead.contact.primary_email ?? "Non renseigné" }, { label: "Provenance", value: sourceLabels[lead.source] }, { label: "Pays", value: countryLabel(lead.contact.country) }, { label: "Langues", value: lead.contact.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées" }, { label: "Réception", value: formatInstant(lead.received_at) }, { label: "Modifié le", value: formatInstant(lead.updated_at) }, { label: "Demande", value: lead.message_preview || "Non renseignée" }]} />} className="crm-directory-table min-w-table" scrollLabel="Tableau des prospects, défilement vertical et horizontal" rows={result.items} selectionLocked={projection.holding} getRowId={row => row.id} rowSelectionLabel={row => row.contact.name} selectionAction={(selected, clear) => selected.length === 1 && (role !== "agent" || selected[0].assigned_agent?.id === actorId) ? <RecordLifecycleAction key={selected[0].id} role={role} actorId={actorId} heldChanged={projection.hold} denied={setLifecycleError} kind="enquiries" id={selected[0].id} version={selected[0].version} archivedAt={selected[0].archived_at} label={selected[0].contact.name} onChanged={() => { refreshQuietly(); projection.hold(false); clear(); }} /> : <span className="text-xs text-muted-foreground">{selected.length > 1 ? "Archivez une fiche à la fois." : "Seul l’agent attribué peut archiver cette fiche."}</span>} footerCaption={Boolean(contactId)} columns={tableColumns} caption="Une ligne par demande, même si le contact est déjà connu." emptyLabel="Aucune demande." /></ScrollableResultsTable>}
        <div className={!contactId ? "kay-sales-pagination" : undefined}><NumberedPages compact={!contactId} showPageSize={!contactId} page={page} total={result.total} size={result.page_size} change={setPage} /></div>
        </div>
      </>}
      {boardVisited && !contactId && !scopeDenied && !boardFailure ? <LeadKanban key={boardEpoch} active={board && Boolean(result) && !error} filters={{ ...filters, contact_id: contactId, archive: archived ? "archived" : undefined, record_archive: recordArchive }} revision={revision} changed={refreshQuietly} denied={boardDenied} returnFocus={listRef} /> : null}
    </FilterResultsLayout>
  </div>;
}
