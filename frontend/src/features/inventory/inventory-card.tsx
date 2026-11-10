import Link from "next/link";
import type { ReactNode } from "react";
import { ForwardIcon, LocationIcon } from "@/components/icons";
import { InventoryThumbnail } from "@/features/files/inventory-thumbnail";
import { Badge } from "@/components/ui/badge";
import { categoryLabels, kindLabels, type Offering } from "./contracts";
import { InventoryStatus, Price } from "./states";

export function InventoryCard({ reference, name, location, category, href, offerings, units, area, rooms, tag }: {
  reference: string; name: string | null; location: string | null; category: keyof typeof categoryLabels | "mixed";
  href: string; offerings: Offering[]; units?: { total: number; available: number }; area?: string | null; rooms?: number | null;
  tag?: ReactNode;
}) {
  const title = name || reference;
  return <article className="kay-project-card"><Link className="kay-project-open" href={href} prefetch={false} aria-label={title === reference ? title : `${title} · ${reference}`}>
    <div className="kay-project-media"><InventoryThumbnail kind={units ? "development" : "property"} id={href.split("/").at(-1)!} /></div>
    <div className="kay-project-body">
      <div className="kay-project-head">
        <div className="kay-project-category">{tag ?? <Badge variant="neutral">{category === "mixed" ? "Mixte" : categoryLabels[category]}</Badge>}</div>
        <h2 title={title}>{title}</h2><ForwardIcon size={16} aria-hidden="true" />
      </div>
      <div className="kay-project-location">
        <span title={location ?? undefined}><LocationIcon size={16} aria-hidden="true" /><span>{location || "Localisation non renseignée"}</span></span>
        {area || rooms ? <span className="kay-project-facts">{area ? `${area.replace(".", ",")} m²` : ""}{area && rooms ? " · " : ""}{rooms ? `${rooms} pièce${rooms === 1 ? "" : "s"}` : ""}</span> : null}
      </div>
      {units ? <><div className="kay-project-counts"><span>{units.total} unités</span><span>{units.available} disponibles</span></div><progress className="kay-stock-progress" value={units.available} max={units.total || 1} aria-label={`Unités disponibles : ${units.available} sur ${units.total}`} /></> : null}
      {offerings.length ? <ul className="kay-project-offers">{offerings.map(offer => <li key={offer.id}>
        <span>{kindLabels[offer.kind]}</span><div className="kay-project-price"><Price offering={offer} compact /></div>
        <InventoryStatus state={offer.state} occupied={offer.occupied} conflict={offer.reservation_conflict} compact />
      </li>)}</ul> : !units ? <p className="kay-project-no-offer">Aucune offre renseignée</p> : null}
      <span className="kay-project-card-footer">Ouvrir la fiche <ForwardIcon size={16} aria-hidden="true" /></span>
    </div>
  </Link></article>;
}
