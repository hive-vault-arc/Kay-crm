"use client";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { entryBody, entryResultMatches, entryTarget, type EntryBody, type EntryResult, type EntryTarget } from "./entry-command";
import { entryIdentity, entryRequest, type EntryIdentity } from "./entry-client";

export type EntryDenied = (failure: ApiError, acknowledged?: boolean) => void;
type Attempt = { target: EntryTarget; body: EntryBody; key: string; dispatched: boolean; uncertain: boolean; result?: EntryResult };
export function useEntryCommand({ path, contactId, saved, denied, authorityError }: { path: `/api/v1/${string}`; contactId?: string; saved: (signal: AbortSignal) => void | Promise<void>; denied?: EntryDenied; authorityError?: ApiError }) {
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false);
  const scope = useRef(`${path}:${contactId ?? ""}`), binding = useRef<EntryIdentity>({}), request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>();
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; binding.current = {}; }; }, []);
  useEffect(() => {
    if (!authorityError || refused.current) return;
    const knownSaved = Boolean(attempt.current?.result);
    refused.current = true; request.current?.abort(); attempt.current = undefined; denied?.(authorityError, knownSaved);
  }, [authorityError, denied]);
  const current = () => alive.current && scope.current === `${path}:${contactId ?? ""}`;
  const canEdit = () => hydrated && current() && !authorityError && !refused.current && !finished.current && !lock.current && !attempt.current;
  function deny(failure: ApiError) {
    if (!current() || refused.current) return;
    const knownSaved = Boolean(attempt.current?.result);
    refused.current = true; request.current?.abort(); attempt.current = undefined;
    setAccessError(failure); setError(failure); setBusy(false); setUncertain(false); setAcknowledged(knownSaved); denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) {
    const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure;
  }
  async function run(value: Attempt) {
    if (!hydrated || !current() || authorityError || refused.current || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    let owned = value;
    try {
      if (!owned.result) {
        const result = await entryRequest(owned.target, owned.body, owned.key, binding.current, controller.signal, () => { owned = { ...owned, dispatched: true }; attempt.current = owned; });
        if (!current() || controller.signal.aborted) return false;
        if (!entryResultMatches(owned.target, result)) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, result }; attempt.current = owned; setAcknowledged(true);
      }
      await saved(controller.signal);
      if (!current() || controller.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.result) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
      }
      return false;
    } finally { lock.current = false; if (current() && !controller.signal.aborted) setBusy(false); }
  }
  function submit(value: unknown) {
    if (!canEdit()) return Promise.resolve(false);
    const target = entryTarget(path, contactId);
    if (!target) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    try {
      const owned = { target, body: structuredClone(entryBody(target, value)), key: crypto.randomUUID(), dispatched: false, uncertain: false };
      attempt.current = owned; setAcknowledged(false); return run(owned);
    } catch { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
  }
  async function refresh(read: (signal: AbortSignal) => Promise<void>) {
    if (!canEdit()) return false;
    const target = entryTarget(path, contactId); if (!target) return false;
    lock.current = true; setBusy(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    try { await entryIdentity(target, binding.current, controller.signal); if (!current() || controller.signal.aborted) return false; await read(controller.signal); return current() && !controller.signal.aborted; }
    catch (reason) { if (current() && !controller.signal.aborted) fail(reason); return false; }
    finally { lock.current = false; if (current() && !controller.signal.aborted) setBusy(false); }
  }
  return { busy, uncertain, acknowledged, complete, error, accessError: authorityError ?? accessError, protected: busy || uncertain, canEdit, deny, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), refresh };
}
