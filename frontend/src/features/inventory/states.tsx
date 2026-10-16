"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { type ApiError } from "@/lib/api/client";
import { formatMAD } from "@/lib/format";
import { categoryLabels, kindLabels, propertySchema, stateLabels, type Offering, type InventoryTarget } from "./contracts";
import { developmentSchema } from "./development-contracts";

export function InventoryStatus({ state, conflict, occupied }: { state: Offering["state"]; conflict?: Offering["reservation_conflict"]; occupied?: boolean }) {
  return <span className="grid gap-1"><Badge className="justify-self-start" variant={state === "available" && !conflict ? "success" : state === "review" || conflict ? "warning" : state === "reserved" ? "teal" : state === "sold" || state === "rented" ? "purple" : "neutral"}>{stateLabels[state]}</Badge>{occupied ? <span className="text-warning">Occupation locative enregistrée ; la vente peut rester active.</span> : null}{state === "review" ? <span className="text-warning">Périmètre à vérifier par un responsable.</span> : null}{conflict === "DEVELOPMENT_OVERLAP" ? <span className="text-warning">Réservation en chevauchement : revue du stock nécessaire.</span> : null}</span>;
}
export function Price({ offering }: { offering: Offering }) {
  return <div className="grid min-w-0 gap-1"><span className="wrap-anywhere tabular-nums">{formatMAD(offering.price_mad)}{offering.kind === "rental" && offering.price_mad !== null ? offering.price_period === "month" ? " / mois" : " / an" : ""}</span>{offering.annual_equivalent_mad !== null ? <span className="wrap-anywhere text-sm text-muted-foreground tabular-nums">Comparaison annuelle : {formatMAD(offering.annual_equivalent_mad)} / an</span> : null}</div>;
}
export function InventoryError({ error, id, choose, level }: { error?: ApiError; id?: string; choose?: (current: InventoryTarget) => void; level?: "development" }) {
  if (!error) return null;
  return <div className="grid gap-4"><RecordError error={error} />{error.code === "DEPENDENCY_UNAVAILABLE" ? <p>Votre saisie reste ici. Réessayez sans la modifier pour récupérer le résultat de la même tentative.</p> : null}{error.code === "INVENTORY_VERSION_CONFLICT" && id && choose ? level === "development" ? <DevelopmentConflict id={id} choose={choose} /> : <Conflict id={id} choose={choose} /> : null}</div>;
}
function Conflict({ id, choose }: { id: string; choose: (current: InventoryTarget) => void }) {
  const { value, error, refresh } = useQuery(`/api/v1/properties/${id}`, propertySchema);
  return <section className="grid min-w-0 gap-4 border-l-2 border-warning pl-4" aria-label="Version actuelle du bien">{error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement de la version actuelle…</p> : <><h3 className="font-medium">Version actuelle {value.version}</h3><p className="wrap-anywhere">{value.reference} · {categoryLabels[value.category]} · {value.marketing_name ?? "Nom non renseigné"}</p><p className="wrap-anywhere">{value.location ?? "Localisation non renseignée"} · {value.area_sqm ?? "Surface inconnue"}</p><p className="wrap-anywhere">Propriétaires : {value.owners.map(owner => owner.contact?.name ?? owner.marketing_display ?? "Identité protégée").join(", ") || "Non renseignés"}</p>{value.offerings.map(offering => <div className="grid gap-2" key={offering.id}><p>{kindLabels[offering.kind]} · version {offering.version} · {stateLabels[offering.state]}</p><Price offering={offering} /><p className="whitespace-pre-wrap wrap-anywhere">{offering.conditions}</p></div>)}<p>Votre formulaire n’a pas été remplacé. Comparez-le avant de confirmer une nouvelle tentative.</p><Button type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal text-left" onClick={() => choose(value)}>Conserver ma saisie sur cette version</Button></>}</section>;
}
function DevelopmentConflict({ id, choose }: { id: string; choose: (current: InventoryTarget) => void }) {
  const { value, error, refresh } = useQuery(`/api/v1/developments/${id}`, developmentSchema);
  return <section className="grid min-w-0 gap-4 border-l-2 border-warning pl-4" aria-label="Version actuelle du programme">{error ? <RecordError error={error} retry={refresh} /> : !value ? <p role="status">Chargement de la version actuelle…</p> : <><h3 className="font-medium">Version actuelle {value.version}</h3><p className="wrap-anywhere">{value.reference} · {value.name} · {value.location ?? "Localisation non renseignée"}</p><p className="whitespace-pre-wrap wrap-anywhere">{value.briefing_text ?? "Aucune présentation renseignée."}</p><p>Propriétaires : {value.owners.map(owner => owner.contact?.name ?? owner.marketing_display ?? "Identité protégée").join(", ") || "Non renseignés"}</p>{value.offerings.map(offering => <div className="grid gap-2" key={offering.id}><p>{kindLabels[offering.kind]} · version {offering.version} · {stateLabels[offering.state]}</p><Price offering={offering} /></div>)}<p>Votre formulaire n’a pas été remplacé. Comparez-le avant de confirmer une nouvelle tentative.</p><Button type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal text-left" onClick={() => choose({ ...value, inventoryLevel: "development" })}>Conserver ma saisie sur cette version</Button></>}</section>;
}
