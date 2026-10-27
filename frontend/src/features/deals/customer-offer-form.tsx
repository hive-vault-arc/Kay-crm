"use client";
import { useEffect, useId, useRef, useState } from "react";
import { DealIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { offerStatusLabels, stageLabels, type OfferFields } from "./contracts";
import { OfferFacts } from "./customer-offer-facts";
import { proposalBody, proposalValues, proposalWritable, readProposalComparison, type ProposalComparison } from "./customer-offer-model";
import type { MutateDeal } from "./pipeline";

export function CustomerOfferForm({ initial, writable, busy: externalBusy, busyChanged, mutate, error, denied, saved, cancel }: {
  initial: ProposalComparison; writable: boolean; busy: boolean; busyChanged?: (busy: boolean) => void; mutate: MutateDeal; error?: ApiError; denied?: (error: ApiError) => void; saved: () => void; cancel: () => void;
}) {
  const id = useId(), scope = useRef<HTMLFormElement>(null), alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null), ownsBusy = useRef(false), busyHandler = useRef(busyChanged);
  const [source, setSource] = useState(initial), [values, setValues] = useState(() => proposalValues(initial.deal, initial.proposal));
  const [saving, setSaving] = useState(false), [readBusy, setReadBusy] = useState(false), [attempted, setAttempted] = useState(false), [invalid, setInvalid] = useState<string[]>([]), [notice, setNotice] = useState("");
  const [readError, setReadError] = useState<ApiError>(), [localError, setLocalError] = useState<ApiError>(), [scopeError, setScopeError] = useState<ApiError>(), [reviewedError, setReviewedError] = useState<ApiError>(), [comparison, setComparison] = useState<ProposalComparison>();
  const busy = externalBusy || saving || readBusy, hydrated = useHydrated(), guard = useUnsavedGuard(), draft = useDossierDraft(values, busy);
  const commandError = localError ?? (!attempted || error === reviewedError ? undefined : error), blocked = !writable || !proposalWritable(source.deal);
  useEffect(() => { busyHandler.current = busyChanged; }, [busyChanged]);
  useEffect(() => { alive.current = true; scope.current?.querySelector<HTMLElement>('[name="amount_mad"]')?.focus(); return () => { alive.current = false; reading.current?.abort(); if (ownsBusy.current) busyHandler.current?.(false); }; }, []);
  function failure(failure: ApiError) {
    if ([401, 403, 404].includes(failure.status)) { const empty = proposalValues(initial.deal); setValues(empty); draft.accept(empty); setComparison(undefined); setScopeError(failure); setNotice(""); denied?.(failure); }
  }
  function install(current: ProposalComparison, keep: boolean) {
    if (current.deal.id !== initial.deal.id || current.proposal?.id !== initial.proposal?.id || current.proposal && current.proposal.deal_id !== current.deal.id || keep && !proposalWritable(current.deal)) return;
    const next = proposalValues(current.deal, current.proposal); setSource(current); if (!keep) { setValues(next); setInvalid([]); }
    draft.accept(next); setComparison(undefined); setReadError(undefined); setLocalError(undefined); setScopeError(undefined); setNotice(""); setReviewedError(error);
  }
  async function compare(reload = false) {
    if (lock.current || externalBusy) return; lock.current = true; setReadBusy(true); setReadError(undefined); ownsBusy.current = true; busyHandler.current?.(true);
    const abort = new AbortController(); reading.current = abort;
    try { const current = await readProposalComparison(initial.deal.id, initial.proposal?.id, abort.signal); if (alive.current && !abort.signal.aborted) { if (reload) install(current, false); else setComparison(current); } }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const failureValue = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(failureValue); failure(failureValue); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); ownsBusy.current = false; busyHandler.current?.(false); } }
  }
  async function save() {
    if (!hydrated || lock.current || externalBusy || blocked || scopeError || comparison) return;
    const parsed = proposalBody(source, values);
    if (!parsed.success) { const fields = parsed.error.issues.map(issue => String(issue.path[0])); setInvalid(fields); scope.current?.querySelector<HTMLElement>(`[name="${fields[0]}"]`)?.focus(); return; }
    lock.current = true; setSaving(true); setAttempted(true); setInvalid([]); setReadError(undefined); setLocalError(undefined); setNotice("");
    try {
      const accepted = await mutate(source.proposal ? `/api/v1/customer-offers/${source.proposal.id}` : `/api/v1/deals/${source.deal.id}/customer-offers`, parsed.data, source.proposal ? "PATCH" : "POST");
      if (!alive.current) return;
      if (accepted) { draft.accept(); saved(); } else setNotice("La proposition n’a pas été confirmée. Votre saisie reste affichée.");
    } catch (reason) { if (alive.current) { const failureValue = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setLocalError(failureValue); failure(failureValue); } }
    finally { if (alive.current) { lock.current = false; setSaving(false); } }
  }
  function change<K extends keyof OfferFields>(key: K, value: OfferFields[K]) { setValues(current => ({ ...current, [key]: value })); }
  const described = (field: string) => invalid.includes(field) ? `${id}-validation` : undefined;
  if (scopeError) return <div className="grid min-w-0 gap-4" aria-busy={readBusy}><RecordError error={readError ?? scopeError} retry={() => void compare(true)} /><Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Fermer</Button></div>;
  return <>{guard.dialog}<form ref={scope} className="kay-drawer-form" noValidate aria-label={source.proposal ? "Modifier une proposition client" : "Nouvelle proposition client"} aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} onSubmit={event => { event.preventDefault(); void save(); }}>
    <RecordEntry icon={DealIcon} title={source.deal.title} meta={[{ label: "Étape", value: stageLabels[source.deal.stage] }, { label: "Version de l’affaire", value: source.deal.version }]} />
    {commandError ? <RecordError error={commandError} /> : null}{readError ? <RecordError error={readError} retry={() => void compare()} /> : null}
    {commandError?.code === "DEPENDENCY_UNAVAILABLE" ? <p className="text-sm text-muted-foreground">Une réponse interrompue peut avoir été enregistrée. Réessayez sans modifier votre saisie pour récupérer le résultat de cette tentative.</p> : null}
    {!commandError && notice ? <p role="status" className="text-sm text-warning">{notice}</p> : null}
    {commandError && ["DEAL_VERSION_CONFLICT", "DEAL_OFFER_PERIOD_MISMATCH"].includes(commandError.code) && !comparison ? <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void compare()}>Comparer la proposition actuelle</Button> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.deal.version}`} description="Votre saisie reste conservée. Comparez la proposition et le contexte de l’affaire avant de poursuivre."><RecordEntry icon={DealIcon} title={comparison.deal.title} meta={[{ label: "Étape", value: stageLabels[comparison.deal.stage] }, { label: "Offre d’inventaire", value: comparison.deal.offering ? `${comparison.deal.offering.kind === "sale" ? "Vente" : "Location"}${comparison.deal.offering.price_period === "year" ? " · par an" : comparison.deal.offering.price_period === "month" ? " · par mois" : ""}` : "Non renseignée" }]} />{comparison.proposal ? <OfferFacts value={comparison.proposal} /> : null}{proposalWritable(comparison.deal) ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={busy} onClick={() => guard.request(() => install(comparison, false), scope.current ?? undefined)}>Recharger cette version</Button><Button action="compare" type="button" variant="outline" disabled={busy} onClick={() => install(comparison, true)}>Conserver ma saisie sur cette version</Button></div> : <p role="status" className="text-sm text-warning">Affaire clôturée ou archivée : cette proposition reste en lecture seule.</p>}</RecordSection> : null}
    {blocked ? <p role="status" className="text-sm text-warning">Cette affaire n’autorise plus de modification de proposition.</p> : null}
    <fieldset disabled={!hydrated || busy || blocked || Boolean(comparison)} className="grid min-w-0 gap-5"><legend className="sr-only">Conditions de la proposition</legend>
      <RecordSection title="Montant et réponse" description="MAD uniquement. Conservez la période du prix proposé ; la comparaison annuelle reste exacte."><div className="kay-form-pair">
        <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-amount`}>Montant proposé (MAD)</Label><Input id={`${id}-amount`} name="amount_mad" value={values.amount_mad} required inputMode="decimal" maxLength={19} aria-invalid={invalid.includes("amount_mad")} aria-describedby={described("amount_mad")} onChange={event => change("amount_mad", event.target.value)} /></div>
        <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-period`}>Période du prix proposé</Label><NativeSelect id={`${id}-period`} name="price_period" value={values.price_period ?? "sale"} aria-invalid={invalid.includes("price_period")} aria-describedby={described("price_period")} onChange={event => change("price_period", event.target.value === "sale" ? null : event.target.value as "month" | "year")}><option value="sale">Vente (sans période)</option><option value="month">Location par mois</option><option value="year">Location par an</option></NativeSelect></div>
        <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-status`}>Statut de la proposition</Label><NativeSelect id={`${id}-status`} name="status" value={values.status} aria-invalid={invalid.includes("status")} aria-describedby={described("status")} onChange={event => change("status", event.target.value as OfferFields["status"])}>{Object.entries(offerStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</NativeSelect></div>
        <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-expiry`}>Échéance (facultative)</Label><Input id={`${id}-expiry`} name="expires_on" type="date" value={values.expires_on ?? ""} aria-invalid={invalid.includes("expires_on")} aria-describedby={described("expires_on")} onChange={event => change("expires_on", event.target.value || null)} /></div>
      </div></RecordSection>
      <RecordSection title="Conditions"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-conditions`}>Conditions proposées</Label><Textarea id={`${id}-conditions`} name="conditions" value={values.conditions} maxLength={4000} rows={4} aria-invalid={invalid.includes("conditions")} aria-describedby={described("conditions")} onChange={event => change("conditions", event.target.value)} /></div></RecordSection>
    </fieldset>
    {invalid.length ? <p id={`${id}-validation`} role="alert" className="text-sm text-danger">Indiquez un montant positif avec deux décimales maximum, une période valide, une date réelle si renseignée et des conditions de 4 000 caractères maximum.</p> : null}
    <p className="text-sm text-muted-foreground">Une acceptation ne clôture pas l’affaire et ne réserve aucun bien. L’échéance n’entraîne aucune expiration automatique. Chaque modification conserve son auteur dans l’historique.</p>
    <div className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button><Button action="save" type="submit" disabled={!hydrated || busy || blocked || Boolean(comparison)}>{busy ? "Enregistrement…" : "Enregistrer la proposition"}</Button></div>
  </form></>;
}
