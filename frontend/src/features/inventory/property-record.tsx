"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ImportantRemarks } from "@/components/shared/important-remarks";
import { RecordHeader } from "@/components/shared/record-header";
import { ListingShareDrawer } from "@/features/shares/share-drawer";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordActions } from "@/components/shared/record-actions";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarIcon, ColumnsIcon, DevelopmentIcon, FinanceIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import { FilePanel } from "@/features/files/file-panel";
import { formatBusinessDate, formatMAD } from "@/lib/format";
import { categoryLabels, propertyCostLabels, propertySchema, receivedDateLabel, type Property } from "./contracts";
import { ProjectEditLink } from "./project-edit-link";
import { PropertyEditor } from "./property-editor";
import { OwnerEditor } from "./owner-editor";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { InventoryRecordContext, type InventoryRecord, type InventoryRecordScope } from "./record-scope";
import type { ApiError } from "@/lib/api/client";
import { InventoryPhotoRail, InventoryParty } from "./inventory-support";
import { InventoryOfferSection } from "./inventory-offer-section";
import { PropertyCalendar } from "./property-calendar";
import { PropertyListingDetails } from "./property-listing-details";

export function PropertyRecord({ id, role, actorId, edit = false, initialTab }: { id: string; role: StaffRole; actorId?: string; edit?: boolean; initialTab?: string }) {
  const query = useQuery(`/api/v1/properties/${id}`, propertySchema);
  const [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [photoRevision, setPhotoRevision] = useState(0);
  const [cached, setCached] = useState<Property>(), [accessError, setAccessError] = useState<ApiError>();
  const remote = query.value?.id === id ? query.value : undefined, available = Boolean(remote && !query.error);
  const deniedRead = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  const retained = busy && cached ? cached : remote && (!cached || remote.version >= cached.version) ? remote : cached;
  if (deniedRead || accessError) { if (cached) setCached(undefined); } else if (retained && retained !== cached) setCached(retained);
  const photoChanged = useCallback(() => setPhotoRevision(value => value + 1), []);
  const heading = <PageHeader title="Fiche du bien" description="Informations, offres et propriétaires accessibles." route={`/projects/properties/${id}`} />;
  if (accessError) return <>{heading}{notice ? <p role="status">{notice}</p> : null}<RecordError error={accessError} /></>;
  if (query.error && (deniedRead || !retained)) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (!retained) return <>{heading}<div className="kay-sales-loading-record" role="status"><span className="sr-only">Chargement du bien…</span><Skeleton aria-hidden="true" /><Skeleton aria-hidden="true" /></div></>;
  const property = retained, archived = Boolean(property.archived_at), managedWritable = role !== "agent" && !archived;
  const recordScope: InventoryRecordScope = { root: "properties", id, actorId, role, available, accept: value => { const parsed = propertySchema.safeParse(value); if (parsed.success && parsed.data.id === id) setCached(previous => !previous || parsed.data.version >= previous.version ? parsed.data : previous); }, denied: (failure, acknowledged) => { setNotice(acknowledged ? "La modification est enregistrée. Les droits d’accès ont changé." : ""); setAccessError(failure); setBusy(false); } };
  const publishBusy = (pending: boolean) => { setBusy(pending); if (pending) setNotice(""); };
  if (edit) return !archived ? <InventoryRecordContext.Provider value={recordScope}><InventoryBusyContext.Provider value={publishBusy}>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<PropertyEditor property={property} /></InventoryBusyContext.Provider></InventoryRecordContext.Provider> : <>{heading}<p role="alert">Restaurez ce dossier avant de le modifier.</p></>;
  function saved(record?: InventoryRecord) { if (record) { const parsed = propertySchema.safeParse(record); if (parsed.success && parsed.data.id === id) setCached(previous => !previous || parsed.data.version >= previous.version ? parsed.data : previous); } setNotice("Inventaire enregistré."); query.refreshQuietly(); }
  const kinds = property.development_id || !["apartment", "house", "villa", "riad", "room"].includes(property.category) ? (["sale", "rental"] as const) : property.category === "room" ? (["rental", "holiday"] as const) : (["sale", "rental", "holiday"] as const);
  const back = property.development_id ? `/projects/${property.development_id}?tab=units` : "/projects?kind=biens";
  return <InventoryRecordContext.Provider value={recordScope}><InventoryBusyContext.Provider value={publishBusy}>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !available ? <p role="status">Actualisation du bien…</p> : null}<fieldset disabled={busy || !available} aria-busy={busy} className="kay-record-page kay-project-record"><legend className="sr-only">Bien et commandes d’inventaire</legend>
    <RecordHeader title={property.marketing_name || property.reference} route={`/projects/properties/${id}`} kind="inventory" backHref={back} reference={`${property.reference} · ${property.development_id ? "Unité physique" : "Bien indépendant"}`} badges={archived ? <CrmStatusBadge state="archived">Archivé</CrmStatusBadge> : undefined} actions={<>{!archived && <ListingShareDrawer id={id} kind="property" offerings={property.offerings} busy={busy} />}<RecordDrawer label="Documents" action="file" busy={busy} description="Pièces jointes partagées de ce bien.">{!archived ? <FilePanel actorId={actorId} role={role} parentKind="property" parentId={id} writable={managedWritable} /> : <p className="text-sm text-muted-foreground">Restaurez le dossier pour accéder aux documents.</p>}</RecordDrawer>{!archived ? <ProjectEditLink href={`/projects/properties/${id}/edit`} label="Modifier" title={property.development_id ? "Modifier l’unité" : "Modifier le bien"} busy={busy} description="Caractéristiques du bien.">{(close, done) => <PropertyEditor property={property} cancel={close} onSaved={record => { saved(record); done(); }} />}</ProjectEditLink> : null}<RecordActions initialOpen={initialTab === "history"}><RecordDrawer label="Historique" action="read" busy={busy} initialOpen={initialTab === "history"} description="Historique des faits, offres et états de ce bien."><InventoryHistory id={id} /></RecordDrawer>{role !== "agent" ? <RecordDrawer label="Gérer le dossier" action="settings" busy={busy} description="Archivage et restauration du bien."><LifecyclePanel kind="properties" id={id} version={property.version} reference={property.reference} archived={archived} saved={saved} refresh={query.refreshQuietly} /></RecordDrawer> : null}</RecordActions></>} />
    {notice ? <p role="status" className="mb-3 text-sm text-success">{notice}</p> : null}{archived ? <p role="status" className="mb-3 text-sm text-muted-foreground">Bien archivé : les informations restent consultables.</p> : null}
    <RecordWorkspace initialTab={initialTab} label="Informations du bien" tabs={[{ id: "overview", label: "Aperçu", content: <>
      {property.important_remarks ? <ImportantRemarks value={property.important_remarks} /> : null}
      <RecordSection title="Informations du bien"><RecordFacts>
        <RecordFact icon={PropertyIcon} label="Référence">{property.reference}</RecordFact>
        <RecordFact icon={PropertyIcon} label="Type de bien">{categoryLabels[property.category]}</RecordFact>
        <RecordFact icon={LocationIcon} label="Localisation">{property.location || property.listing_details.city || "Non renseignée"}</RecordFact>
        <RecordFact icon={ColumnsIcon} label="Surface">{property.area_sqm ? `${property.area_sqm.replace(".", ",")} m²` : "Non renseignée"}</RecordFact>
        {!["land", "farm", "commercial", "office", "room"].includes(property.category) ? <RecordFact icon={PropertyIcon} label="Pièces">{property.rooms ?? "Non renseigné"}</RecordFact> : null}
        {property.received_on ? <RecordFact icon={CalendarIcon} label={receivedDateLabel}>{formatBusinessDate(property.received_on)}</RecordFact> : null}
      </RecordFacts></RecordSection>
      <InventoryOfferSection target={property} kinds={[...kinds]} writable={managedWritable} busy={busy} saved={saved} />
      {property.owner_asking_price_mad || property.monthly_syndic_fee_mad ? <RecordSection title="Prix propriétaire et charges"><RecordFacts>
        {property.owner_asking_price_mad ? <RecordFact icon={FinanceIcon} label={propertyCostLabels.owner_asking_price_mad}>{formatMAD(property.owner_asking_price_mad)}</RecordFact> : null}
        {property.monthly_syndic_fee_mad ? <RecordFact icon={FinanceIcon} label={propertyCostLabels.monthly_syndic_fee_mad}>{formatMAD(property.monthly_syndic_fee_mad)} / mois</RecordFact> : null}
      </RecordFacts></RecordSection> : null}
      <PropertyListingDetails property={property} />
      {property.hierarchy ? <RecordSection title="Rattachement au programme"><RecordFacts>
        <RecordFact icon={DevelopmentIcon} label="Programme"><Link className="inline-flex min-h-control items-center hover:underline" href={`/projects/${property.hierarchy.development.id}`}>{property.hierarchy.development.name} · {property.hierarchy.development.reference}</Link></RecordFact>
        <RecordFact icon={PropertyIcon} label="Bloc">{property.hierarchy.block ? <Link className="inline-flex min-h-control items-center hover:underline" href={`/projects/${property.hierarchy.development.id}?tab=units&block_id=${property.hierarchy.block.id}`}>{property.hierarchy.block.code} · {property.hierarchy.block.label}</Link> : "Rattachement direct"}</RecordFact>
        <RecordFact icon={PropertyIcon} label="Étage">{property.hierarchy.floor?.label ?? "Sans étage"}</RecordFact>
        <RecordFact icon={ColumnsIcon} label="Type réutilisable">{property.hierarchy.unit_type?.label ?? "Sans type"}</RecordFact>
      </RecordFacts></RecordSection> : null}
    </> }, { id: "calendar", label: "Calendrier", content: <PropertyCalendar id={id} writable={managedWritable} busy={busy} /> }]} aside={<>
      <InventoryPhotoRail id={id} kind="property" writable={managedWritable} archived={archived} revision={photoRevision} changed={photoChanged} />
      <RecordSection title="Propriétaires" action={managedWritable ? <RecordDrawer label="Modifier" title="Propriétaires légaux" action="edit" busy={busy} initialOpen={initialTab === "owners"} description="Propriétaires légaux de ce bien.">{(close, done) => <OwnerEditor property={property} saved={record => { saved(record); done(); }} cancel={close} />}</RecordDrawer> : undefined}>{property.owners.length ? property.owners.map((owner, index) => <InventoryParty key={index} link={owner} />) : <p className="text-sm text-muted-foreground">Aucun propriétaire renseigné. Les offres ne peuvent pas devenir disponibles.</p>}</RecordSection>
    </>} />
  </fieldset></InventoryBusyContext.Provider></InventoryRecordContext.Provider>;
}
