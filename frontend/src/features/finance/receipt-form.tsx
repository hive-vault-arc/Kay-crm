"use client";
import { useEffect, useId, useRef, useState } from "react";
import { FinanceIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { documentsSchema } from "@/features/files/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { correctReceiptSchema, mad, receiptCommandSchema, type Commission, type Receipt } from "./contracts";
import { FinanceConfirmation } from "./confirmation";
import { FINANCE_PAGE_SIZE, financeDenied, financePageValid, receiptStillCurrent } from "./model";
import { FinanceFailure, useFinanceMutation, type Denied, type Saved } from "./mutation";
import { FinanceField } from "./terms-form";

type Pending = { body: unknown; amount: string; date: string; reason: string; balance: string; voiding: boolean };
export function ReceiptForm({ value, contactId, original, originalPage = 1, saved, denied, cancel, writable = true }: { value: Commission; contactId: string; original?: Receipt; originalPage?: number; saved: Saved; denied: Denied; cancel: () => void; writable?: boolean }) {
  const id = useId(), submit = useRef<HTMLButtonElement>(null), form = useRef<HTMLFormElement>(null), alive = useRef(true);
  const [source, setSource] = useState(value), [expected, setExpected] = useState(value.version);
  const [fields, setFields] = useState({ amount: original?.amount_mad ?? "", date: original?.received_on ?? "", reason: original?.reason ?? "", correctionReason: "", voiding: false, evidence: original?.evidence_document_id ?? null as string | null });
  const [invalid, setInvalid] = useState<Record<string, string>>({}), [pending, setPending] = useState<Pending>();
  const guard = useUnsavedGuard(), hydrated = useHydrated();
  const mutation = useFinanceMutation(value.deal_id, value.id, onSaved, denied, async (current, signal) => current.current.state !== "recognized" ? "La commission n’est pas reconnue. Revenez au suivi financier avant d’enregistrer un versement." : original ? receiptStillCurrent(value.id, original, originalPage, signal) : undefined, writable);
  const draft = useDossierDraft({ ...fields, recovery: mutation.uncertain }, mutation.busy);
  async function onSaved(result: { id: string; version: number }) { draft.accept({ ...fields, recovery: false }); await saved(result); }
  useEffect(() => { alive.current = true; form.current?.querySelector<HTMLElement>("input,select,textarea")?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => { if (Object.keys(invalid).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [invalid]);
  const disabled = !hydrated || mutation.busy || mutation.uncertain || !writable || Boolean(pending), label = original ? "Confirmer la correction d’encaissement" : "Confirmer l’encaissement";
  function change<K extends keyof typeof fields>(key: K, next: typeof fields[K]) { if (disabled || mutation.isBusy()) return; setFields(current => ({ ...current, [key]: next })); setInvalid({}); }
  async function save(body: unknown) { if (!hydrated || !writable) return; await mutation.save(`/api/v1/commissions/${value.id}/${original ? "correct" : "receipts"}`, body); if (alive.current) setPending(undefined); }
  function close() { if (!mutation.isBusy()) guard.request(cancel, form.current ?? undefined); }
  return <form ref={form} className="kay-drawer-form" data-draft-managed data-live-dirty={draft.dirty} data-write-recovery={mutation.uncertain} aria-busy={mutation.busy} aria-label={original ? "Correction d’encaissement" : "Nouvel encaissement"} noValidate onSubmit={event => {
    event.preventDefault(); if (disabled || mutation.isBusy() || source.current.state !== "recognized") return;
    const replacement = { amount_mad: fields.amount.trim().replace(",", "."), received_on: fields.date, reason: fields.reason, evidence_document_id: fields.evidence };
    const parsed = original ? correctReceiptSchema.safeParse({ target: "receipt", expected_version: expected, receipt_id: original.id, replacement: fields.voiding ? null : replacement, reason: fields.correctionReason }) : receiptCommandSchema.safeParse({ ...replacement, expected_version: expected });
    if (!parsed.success) { setInvalid(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join("."), issue.message]))); return; }
    setInvalid({}); setPending({ body: parsed.data, amount: replacement.amount_mad, date: fields.date, reason: original ? fields.correctionReason : fields.reason, balance: source.balance_mad ?? "0.00", voiding: fields.voiding });
  }}>
    <RecordEntry title={mad(source.current.amount_mad)} icon={FinanceIcon} meta={[{ label: "Solde reconnu", value: source.balance_mad === null ? "Non reconnu" : mad(source.balance_mad) }]}>{original ? <p>Original conservé : {original.amount_mad ? mad(original.amount_mad) : "Versement annulé"}, reçu le {original.received_on}.</p> : null}</RecordEntry>
    <fieldset disabled={disabled} className="grid min-w-0 gap-5 border-0 p-0"><legend className="sr-only">Versement et justification</legend><RecordSection title={original ? "Corriger un encaissement" : "Ajouter un encaissement"}>
      {original ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-mode`}>Type de correction</Label><NativeSelect id={`${id}-mode`} name="mode" value={fields.voiding ? "void" : "replace"} onChange={event => change("voiding", event.target.value === "void")}><option value="replace">Enregistrer un remplacement</option><option value="void">Annuler sans remplacement</option></NativeSelect></div> : null}
      {!fields.voiding ? <><div className="kay-form-pair"><FinanceField id={`${id}-amount`} name="amount" label="Montant encaissé (MAD)" value={fields.amount} changed={next => change("amount", next)} error={invalid[original ? "replacement.amount_mad" : "amount_mad"]} /><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-date`}>Date de réception</Label><Input id={`${id}-date`} name="date" type="date" value={fields.date} aria-required aria-invalid={Boolean(invalid[original ? "replacement.received_on" : "received_on"])} aria-describedby={invalid[original ? "replacement.received_on" : "received_on"] ? `${id}-validation` : undefined} onChange={event => change("date", event.target.value)} /></div></div>
      <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-reason`}>Justification du versement</Label><Textarea id={`${id}-reason`} name="reason" value={fields.reason} maxLength={1000} aria-required aria-invalid={Boolean(invalid[original ? "replacement.reason" : "reason"])} aria-describedby={invalid[original ? "replacement.reason" : "reason"] ? `${id}-validation` : undefined} onChange={event => change("reason", event.target.value)} /></div><EvidencePicker dealId={value.deal_id} contactId={contactId} value={fields.evidence} changed={next => change("evidence", next)} disabled={disabled} denied={denied} /></> : null}
      {original ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-correction`}>Motif de correction</Label><Textarea id={`${id}-correction`} name="correctionReason" value={fields.correctionReason} maxLength={1000} aria-required aria-invalid={Boolean(invalid.reason)} aria-describedby={invalid.reason ? `${id}-validation` : undefined} onChange={event => change("correctionReason", event.target.value)} /></div> : null}
    </RecordSection></fieldset>
    {!writable ? <p role="status" className="text-sm text-muted-foreground">Dossier ou contact archivé : la finance est en lecture seule.</p> : null}
    {Object.keys(invalid).length ? <p id={`${id}-validation`} role="alert" className="text-sm text-danger">Indiquez un montant positif avec deux décimales au plus, une date et les justifications requises.</p> : null}
    <FinanceFailure mutation={mutation} acceptVersion={(version, current) => { setExpected(version); if (current) setSource(current); }} />
    <footer className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={mutation.busy} onClick={close}>Annuler</Button><Button action="preview" ref={submit} type="submit" disabled={disabled || source.current.state !== "recognized"}>{original ? "Vérifier la correction" : "Vérifier l’encaissement"}</Button></footer>
    {pending ? <FinanceConfirmation title={label} busy={mutation.busy} disabled={!hydrated || !writable} confirm={() => void save(pending.body)} cancel={() => setPending(undefined)} returnFocus={submit}><p>{pending.voiding ? "Le versement sera annulé dans le solde, sans supprimer l’original." : `Versement à confirmer : ${mad(pending.amount)}, reçu le ${pending.date}.`}</p><p>Solde avant cette opération : {mad(pending.balance)}.</p><p className="whitespace-pre-wrap wrap-anywhere">{pending.reason}</p></FinanceConfirmation> : null}
    {guard.dialog}
  </form>;
}

export function EvidencePicker({ dealId, contactId, value, changed, disabled, denied }: { dealId: string; contactId: string; value: string | null; changed: (value: string | null) => void; disabled: boolean; denied: Denied }) {
  const id = useId(), [source, setSource] = useState("deal"), [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${source}&parent_id=${source === "deal" ? dealId : contactId}&page=${page}&page_size=${FINANCE_PAGE_SIZE}`, documentsSchema);
  const invalid = query.value && !financePageValid(query.value, page);
  const items = query.error || invalid ? [] : query.value?.items.filter(item => !item.archived && item.versions[0]?.state === "clean") ?? [];
  useEffect(() => { if (query.error && financeDenied(query.error)) denied(query.error); }, [query.error, denied]);
  return <section className="grid min-w-0 gap-4" aria-label="Pièce justificative facultative"><div className="kay-form-pair"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-source`}>Pièces à consulter</Label><NativeSelect id={`${id}-source`} value={source} disabled={disabled} onChange={event => { setSource(event.target.value); setPage(1); changed(null); }}><option value="deal">Documents de l’affaire</option><option value="contact">Documents du contact</option></NativeSelect></div><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-document`}>Justificatif (facultatif)</Label><NativeSelect id={`${id}-document`} value={value ?? ""} disabled={disabled || !query.value || Boolean(query.error) || Boolean(invalid)} onChange={event => changed(event.target.value || null)}><option value="">Sans pièce jointe</option>{value && !items.some(item => item.id === value) ? <option value={value}>Pièce déjà sélectionnée conservée</option> : null}{items.map(item => <option key={item.id} value={item.id}>{item.filename}</option>)}</NativeSelect></div></div>
    {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des justificatifs…</p> : <><p className="text-xs text-muted-foreground">Pièces actuelles et propres uniquement. La version du justificatif est conservée avec le versement.</p>{!items.length ? <p className="text-sm text-muted-foreground">Aucune pièce propre sur cette page. Le justificatif reste facultatif.</p> : null}{query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} size={FINANCE_PAGE_SIZE} total={query.value.total} label="Pages des justificatifs financiers" change={next => { setPage(next); changed(null); }} /> : null}</>}
  </section>;
}
