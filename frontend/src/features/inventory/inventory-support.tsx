"use client";

import Link from "next/link";
import { RecordSection } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { ContactIcon } from "@/components/icons";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { PropertyPhotos } from "@/features/files/property-photos";
import type { Development } from "./development-contracts";

export function InventoryPhotoRail({ id, kind, writable, archived, revision, changed }: {
  id: string; kind: "property" | "development"; writable: boolean; archived: boolean; revision: number; changed: () => void;
}) {
  return <RecordSection title="Photos" action={!archived ? <RecordDrawer label="Galerie" action="photos" title="Photos du dossier" description="Photos validées, transferts et reprises autorisés."><PropertyPhotos propertyId={id} parentKind={kind} writable={writable} uploadable onChanged={changed} /></RecordDrawer> : undefined}><div className="kay-inventory-photo-cover"><InventoryThumbnail key={revision} kind={kind} id={id} /></div></RecordSection>;
}

export function InventoryParty({ link }: { link: Development["developer"] }) {
  return <div className="kay-inventory-party"><ContactIcon size={16} aria-hidden="true" /><div><p>{link.marketing_display ?? "Libellé commercial non renseigné"}</p>{link.contact ? <Link href={`/contacts/${link.contact.id}`} className="inline-flex min-h-control items-center text-sm hover:underline">{link.contact.name}</Link> : <p className="text-xs text-muted-foreground">Identité privée protégée par les droits Contacts.</p>}</div></div>;
}
