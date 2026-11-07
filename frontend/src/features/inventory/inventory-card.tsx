import Link from "next/link";
import type { ReactNode } from "react";
import { ForwardIcon, LocationIcon } from "@/components/icons";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { Badge } from "@/components/ui/badge";
import { categoryLabels, kindLabels, type Offering } from "./contracts";
import { InventoryStatus, Price } from "./states";

export function InventoryCard({ reference, name, location, category, href, offerings, units, area, tag }: {
  reference: string; name: string | null; location: string | null; category: keyof typeof categoryLabels | "mixed";
  href: string; offerings: Offering[]; units?: { total: number; available: number }; area?: string | null;
  tag?: ReactNode;
}) {
  const title = name || reference;
  return <article className="kay-project-card"><Link className="kay-project-open" href={href} aria-label={`${title} · ${reference}`}>
    <div className="kay-project-media"><InventoryThumbnail kind={units ? "development" : "property"} id={href.split("/").at(-1)!} /></div>
    <div className="kay-project-body"><div className="kay-project-head"><h2 title={title}>{title}</h2><ForwardIcon size={16} aria-hidden="true" /></div>
      <div className="kay-project-location"><span><LocationIcon size={12} aria-hidden="true" />{location || "Localisation à renseigner"}</span><span>{reference}</span></div>
      <div className="kay-project-category">{tag ?? <Badge variant="neutral">{category === "mixed" ? "Mixte" : categoryLabels[category]}</Badge>}{area ? <span>{area} m²</span> : null}</div>
      {units ? <><div className="kay-project-counts"><span>{units.total} unités</span><strong>{units.available} disponibles</strong></div><progress className="kay-stock-progress" value={units.available} max={units.total || 1} aria-label={`Unités disponibles : ${units.available} sur ${units.total}`} /></> : null}
      {offerings.length ? <ul className="kay-project-offers">{offerings.map(offer => <li key={offer.id}><span>{kindLabels[offer.kind]}</span><Price offering={offer} compact /><InventoryStatus state={offer.state} occupied={offer.occupied} conflict={offer.reservation_conflict} compact /></li>)}</ul> : <p className="kay-project-no-offer">Aucune offre renseignée</p>}
    </div>
  </Link></article>;
}
