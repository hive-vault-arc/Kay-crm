import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { FinanceIcon, ForwardIcon, LocationIcon, PasswordIcon } from "@/components/icons";
import { DataTable } from "@/components/shared/data-table";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { categoryLabels, kindLabels, type Offering, type PropertySummary } from "./contracts";
import { InventoryStatus, Price } from "./states";

export function PropertyCampaign({ kind, offerings }: { kind: "sale" | "rental"; offerings: Offering[] }) {
  const offering = offerings.find(value => value.kind === kind);
  const Icon = kind === "sale" ? FinanceIcon : PasswordIcon;
  return <section aria-label={kindLabels[kind]} className="project-campaign flex min-w-0 items-start gap-3">
    <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
    <div className="grid min-w-0 gap-1"><h3 className="font-sans text-xs font-medium">{kindLabels[kind]}</h3>
      {offering ? <><InventoryStatus state={offering.state} occupied={offering.occupied} conflict={offering.reservation_conflict} /><Price offering={offering} /></> : <p className="text-xs text-muted-foreground">Aucune</p>}
    </div>
  </section>;
}
export function PropertyCard({ property }: { property: PropertySummary }) {
  const href = `/projects/properties/${property.id}`, name = property.marketing_name || property.reference;
  return <article className="project-card overflow-hidden rounded-md border bg-card" data-property-category={property.category}>
    <div className="project-card-media relative"><InventoryThumbnail kind="property" id={property.id} /><span className="project-category" data-property-category={property.category}><span aria-hidden="true" className="project-category-dot" />{categoryLabels[property.category]}</span></div>
    <div className="project-card-content grid min-w-0 gap-1 p-3">
      <h2 className="font-sans text-base leading-snug font-semibold wrap-anywhere" title={property.reference}>{name}</h2>
      <p className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground"><LocationIcon aria-hidden="true" className="size-4 shrink-0" /><span className="wrap-anywhere">{property.location || "Localisation non renseignée"}</span></p>
      <div className="grid min-w-0 gap-2 pt-1"><h3 className="font-sans text-xs font-semibold">Campagnes actuelles</h3><div className="grid min-w-0 grid-cols-2 gap-3">{(["sale", "rental"] as const).map(kind => <PropertyCampaign key={kind} kind={kind} offerings={property.offerings} />)}</div></div>
      <Link className="project-card-link inline-flex min-h-control items-center gap-3 justify-self-start text-sm font-semibold text-link hover:underline" href={href} aria-label={`Ouvrir la fiche ${name} (${property.reference})`}>Ouvrir la fiche<ForwardIcon aria-hidden="true" className="size-4" /></Link>
    </div>
  </article>;
}
const columns: ColumnDef<PropertySummary>[] = [
  { id: "name", header: "Bien", cell: ({ row: { original: item } }) => <div className="flex min-w-0 items-center gap-3"><InventoryThumbnail kind="property" id={item.id} compact /><div className="grid min-w-0 gap-1"><Link className="inline-flex min-h-control items-center font-semibold text-link underline" href={`/projects/properties/${item.id}`}>{item.marketing_name || item.reference}</Link><span className="text-xs text-muted-foreground">{item.reference}</span></div></div> },
  { id: "category", header: "Catégorie", cell: ({ row }) => categoryLabels[row.original.category] },
  { id: "location", header: "Localisation", cell: ({ row }) => row.original.location || "Non renseignée" },
  { id: "sale", header: "Vente", cell: ({ row }) => <PropertyCampaign kind="sale" offerings={row.original.offerings} /> },
  { id: "rental", header: "Location", cell: ({ row }) => <PropertyCampaign kind="rental" offerings={row.original.offerings} /> },
];
export function PropertyList({ properties }: { properties: PropertySummary[] }) {
  return <DataTable columns={columns} rows={properties} caption="Biens indépendants" scrollLabel="Liste des biens indépendants, défilement horizontal" emptyLabel="Aucun bien sur cette page." footerCaption />;
}
