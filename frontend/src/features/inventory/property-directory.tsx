"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { Button } from "@/components/ui/button";
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
import { useDirectoryFilters } from "@/features/contacts/use-directory-filters";
import { inventoryRangeError } from "./inventory-range";
import { ProjectResultsView, type ProjectView, type ProjectViewState } from "./project-results-view";

export function PropertyDirectory({ role, initialKind = "standalone" }: { role: StaffRole; initialKind?: "standalone" | "developments" }) {
  const tab = initialKind;
  const [view, setView] = useState<ProjectView>("cards");
  const router = useRouter();
  return <div className="projects-page grid min-w-0 gap-4">
    <Tabs value={tab} onValueChange={value => { const next = value === "developments" ? "developments" : "standalone"; if (next !== tab) router.push(`/projects?kind=${next === "developments" ? "programmes" : "biens"}`, { scroll: false }); }} className="gap-3">
      <PageHeader title="Projets" description="Biens indépendants et programmes immobiliers." route="/projects" navigation={<TabsList aria-label="Inventaire des projets" className="kay-project-kind-tabs"><TabsTrigger value="standalone">Biens indépendants</TabsTrigger><TabsTrigger value="developments">Programmes immobiliers</TabsTrigger></TabsList>} actions={<Button action="create" asChild><Link href={tab === "developments" ? "/projects/new" : "/projects/properties/new"}>{tab === "developments" ? "Nouveau programme" : "Nouveau bien"}</Link></Button>} />
      <TabsContent forceMount hidden={tab !== "developments"} value="developments"><DevelopmentDirectory writable view={view} changeView={setView} /></TabsContent>
      <TabsContent forceMount hidden={tab !== "standalone"} value="standalone"><StandaloneDirectory role={role} view={view} changeView={setView} /></TabsContent>
    </Tabs>
  </div>;
}
function StandaloneDirectory({ role, view, changeView }: { role: StaffRole } & ProjectViewState) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount, invalid } = useDirectoryFilters(propertyDefaults, undefined, undefined, inventoryRangeError);
  const query = useQuery(propertyListPath(filters, page), propertiesSchema);
  function change<K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) { setDraft(current => ({ ...current, [key]: value })); }
  return <FilterResultsLayout reference title="Filtres des biens" active={activeCount > 0} activeCount={activeCount} reset={reset} filters={close => <PropertyFilterFields filters={draft} change={change} reset={reset} value={query.value} error={invalid} apply={() => apply(close)} />}>
    <ProjectResultsView view={view} changeView={changeView} entity="biens" status={query.error ? "Biens indisponibles" : query.value ? `${query.value.total} bien${query.value.total > 1 ? "s" : ""} correspondant${query.value.total > 1 ? "s" : ""}` : "Chargement des biens…"} sort={draft.sort} changeSort={value => change("sort", value)}>
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div role="status" className="kay-project-grid" aria-label="Chargement des cartes de biens">{Array.from({ length: 4 }, (_, index) => <div key={index} className="project-card-skeleton rounded-md border bg-card" aria-hidden="true" />)}</div> : <>
        {!query.value.items.length ? <div role="status" className="surface grid gap-3"><h2 className="text-section">Aucun bien correspondant</h2><p>Modifiez les filtres ou revenez à la première page.</p><Button action="reset" variant="outline" onClick={reset} className="justify-self-start">Réinitialiser les filtres</Button></div> : <><TabsContent value="cards"><div className="kay-project-grid">{query.value.items.map(property => <PropertyCard key={property.id} property={property} />)}</div></TabsContent><TabsContent value="list"><PropertyList properties={query.value.items} /></TabsContent></>}
        {query.value.total > filters.page_size || page > 1 ? <NumberedPages label="Pages des biens" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}
      </>}
      {role === "agent" ? <p className="text-xs text-muted-foreground">Vous pouvez créer et modifier les fiches. Les offres, disponibilités et archives restent gérées par les responsables.</p> : null}
    </ProjectResultsView>
  </FilterResultsLayout>;
}
