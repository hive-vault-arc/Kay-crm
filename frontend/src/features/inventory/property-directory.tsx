"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { DashboardIcon, TaskIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { propertiesSchema } from "./contracts";
import { DevelopmentDirectory } from "./development-directory";
import { PropertyCard, PropertyList } from "./property-card";
import { PropertyFilterFields } from "./property-filters";
import { propertyDefaults, propertyListPath, type PropertyFilters } from "./property-directory-model";

export function PropertyDirectory({ role }: { role: StaffRole }) {
  const [tab, setTab] = useState("standalone");
  return <div className="projects-page grid min-w-0 gap-4">
    <PageHeader title="Projets" description="Biens indépendants et programmes immobiliers." route="/projects" actions={<Button action="create" asChild><Link href={tab === "developments" ? "/projects/new" : "/projects/properties/new"}>{tab === "developments" ? "Créer un programme immobilier" : "Créer un bien indépendant"}</Link></Button>} />
    <Tabs value={tab} onValueChange={setTab} className="gap-4"><TabsList aria-label="Inventaire des projets" className="projects-directory-tabs rounded-md border px-3"><TabsTrigger value="standalone">Biens indépendants</TabsTrigger><TabsTrigger value="developments">Programmes immobiliers</TabsTrigger></TabsList>
      <TabsContent value="developments"><DevelopmentDirectory writable /></TabsContent>
      <TabsContent value="standalone"><StandaloneDirectory role={role} /></TabsContent>
    </Tabs>
  </div>;
}
function StandaloneDirectory({ role }: { role: StaffRole }) {
  const [filters, setFilters] = useState(propertyDefaults), [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [view, setView] = useState("cards");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const query = useQuery(propertyListPath(filters, page), propertiesSchema);
  function change<K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) { setFilters(current => ({ ...current, [key]: value })); setPage(1); }
  function searchChange(value: string) { setSearch(value); clearTimeout(timer.current); timer.current = setTimeout(() => change("q", value), 250); }
  function reset() { clearTimeout(timer.current); setSearch(""); setFilters(propertyDefaults); setPage(1); }
  const active = Object.entries(filters).some(([key, value]) => value !== propertyDefaults[key as keyof PropertyFilters]);
  return <FilterResultsLayout className="projects-workbench" title="Affiner les biens" active={active} panelHeading={<div className="project-filter-heading flex items-center justify-between gap-2"><h2 className="text-section">Affiner les biens</h2><Button action="reset" variant="quiet" size="compact" onClick={reset}>Réinitialiser</Button></div>} filters={() => <PropertyFilterFields filters={filters} search={search} searchChange={searchChange} change={change} reset={reset} value={query.value} />}>
    <Tabs value={view} onValueChange={setView} className="gap-3">
      <div className="projects-results-toolbar flex min-w-0 flex-wrap items-center justify-between gap-3"><p role="status" className="text-base">{query.value ? `${query.value.total} bien${query.value.total > 1 ? "s" : ""} correspondant${query.value.total > 1 ? "s" : ""}` : "Chargement des biens…"}</p><div className="flex min-w-0 flex-wrap items-center gap-4"><TabsList aria-label="Présentation des biens" className="projects-view-tabs rounded-md border"><TabsTrigger value="cards"><DashboardIcon aria-hidden="true" className="mr-2 size-5" />Cartes</TabsTrigger><TabsTrigger value="list"><TaskIcon aria-hidden="true" className="mr-2 size-5" />Liste</TabsTrigger></TabsList><div className="project-sort"><NativeSelect aria-label="Trier par" value={filters.sort} onChange={event => change("sort", event.target.value)}><option value="-updated_at">Plus récents</option><option value="reference">Référence</option></NativeSelect></div></div></div>
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div role="status" className="projects-card-grid" aria-label="Chargement des cartes de biens">{Array.from({ length: 4 }, (_, index) => <div key={index} className="project-card-skeleton rounded-md border bg-card" aria-hidden="true" />)}</div> : <>
        {!query.value.items.length ? <div role="status" className="surface grid gap-3"><h2 className="text-section">Aucun bien correspondant</h2><p>Modifiez les filtres ou revenez à la première page.</p><Button action="reset" variant="outline" onClick={reset} className="justify-self-start">Réinitialiser les filtres</Button></div> : <><TabsContent value="cards"><div className="projects-card-grid">{query.value.items.map(property => <PropertyCard key={property.id} property={property} />)}</div></TabsContent><TabsContent value="list"><PropertyList properties={query.value.items} /></TabsContent></>}
        {query.value.total > filters.page_size || page > 1 ? <NumberedPages label="Pages des biens" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}
      </>}
      {role === "agent" ? <p className="text-xs text-muted-foreground">Vous pouvez créer et modifier les fiches. Les offres, disponibilités et archives restent gérées par les responsables.</p> : null}
    </Tabs>
  </FilterResultsLayout>;
}
