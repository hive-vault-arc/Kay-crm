"use client";

import { useCallback, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PagedKanban, type KanbanFilters } from "@/components/shared/paged-kanban";
import { KanbanRecordCard } from "@/components/shared/kanban-record-card";
import { RecordStatusMenu } from "@/components/shared/record-status-menu";
import { kindLabels } from "@/features/inventory/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { currentRecord } from "@/features/realtime/current-record";
import type { StaffRole } from "@/features/contacts/contracts";
import type { ApiError } from "@/lib/api/client";
import { dealsSchema, stageLabels, type Deal } from "./contracts";
import { dealStageGroups, dealStageSelection } from "./deal-stage-policy";
import { DealStageMenu } from "./deal-stage-menu";
import { useDealCommand } from "./use-deal-command";

const periodLabels = { day: "par jour", week: "par semaine", month: "par mois", year: "par an" } as const;
const writable = (deal: Deal) => !deal.archived_at && !deal.contact.archived_at;
export function DealKanban({ filters, revision = 0, changed, denied, returnFocus, active = true, actorId, role }: {
  filters: KanbanFilters; actorId?: string; role?: StaffRole; revision?: number; active?: boolean; changed: () => void; denied: (error: ApiError) => void; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const [ownRevision, setRevision] = useState(0), [moving, setMoving] = useState<{ deal: Deal; target: string }>(), [notice, setNotice] = useState("");
  const saved = useCallback(() => { setRevision(value => value + 1); setNotice("Opération enregistrée."); changed(); }, [changed]);
  return <>{notice ? <p role="status" className="text-sm text-muted-foreground">{notice}</p> : null}{active ? <PagedKanban key={JSON.stringify(filters)} kind="deals" denied={denied} stages={stageLabels} filters={filters} schema={dealsSchema} revision={revision + ownRevision} movable={writable} move={(deal, target) => { if (deal.stage === target && target !== "reserved") return; if (!dealStageSelection(deal, target)) { setNotice("Ce déplacement n’est pas disponible. Rouvrez une affaire clôturée avant une nouvelle réservation ou clôture ; une offre liée est nécessaire pour réserver ou gagner."); return; } setNotice(""); setMoving({ deal, target }); }} card={deal => <KanbanRecordCard title={deal.contact.name} href={"/deals/" + deal.id} phone={deal.contact.primary_phone} budget={deal.initial_budget} agent={deal.contact.primary_agent.display_name} projects={deal.projects.map(project => project.name).join(" · ") || "Non renseignés"} offer={deal.offering ? kindLabels[deal.offering.kind] + (deal.offering.price_period ? " · " + periodLabels[deal.offering.price_period] : "") : undefined} movable={writable(deal)} action={writable(deal) ? <RecordStatusMenu iconTrigger value={deal.stage} label={stageLabels[deal.stage]} prefix="Étape" kind="deal" groups={dealStageGroups(deal)} choose={target => { if (dealStageSelection(deal, target)) setMoving({ deal, target }); }} /> : undefined} />} /> : null}{moving ? <DealBoardAction key={`${moving.deal.id}:${moving.target}:${actorId ?? ""}:${role ?? ""}`} actorId={actorId} role={role} deal={moving.deal} target={moving.target} changed={saved} denied={denied} closed={() => setMoving(undefined)} returnFocus={returnFocus} /> : null}</>;
}

function DealBoardAction({ deal: remote, target, changed, denied, closed, returnFocus, actorId, role }: { deal: Deal; actorId?: string; role?: StaffRole; target: string; changed: () => void; denied: (error: ApiError) => void; closed?: () => void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const command = useDealCommand(remote.id, undefined, { actorId, role, completed: () => changed(), denied });
  const deal = currentRecord(remote, command.fresh, remote.id)!;
  const forbidden = command.error && [401, 403, 404].includes(command.error.status);
  async function saved() { const current = await command.reload(); changed(); return current; }
  if (forbidden) return <AlertDialog open onOpenChange={open => { if (!open) closed?.(); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}><AlertDialogTitle>Action indisponible</AlertDialogTitle><AlertDialogDescription>Vérifiez vos droits et l’état actuel du dossier.</AlertDialogDescription><RecordError error={command.error!} /><AlertDialogCancel asChild><Button action="close" variant="outline">Fermer</Button></AlertDialogCancel></AlertDialogContent></AlertDialog>;
  return <DealStageMenu deal={deal} writable={writable(deal)} busy={command.busy} busyChanged={command.setBusy} mutate={command.mutate} recovery={command} saved={saved} error={command.error} dialogOnly initialAction={target} closed={closed} returnFocus={returnFocus} />;
}
