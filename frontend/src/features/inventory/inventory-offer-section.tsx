"use client";

import { RecordSection } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { kindLabels, type InventoryTarget, type Offering } from "./contracts";
import { OfferingEditor } from "./offering-editor";
import { InventoryStatus, Price } from "./states";
import { Campaign } from "./campaign";

export function InventoryOfferSection({ target, kinds, writable, busy, saved, programme = false }: {
  target: InventoryTarget; kinds: Offering["kind"][]; writable: boolean; busy: boolean; saved: () => void; programme?: boolean;
}) {
  return <RecordSection title={programme ? "Offres du programme" : "Offres"} action={writable ? kinds.filter(kind => !target.offerings.some(offer => offer.kind === kind)).map(kind => <RecordDrawer key={kind} label={`Créer une offre de ${kindLabels[kind].toLocaleLowerCase("fr")}`} action="add" busy={busy} description={programme ? "Cette offre concerne le programme entier. Les offres des unités restent distinctes." : "Renseigner les conditions de cette nouvelle offre."}>{(close, done) => <OfferingEditor property={target} kind={kind} saved={() => { saved(); done(); }} cancel={close} />}</RecordDrawer>) : undefined}>
    {target.offerings.length ? <div className="kay-inventory-offers">{target.offerings.map(offer => <div key={offer.id} className="kay-inventory-offer-summary"><span className="text-sm text-muted-foreground">{kindLabels[offer.kind]}</span><div className="kay-inventory-offer-price"><Price offering={offer} /></div><InventoryStatus state={offer.state} conflict={offer.reservation_conflict} occupied={offer.occupied} /><RecordDrawer label={writable ? "Actions" : "Détails"} title={`Offre de ${kindLabels[offer.kind].toLocaleLowerCase("fr")}`} action={writable ? "settings" : "preview"} busy={busy} description="Conditions, confirmation de disponibilité et actions autorisées."><Campaign property={target} kind={offer.kind} writable={writable} saved={saved} /></RecordDrawer>{offer.conditions ? <p className="kay-inventory-offer-note">{offer.conditions}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Aucune offre renseignée pour ce dossier.</p>}
  </RecordSection>;
}
