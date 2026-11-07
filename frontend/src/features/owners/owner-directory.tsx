"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type MouseEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CrmAgent, CrmContactCell, CrmDirectoryHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { DataTable } from "@/components/shared/data-table";
import { DirectoryRecordCard } from "@/components/shared/directory-record-card";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchIcon } from "@/components/icons";
import { contactsSchema, type ContactSummary, type StaffRole } from "@/features/contacts/contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { OwnerForm } from "./owner-form";
import { ownerDirectoryDefaults, ownerDirectoryPath, ownerDrawerIntent } from "./owner-directory-model";
import { OwnerLoading } from "./owner-loading";
import { OwnerPreviewDrawer } from "./owner-preview";

export function OwnerDirectory({ role, actorId }: { role: StaffRole; actorId?: string }) {
  const hydrated = useHydrated(), router = useRouter();
  const { draft, setDraft, filters, page, setPage, apply, reset } = useDirectoryFilters(ownerDirectoryDefaults);
  const query = useQuery(ownerDirectoryPath(filters, page, role), contactsSchema);
  const [panel, setPanel] = useState<{ id?: string }>();
  const returnFocus = useRef<HTMLElement | null>(null), createLink = useRef<HTMLAnchorElement>(null);
  const denied = query.error && [401, 403, 404].includes(query.error.status);
  const archive = role === "agent" ? "active" : filters.archive;
  const activeCount = Number(Boolean(filters.q.trim())) + Number(archive !== "active");
  function open(event: MouseEvent<HTMLAnchorElement>, id?: string) {
    if (!ownerDrawerIntent(event, hydrated)) return;
    event.preventDefault(); returnFocus.current = event.currentTarget; setPanel({ id });
  }
  const columns: ColumnDef<ContactSummary>[] = [
    { id: "name", header: "Propriétaire", cell: ({ row: { original: owner } }) => <CrmContactCell contact={owner} href={`/owners/${owner.id}`} describedBy={`owner-phone-${owner.id}`} onOpen={event => open(event, owner.id)} /> },
    { id: "state", header: "État", cell: ({ row }) => <CrmStatusBadge state={row.original.archived_at ? "archived" : "active"}>{row.original.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge> },
    { id: "agent", header: "Agent responsable", cell: ({ row }) => <CrmAgent name={row.original.primary_agent.display_name} /> },
    { id: "type", header: "Type", cell: ({ row }) => row.original.type === "person" ? "Personne" : "Organisation" },
    { id: "email", header: "E-mail", cell: ({ row }) => row.original.primary_email ? <a className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`mailto:${row.original.primary_email}`}>{row.original.primary_email}</a> : <span className="text-muted-foreground">Non renseigné</span> },
  ];
  return <div className="crm-directory">
    <CrmDirectoryHeader title="Propriétaires" count={!query.error ? query.value?.total : undefined} noun="propriétaires" description="Retrouvez leurs coordonnées et les biens liés à chaque contact." route="/owners" actions={<Button action="create" asChild variant="creation"><Link ref={createLink} prefetch={false} href="/owners/new" onClick={event => open(event)}>Ajouter un propriétaire</Link></Button>} />
    <FilterResultsLayout title="Filtres des propriétaires" reference active={activeCount > 0} activeCount={activeCount} reset={reset} filters={close => <form className="crm-directory-filter-form" aria-label="Recherche et filtres des propriétaires" role="search" onSubmit={event => { event.preventDefault(); apply(close); }}>
      <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
        <div className="grid gap-2"><Label htmlFor="owner-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input id="owner-search" value={draft.q} maxLength={160} placeholder="Nom, téléphone ou e-mail" onChange={event => setDraft(current => ({ ...current, q: event.target.value }))} /></div></div>
        {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="owner-archive">État</Label><NativeSelect id="owner-archive" value={draft.archive} onChange={event => setDraft(current => ({ ...current, archive: event.target.value }))}><option value="active">Actifs</option><option value="archived">Archivés</option><option value="all">Tous</option></NativeSelect></div> : null}
        <div className="crm-filter-submit"><Button action="search" variant="outline" type="submit">Rechercher</Button><Button action="reset" variant="quiet" type="button" onClick={reset}>Réinitialiser</Button></div>
      </fieldset><p className="crm-filter-note">La recherche est appliquée automatiquement.</p>
    </form>}>
      {query.error ? <RecordError error={query.error} retry={() => { setPanel(undefined); query.refresh(); }} /> : !query.value ? <OwnerLoading /> : <>
        <h2 className="crm-results-title" aria-live="polite">{query.value.total} propriétaire{query.value.total > 1 ? "s" : ""}</h2>
        <DataTable className="crm-directory-table" columns={columns} rows={query.value.items} getRowId={owner => owner.id} caption="Une ligne par propriétaire accessible." footerCaption scrollLabel="Tableau des propriétaires" emptyLabel={filters.q ? "Aucun propriétaire ne correspond à cette recherche." : archive === "archived" ? "Aucun propriétaire archivé." : "Aucun propriétaire enregistré. Ajoutez-en un pour commencer."} mobileCard={owner => <DirectoryRecordCard title={owner.name} href={`/owners/${owner.id}`} onOpen={event => open(event, owner.id)} agent={owner.primary_agent.display_name} phone={owner.primary_phone} status={<CrmStatusBadge state={owner.archived_at ? "archived" : "active"}>{owner.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge>} metadata={owner.type === "person" ? "Personne" : "Organisation"} details={[{ label: "E-mail", value: owner.primary_email ? <a className="inline-flex min-h-control items-center underline wrap-anywhere" href={`mailto:${owner.primary_email}`}>{owner.primary_email}</a> : "Non renseigné" }]} />} />
        <NumberedPages compact page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des propriétaires" />
      </>}
    </FilterResultsLayout>
    {!denied && panel ? panel.id ? <OwnerPreviewDrawer key={`${panel.id}:${actorId ?? ""}:${role}`} id={panel.id} actorId={actorId} role={role} onClosed={() => setPanel(undefined)} onChanged={query.refreshQuietly} onDenied={query.refresh} returnFocus={returnFocus} fallbackFocus={createLink} /> : <RecordDrawer label="Ajouter un propriétaire" title="Ajouter un propriétaire" description="Identité et coordonnées du contact propriétaire." initialOpen hideTrigger returnFocus={returnFocus} fallbackFocus={createLink} onClosed={() => setPanel(undefined)}>{(close, done) => <OwnerForm actorId={actorId} role={role} presentation="drawer" cancel={close} onDenied={query.refresh} onSaved={id => { done(); router.push(`/owners/${id}`); }} />}</RecordDrawer> : null}
  </div>;
}
