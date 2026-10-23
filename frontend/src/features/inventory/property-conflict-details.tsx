import { amenityLabels, type Property } from "./contracts";

const labels: Record<keyof Property["listing_details"], string> = {
  condition: "État", address: "Adresse", region: "Région", city: "Ville", district: "Arrondissement", neighborhood: "Quartier", google_maps_url: "Lien Google Maps",
  bedrooms: "Chambres", bathrooms: "Salles de bain", capacity: "Capacité d’accueil", minimum_nights: "Séjour minimum (nuits)", age_band: "Ancienneté", floor_type: "Revêtement du sol", unit_floor: "Étage", building_floors: "Étages du bâtiment", orientation: "Orientation", plot_area_sqm: "Parcelle (m²)", land_delivery: "Livraison du terrain", land_status: "Statut du terrain", amenities: "Équipements", garden_area_sqm: "Jardin (m²)", terrace_area_sqm: "Terrasse (m²)", garage_spaces: "Places de garage", description: "Description",
};
const choices: Record<string, string> = {
  new_or_renovated: "Neuf ou rénové", good: "Bon état", to_renovate: "À rénover", under_1: "Moins d’un an", "1_5": "1 à 5 ans", "5_10": "5 à 10 ans", "10_20": "10 à 20 ans", "20_30": "20 à 30 ans", "30_50": "30 à 50 ans", "50_70": "50 à 70 ans", "70_100": "70 à 100 ans", over_100: "Plus de 100 ans", parquet: "Parquet", marble: "Marbre", tile: "Carrelage", other: "Autre", north: "Nord", west: "Ouest", east: "Est", south: "Sud", planned: "Prévue", titled: "Titré", subdivided: "Lotissement", not_subdivided: "Non loti",
};
const choiceFields = new Set(["condition", "age_band", "floor_type", "orientation", "land_delivery", "land_status"]);

export function PropertyConflictDetails({ property }: { property: Property }) {
  return <details className="min-w-0 border-y py-2">
    <summary className="flex min-h-control cursor-pointer items-center font-medium text-link">Comparer les caractéristiques actuelles</summary>
    <dl className="grid min-w-0 gap-3 py-3 text-sm sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Pièces</dt><dd>{property.rooms ?? "Non renseigné"}</dd></div>
      {Object.entries(labels).map(([key, label]) => {
        const value = property.listing_details[key as keyof typeof labels];
        const text = Array.isArray(value) ? value.map(option => amenityLabels[option]).join(", ") : value === null || value === undefined ? "" : choiceFields.has(key) ? choices[String(value)] ?? String(value) : String(value);
        return <div key={key} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{text || "Non renseigné"}</dd></div>;
      })}
      {property.hierarchy ? <div className="min-w-0"><dt className="text-muted-foreground">Rattachement</dt><dd className="wrap-anywhere">{[property.hierarchy.development.reference, property.hierarchy.block?.label, property.hierarchy.floor?.label, property.hierarchy.unit_type?.label].filter(Boolean).join(" · ")}</dd></div> : null}
    </dl>
  </details>;
}
