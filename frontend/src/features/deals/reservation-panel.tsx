"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { kindLabels, stateLabels } from "@/features/inventory/contracts";
import { targetLabels } from "@/features/requirements/offering-card";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { releaseSchema, reserveSchema, type Deal } from "./contracts";

import type { MutateDeal } from "./pipeline";
import type { DealCommandRecovery } from "./deal-command-intent";
import { useDealStockReview } from "./use-deal-stock-review";

export function ReservationPanel({ deal, writable, busy, saved, mutate, recovery, error, dialogOnly = false, closed, returnFocus, nextStageLabel }: {
  deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; saved: (value: Deal) => Promise<unknown>; mutate?: MutateDeal; recovery?: DealCommandRecovery; error?: ApiError;
  dialogOnly?: boolean; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null>; nextStageLabel?: string;
}) {
  const [opening] = useState(deal), [open, setOpen] = useState(dialogOnly), [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(""), [notice, setNotice] = useState("");
  const reported = useRef(false), submitting = useRef(false), alive = useRef(true);
  const hydrated = useHydrated(), reviewed = useDealStockReview(opening, recovery, false, dialogOnly), review = reviewed.deal;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const releasing = Boolean(opening.active_reservation), action = releasing ? "Libérer la réservation" : "Réserver l’offre", offering = review.offering, target = offering?.target;
  const unavailable = !target || !writable || !recovery || !mutate || !reviewed.ready || Boolean(review.archived_at || review.contact.archived_at) || review.contact.id !== opening.contact.id || ["won", "lost", "cancelled"].includes(review.stage) || offering?.id !== opening.offering?.id || target?.id !== opening.offering?.target?.id || (releasing ? review.active_reservation?.id !== opening.active_reservation?.id : Boolean(review.active_reservation));
  const pending = busy || reviewed.reading, failure = reviewed.error ?? error;
  const canChange = () => alive.current && !submitting.current && !reviewed.locked() && !pending && !unavailable && !reviewed.error && Boolean(recovery?.canEdit());
  async function finish(current: Deal, signal?: AbortSignal) {
    if (!alive.current || signal?.aborted || reported.current) return;
    await saved(current);
    if (!alive.current || signal?.aborted || reported.current) return;
    reported.current = true; setOpen(false); setReason(""); setNotice(releasing ? "Libération enregistrée dans l’historique. L’état actuel du stock est affiché ci-dessus." : "Réservation enregistrée dans l’historique. L’état actuel du stock est affiché ci-dessus."); closed?.();
  }
  async function submit() {
    if (!hydrated || submitting.current || pending || !recovery || !mutate) return;
    if (recovery.uncertain) { submitting.current = true; try { await recovery.retry(); } finally { submitting.current = false; } return; }
    if (!canChange() || !offering || !target) return;
    const fields = { expected_version: review.version, offering_id: offering.id, expected_offering_version: offering.version, expected_target_version: target.version, expected_development_version: target.development_version };
    const parsed = releasing ? releaseSchema.safeParse({ ...fields, reason }) : reserveSchema.safeParse(fields);
    if (!parsed.success) { setInvalid("Indiquez un motif de libération (1 à 1 000 caractères)."); return; }
    submitting.current = true; reported.current = false; setInvalid(""); setNotice("");
    try { await mutate(`/api/v1/deals/${opening.id}/${releasing ? "release-reservation" : "reserve"}`, parsed.data, "POST", { dealId: opening.id, completed: finish }); }
    finally { submitting.current = false; }
  }
  return <section hidden={dialogOnly} className={dialogOnly ? "hidden" : "grid min-w-0 gap-4 border-y py-6"} aria-label="Réservation de l’affaire">
    <h2 className="text-section font-medium">Réservation</h2>
    {deal.active_reservation ? <p>Réservation active depuis le {formatInstant(deal.active_reservation.created_at)}. Aucune expiration automatique.</p> : <p>Aucune réservation active pour cette affaire.</p>}
    {deal.reservation_conflict ? <p role="status" className="text-warning">{deal.reservation_conflict === "DEVELOPMENT_OVERLAP" ? "Une réservation du même type couvre déjà le programme entier ou une de ses unités." : "Cette offre est déjà réservée par une autre affaire."} Faites vérifier le stock par un responsable. Aucun autre dossier privé n’est affiché.</p> : null}
    {!deal.offering ? <p>Liez une offre d’inventaire précise avant de réserver.</p> : !writable && !open ? <p>Réservation en lecture seule.</p> : <AlertDialog open={open} onOpenChange={next => { if (!submitting.current && !reviewed.locked() && !recovery?.locked()) { setOpen(next); if (!next) closed?.(); if (next) { setInvalid(""); void reviewed.refresh(); } } }}>
      {!dialogOnly ? <AlertDialogTrigger asChild><Button action={releasing ? "release" : "reserve"} type="button" className="justify-self-start" variant={releasing ? "outline" : "default"} disabled={!hydrated || pending || recovery?.protected}>{action}</Button></AlertDialogTrigger> : null}
      <AlertDialogContent aria-busy={pending || recovery?.uncertain} data-draft-managed data-live-dirty={Boolean(reason) || recovery?.uncertain || undefined} data-write-recovery={recovery?.uncertain || undefined} onEscapeKeyDown={event => { if (submitting.current || reviewed.locked() || recovery?.locked()) event.preventDefault(); }} onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus.current?.focus(); } }}>
        <AlertDialogTitle>{action}</AlertDialogTitle>
        <AlertDialogDescription>{releasing ? "La libération rend cette offre disponible. Son motif et son auteur sont conservés." : "Cette action bloque uniquement l’offre et le périmètre indiqués. Elle ne gagne pas l’affaire et ne crée aucune commission."}</AlertDialogDescription>{releasing && nextStageLabel ? <p className="text-sm text-muted-foreground">Après la libération, vous confirmerez le passage à « {nextStageLabel} ».</p> : null}
        {!reviewed.ready && !failure ? <p role="status">Vérification de la disponibilité actuelle…</p> : null}
        {offering && target ? <div className="grid min-w-0 gap-2"><p className="wrap-anywhere font-medium">{target.reference} : {targetLabels[target.level]}</p><p>{kindLabels[offering.kind]} : {stateLabels[offering.state]}</p><p className="wrap-anywhere">{target.label}</p>{target.level === "unit" ? <p className="wrap-anywhere">Programme {target.development_reference}, bloc {target.block_code ?? "non renseigné"}, étage {target.floor_code ?? "non renseigné"}. Le type n’est pas une cible réservable.</p> : null}<p>Affaire version {review.version}, cible version {target.version}, offre version {offering.version}.</p></div> : <p role="alert">La cible actuelle ne peut pas être vérifiée.</p>}
        <p>Aucune expiration automatique. Le serveur vérifie à nouveau vos droits et les réservations concurrentes.</p>
        {releasing ? <div className="grid gap-2"><Label htmlFor="release-reason">Motif de la libération</Label><Textarea id="release-reason" maxLength={1000} value={reason} disabled={pending || recovery?.protected || recovery?.needsReview || unavailable} onChange={event => { if (canChange()) setReason(event.target.value); }} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? "release-invalid" : undefined} /></div> : null}
        {invalid ? <p id="release-invalid" role="alert" className="text-danger">{invalid}</p> : null}
        {failure ? <div className="grid gap-2"><RecordError error={failure} /><p>{releasing ? "Votre motif reste saisi. " : ""}Après une réponse interrompue, réessayez sans modifier l’action pour récupérer le même résultat.</p><p>Pour un conflit, actualisez les faits ci-dessus, puis vérifiez-les avant de confirmer. Un chevauchement exige une revue par un responsable, pas une nouvelle cible implicite.</p></div> : null}
        {unavailable && reviewed.ready ? <p role="status">Cette action ne correspond plus au dossier actuel. Fermez ce panneau et vérifiez la fiche avant une nouvelle action.</p> : null}{recovery?.uncertain ? <p role="status">{recovery.acknowledged ? "L’action est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même action pour retrouver son résultat."}</p> : null}<div className="flex flex-wrap gap-2"><Button action={releasing ? "release" : "reserve"} type="button" disabled={!hydrated || pending || !recovery?.uncertain && (unavailable || Boolean(reviewed.error) || recovery?.needsReview)} onClick={() => void submit()}>{pending ? "Enregistrement…" : recovery?.uncertain ? recovery.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : action}</Button><Button action="refresh" type="button" variant="outline" disabled={pending || recovery?.uncertain} onClick={() => void reviewed.refresh()}>Actualiser la disponibilité</Button><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={pending || recovery?.uncertain}>Retour</Button></AlertDialogCancel></div>
      </AlertDialogContent>
    </AlertDialog>}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
  </section>;
}
