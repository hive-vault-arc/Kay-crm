"use client";
import { useEffect, useRef, useState } from "react";
import { RecordEntry } from "@/components/shared/record-entry";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { stageLabels, type Deal } from "@/features/deals/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { mad, resultSchema, type Commission } from "./contracts";
import { financeDenied, readCommission, readFinanceDeal } from "./model";

type Result = { id: string; version: number };
export type Saved = (result: Result) => void | Promise<void>;
export type Denied = (error: ApiError) => void;
type Comparison = { version: number; commission?: Commission; deal?: Deal; blocked?: string };
type Attempt = { path: `/api/v1/${string}`; body: unknown; fingerprint: string; key: string; result?: Result; uncertain: boolean };
type Verify = (commission: Commission, signal: AbortSignal) => string | undefined | Promise<string | undefined>;

export function useFinanceMutation(dealId: string, commissionId: string | undefined, saved: Saved, denied: Denied, verify?: Verify, writable = true) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [comparison, setComparison] = useState<Comparison>(), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  const lock = useRef(false), attempt = useRef<Attempt | undefined>(undefined), alive = useRef(true), request = useRef<AbortController | null>(null);
  const hydrated = useHydrated();
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  async function save(path: `/api/v1/${string}`, body: unknown) {
    if (!hydrated || lock.current || !alive.current || !writable && !attempt.current?.result) return false;
    const fingerprint = JSON.stringify({ path, body }), previous = attempt.current;
    if (previous?.uncertain && previous.fingerprint !== fingerprint) return false;
    const current: Attempt = previous?.fingerprint === fingerprint ? previous : { path, body, fingerprint, key: crypto.randomUUID(), uncertain: false };
    attempt.current = current;
    lock.current = true; setBusy(true); setError(undefined); setComparison(undefined);
    const abort = new AbortController(); request.current = abort;
    try {
      if (!current.result) {
        const result = await apiCommand(current.path, current.body, resultSchema, current.key, "POST", undefined, abort.signal);
        if (!alive.current || abort.signal.aborted) return false;
        if (commissionId && result.id !== commissionId) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
        current.result = result; setAcknowledged(true);
      }
      await saved(current.result);
      if (!alive.current || abort.signal.aborted) return false;
      attempt.current = undefined; setUncertain(false); setAcknowledged(false);
      return true;
    } catch (failure) {
      if (!alive.current || abort.signal.aborted) return false;
      const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      current.uncertain = Boolean(current.result) || problem.status >= 500 || problem.code === "INVALID_RESPONSE";
      setUncertain(current.uncertain); setError(problem);
      if (financeDenied(problem)) denied(problem);
      return false;
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function compare() {
    if (!hydrated || lock.current || !alive.current || attempt.current?.uncertain) return;
    lock.current = true; setBusy(true); setComparison(undefined);
    const abort = new AbortController(); request.current = abort;
    try {
      let candidate: Comparison;
      if (commissionId) {
        const current = await readCommission(commissionId, dealId, abort.signal);
        candidate = { version: current.version, commission: current, blocked: verify ? await verify(current, abort.signal) : undefined };
      } else {
        const current = await readFinanceDeal(dealId, abort.signal);
        candidate = { version: current.version, deal: current, blocked: current.contact.archived_at || current.archived_at ? "Le dossier ou le contact est archivé. La finance est en lecture seule." : undefined };
      }
      if (!writable && !candidate.blocked) candidate.blocked = "Le dossier ou le contact est archivé. La finance est en lecture seule.";
      if (alive.current && !abort.signal.aborted) setComparison(candidate);
    } catch (failure) {
      if (!alive.current || abort.signal.aborted) return;
      const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem);
      if (financeDenied(problem)) denied(problem);
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function clear() { if (lock.current || attempt.current?.uncertain) return; attempt.current = undefined; setError(undefined); setComparison(undefined); setAcknowledged(false); }
  return { busy, error, comparison, latest: comparison?.commission, uncertain, acknowledged, writable, save, compare, clear, isBusy: () => lock.current, retry: () => attempt.current ? save(attempt.current.path, attempt.current.body) : Promise.resolve(false) };
}

export function FinanceFailure({ mutation, acceptVersion }: { mutation: ReturnType<typeof useFinanceMutation>; acceptVersion: (version: number, commission?: Commission) => void }) {
  if (!mutation.error) return null;
  const current = mutation.comparison;
  return <section className="grid min-w-0 gap-4" aria-label="Reprise de l’action financière"><RecordError error={mutation.error} />
    {mutation.uncertain ? <><p className="text-sm text-muted-foreground">{mutation.acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans enregistrer une seconde fois." : "La réponse a été interrompue. Réessayez exactement l’opération confirmée pour retrouver son résultat."}</p><Button action="retry" type="button" variant="outline" disabled={mutation.busy || !mutation.writable && !mutation.acknowledged} onClick={() => void mutation.retry()}>{mutation.acknowledged ? "Actualiser l’opération enregistrée" : "Réessayer la même opération"}</Button></> : <><p className="text-sm text-muted-foreground">Votre saisie est conservée. Comparez la version actuelle avant de reprendre un conflit.</p>{mutation.error.status === 409 ? <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={mutation.busy} onClick={() => void mutation.compare()}>Comparer la version financière actuelle</Button> : null}</>}
    {current ? <RecordEntry title={`Version actuelle · ${current.version}`} meta={current.commission ? [{ label: "Montant", value: mad(current.commission.current.amount_mad) }, { label: "Calcul", value: current.commission.current.kind === "fixed" ? "Montant fixe" : `${current.commission.current.rate_percent} %` }, { label: "Base", value: mad(current.commission.current.base_mad) }, { label: "Échéance", value: current.commission.current.due_on ?? "Non renseignée" }, { label: "État", value: current.commission.current.state === "recognized" ? "Reconnue" : "Prévue" }, { label: "Encaissé", value: mad(current.commission.collected_mad) }, { label: "Solde", value: current.commission.balance_mad === null ? "Non reconnu" : mad(current.commission.balance_mad) }] : current.deal ? [{ label: "Contact", value: current.deal.contact.name }, { label: "Affaire", value: current.deal.title }, { label: "Étape", value: stageLabels[current.deal.stage] }] : []} actions={!current.blocked ? <Button action="compare" type="button" variant="outline" disabled={mutation.busy || mutation.uncertain || !mutation.writable} onClick={() => { acceptVersion(current.version, current.commission); mutation.clear(); }}>Conserver ma saisie avec cette version</Button> : undefined}>{current.blocked ? <p role="status">{current.blocked}</p> : current.commission?.current.review_required ? <p className="text-warning">Revue financière requise après réouverture.</p> : null}</RecordEntry> : null}
  </section>;
}
