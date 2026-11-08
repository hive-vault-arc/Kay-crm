"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels, kindLabels, stateLabels } from "./contracts";
import { inventoryPageSchema } from "./development-contracts";
import { LevelPicker } from "./level-picker";
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { InventoryRangeFields } from "./inventory-range-fields";
import { inventoryRangeDefaults, inventoryRangeError, inventoryRangeQuery } from "./inventory-range";
import { ArchiveFilter } from "@/features/discovery/archive-filter";
import { PropertyEditor } from "./property-editor";
import { InventoryStatus, Price } from "./states";

const defaults = { archive: "active", q: "", block_id: "", floor_id: "", unit_type_id: "", category: "", state: "available", offering_kind: "", page_size: 20, ...inventoryRangeDefaults };

export function UnitDirectory({ id, writable, developmentLabel, blockId = "", floorId = "", unitTypeId = "", structureAction }: { id: string; writable: boolean; developmentLabel?: string; blockId?: string; floorId?: string; unitTypeId?: string; structureAction?: ReactNode }) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount, invalid } = useDirectoryFilters(defaults, undefined, undefined, inventoryRangeError, { ...defaults, block_id: blockId, floor_id: floorId, unit_type_id: unitTypeId });
  const hydrated = useHydrated();
  const result = useQuery(queryPath(`developments/${id}/inventory`, { ...filters, ...inventoryRangeQuery(filters), page }), inventoryPageSchema);
  return <div className="grid min-w-0 gap-4"><div className="kay-section-head"><h2>Unités physiques</h2><div className="kay-section-actions">{structureAction}{writable ? <RecordDrawer label="Créer une unité" action="create" description="Ajouter un bien physique rattaché à ce programme.">{close => <PropertyEditor developmentId={id} developmentLabel={developmentLabel} cancel={close} />}</RecordDrawer> : null}</div></div>
    <FilterResultsLayout mode="drawer" surface={false} title="Filtres des unités" active={activeCount > 0} activeCount={activeCount} reset={reset} searchControl={<form onSubmit={event => { event.preventDefault(); apply(() => {}); }}><Input id="unit-quick-search" aria-label="Rechercher une unité" placeholder="Nom ou référence" disabled={!hydrated} maxLength={160} value={draft.q} onChange={event => setDraft(current => ({ ...current, q: event.target.value }))} /></form>} filters={close => <form aria-label="Filtres des unités" onSubmit={event => { event.preventDefault(); apply(close); }}><fieldset disabled={!hydrated} className="grid gap-5">
      <div className="grid gap-2"><Label htmlFor="unit-category">Type de bien</Label><NativeSelect id="unit-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Tous les biens</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="unit-availability">Disponibilité</Label><NativeSelect id="unit-availability" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="all">Tous les statuts, sans offre inclus</option>{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor="unit-kind">Transaction</Label><NativeSelect id="unit-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Toutes les transactions</option>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <LevelPicker parent={id} kind="blocks" label="Bloc" value={draft.block_id} change={value => setDraft({ ...draft, block_id: value, floor_id: "" })} />
      {draft.block_id ? <LevelPicker key={draft.block_id} parent={draft.block_id} kind="floors" label="Étage" value={draft.floor_id} change={value => setDraft({ ...draft, floor_id: value })} /> : <p className="text-xs text-muted-foreground">Choisissez un bloc pour filtrer par étage.</p>}
      <LevelPicker parent={id} kind="unit-types" label="Type réutilisable" value={draft.unit_type_id} change={value => setDraft({ ...draft, unit_type_id: value })} />
      <InventoryRangeFields prefix="unit" values={draft} change={(key, value) => setDraft(current => ({ ...current, [key]: value }))} error={invalid} />
      <ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} />
      <div className="flex flex-wrap justify-end gap-2"><Button action="reset" type="button" variant="outline" onClick={reset}>Réinitialiser</Button><Button action="filter" type="submit">Appliquer</Button></div>
    </fieldset></form>}>
      {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des unités…</p> : <><p role="status" className="text-sm text-muted-foreground">{result.value.total} unité(s){filters.state === "available" ? " · offres disponibles" : ""}</p><DataTable rows={result.value.items} getRowId={row => row.id} columns={[
        { id: "unit", header: "Unité", cell: ({ row }) => <Link className="inline-flex min-h-control items-center font-medium hover:underline" href={`/projects/properties/${row.original.id}`}>{row.original.reference}</Link> },
        { id: "type", header: "Type", cell: ({ row }) => categoryLabels[row.original.category] },
        { id: "location", header: "Emplacement", cell: ({ row }) => <div className="grid gap-1"><span>{row.original.hierarchy?.block?.code ?? "Rattachement direct"} · {row.original.hierarchy?.floor?.code ?? "Sans étage"}</span><small className="text-xs text-muted-foreground">{row.original.hierarchy?.unit_type?.label ?? "Sans type réutilisable"}</small></div> },
        { id: "area", header: "Surface", cell: ({ row }) => row.original.area_sqm ? `${row.original.area_sqm} m²` : "Non renseignée" },
        { id: "offerings", header: "Offres", cell: ({ row }) => row.original.offerings.length ? <ul className="grid gap-2">{row.original.offerings.map(offer => <li key={offer.id} className="flex flex-wrap items-center gap-3"><span className="text-xs text-muted-foreground">{kindLabels[offer.kind]}</span><Price offering={offer} /><InventoryStatus state={offer.state} /></li>)}</ul> : "Aucune offre" },
      ]} caption="Unités physiques du programme. Offres disponibles à l’ouverture." footerCaption emptyLabel="Aucune unité dans cette sélection. Modifiez les filtres pour élargir les résultats." mobileCard={unit => <article className="grid gap-2"><div className="flex items-center justify-between gap-3"><Link href={`/projects/properties/${unit.id}`} className="inline-flex min-h-control items-center text-sm font-semibold">{unit.reference}</Link><span className="text-xs text-muted-foreground">{unit.area_sqm ? `${unit.area_sqm} m²` : "Surface à renseigner"}</span></div><div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{categoryLabels[unit.category]}</span><span>{unit.hierarchy?.block?.code ?? "Direct"} · {unit.hierarchy?.floor?.code ?? "Sans étage"}</span></div>{unit.hierarchy?.unit_type?.label ? <p className="text-xs text-muted-foreground">{unit.hierarchy.unit_type.label}</p> : null}{unit.offerings.map(offer => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{kindLabels[offer.kind]}</span><Price offering={offer} /><InventoryStatus state={offer.state} /></div>)}</article>} /><NumberedPages compact label="Pages des unités" page={page} total={result.value.total} size={result.value.page_size} change={setPage} /></>}
    </FilterResultsLayout>
  </div>;
}
