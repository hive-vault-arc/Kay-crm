"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordStatusMenu } from "@/components/shared/record-status-menu";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { dealSchema, ordinaryStages, stageLabels, transitionSchema, type Deal } from "./contracts";
import type { MutateDeal } from "./pipeline";
import { ReservationPanel } from "./reservation-panel";
import { OutcomePanel } from "./outcome-panel";

import { dealStageGroups, dealStageSelection, type DealStageSelection } from "./deal-stage-policy";
export function DealStageMenu({ deal, writable, busy, busyChanged, mutate, saved, error, iconTrigger = false, dialogOnly = false, initialAction, closed, returnFocus }: {
  deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; mutate: MutateDeal; saved: () => Promise<unknown>; error?: ApiError; iconTrigger?: boolean; dialogOnly?: boolean; initialAction?: string; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const [selection, setSelection] = useState<DealStageSelection | undefined>(() => initialAction ? dealStageSelection(deal, initialAction) : undefined);
  const queued = useRef<DealStageSelection | undefined>(undefined);
  const [reason, setReason] = useState(""), [invalid, setInvalid] = useState("");
  const trigger = useRef<HTMLButtonElement>(null), control = useId(), hydrated = useHydrated();
  const transitioning = selection && ordinaryStages.some(stage => stage === selection.id);
  const closing = selection && ["won", "lost", "cancelled", "reopen"].includes(selection.id);
  if (!writable) return <CrmStatusBadge kind="deal" state={deal.stage}>{stageLabels[deal.stage]}</CrmStatusBadge>;
  const groups = dealStageGroups(deal);
  function finishSelection() {
    const next = queued.current; queued.current = undefined;
    setSelection(next);
    if (!next) closed?.();
  }
  async function savedStep() {
    const current = await saved();
    const parsed = dealSchema.safeParse(current);
    if (selection?.nextStage && parsed.success && parsed.data.stage !== selection.nextStage) queued.current = dealStageSelection(parsed.data, selection.nextStage);
    return current;
  }
  async function transition(event: React.FormEvent) {
    event.preventDefault(); if (!selection || busy) return;
    const command = transitionSchema.safeParse({ expected_version: selection.reviewed.version, stage: selection.id, reason });
    if (!command.success) { setInvalid("Renseignez le motif du changement."); return; }
    setInvalid("");
    if (await mutate(`/api/v1/deals/${selection.reviewed.id}/transition`, command.data)) finishSelection();
  }
  return <>{!dialogOnly ? <RecordStatusMenu iconTrigger={iconTrigger} triggerRef={trigger} value={deal.stage} label={stageLabels[deal.stage]} prefix="Étape" kind="deal" groups={groups} disabled={!hydrated || busy} choose={id => { setSelection(dealStageSelection(deal, id)); setReason(""); setInvalid(""); }} /> : null}
    <AlertDialog open={Boolean(transitioning)} onOpenChange={open => { if (!open && !busy) { queued.current = undefined; finishSelection(); } }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); (returnFocus ?? trigger).current?.focus(); }}><AlertDialogTitle>Changer l’étape de l’affaire</AlertDialogTitle><AlertDialogDescription>{deal.title} · {selection ? `${stageLabels[selection.reviewed.stage]} → ${stageLabels[selection.id as keyof typeof stageLabels]}` : ""}. Ce changement ne réserve aucun stock et ne clôture pas l’affaire.</AlertDialogDescription><form className="grid gap-4" aria-busy={busy} onSubmit={event => void transition(event)}><fieldset className="grid gap-4" disabled={busy}><div className="grid gap-2"><Label htmlFor={control}>Motif</Label><Input id={control} required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></div>{invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}{error ? <RecordError error={error} /> : null}<div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit">{busy ? "Enregistrement…" : "Confirmer l’étape"}</Button></div></fieldset></form></AlertDialogContent></AlertDialog>
    {selection?.id === "reserved" ? <ReservationPanel key={`reservation:${selection.reviewed.version}`} dialogOnly deal={selection.reviewed} writable={writable} busy={busy} busyChanged={busyChanged} saved={savedStep} closed={finishSelection} nextStageLabel={selection.nextStage ? stageLabels[selection.nextStage as keyof typeof stageLabels] : undefined} returnFocus={returnFocus ?? trigger} /> : null}
    {closing && selection ? <OutcomePanel key={`outcome:${selection.id}:${selection.reviewed.version}`} dialogOnly deal={selection.reviewed} writable={writable} busy={busy} busyChanged={busyChanged} saved={savedStep} initialOutcome={selection.id === "reopen" ? undefined : selection.id as "won" | "lost" | "cancelled"} closed={finishSelection} returnFocus={returnFocus ?? trigger} /> : null}
  </>;
}
