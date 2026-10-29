"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Deal } from "@/features/deals/contracts";
import type { StaffRole } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { creationKeySchema, financeResultMatches, resultSchema, type Commission } from "./contracts";
import { financeCompletionMatches, financeIntent, type FinanceIntent } from "./command-intent";
import { financeDenied, readCommission, readFinanceDeal } from "./model";

type Result = { id: string; version: number };
export type Saved = (result: Result) => void | Promise<void>;
export type Denied = (error: ApiError, acknowledged?: boolean) => void;
export type FinanceBinding = { actorId?: string; role?: StaffRole };
type Comparison = { version: number; commission?: Commission; deal?: Deal; blocked?: string };
type Verify = (commission: Commission, signal: AbortSignal) => string | undefined | Promise<string | undefined>;
type Attempt = { intent: FinanceIntent; key?: string; result?: Result; dispatched: boolean; uncertain: boolean; saved: Saved };

export function useFinanceMutation(dealId: string, commissionId: string | undefined, saved: Saved, denied: Denied, verify?: Verify, writable = true, options: FinanceBinding & { version?: number } = {}) {
  const scopeKey = `${dealId}:${commissionId ?? "new"}:${options.actorId ?? ""}:${options.role ?? ""}`, hydrated = useHydrated();
  const [origin] = useState(() => ({ actor: options.actorId, role: options.role }));
  const alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), reviewValid = useRef(true), scope = useRef(scopeKey), latestScope = useRef(scopeKey);
  const binding = useRef<{ actor?: string; role?: StaffRole }>(origin), expected = useRef(options.version), minimum = useRef(commissionId ? options.version ?? 1 : 1);
  const attempt = useRef<Attempt | undefined>(undefined), offered = useRef<Comparison | undefined>(undefined), request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>(), [comparison, setComparison] = useState<Comparison>(), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  useLayoutEffect(() => { latestScope.current = scopeKey; if (commissionId) minimum.current = Math.max(minimum.current, options.version ?? 1); }, [scopeKey, commissionId, options.version]);
  useEffect(() => { alive.current = true; binding.current = { ...origin }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; binding.current = {}; }; }, [origin]);
  const active = () => alive.current && scope.current === scopeKey && latestScope.current === scopeKey && !refused.current;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && writable && !finished.current && !locked() && reviewValid.current;
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (identity.user.role === "agent" || binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  function refuse(problem: ApiError) {
    if (!active()) return;
    const knownSaved = Boolean(attempt.current?.result); refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined;
    setAccessError(problem); setComparison(undefined); setError(problem); setUncertain(false); setBusy(false); setAcknowledged(knownSaved); denied(problem, knownSaved);
  }
  function fail(failure: unknown) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (financeDenied(problem)) refuse(problem); return problem; }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!active() || signal.aborted) return false; authorize(identity); return true; }
  async function run(value: Attempt) {
    if (!hydrated || !active() || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); const abort = new AbortController(); request.current = abort; let owned = value;
    try {
      if (!owned.result) {
        if (!owned.key) {
          if (owned.intent.kind !== "create" || !await prove(abort.signal)) return false;
          const issued = await apiGet(`/api/v1/deals/${dealId}/commission-creation-key`, creationKeySchema, abort.signal);
          if (!active() || abort.signal.aborted) return false;
          if (issued.deal_id !== dealId) throw new ApiError("INVALID_RESPONSE", 503);
          owned = { ...owned, key: issued.key }; attempt.current = owned;
        }
        const requestKey = owned.key;
        if (!requestKey) throw new ApiError("INVALID_RESPONSE", 503);
        const result = await apiCommand(owned.intent.path, owned.intent.body, resultSchema, requestKey, "POST", undefined, abort.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!active() || abort.signal.aborted) return false;
        if (!financeResultMatches(commissionId, owned.intent.expectedVersion, result)) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, result }; attempt.current = owned; setAcknowledged(true);
      }
      if (!owned.result || !await prove(abort.signal)) return false;
      const current = await readCommission(owned.result.id, dealId, abort.signal);
      if (!active() || abort.signal.aborted) return false;
      if (current.version < minimum.current || !financeCompletionMatches(owned.intent, owned.result, current, binding.current.actor!)) throw new ApiError("INVALID_RESPONSE", 503);
      await owned.saved(owned.result);
      if (!active() || abort.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (failure) {
      if (!active() || abort.signal.aborted) return false;
      const problem = fail(failure);
      if (!financeDenied(problem)) {
        owned = { ...owned, uncertain: Boolean(owned.result) || owned.uncertain || owned.dispatched && (problem.status >= 500 || problem.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && problem.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function save(path: `/api/v1/${string}`, body: unknown) {
    if (!canEdit()) return Promise.resolve(false);
    const intent = financeIntent({ dealId, commissionId }, path, body);
    if (!intent || expected.current !== undefined && intent.expectedVersion !== expected.current) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    expected.current ??= intent.expectedVersion;
    const owned: Attempt = { intent: structuredClone(intent), key: intent.kind === "create" ? undefined : crypto.randomUUID(), dispatched: false, uncertain: false, saved };
    attempt.current = owned; setAcknowledged(false); setComparison(undefined); offered.current = undefined; return run(owned);
  }
  async function compare() {
    if (!hydrated || !active() || finished.current || locked()) return;
    lock.current = true; setBusy(true); setComparison(undefined); offered.current = undefined; const abort = new AbortController(); request.current = abort;
    try {
      if (!await prove(abort.signal)) return;
      let candidate: Comparison;
      if (commissionId) { const current = await readCommission(commissionId, dealId, abort.signal); if (current.version < minimum.current) throw new ApiError("INVALID_RESPONSE", 503); candidate = { version: current.version, commission: current, blocked: verify ? await verify(current, abort.signal) : undefined }; }
      else { const current = await readFinanceDeal(dealId, abort.signal); if (current.version < (expected.current ?? 1)) throw new ApiError("INVALID_RESPONSE", 503); candidate = { version: current.version, deal: current, blocked: current.contact.archived_at || current.archived_at ? "Le dossier ou le contact est archivé. La finance est en lecture seule." : undefined }; }
      if (!writable && !candidate.blocked) candidate.blocked = "Le dossier ou le contact est archivé. La finance est en lecture seule.";
      if (active() && !abort.signal.aborted) { offered.current = candidate; reviewValid.current = false; setNeedsReview(true); setComparison(candidate); }
    } catch (failure) { if (active() && !abort.signal.aborted) fail(failure); }
    finally { lock.current = false; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function accept(value: Comparison) {
    if (!hydrated || !active() || !writable || locked() || finished.current || offered.current !== value || value.blocked || value.version < (commissionId ? minimum.current : expected.current ?? 1)) return false;
    expected.current = value.version; if (commissionId) minimum.current = value.version; reviewValid.current = true; offered.current = undefined; attempt.current = undefined;
    setComparison(undefined); setNeedsReview(false); setError(undefined); setAcknowledged(false); return true;
  }
  function clear() { if (!active() || locked() || !reviewValid.current) return; attempt.current = undefined; setError(undefined); setComparison(undefined); offered.current = undefined; setAcknowledged(false); }
  return { busy, error, accessError, comparison, latest: comparison?.commission, uncertain, acknowledged, complete, needsReview, writable, protected: busy || uncertain, active, canEdit, locked, save, compare, accept, clear, isBusy: () => lock.current, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
