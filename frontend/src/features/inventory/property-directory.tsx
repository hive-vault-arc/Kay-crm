"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { DirectoryEmpty } from "@/components/shared/directory-presentation";
import { DashboardIcon, ListIcon } from "@/components/icons";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { useHydrated } from "@/hooks/use-hydrated";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ProjectFilters, ProjectResultsView, type ProjectFilterRail, type ProjectView } from "./project-results-view";

const PropertyCreationWizard = dynamic(() => import("./property-creation-wizard").then(module => module.PropertyCreationWizard), { loading: () => <Skeleton className="h-40" /> });
const DevelopmentCreationWizard = dynamic(() => import("./development-creation-wizard").then(module => module.DevelopmentCreationWizard), { loading: () => <Skeleton className="h-40" /> });

export function PropertyDirectory({ role, actorId, initialKind = "standalone" }: { role: StaffRole; actorId?: string; initialKind?: "standalone" | "developments" }) {
  const tab = initialKind;
  const [view, setView] = useState<ProjectView>("cards");
  const router = useRouter(), phone = usePhoneLayout(), hydrated = useHydrated();
  const [railOpen, setRailOpen] = useState(true);
  const [creating, setCreating] = useState<typeof tab>();
  const createButton = useRef<HTMLAnchorElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  const rail = { hidden: !railOpen, close: () => { setRailOpen(false); filterButton.current?.focus(); } };
  return <div className="projects-page kay-project-directory">
    <Tabs value={tab} onValueChange={value => { const next = value === "developments" ? "developments" : "standalone"; if (next !== tab) router.push(`/projects?kind=${next === "developments" ? "programmes" : "biens"}`, { scroll: false }); }} className="gap-3">
      <PageHeader title="Projets" description="Biens et programmes" route="/projects" navigation={<><TabsList aria-label="Inventaire des projets" className="kay-project-kind-tabs"><TabsTrigger value="standalone">Biens indépendants</TabsTrigger><TabsTrigger value="developments">Programmes immobiliers</TabsTrigger></TabsList>
        {!phone ? <div role="group" aria-label="Présentation des projets" className="kay-project-view-options"><Button type="button" variant={view === "cards" ? "default" : "secondary"} aria-pressed={view === "cards"} onClick={() => setView("cards")}><DashboardIcon aria-hidden="true" size={16} />Cartes</Button><Button type="button" variant={view === "list" ? "default" : "secondary"} aria-pressed={view === "list"} onClick={() => setView("list")}><ListIcon aria-hidden="true" size={16} />Liste</Button></div> : null}
      </>} actions={<>{!phone ? <Button ref={filterButton} action="filter" type="button" variant={railOpen ? "secondary" : "outline"} disabled={!hydrated} aria-controls={tab === "standalone" ? "property-filter-rail" : "development-filter-rail"} aria-expanded={railOpen} onClick={() => setRailOpen(value => !value)}>Filtres</Button> : null}<Button action="create" asChild><Link ref={createButton} prefetch={false} aria-haspopup={actorId ? "dialog" : undefined} href={tab === "developments" ? "/projects/new" : "/projects/properties/new"} onNavigate={event => { if (hydrated && actorId) { event.preventDefault(); setCreating(tab); } }}>{tab === "developments" ? "Créer un programme" : "Créer un bien indépendant"}</Link></Button></>} />
      <TabsContent forceMount hidden={tab !== "developments"} value="developments"><DevelopmentDirectory writable view={view} rail={rail} /></TabsContent>
      <TabsContent forceMount hidden={tab !== "standalone"} value="standalone"><StandaloneDirectory role={role} view={view} rail={rail} /></TabsContent>
    </Tabs>
    {creating ? <RecordDrawer className="kay-project-form-drawer" label={creating === "developments" ? "Créer un programme" : "Créer un bien indépendant"} description={creating === "developments" ? "Identité, localisation et présentation du programme." : "Renseignez le bien et sa première offre."} initialOpen hideTrigger returnFocus={createButton} onClosed={() => setCreating(undefined)}>
      {close => creating === "developments" ? <DevelopmentCreationWizard actorId={actorId} role={role} cancel={close} /> : <PropertyCreationWizard actorId={actorId} role={role} cancel={close} />}
    </RecordDrawer> : null}
  </div>;
}
function StandaloneDirectory({ role, view, rail }: { role: StaffRole; rail: ProjectFilterRail; view: ProjectView }) {
  const { draft, setDraft, filters, page, setPage, apply, reset, activeCount, invalid } = useDirectoryFilters(propertyDefaults, undefined, undefined, inventoryRangeError);
  const query = useQuery(propertyListPath(filters, page), propertiesSchema);
  function change<K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) { setDraft(current => ({ ...current, [key]: value })); }
  const data = query.error ? undefined : query.value;
  return <ProjectFilters id="property-filter-rail" title="Filtres des biens" rail={rail} activeCount={activeCount} reset={reset} filters={close => <PropertyFilterFields filters={draft} change={change} reset={reset} value={query.value} error={invalid} apply={() => apply(close)} />}>
    <ProjectResultsView view={view} loading={!data && !query.error ? "biens" : undefined} status={query.error ? "Biens indisponibles" : data ? `${data.total} bien${data.total > 1 ? "s correspondants" : " correspondant"}` : ""}
      cards={data ? <div className="kay-project-grid"><div className="kay-project-grid-content">{data.items.map(property => <PropertyCard key={property.id} property={property} />)}</div></div> : undefined}
      list={data ? <PropertyList properties={data.items} /> : undefined}
      footer={data && (data.total > 0 || page > 1) ? <NumberedPages compact showPageSize label="Pages des biens" page={page} total={data.total} size={data.page_size} change={setPage} /> : null}>
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> :
        data && !data.items.length ? <DirectoryEmpty title={data.total ? "Aucun bien sur cette page" : activeCount ? "Aucun bien correspondant" : "Aucun bien indépendant"} action={data.total ? <Button action="back" variant="outline" onClick={() => setPage(1)}>Première page</Button> : activeCount ? <Button action="reset" variant="outline" onClick={reset}>Réinitialiser les filtres</Button> : <Button action="create" asChild><Link href="/projects/properties/new">Créer le premier bien</Link></Button>}>{data.total ? "Revenez à la première page pour retrouver les biens." : activeCount ? "Essayez un autre nom, une référence ou un filtre." : "Les biens ajoutés à l’inventaire apparaîtront ici."}</DirectoryEmpty> : null}
    </ProjectResultsView>
    {role === "agent" ? <p className="sr-only">Vous pouvez créer et modifier les fiches. Les offres, disponibilités et archives restent gérées par les responsables.</p> : null}
  </ProjectFilters>;
}
