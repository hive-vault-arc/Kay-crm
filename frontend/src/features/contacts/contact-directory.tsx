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
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ExportAction } from "@/features/discovery/export-action";
import { useHydrated } from "@/hooks/use-hydrated";
import { contactsSchema, type ContactSummary, type StaffRole } from "./contracts";
import { queryPath, useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { NumberedPages } from "./numbered-pages";
import { countryLabel } from "./qualification-inputs";
import { languageLabels } from "./qualification-contracts";

const columns: ColumnDef<ContactSummary>[] = [
  { id: "name", header: "Contact", cell: ({ row }) => <CrmContactCell contact={row.original} href={`/contacts/${row.original.id}`} describedBy={`contact-phone-${row.original.id}`} /> },
  { id: "agent", header: "Agent responsable", cell: ({ row }) => <CrmAgent name={row.original.primary_agent.display_name} /> },
  { id: "email", header: "E-mail", cell: ({ row }) => row.original.primary_email ?? "Non renseigné" },
  { id: "country", header: "Pays", cell: ({ row }) => countryLabel(row.original.country) },
  { id: "languages", header: "Langues", cell: ({ row }) => row.original.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées" },
  { id: "status", header: "Statut", cell: ({ row }) => <CrmStatusBadge state={row.original.archived_at ? "archived" : "active"}>{row.original.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge> },
];

export function ContactDirectory({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const [text, setText] = useState(""), [q, setQ] = useState(""), [page, setPage] = useState(1), [archive, setArchive] = useState("active");
  const { value, error, refresh } = useQuery(queryPath("contacts", { q, page, page_size: 20, archive }), contactsSchema);
  function reset() { setText(""); setQ(""); setArchive("active"); setPage(1); }
  const tools = (exportActions?: ReactNode) => <CrmDirectoryToolbar primary={<Button action="create" asChild><Link href="/leads/new">Nouveau prospect</Link></Button>}><Button action="enquiry" asChild variant="quiet"><Link href="/leads">Prospects</Link></Button>{exportActions}</CrmDirectoryToolbar>;
  const toolbar = role !== "agent" && value ? <ExportAction compact kind="contacts" filters={{ q, archive }} total={value.total} renderActions={tools} /> : tools();
  return <div className="crm-directory"><CrmDirectoryHeader title="Contacts" count={value?.total} noun="contacts" description="Une identité commune à plusieurs dossiers." route="/contacts" actions={toolbar} />
    <FilterResultsLayout title="Filtres des contacts" active={Boolean(q || archive !== "active")} activeCount={Number(Boolean(q)) + Number(archive !== "active")} reference reset={reset} filters={close => <form aria-label="Recherche et filtres des contacts" onSubmit={event => { event.preventDefault(); setQ(text); setPage(1); close(); }}><fieldset disabled={!hydrated} className="grid gap-4"><div className="grid gap-2"><Label htmlFor="directory-search">Rechercher</Label><Input placeholder="Nom, téléphone ou e-mail" id="directory-search" value={text} maxLength={160} onChange={event => setText(event.target.value)} /></div>{role !== "agent" ? <div className="grid gap-2"><Label htmlFor="directory-archive">Statut</Label><NativeSelect id="directory-archive" value={archive} onChange={event => { setArchive(event.target.value); setPage(1); }}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous les contacts</option></NativeSelect></div> : null}<Button action="search" type="submit" variant="outline">Rechercher</Button><Button action="reset" type="button" variant="quiet" onClick={reset}>Réinitialiser</Button></fieldset></form>}>
      {error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement des contacts…</p> : <><p className="text-sm text-muted-foreground" role="status">{value.total} contact(s) accessible(s)</p><DataTable rows={value.items} columns={columns} getRowId={contact => contact.id} className="crm-directory-table" caption="Contacts accessibles et agents responsables" emptyLabel={q ? "Aucun contact ne correspond à votre recherche." : archive === "archived" ? "Aucun contact archivé." : "Aucun contact. Créez un prospect pour ajouter son contact."} footerCaption mobileCard={contact => <DirectoryRecordCard title={contact.name} href={`/contacts/${contact.id}`} agent={contact.primary_agent.display_name} phone={contact.primary_phone} status={<CrmStatusBadge state={contact.archived_at ? "archived" : "active"}>{contact.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} metadata={countryLabel(contact.country)} details={[{ label: "E-mail", value: contact.primary_email ?? "Non renseigné" }, { label: "Langues", value: contact.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées" }]} />} /><NumberedPages compact label="Pages des contacts" page={page} total={value.total} size={value.page_size} change={setPage} /></>}
    </FilterResultsLayout>
  </div>;
}
