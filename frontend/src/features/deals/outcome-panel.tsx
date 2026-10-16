"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { closeSchema, dealStockReviewSchema, reopenSchema, reviewedBody, type DealStockReview } from "@/features/inventory/outcome-contracts";
import { StockReviewFacts } from "@/features/inventory/stock-review";
import { OfferingFacts } from "@/features/requirements/offering-card";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { resultSchema, type Deal } from "./contracts";

export function OutcomePanel({ deal, writable, busy, busyChanged, saved }: { deal: Deal; writable: boolean; busy: boolean; busyChanged: (value: boolean) => void; saved: () => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<DealStockReview>();
  const [outcome, setOutcome] = useState<"won" | "lost" | "cancelled">(deal.offering ? "won" : "lost");
  const [amount, setAmount] = useState("");
  const [completedOn, setCompletedOn] = useState("");
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState("");
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const attempt = useRef({ fingerprint: "", key: "" });
  const lock = useRef(false);
  const titleInput = useRef<HTMLHeadingElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const dateInput = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated(); const router = useRouter();
  const reopening = ["won", "lost", "cancelled"].includes(deal.stage);
  const action = reopening ? "Rouvrir l’affaire" : "Clôturer l’affaire";

  async function refresh() {
    if (lock.current) return;
    lock.current = true; busyChanged(true);
    try { setReview(await apiGet(`/api/v1/deals/${deal.id}/stock-review`, dealStockReviewSchema)); setError(undefined); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; busyChanged(false); }
  }
  async function submit() {
    if (!review || lock.current) return;
    const data = reopening ? { ...reviewedBody(review), reason } : { ...reviewedBody(review), outcome, agreed_amount_mad: outcome === "won" ? amount.trim().replace(",", ".") : null, completed_on: completedOn, explanation: reason };
    const parsed = reopening ? reopenSchema.safeParse(data) : closeSchema.safeParse(data);
    if (!parsed.success) {
      setInvalid(reopening ? "Renseignez le motif de réouverture (1 à 1 000 caractères)." : "Indiquez la date et l’explication. Une affaire gagnée exige une offre liée et un montant MAD strictement positif, avec au plus deux décimales.");
      if (!reopening && outcome === "won" && (!/^[0-9]{1,16}([.,][0-9]{1,2})?$/.test(amount.trim()) || !/[1-9]/.test(amount))) amountInput.current?.focus();
      else if (!reopening && !completedOn) dateInput.current?.focus(); else reasonInput.current?.focus();
      return;
    }
    const path = `/api/v1/deals/${deal.id}/${reopening ? "reopen" : "close"}` as const;
    const fingerprint = JSON.stringify({ path, body: parsed.data });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true; busyChanged(true); setError(undefined); setInvalid(""); setNotice("");
    try { await apiCommand(path, parsed.data, resultSchema, attempt.current.key); await saved(); router.refresh(); setOpen(false); setReason(""); setNotice("Événement enregistré dans l’historique. L’étape et le stock actuels sont affichés ci-dessus."); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; busyChanged(false); }
  }
  return <section className="grid min-w-0 gap-4 border-y py-6" aria-label="Clôture et réouverture"><h2 className="text-section font-medium">Clôture et réouverture</h2>
    {deal.stock_review_required ? <p role="status" className="text-warning">Le stock lié a changé. Faites vérifier cette affaire par un responsable. Elle n’a pas été clôturée automatiquement.</p> : null}
    <p>La commission est facultative. Clôturer ou rouvrir n’enregistre aucun encaissement et n’efface aucune donnée financière.</p>
    {!writable ? <p>Résultats conservés en lecture seule.</p> : <AlertDialog open={open} onOpenChange={next => { if (!lock.current) { setOpen(next); if (next) { setReview(undefined); setError(undefined); setInvalid(""); void refresh(); } } }}>
      <AlertDialogTrigger asChild><Button type="button" className="justify-self-start" disabled={!hydrated || busy}>{action}</Button></AlertDialogTrigger>
      <AlertDialogContent onOpenAutoFocus={event => { event.preventDefault(); titleInput.current?.focus(); }}><AlertDialogTitle ref={titleInput} tabIndex={-1}>{action}</AlertDialogTitle><AlertDialogDescription>{reopening ? "Le résultat d’origine reste conservé. Le serveur vérifie les engagements actuels avant toute restauration du stock. Une ancienne réservation ne renaît pas." : "Confirmez le résultat réel et les effets sur l’offre exacte. Accepter une proposition ne suffit pas ; aucune commission n’est obligatoire."}</AlertDialogDescription>
        {(review ? review.offering : deal.offering) ? <OfferingFacts offering={(review ? review.offering : deal.offering)!} /> : <p>Aucune offre liée : seuls les résultats perdue ou annulée sont possibles.</p>}
        {!review && !error ? <p role="status">Vérification du périmètre et des effets…</p> : null}
        {review?.stock ? <StockReviewFacts review={review.stock} affectsStock={reopening ? deal.stage === "won" : outcome === "won"} /> : null}
        <form noValidate className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
          <fieldset disabled={busy} className="grid min-w-0 gap-4"><legend className="sr-only">Données du résultat</legend>
            {!reopening ? <><div className="grid gap-2"><Label htmlFor="close-outcome">Résultat</Label><NativeSelect id="close-outcome" value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)}><option value="won" disabled={!deal.offering}>Gagnée</option><option value="lost">Perdue</option><option value="cancelled">Annulée</option></NativeSelect></div>{outcome === "won" ? <div className="grid gap-2"><Label htmlFor="close-amount">Montant convenu en MAD{deal.offering?.price_period === "month" ? " par mois" : deal.offering?.price_period === "year" ? " par an" : ""} (obligatoire)</Label><Input ref={amountInput} id="close-amount" inputMode="decimal" value={amount} maxLength={20} onChange={e => setAmount(e.target.value)} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div> : null}<div className="grid gap-2"><Label htmlFor="close-date">Date du résultat (obligatoire)</Label><Input ref={dateInput} id="close-date" type="date" value={completedOn} onChange={e => setCompletedOn(e.target.value)} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div></> : null}
            <div className="grid gap-2"><Label htmlFor="outcome-reason">{reopening ? "Motif de réouverture" : "Explication du résultat"} (obligatoire)</Label><Textarea ref={reasonInput} id="outcome-reason" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} aria-describedby={invalid ? "outcome-invalid" : undefined} /></div>
          </fieldset>
          {invalid ? <p id="outcome-invalid" role="alert" className="text-danger">{invalid}</p> : null}
          {error ? <><RecordError error={error} /><p>Votre saisie reste affichée. Après une réponse interrompue, réessayez sans la modifier. En cas de conflit, actualisez les effets avant une nouvelle confirmation.</p></> : null}
          <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !review}>{busy ? "Enregistrement…" : action}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>Actualiser les effets</Button><AlertDialogCancel asChild><Button type="button" variant="outline" disabled={busy}>Retour</Button></AlertDialogCancel></div>
        </form>
      </AlertDialogContent>
    </AlertDialog>}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
  </section>;
}
