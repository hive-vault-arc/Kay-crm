import Link from "next/link";
import { Price, InventoryStatus } from "@/features/inventory/states";
import { categoryLabels, type Offering } from "@/features/inventory/contracts";

export const targetLabels = { standalone: "Bien indépendant", unit: "Unité physique", development: "Programme entier" } as const;
export function OfferingFacts({ offering }: { offering: Offering }) {
  const target = offering.target;
  if (!target) return <p role="alert">La cible de cette offre ne peut pas être vérifiée. Actualisez la liste.</p>;
  return <div className="grid min-w-0 gap-2"><h4 className="wrap-anywhere font-medium">{target.reference} : {targetLabels[target.level]}</h4>{target.label ? <p className="wrap-anywhere">{target.label}</p> : null}<p className="wrap-anywhere">{target.category ? `${categoryLabels[target.category]}, ` : ""}{target.location ?? "Localisation non renseignée"}</p>{target.level === "unit" ? <p className="wrap-anywhere">Programme {target.development_reference}, bloc {target.block_code ?? "non renseigné"}, étage {target.floor_code ?? "non renseigné"}, type {target.unit_type_code ?? "non renseigné"}. Le type décrit l’unité ; il n’est pas la cible de l’offre.</p> : null}<p>Surface propre : {target.area_sqm ?? "non renseignée"}{target.area_sqm ? " m²" : ""}. Pièces : {target.rooms ?? "non renseignées"}.</p><InventoryStatus state={offering.state} occupied={offering.occupied} conflict={offering.reservation_conflict} /><Price offering={offering} /><p className="whitespace-pre-wrap wrap-anywhere">{offering.conditions || "Conditions non renseignées"}</p>{target.archived ? <p className="text-warning">Programme archivé. Cette offre reste identifiable pour l’historique.</p> : null}<Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={target.level === "development" ? `/projects/${target.id}` : `/projects/properties/${target.id}`}>Ouvrir la cible exacte</Link></div>;
}
