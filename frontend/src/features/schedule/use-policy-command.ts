"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { policyEditSchema, policyPreviewSchema, policySchema, type Policy, type PolicyEdit, type PolicyPreview } from "./contracts";
import { policyEditSignature, policyPreviewReceipt, type PolicySaveBody } from "./policy-command-intent";

type Saved = (policy: Policy, signal: AbortSignal) => void | Promise<void>;
type Attempt = { body: PolicySaveBody; key: string; dispatched: boolean; uncertain: boolean; receipt?: PolicyPreview; saved: Saved };
const lost = (error: ApiError) => [401, 403, 404].includes(error.status);

export function usePolicyCommand({ initial, actorId, available = true, saved, denied }: { initial: Policy; actorId?: string; available?: boolean; saved: Saved; denied: (error: ApiError, acknowledged?: boolean) => void }) {
  const hydrated = useHydrated(), [origin] = useState(() => ({ actor: actorId, version: initial.version }));
  const alive = useRef(true), refused = useRef(false), finished = useRef(false), openingActor = useRef(actorId), currentActor = useRef(actorId), binding = useRef(actorId);
  const lock = useRef<"preview" | "save" | "read" | null>(null), request = useRef<AbortController | null>(null), minimum = useRef(initial.version), expected = useRef(initial.version), revision = useRef(0);
  const lease = useRef<{ body: PolicyEdit; value: PolicyPreview } | undefined>(undefined), offered = useRef<Policy | undefined>(undefined), attempt = useRef<Attempt | undefined>(undefined), reviewRequired = useRef(false);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState<ApiError>(), [denial, setDenial] = useState<ApiError>(), [preview, setPreview] = useState<PolicyPreview>(), [comparison, setComparison] = useState<Policy>(), [version, setVersion] = useState(initial.version);
  useLayoutEffect(() => { currentActor.current = actorId; minimum.current = Math.max(minimum.current, initial.version); }, [actorId, initial.version]);
  useEffect(() => { alive.current = true; binding.current = origin.actor; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; lease.current = undefined; binding.current = undefined; }; }, [origin]);
  const active = () => alive.current && !refused.current && openingActor.current === currentActor.current;
  const protectedOperation = () => lock.current !== null || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && available && !finished.current && !protectedOperation();
  function deny(problem: ApiError) {
    if (!active()) return;
    const recorded = Boolean(attempt.current?.receipt); refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined; lease.current = undefined;
    setDenial(problem); setError(problem); setPreview(undefined); setComparison(undefined); setUncertain(false); setBusy(false); setAcknowledged(recorded); denied(problem, recorded);
  }
  function authorize(identity: ReturnType<typeof meSchema.parse>) {
    if (!active() || identity.user.role !== "administrator" || binding.current && identity.user.id !== binding.current) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    binding.current = identity.user.id;
  }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!active() || signal.aborted) return false; authorize(identity); return true; }
  async function read(signal: AbortSignal) { const value = await apiGet("/api/v1/visit-schedule/policy", policySchema, signal); if (value.version < minimum.current) throw new ApiError("INVALID_RESPONSE", 503); return value; }
  async function offer(signal: AbortSignal) {
    if (!await prove(signal)) return;
    const value = await read(signal); if (!active() || signal.aborted) return;
    offered.current = value; reviewRequired.current = true; setComparison(value); setNeedsReview(true);
  }
  function invalidate() {
    if (!active() || finished.current || lock.current === "save" || attempt.current?.uncertain) return false;
    revision.current++; lease.current = undefined; setPreview(undefined); return true;
  }
  async function failure(reason: unknown, signal: AbortSignal, value?: Attempt) {
    if (!active() || signal.aborted) return;
    const problem = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem);
    if (lost(problem)) { deny(problem); return; }
    if (value) {
      value = { ...value, uncertain: Boolean(value.receipt) || value.uncertain || value.dispatched && (problem.status >= 500 || problem.code === "INVALID_RESPONSE") };
      attempt.current = value.uncertain ? value : undefined; setUncertain(value.uncertain);
      if (value.uncertain) return;
    }
    if (problem.status === 409) {
      lease.current = undefined; reviewRequired.current = true; setPreview(undefined); setNeedsReview(true);
      try { await offer(signal); } catch (reason) { if (active() && !signal.aborted) { const next = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(next); if (lost(next)) deny(next); } }
    }
  }
  async function verify(input: unknown) {
    if (!canEdit() || reviewRequired.current || offered.current) return false;
    const parsed = policyEditSchema.safeParse(input); if (!parsed.success || parsed.data.expected_version !== expected.current) { setError(new ApiError("VALIDATION_ERROR", 422)); return false; }
    const body = structuredClone(parsed.data), rev = revision.current, abort = new AbortController(); request.current = abort; lock.current = "preview"; setBusy(true); setError(undefined); lease.current = undefined; setPreview(undefined);
    try {
      const result = await apiCommand("/api/v1/visit-schedule/policy/preview", body, policyPreviewSchema, crypto.randomUUID(), "POST", undefined, abort.signal, { beforeDispatch: authorize });
      if (!active() || abort.signal.aborted || rev !== revision.current) return false;
      const value = policyPreviewReceipt(body, result); if (!value) throw new ApiError("INVALID_RESPONSE", 503);
      lease.current = { body, value }; setPreview(value); return true;
    } catch (reason) { await failure(reason, abort.signal); return false; }
    finally { lock.current = null; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  async function run(value: Attempt) {
    if (!hydrated || !active() || finished.current || lock.current) return false;
    let owned = value; const abort = new AbortController(); request.current = abort; lock.current = "save"; setBusy(true); setError(undefined);
    try {
      if (!owned.receipt) {
        const result = await apiCommand("/api/v1/visit-schedule/policy", owned.body, policyPreviewSchema, owned.key, "PUT", undefined, abort.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!active() || abort.signal.aborted) return false;
        const receipt = policyPreviewReceipt(owned.body, result); if (!receipt) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!await prove(abort.signal)) return false;
      const current = await read(abort.signal); if (!active() || abort.signal.aborted) return false;
      if (!owned.receipt || current.version < owned.receipt.policy.version) throw new ApiError("INVALID_RESPONSE", 503);
      await owned.saved(current, abort.signal); if (!active() || abort.signal.aborted) return false;
      finished.current = true; attempt.current = undefined; lease.current = undefined; setUncertain(false); setPreview(undefined); setComplete(true); return true;
    } catch (reason) { await failure(reason, abort.signal, owned); return false; }
    finally { lock.current = null; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function save(input: unknown, completed: Saved = saved) {
    if (!canEdit() || reviewRequired.current || !lease.current || offered.current) return Promise.resolve(false);
    const parsed = policyEditSchema.safeParse(input);
    if (!parsed.success || parsed.data.expected_version !== expected.current || policyEditSignature(parsed.data) !== policyEditSignature(lease.current.body)) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const value: Attempt = { body: structuredClone({ ...lease.current.body, preview_hash: lease.current.value.preview_hash }), key: crypto.randomUUID(), dispatched: false, uncertain: false, saved: completed };
    attempt.current = value; setAcknowledged(false); return run(value);
  }
  async function compare() {
    if (!canEdit()) return;
    const abort = new AbortController(); request.current = abort; lock.current = "read"; setBusy(true); offered.current = undefined; setComparison(undefined);
    try { await offer(abort.signal); } catch (reason) { await failure(reason, abort.signal); }
    finally { lock.current = null; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function accept(value: Policy) {
    if (!canEdit() || offered.current !== value || value.version < minimum.current) return false;
    expected.current = value.version; minimum.current = value.version; setVersion(value.version); offered.current = undefined; lease.current = undefined; revision.current++; reviewRequired.current = false;
    setComparison(undefined); setPreview(undefined); setNeedsReview(false); setError(undefined); return true;
  }
  return { busy, uncertain, acknowledged, complete, error, denial, preview, comparison, needsReview, version, active, canEdit, invalidate, verify, save, compare, accept, protected: busy || uncertain, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
