"use client";
import { FinanceIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { calculatedAmount, correctCommissionSchema, mad, newCommissionSchema, type Commission } from "./contracts";
import { FinanceConfirmation } from "./confirmation";
import { FinanceFailure, useFinanceMutation, type Denied, type Saved } from "./mutation";

export function TermsForm({ dealId, dealVersion, value, saved, denied, cancel }: { dealId: string; dealVersion: number; value?: Commission; saved: Saved; denied: Denied; cancel: () => void }) {
  const form = useRef<HTMLFormElement>(null), id = useId(), first = useRef<HTMLSelectElement>(null), submit = useRef<HTMLButtonElement>(null);
  const [kind, setKind] = useState<"fixed" | "percentage">(value?.current.kind ?? "fixed"), [base, setBase] = useState(value?.current.base_mad ?? ""), [rate, setRate] = useState(value?.current.rate_percent ?? ""), [amount, setAmount] = useState(value?.current.amount_mad ?? ""), [due, setDue] = useState(value?.current.due_on ?? ""), [reason, setReason] = useState("");
  const [expected, setExpected] = useState(value?.version ?? dealVersion), [invalid, setInvalid] = useState<Record<string, string>>({}), [pending, setPending] = useState<unknown>();
  const mutation = useFinanceMutation(dealId, value?.id, saved, denied);
  useEffect(() => { first.current?.focus(); }, []);
  const terms = { kind, base_mad: base.trim().replace(",", "."), rate_percent: kind === "percentage" ? rate.trim().replace(",", ".") : null, amount_mad: kind === "fixed" ? amount.trim().replace(",", ".") : null, due_on: due || null };
  const preview = calculatedAmount(terms), label = value ? "Confirmer la correction de commission" : "Enregistrer la commission prévue";
  async function save(body: unknown) { await mutation.save(value ? `/api/v1/commissions/${value.id}/correct` : `/api/v1/deals/${dealId}/commissions`, body); setPending(undefined); }
  return <form ref={form} className="grid min-w-0 gap-6 border-t pt-5" aria-label={value ? "Correction de commission" : "Nouvelle commission"} noValidate onSubmit={event => { event.preventDefault(); const parsed = value ? correctCommissionSchema.safeParse({ ...terms, target: "commission", expected_version: expected, reason }) : newCommissionSchema.safeParse({ ...terms, expected_deal_version: expected }); if (!parsed.success) { setInvalid(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; } setInvalid({}); if (value) setPending(parsed.data); else void save(parsed.data); }}>
    <SectionHeading as="h3" icon={FinanceIcon} tone="teal">{value ? "Corriger la commission" : "Prévoir une commission facultative"}</SectionHeading><p>Une commission prévue n’est ni reconnue ni encaissée. Le calcul conserve la base et le taux exacts ; seul le montant MAD final est arrondi à deux décimales.</p>
    <div className="grid gap-4"><div className="grid gap-2"><Label htmlFor={`${id}-kind`}>Mode de commission</Label><NativeSelect ref={first} id={`${id}-kind`} value={kind} disabled={mutation.busy} onChange={event => setKind(event.target.value as "fixed" | "percentage")}><option value="fixed">Montant fixe</option><option value="percentage">Pourcentage</option></NativeSelect></div>
      <FinanceField id={`${id}-base`} label="Base explicite (MAD)" value={base} changed={setBase} disabled={mutation.busy} error={invalid.base_mad} />
      {kind === "fixed" ? <FinanceField id={`${id}-amount`} label="Montant de commission (MAD)" value={amount} changed={setAmount} disabled={mutation.busy} error={invalid.amount_mad} /> : <FinanceField id={`${id}-rate`} label="Taux de commission (%)" value={rate} changed={setRate} disabled={mutation.busy} error={invalid.rate_percent} />}
      <div className="grid gap-2"><Label htmlFor={`${id}-due`}>Échéance (facultative)</Label><Input id={`${id}-due`} type="date" value={due} disabled={mutation.busy} onChange={event => setDue(event.target.value)} aria-invalid={Boolean(invalid.due_on)} /></div>
      {value ? <div className="grid gap-2"><Label htmlFor={`${id}-reason`}>Motif de correction</Label><Textarea id={`${id}-reason`} value={reason} maxLength={1000} aria-required aria-invalid={Boolean(invalid.reason)} aria-describedby={invalid.reason ? `${id}-reason-error` : undefined} disabled={mutation.busy} onChange={event => setReason(event.target.value)} />{invalid.reason ? <p id={`${id}-reason-error`} className="text-danger">Expliquez la correction (1 à 1 000 caractères).</p> : null}</div> : null}
    </div>{Object.keys(invalid).length ? <p role="alert" className="text-danger">Vérifiez les champs indiqués. Base/taux : au plus huit décimales ; montant : deux décimales, strictement positif.</p> : null}<p role="status">Montant calculé : {preview ? mad(preview) : "renseignez une base et un montant ou taux valides"}.</p>
    <FinanceFailure mutation={mutation} acceptVersion={setExpected} /><div className="flex flex-wrap gap-2"><Button action={value ? "preview" : "save"} ref={submit} type="submit" disabled={mutation.busy}>{mutation.busy ? "Enregistrement…" : value ? "Vérifier la correction" : label}</Button><Button action="close" type="button" variant="outline" disabled={mutation.busy} onClick={cancel}>Fermer le formulaire</Button></div>
    {pending ? <FinanceConfirmation title={label} busy={mutation.busy} cancel={() => setPending(undefined)} returnFocus={submit} confirm={() => void save(pending)}><p>Montant précédent : {mad(mutation.latest?.current.amount_mad ?? value!.current.amount_mad)}</p><p>Nouveau montant : {mad(preview!)}</p><p>Base : {mad(terms.base_mad)}{kind === "percentage" ? ` ; taux : ${terms.rate_percent} %` : ""}</p><p className="whitespace-pre-wrap wrap-anywhere">Motif : {reason}</p><p>L’original et les encaissements restent conservés. Cette confirmation enregistre aussi votre revue après une réouverture.</p></FinanceConfirmation> : null}
  </form>;
}

export function FinanceField({ id, label, value, changed, disabled, error }: { id: string; label: string; value: string; changed: (value: string) => void; disabled: boolean; error?: string }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label><Input id={id} inputMode="decimal" value={value} disabled={disabled} aria-required aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => changed(event.target.value)} />{error ? <p id={`${id}-error`} className="text-danger">Indiquez une valeur décimale strictement positive, sans notation scientifique.</p> : null}</div>;
}
