"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DevelopmentIcon, ForwardIcon, PropertyIcon } from "@/components/icons";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { categoryLabels } from "@/features/inventory/contracts";
import { formatInstant } from "@/lib/format";
import type { ApiError } from "@/lib/api/client";
import { ownerPortfolioSchema } from "./contracts";
import { ownerAssetHref } from "./owner-directory-model";
import { OwnerLoading } from "./owner-loading";

export function OwnerPortfolio({ id, status, compact = false, denied }: { id: string; status: "current" | "past"; compact?: boolean; denied?: (error: ApiError) => void }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`contacts/${id}/portfolio`, { status, page, page_size: 20 }), ownerPortfolioSchema);
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) denied?.(query.error); }, [query.error, denied]);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <OwnerLoading label="Chargement des biens liés" />;
  const { items, total, page_size } = query.value;
  return <section className="grid min-w-0 gap-3" data-compact={compact || undefined}>
    {total ? <p role="status" className="text-xs text-muted-foreground">{total} {total > 1 ? "liens de propriété" : "lien de propriété"} {status === "current" ? total > 1 ? "actuels" : "actuel" : total > 1 ? "anciens" : "ancien"}</p> : null}
    {items.length ? <ul className="kay-owner-asset-list" aria-label={status === "current" ? "Biens actuels" : "Anciens biens"}>{items.map(asset => <li key={asset.link_id} className="kay-owner-asset">
      <Link prefetch={false} href={ownerAssetHref(asset)} className="kay-owner-asset-link">{asset.kind === "development" ? <DevelopmentIcon size={20} aria-hidden="true" /> : <PropertyIcon size={20} aria-hidden="true" />}<span><strong>{asset.name || asset.reference}</strong><small>{asset.reference} · {asset.kind === "development" ? "Programme" : categoryLabels[asset.category as keyof typeof categoryLabels] ?? asset.category}</small></span><ForwardIcon size={16} aria-hidden="true" /></Link>
      <div className="kay-owner-asset-status"><CrmStatusBadge state={asset.asset_archived_at ? "archived" : "active"}>{asset.asset_archived_at ? "Archivé" : "Actif"}</CrmStatusBadge><span>{asset.location || "Localisation non renseignée"}</span></div>
      <dl className="kay-owner-asset-dates"><div><dt>Lié le</dt><dd><time dateTime={asset.linked_at}>{formatInstant(asset.linked_at)}</time></dd></div>{asset.unlinked_at ? <div><dt>Retiré le</dt><dd><time dateTime={asset.unlinked_at}>{formatInstant(asset.unlinked_at)}</time></dd></div> : null}</dl>
    </li>)}</ul> : <div className="kay-party-section-empty"><PropertyIcon aria-hidden="true" size={18} /><div><p>{status === "current" ? "Aucun bien lié." : "Aucun ancien lien de propriété."}</p><p>{status === "current" ? "Les liens de propriété se gèrent depuis la fiche d’un bien ou d’un programme." : "Les anciens liens restent consultables ici."}</p></div></div>}
    {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={total} size={page_size} change={setPage} label={status === "current" ? "Pages des biens actuels" : "Pages des anciens biens"} /> : null}
  </section>;
}
