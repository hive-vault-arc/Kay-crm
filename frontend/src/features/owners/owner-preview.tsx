"use client";
import Link from "next/link";
import { useEffect, type RefObject } from "react";
import { DevelopmentIcon, ForwardIcon, PropertyIcon } from "@/components/icons";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { InlineEditScope } from "@/components/shared/inline-record-field";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import type { ApiError } from "@/lib/api/client";
import type { StaffRole } from "@/features/contacts/contracts";
import { ownerPortfolioPreviewSchema } from "./contracts";
import { OwnerDetails } from "./owner-details";
import { ownerAssetHref } from "./owner-directory-model";
import { OwnerLoading } from "./owner-loading";
import { useOwnerContact } from "./use-owner-contact";

export function OwnerPreviewDrawer({ id, actorId, role, onClosed, onChanged, onDenied, returnFocus, fallbackFocus }: {
  id: string; onClosed: () => void; onChanged: () => void; onDenied: () => void; returnFocus: RefObject<HTMLElement | null>; fallbackFocus: RefObject<HTMLElement | null>;
  actorId?: string; role?: StaffRole;
}) {
  const owner = useOwnerContact(id, onChanged, onDenied), contact = owner.contact;
  return <RecordDrawer className="kay-party-drawer" label="Aperçu du propriétaire" title={contact?.name ?? "Fiche propriétaire"} description="Coordonnées du contact et biens actuels accessibles." initialOpen hideTrigger onClosed={onClosed} returnFocus={returnFocus} fallbackFocus={fallbackFocus}>
    {owner.error ? <RecordError error={owner.error} retry={owner.retry} /> : !contact ? <OwnerLoading label="Chargement du propriétaire" /> : <InlineEditScope>
      <div className="kay-owner-preview">
        <div className="flex flex-wrap items-center gap-2"><CrmStatusBadge state={contact.archived_at ? "archived" : "active"}>{contact.archived_at ? "Archivé" : "Actif"}</CrmStatusBadge><Button action="contact" asChild variant="outline"><Link prefetch={false} href={`/contacts/${contact.id}`}>Fiche du contact</Link></Button></div>
        {contact.id !== id ? <p className="text-sm text-muted-foreground">Cette fiche a été fusionnée. Les coordonnées de la fiche conservée sont affichées.</p> : null}
        {owner.notice ? <p role="status" className="text-sm text-success">{owner.notice}</p> : null}
        <div><OwnerDetails actorId={actorId} role={role} contact={contact} compact saved={owner.saved} denied={owner.denied} /><OwnerPortfolioPreview id={contact.id} denied={owner.denied} /></div>
        <div className="kay-form-footer"><Button action="show" asChild variant="outline"><Link prefetch={false} href={`/owners/${contact.id}`}>Ouvrir la fiche complète</Link></Button></div>
      </div>
    </InlineEditScope>}
  </RecordDrawer>;
}

export function OwnerPortfolioPreview({ id, denied }: { id: string; denied: (error: ApiError) => void }) {
  const result = useQuery(queryPath(`contacts/${id}/portfolio`, { status: "current", page: 1, page_size: 3 }), ownerPortfolioPreviewSchema);
  useEffect(() => { if (result.error && [401, 403, 404].includes(result.error.status)) denied(result.error); }, [result.error, denied]);
  return <RecordSection title="Biens actuels" count={!result.error ? result.value?.total : undefined}>
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <OwnerLoading label="Chargement des biens liés…" /> : <>
      {result.value.items.length ? <div className="grid min-w-0 gap-3">{result.value.items.map(asset => <Link key={asset.link_id} prefetch={false} href={ownerAssetHref(asset)} className="kay-support-entry flex min-h-control items-center gap-3 text-sm"><span className="shrink-0 text-muted-foreground">{asset.kind === "development" ? <DevelopmentIcon size={20} aria-hidden="true" /> : <PropertyIcon size={20} aria-hidden="true" />}</span><span className="min-w-0 flex-1"><strong className="block wrap-anywhere font-medium">{asset.name || asset.reference}</strong><small className="mt-1 block wrap-anywhere text-muted-foreground">{asset.location || asset.reference}</small></span><ForwardIcon size={16} aria-hidden="true" /></Link>)}</div> : <div className="kay-party-section-empty"><PropertyIcon aria-hidden="true" size={18} /><p>Aucun bien lié.</p></div>}
      {result.value.total > result.value.items.length ? <p className="text-sm text-muted-foreground">{result.value.total - result.value.items.length} autre{result.value.total - result.value.items.length > 1 ? "s" : ""} bien{result.value.total - result.value.items.length > 1 ? "s" : ""} dans Patrimoine.</p> : null}
    </>}
  </RecordSection>;
}
