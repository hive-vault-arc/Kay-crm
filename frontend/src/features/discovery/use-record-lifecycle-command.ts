"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { enquirySchema, recordLifecycleResultSchema, recordLifecycleSchema, type StaffRole } from "@/features/contacts/contracts";
import { dealSchema } from "@/features/deals/contracts";
import { lifecycleReceiptMatches, recordLifecycleReview, type LifecycleRecord, type LifecycleScope } from "./record-lifecycle-contract";

type Saved = (record: LifecycleRecord, signal: AbortSignal) => void | Promise<void>;
type Attempt = { body: z.infer<typeof recordLifecycleSchema>; key: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof recordLifecycleResultSchema>; saved: Saved };
type Options = LifecycleScope & { version: number; actorId?: string; role: StaffRole; saved: Saved; denied?: (error: ApiError, acknowledged?: boolean) => void };

/** A receipt is historical proof; the displayed dossier comes from a fresh scoped read. */
export function useRecordLifecycleCommand(options: Options) {
  const { kind, id, operation, actorId, role } = options, scopeKey = `${kind}:${id}:${operation}:${actorId ?? ""}:${role}`;
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), reviewValid = useRef(true);
  const scope = useRef(scopeKey), latestScope = useRef(scopeKey), binding = useRef({ actor: actorId, role }), expected = useRef(options.version), minimum = useRef(options.version);
  const attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null), offered = useRef<LifecycleRecord | undefined>(undefined);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>(), [comparison, setComparison] = useState<LifecycleRecord>(), [currentActor, setCurrentActor] = useState(actorId);
  useLayoutEffect(() => { latestScope.current = scopeKey; minimum.current = Math.max(minimum.current, options.version); }, [scopeKey, options.version]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; binding.current = { actor: undefined, role }; }; }, [role]);
  const active = () => alive.current && scope.current === scopeKey && latestScope.current === scopeKey && !refused.current;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && !finished.current && !locked() && reviewValid.current;
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
    setCurrentActor(identity.user.id);
  };
  function deny(failure: ApiError) {
    if (!active()) return;
    const knownSaved = Boolean(attempt.current?.receipt);
    refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined;
    setComparison(undefined); setAccessError(failure); setError(failure); setBusy(false); setUncertain(false); setAcknowledged(knownSaved); options.denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) {
    const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure;
  }
  async function prove(signal: AbortSignal) {
    const identity = await apiGet("/api/v1/auth/me", meSchema, signal);
    if (!active() || signal.aborted) return false; authorize(identity); return true;
  }
  async function read(signal: AbortSignal, floor = 1): Promise<LifecycleRecord> {
    const record = kind === "enquiries" ? await apiGet(`/api/v1/enquiries/${id}`, enquirySchema, signal) : await apiGet(`/api/v1/deals/${id}`, dealSchema, signal);
    if (!active() || signal.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    if (record.id !== id || record.version < Math.max(floor, minimum.current)) throw new ApiError("INVALID_RESPONSE", 503);
    return record;
  }
  function offer(record: LifecycleRecord) { offered.current = record; reviewValid.current = false; setComparison(record); setNeedsReview(true); }
  async function run(value: Attempt) {
    if (!hydrated || !active() || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      // Replays must reach the original receipt before testing its now-obsolete pre-state.
      if (!owned.dispatched) {
        if (!await prove(controller.signal)) return false;
        const record = await read(controller.signal), review = recordLifecycleReview(options, record, binding.current.actor!, role);
        if (record.version !== owned.body.expected_version || review !== "ready") { offer(record); attempt.current = undefined; return false; }
      }
      if (!owned.receipt) {
        const receipt = await apiCommand(`/api/v1/${kind}/${id}/${operation}`, owned.body, recordLifecycleResultSchema, owned.key, "POST", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!active() || controller.signal.aborted) return false;
        if (!lifecycleReceiptMatches(id, owned.body.expected_version, receipt)) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!owned.receipt || !await prove(controller.signal)) return false;
      const record = await read(controller.signal, owned.receipt.version);
      if (record.version === owned.receipt.version && Boolean(record.archived_at) !== (operation === "archive")) throw new ApiError("INVALID_RESPONSE", 503);
      await owned.saved(record, controller.signal);
      if (!active() || controller.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); return true;
    } catch (reason) {
      if (!active() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && failure.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (active() && !controller.signal.aborted) setBusy(false); }
  }
  function submit(value: unknown) {
    if (!canEdit()) return Promise.resolve(false);
    const parsed = recordLifecycleSchema.safeParse(value);
    if (!parsed.success || parsed.data.expected_version !== expected.current) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const owned: Attempt = { body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false, saved: options.saved };
    attempt.current = owned; setAcknowledged(false); return run(owned);
  }
  async function inspect() {
    if (!hydrated || !active() || finished.current || locked()) return;
    lock.current = true; setBusy(true); setError(undefined); const controller = new AbortController(); request.current = controller;
    try { if (await prove(controller.signal)) offer(await read(controller.signal)); }
    catch (reason) { if (active() && !controller.signal.aborted) fail(reason); }
    finally { lock.current = false; if (active() && !controller.signal.aborted) setBusy(false); }
  }
  function accept(record: LifecycleRecord) {
    if (!hydrated || !active() || locked() || offered.current !== record || record.version < minimum.current || recordLifecycleReview(options, record, binding.current.actor!, role) !== "ready") return false;
    expected.current = record.version; minimum.current = record.version; offered.current = undefined; reviewValid.current = true; setComparison(undefined); setNeedsReview(false); setError(undefined); return true;
  }
  return { busy, uncertain, acknowledged, needsReview, error, accessError, comparison, review: comparison ? recordLifecycleReview(options, comparison, currentActor ?? "", role) : undefined, protected: busy || uncertain, active, locked, canEdit, deny, submit, inspect, accept, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
