"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { RecordSection } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { ContactIcon } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { InventoryVideos } from "@/features/files/inventory-videos";
import { PropertyPhotos } from "@/features/files/property-photos";
import type { Development } from "./development-contracts";

type InventoryGalleryProps = { id: string; kind: "property" | "development"; writable: boolean; changed: () => void };

export function InventoryPhotoRail({ id, kind, writable, archived, revision, changed }: InventoryGalleryProps & {
  archived: boolean; revision: number;
}) {
  return <RecordSection title="Galerie" action={!archived ? <RecordDrawer label="Galerie" action="photos" title="Galerie du dossier" description="Photos et vidéos du bien ou du programme."><InventoryGallery id={id} kind={kind} writable={writable} changed={changed} /></RecordDrawer> : undefined}><div className="kay-inventory-photo-cover"><InventoryThumbnail key={revision} kind={kind} id={id} /></div></RecordSection>;
}

function InventoryGallery({ id, kind, writable, changed }: InventoryGalleryProps) {
  const [tab, setTab] = useState("photos");
  const gallery = useRef<HTMLDivElement>(null);
  const guard = useUnsavedGuard();

  function select(next: string) {
    if (next !== tab && gallery.current) guard.request(() => setTab(next), gallery.current);
  }

  function focusTab(event: MouseEvent<HTMLButtonElement>) {
    // Let the click finish before opening another dialog inside the drawer.
    if (event.button !== 0 || event.ctrlKey) return;
    event.preventDefault();
    event.currentTarget.focus();
  }

  function activateTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (!event.repeat) event.currentTarget.click();
  }

  return <>{guard.dialog}<Tabs ref={gallery} value={tab} activationMode="manual">
    <TabsList aria-label="Médias du dossier" className="px-0 py-1">
      <TabsTrigger value="photos" onMouseDown={focusTab} onKeyDown={activateTab} onClick={() => select("photos")}>Photos</TabsTrigger>
      <TabsTrigger value="videos" onMouseDown={focusTab} onKeyDown={activateTab} onClick={() => select("videos")}>Vidéos MP4 / MOV</TabsTrigger>
    </TabsList>
    <TabsContent value="photos">
      <PropertyPhotos propertyId={id} parentKind={kind} writable={writable} uploadable onChanged={changed} />
    </TabsContent>
    <TabsContent value="videos">
      <InventoryVideos kind={kind} id={id} />
    </TabsContent>
  </Tabs></>;
}

export function InventoryParty({ link }: { link: Development["developer"] }) {
  return <div className="kay-inventory-party"><ContactIcon size={16} aria-hidden="true" /><div><p>{link.marketing_display ?? "Libellé commercial non renseigné"}</p>{link.contact ? <Link href={`/contacts/${link.contact.id}`} className="inline-flex min-h-control items-center text-sm hover:underline">{link.contact.name}</Link> : <p className="text-xs text-muted-foreground">Identité privée protégée par les droits Contacts.</p>}</div></div>;
}
