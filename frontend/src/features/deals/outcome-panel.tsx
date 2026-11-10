"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { closeSchema, reopenSchema, reviewedBody } from "@/features/inventory/outcome-contracts";
import { StockReviewFacts } from "@/features/inventory/stock-review";
import { OfferingFacts } from "@/features/requirements/offering-card";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { type Deal } from "./contracts";

import type { MutateDeal } from "./pipeline";
import type { DealCommandRecovery } from "./deal-command-intent";
import { useDealStockReview } from "./use-deal-stock-review";

export function OutcomePanel({ deal, writable, busy, saved, mutate, recovery, error, dialogOnly = false, initialOutcome, closed, returnFocus }: { deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; saved: (value: Deal) => Promise<unknown>; mutate?: MutateDeal; recovery?: DealCommandRecovery; error?: ApiError; dialogOnly?: boolean; initialOutcome?: "won" | "lost" | "cancelled"; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null> }) {
  const [opening] = useState(deal), [open, setOpen] = useState(dialogOnly);
  const [outcome, setOutcome] = useState<"won" | "lost" | "cancelled">(initialOutcome ?? (opening.offering ? "won" : "lost"));
  const [amount, setAmount] = useState(""), [completedOn, setCompletedOn] = useState(""), [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(""), [notice, setNotice] = useState("");
  const titleInput = useRef<HTMLHeadingElement>(null), reasonInput = useRef<HTMLTextAreaElement>(null), amountInput = useRef<HTMLInputElement>(null), dateInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false), reported = useRef(false), alive = useRef(true);
  const hydrated = useHydrated(), reviewed = useDealStockReview(opening, recovery, true, dialogOnly), review = reviewed.stockReview, current = reviewed.deal;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const reopening = ["won", "lost", "cancelled"].includes(opening.stage), action = reopening ? "Rouvrir l’affaire" : "Clôturer l’affaire";
  const unavailable = !writable || !recovery || !mutate || !reviewed.ready || Boolean(current.archived_at || current.contact.archived_at) || current.contact.id !== opening.contact.id || reopening !== ["won", "lost", "cancelled"].includes(current.stage) || current.offering?.id !== opening.offering?.id || current.offering?.target?.id !== opening.offering?.target?.id;
  const pending = busy || reviewed.reading, failure = reviewed.error ?? error;
  const canChange = () => alive.current && !submitting.current && !reviewed.locked() && !pending && !unavailable && !reviewed.error && Boolean(recovery?.canEdit());
  async function finish(value: Deal, signal?: AbortSignal) {
    if (!alive.current || signal?.aborted || reported.current) return;
    await saved(value);
    if (!alive.current || signal?.aborted || reported.current) return;
    reported.current = true; setOpen(false); setReason(""); setNotice("Événement enregistré dans l’historique. L’étape et le stock actuels sont affichés ci-dessus."); closed?.();
  }
  async function submit() {
    if (!hydrated || submitting.current || pending || !recovery || !mutate) return;
    if (recovery.uncertain) { submitting.current = true; try { await recovery.retry(); } finally { submitting.current = false; } return; }
    if (!review || !canChange()) return;
    const data = reopening ? { ...reviewedBody(review), reason } : { ...reviewedBody(review), outcome, agreed_amount_mad: outcome === "won" ? amount.trim().replace(",", ".") : null, completed_on: completedOn, explanation: reason };
    const parsed = reopening ? reopenSchema.safeParse(data) : closeSchema.safeParse(data);
    if (!parsed.success) {
      setInvalid(reopening ? "Renseignez le motif de réouverture (1 à 1 000 caractères)." : "Indiquez la date et l’explication. Une affaire gagnée exige une offre liée et un montant MAD strictement positif, avec au plus deux décimales.");
      if (!reopening && outcome === "won" && (!/^[0-9]{1,16}([.,][0-9]{1,2})?$/.test(amount.trim()) || !/[1-9]/.test(amount))) amountInput.current?.focus();
      else if (!reopening && !completedOn) dateInput.current?.focus(); else reasonInput.current?.focus();
      return;
    }
    submitting.current = true; reported.current = false; setInvalid(""); setNotice("");
    try { await mutate(`/api/v1/deals/${opening.id}/${reopening ? "reopen" : "close"}`, parsed.data, "POST", { dealId: opening.id, completed: finish }); }
    finally { submitting.current = false; }
  }
  return <section hidden={dialogOnly} className={dialogOnly ? "hidden" : "grid min-w-0 gap-4 border-y py-6"} aria-label="Clôture et réouverture"><h2 className="text-section">Clôture et réouverture</h2>
    {!dialogOnly && deal.stock_review_required ? <p role="status" className="text-warning">Le stock lié a changé. Faites vérifier cette affaire par un responsable. Elle n’a pas été clôturée automatiquement.</p> : null}
    <p>La commission est facultative. Clôturer ou rouvrir n’enregistre aucun encaissement et n’efface aucune donnée financière.</p>
    {!writable && !open ? <p>Résultats conservés en lecture seule.</p> : <AlertDialog open={open} onOpenChange={next => { if (!submitting.current && !reviewed.locked() && !recovery?.locked()) { setOpen(next); if (!next) closed?.(); if (next) { setInvalid(""); void reviewed.refresh(); } } }}>
      {!dialogOnly ? <AlertDialogTrigger asChild><Button action={reopening ? "restore" : "outcome"} type="button" className="justify-self-start" disabled={!hydrated || pending || recovery?.protected}>{action}</Button></AlertDialogTrigger> : null}
      <AlertDialogContent onEscapeKeyDown={event => { if (submitting.current || reviewed.locked() || recovery?.locked()) event.preventDefault(); }} onCloseAutoFocus={event => { if (returnFocus) { event.preventDefault(); returnFocus.current?.focus(); } }} onOpenAutoFocus={event => { event.preventDefault(); titleInput.current?.focus(); }}><AlertDialogTitle ref={titleInput} tabIndex={-1}>{action}</AlertDialogTitle><AlertDialogDescription>{reopening ? "Le résultat d’origine reste conservé. Le serveur vérifie les engagements actuels avant toute restauration du stock. Une ancienne réservation ne renaît pas." : "Confirmez le résultat réel et les effets sur l’offre exacte. Accepter une proposition ne suffit pas ; aucune commission n’est obligatoire."}</AlertDialogDescription>
        {(review ? review.offering : deal.offering) ? <OfferingFacts offering={(review ? review.offering : deal.offering)!} /> : <p>Aucune offre liée : seuls les résultats perdue ou annulée sont possibles.</p>}
        {!review && !failure ? <p role="status">Vérification du périmètre et des effets…</p> : null}
        {review?.stock ? <StockReviewFacts review={review.stock} affectsStock={reopening ? opening.stage === "won" : outcome === "won"} /> : null}
        <form aria-label={action} aria-busy={pending || recovery?.uncertain} data-draft-managed data-live-dirty={Boolean(reason || amount || completedOn) || recovery?.uncertain || undefined} data-write-recovery={recovery?.uncertain || undefined} noValidate className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={pending || recovery?.protected || recovery?.needsReview || unavailable || Boolean(reviewed.error)} className="grid min-w-0 gap-4"><legend className="sr-only">Données du résultat</legend>
            {!reopening ? <><div className="grid gap-2"><Label htmlFor="close-outcome">Résultat</Label><NativeSelect id="close-outcome" value={outcome} onChange={e => { if (canChange()) setOutcome(e.target.value as typeof outcome); }}><option value="won" disabled={!current.offering}>Gagnée</option><option value="lost">Perdue</option><option value="cancelled">Annulée</option></NativeSelect></div>{outcome === "won" ? <div className="grid gap-2"><Label htmlFor="close-amount">Montant convenu en MAD{current.offering?.price_period === "month" ? " par mois" : deal.offering?.price_period === "year" ? " par an" : ""} (obligatoire)</Label><Input ref={amountInput} id="close-amount" inputMode="decimal" value={amount} maxLength={20} onChange={e => { if (canChange()) setAmount(e.target.value); }} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div> : null}<div className="grid gap-2"><Label htmlFor="close-date">Date du résultat (obligatoire)</Label><Input ref={dateInput} id="close-date" type="date" value={completedOn} onChange={e => { if (canChange()) setCompletedOn(e.target.value); }} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div></> : null}
            <div className="grid gap-2"><Label htmlFor="outcome-reason">{reopening ? "Motif de réouverture" : "Explication du résultat"} (obligatoire)</Label><Textarea ref={reasonInput} id="outcome-reason" value={reason} maxLength={1000} onChange={e => { if (canChange()) setReason(e.target.value); }} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div>
          </fieldset>
          {invalid ? <p id="outcome-invalid" role="alert" className="text-danger">{invalid}</p> : null}
          {failure ? <><RecordError error={failure} /><p>Votre saisie reste affichée. Après une réponse interrompue, réessayez sans la modifier. En cas de conflit, actualisez les effets avant une nouvelle confirmation.</p></> : null}
          {unavailable && reviewed.ready ? <p role="status">Cette action ne correspond plus au dossier actuel. Fermez ce panneau et vérifiez la fiche avant une nouvelle action.</p> : null}{recovery?.uncertain ? <p role="status">{recovery.acknowledged ? "Le résultat est enregistré. Actualisez sa lecture sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez le même résultat pour retrouver son enregistrement."}</p> : null}
          <div className="flex flex-wrap gap-2"><Button action={reopening ? "restore" : outcome === "won" ? "complete" : "cancelRecord"} type="submit" disabled={!hydrated || pending || !recovery?.uncertain && (unavailable || Boolean(reviewed.error) || recovery?.needsReview)}>{pending ? "Enregistrement…" : recovery?.uncertain ? recovery.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : action}</Button><Button action="refresh" type="button" variant="outline" disabled={pending || recovery?.uncertain} onClick={() => void reviewed.refresh()}>Actualiser les effets</Button><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={pending || recovery?.uncertain}>Retour</Button></AlertDialogCancel></div>
        </form>
      </AlertDialogContent>
    </AlertDialog>}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
  </section>;
}
