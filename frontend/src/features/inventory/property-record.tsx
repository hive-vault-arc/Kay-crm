"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordHeader } from "@/components/shared/record-header";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { PageHeader } from "@/components/shared/page-header";
import { ColumnsIcon, DevelopmentIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import { FilePanel } from "@/features/files/file-panel";
import { categoryLabels, propertySchema } from "./contracts";
import { PropertyEditor } from "./property-editor";
import { OwnerEditor } from "./owner-editor";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { InventoryPhotoRail, InventoryParty } from "./inventory-support";
import { InventoryOfferSection } from "./inventory-offer-section";
import { PropertyListingDetails } from "./property-listing-details";

export function PropertyRecord({ id, role, edit = false, initialTab }: { id: string; role: StaffRole; edit?: boolean; initialTab?: string }) {
  const query = useQuery(`/api/v1/properties/${id}`, propertySchema);
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [photoRevision, setPhotoRevision] = useState(0);
  const photoChanged = useCallback(() => setPhotoRevision(value => value + 1), []);
  const heading = <PageHeader title="Fiche du bien" description="Informations, offres et propriétaires accessibles." route={`/projects/properties/${id}`} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (!query.value) return <>{heading}<p role="status">Chargement du bien…</p></>;
  const property = query.value, archived = Boolean(property.archived_at), managedWritable = role !== "agent" && !archived;
  if (edit) return !archived ? <PropertyEditor property={property} /> : <>{heading}<p role="alert">Restaurez ce dossier avant de le modifier.</p></>;
  function saved() { setNotice("Inventaire enregistré."); query.refreshQuietly(); }
  const kinds = property.development_id || !["apartment", "house", "villa", "riad", "room"].includes(property.category) ? (["sale", "rental"] as const) : property.category === "room" ? (["rental", "holiday"] as const) : (["sale", "rental", "holiday"] as const);
  const back = property.development_id ? `/projects/${property.development_id}?tab=units` : "/projects?kind=biens";
  return <InventoryBusyContext.Provider value={pending => { setBusy(pending); if (pending) setNotice(""); }}><fieldset disabled={busy} aria-busy={busy} className="kay-record-page"><legend className="sr-only">Bien et commandes d’inventaire</legend>
    <RecordHeader title={property.marketing_name || property.reference} route={`/projects/properties/${id}`} kind="inventory" backHref={back} reference={`${property.reference} · ${property.development_id ? "Unité physique" : "Bien indépendant"}`} badges={archived ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : undefined} actions={<><RecordDrawer label="Documents" action="file" busy={busy} description="Pièces jointes partagées de ce bien.">{!archived ? <FilePanel parentKind="property" parentId={id} writable={managedWritable} /> : <p className="text-sm text-muted-foreground">Restaurez le dossier pour accéder aux documents.</p>}</RecordDrawer>{!archived ? <Button action="edit" variant="outline" asChild><Link href={`/projects/properties/${id}/edit`}>Modifier</Link></Button> : null}<RecordActions initialOpen={initialTab === "history"}><RecordDrawer label="Historique" action="read" busy={busy} initialOpen={initialTab === "history"} description="Historique des faits, offres et états de ce bien."><InventoryHistory id={id} /></RecordDrawer>{role !== "agent" ? <RecordDrawer label="Gérer le dossier" action="settings" busy={busy} description="Archivage et restauration du bien."><LifecyclePanel kind="properties" id={id} version={property.version} reference={property.reference} archived={archived} saved={query.refreshQuietly} /></RecordDrawer> : null}</RecordActions></>} />
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}{archived ? <p role="status" className="mb-3 text-sm text-muted-foreground">Bien archivé : les informations restent consultables.</p> : null}
    <RecordWorkspace hideSingleTab label="Informations du bien" tabs={[{ id: "overview", label: "Aperçu", content: <>
      <RecordSection title="Informations du bien"><RecordFacts>
        <RecordFact icon={PropertyIcon} label="Référence">{property.reference}</RecordFact>
        <RecordFact icon={LocationIcon} label="Localisation">{property.location || property.listing_details.city || "Non renseignée"}</RecordFact>
        <RecordFact icon={PropertyIcon} label="Type de bien">{categoryLabels[property.category]}</RecordFact>
        <RecordFact icon={ColumnsIcon} label="Surface">{property.area_sqm ? `${property.area_sqm.replace(".", ",")} m²` : "Non renseignée"}</RecordFact>
        {!["land", "farm", "commercial", "office", "room"].includes(property.category) ? <RecordFact icon={PropertyIcon} label="Pièces">{property.rooms ?? "Non renseigné"}</RecordFact> : null}
      </RecordFacts></RecordSection>
      <InventoryOfferSection target={property} kinds={[...kinds]} writable={managedWritable} busy={busy} saved={saved} />
      <PropertyListingDetails property={property} />
      {property.hierarchy ? <RecordSection title="Rattachement au programme"><RecordFacts>
        <RecordFact icon={DevelopmentIcon} label="Programme"><Link className="inline-flex min-h-control items-center hover:underline" href={`/projects/${property.hierarchy.development.id}`}>{property.hierarchy.development.name} · {property.hierarchy.development.reference}</Link></RecordFact>
        <RecordFact icon={PropertyIcon} label="Bloc">{property.hierarchy.block ? <Link className="inline-flex min-h-control items-center hover:underline" href={`/projects/${property.hierarchy.development.id}?tab=units&block_id=${property.hierarchy.block.id}`}>{property.hierarchy.block.code} · {property.hierarchy.block.label}</Link> : "Rattachement direct"}</RecordFact>
        <RecordFact icon={PropertyIcon} label="Étage">{property.hierarchy.floor?.label ?? "Sans étage"}</RecordFact>
        <RecordFact icon={ColumnsIcon} label="Type réutilisable">{property.hierarchy.unit_type?.label ?? "Sans type"}</RecordFact>
      </RecordFacts></RecordSection> : null}
    </> }]} aside={<>
      <InventoryPhotoRail id={id} kind="property" writable={managedWritable} archived={archived} revision={photoRevision} changed={photoChanged} />
      <RecordSection title="Propriétaires" action={managedWritable ? <RecordDrawer label="Modifier" title="Propriétaires légaux" action="edit" busy={busy} initialOpen={initialTab === "owners"} description="Propriétaires légaux de ce bien.">{(close, done) => <OwnerEditor property={property} saved={() => { saved(); done(); }} cancel={close} />}</RecordDrawer> : undefined}>{property.owners.length ? property.owners.map((owner, index) => <InventoryParty key={index} link={owner} />) : <p className="text-sm text-muted-foreground">Aucun propriétaire renseigné. Les offres ne peuvent pas devenir disponibles.</p>}</RecordSection>
    </>} />
  </fieldset></InventoryBusyContext.Provider>;
}
