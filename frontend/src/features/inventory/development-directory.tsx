"use client";

import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { useHydrated } from "@/hooks/use-hydrated";
import { developmentsSchema, developmentFieldsSchema } from "./development-contracts";
import { categoryLabels, kindLabels, stateLabels } from "./contracts";
import { InventoryCard } from "./inventory-card";

const defaults = { archive: "active", q: "", category: "", offering_kind: "", state: "", sort: "-updated_at", page_size: 20 };
export function DevelopmentDirectory({ writable }: { writable: boolean }) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount } = useDirectoryFilters(defaults);
  const hydrated = useHydrated();
  const result = useQuery(queryPath("developments", { ...filters, page }), developmentsSchema);
  return <FilterResultsLayout title="Filtres des programmes" reference active={activeCount > 0} activeCount={activeCount} reset={reset} filters={close => <form aria-label="Filtres des programmes" onSubmit={event => { event.preventDefault(); apply(close); }}><fieldset disabled={!hydrated} className="grid gap-4">
    <div className="grid gap-2"><Label htmlFor="development-search">Rechercher</Label><Input placeholder="Nom ou référence" id="development-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div>
    <div className="grid gap-2"><Label htmlFor="development-list-category">Catégorie</Label><NativeSelect id="development-list-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories</option>{developmentFieldsSchema.shape.category.options.map(value => <option key={value} value={value}>{value === "mixed" ? "Mixte" : categoryLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-kind">Offre du programme</Label><NativeSelect id="development-list-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option>{(["sale", "rental"] as const).map(value => <option key={value} value={value}>{kindLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-state">État de l’offre</Label><NativeSelect id="development-list-state" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="">Tous les états</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
    <details className="crm-filter-advanced"><summary>Affichage et archives</summary><div className="grid gap-3 pt-3"><ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} /><Label htmlFor="development-sort">Trier par</Label><NativeSelect id="development-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="reference">Référence</option></NativeSelect></div></details>
    <div className="flex flex-wrap gap-2"><Button action="filter" variant="outline" type="submit">Appliquer</Button><Button action="reset" variant="quiet" type="button" onClick={reset}>Réinitialiser</Button></div>
  </fieldset></form>}>
    {!writable ? <p className="text-sm text-muted-foreground">Programmes partagés en lecture seule.</p> : null}{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des programmes…</p> : <><p role="status" className="text-sm text-muted-foreground">{result.value.total} programme(s)</p><div className="kay-project-grid">{result.value.items.map(item => <InventoryCard key={item.id} reference={item.reference} name={item.name} category={item.category} location={item.location} href={`/projects/${item.id}`} offerings={item.offerings} units={{ total: item.unit_count, available: item.available_unit_count }} />)}</div>{!result.value.items.length ? <p className="text-sm text-muted-foreground">Aucun programme dans cette sélection. Modifiez les filtres pour élargir les résultats.</p> : null}<NumberedPages compact label="Pages des programmes" page={page} total={result.value.total} size={result.value.page_size} change={setPage} /></>}
  </FilterResultsLayout>;
}
