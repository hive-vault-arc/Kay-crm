"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordHeader } from "@/components/shared/record-header";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import { FilePanel } from "@/features/files/file-panel";
import { developmentSchema } from "./development-contracts";
import { DevelopmentPhaseBadge } from "./development-phase";
import { ProjectEditLink } from "./project-edit-link";
import { DevelopmentEditor } from "./development-editor";
import { HierarchyPanel } from "./hierarchy-panel";
import { UnitDirectory } from "./unit-directory";
import { OwnerEditor } from "./owner-editor";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { InventoryRecordContext, type InventoryRecord, type InventoryRecordScope } from "./record-scope";
import type { Development } from "./development-contracts";
import type { ApiError } from "@/lib/api/client";
import { categoryLabels } from "./contracts";
import { InventoryPhotoRail, InventoryParty } from "./inventory-support";
import { InventoryOfferSection } from "./inventory-offer-section";

export function DevelopmentRecord({ id, edit = false, role, actorId, initialTab = "facts", blockId, floorId, unitTypeId }: { id: string; edit?: boolean; role: StaffRole; actorId?: string; initialTab?: string; blockId?: string; floorId?: string; unitTypeId?: string }) {
  const result = useQuery(`/api/v1/developments/${id}`, developmentSchema);
  const [tab, setTab] = useState(["units", "hierarchy", "types"].includes(initialTab) ? "units" : "overview");
  const [structureTab, setStructureTab] = useState(initialTab === "types" ? "types" : "structure");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [photoRevision, setPhotoRevision] = useState(0);
  const [cached, setCached] = useState<Development>(), [accessError, setAccessError] = useState<ApiError>();
  const remote = result.value?.id === id ? result.value : undefined, available = Boolean(remote && !result.error);
  const deniedRead = result.error && [401, 403, 404].includes(result.error.status) ? result.error : undefined;
  const retained = busy && cached ? cached : remote && (!cached || remote.version >= cached.version) ? remote : cached;
  if (deniedRead || accessError) { if (cached) setCached(undefined); } else if (retained && retained !== cached) setCached(retained);
  const photoChanged = useCallback(() => setPhotoRevision(value => value + 1), []);
  const heading = <PageHeader title="Programme immobilier" description="Programme, offres et unités physiques." route={`/projects/${id}`} />;
  if (accessError) return <>{heading}{notice ? <p role="status">{notice}</p> : null}<RecordError error={accessError} /></>;
  if (result.error && (deniedRead || !retained)) return <>{heading}<RecordError error={result.error} retry={result.refresh} /></>;
  if (!retained) return <>{heading}<div className="kay-sales-loading-record" role="status"><span className="sr-only">Chargement du programme…</span><Skeleton aria-hidden="true" /><Skeleton aria-hidden="true" /></div></>;
  const development = retained, archived = Boolean(development.archived_at), writable = !archived, managedWritable = role !== "agent" && !archived;
  const target = { ...development, inventoryLevel: "development" as const };
  const recordScope: InventoryRecordScope = { root: "developments", id, actorId, role, available, accept: value => { const parsed = developmentSchema.safeParse(value); if (parsed.success && parsed.data.id === id) setCached(previous => !previous || parsed.data.version >= previous.version ? parsed.data : previous); }, denied: (failure, acknowledged) => { setNotice(acknowledged ? "La modification est enregistrée. Les droits d’accès ont changé." : ""); setAccessError(failure); setBusy(false); } };
  const publishBusy = (pending: boolean) => { setBusy(pending); if (pending) setNotice(""); };
  if (edit) return writable ? <InventoryRecordContext.Provider value={recordScope}><InventoryBusyContext.Provider value={publishBusy}>{result.error ? <RecordError error={result.error} retry={result.refresh} /> : null}<DevelopmentEditor development={development} /></InventoryBusyContext.Provider></InventoryRecordContext.Provider> : <>{heading}<p role="alert">{archived ? "Restaurez ce dossier pour le modifier." : "Ce dossier est en lecture seule."}</p></>;
  function saved(record?: InventoryRecord) { if (record) { const parsed = developmentSchema.safeParse(record); if (parsed.success && parsed.data.id === id) setCached(previous => !previous || parsed.data.version >= previous.version ? parsed.data : previous); } setNotice("Inventaire enregistré."); result.refreshQuietly(); }
  const structure = <RecordDrawer label="Structure du programme" action="inventory" busy={busy} initialOpen={["hierarchy", "types"].includes(initialTab)} description="Blocs, étages et types réutilisables du programme."><Tabs value={structureTab} onValueChange={setStructureTab}><TabsList aria-label="Structure du programme"><TabsTrigger value="structure">Blocs et étages</TabsTrigger><TabsTrigger value="types">Types</TabsTrigger></TabsList><TabsContent forceMount value="structure" hidden={structureTab !== "structure"}><HierarchyPanel development={development} writable={writable} saved={saved} /></TabsContent><TabsContent forceMount value="types" hidden={structureTab !== "types"}><HierarchyPanel development={development} writable={writable} saved={saved} types /></TabsContent></Tabs></RecordDrawer>;
  const editAction = (label: string) => <ProjectEditLink href={`/projects/${id}/edit`} label={label} title="Modifier le programme" busy={busy} description="Identité et présentation du programme.">{(close, done) => <DevelopmentEditor development={development} cancel={close} onSaved={record => { saved(record); done(); }} />}</ProjectEditLink>;
  return <InventoryRecordContext.Provider value={recordScope}><InventoryBusyContext.Provider value={publishBusy}>{result.error ? <RecordError error={result.error} retry={result.refresh} /> : !available ? <p role="status">Actualisation du programme…</p> : null}<fieldset disabled={busy || !available} aria-busy={busy} className="kay-record-page kay-project-record"><legend className="sr-only">Programme et commandes d’inventaire</legend>
    <RecordHeader title={development.name} route={`/projects/${id}`} kind="inventory" backHref="/projects?kind=programmes" reference={`${development.reference} · Programme immobilier${development.phase_supported ? ` · ${development.category === "mixed" ? "Mixte" : categoryLabels[development.category]}` : ""}`} badges={archived ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : undefined} actions={<><RecordDrawer label="Documents" action="file" busy={busy} description="Pièces jointes partagées du programme.">{!archived ? <FilePanel actorId={actorId} role={role} parentKind="development" parentId={id} writable={managedWritable} /> : <p className="text-sm text-muted-foreground">Restaurez le dossier pour accéder aux documents.</p>}</RecordDrawer>{writable ? editAction("Modifier") : null}<RecordActions initialOpen={initialTab === "history"}><RecordDrawer label="Historique" action="read" busy={busy} initialOpen={initialTab === "history"} description="Modifications du programme et auteurs conservés."><InventoryHistory id={id} level="development" /></RecordDrawer>{role !== "agent" ? <RecordDrawer label="Gérer le dossier" action="settings" busy={busy} description="Archivage et restauration du programme."><LifecyclePanel kind="developments" id={id} version={development.version} reference={development.reference} archived={archived} saved={saved} refresh={result.refreshQuietly} /></RecordDrawer> : null}</RecordActions></>} />
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}{archived ? <p role="status" className="mb-3 text-sm text-muted-foreground">Programme archivé : les informations restent consultables.</p> : null}
    <RecordWorkspace activeTab={tab} onTabChange={setTab} initialTab={tab} label="Rubriques du programme" tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <RecordSection title="Informations du programme"><RecordFacts columns={1}>
          <RecordFact icon={DevelopmentIcon} label="Référence">{development.reference}</RecordFact>
          <RecordFact icon={LocationIcon} label="Localisation">{development.location ?? "Non renseignée"}</RecordFact>
          {development.phase_supported ? <RecordFact icon={DevelopmentIcon} label="État du programme"><DevelopmentPhaseBadge phase={development.phase} /></RecordFact> : <RecordFact icon={PropertyIcon} label="Catégorie">{development.category === "mixed" ? "Mixte" : categoryLabels[development.category]}</RecordFact>}
          <RecordFact icon={PropertyIcon} label="Unités physiques"><Button action="forward" variant="quiet" onClick={() => setTab("units")}>{development.unit_count} unités · {development.available_unit_count} disponibles</Button></RecordFact>
        </RecordFacts></RecordSection>
        <InventoryOfferSection target={target} kinds={["sale", "rental"]} writable={managedWritable} busy={busy} saved={saved} programme />
        <RecordSection title="Présentation" action={writable ? editAction("Modifier la présentation") : undefined}><p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">{development.briefing_text ?? "Aucune présentation renseignée."}</p><div className="grid gap-2"><h3 className="text-xs text-muted-foreground">Promoteur</h3><InventoryParty link={development.developer} /></div></RecordSection>
      </> },
      { id: "units", label: "Unités", count: development.unit_count, content: <UnitDirectory id={id} developmentLabel={development.name} writable={writable} blockId={blockId} floorId={floorId} unitTypeId={unitTypeId} structureAction={structure} /> },
    ]} aside={<>
      <InventoryPhotoRail id={id} kind="development" writable={managedWritable} archived={archived} revision={photoRevision} changed={photoChanged} />
      <RecordSection title="Propriétaires" action={managedWritable ? <RecordDrawer label="Modifier" title="Propriétaires légaux" action="edit" busy={busy} initialOpen={initialTab === "owners"} description="Propriétaires légaux du programme entier.">{(close, done) => <OwnerEditor property={target} saved={record => { saved(record); done(); }} cancel={close} />}</RecordDrawer> : undefined}>{development.owners.length ? development.owners.map((link, index) => <InventoryParty key={index} link={link} />) : <p className="text-sm text-muted-foreground">Aucun propriétaire renseigné. Le promoteur ne constitue pas une preuve de propriété.</p>}</RecordSection>
    </>} />
  </fieldset></InventoryBusyContext.Provider></InventoryRecordContext.Provider>;
}
