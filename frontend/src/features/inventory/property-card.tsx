import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { FinanceIcon, PasswordIcon } from "@/components/icons";
import { DataTable } from "@/components/shared/data-table";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { categoryLabels, kindLabels, type Offering, type PropertySummary } from "./contracts";
import { InventoryStatus, Price } from "./states";
import { InventoryCard } from "./inventory-card";

export function PropertyCampaign({ kind, offerings }: { kind: Offering["kind"]; offerings: Offering[] }) {
  const offering = offerings.find(value => value.kind === kind);
  const Icon = kind === "sale" ? FinanceIcon : PasswordIcon;
  return <section aria-label={kindLabels[kind]} className="project-campaign flex min-w-0 items-start gap-3">
    <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
    <div className="grid min-w-0 gap-1"><h3 className="font-sans text-xs font-medium">{kindLabels[kind]}</h3>
      {offering ? <><div className="font-semibold"><Price offering={offering} /></div><InventoryStatus state={offering.state} occupied={offering.occupied} conflict={offering.reservation_conflict} /></> : <p className="text-xs text-muted-foreground">Prix non renseigné</p>}
    </div>
  </section>;
}
export function PropertyCard({ property }: { property: PropertySummary }) {
  const href = `/projects/properties/${property.id}`, name = property.marketing_name || property.reference;
  const location = property.location || property.listing_details.city || "Localisation non renseignée";
  return <InventoryCard reference={property.reference} name={name} category={property.category} location={location} href={href} offerings={property.offerings} area={property.area_sqm} rooms={property.rooms} />;
}
const columns: ColumnDef<PropertySummary>[] = [
  { id: "name", header: "Bien", cell: ({ row: { original: item } }) => <div className="flex min-w-0 items-center gap-3"><InventoryThumbnail kind="property" id={item.id} compact /><div className="grid min-w-0 gap-1"><Link className="inline-flex min-h-control items-center font-semibold text-link underline" href={`/projects/properties/${item.id}`}>{item.marketing_name || item.reference}</Link><span className="text-xs text-muted-foreground">{item.reference}</span></div></div> },
  { id: "category", header: "Catégorie", cell: ({ row }) => categoryLabels[row.original.category] },
  { id: "location", header: "Localisation", cell: ({ row }) => row.original.location || row.original.listing_details.city || "Non renseignée" },
  { id: "sale", header: "Vente", cell: ({ row }) => <PropertyCampaign kind="sale" offerings={row.original.offerings} /> },
  { id: "rental", header: "Location", cell: ({ row }) => <PropertyCampaign kind="rental" offerings={row.original.offerings} /> },
  { id: "holiday", header: "Vacances", cell: ({ row }) => row.original.offerings.some(item => item.kind === "holiday") ? <PropertyCampaign kind="holiday" offerings={row.original.offerings} /> : "—" },
];
export function PropertyList({ properties }: { properties: PropertySummary[] }) {
  return <DataTable columns={columns} rows={properties} getRowId={property => property.id} caption="Biens indépendants" scrollLabel="Liste des biens indépendants, défilement horizontal" emptyLabel="Aucun bien sur cette page." footerCaption mobileCard={property => <PropertyCard property={property} />} />;
}
