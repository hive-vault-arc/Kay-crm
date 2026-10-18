import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FilterIcon, SearchIcon } from "@/components/icons";
import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels, kindLabels, propertyCategoryOrder, stateLabels, type PropertyPage } from "./contracts";
import { togglePropertyCategory, type PropertyFilters } from "./property-directory-model";

export function PropertyFilterFields({ filters, search, searchChange, change, reset, value }: { filters: PropertyFilters; search: string; searchChange: (value: string) => void; change: <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) => void; reset: () => void; value?: PropertyPage }) {
  const hydrated = useHydrated(), selected = filters.categories ? filters.categories.split(",") : [];
  return <form aria-label="Filtres des biens" onSubmit={event => event.preventDefault()}>
    <fieldset disabled={!hydrated} className="project-filter-fields grid min-w-0 gap-6">
      <div className="grid gap-2"><Label htmlFor="inventory-search">Rechercher</Label><div className="relative"><SearchIcon aria-hidden="true" className="pointer-events-none absolute top-3 left-3 size-5 text-muted-foreground" /><Input id="inventory-search" aria-label="Rechercher un nom, une référence ou un lieu" placeholder="Nom, référence, lieu" className="pl-10" maxLength={160} value={search} onChange={event => searchChange(event.target.value)} /></div></div>
      <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-semibold">Catégorie</legend>{propertyCategoryOrder.filter(category => category !== "house" || !value || value.category_counts.house > 0).map(category => <label key={category} className="project-category-filter flex min-h-control cursor-pointer items-center gap-3 rounded-sm border bg-card px-2" data-property-category={category}>
        <Checkbox aria-label={categoryLabels[category]} disabled={!value} checked={selected.includes(category)} onCheckedChange={() => change("categories", togglePropertyCategory(filters.categories, category, value?.category_counts.house === 0))} />
        <span aria-hidden="true" className="project-category-dot" /><span className="flex-1 text-sm">{categoryLabels[category]}</span><span className="text-xs text-muted-foreground tabular-nums">{value ? value.category_counts[category] : "…"}</span>
      </label>)}</fieldset>
      <div className="grid gap-2"><Label htmlFor="inventory-kind">Type d’offre</Label><NativeSelect id="inventory-kind" value={filters.offering_kind} onChange={event => change("offering_kind", event.target.value)}><option value="">Vente et location</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="inventory-state">Statut de l’offre</Label><NativeSelect id="inventory-state" value={filters.state} onChange={event => change("state", event.target.value)}><option value="">Tous les statuts</option>{Object.entries(stateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <details className="min-w-0 border-y py-2"><summary className="flex min-h-control cursor-pointer items-center gap-3 text-sm font-medium text-link"><FilterIcon aria-hidden="true" className="size-5 shrink-0" />Filtres avancés des biens</summary><div className="grid gap-4 pt-3"><ArchiveFilter value={filters.archive} change={value => change("archive", value)} /><div className="grid gap-2"><Label htmlFor="inventory-size">Biens par page</Label><NativeSelect id="inventory-size" value={filters.page_size} onChange={event => change("page_size", Number(event.target.value))}>{[10,25,50,100].map(size => <option key={size} value={size}>{size}</option>)}</NativeSelect></div><p className="text-xs text-muted-foreground">Les identités et justificatifs privés des propriétaires restent protégés.</p></div></details>
      <p className="flex items-start gap-3 text-xs text-muted-foreground"><FilterIcon aria-hidden="true" className="size-5 shrink-0 text-link" />Filtres appliqués automatiquement</p>
      <Button action="reset" type="button" variant="outline" className="justify-self-start xl:hidden" onClick={reset}>Réinitialiser</Button>
    </fieldset>
  </form>;
}
