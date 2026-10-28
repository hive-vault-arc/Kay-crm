"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { resultSchema } from "./contracts";
import { requirementDenied, type RequirementComparison } from "./model";
import { RequirementFacts } from "./requirement-facts";
import { OfferingFacts } from "./offering-card";

export type RequirementResult = { id: string; version: number };
export type RequirementSaved = (value: RequirementResult, signal: AbortSignal) => void | Promise<void>;
export type RequirementDenied = (error: ApiError) => void;
type Method = "POST" | "PATCH" | "DELETE";
type Attempt = { path: `/api/v1/${string}`; method: Method; body: unknown; fingerprint: string; key: string; result?: RequirementResult; uncertain: boolean };

export function useRequirementCommand({ id, writable, saved, denied, compare }: { id?: string; writable: boolean; saved: RequirementSaved; denied: RequirementDenied; compare: (signal: AbortSignal) => Promise<RequirementComparison> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [comparison, setComparison] = useState<RequirementComparison>();
  const lock = useRef(false), alive = useRef(true), request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined), hydrated = useHydrated();
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  async function save(path: `/api/v1/${string}`, body: unknown, method: Method) {
    if (!hydrated || lock.current || !alive.current || !writable && !attempt.current?.result) return false;
    const fingerprint = JSON.stringify({ path, method, body });
    if (attempt.current?.uncertain && attempt.current.fingerprint !== fingerprint) return false;
    const current: Attempt = attempt.current?.fingerprint === fingerprint ? attempt.current : { path, method, body, fingerprint, key: crypto.randomUUID(), uncertain: false };
    attempt.current = current; lock.current = true; setBusy(true); setError(undefined); setComparison(undefined);
    const abort = new AbortController(); request.current = abort;
    try {
      if (!current.result) {
        const result = await apiCommand(current.path, current.body, resultSchema, current.key, current.method, undefined, abort.signal);
        if (!alive.current || abort.signal.aborted) return false;
        if (id && result.id !== id) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
        current.result = result; setAcknowledged(true);
      }
      await saved(current.result, abort.signal);
      if (!alive.current || abort.signal.aborted) return false;
      attempt.current = undefined; setUncertain(false); setAcknowledged(false); return true;
    } catch (failure) {
      if (!alive.current || abort.signal.aborted) return false;
      const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      current.uncertain = Boolean(current.result) || problem.status >= 500 || problem.code === "INVALID_RESPONSE";
      setUncertain(current.uncertain); setError(problem); if (requirementDenied(problem)) denied(problem); return false;
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function readComparison() {
    if (!hydrated || lock.current || !alive.current || attempt.current?.uncertain) return;
    lock.current = true; setBusy(true); setComparison(undefined); const abort = new AbortController(); request.current = abort;
    try { const current = await compare(abort.signal); if (alive.current && !abort.signal.aborted) setComparison({ ...current, blocked: current.blocked ?? (!writable ? "Ce dossier est en lecture seule." : undefined) }); }
    catch (failure) { if (alive.current && !abort.signal.aborted) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (requirementDenied(problem)) denied(problem); } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function clear() { if (lock.current || attempt.current?.uncertain) return; attempt.current = undefined; setError(undefined); setComparison(undefined); setAcknowledged(false); }
  return { busy, error, uncertain, acknowledged, comparison, writable, save, compare: readComparison, clear, locked: () => lock.current || Boolean(attempt.current?.uncertain), isBusy: () => lock.current, retry: () => attempt.current ? save(attempt.current.path, attempt.current.body, attempt.current.method) : Promise.resolve(false) };
}

export function RequirementFailure({ command, keep, reload }: { command: ReturnType<typeof useRequirementCommand>; keep: (current: RequirementComparison) => void; reload?: (current: RequirementComparison) => void }) {
  if (!command.error) return null;
  const current = command.comparison;
  return <section className="grid min-w-0 gap-4" aria-label="Reprise de la recherche"><RecordError error={command.error} />
    {command.uncertain ? <><p>{command.acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans enregistrer une seconde fois." : "La réponse est interrompue. Réessayez exactement la même opération pour retrouver son résultat."}</p><Button action="retry" type="button" variant="outline" disabled={command.busy || !command.writable && !command.acknowledged} onClick={() => void command.retry()}>{command.acknowledged ? "Actualiser l’opération enregistrée" : "Réessayer la même opération"}</Button></> : command.error.status === 409 ? <Button action="compare" type="button" variant="outline" disabled={command.busy} onClick={() => void command.compare()}>Comparer la version actuelle</Button> : null}
    {current ? <section className="grid min-w-0 gap-4 border-t pt-4" aria-label="Comparaison de la recherche">{current.value ? <><h3>Version actuelle · {current.value.version}</h3><RequirementFacts value={current.value} /></> : null}{current.offering ? <OfferingFacts offering={current.offering} /> : null}{current.blocked ? <p role="status">{current.blocked}</p> : <div className="flex flex-wrap gap-2"><Button action="compare" type="button" variant="outline" disabled={command.busy || command.uncertain || !command.writable} onClick={() => { keep(current); command.clear(); }}>Conserver ma saisie avec cette version</Button>{reload ? <Button action="refresh" type="button" variant="quiet" disabled={command.busy || command.uncertain} onClick={() => reload(current)}>Charger la version actuelle</Button> : null}</div>}</section> : null}
  </section>;
}
