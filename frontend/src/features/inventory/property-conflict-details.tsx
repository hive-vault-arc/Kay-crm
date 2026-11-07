import type { Property } from "./contracts";
import { listingFieldLabels, formatListingField } from "./listing-field-format";

export function PropertyConflictDetails({ property }: { property: Property }) {
  return <details className="min-w-0 border-y py-2">
    <summary className="flex min-h-control cursor-pointer items-center font-medium text-link">Comparer les caractéristiques actuelles</summary>
    <dl className="grid min-w-0 gap-3 py-3 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Pièces</dt><dd>{property.rooms ?? "Non renseigné"}</dd></div>
      {Object.entries(listingFieldLabels).map(([key, label]) => {
        const text = formatListingField(property, key as keyof typeof listingFieldLabels);
        return <div key={key} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{text || "Non renseigné"}</dd></div>;
      })}
      {property.hierarchy ? <div className="min-w-0"><dt className="text-muted-foreground">Rattachement</dt><dd className="wrap-anywhere">{[property.hierarchy.development.reference, property.hierarchy.block?.label, property.hierarchy.floor?.label, property.hierarchy.unit_type?.label].filter(Boolean).join(" · ")}</dd></div> : null}
    </dl>
  </details>;
}
