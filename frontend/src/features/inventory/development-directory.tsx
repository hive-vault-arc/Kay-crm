"use client";
import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { InventoryCard } from "./inventory-card";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { developmentsSchema } from "./development-contracts";
import { categoryLabels, kindLabels } from "./contracts";

const defaults = { archive: "active", q: "", category: "", offering_kind: "", state: "", sort: "-updated_at", page_size: 25 };
export function DevelopmentDirectory({ writable }: { writable: boolean }) {
  const [draft, setDraft] = useState(defaults); const [filters, setFilters] = useState(defaults); const [page, setPage] = useState(1); const hydrated = useHydrated();
  const result = useQuery(queryPath("developments", { ...filters, page }), developmentsSchema);
  return <FilterResultsLayout title="Filtres des programmes" active={Object.entries(filters).some(([key, value]) => value !== defaults[key as keyof typeof defaults])} filters={close => <form className="filter-toolbar rounded-t-none" aria-label="Filtres des programmes" onSubmit={event => { event.preventDefault(); setFilters(draft); setPage(1); close(); }}><fieldset disabled={!hydrated} className="grid min-w-0 items-center gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto_auto]"><div className="grid gap-2"><Label className="sr-only" htmlFor="development-search">Rechercher un programme</Label><Input placeholder="Rechercher un programme" id="development-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div><div className="grid gap-2"><Label className="sr-only" htmlFor="development-list-category">Catégorie du programme</Label><NativeSelect id="development-list-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories, mixtes inclus</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><div className="grid gap-2"><Label className="sr-only" htmlFor="development-list-kind">Offre du programme entier</Label><NativeSelect id="development-list-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><details className="min-w-0 open:col-span-full"><summary className="flex min-h-control cursor-pointer items-center text-sm font-medium text-link">Archivage des programmes</summary><div className="max-w-xs pt-3"><ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} /></div></details><Button action="filter" variant="outline" className="justify-self-start" type="submit">Filtrer les programmes</Button></fieldset></form>}>
    {!writable ? <p>Programmes partagés en lecture seule.</p> : null}{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des programmes…</p> : <><p role="status">{result.value.total} programme(s) correspondant(s).</p><div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">{result.value.items.map(item => <InventoryCard key={item.id} reference={item.reference} name={item.name} category={item.category} location={item.location} href={`/projects/${item.id}`} offerings={item.offerings} units={{ total: item.unit_count, available: item.available_unit_count }} />)}</div><p className="text-xs text-muted-foreground">Les programmes et leurs unités sont comptés séparément. Un type réutilisable n’est pas une unité.</p>{!result.value.items.length ? <p>Aucun programme sur cette page. Modifiez les filtres ou revenez à la première page.</p> : null}<NumberedPages label="Pages des programmes" page={page} total={result.value.total} size={25} change={setPage} /></>}</FilterResultsLayout>;
}
