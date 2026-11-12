import type { ListingFacts } from "./contracts";

const categories: Record<ListingFacts["category"], string> = {
  apartment: "Appartement", villa: "Villa", house: "Maison", land: "Terrain", commercial: "Local commercial",
  riad: "Riad", room: "Chambre", office: "Bureau", farm: "Ferme", mixed: "Programme mixte",
};
const periods = { sale: "Prix de vente", month: "Par mois", year: "Par an", night: "Par nuit" };

export function ClientListingFacts({ facts }: { facts: ListingFacts }) {
  const money = facts.price_mad ? new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD" }).format(Number(facts.price_mad)) : null;
  return <div className="grid min-w-0 gap-4">
    <div className="grid gap-1">
      <p className="text-sm text-muted-foreground">{facts.kind === "development" ? "Programme immobilier" : categories[facts.category]}{facts.neighbourhood ? ` · ${facts.neighbourhood}` : ""}</p>
      <h2 className="wrap-anywhere text-2xl font-bold tracking-tight">{facts.title}</h2>
    </div>
    {(facts.area_sqm || facts.rooms || money) && <dl className="flex flex-wrap gap-x-8 gap-y-3 border-y py-3">
      {facts.area_sqm && <div><dt className="text-sm text-muted-foreground">Surface</dt><dd className="font-medium">{new Intl.NumberFormat("fr-MA").format(Number(facts.area_sqm))} m²</dd></div>}
      {facts.rooms && <div><dt className="text-sm text-muted-foreground">Nombre de pièces</dt><dd className="font-medium">{facts.rooms}</dd></div>}
      {money && facts.price_period && <div><dt className="text-sm text-muted-foreground">{periods[facts.price_period]}</dt><dd className="font-semibold">{money}</dd></div>}
    </dl>}
    {facts.description && <p className="whitespace-pre-wrap wrap-anywhere leading-relaxed">{facts.description}</p>}
  </div>;
}
