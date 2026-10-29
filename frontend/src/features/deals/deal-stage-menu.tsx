"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
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
import type { DealCommandRecovery } from "./deal-command-intent";

import { dealStageGroups, dealStageSelection, type DealStageSelection } from "./deal-stage-policy";
export function DealStageMenu({ deal, writable, busy, busyChanged, mutate, saved, error, recovery, iconTrigger = false, dialogOnly = false, initialAction, closed, returnFocus }: {
  deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; mutate: MutateDeal; saved: () => Promise<unknown>; error?: ApiError; recovery?: DealCommandRecovery; iconTrigger?: boolean; dialogOnly?: boolean; initialAction?: string; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null>;
}) {
  const [selection, setSelection] = useState<DealStageSelection | undefined>(() => initialAction ? dealStageSelection(deal, initialAction) : undefined);
  const queued = useRef<DealStageSelection | undefined>(undefined);
  const alive = useRef(true), submitting = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reported = useRef(false);
  const [reason, setReason] = useState(""), [invalid, setInvalid] = useState("");
  const [reading, setReading] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), control = useId(), hydrated = useHydrated();
  const transitioning = selection && ordinaryStages.some(stage => stage === selection.id);
  const closing = selection && ["won", "lost", "cancelled", "reopen"].includes(selection.id);
  if (!writable && !selection) return <CrmStatusBadge kind="deal" state={deal.stage}>{stageLabels[deal.stage]}</CrmStatusBadge>;
  const groups = dealStageGroups(deal);
  function finishSelection() {
    const next = queued.current; queued.current = undefined;
    setSelection(next);
    if (!next) closed?.();
  }
  function finishTransition() { if (!reported.current && alive.current) { reported.current = true; finishSelection(); } }
  async function savedStep() {
    const current = await saved();
    const parsed = dealSchema.safeParse(current);
    if (selection?.nextStage && parsed.success && parsed.data.stage !== selection.nextStage) queued.current = dealStageSelection(parsed.data, selection.nextStage);
    return current;
  }
  async function transition(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (recovery?.uncertain) { submitting.current = true; try { if (await recovery.retry() && alive.current) finishTransition(); } finally { submitting.current = false; } return; }
    if (!selection || busy || reading || recovery?.locked() || recovery && !recovery.canEdit()) return;
    const command = transitionSchema.safeParse({ expected_version: selection.reviewed.version, stage: selection.id, reason });
    if (!command.success) { setInvalid("Renseignez le motif du changement."); return; }
    setInvalid("");
    submitting.current = true; reported.current = false;
    try { if (await mutate(`/api/v1/deals/${selection.reviewed.id}/transition`, command.data, "POST", { dealId: selection.reviewed.id, completed: () => finishTransition() }) && alive.current) finishTransition(); }
    finally { submitting.current = false; }
  }
  async function refreshReview() {
    if (!recovery || reading || recovery.locked()) return;
    setReading(true);
    try { const current = await recovery.inspect(); if (!alive.current || !recovery.active() || !recovery.accept(current)) return; const next = selection && current.stage !== selection.id ? dealStageSelection(current, selection.id) : undefined; setSelection(next); if (!next) closed?.(); setInvalid(""); }
    catch { /* The command owner presents current authorization/transport errors. */ }
    finally { if (alive.current && recovery.active()) setReading(false); }
  }
  return <>{!dialogOnly ? <RecordStatusMenu iconTrigger={iconTrigger} triggerRef={trigger} value={deal.stage} label={stageLabels[deal.stage]} prefix="Étape" kind="deal" groups={groups} disabled={!hydrated || busy || recovery?.protected || Boolean(selection)} choose={id => { if (!writable || busy || recovery?.locked() || id === deal.stage && id !== "reserved") return; reported.current = false; setSelection(dealStageSelection(deal, id)); setReason(""); setInvalid(""); }} /> : null}
    <AlertDialog open={Boolean(transitioning)} onOpenChange={open => { if (!open && !busy && !reading && !submitting.current && !recovery?.locked()) { queued.current = undefined; finishSelection(); } }}><AlertDialogContent onEscapeKeyDown={event => { if (busy || reading || submitting.current || recovery?.locked()) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); (returnFocus ?? trigger).current?.focus(); }}><AlertDialogTitle>Changer l’étape de l’affaire</AlertDialogTitle><AlertDialogDescription>{selection?.reviewed.title ?? deal.title} · {selection ? `${stageLabels[selection.reviewed.stage]} → ${stageLabels[selection.id as keyof typeof stageLabels]}` : ""}. Ce changement ne réserve aucun stock et ne clôture pas l’affaire.</AlertDialogDescription><form className="grid gap-4" data-draft-managed data-live-dirty={Boolean(transitioning) || undefined} data-write-recovery={recovery?.uncertain || undefined} aria-busy={busy || reading || recovery?.uncertain} onSubmit={event => void transition(event)}><fieldset className="grid gap-4" disabled={busy || reading || recovery?.uncertain || recovery?.needsReview}><div className="grid gap-2"><Label htmlFor={control}>Motif</Label><Input id={control} required maxLength={1000} value={reason} onChange={event => { if (!recovery || recovery.canEdit()) setReason(event.target.value); }} /></div></fieldset>{invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}{error ? <RecordError error={error} /> : null}{recovery?.uncertain ? <p role="status">{recovery.acknowledged ? "L’étape est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez le même changement pour retrouver son résultat."}</p> : null}{recovery?.needsReview ? <Button action="refresh" type="button" variant="outline" disabled={busy || reading} onClick={() => void refreshReview()}>Charger la version actuelle</Button> : null}<div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={busy || reading || recovery?.uncertain}>Annuler</Button></AlertDialogCancel><Button action="confirm" type="submit" disabled={!hydrated || busy || reading || recovery?.needsReview}>{busy || reading ? "Enregistrement…" : recovery?.uncertain ? recovery.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Confirmer l’étape"}</Button></div></form></AlertDialogContent></AlertDialog>
    {selection?.id === "reserved" ? <ReservationPanel key={`reservation:${selection.reviewed.version}`} dialogOnly deal={selection.reviewed} writable={writable} busy={busy} busyChanged={busyChanged} saved={savedStep} closed={finishSelection} nextStageLabel={selection.nextStage ? stageLabels[selection.nextStage as keyof typeof stageLabels] : undefined} returnFocus={returnFocus ?? trigger} /> : null}
    {closing && selection ? <OutcomePanel key={`outcome:${selection.id}:${selection.reviewed.version}`} dialogOnly deal={selection.reviewed} writable={writable} busy={busy} busyChanged={busyChanged} saved={savedStep} initialOutcome={selection.id === "reopen" ? undefined : selection.id as "won" | "lost" | "cancelled"} closed={finishSelection} returnFocus={returnFocus ?? trigger} /> : null}
  </>;
}
