"use client";
import { useEffect, useRef, useState } from "react";
import { FinanceIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { localLabel } from "@/features/schedule/time";
import { commissionSchema, mad, receiptsSchema, revisionLabels, revisionsSchema, type Commission, type Receipt } from "./contracts";
import { FinanceConfirmation } from "./confirmation";
import { FINANCE_PAGE_SIZE, financeDenied, financePageValid, readCommission, type FinanceSelection } from "./model";
import { FinanceFailure, useFinanceMutation, type Denied, type Saved } from "./mutation";
import { ReceiptForm } from "./receipt-form";
import { TermsForm } from "./terms-form";

type Mode = { kind: "commission" | "receipt" | "recognize"; source: Commission; returnTo: "list" | "detail"; original?: Receipt; page?: number };
export function CommissionRecord({ initial, dealId, contactId, dealVersion, writable, changed, denied, close }: { initial: FinanceSelection; dealId: string; contactId: string; dealVersion: number; writable: boolean; changed: () => void; denied: Denied; close: () => void }) {
  const [snapshot, setSnapshot] = useState(initial.commission), [mode, setMode] = useState<Mode | undefined>(initial.mode ? { kind: initial.mode, source: initial.commission, returnTo: "list" } : undefined);
  const [receiptPage, setReceiptPage] = useState(1), [historyPage, setHistoryPage] = useState(1), [notice, setNotice] = useState("");
  const alive = useRef(true), reading = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  async function saved(result: { id: string; version: number }) {
    if (result.id !== initial.commission.id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    const abort = new AbortController(); reading.current = abort;
    const current = await readCommission(result.id, dealId, abort.signal);
    if (!alive.current || abort.signal.aborted) return;
    if (current.version < result.version) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    setSnapshot(current); setNotice("Opération financière enregistrée. Les originaux restent conservés."); changed(); if (mode?.returnTo === "list") close(); else setMode(undefined);
  }
  function detail() { if (mode?.returnTo === "list") close(); else setMode(undefined); }
  if (snapshot.id !== initial.commission.id || snapshot.deal_id !== dealId) return <RecordError error={new ApiError("DEPENDENCY_UNAVAILABLE", 503)} />;
  if (mode?.kind === "commission") return <TermsForm key={`terms:${mode.source.id}`} dealId={dealId} dealVersion={dealVersion} value={mode.source} writable={writable} saved={saved} denied={denied} cancel={detail} />;
  if (mode?.kind === "receipt") return <ReceiptForm key={`receipt:${mode.original?.id ?? "new"}`} value={mode.source} contactId={contactId} original={mode.original} originalPage={mode.page} writable={writable} saved={saved} denied={denied} cancel={detail} />;
  if (mode?.kind === "recognize") return <RecognitionForm key={`recognize:${mode.source.id}`} value={mode.source} saved={saved} denied={denied} cancel={detail} writable={writable} />;
  return <CommissionDetail key={snapshot.id} value={snapshot} dealId={dealId} writable={writable} receiptPage={receiptPage} setReceiptPage={setReceiptPage} historyPage={historyPage} setHistoryPage={setHistoryPage} notice={notice} denied={denied} close={close} open={(kind, source, original) => { setNotice(""); setMode({ kind, source, original, page: receiptPage, returnTo: "detail" }); }} />;
}

export function CommissionDetail({ value, dealId, writable, receiptPage, setReceiptPage, historyPage, setHistoryPage, notice, denied, close, open }: { value: Commission; dealId: string; writable: boolean; receiptPage: number; setReceiptPage: (page: number) => void; historyPage: number; setHistoryPage: (page: number) => void; notice: string; denied: Denied; close: () => void; open: (mode: Mode["kind"], value: Commission, original?: Receipt) => void }) {
  const query = useQuery(`/api/v1/commissions/${value.id}`, commissionSchema);
  const revisions = useQuery(`/api/v1/commissions/${value.id}/revisions?page=${historyPage}&page_size=${FINANCE_PAGE_SIZE}`, revisionsSchema), receipts = useQuery(`/api/v1/commissions/${value.id}/receipts?page=${receiptPage}&page_size=${FINANCE_PAGE_SIZE}`, receiptsSchema);
  const heading = useRef<HTMLHeadingElement>(null), hydrated = useHydrated();
  useEffect(() => { heading.current?.focus(); }, []);
  const authority = [query.error, revisions.error, receipts.error].find(error => error && financeDenied(error));
  useEffect(() => { if (authority) denied(authority); }, [authority, denied]);
  if (authority) return <RecordError error={authority} />;
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  const current = query.value;
  if (!current) return <p role="status">Chargement de la commission…</p>;
  if (current.id !== value.id || current.deal_id !== dealId || current.current.version !== current.version) return <RecordError error={new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} />;
  const receiptInvalid = receipts.value && (!financePageValid(receipts.value, receiptPage) || receipts.value.items.some(item => item.commission_id !== value.id));
  const historyInvalid = revisions.value && !financePageValid(revisions.value, historyPage);
  return <section className="grid min-w-0 gap-5" aria-label="Commission sélectionnée"><RecordEntry title={mad(current.current.amount_mad)} icon={FinanceIcon} status={<Badge variant="neutral">{current.current.state === "recognized" ? "Reconnue" : "Prévue"}</Badge>} meta={[{ label: "Base", value: mad(current.current.base_mad) }, { label: "Calcul", value: current.current.kind === "fixed" ? "Commission fixe" : `${current.current.rate_percent} %` }, { label: "Échéance", value: current.current.due_on ?? "Non renseignée" }, { label: "Encaissé", value: mad(current.collected_mad) }, { label: "Solde reconnu", value: current.balance_mad === null ? "Non reconnu" : mad(current.balance_mad) }, { label: "Version", value: current.version }]} actions={writable ? <><Button action={current.current.state === "expected" ? "confirm" : "add"} type="button" variant="outline" disabled={!hydrated} onClick={() => open(current.current.state === "expected" ? "recognize" : "receipt", current)}>{current.current.state === "expected" ? "Reconnaître la commission" : "Ajouter un encaissement"}</Button><Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => open("commission", current)}>Corriger la commission</Button></> : undefined}>{current.current.review_required ? <p className="text-sm text-warning">Revue requise après réouverture. Les montants et versements restent conservés.</p> : null}</RecordEntry>
    {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
    <RecordSection title="Encaissements et corrections" label="Encaissements et corrections" headingRef={heading} count={!receipts.error ? receipts.value?.total : undefined}>
      {receipts.error || receiptInvalid ? <RecordError error={receipts.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={receipts.refresh} /> : !receipts.value ? <p role="status">Chargement des encaissements…</p> : <>{receipts.value.items.length ? <ul className="grid min-w-0 gap-3">{receipts.value.items.map(item => <li key={item.id}><RecordEntry title={item.amount_mad ? mad(item.amount_mad) : "Versement annulé"} status={<Badge variant="neutral">{!item.valid ? "Remplacé ou annulé" : item.amount_mad === null ? "Annulé" : "Valide"}</Badge>} meta={[{ label: "Reçu le", value: item.received_on }, { label: "Auteur", value: item.actor.display_name }, { label: "Origine", value: item.supersedes_id ? "Remplacement lié à l’original" : "Versement d’origine" }, { label: "Justificatif", value: item.evidence_document_id ? "Version protégée conservée" : "Sans justificatif" }]} actions={writable && item.valid ? <Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => open("receipt", current, item)}>Corriger cet encaissement</Button> : undefined}><p className="whitespace-pre-wrap wrap-anywhere">{item.reason}</p></RecordEntry></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun versement enregistré.</p>}{receipts.value.has_previous || receipts.value.has_next || receiptPage > 1 ? <NumberedPages compact page={receiptPage} total={receipts.value.total} size={FINANCE_PAGE_SIZE} change={setReceiptPage} label="Pages des encaissements" /> : null}</>}
    </RecordSection>
    <RecordSection title="Historique financier" label="Historique financier" count={!revisions.error ? revisions.value?.total : undefined}>{revisions.error || historyInvalid ? <RecordError error={revisions.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={revisions.refresh} /> : !revisions.value ? <p role="status">Chargement de l’historique financier…</p> : <><ul className="grid min-w-0 gap-3">{revisions.value.items.map(item => <li key={item.id}><RecordEntry title={revisionLabels[item.action]} meta={[{ label: "Version", value: item.version }, { label: "Montant", value: mad(item.amount_mad) }, { label: "Auteur", value: item.actor.display_name }, { label: "Date", value: localLabel(item.created_local) }]}><p className="whitespace-pre-wrap wrap-anywhere">{item.reason || "Sans motif complémentaire."}</p></RecordEntry></li>)}</ul>{revisions.value.has_previous || revisions.value.has_next || historyPage > 1 ? <NumberedPages compact page={historyPage} total={revisions.value.total} size={FINANCE_PAGE_SIZE} change={setHistoryPage} label="Pages de l’historique financier" /> : null}</> }</RecordSection>
    <Button action="back" type="button" variant="quiet" className="justify-self-start" onClick={close}>Toutes les commissions</Button>
  </section>;
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
