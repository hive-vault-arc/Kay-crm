"use client";

import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { TabsContent } from "@/components/ui/tabs";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { useHydrated } from "@/hooks/use-hydrated";
import { developmentsSchema, developmentFieldsSchema, developmentPhaseLabels } from "./development-contracts";
import { categoryLabels, kindLabels, stateLabels } from "./contracts";
import { DevelopmentCard, DevelopmentList } from "./development-card";
import { ProjectResultsView, type ProjectViewState } from "./project-results-view";
import { InventoryRangeFields } from "./inventory-range-fields";
import { inventoryRangeDefaults, inventoryRangeError, inventoryRangeQuery } from "./inventory-range";

const defaults = { archive: "active", q: "", category: "", phase: "", offering_kind: "", state: "", sort: "-updated_at", page_size: 20, ...inventoryRangeDefaults };
export function DevelopmentDirectory({ writable, view, changeView }: { writable: boolean } & ProjectViewState) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount, invalid } = useDirectoryFilters(defaults, undefined, undefined, inventoryRangeError);
  const hydrated = useHydrated();
  const result = useQuery(queryPath("developments", { ...filters, ...inventoryRangeQuery(filters), page }), developmentsSchema);
  return <FilterResultsLayout title="Filtres des programmes" reference active={activeCount > 0} activeCount={activeCount} reset={reset} filters={close => <form aria-label="Filtres des programmes" onSubmit={event => { event.preventDefault(); apply(close); }}><fieldset disabled={!hydrated} className="grid gap-4">
    <div className="grid gap-2"><Label htmlFor="development-search">Rechercher</Label><Input placeholder="Nom ou référence" id="development-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div>
    {result.value?.phase_supported || draft.phase ? <div className="grid gap-2"><Label htmlFor="development-list-phase">Statut du programme</Label><NativeSelect id="development-list-phase" value={draft.phase} onChange={event => { if (!event.target.value || result.value?.phase_supported) setDraft(current => ({ ...current, phase: event.target.value })); }}><option value="">Tous les statuts</option>{Object.entries(developmentPhaseLabels).map(([value, label]) => <option key={value} value={value} disabled={!result.value?.phase_supported}>{label}</option>)}</NativeSelect></div> : null}
    <div className="grid gap-2"><Label htmlFor="development-list-category">Catégorie</Label><NativeSelect id="development-list-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories</option>{developmentFieldsSchema.shape.category.options.map(value => <option key={value} value={value}>{value === "mixed" ? "Mixte" : categoryLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-kind">Offre du programme</Label><NativeSelect id="development-list-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option>{(["sale", "rental"] as const).map(value => <option key={value} value={value}>{kindLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-state">État de l’offre</Label><NativeSelect id="development-list-state" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="">Tous les états</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
    <InventoryRangeFields prefix="development" values={draft} dimensions={false} change={(key, value) => setDraft(current => ({ ...current, [key]: value }))} error={invalid} />
    <p className="text-xs text-muted-foreground">Le prix filtre les offres du programme entier, pas celles de ses unités.</p>
    <details className="crm-filter-advanced"><summary>Archives</summary><div className="grid gap-3 pt-3"><ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} /></div></details>
    <div className="flex flex-wrap gap-2"><Button action="filter" variant="outline" type="submit">Appliquer</Button><Button action="reset" variant="quiet" type="button" onClick={reset}>Réinitialiser</Button></div>
  </fieldset></form>}>
    <ProjectResultsView view={view} changeView={changeView} entity="programmes" status={result.error ? "Programmes indisponibles" : result.value ? `${result.value.total} programme${result.value.total > 1 ? "s" : ""}` : "Chargement des programmes…"} sort={draft.sort} changeSort={value => setDraft(current => ({ ...current, sort: value }))}>
      {!writable ? <p className="text-sm text-muted-foreground">Programmes partagés en lecture seule.</p> : null}
      {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <div role="status" className="kay-project-grid" aria-label="Chargement des cartes de programmes">{Array.from({ length: 4 }, (_, index) => <div key={index} className="project-card-skeleton rounded-md border bg-card" aria-hidden="true" />)}</div> : <>
        {result.value.items.length ? <><TabsContent value="cards"><div className="kay-project-grid">{result.value.items.map(item => <DevelopmentCard key={item.id} development={item} />)}</div></TabsContent><TabsContent value="list"><DevelopmentList developments={result.value.items} /></TabsContent></> : <div role="status" className="surface grid gap-3"><h2 className="text-section">Aucun programme correspondant</h2><p>Modifiez les filtres ou revenez à la première page.</p><Button action="reset" variant="outline" onClick={reset} className="justify-self-start">Réinitialiser les filtres</Button></div>}
        {result.value.total > filters.page_size || page > 1 ? <NumberedPages compact label="Pages des programmes" page={page} total={result.value.total} size={result.value.page_size} change={setPage} /> : null}
      </>}
    </ProjectResultsView>
  </FilterResultsLayout>;
}
