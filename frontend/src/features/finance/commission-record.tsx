"use client";
import { useEffect, useRef, useState } from "react";
import { FinanceIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { mad, type Commission } from "./contracts";
import { FinanceConfirmation } from "./confirmation";
import { readCommission, type FinanceSelection } from "./model";
import { FinanceFailure, useFinanceMutation, type Denied, type Saved } from "./mutation";
import { ReceiptForm } from "./receipt-form";
import { TermsForm } from "./terms-form";

export function CommissionRecord({ initial, dealId, contactId, dealVersion, writable, changed, denied, close }: { initial: FinanceSelection; dealId: string; contactId: string; dealVersion: number; writable: boolean; changed: () => void; denied: Denied; close: () => void }) {
  const alive = useRef(true), reading = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  async function saved(result: { id: string; version: number }) {
    if (result.id !== initial.commission.id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    const abort = new AbortController(); reading.current = abort;
    const current = await readCommission(result.id, dealId, abort.signal);
    if (!alive.current || abort.signal.aborted) return;
    if (current.version < result.version) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    changed(); close();
  }
  const value = initial.commission;
  if (value.deal_id !== dealId || value.current.version !== value.version || initial.original && initial.original.commission_id !== value.id) return <RecordError error={new ApiError("DEPENDENCY_UNAVAILABLE", 503)} />;
  if (initial.mode === "commission") return <TermsForm dealId={dealId} dealVersion={dealVersion} value={value} writable={writable} saved={saved} denied={denied} cancel={close} />;
  if (initial.mode === "receipt") return <ReceiptForm key={initial.original?.id ?? "new"} value={value} contactId={contactId} original={initial.original} originalPage={initial.receiptPage} writable={writable} saved={saved} denied={denied} cancel={close} />;
  return <RecognitionForm value={value} saved={saved} denied={denied} cancel={close} writable={writable} />;
}

export function RecognitionForm({ value, saved, denied, cancel, writable }: { value: Commission; saved: Saved; denied: Denied; cancel: () => void; writable: boolean }) {
  const [source, setSource] = useState(value), [expected, setExpected] = useState(value.version), [pending, setPending] = useState<{ version: number; amount: string } | undefined>({ version: value.version, amount: value.current.amount_mad });
  const form = useRef<HTMLFormElement>(null), trigger = useRef<HTMLButtonElement>(null), alive = useRef(true), hydrated = useHydrated(), guard = useUnsavedGuard();
  const mutation = useFinanceMutation(value.deal_id, value.id, onSaved, denied, current => current.current.state !== "expected" ? "Cette commission est déjà reconnue. Revenez au suivi financier pour consulter les encaissements." : undefined, writable);
  const draft = useDossierDraft({ recovery: mutation.uncertain }, mutation.busy);
  async function onSaved(result: { id: string; version: number }) { draft.accept({ recovery: false }); await saved(result); }
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function confirm(version: number) { if (!hydrated || !writable) return; await mutation.save(`/api/v1/commissions/${value.id}/recognize`, { expected_version: version }); if (alive.current) setPending(undefined); }
  return <form ref={form} className="kay-drawer-form" aria-label="Reconnaissance de commission" data-draft-managed data-live-dirty={draft.dirty} data-write-recovery={mutation.uncertain} aria-busy={mutation.busy} onSubmit={event => { event.preventDefault(); if (hydrated && writable && !mutation.isBusy() && !mutation.uncertain && source.current.state === "expected") setPending({ version: expected, amount: source.current.amount_mad }); }}>
    <RecordEntry title={mad(source.current.amount_mad)} icon={FinanceIcon}><p>La reconnaissance n’enregistre aucun versement.</p></RecordEntry>
    <FinanceFailure mutation={mutation} acceptVersion={(version, current) => { setExpected(version); if (current) setSource(current); }} />
    <footer className="kay-form-footer"><Button action="cancel" variant="outline" type="button" disabled={mutation.busy} onClick={() => { if (!mutation.isBusy()) guard.request(cancel, form.current ?? undefined); }}>Annuler</Button><Button action="confirm" ref={trigger} type="submit" disabled={!hydrated || !writable || mutation.busy || mutation.uncertain || source.current.state !== "expected"}>Reconnaître la commission</Button></footer>
    {pending ? <FinanceConfirmation title="Reconnaître la commission" busy={mutation.busy} disabled={!hydrated || !writable} returnFocus={trigger} cancel={() => setPending(undefined)} confirm={() => void confirm(pending.version)}><p>Montant à reconnaître : {mad(pending.amount)}.</p><p>Cette confirmation n’enregistre aucun versement.</p></FinanceConfirmation> : null}
    {guard.dialog}
  </form>;
}
