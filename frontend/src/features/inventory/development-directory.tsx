"use client";

import { ArchiveFilter } from "@/features/discovery/archive-filter";
import Link from "next/link";
import { DirectoryEmpty } from "@/components/shared/directory-presentation";
import { SearchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { useHydrated } from "@/hooks/use-hydrated";
import { developmentsSchema, developmentFieldsSchema, developmentPhaseLabels } from "./development-contracts";
import { categoryLabels, kindLabels, stateLabels } from "./contracts";
import { DevelopmentCard, DevelopmentList } from "./development-card";
import { ProjectFilters, ProjectResultsView, type ProjectFilterRail, type ProjectView } from "./project-results-view";
import { InventoryRangeFields } from "./inventory-range-fields";
import { inventoryRangeDefaults, inventoryRangeError, inventoryRangeQuery } from "./inventory-range";

const defaults = { archive: "active", q: "", category: "", phase: "", offering_kind: "", state: "", sort: "-updated_at", page_size: 20, ...inventoryRangeDefaults };
export function DevelopmentDirectory({ writable, view, rail }: { writable: boolean; rail: ProjectFilterRail; view: ProjectView }) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount, invalid } = useDirectoryFilters(defaults, undefined, undefined, inventoryRangeError);
  const hydrated = useHydrated();
  const result = useQuery(queryPath("developments", { ...filters, ...inventoryRangeQuery(filters), page }), developmentsSchema);
  const data = result.error ? undefined : result.value;
  return <ProjectFilters id="development-filter-rail" title="Filtres des programmes" rail={rail} activeCount={activeCount} reset={reset} filters={close => <form className="kay-sales-filters" aria-label="Filtres des programmes" onSubmit={event => { event.preventDefault(); apply(close); }}><fieldset disabled={!hydrated} className="grid gap-4">
    <div className="grid gap-2"><Label htmlFor="development-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input placeholder="Nom ou référence" id="development-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div></div>
    {result.value?.phase_supported || draft.phase ? <div className="grid gap-2"><Label htmlFor="development-list-phase">Statut du programme</Label><NativeSelect id="development-list-phase" value={draft.phase} onChange={event => { if (!event.target.value || result.value?.phase_supported) setDraft(current => ({ ...current, phase: event.target.value })); }}><option value="">Tous les statuts</option>{Object.entries(developmentPhaseLabels).map(([value, label]) => <option key={value} value={value} disabled={!result.value?.phase_supported}>{label}</option>)}</NativeSelect></div> : null}
    <div className="grid gap-2"><Label htmlFor="development-list-category">Catégorie</Label><NativeSelect id="development-list-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories</option>{developmentFieldsSchema.shape.category.options.map(value => <option key={value} value={value}>{value === "mixed" ? "Mixte" : categoryLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-kind">Offre du programme</Label><NativeSelect id="development-list-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option>{(["sale", "rental"] as const).map(value => <option key={value} value={value}>{kindLabels[value]}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-list-state">État de l’offre</Label><NativeSelect id="development-list-state" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="">Tous les états</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
    <div className="grid gap-2"><Label htmlFor="development-sort">Trier par</Label><NativeSelect id="development-sort" value={draft.sort} onChange={event => setDraft(current => ({ ...current, sort: event.target.value }))}><option value="-updated_at">Modification récente</option><option value="reference">Référence</option></NativeSelect></div>
    <InventoryRangeFields prefix="development" values={draft} dimensions={false} change={(key, value) => setDraft(current => ({ ...current, [key]: value }))} error={invalid} />
    <p className="text-xs text-muted-foreground">Le prix filtre les offres du programme entier, pas celles de ses unités.</p>
    <details className="crm-filter-advanced"><summary>Archives</summary><div className="grid gap-3 pt-3"><ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} /></div></details>
    </fieldset><div className="crm-filter-submit"><Button action="filter" type="submit" disabled={!hydrated}>Appliquer</Button><Button action="reset" variant="quiet" type="button" onClick={reset}>Réinitialiser</Button></div>
  </form>}>
    <ProjectResultsView view={view} loading={!data && !result.error ? "programmes" : undefined} status={result.error ? "Programmes indisponibles" : data ? `${data.total} programme${data.total > 1 ? "s" : ""}` : ""}
      cards={data ? <div className="kay-project-grid"><div className="kay-project-grid-content">{data.items.map(item => <DevelopmentCard key={item.id} development={item} />)}</div></div> : undefined}
      list={data ? <DevelopmentList developments={data.items} /> : undefined}
      footer={data && (data.total > 0 || page > 1) ? <NumberedPages compact showPageSize label="Pages des programmes" page={page} total={data.total} size={data.page_size} change={setPage} /> : null}>
      {result.error ? <RecordError error={result.error} retry={result.refresh} /> :
        data && !data.items.length ? <DirectoryEmpty title={data.total ? "Aucun programme sur cette page" : activeCount ? "Aucun programme correspondant" : "Aucun programme immobilier"} action={data.total ? <Button action="back" variant="outline" onClick={() => setPage(1)}>Première page</Button> : activeCount ? <Button action="reset" variant="outline" onClick={reset}>Réinitialiser les filtres</Button> : writable ? <Button action="create" asChild><Link href="/projects/new">Créer le premier programme</Link></Button> : undefined}>{data.total ? "Revenez à la première page pour retrouver les programmes." : activeCount ? "Essayez un autre nom, une référence ou un filtre." : "Les programmes ajoutés à l’inventaire apparaîtront ici."}</DirectoryEmpty> : null}
    </ProjectResultsView>
  </ProjectFilters>;
}
