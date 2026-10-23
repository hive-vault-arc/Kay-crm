"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { DataTable } from "@/components/shared/data-table";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchIcon } from "@/components/icons";
import { contactsSchema, type ContactSummary, type StaffRole } from "@/features/contacts/contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { OwnerLoading } from "./owner-loading";

const columns: ColumnDef<ContactSummary>[] = [
  { id: "name", header: "Propriétaire", cell: ({ row: { original: owner } }) => <CrmContactCell contact={owner} href={`/owners/${owner.id}`} describedBy={`owner-phone-${owner.id}`} /> },
  { id: "state", header: "État", cell: ({ row }) => <CrmStatusBadge state={row.original.archived_at ? "archived" : "active"}>{row.original.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge> },
  { id: "agent", header: "Agent responsable", cell: ({ row }) => <CrmAgent name={row.original.primary_agent.display_name} /> },
  { id: "type", header: "Type", cell: ({ row }) => <span className="crm-source-cell">{row.original.type === "person" ? "Personne" : "Organisation"}</span> },
  { id: "email", header: "E-mail", cell: ({ row }) => row.original.primary_email ? <a className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`mailto:${row.original.primary_email}`}>{row.original.primary_email}</a> : <span className="text-muted-foreground">Non renseigné</span> },
];

export function OwnerDirectory({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [archive, setArchive] = useState("active");
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setQ(text.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [text]);
  const activeCount = Number(Boolean(q)) + Number(archive !== "active");
  const query = useQuery(queryPath("contacts", { owner_directory: "true", q, page, page_size: 50, archive }), contactsSchema);
  function clearFilters() { setText(""); setQ(""); setArchive("active"); setPage(1); }

  return <div className="crm-directory">
    <CrmDirectoryHeader title="Propriétaires" count={query.value?.total} noun="propriétaires" description="Retrouvez leurs coordonnées et les biens liés à chaque contact." route="/owners" />
    <FilterResultsLayout title="Filtres des propriétaires" reference active={activeCount > 0} activeCount={activeCount} reset={clearFilters} filters={close => <form className="crm-directory-filter-form" role="search" onSubmit={event => { event.preventDefault(); setQ(text.trim()); setPage(1); close(); }}>
      <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="owner-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input id="owner-search" value={text} maxLength={160} placeholder="Nom, téléphone ou e-mail" onChange={event => setText(event.target.value)} /></div></div>
        {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="owner-archive">État</Label><NativeSelect id="owner-archive" value={archive} onChange={event => { setArchive(event.target.value); setPage(1); }}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous</option></NativeSelect></div> : null}
        <div className="crm-filter-submit"><Button action="search" variant="outline" type="submit">Rechercher</Button><Button action="reset" variant="quiet" type="button" onClick={clearFilters}>Réinitialiser</Button></div>
      </fieldset>
      <p className="crm-filter-note">La recherche est appliquée automatiquement.</p>
    </form>}>
      <div className="crm-directory-toolbar"><Button action="create" asChild variant="creation" className="ml-auto"><Link href="/owners/new">Ajouter un propriétaire</Link></Button></div>
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <OwnerLoading /> : <>
        <h2 className="crm-results-title" aria-live="polite">{query.value.total} propriétaire{query.value.total > 1 ? "s" : ""}</h2>
        <ScrollableResultsTable><DataTable className="crm-directory-table min-w-table" columns={columns} rows={query.value.items} caption="Une ligne par propriétaire accessible." footerCaption scrollLabel="Tableau des propriétaires, défilement horizontal" emptyLabel={q ? "Aucun propriétaire ne correspond à cette recherche." : archive === "archived" ? "Aucun propriétaire archivé." : "Aucun propriétaire enregistré. Ajoutez-en un pour commencer."} /></ScrollableResultsTable>
        <NumberedPages compact page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des propriétaires" />
      </>}
    </FilterResultsLayout>
  </div>;
}
