"use client";
import { useRef } from "react";
import type { InventoryRecord } from "./record-scope";

import { RecordSection } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { kindLabels, offeringConditionsLabels, type InventoryTarget, type Offering } from "./contracts";
import { OfferingEditor } from "./offering-editor";
import { InventoryStatus, Price } from "./states";
import { CampaignActions } from "./campaign";
import { formatInstant } from "@/lib/format";

export function InventoryOfferSection({ target, kinds, writable, busy, saved, programme = false }: {
  target: InventoryTarget; kinds: Offering["kind"][]; writable: boolean; busy: boolean; saved: (record?: InventoryRecord) => void; programme?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // A saved record hides its creation trigger. Keep the drawer and its focus
  // scope mounted until the successful save has completed its close.
  return <RecordSection headingRef={heading} title={programme ? "Offres du programme" : "Offres"} action={writable ? kinds.map(kind => <RecordDrawer key={kind} hideTrigger={target.offerings.some(offer => offer.kind === kind)} fallbackFocus={target.offerings.some(offer => offer.kind === kind) ? heading : undefined} label={`Créer une offre de ${kindLabels[kind].toLocaleLowerCase("fr")}`} action="add" busy={busy} description={programme ? "Cette offre concerne le programme entier. Les offres des unités restent distinctes." : "Renseigner les conditions de cette nouvelle offre."}>{(close, done) => <OfferingEditor property={target} kind={kind} saved={record => { saved(record); done(); }} cancel={close} />}</RecordDrawer>) : undefined}>
    {target.offerings.length ? <div className="kay-inventory-offers">{target.offerings.map(offer => <div key={offer.id} className="kay-inventory-offer-summary"><span className="text-sm text-muted-foreground">{kindLabels[offer.kind]}</span><div className="kay-inventory-offer-price"><Price offering={offer} /></div><InventoryStatus state={offer.state} conflict={offer.reservation_conflict} occupied={offer.occupied} /><CampaignActions property={target} offering={offer} writable={writable} busy={busy} saved={saved} />{offer.conditions || offer.availability_confirmed_at ? <div className="kay-inventory-offer-note">{offer.conditions ? <dl><dt className="text-xs font-medium text-muted-foreground">{offeringConditionsLabels[offer.kind]}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{offer.conditions}</dd></dl> : null}{offer.availability_confirmed_at ? <p className="mt-1 text-xs text-muted-foreground">Dernière confirmation : {formatInstant(offer.availability_confirmed_at)}</p> : null}</div> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Aucune offre renseignée pour ce dossier.</p>}
  </RecordSection>;
}
