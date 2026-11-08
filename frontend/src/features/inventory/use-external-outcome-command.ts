"use client";

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { resultSchema } from "./contracts";
import { externalSchema } from "./outcome-contracts";
import { readExternalRecord, readExternalStock, type ExternalStockReview, type ExternalStockScope } from "./external-stock-review";
import type { InventoryRecord, InventoryRecordScope } from "./record-scope";
import { InventoryBusyContext } from "./use-command";

type Completion = (record: InventoryRecord, signal: AbortSignal) => void | Promise<void>;
type Attempt = { body: z.infer<typeof externalSchema>; key: string; fingerprint: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema>; completed: Completion };
export function useExternalOutcomeCommand(scope: ExternalStockScope, host?: InventoryRecordScope) {
  const hydrated = useHydrated(), publish = useContext(InventoryBusyContext), publisher = useRef(publish), hostRef = useRef(host);
  const key = `${scope.root}:${scope.id}:${scope.offeringId}:${scope.kind}:${scope.actorId ?? ""}:${scope.role ?? ""}`, origin = useRef(key), latest = useRef(key);
  const [authority] = useState(() => ({ actor: scope.actorId, role: scope.role }));
  const binding = useRef(authority), minimum = useRef(scope.version), offeringMinimum = useRef(scope.offeringVersion), reviewed = useRef<ExternalStockReview | undefined>(undefined), reviewValid = useRef(false);
  const alive = useRef(true), refused = useRef(false), lock = useRef(false), ownsBusy = useRef(false), request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined), completedFingerprint = useRef<string | undefined>(undefined);
  const [review, setReview] = useState<ExternalStockReview>(), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [needsReview, setNeedsReview] = useState(false), [complete, setComplete] = useState(false), [error, setError] = useState<ApiError>();
  useLayoutEffect(() => { latest.current = key; hostRef.current = host; publisher.current = publish; minimum.current = Math.max(minimum.current, scope.version); offeringMinimum.current = Math.max(offeringMinimum.current, scope.offeringVersion); }, [key, host, publish, scope.version, scope.offeringVersion]);
  useEffect(() => { alive.current = true; binding.current = { ...authority }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; reviewed.current = undefined; reviewValid.current = false; binding.current = { actor: undefined, role: undefined }; if (ownsBusy.current) { ownsBusy.current = false; publisher.current(false); } }; }, [authority]);
  const current = () => alive.current && origin.current === key && latest.current === key;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const active = () => current() && !refused.current;
  const validScope = ["properties", "developments"].includes(scope.root) && ["sale", "rental"].includes(scope.kind) && z.uuid().safeParse(scope.id).success && z.uuid().safeParse(scope.offeringId).success && Number.isSafeInteger(scope.version) && scope.version > 0 && Number.isSafeInteger(scope.offeringVersion) && scope.offeringVersion > 0;
  const canEdit = () => hydrated && validScope && active() && !locked() && reviewValid.current && Boolean(hostRef.current?.available && reviewed.current?.review && !reviewed.current.readonly);
  function busy(value: boolean) { ownsBusy.current = value; publisher.current(value); }
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (!active()) throw new ApiError("FORBIDDEN", 403);
    if (hostRef.current?.root !== scope.root || hostRef.current.id !== scope.id) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (!["manager", "administrator"].includes(identity.user.role) || binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!current() || signal.aborted) return false; authorize(identity); return true; }
  function fail(reason: unknown) {
    const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
    if ([401, 403, 404].includes(failure.status)) { const saved = Boolean(attempt.current?.receipt); refused.current = true; request.current?.abort(); attempt.current = undefined; reviewed.current = undefined; reviewValid.current = false; setReview(undefined); setUncertain(false); setAcknowledged(saved); setPending(false); busy(false); hostRef.current?.denied(failure, saved); }
    return failure;
  }
  async function inspect() {
    if (!hydrated || !active() || locked()) return false;
    if (!validScope) { setError(new ApiError("VALIDATION_ERROR", 422)); return false; }
    reviewValid.current = false;
    lock.current = true; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller;
    try {
      if (!await prove(controller.signal)) return false;
      const value = await readExternalStock(scope, minimum.current, offeringMinimum.current, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      minimum.current = value.record.version; if (value.review) offeringMinimum.current = value.review.expected_offering_version;
      reviewed.current = value; reviewValid.current = true; setReview(value); setNeedsReview(false); completedFingerprint.current = undefined; setComplete(false); return true;
    } catch (reason) { if (current() && !controller.signal.aborted) fail(reason); return false; }
    finally { lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  async function run(owned: Attempt) {
    if (!hydrated || !active() || lock.current) return false;
    lock.current = true; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand(`/api/v1/${scope.root}/${scope.id}/external-outcome`, owned.body, resultSchema, owned.key, "POST", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return false;
        const rightTarget = scope.root === "properties" ? "property_id" in receipt && receipt.property_id === scope.id : "development_id" in receipt && receipt.development_id === scope.id;
        if (!rightTarget || receipt.offering_id !== scope.offeringId || receipt.version <= owned.body.expected_version) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!owned.receipt || !await prove(controller.signal)) return false;
      const value = await readExternalRecord(scope, Math.max(owned.receipt.version, minimum.current), controller.signal);
      if (!current() || controller.signal.aborted) return false;
      await owned.completed(value, controller.signal);
      if (!current() || controller.signal.aborted) return true;
      hostRef.current?.accept(value);
      if (!current() || controller.signal.aborted) return true;
      minimum.current = value.version; attempt.current = undefined; completedFingerprint.current = owned.fingerprint; reviewValid.current = false; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain); if (!owned.uncertain && failure.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  function submit(fields: { completed_on: string; explanation: string }, completed: Completion) {
    if (!canEdit() || !reviewed.current?.review) return Promise.resolve(false);
    const stock = reviewed.current.review, parsed = externalSchema.safeParse({ ...fields, expected_version: stock.expected_target_version, offering_id: stock.offering_id, expected_offering_version: stock.expected_offering_version, expected_development_version: stock.expected_development_version, expected_stock_fingerprint: stock.expected_stock_fingerprint });
    if (!parsed.success || parsed.data.offering_id !== scope.offeringId) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const fingerprint = JSON.stringify(parsed.data); if (completedFingerprint.current === fingerprint) return Promise.resolve(false);
    const owned: Attempt = { body: structuredClone(parsed.data), key: crypto.randomUUID(), fingerprint, dispatched: false, uncertain: false, completed };
    attempt.current = owned; setAcknowledged(false); setComplete(false); return run(owned);
  }
  return { review, error, pending, uncertain, acknowledged, needsReview, complete, inspect, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), active, locked, canEdit, protected: pending || uncertain };
}
