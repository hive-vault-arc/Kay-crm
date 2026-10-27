"use client";

import { RecordSection } from "@/components/shared/record-workspace";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { kindLabels, type InventoryTarget, type Offering } from "./contracts";
import { OfferingEditor } from "./offering-editor";
import { InventoryStatus, Price } from "./states";
import { CampaignActions } from "./campaign";
import { formatInstant } from "@/lib/format";

export function InventoryOfferSection({ target, kinds, writable, busy, saved, programme = false }: {
  target: InventoryTarget; kinds: Offering["kind"][]; writable: boolean; busy: boolean; saved: () => void; programme?: boolean;
}) {
  return <RecordSection title={programme ? "Offres du programme" : "Offres"} action={writable ? kinds.filter(kind => !target.offerings.some(offer => offer.kind === kind)).map(kind => <RecordDrawer key={kind} label={`Créer une offre de ${kindLabels[kind].toLocaleLowerCase("fr")}`} action="add" busy={busy} description={programme ? "Cette offre concerne le programme entier. Les offres des unités restent distinctes." : "Renseigner les conditions de cette nouvelle offre."}>{(close, done) => <OfferingEditor property={target} kind={kind} saved={() => { saved(); done(); }} cancel={close} />}</RecordDrawer>) : undefined}>
    {target.offerings.length ? <div className="kay-inventory-offers">{target.offerings.map(offer => <div key={offer.id} className="kay-inventory-offer-summary"><span className="text-sm text-muted-foreground">{kindLabels[offer.kind]}</span><div className="kay-inventory-offer-price"><Price offering={offer} /></div><InventoryStatus state={offer.state} conflict={offer.reservation_conflict} occupied={offer.occupied} /><CampaignActions property={target} offering={offer} writable={writable} busy={busy} saved={saved} />{offer.conditions || offer.availability_confirmed_at ? <div className="kay-inventory-offer-note">{offer.conditions ? <p>{offer.conditions}</p> : null}{offer.availability_confirmed_at ? <p className="mt-1 text-xs text-muted-foreground">Dernière confirmation : {formatInstant(offer.availability_confirmed_at)}</p> : null}</div> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">Aucune offre renseignée pour ce dossier.</p>}
  </RecordSection>;
}
