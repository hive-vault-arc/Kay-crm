"use client";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { categoryLabels, kindLabels, propertySchema } from "./contracts";
import { InventoryStatus, Price } from "./states";
import { PropertyEditor } from "./property-editor";
import { OwnerEditor } from "./owner-editor";
import { Campaign } from "./campaign";
import { InventoryHistory } from "./inventory-history";
import { InventoryBusyContext } from "./use-command";
import { FilePanel } from "@/features/files/file-panel";
import { PropertyPhotos } from "@/features/files/property-photos";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { ClockIcon, ColumnsIcon, ContactsIcon, DashboardIcon, DealIcon, FinanceIcon, LocationIcon, PropertyIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { InventoryFact, InventoryTab } from "./record-details";

export function PropertyRecord({ id, role, edit = false }: { id: string; role: StaffRole; edit?: boolean }) {
  const { value: property, error, refresh } = useQuery(`/api/v1/properties/${id}`, propertySchema);
  const [editingOwners, setEditingOwners] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const photoChanged = useCallback(() => setPhotoRevision(value => value + 1), []);
  const writable = role !== "agent" && !property?.archived_at;
  if (edit && property?.archived_at) return <p role="alert">Dossier archivé : restaurez-le avant de le modifier.</p>;
  if (error) return <RecordError error={error} retry={refresh} />;
  if (!property) return <p role="status">Chargement du bien…</p>;
  if (edit) return <PropertyEditor property={property} />;
  function saved() { setEditingOwners(false); setNotice("Inventaire enregistré."); refresh(); }
  return <div className="grid min-w-0 gap-4">
    <nav aria-label={property.hierarchy ? "Fil d’Ariane de l’unité" : "Fil d’Ariane du bien"}><ol className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground"><li><Link className="inline-flex min-h-control items-center text-link underline" href="/projects">Projets</Link></li>{property.hierarchy ? <><li><Link className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`/projects/${property.development_id}`}>/ {property.hierarchy.development.reference}</Link></li>{property.hierarchy.block ? <li className="wrap-anywhere">/ {property.hierarchy.block.code}</li> : null}{property.hierarchy.floor ? <li><Link className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`/projects/${property.development_id}?tab=units&block_id=${property.hierarchy.block?.id}&floor_id=${property.floor_id}`}>/ {property.hierarchy.floor.code}</Link></li> : null}</> : null}<li className="wrap-anywhere" aria-current="page">/ {property.reference}</li></ol></nav>
    <header className="surface flex min-w-0 flex-wrap items-center gap-4"><InventoryThumbnail key={photoRevision} kind="property" id={id} compact /><div className="grid min-w-0 flex-1 basis-64 gap-1"><p className="text-xs font-medium text-muted-foreground">{property.development_id ? "Unité physique" : "Bien indépendant"}</p><h1 data-route={`/projects/properties/${id}`} tabIndex={-1} className="wrap-anywhere text-page font-semibold">{property.reference}</h1>{property.marketing_name ? <h2 className="wrap-anywhere font-medium">{property.marketing_name}</h2> : null}<p className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"><PropertyIcon aria-hidden="true" className="size-4 shrink-0" />{categoryLabels[property.category]}<span aria-hidden="true">·</span><LocationIcon aria-hidden="true" className="size-4 shrink-0" />{property.location ?? "Localisation non renseignée"}</p></div>{!property.archived_at ? <Button action="edit" asChild variant="outline"><Link href={`/projects/properties/${id}/edit`}>Modifier le bien</Link></Button> : null}</header>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {busy ? <p role="status">Enregistrement en cours, veuillez patienter…</p> : null}
    <InventoryBusyContext.Provider value={pending => { setBusy(pending); if (pending) setNotice(""); }}><fieldset disabled={busy} className="grid min-w-0 gap-6" aria-busy={busy}><legend className="sr-only">Fiche du bien et commandes d’inventaire</legend><Tabs defaultValue="facts"><TabsList aria-label="Fiche du bien"><InventoryTab value="facts" icon={DashboardIcon}>Aperçu</InventoryTab><InventoryTab value="owners" icon={ContactsIcon}>Propriétaires</InventoryTab><InventoryTab value="offerings" icon={DealIcon}>Offres</InventoryTab><InventoryTab value="history" icon={ClockIcon}>Historique</InventoryTab></TabsList>
      <TabsContent value="facts" className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,1fr)]">
        <section className="surface grid min-w-0 content-start gap-5"><SectionHeading icon={PropertyIcon} tone="teal">Caractéristiques du bien</SectionHeading><dl className="grid min-w-0 gap-4 sm:grid-cols-2"><InventoryFact icon={PropertyIcon} label="Catégorie">{categoryLabels[property.category]} · {property.development_id ? "Unité physique d’un programme" : "Bien indépendant"}</InventoryFact><InventoryFact icon={ColumnsIcon} label="Surface">{property.area_sqm ? `${property.area_sqm.replace(".", ",")} m²` : "Non renseignée"}</InventoryFact>{property.category !== "land" && property.category !== "commercial" ? <InventoryFact icon={DashboardIcon} label="Nombre de pièces">{property.rooms ?? "Non renseigné"}</InventoryFact> : null}<InventoryFact icon={LocationIcon} label="Localisation" wide={property.category === "land" || property.category === "commercial"}>{property.location ?? "Non renseignée"}</InventoryFact></dl>
          <div className="grid min-w-0 gap-3 border-t pt-4"><h3 className="flex items-center gap-2 font-medium"><DealIcon aria-hidden="true" className="size-5 text-info" />Campagnes actuelles</h3><div className="grid min-w-0 gap-4 md:grid-cols-2">{(["sale", "rental"] as const).map(kind => { const offer = property.offerings.find(item => item.kind === kind); const Icon = kind === "sale" ? FinanceIcon : PropertyIcon; return <section className="grid min-w-0 content-start gap-2" key={kind}><h4 className="flex items-center gap-2 font-medium"><Icon aria-hidden="true" className={`size-4 ${kind === "sale" ? "text-info" : "text-purple"}`} />{kindLabels[kind]}</h4>{offer ? <><InventoryStatus state={offer.state} occupied={offer.occupied} conflict={offer.reservation_conflict} /><Price offering={offer} /></> : <p className="text-sm text-muted-foreground">Aucune campagne actuelle.</p>}</section>; })}</div></div>
        </section>
        <div className="surface min-w-0 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">{!property.archived_at ? <FilePanel parentKind="property" parentId={id} writable={writable} /> : <p>Documents indisponibles tant que le dossier est archivé.</p>}</div>
        {!property.archived_at ? <PropertyPhotos propertyId={id} writable={writable} onChanged={photoChanged} /> : null}
        {role !== "agent" ? <div className="surface min-w-0 xl:col-span-2 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0"><LifecyclePanel kind="properties" id={id} version={property.version} reference={property.reference} archived={!!property.archived_at} saved={refresh} /></div> : null}
      </TabsContent>
      <TabsContent value="owners" className="surface grid min-w-0 gap-6">{editingOwners && writable ? <OwnerEditor property={property} saved={saved} cancel={() => setEditingOwners(false)} /> : <><h2 className="text-section font-medium">Propriétaires légaux</h2>{property.owners.length ? <ul className="grid min-w-0 gap-4">{property.owners.map((owner, index) => <li className="grid min-w-0 gap-2 border-b pb-4" key={index}><p className="wrap-anywhere">{owner.marketing_display ?? "Libellé commercial non renseigné"}</p>{owner.contact ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline wrap-anywhere" href={`/contacts/${owner.contact.id}`}>{owner.contact.name}</Link> : <p className="text-sm text-muted-foreground">Identité privée protégée par les droits Contacts.</p>}</li>)}</ul> : <p>Propriétaires non renseignés. Les offres ne peuvent pas devenir disponibles.</p>}<p className="text-sm text-muted-foreground">Lire ce bien n’accorde aucun accès aux coordonnées, notes ou documents privés des contacts.</p>{writable ? <Button action="edit" className="justify-self-start" onClick={() => setEditingOwners(true)}>Modifier les propriétaires</Button> : null}</>}</TabsContent>
      <TabsContent value="offerings" className="record-stack grid min-w-0 items-start gap-4 xl:grid-cols-2">{(["sale", "rental"] as const).map(kind => <Campaign key={kind} kind={kind} property={property} writable={writable} saved={saved} />)}</TabsContent>
      <TabsContent value="history"><InventoryHistory id={id} /></TabsContent>
    </Tabs></fieldset></InventoryBusyContext.Provider><Button action="back" asChild variant="outline" className="justify-self-start"><Link href="/projects">Tous les biens indépendants</Link></Button>
  </div>;
}

