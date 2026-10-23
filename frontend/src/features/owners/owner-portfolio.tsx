"use client";

import Link from "next/link";
import { useState } from "react";
import { PropertyIcon, DevelopmentIcon } from "@/components/icons";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatInstant } from "@/lib/format";
import { ownerPortfolioSchema, type OwnerAsset } from "./contracts";
import { OwnerLoading } from "./owner-loading";

function targetPath(asset: OwnerAsset) {
  return asset.kind === "property" ? `/projects/properties/${asset.id}` : `/projects/${asset.id}`;
}

export function OwnerPortfolio({ id, status }: { id: string; status: "current" | "past" }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`contacts/${id}/portfolio`, { status, page, page_size: 20 }), ownerPortfolioSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <OwnerLoading label="Chargement des biens liés" />;
  const { items, total, page_size } = query.value;
  return <section className="grid min-w-0 gap-4"><p role="status">{total} {status === "current" ? "lien(s) de propriété actuel(s)" : "ancien(s) lien(s) de propriété"}.</p>
    {items.length ? <ul className="grid min-w-0 gap-3">{items.map(asset => <li key={asset.link_id} className="surface grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"><div className="grid min-w-0 gap-2"><div className="flex min-w-0 items-center gap-2">{asset.kind === "property" ? <PropertyIcon aria-hidden="true" className="size-5 shrink-0 text-link" /> : <DevelopmentIcon aria-hidden="true" className="size-5 shrink-0 text-link" />}<Link href={targetPath(asset)} className="inline-flex min-h-control items-center font-medium text-link underline wrap-anywhere">{asset.name || asset.reference}</Link></div><p className="text-sm text-muted-foreground wrap-anywhere">{asset.kind === "property" ? "Bien" : "Programme"} · {asset.reference} · {asset.category}{asset.location ? ` · ${asset.location}` : ""}</p><p className="text-sm">Lié le {formatInstant(asset.linked_at)}{asset.unlinked_at ? ` · Retiré le ${formatInstant(asset.unlinked_at)}` : ""}{asset.asset_archived_at ? " · Dossier archivé" : ""}</p></div><Link href={`${targetPath(asset)}?tab=history`} className="inline-flex min-h-control items-center text-link underline">Voir l’historique du {asset.kind === "property" ? "bien" : "programme"}</Link></li>)}</ul> : <p>{status === "current" ? "Aucun bien ni programme actuellement lié. L’ajout d’un propriétaire légal se fait depuis la fiche du bien ou du programme par un responsable." : "Aucun ancien lien de propriété."}</p>}
    <NumberedPages page={page} total={total} size={page_size} change={setPage} label={status === "current" ? "Pages des biens actuels" : "Pages des anciens biens"} />
  </section>;
}
