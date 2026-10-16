"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { type InventoryTarget, type Offering } from "./contracts";
import { externalSchema, stockReviewSchema, type StockReview } from "./outcome-contracts";
import { StockReviewFacts } from "./stock-review";
import { InventoryBusyContext, useInventoryCommand } from "./use-command";

export function ExternalOutcome({ target, offering, saved }: { target: InventoryTarget; offering: Offering; saved: () => void }) {
  const [open, setOpen] = useState(false); const [review, setReview] = useState<StockReview>();
  const [completedOn, setCompletedOn] = useState(""); const [explanation, setExplanation] = useState("");
  const [invalid, setInvalid] = useState(""); const [error, setError] = useState<ApiError>(); const [loading, setLoading] = useState(false);
  const command = useInventoryCommand(); const recordBusy = useContext(InventoryBusyContext);
  const titleInput = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false); const dateInput = useRef<HTMLInputElement>(null); const reasonInput = useRef<HTMLTextAreaElement>(null);
  const hydrated = useHydrated(); const router = useRouter(); const busy = command.pending || loading;
  const root = target.inventoryLevel === "development" ? "developments" : "properties";
  const path = `/api/v1/${root}/${target.id}` as const;
  const action = offering.kind === "sale" ? "Marquer vendue ailleurs" : "Marquer louée ailleurs";

  async function refresh() {
    if (lock.current || command.pending) return;
    lock.current = true; setLoading(true); recordBusy(true);
    try { setReview(await apiGet(`${path}/stock-review?offering_id=${offering.id}`, stockReviewSchema)); setError(undefined); command.clear(); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; setLoading(false); recordBusy(false); }
  }
  function submit() {
    if (!review || busy) return;
    const data = externalSchema.safeParse({ expected_version: review.expected_target_version, offering_id: review.offering_id, expected_offering_version: review.expected_offering_version, expected_development_version: review.expected_development_version, expected_stock_fingerprint: review.expected_stock_fingerprint, completed_on: completedOn, explanation });
    if (!data.success) { setInvalid("Indiquez une date et un motif partagé (1 à 1 000 caractères), sans information privée sur un client."); if (!completedOn) dateInput.current?.focus(); else reasonInput.current?.focus(); return; }
    setInvalid("");
    void command.submit(`${path}/external-outcome`, data.data, "POST", () => { setOpen(false); setExplanation(""); saved(); router.refresh(); });
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!busy) { setOpen(next); if (next) { setReview(undefined); setError(undefined); command.clear(); setInvalid(""); void refresh(); } } }}>
    <AlertDialogTrigger asChild><Button type="button" variant="outline" className="justify-self-start" disabled={!hydrated}>{action}</Button></AlertDialogTrigger>
    <AlertDialogContent onOpenAutoFocus={event => { event.preventDefault(); titleInput.current?.focus(); }}><AlertDialogTitle ref={titleInput} tabIndex={-1}>{action}</AlertDialogTitle><AlertDialogDescription>Résultat externe, réservé aux responsables. Cette action modifie le stock et signale les affaires concernées, sans créer de gain KAY, de commission ni d’encaissement.</AlertDialogDescription>
      {!review && !error ? <p role="status">Vérification du périmètre et des effets…</p> : null}{review ? <StockReviewFacts review={review} /> : null}
      <form noValidate className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); submit(); }}><fieldset className="grid min-w-0 gap-4" disabled={busy}><legend className="sr-only">Résultat externe</legend><div className="grid gap-2"><Label htmlFor={`external-date-${offering.id}`}>Date du résultat externe (obligatoire)</Label><Input ref={dateInput} id={`external-date-${offering.id}`} type="date" value={completedOn} onChange={e => setCompletedOn(e.target.value)} aria-describedby={invalid ? `external-invalid-${offering.id}` : undefined} /></div><div className="grid gap-2"><Label htmlFor={`external-reason-${offering.id}`}>Motif partagé, sans donnée privée (obligatoire)</Label><Textarea ref={reasonInput} id={`external-reason-${offering.id}`} value={explanation} maxLength={1000} onChange={e => setExplanation(e.target.value)} aria-describedby={invalid ? `external-invalid-${offering.id}` : undefined} /></div></fieldset>
        {invalid ? <p role="alert" className="text-danger" id={`external-invalid-${offering.id}`}>{invalid}</p> : null}{error || command.error ? <><RecordError error={error ?? command.error!} /><p>Votre saisie est conservée. Réessayez sans la modifier après une interruption ; actualisez les effets en cas de conflit.</p></> : null}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || !review}>{busy ? "Enregistrement…" : action}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>Actualiser les effets</Button><AlertDialogCancel asChild><Button type="button" variant="outline" disabled={busy}>Retour</Button></AlertDialogCancel></div>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}
