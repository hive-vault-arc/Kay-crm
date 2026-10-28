import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { categoryLabels, kindLabels } from "./contracts";
import type { DevelopmentSummary } from "./development-contracts";
import { InventoryCard } from "./inventory-card";
import { InventoryStatus, Price } from "./states";

export function DevelopmentCard({ development }: { development: DevelopmentSummary }) {
  return <InventoryCard reference={development.reference} name={development.name} category={development.category} location={development.location} href={`/projects/${development.id}`} offerings={development.offerings} units={{ total: development.unit_count, available: development.available_unit_count }} />;
}

const columns: ColumnDef<DevelopmentSummary>[] = [
  { id: "name", header: "Programme", cell: ({ row: { original: item } }) => <div className="flex min-w-0 items-center gap-3"><InventoryThumbnail kind="development" id={item.id} compact /><div className="grid min-w-0 gap-1"><Link className="inline-flex min-h-control items-center font-semibold text-link underline" href={`/projects/${item.id}`}>{item.name}</Link><span className="text-xs text-muted-foreground">{item.reference} · {item.category === "mixed" ? "Mixte" : categoryLabels[item.category]}</span></div></div> },
  { id: "location", header: "Localisation", cell: ({ row }) => row.original.location || "Localisation non renseignée" },
  { id: "units", header: () => <span className="block text-right">Unités</span>, cell: ({ row: { original: item } }) => <div className="grid gap-1 text-right tabular-nums"><span>{item.unit_count.toLocaleString("fr-MA")} unités</span><span className="text-xs text-muted-foreground">{item.available_unit_count.toLocaleString("fr-MA")} disponibles</span></div> },
  { id: "offerings", header: "Offres du programme", cell: ({ row }) => row.original.offerings.length ? <ul className="grid gap-3">{row.original.offerings.map(offer => <li key={offer.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{kindLabels[offer.kind]}</span><Price offering={offer} compact /><InventoryStatus state={offer.state} occupied={offer.occupied} conflict={offer.reservation_conflict} compact /></li>)}</ul> : <span className="text-sm text-muted-foreground">Aucune offre renseignée</span> },
];

export function DevelopmentList({ developments }: { developments: DevelopmentSummary[] }) {
  return <DataTable columns={columns} rows={developments} getRowId={development => development.id} caption="Programmes immobiliers" scrollLabel="Liste des programmes immobiliers, défilement horizontal" emptyLabel="Aucun programme sur cette page." footerCaption mobileCard={development => <DevelopmentCard development={development} />} />;
}
