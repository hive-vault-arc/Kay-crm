"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PagedKanban, type KanbanFilters } from "@/components/shared/paged-kanban";
import { KanbanRecordCard } from "@/components/shared/kanban-record-card";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { ActivityForm } from "@/features/activities/activity-form";
import { ConvertLead } from "@/features/deals/convert-lead";
import type { ApiError } from "@/lib/api/client";
import { enquiriesSchema, enquirySchema, statusLabels, statusSchema, type Enquiry, type LeadSummary } from "./contracts";
import { ratingLabels } from "./qualification-contracts";
import { useQuery } from "./use-query";
import { RecordError } from "./record-states";
import { LeadStatusMenu } from "./lead-status-menu";

export const leadBoardWritable = (row: LeadSummary) => !row.archived_at && !row.contact.archived_at;
export function LeadKanban({ filters, revision = 0, changed, denied, returnFocus, active = true }: {
  filters: KanbanFilters; revision?: number; active?: boolean; changed: () => void; denied: (error: ApiError) => void; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const [ownRevision, setRevision] = useState(0), [moving, setMoving] = useState<{ id: string; target: string }>(), [activity, setActivity] = useState<{ id: string; name: string }>();
  const saved = useCallback(() => { setRevision(value => value + 1); changed(); }, [changed]);
  return <>{active ? <PagedKanban key={JSON.stringify(filters)} kind="leads" denied={denied} stages={statusLabels} filters={filters} schema={enquiriesSchema} revision={revision + ownRevision} movable={row => leadBoardWritable(row) && row.status !== "converted"} move={(row, target) => { if (leadBoardWritable(row) && row.status !== "converted" && row.status !== target && statusSchema.safeParse(target).success) setMoving({ id: row.id, target }); }} card={row => <KanbanRecordCard title={row.contact.name} href={"/leads/" + row.id} phone={row.contact.primary_phone} budget={row.initial_budget} agent={row.assigned_agent?.display_name ?? "File du responsable"} movable={leadBoardWritable(row) && row.status !== "converted"} rating={<CrmStatusBadge state={row.rating} dot={false}>{ratingLabels[row.rating]}</CrmStatusBadge>} action={leadBoardWritable(row) ? <Button action="activity" type="button" variant="quiet" size="icon" aria-label={"Consigner un échange · " + row.contact.name} onClick={() => setActivity({ id: row.id, name: row.contact.name })}><span className="sr-only">Consigner un échange</span></Button> : undefined} />} /> : null}{activity ? <RecordDrawer key={activity.id} hideTrigger initialOpen label="Consigner un échange" title={"Échange · " + activity.name} description="Conserver une note ou un échange avec son auteur et sa date." onClosed={() => setActivity(undefined)} returnFocus={returnFocus}>{(close, done) => <ActivityForm path={`/api/v1/enquiries/${activity.id}/activities`} cancel={close} denied={denied} saved={() => { saved(); done(); }} />}</RecordDrawer> : null}{moving ? <LeadBoardMove key={moving.id + ":" + moving.target} id={moving.id} target={moving.target} saved={saved} denied={denied} close={() => setMoving(undefined)} returnFocus={returnFocus} /> : null}</>;
}

function LeadBoardMove({ id, target, saved, denied, close, returnFocus }: { id: string; target: string; saved: () => void; denied: (error: ApiError) => void; close: () => void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const query = useQuery(`/api/v1/enquiries/${id}`, enquirySchema);
  const [reviewed, setReviewed] = useState<Enquiry>();
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  const writable = query.value && !query.value.archived_at && !query.value.contact.archived_at && query.value.status !== "converted";
  const review = reviewed ?? (query.value && writable && query.value.status !== target ? query.value : undefined);
  if (!reviewed && review) setReviewed(review);
  if (review && !(query.error && [401, 403, 404].includes(query.error.status))) return target === "converted" ? <ConvertLead dialogOnly enquiry={query.value ?? review} unavailable={Boolean(query.error || !query.value)} onRefresh={query.refresh} denied={denied} closed={close} returnFocus={returnFocus} /> : <LeadStatusMenu dialogOnly initialStatus={target} enquiry={review} writable denied={denied} changed={success => { if (success) saved(); else { query.refresh(); close(); } }} closed={close} returnFocus={returnFocus} />;
  return <AlertDialog open onOpenChange={open => { if (!open) close(); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><AlertDialogTitle>Vérifier le déplacement</AlertDialogTitle><AlertDialogDescription>{query.value ? writable ? "Ce prospect est déjà dans le statut demandé." : "Ce dossier est désormais en lecture seule. Aucun changement n’a été enregistré." : "Chargement du dossier actuel avant confirmation."}</AlertDialogDescription>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement…</p> : <Button action="show" variant="outline" asChild><Link href={"/leads/" + id}>Ouvrir le prospect</Link></Button>}<AlertDialogCancel asChild><Button action="close" variant="outline">Fermer</Button></AlertDialogCancel></AlertDialogContent></AlertDialog>;
}
