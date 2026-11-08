"use client";

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { propertySchema, resultSchema } from "./contracts";
import { developmentSchema } from "./development-contracts";
import { InventoryRecordContext, type InventoryRecord } from "./record-scope";
import { InventoryBusyContext } from "./use-command";
import { lifecycleReview, recordCommandIntent, type RecordCommandIntent, type RecordCommandScope } from "./record-command-intent";

type Completion = (record: InventoryRecord, signal: AbortSignal) => void | Promise<void>;
type Attempt = { intent: RecordCommandIntent; key: string; fingerprint: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema>; completed: Completion };
export function useInventoryRecordCommand(scope: RecordCommandScope) {
  const host = useContext(InventoryRecordContext), publish = useContext(InventoryBusyContext), hostRef = useRef(host), publisher = useRef(publish), hydrated = useHydrated();
  const key = JSON.stringify({ ...scope, version: undefined, actor: host?.actorId, role: host?.role }), origin = useRef(key), latest = useRef(key);
  const [authority] = useState(() => ({ actor: host?.actorId, role: host?.role })), binding = useRef(authority);
  const alive = useRef(true), refused = useRef(false), lock = useRef(false), ownsBusy = useRef(false), validReview = useRef(true), minimum = useRef(scope.version), request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined), offered = useRef<{ value: unknown; record: InventoryRecord } | undefined>(undefined), finished = useRef<string | undefined>(undefined);
  const [error, setError] = useState<ApiError>(), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [needsReview, setNeedsReview] = useState(false);
  useLayoutEffect(() => { latest.current = key; hostRef.current = host; publisher.current = publish; minimum.current = Math.max(minimum.current, scope.version); }, [key, host, publish, scope.version]);
  useEffect(() => { alive.current = true; binding.current = { ...authority }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; binding.current = { actor: undefined, role: undefined }; if (ownsBusy.current) { ownsBusy.current = false; publisher.current(false); } }; }, [authority]);
  const current = () => alive.current && origin.current === key && latest.current === key, active = () => current() && !refused.current;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && !locked() && validReview.current && Boolean(hostRef.current?.available);
  function busy(value: boolean) { ownsBusy.current = value; publisher.current(value); }
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (!active() || hostRef.current?.id !== scope.id || hostRef.current.root !== scope.root) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if ((scope.kind === "owners" || scope.kind === "offering" || scope.kind === "lifecycle") && identity.user.role === "agent" || binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!current() || signal.aborted) return false; authorize(identity); return true; }
  function parseRecord(value: unknown, minimumVersion: number) {
    let candidate = value;
    if (candidate && typeof candidate === "object" && "development" in candidate) candidate = candidate.development;
    if (candidate && typeof candidate === "object" && "inventoryLevel" in candidate) { const { inventoryLevel, ...record } = candidate; if (inventoryLevel !== "development" || scope.root !== "developments") throw new ApiError("INVALID_RESPONSE", 503); candidate = record; }
    const parsed = scope.root === "properties" ? propertySchema.safeParse(candidate) : developmentSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.id !== scope.id || parsed.data.version < minimumVersion) throw new ApiError("INVALID_RESPONSE", 503); return parsed.data;
  }
  function fail(reason: unknown) {
    const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
    if ([401, 403, 404].includes(failure.status)) { const saved = Boolean(attempt.current?.receipt); refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined; setUncertain(false); setAcknowledged(saved); setPending(false); busy(false); hostRef.current?.denied(failure, saved); }
    return failure;
  }
  async function run(owned: Attempt): Promise<ApiError | undefined> {
    if (!hydrated || !active() || lock.current) return;
    lock.current = true; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand(owned.intent.path, owned.intent.body, resultSchema, owned.key, owned.intent.method, undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return;
        const rightTarget = scope.root === "properties" ? "property_id" in receipt && receipt.property_id === scope.id : "development_id" in receipt && receipt.development_id === scope.id;
        const offering = scope.kind === "offering" ? scope.offeringId ? receipt.offering_id === scope.offeringId : Boolean(receipt.offering_id) : receipt.offering_id === null;
        if (!rightTarget || !offering || receipt.version <= owned.intent.expectedVersion) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!owned.receipt || !await prove(controller.signal)) return;
      const path = `/api/v1/${scope.root}/${scope.id}` as const, value = scope.root === "properties" ? await apiGet(path, propertySchema, controller.signal) : await apiGet(path, developmentSchema, controller.signal);
      if (!current() || controller.signal.aborted) return;
      const record = parseRecord(value, Math.max(minimum.current, owned.receipt.version));
      if (scope.kind === "lifecycle" && record.version === owned.receipt.version && Boolean(record.archived_at) !== (scope.operation === "archive")) throw new ApiError("INVALID_RESPONSE", 503);
      if (scope.kind === "offering" && scope.offeringId && owned.intent.kind === "offering-edit") { const offering = record.offerings.find(value => value.id === scope.offeringId); if (offering && offering.version <= owned.intent.body.expected_version) throw new ApiError("INVALID_RESPONSE", 503); }
      await owned.completed(record, controller.signal);
      if (!current() || controller.signal.aborted) return;
      hostRef.current?.accept(record);
      if (!current() || controller.signal.aborted) return;
      minimum.current = record.version; attempt.current = undefined; finished.current = owned.fingerprint; validReview.current = false; setUncertain(false);
    } catch (reason) {
      if (!current() || controller.signal.aborted) return;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) { owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") }; attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain); if (!owned.uncertain && failure.status === 409) { validReview.current = false; setNeedsReview(true); } }
      return failure;
    } finally { lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  function submit(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH" | "PUT", completed: Completion) {
    if (!canEdit()) return Promise.resolve(undefined);
    const intent = recordCommandIntent(scope, path, body, method);
    if (!intent) { const failure = new ApiError("VALIDATION_ERROR", 422); setError(failure); return Promise.resolve(failure); }
    if (intent.expectedVersion < minimum.current) { validReview.current = false; setNeedsReview(true); const failure = new ApiError("INVENTORY_VERSION_CONFLICT", 409); setError(failure); return Promise.resolve(failure); }
    const fingerprint = JSON.stringify(intent); if (finished.current === fingerprint) return Promise.resolve(undefined);
    minimum.current = Math.max(minimum.current, intent.expectedVersion); const owned: Attempt = { intent: structuredClone(intent), key: crypto.randomUUID(), fingerprint, dispatched: false, uncertain: false, completed };
    attempt.current = owned; offered.current = undefined; setAcknowledged(false); return run(owned);
  }
  async function inspect<Value>(reader: (signal: AbortSignal) => Promise<Value>, callerSignal?: AbortSignal): Promise<Value> {
    if (!hydrated || !active() || locked() || callerSignal?.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    lock.current = true; validReview.current = false; offered.current = undefined; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller;
    const abort = () => controller.abort(); callerSignal?.addEventListener("abort", abort, { once: true });
    try { if (!await prove(controller.signal)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); const value = await reader(controller.signal), record = parseRecord(value, minimum.current); if (!current() || controller.signal.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); offered.current = { value, record }; return value; }
    catch (reason) { const failure = current() && !controller.signal.aborted ? fail(reason) : new ApiError("DEPENDENCY_UNAVAILABLE", 503); throw failure; }
    finally { callerSignal?.removeEventListener("abort", abort); lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  function accept(value: unknown) { if (!hydrated || !active() || locked() || !offered.current || offered.current.value !== value || offered.current.record.version < minimum.current || scope.kind === "lifecycle" && lifecycleReview(scope, offered.current.record) !== "ready") return false; minimum.current = offered.current.record.version; offered.current = undefined; validReview.current = true; finished.current = undefined; setNeedsReview(false); setError(undefined); return true; }
  return { error, pending, uncertain, acknowledged, needsReview, protected: pending || uncertain, active, locked, canEdit, submit, inspect, accept, deny: (failure: ApiError) => { if (active() && [401, 403, 404].includes(failure.status)) fail(failure); }, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(undefined) };
}
