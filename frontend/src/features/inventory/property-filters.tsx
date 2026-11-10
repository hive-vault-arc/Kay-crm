import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FilterIcon, SearchIcon } from "@/components/icons";
import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels, kindLabels, propertyCategoryOrder, stateLabels, type PropertyPage } from "./contracts";
import { propertyDefaults, propertyCategoryChoice, type PropertyFilters } from "./property-directory-model";
import { InventoryRangeFields } from "./inventory-range-fields";

export function PropertyFilterFields({ filters, change, reset, value, error, apply }: { filters: PropertyFilters; change: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void; reset: () => void; value?: PropertyPage; error?: string; apply: () => void }) {
  const hydrated = useHydrated(), selected = propertyCategoryChoice(filters.categories);
  const categories = propertyCategoryOrder.filter(category => category !== "house" || selected === "house" || Boolean(value && value.category_counts.house > 0));
  return <form className="kay-sales-filters" aria-label="Filtres des biens" onSubmit={event => { event.preventDefault(); apply(); }}>
    <fieldset disabled={!hydrated} className="crm-directory-filter-form grid min-w-0 gap-5">
      <div className="grid gap-2"><Label htmlFor="inventory-search">Rechercher</Label><div className="crm-search-input"><SearchIcon aria-hidden="true" /><Input id="inventory-search" aria-label="Rechercher un nom, une référence ou un lieu" placeholder="Nom, référence, lieu" maxLength={160} value={filters.q} onChange={event => change("q", event.target.value)} /></div></div>
      <fieldset className="grid gap-2"><legend id="inventory-category-label" className="mb-2 text-sm font-semibold">Catégorie</legend>
        <RadioGroup aria-labelledby="inventory-category-label" value={selected} disabled={!value} className="gap-1" onValueChange={category => { if (category === "all") change("categories", propertyDefaults.categories); else if (propertyCategoryOrder.some(value => value === category)) change("categories", category); }}>
          <label htmlFor="inventory-category-all" className="project-category-filter flex min-h-control cursor-pointer items-center gap-3 rounded-sm px-2"><RadioGroupItem id="inventory-category-all" value="all" aria-label="Toutes" /><span className="flex-1 text-sm">Toutes</span><span className="text-xs text-muted-foreground tabular-nums">{value ? value.unfiltered_total.toLocaleString("fr-MA") : "…"}</span></label>
          {categories.map(category => <label key={category} htmlFor={`inventory-category-${category}`} className="project-category-filter flex min-h-control cursor-pointer items-center gap-3 rounded-sm px-2" data-property-category={category}><RadioGroupItem id={`inventory-category-${category}`} value={category} aria-label={categoryLabels[category]} /><span className="flex-1 text-sm">{categoryLabels[category]}</span><span className="text-xs text-muted-foreground tabular-nums">{value ? value.category_counts[category].toLocaleString("fr-MA") : "…"}</span></label>)}
        </RadioGroup>
        {!selected ? <p className="text-xs text-muted-foreground">{filters.categories ? "Plusieurs catégories sélectionnées." : "Aucune catégorie sélectionnée."} Choisissez une catégorie ou Toutes.</p> : null}
      </fieldset>
      <div className="grid gap-2"><Label htmlFor="inventory-kind">Type d’offre</Label><NativeSelect id="inventory-kind" value={filters.offering_kind} onChange={event => change("offering_kind", event.target.value)}><option value="">Toutes les offres</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="inventory-state">Statut de l’offre</Label><NativeSelect id="inventory-state" value={filters.state} onChange={event => change("state", event.target.value)}><option value="">Tous les statuts</option>{Object.entries(stateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="inventory-sort">Trier par</Label><NativeSelect id="inventory-sort" value={filters.sort} onChange={event => change("sort", event.target.value)}><option value="-updated_at">Modification récente</option><option value="reference">Référence</option></NativeSelect></div>
      <InventoryRangeFields prefix="inventory" values={filters} change={change} error={error} />
      <details className="crm-filter-advanced"><summary className="flex min-h-control cursor-pointer items-center gap-3 text-sm font-medium text-link"><FilterIcon aria-hidden="true" className="size-5 shrink-0" />Filtres avancés des biens</summary><div className="grid gap-4 pt-3"><ArchiveFilter value={filters.archive} change={value => change("archive", value)} /><div className="grid gap-2"><Label htmlFor="inventory-size">Biens par page</Label><NativeSelect id="inventory-size" value={filters.page_size} onChange={event => change("page_size", Number(event.target.value))}>{[10,20,25,50,100].map(size => <option key={size} value={size}>{size}</option>)}</NativeSelect></div><p className="text-xs text-muted-foreground">Les identités et justificatifs privés des propriétaires restent protégés.</p></div></details>
    </fieldset>
    <div className="crm-filter-submit"><Button action="filter" type="submit" disabled={!hydrated}>Appliquer</Button><Button action="reset" type="button" variant="quiet" onClick={reset}>Réinitialiser</Button></div>
  </form>;
}
