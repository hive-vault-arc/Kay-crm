"use client";

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { StaffRole } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { propertySchema, resultSchema, type Property } from "./contracts";
import { InventoryRecordContext } from "./record-scope";
import { InventoryBusyContext } from "./use-command";
import { propertyListingIntent, type PropertyListingIntent, type PropertyListingScope } from "./property-listing-intent";

type Completion = (record: Property, signal: AbortSignal) => void | Promise<void>;
type Attempt = { intent: PropertyListingIntent; key: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema>; complete: Completion };
export function usePropertyListingCommand(scope: PropertyListingScope & { actorId?: string; role?: StaffRole }) {
  const host = useContext(InventoryRecordContext), publish = useContext(InventoryBusyContext), hydrated = useHydrated(), hostRef = useRef(host), publisher = useRef(publish);
  const key = JSON.stringify({ id: scope.id, developmentId: scope.developmentId, actor: scope.actorId ?? host?.actorId, role: scope.role ?? host?.role, host: host ? { root: host.root, id: host.id } : null }), originKey = useRef(key), latestKey = useRef(key);
  const [origin] = useState(() => ({ actor: scope.actorId ?? host?.actorId, role: scope.role ?? host?.role })), authority = useRef(origin), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), ownsBusy = useRef(false), minimum = useRef(scope.version ?? 0), reviewValid = useRef(true), offered = useRef<Property | undefined>(undefined), attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null);
  const [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>(), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [needsReview, setNeedsReview] = useState(false);
  useLayoutEffect(() => { latestKey.current = key; hostRef.current = host; publisher.current = publish; minimum.current = Math.max(minimum.current, scope.version ?? 0); }, [key, host, publish, scope.version]);
  useEffect(() => { alive.current = true; authority.current = { ...origin }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; authority.current = { actor: undefined, role: undefined }; if (ownsBusy.current) { ownsBusy.current = false; publisher.current(false); } }; }, [origin]);
  const current = () => alive.current && originKey.current === key && latestKey.current === key;
  const scoped = () => scope.id ? hostRef.current?.root === "properties" && hostRef.current.id === scope.id : scope.developmentId ? hostRef.current?.root === "developments" && hostRef.current.id === scope.developmentId : !hostRef.current;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const active = () => current() && !refused.current;
  const canEdit = () => hydrated && active() && scoped() && (!hostRef.current || hostRef.current.available) && !finished.current && reviewValid.current && !locked();
  function busy(value: boolean) { ownsBusy.current = value; publisher.current(value); }
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (!active() || !scoped()) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (authority.current.actor && authority.current.actor !== identity.user.id || authority.current.role && authority.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    authority.current = { actor: identity.user.id, role: identity.user.role };
  };
  function deny(failure: ApiError) { if (!active() || ![401, 403, 404].includes(failure.status)) return; refused.current = true; request.current?.abort(); const saved = Boolean(attempt.current?.receipt); attempt.current = undefined; offered.current = undefined; setError(failure); setDenied(failure); setAcknowledged(saved); setUncertain(false); setPending(false); busy(false); if (scoped()) hostRef.current?.denied(failure, saved); }
  function fail(reason: unknown) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure; }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!current() || signal.aborted) return false; authorize(identity); return true; }
  function parseRecord(value: unknown, id: string, version: number) {
    const parsed = propertySchema.safeParse(value); if (!parsed.success || parsed.data.id !== id || parsed.data.version < version) throw new ApiError("INVALID_RESPONSE", 503);
    const record = parsed.data, hierarchy = record.hierarchy;
    if (record.offerings.some(offering => offering.property_id !== record.id || offering.target_level !== "property" || offering.target && offering.target.id !== record.id)) throw new ApiError("INVALID_RESPONSE", 503);
    if (hierarchy && (!record.development_id || hierarchy.development.id !== record.development_id || (hierarchy.floor?.id ?? null) !== (record.floor_id ?? null) || (hierarchy.unit_type?.id ?? null) !== (record.unit_type_id ?? null) || hierarchy.floor && !hierarchy.block)) throw new ApiError("INVALID_RESPONSE", 503);
    return record;
  }
  async function run(value: Attempt): Promise<ApiError | undefined> {
    if (!hydrated || !active() || finished.current || lock.current) return;
    lock.current = true; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand(owned.intent.path, owned.intent.body, resultSchema, owned.key, owned.intent.method, undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return;
        if (!("property_id" in receipt)) throw new ApiError("INVALID_RESPONSE", 503);
        if (owned.intent.mode === "edit" ? receipt.property_id !== owned.intent.id || receipt.version <= owned.intent.body.expected_version || receipt.offering_id !== null : receipt.version !== (owned.intent.body.initial_offering ? 2 : 1) || Boolean(owned.intent.body.initial_offering) !== Boolean(receipt.offering_id)) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      const receipt = owned.receipt; if (!receipt || !("property_id" in receipt) || !await prove(controller.signal)) return;
      const value = await apiGet(`/api/v1/properties/${receipt.property_id}`, propertySchema, controller.signal); if (!current() || controller.signal.aborted) return;
      const record = parseRecord(value, receipt.property_id, Math.max(minimum.current, receipt.version));
      if (record.version === receipt.version && (record.development_id ?? null) !== (scope.developmentId ?? null)) throw new ApiError("INVALID_RESPONSE", 503);
      if (owned.intent.mode === "create" && receipt.offering_id) {
        const offering = record.offerings.find(item => item.id === receipt.offering_id);
        if (!offering && record.version === receipt.version || offering && (offering.property_id !== record.id || offering.target_level !== "property" || offering.kind !== owned.intent.body.initial_offering?.kind || record.version === receipt.version && (offering.version !== 1 || offering.state !== "draft"))) throw new ApiError("INVALID_RESPONSE", 503);
      }
      await owned.complete(record, controller.signal); if (!current() || controller.signal.aborted) return;
      if (owned.intent.mode === "edit") hostRef.current?.accept(record); if (!current() || controller.signal.aborted) return;
      minimum.current = record.version; attempt.current = undefined; finished.current = true; setUncertain(false);
    } catch (reason) {
      if (!current() || controller.signal.aborted) return;
      const failure = fail(reason); if (![401, 403, 404].includes(failure.status)) { owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") }; attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain); if (!owned.uncertain && failure.status === 409 && owned.intent.mode === "edit") { reviewValid.current = false; setNeedsReview(true); } } return failure;
    } finally { lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  function submit(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH", complete: Completion) {
    if (!canEdit()) return Promise.resolve(undefined);
    const intent = propertyListingIntent(scope, path, body, method); if (!intent) { const failure = new ApiError("VALIDATION_ERROR", 422); setError(failure); return Promise.resolve(failure); }
    if (intent.mode === "edit" && intent.body.expected_version < minimum.current) { reviewValid.current = false; setNeedsReview(true); const failure = new ApiError("INVENTORY_VERSION_CONFLICT", 409); setError(failure); return Promise.resolve(failure); }
    if (intent.mode === "edit") minimum.current = Math.max(minimum.current, intent.body.expected_version);
    const owned: Attempt = { intent: structuredClone(intent), key: crypto.randomUUID(), dispatched: false, uncertain: false, complete }; attempt.current = owned; offered.current = undefined; setAcknowledged(false); return run(owned);
  }
  async function inspect(callerSignal?: AbortSignal): Promise<Property> {
    if (!scope.id || !hydrated || !active() || finished.current || locked() || callerSignal?.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    lock.current = true; reviewValid.current = false; offered.current = undefined; setPending(true); busy(true); setError(undefined); const controller = new AbortController(); request.current = controller; const abort = () => controller.abort(); callerSignal?.addEventListener("abort", abort, { once: true });
    try { if (!await prove(controller.signal)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); const value = await apiGet(`/api/v1/properties/${scope.id}`, propertySchema, controller.signal); if (!current() || controller.signal.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); const record = parseRecord(value, scope.id, minimum.current); offered.current = record; return record; }
    catch (reason) { throw current() && !controller.signal.aborted ? fail(reason) : new ApiError("DEPENDENCY_UNAVAILABLE", 503); }
    finally { callerSignal?.removeEventListener("abort", abort); lock.current = false; if (current()) { setPending(false); if (!attempt.current?.uncertain) busy(false); } }
  }
  function accept(value: Property) { if (!hydrated || !active() || finished.current || locked() || !offered.current || offered.current !== value || value.version < minimum.current || value.archived_at || (value.development_id ?? null) !== (scope.developmentId ?? null)) return false; minimum.current = value.version; offered.current = undefined; reviewValid.current = true; setNeedsReview(false); setError(undefined); return true; }
  return { error, denied, pending, uncertain, acknowledged, needsReview, protected: pending || uncertain, locked, canEdit, submit, inspect, accept, deny, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(undefined) };
}
