import Link from "next/link";
import { LocationIcon } from "@/components/icons";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categoryLabels, kindLabels, type Offering } from "./contracts";
import { InventoryStatus, Price } from "./states";

export function InventoryCard({ reference, name, location, category, href, offerings, units }: {
  reference: string; name: string | null; location: string | null; category: keyof typeof categoryLabels | "mixed";
  href: string; offerings: Offering[]; units?: { total: number; available: number };
}) {
  return <article className="grid min-w-0 content-start overflow-hidden rounded-md border bg-card">
    <InventoryThumbnail kind={units ? "development" : "property"} id={href.split("/").at(-1)!} />
    <div className="grid min-w-0 gap-3 p-4">
      <Badge className="justify-self-start">{category === "mixed" ? "Mixte" : categoryLabels[category]}</Badge>
      <h2 className="min-w-0 font-semibold wrap-anywhere"><Link className="inline-flex min-h-control items-center text-foreground underline-offset-4 hover:underline" href={href}>{reference}</Link></h2>
      <p className="wrap-anywhere">{name || "Nom non renseigné"}</p>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><LocationIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span className="wrap-anywhere">{location || "Localisation inconnue"}</span></p>
      {units ? <Link className="inline-flex min-h-control items-center text-link underline" href={`${href}?tab=units`}>{units.available} disponibles / {units.total} unités</Link> : null}
      <div className="grid min-w-0 gap-3 border-t pt-3">{(["sale", "rental"] as const).map(kind => {
        const offering = offerings.find(value => value.kind === kind);
        return <section key={kind} className="grid min-w-0 gap-1"><h3 className="text-xs font-medium text-muted-foreground">{kindLabels[kind]}{units ? " du programme entier" : ""}</h3>{offering ? <><InventoryStatus state={offering.state} occupied={offering.occupied} conflict={offering.reservation_conflict} /><Price offering={offering} /></> : <p className="text-xs text-muted-foreground">Aucune campagne actuelle</p>}</section>;
      })}</div>
      <Button action="preview" variant="outline" asChild><Link href={href}>Ouvrir la fiche</Link></Button>
    </div>
  </article>;
}
