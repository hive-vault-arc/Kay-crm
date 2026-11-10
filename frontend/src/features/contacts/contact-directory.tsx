"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmDirectoryToolbar, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { DirectoryRecordCard } from "@/components/shared/directory-record-card";
import { DataTable } from "@/components/shared/data-table";
import { DirectoryEmpty, DirectoryLoading, useDirectoryRail } from "@/components/shared/directory-presentation";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { SearchIcon } from "@/components/icons";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ExportAction } from "@/features/discovery/export-action";
import { useHydrated } from "@/hooks/use-hydrated";
import { contactsSchema, roleLabels, type DirectoryContact, type StaffRole } from "./contracts";
import { AgentPicker } from "./agent-picker";
import { DirectoryCountryFilter } from "./directory-country-filter";
import { useDirectoryFilters } from "./use-directory-filters";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { NumberedPages } from "./numbered-pages";
import { countryLabel } from "./qualification-inputs";
import { languageLabels } from "./qualification-contracts";

const columns: ColumnDef<DirectoryContact>[] = [
  { id: "name", header: "Contact", cell: ({ row }) => <CrmContactCell contact={row.original} href={`/contacts/${row.original.id}`} /> },
  { id: "phone", size: 145, header: "Téléphone", cell: ({ row }) => <a className="kay-directory-coordinate" href={`tel:${row.original.primary_phone}`}>{row.original.primary_phone}</a> },
  { id: "email", header: "E-mail", cell: ({ row }) => row.original.primary_email ? <a className="kay-directory-coordinate" href={`mailto:${row.original.primary_email}`}>{row.original.primary_email}</a> : <span className="text-muted-foreground">Non renseigné</span> },
  { id: "enquiries", size: 82, header: "Prospects", cell: ({ row }) => <span className="tabular-nums">{row.original.dossier_counts?.enquiries}</span> },
  { id: "deals", size: 74, header: "Affaires", cell: ({ row }) => <span className="tabular-nums">{row.original.dossier_counts?.deals}</span> },
  { id: "agent", size: 150, header: "Agent responsable", cell: ({ row }) => <CrmAgent name={row.original.primary_agent.display_name} /> },
  { id: "status", size: 94, header: "Statut", cell: ({ row }) => <CrmStatusBadge state={row.original.archived_at ? "archived" : "active"}>{row.original.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge> },
];
const defaults = { q: "", primary_agent_id: "", language: "", linked: "", country: "", role: "", created_from: "", created_to: "", archive: "active", sort: "-updated_at", page_size: 20 };

export function ContactDirectory({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const [agentLabel, setAgentLabel] = useState("");
  const { draft, setDraft, filters, page, setPage, invalid, apply, reset, activeCount } = useDirectoryFilters(defaults, "created_from", "created_to");
  const { value, error, refresh } = useQuery(queryPath("contacts", { ...filters, page }), contactsSchema);
  const supported = value?.directory_supported === true;
  const { control, rail } = useDirectoryRail("contact-filter-rail", activeCount, reset, hydrated);
  const create = <Button action="create" asChild><Link href="/leads/new">Nouveau prospect</Link></Button>;
  const tools = (exportActions?: ReactNode) => <CrmDirectoryToolbar controls={control} primary={create}><Button action="enquiry" asChild variant="quiet"><Link href="/leads">Prospects</Link></Button>{role !== "agent" ? <Button action="upload" asChild variant="quiet"><Link href="/leads?view=import">Importer des contacts</Link></Button> : null}{exportActions}</CrmDirectoryToolbar>;
  const toolbar = role !== "agent" ? <ExportAction compact kind="contacts" filters={filters} total={value?.total ?? 0} available={Boolean(value && !error)} scopeError={error} renderActions={tools} /> : tools();
  return <div className="crm-directory kay-sales-directory kay-party-directory" data-sales-view="list"><CrmDirectoryHeader title="Contacts" count={error ? undefined : value?.total} unavailable={Boolean(error)} noun="contacts" description="Une identité commune à plusieurs dossiers." route="/contacts" actions={toolbar} />
    <FilterResultsLayout {...rail} title="Filtres des contacts" active={activeCount > 0} activeCount={activeCount} reference reset={reset} filters={close => <form className="crm-directory-filter-form kay-sales-filters" aria-label="Recherche et filtres des contacts" onSubmit={event => { event.preventDefault(); apply(close); }}><fieldset disabled={!hydrated} className="grid gap-4">
      <div className="grid gap-2"><Label htmlFor="directory-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input placeholder="Nom, téléphone ou e-mail" id="directory-search" value={draft.q} maxLength={160} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div></div>
      <fieldset disabled={!supported} className="grid gap-4">
        <details><summary>Agent responsable</summary>{supported || draft.primary_agent_id ? <AgentPicker purpose="contact-filter" optional selectedLabel={agentLabel} value={draft.primary_agent_id} change={(id, label) => { setDraft({ ...draft, primary_agent_id: id }); setAgentLabel(label ?? ""); }} /> : null}</details>
        <div className="grid gap-2"><Label htmlFor="contact-linked">Dossiers liés</Label><NativeSelect id="contact-linked" value={draft.linked} onChange={event => setDraft({ ...draft, linked: event.target.value })}><option value="">Tous les contacts</option><option value="enquiries">Avec prospects</option><option value="deals">Avec affaires</option><option value="none">Sans dossier</option></NativeSelect><p className="text-xs text-muted-foreground">Dossiers non archivés. Prospects hors convertis.</p></div>
        <div className="grid gap-2"><Label htmlFor="contact-role">Rôle</Label><NativeSelect id="contact-role" value={draft.role} onChange={event => setDraft({ ...draft, role: event.target.value })}><option value="">Tous les rôles</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <details><summary>Date de création</summary><div className="grid gap-3"><div className="grid gap-2"><Label htmlFor="contact-created-from">Créé du</Label><Input id="contact-created-from" type="date" value={draft.created_from} onChange={event => setDraft({ ...draft, created_from: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="contact-created-to">Au</Label><Input id="contact-created-to" type="date" value={draft.created_to} onChange={event => setDraft({ ...draft, created_to: event.target.value })} /></div></div></details>
      </fieldset>
      {value && !supported ? <p className="text-xs text-muted-foreground">Les filtres de responsabilité et de dossiers nécessitent la mise à jour du service.</p> : null}
      <details><summary>Pays et langue</summary><div className="grid gap-3"><DirectoryCountryFilter id="contact-country" value={draft.country} change={country => setDraft({ ...draft, country })} /><div className="grid gap-2"><Label htmlFor="contact-language">Langue</Label><Input id="contact-language" list="contact-languages" placeholder="Toutes les langues" value={draft.language} maxLength={60} onChange={event => setDraft({ ...draft, language: event.target.value })} /><datalist id="contact-languages">{Object.entries(languageLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</datalist></div></div></details>
      {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="directory-archive">Archivage</Label><NativeSelect id="directory-archive" value={draft.archive} onChange={event => setDraft({ ...draft, archive: event.target.value })}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous les contacts</option></NativeSelect></div> : null}
      <div className="grid gap-2"><Label htmlFor="contact-sort">Trier par</Label><NativeSelect id="contact-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option>{supported || draft.sort === "-created_at" ? <option disabled={!supported} value="-created_at">Création récente</option> : null}<option value="name">Nom du contact</option></NativeSelect></div>
      {invalid ? <p role="alert" className="text-sm text-danger">{invalid}</p> : null}</fieldset>
      <div className="crm-filter-submit"><Button action="filter" type="submit" disabled={!hydrated}>Appliquer</Button><Button action="reset" type="button" variant="quiet" onClick={reset}>Réinitialiser</Button></div>
    </form>}>
      {error ? <RecordError error={error} retry={refresh} /> : !value ? <DirectoryLoading label="Chargement des contacts…" /> : <div className="kay-sales-list">
        {!value.items.length ? <DirectoryEmpty title={value.total ? "Aucun contact sur cette page" : activeCount ? "Aucun contact ne correspond à vos filtres." : "Aucun contact enregistré"} action={value.total ? <Button action="back" variant="outline" onClick={() => setPage(1)}>Première page</Button> : activeCount ? <Button action="reset" variant="outline" onClick={reset}>Réinitialiser les filtres</Button> : create}>
          {value.total ? "Revenez à la première page pour retrouver les contacts." : activeCount ? "Essayez un autre nom, numéro ou filtre." : "Créez un prospect pour enregistrer ses coordonnées."}
        </DirectoryEmpty> : <ScrollableResultsTable><DataTable rows={value.items} columns={supported ? columns : columns.filter(column => column.id !== "enquiries" && column.id !== "deals")} getRowId={contact => contact.id} className="crm-directory-table" caption="Contacts accessibles et agents responsables" emptyLabel="Aucun contact" scrollLabel="Tableau des contacts, défilement vertical et horizontal" mobileCard={contact => <DirectoryRecordCard title={contact.name} href={`/contacts/${contact.id}`} agent={contact.primary_agent.display_name} phone={contact.primary_phone} status={<CrmStatusBadge state={contact.archived_at ? "archived" : "active"}>{contact.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} metadata={contact.dossier_counts ? <><span>{contact.dossier_counts.enquiries} prospect(s)</span><span>{contact.dossier_counts.deals} affaire(s)</span></> : countryLabel(contact.country)} details={[{ label: "E-mail", value: contact.primary_email ?? "Non renseigné" }, { label: "Pays", value: countryLabel(contact.country) }, { label: "Langues", value: contact.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées" }]} />} /></ScrollableResultsTable>}
        {value.total ? <div className="kay-sales-pagination"><NumberedPages compact showPageSize label="Pages des contacts" page={page} total={value.total} size={value.page_size} change={setPage} /></div> : null}
      </div>}
    </FilterResultsLayout>
  </div>;
}
