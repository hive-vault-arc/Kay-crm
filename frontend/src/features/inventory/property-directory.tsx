"use client";
import { PageHeader } from "@/components/shared/page-header";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { ArchiveFilter } from "@/features/discovery/archive-filter";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryCard } from "./inventory-card";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { categoryLabels, kindLabels, propertiesSchema, stateLabels } from "./contracts";
import { DevelopmentDirectory } from "./development-directory";

const defaults = { archive: "active", q: "", category: "", offering_kind: "", state: "", sort: "-updated_at", page_size: 50 };
export function PropertyDirectory({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const [tab, setTab] = useState("standalone");
  const [draft, setDraft] = useState(defaults);
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const { value, error, refresh } = useQuery(queryPath("properties", { ...filters, page, target_level: "standalone" }), propertiesSchema);
  return <div className="grid min-w-0 gap-4"><PageHeader title="Projets" description="Programmes immobiliers, unités et biens indépendants. Les identités privées restent protégées." route="/projects" actions={role !== "agent" ? <Button action="create" asChild><Link href={tab === "developments" ? "/projects/new" : "/projects/properties/new"}>{tab === "developments" ? "Créer un programme immobilier" : "Créer un bien indépendant"}</Link></Button> : undefined} /><Tabs value={tab} onValueChange={setTab} className="gap-0"><TabsList aria-label="Inventaire des projets" className="mb-4 rounded-md border px-3"><TabsTrigger value="standalone">Biens indépendants</TabsTrigger><TabsTrigger value="developments">Programmes immobiliers</TabsTrigger></TabsList>
    <TabsContent value="developments"><DevelopmentDirectory writable={role !== "agent"} /></TabsContent>
    <TabsContent value="standalone" className="grid gap-3">
      <FilterResultsLayout title="Filtres des biens" active={Object.entries(filters).some(([key, value]) => value !== defaults[key as keyof typeof defaults])} filters={close => <form aria-label="Filtres des biens" className="filter-toolbar rounded-t-none" onSubmit={event => { event.preventDefault(); setFilters(draft); setPage(1); close(); }}><fieldset disabled={!hydrated} className="grid min-w-0 items-center gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(7rem,0.65fr))_auto_auto]"><div className="grid gap-2"><Label className="sr-only" htmlFor="inventory-search">Référence, nom ou localisation</Label><Input placeholder="Référence, nom ou localisation" id="inventory-search" maxLength={160} value={draft.q} onChange={event => setDraft({ ...draft, q: event.target.value })} /></div><div className="grid gap-2"><Label className="sr-only" htmlFor="inventory-category">Catégorie</Label><NativeSelect id="inventory-category" value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">Toutes les catégories</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div><div className="grid gap-2"><Label className="sr-only" htmlFor="inventory-kind">Type d’offre</Label><NativeSelect id="inventory-kind" value={draft.offering_kind} onChange={event => setDraft({ ...draft, offering_kind: event.target.value })}><option value="">Vente et location</option>{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div><div className="grid gap-2"><Label className="sr-only" htmlFor="inventory-state">Statut de l’offre</Label><NativeSelect id="inventory-state" value={draft.state} onChange={event => setDraft({ ...draft, state: event.target.value })}><option value="">Tous les statuts actuels</option>{Object.entries(stateLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div><details className="min-w-0 open:col-span-full"><summary className="flex min-h-control cursor-pointer items-center text-sm font-medium text-link">Filtres avancés des biens</summary><div className="grid min-w-0 gap-3 pt-3 sm:grid-cols-3"><ArchiveFilter value={draft.archive} change={value => setDraft({ ...draft, archive: value })} /><div className="grid gap-2"><Label htmlFor="inventory-sort">Trier par</Label><NativeSelect id="inventory-sort" value={draft.sort} onChange={event => setDraft({ ...draft, sort: event.target.value })}><option value="-updated_at">Modification récente</option><option value="reference">Référence</option></NativeSelect></div><div className="grid gap-2"><Label htmlFor="inventory-size">Lignes par page</Label><NativeSelect id="inventory-size" value={draft.page_size} onChange={event => setDraft({ ...draft, page_size: Number(event.target.value) })}>{[10, 25, 50, 100].map(size => <option key={size}>{size}</option>)}</NativeSelect></div></div></details><div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1"><Button action="filter" type="submit" variant="outline">Appliquer les filtres</Button><Button action="reset" type="button" variant="outline" onClick={() => { setDraft(defaults); setFilters(defaults); setPage(1); }}>Réinitialiser</Button></div></fieldset></form>}>
      {role === "agent" ? <p>Inventaire partagé en lecture. Seuls les responsables et administrateurs peuvent le modifier.</p> : null}{error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement des biens…</p> : <><p role="status">{value.total} bien(s) correspondant(s).</p>{!value.items.length ? <p>Aucun bien sur cette page. Modifiez les filtres ou revenez à la première page.</p> : <><div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-3">{value.items.map(item => <InventoryCard key={item.id} reference={item.reference} name={item.marketing_name} category={item.category} location={item.location} href={`/projects/properties/${item.id}`} offerings={item.offerings} />)}</div><p className="text-xs text-muted-foreground">Un bien physique par fiche. Les campagnes retirées restent dans sa fiche.</p></>}<NumberedPages label="Pages des biens" page={page} total={value.total} size={value.page_size} change={setPage} /></>}
    </FilterResultsLayout></TabsContent>
  </Tabs></div>;
}
