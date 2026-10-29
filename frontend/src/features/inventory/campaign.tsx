"use client";
import type { InventoryRecord } from "./record-scope";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection } from "@/components/shared/record-workspace";
import { formatInstant } from "@/lib/format";
import { kindLabels, type InventoryTarget, type Offering } from "./contracts";
import { Availability, OfferingEditor } from "./offering-editor";
import { InventoryStatus, Price } from "./states";
import { ExternalOutcome } from "./external-outcome";

export function CampaignActions({ property, offering, writable, busy, saved }: { property: InventoryTarget; offering: Offering; writable: boolean; busy: boolean; saved: (record?: InventoryRecord) => void }) {
  const ordinary = writable && offering.is_current && ["draft", "available"].includes(offering.state);
  const external = writable && offering.is_current && offering.kind !== "holiday" && ["available", "reserved"].includes(offering.state);
  const label = kindLabels[offering.kind].toLocaleLowerCase("fr");
  return <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
    {ordinary ? <>
      <RecordDrawer iconOnly label={`Modifier la campagne ${label}`} title="Modifier l’offre" action="edit" busy={busy} description="Prix, période et conditions de cette campagne.">{(close, done) => <OfferingEditor property={property} kind={offering.kind} offering={offering} saved={record => { saved(record); done(); }} cancel={close} />}</RecordDrawer>
      <RecordDrawer iconOnly label={`Confirmer la disponibilité ${label}`} title="Confirmer la disponibilité" action="confirm" busy={busy} description="Vérifier le prix, les propriétaires et l’état du stock.">{(close, done) => <Availability property={property} offering={offering} saved={record => { saved(record); done(); }} cancel={close} />}</RecordDrawer>
    </> : <RecordDrawer iconOnly label={`Détails de l’offre de ${label}`} title={`Offre de ${label}`} action="preview" busy={busy} description="Conditions et état actuel de cette campagne."><Campaign property={property} kind={offering.kind} /></RecordDrawer>}
    {external ? <ExternalOutcome target={property} offering={offering} saved={saved} iconOnly disabled={busy} /> : null}
  </div>;
}

export function Campaign({ property, kind }: { property: InventoryTarget; kind: Offering["kind"] }) {
  const offering = property.offerings.find(item => item.kind === kind && item.is_current);
  return <RecordSection title={kindLabels[kind]}>{offering ? <>
    <InventoryStatus state={offering.state} conflict={offering.reservation_conflict} occupied={offering.occupied} /><Price offering={offering} />
    <p className="text-sm whitespace-pre-wrap wrap-anywhere">{offering.conditions || "Conditions non renseignées"}</p><p className="text-sm text-muted-foreground">Dernière confirmation : {formatInstant(offering.availability_confirmed_at)}</p>
    {offering.state === "reserved" ? <p className="text-sm">Réservation active : une libération explicite depuis l’affaire autorisée est nécessaire avant de modifier cette campagne.</p> : null}
    {offering.reservation_conflict === "DEVELOPMENT_OVERLAP" ? <p className="text-sm text-warning">Un programme ou une unité du même type est réservé. Faites vérifier le chevauchement par un responsable.</p> : null}
    {["sold", "rented", "review"].includes(offering.state) ? <p className="text-sm">Résultat ou revue de stock conservé : une modification ordinaire ne peut pas le remplacer.</p> : null}
    {kind === "holiday" ? <p className="text-sm text-muted-foreground">Les réservations datées des séjours ne sont pas encore gérées dans le calendrier des affaires.</p> : null}
  </> : <p className="text-sm text-muted-foreground">Aucune campagne actuelle. Les anciennes campagnes restent dans l’historique.</p>}</RecordSection>;
}
