import { ImportantRemarks } from "@/components/shared/important-remarks";
import { formatBusinessDate, formatMAD } from "@/lib/format";
import { propertyCostLabels, receivedDateLabel, type Property } from "./contracts";
import { listingFieldLabels, formatListingField } from "./listing-field-format";

export function PropertyConflictDetails({ property }: { property: Property }) {
  return <details className="min-w-0 border-y py-2">
    <summary className="flex min-h-control cursor-pointer items-center font-medium text-link">Comparer les caractéristiques actuelles</summary>
    <dl className="grid min-w-0 gap-3 py-3 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">{receivedDateLabel}</dt><dd>{formatBusinessDate(property.received_on ?? null)}</dd></div>
      <div><dt className="text-muted-foreground">Pièces</dt><dd>{property.rooms ?? "Non renseigné"}</dd></div>
      <div><dt className="text-muted-foreground">{propertyCostLabels.owner_asking_price_mad}</dt><dd>{formatMAD(property.owner_asking_price_mad ?? null)}</dd></div>
      <div><dt className="text-muted-foreground">{propertyCostLabels.monthly_syndic_fee_mad}</dt><dd>{property.monthly_syndic_fee_mad ? `${formatMAD(property.monthly_syndic_fee_mad)} / mois` : "Non renseigné"}</dd></div>
      {Object.entries(listingFieldLabels).map(([key, label]) => {
        const text = formatListingField(property, key as keyof typeof listingFieldLabels);
        return <div key={key} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{text || "Non renseigné"}</dd></div>;
      })}
      {property.hierarchy ? <div className="min-w-0"><dt className="text-muted-foreground">Rattachement</dt><dd className="wrap-anywhere">{[property.hierarchy.development.reference, property.hierarchy.block?.label, property.hierarchy.floor?.label, property.hierarchy.unit_type?.label].filter(Boolean).join(" · ")}</dd></div> : null}
    </dl>
    {property.important_remarks ? <ImportantRemarks value={property.important_remarks} /> : null}
  </details>;
}
