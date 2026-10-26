"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordHeader } from "@/components/shared/record-header";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import { FilePanel } from "@/features/files/file-panel";
import { developmentSchema } from "./development-contracts";
import { DevelopmentEditor } from "./development-editor";
import { HierarchyPanel } from "./hierarchy-panel";
import { UnitDirectory } from "./unit-directory";
import { OwnerEditor } from "./owner-editor";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { categoryLabels } from "./contracts";
import { InventoryPhotoRail, InventoryParty } from "./inventory-support";
import { InventoryOfferSection } from "./inventory-offer-section";

export function DevelopmentRecord({ id, edit = false, role, initialTab = "facts", blockId, floorId, unitTypeId }: { id: string; edit?: boolean; role: StaffRole; initialTab?: string; blockId?: string; floorId?: string; unitTypeId?: string }) {
  const result = useQuery(`/api/v1/developments/${id}`, developmentSchema);
  const [tab, setTab] = useState(["units", "hierarchy", "types"].includes(initialTab) ? "units" : "overview");
  const [structureTab, setStructureTab] = useState(initialTab === "types" ? "types" : "structure");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [photoRevision, setPhotoRevision] = useState(0);
  const photoChanged = useCallback(() => setPhotoRevision(value => value + 1), []);
  const heading = <PageHeader title="Programme immobilier" description="Programme, offres et unités physiques." route={`/projects/${id}`} />;
  if (result.error) return <>{heading}<RecordError error={result.error} retry={result.refresh} /></>;
  if (!result.value) return <>{heading}<p role="status">Chargement du programme…</p></>;
  const development = result.value, archived = Boolean(development.archived_at), writable = !archived, managedWritable = role !== "agent" && !archived;
  const target = { ...development, inventoryLevel: "development" as const };
  if (edit) return writable ? <DevelopmentEditor development={development} /> : <>{heading}<p role="alert">{archived ? "Restaurez ce dossier pour le modifier." : "Ce dossier est en lecture seule."}</p></>;
  function saved() { setNotice("Inventaire enregistré."); result.refreshQuietly(); }
  const structure = <RecordDrawer label="Structure du programme" action="inventory" busy={busy} initialOpen={["hierarchy", "types"].includes(initialTab)} description="Blocs, étages et types réutilisables du programme."><Tabs value={structureTab} onValueChange={setStructureTab}><TabsList aria-label="Structure du programme"><TabsTrigger value="structure">Blocs et étages</TabsTrigger><TabsTrigger value="types">Types</TabsTrigger></TabsList><TabsContent forceMount value="structure" hidden={structureTab !== "structure"}><HierarchyPanel development={development} writable={writable} saved={saved} /></TabsContent><TabsContent forceMount value="types" hidden={structureTab !== "types"}><HierarchyPanel development={development} writable={writable} saved={saved} types /></TabsContent></Tabs></RecordDrawer>;
  return <InventoryBusyContext.Provider value={pending => { setBusy(pending); if (pending) setNotice(""); }}><fieldset disabled={busy} aria-busy={busy} className="kay-record-page"><legend className="sr-only">Programme et commandes d’inventaire</legend>
    <RecordHeader title={development.name} route={`/projects/${id}`} kind="inventory" backHref="/projects?kind=programmes" reference={`${development.reference} · Programme immobilier`} badges={archived ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : undefined} actions={<><RecordDrawer label="Documents" action="file" busy={busy} description="Pièces jointes partagées du programme.">{!archived ? <FilePanel parentKind="development" parentId={id} writable={managedWritable} /> : <p className="text-sm text-muted-foreground">Restaurez le dossier pour accéder aux documents.</p>}</RecordDrawer>{writable ? <Button action="edit" asChild variant="outline"><Link href={`/projects/${id}/edit`}>Modifier</Link></Button> : null}<RecordActions initialOpen={initialTab === "history"}><RecordDrawer label="Historique" action="read" busy={busy} initialOpen={initialTab === "history"} description="Modifications du programme et auteurs conservés."><InventoryHistory id={id} level="development" /></RecordDrawer>{role !== "agent" ? <RecordDrawer label="Gérer le dossier" action="settings" busy={busy} description="Archivage et restauration du programme."><LifecyclePanel kind="developments" id={id} version={development.version} reference={development.reference} archived={archived} saved={result.refreshQuietly} /></RecordDrawer> : null}</RecordActions></>} />
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}{archived ? <p role="status" className="mb-3 text-sm text-muted-foreground">Programme archivé : les informations restent consultables.</p> : null}
    <RecordWorkspace activeTab={tab} onTabChange={setTab} initialTab={tab} label="Rubriques du programme" tabs={[
      { id: "overview", label: "Aperçu", content: <>
        <RecordSection title="Informations du programme"><RecordFacts>
          <RecordFact icon={DevelopmentIcon} label="Référence">{development.reference}</RecordFact>
          <RecordFact icon={LocationIcon} label="Localisation">{development.location ?? "Non renseignée"}</RecordFact>
          <RecordFact icon={PropertyIcon} label="Catégorie">{development.category === "mixed" ? "Mixte" : categoryLabels[development.category]}</RecordFact>
          <RecordFact icon={PropertyIcon} label="Unités physiques"><Button action="forward" variant="quiet" onClick={() => setTab("units")}>{development.unit_count} unités · {development.available_unit_count} disponibles</Button></RecordFact>
        </RecordFacts></RecordSection>
        <InventoryOfferSection target={target} kinds={["sale", "rental"]} writable={managedWritable} busy={busy} saved={saved} programme />
        <RecordSection title="Présentation" action={writable ? <Button action="edit" variant="outline" asChild><Link href={`/projects/${id}/edit`}>Modifier la présentation</Link></Button> : undefined}><p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed">{development.briefing_text ?? "Aucune présentation renseignée."}</p><div className="grid gap-2"><h3 className="text-xs text-muted-foreground">Promoteur</h3><InventoryParty link={development.developer} /></div></RecordSection>
      </> },
      { id: "units", label: "Unités", count: development.unit_count, content: <UnitDirectory id={id} writable={writable} blockId={blockId} floorId={floorId} unitTypeId={unitTypeId} structureAction={structure} /> },
    ]} aside={<>
      <InventoryPhotoRail id={id} kind="development" writable={managedWritable} archived={archived} revision={photoRevision} changed={photoChanged} />
      <RecordSection title="Propriétaires" action={managedWritable ? <RecordDrawer label="Modifier" action="edit" busy={busy} initialOpen={initialTab === "owners"} description="Propriétaires légaux du programme entier.">{(close, done) => <OwnerEditor property={target} saved={() => { saved(); done(); }} cancel={close} />}</RecordDrawer> : undefined}>{development.owners.length ? development.owners.map((link, index) => <InventoryParty key={index} link={link} />) : <p className="text-sm text-muted-foreground">Aucun propriétaire renseigné. Le promoteur ne constitue pas une preuve de propriété.</p>}</RecordSection>
    </>} />
  </fieldset></InventoryBusyContext.Provider>;
}
