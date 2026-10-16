"use client";
import { LifecyclePanel } from "@/features/discovery/lifecycle-panel";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function PropertyRecord({ id, role, edit = false }: { id: string; role: StaffRole; edit?: boolean }) {
  const { value: property, error, refresh } = useQuery(`/api/v1/properties/${id}`, propertySchema);
  const [editingOwners, setEditingOwners] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const writable = role !== "agent" && !property?.archived_at;
  if (edit && !writable) return <p role="alert">{property?.archived_at ? "Dossier archivé : restaurez-le avant de le modifier." : "Accès non autorisé : seuls les responsables et administrateurs peuvent modifier l’inventaire."}</p>;
  if (error) return <RecordError error={error} retry={refresh} />;
  if (!property) return <p role="status">Chargement du bien…</p>;
  if (edit) return <PropertyEditor property={property} />;
  function saved() { setEditingOwners(false); setNotice("Inventaire enregistré."); refresh(); }
  return <div className="grid min-w-0 gap-6"><h2 className="wrap-anywhere text-section font-medium">{property.reference}{property.marketing_name ? ` · ${property.marketing_name}` : ""}</h2>{property.hierarchy ? <nav aria-label="Fil d’Ariane de l’unité"><ol className="flex min-w-0 flex-wrap items-center gap-2"><li><Link className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`/projects/${property.development_id}`}>{property.hierarchy.development.reference}</Link></li>{property.hierarchy.block ? <li className="wrap-anywhere">/ {property.hierarchy.block.code}</li> : null}{property.hierarchy.floor ? <li><Link className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`/projects/${property.development_id}?tab=units&block_id=${property.hierarchy.block?.id}&floor_id=${property.floor_id}`}>/ {property.hierarchy.floor.code}</Link></li> : null}<li className="wrap-anywhere" aria-current="page">/ {property.reference}</li></ol></nav> : null}{notice ? <p role="status" className="text-success">{notice}</p> : null}
    {busy ? <p role="status">Enregistrement en cours, veuillez patienter…</p> : null}
    <InventoryBusyContext.Provider value={pending => { setBusy(pending); if (pending) setNotice(""); }}><fieldset disabled={busy} className="grid min-w-0 gap-6" aria-busy={busy}><legend className="sr-only">Fiche du bien et commandes d’inventaire</legend><Tabs defaultValue="facts"><TabsList aria-label="Fiche du bien"><TabsTrigger value="facts">Aperçu</TabsTrigger><TabsTrigger value="owners">Propriétaires</TabsTrigger><TabsTrigger value="offerings">Offres</TabsTrigger><TabsTrigger value="history">Historique</TabsTrigger></TabsList>
      <TabsContent value="facts" className="surface grid gap-6"><dl className="grid min-w-0 max-w-reading gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Catégorie</dt><dd>{categoryLabels[property.category]} · {property.development_id ? "Unité physique d’un programme" : "Bien indépendant"}</dd></div><div><dt className="text-sm text-muted-foreground">Surface</dt><dd>{property.area_sqm ? `${property.area_sqm.replace(".", ",")} m²` : "Non renseignée"}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-muted-foreground">Localisation</dt><dd className="wrap-anywhere">{property.location ?? "Non renseignée"}</dd></div></dl>
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">{(["sale", "rental"] as const).map(kind => { const offer = property.offerings.find(item => item.kind === kind); return <section className="grid min-w-0 content-start gap-4 border-t pt-4" key={kind}><h3 className="font-medium">{kindLabels[kind]}</h3>{offer ? <><InventoryStatus state={offer.state} occupied={offer.occupied} conflict={offer.reservation_conflict} /><Price offering={offer} /></> : <p>Aucune campagne actuelle.</p>}</section>; })}</div>
        {writable ? <Button className="justify-self-start" asChild><Link href={`/projects/properties/${id}/edit`}>Modifier le bien</Link></Button> : <p>{property.archived_at ? "Lecture seule : restaurez ce dossier pour le modifier." : "Lecture seule : les modifications d’inventaire sont réservées aux responsables."}</p>}{!property.archived_at ? <FilePanel parentKind="property" parentId={id} writable={writable} /> : <p>Documents indisponibles tant que le dossier est archivé.</p>}{role !== "agent" ? <LifecyclePanel kind="properties" id={id} version={property.version} reference={property.reference} archived={!!property.archived_at} saved={refresh} /> : null}
      </TabsContent>
      <TabsContent value="owners" className="surface grid min-w-0 gap-6">{editingOwners && writable ? <OwnerEditor property={property} saved={saved} cancel={() => setEditingOwners(false)} /> : <><h2 className="text-section font-medium">Propriétaires légaux</h2>{property.owners.length ? <ul className="grid min-w-0 gap-4">{property.owners.map((owner, index) => <li className="grid min-w-0 gap-2 border-b pb-4" key={index}><p className="wrap-anywhere">{owner.marketing_display ?? "Libellé commercial non renseigné"}</p>{owner.contact ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline wrap-anywhere" href={`/contacts/${owner.contact.id}`}>{owner.contact.name}</Link> : <p className="text-sm text-muted-foreground">Identité privée protégée par les droits Contacts.</p>}</li>)}</ul> : <p>Propriétaires non renseignés. Les offres ne peuvent pas devenir disponibles.</p>}<p className="text-sm text-muted-foreground">Lire ce bien n’accorde aucun accès aux coordonnées, notes ou documents privés des contacts.</p>{writable ? <Button className="justify-self-start" onClick={() => setEditingOwners(true)}>Modifier les propriétaires</Button> : null}</>}</TabsContent>
      <TabsContent value="offerings" className="record-stack grid min-w-0 gap-8">{(["sale", "rental"] as const).map(kind => <Campaign key={kind} kind={kind} property={property} writable={writable} saved={saved} />)}</TabsContent>
      <TabsContent value="history"><InventoryHistory id={id} /></TabsContent>
    </Tabs></fieldset></InventoryBusyContext.Provider><Button asChild variant="outline" className="justify-self-start"><Link href="/projects">Tous les biens indépendants</Link></Button>
  </div>;
}

