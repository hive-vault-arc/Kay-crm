"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import type { StaffRole } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { resultSchema } from "./contracts";
import { developmentFieldsSchema, developmentSchema, type Development } from "./development-contracts";

type Body = z.infer<typeof developmentFieldsSchema>;
type Completion = (record: Development, signal: AbortSignal) => void | Promise<void>;
type Attempt = { body: Body; key: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema>; complete: Completion };
export function useDevelopmentCreation({ actorId, role, available }: { actorId?: string; role?: StaffRole; available: boolean }) {
  const hydrated = useHydrated(), key = `${actorId ?? ""}:${role ?? ""}`, originKey = useRef(key), latestKey = useRef(key), availability = useRef(available);
  const [origin] = useState(() => ({ actor: actorId, role })), authority = useRef(origin), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null);
  const [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>(), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  useLayoutEffect(() => { latestKey.current = key; availability.current = available; }, [key, available]);
  useEffect(() => { alive.current = true; authority.current = { ...origin }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; authority.current = { actor: undefined, role: undefined }; }; }, [origin]);
  const current = () => alive.current && originKey.current === key && latestKey.current === key;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && current() && availability.current && !refused.current && !finished.current && !locked();
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (!current() || identity.must_change_password) throw new ApiError(identity.must_change_password ? "PASSWORD_CHANGE_REQUIRED" : "FORBIDDEN", 403);
    if (authority.current.actor && authority.current.actor !== identity.user.id || authority.current.role && authority.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    authority.current = { actor: identity.user.id, role: identity.user.role };
  };
  function deny(failure: ApiError) { if (!current() || refused.current || ![401, 403, 404].includes(failure.status)) return; refused.current = true; request.current?.abort(); const saved = Boolean(attempt.current?.receipt); attempt.current = undefined; setError(failure); setDenied(failure); setAcknowledged(saved); setUncertain(false); setPending(false); }
  async function run(value: Attempt): Promise<ApiError | undefined> {
    if (!hydrated || !current() || refused.current || finished.current || lock.current) return;
    lock.current = true; setPending(true); setError(undefined); const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand("/api/v1/developments", owned.body, resultSchema, owned.key, "POST", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return;
        if (!("development_id" in receipt) || receipt.offering_id !== null || receipt.version !== 1) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      const receipt = owned.receipt; if (!receipt || !("development_id" in receipt)) return;
      const identity = await apiGet("/api/v1/auth/me", meSchema, controller.signal); if (!current() || controller.signal.aborted) return; authorize(identity);
      const record = await apiGet(`/api/v1/developments/${receipt.development_id}`, developmentSchema, controller.signal);
      if (!current() || controller.signal.aborted) return;
      if (record.id !== receipt.development_id || record.version < receipt.version) throw new ApiError("INVALID_RESPONSE", 503);
      await owned.complete(record, controller.signal); if (!current() || controller.signal.aborted) return;
      attempt.current = undefined; finished.current = true; setUncertain(false);
    } catch (reason) {
      if (!current() || controller.signal.aborted) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
      if ([401, 403, 404].includes(failure.status)) deny(failure);
      else { owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") }; attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain); }
      return failure;
    } finally { lock.current = false; if (current()) setPending(false); }
  }
  function submit(body: unknown, complete: Completion) {
    if (!canEdit()) return Promise.resolve(undefined);
    const parsed = developmentFieldsSchema.safeParse(body); if (!parsed.success) { const failure = new ApiError("VALIDATION_ERROR", 422); setError(failure); return Promise.resolve(failure); }
    const owned: Attempt = { body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false, complete }; attempt.current = owned; setAcknowledged(false); return run(owned);
  }
  const editable = hydrated && available && !denied && !pending && !uncertain && !acknowledged;
  return { error, denied, pending, uncertain, acknowledged, editable, protected: pending || uncertain, locked, canEdit, deny, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(undefined) };
}
