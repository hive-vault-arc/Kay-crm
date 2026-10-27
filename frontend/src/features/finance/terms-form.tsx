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
import { useHydrated } from "@/hooks/use-hydrated";
import { calculatedAmount, correctCommissionSchema, mad, newCommissionSchema, type Commission } from "./contracts";
import { FinanceConfirmation } from "./confirmation";
import { FinanceFailure, useFinanceMutation, type Denied, type Saved } from "./mutation";

type Pending = { body: unknown; preview: string; before?: string; base: string; rate: string | null; reason: string };
const initial = (value?: Commission) => ({ kind: value?.current.kind ?? "fixed", base: value?.current.base_mad ?? "", rate: value?.current.rate_percent ?? "", amount: value?.current.kind === "fixed" ? value.current.amount_mad : "", due: value?.current.due_on ?? "", reason: "" });
export function TermsForm({ dealId, dealVersion, value, saved, denied, cancel, writable = true }: { dealId: string; dealVersion: number; value?: Commission; saved: Saved; denied: Denied; cancel: () => void; writable?: boolean }) {
  const form = useRef<HTMLFormElement>(null), id = useId(), first = useRef<HTMLSelectElement>(null), submit = useRef<HTMLButtonElement>(null), alive = useRef(true);
  const [source, setSource] = useState(value), [fields, setFields] = useState(() => initial(value)), [expected, setExpected] = useState(value?.version ?? dealVersion);
  const [invalid, setInvalid] = useState<Record<string, string>>({}), [pending, setPending] = useState<Pending>();
  const hydrated = useHydrated(), guard = useUnsavedGuard();
  const mutation = useFinanceMutation(dealId, value?.id, onSaved, denied, undefined, writable);
  const draft = useDossierDraft({ ...fields, recovery: mutation.uncertain }, mutation.busy);
  async function onSaved(result: { id: string; version: number }) { draft.accept({ ...fields, recovery: false }); await saved(result); }
  useEffect(() => { alive.current = true; first.current?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => { if (Object.keys(invalid).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [invalid]);
  const terms = { kind: fields.kind, base_mad: fields.base.trim().replace(",", "."), rate_percent: fields.kind === "percentage" ? fields.rate.trim().replace(",", ".") : null, amount_mad: fields.kind === "fixed" ? fields.amount.trim().replace(",", ".") : null, due_on: fields.due || null };
  const preview = calculatedAmount(terms), disabled = !hydrated || mutation.busy || mutation.uncertain || !writable || Boolean(pending);
  const label = value ? "Confirmer la correction de commission" : "Enregistrer la commission prévue";
  function change(key: keyof typeof fields, next: string) { if (disabled || mutation.isBusy()) return; setFields(current => ({ ...current, [key]: next })); setInvalid({}); }
  async function save(body: unknown) { if (!hydrated || !writable) return; await mutation.save(value ? `/api/v1/commissions/${value.id}/correct` : `/api/v1/deals/${dealId}/commissions`, body); if (alive.current) setPending(undefined); }
  function close() { if (!mutation.isBusy()) guard.request(cancel, form.current ?? undefined); }
  return <form ref={form} className="kay-drawer-form" data-draft-managed data-live-dirty={draft.dirty} data-write-recovery={mutation.uncertain} aria-busy={mutation.busy} aria-label={value ? "Correction de commission" : "Nouvelle commission"} noValidate onSubmit={event => {
    event.preventDefault(); if (disabled || mutation.isBusy()) return;
    const parsed = value ? correctCommissionSchema.safeParse({ ...terms, target: "commission", expected_version: expected, reason: fields.reason }) : newCommissionSchema.safeParse({ ...terms, expected_deal_version: expected });
    if (!parsed.success) { setInvalid(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return; }
    setInvalid({}); if (value) setPending({ body: parsed.data, preview: preview!, before: source?.current.amount_mad, base: terms.base_mad, rate: terms.rate_percent, reason: fields.reason }); else void save(parsed.data);
  }}>
    <fieldset disabled={disabled} className="grid min-w-0 gap-5 border-0 p-0"><legend className="sr-only">Calcul de commission</legend><RecordSection title={value ? "Corriger la commission" : "Prévoir une commission"} description="Une commission prévue n’est ni reconnue ni encaissée.">
      <div className="kay-form-pair"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-kind`}>Mode de commission</Label><NativeSelect ref={first} id={`${id}-kind`} name="kind" value={fields.kind} onChange={event => change("kind", event.target.value)}><option value="fixed">Montant fixe</option><option value="percentage">Pourcentage</option></NativeSelect></div><FinanceField id={`${id}-base`} name="base" label="Base explicite (MAD)" value={fields.base} changed={next => change("base", next)} error={invalid.base_mad} />
      {fields.kind === "fixed" ? <FinanceField id={`${id}-amount`} name="amount" label="Montant de commission (MAD)" value={fields.amount} changed={next => change("amount", next)} error={invalid.amount_mad} /> : <FinanceField id={`${id}-rate`} name="rate" label="Taux de commission (%)" value={fields.rate} changed={next => change("rate", next)} error={invalid.rate_percent} />}
      <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-due`}>Échéance (facultative)</Label><Input id={`${id}-due`} name="due" type="date" value={fields.due} onChange={event => change("due", event.target.value)} aria-invalid={Boolean(invalid.due_on)} /></div></div>
      {value ? <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-reason`}>Motif de correction</Label><Textarea id={`${id}-reason`} name="reason" value={fields.reason} maxLength={1000} aria-required aria-invalid={Boolean(invalid.reason)} aria-describedby={invalid.reason ? `${id}-reason-error` : undefined} onChange={event => change("reason", event.target.value)} />{invalid.reason ? <p id={`${id}-reason-error`} className="text-sm text-danger">Expliquez la correction (1 à 1 000 caractères).</p> : null}</div> : null}
    </RecordSection></fieldset>
    <RecordEntry title={preview ? mad(preview) : "Montant à calculer"} icon={FinanceIcon}><p className="text-sm text-muted-foreground">Base et taux exacts ; seul le montant MAD final est arrondi à deux décimales.</p></RecordEntry>
    {!writable ? <p role="status" className="text-sm text-muted-foreground">Dossier ou contact archivé : la finance est en lecture seule.</p> : null}
    {Object.keys(invalid).length ? <p role="alert" className="text-sm text-danger">Vérifiez les champs indiqués. Base/taux : huit décimales au plus ; montant : deux décimales, strictement positif.</p> : null}
    <FinanceFailure mutation={mutation} acceptVersion={(version, current) => { setExpected(version); if (current) { setSource(current); draft.accept({ ...initial(current), recovery: false }); } }} />
    <footer className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={mutation.busy} onClick={close}>Annuler</Button><Button action={value ? "preview" : "save"} ref={submit} type="submit" disabled={disabled}>{mutation.busy ? "Enregistrement…" : value ? "Vérifier la correction" : label}</Button></footer>
    {pending ? <FinanceConfirmation title={label} busy={mutation.busy} disabled={!hydrated || !writable} cancel={() => setPending(undefined)} returnFocus={submit} confirm={() => void save(pending.body)}><p>Montant précédent : {mad(pending.before ?? "0.00")}</p><p>Nouveau montant : {mad(pending.preview)}</p><p>Base : {mad(pending.base)}{pending.rate !== null ? ` ; taux : ${pending.rate} %` : ""}</p><p className="whitespace-pre-wrap wrap-anywhere">Motif : {pending.reason}</p><p>L’original et les encaissements restent conservés. Cette confirmation consigne aussi votre revue après réouverture.</p></FinanceConfirmation> : null}
    {guard.dialog}
  </form>;
}

export function FinanceField({ id, name, label, value, changed, disabled = false, error }: { id: string; name?: string; label: string; value: string; changed: (value: string) => void; disabled?: boolean; error?: string }) {
  return <div className="grid min-w-0 gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} inputMode="decimal" maxLength={40} value={value} disabled={disabled} aria-required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => changed(event.target.value)} />{error ? <p id={`${id}-error`} className="text-sm text-danger">Indiquez une valeur décimale strictement positive, sans notation scientifique.</p> : null}</div>;
}
