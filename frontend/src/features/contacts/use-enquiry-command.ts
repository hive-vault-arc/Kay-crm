"use client";
import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { apiGet, ApiError } from "@/lib/api/client";
import { meSchema } from "@/lib/auth/contracts";
import { editEnquirySchema, enquirySchema, type Enquiry } from "./contracts";

type Attempt = { body: z.infer<typeof editEnquirySchema>; key: string; dispatched: boolean; uncertain: boolean; result?: Enquiry };
export type EnquiryDenied = (error: ApiError, acknowledged?: boolean) => void;
export function useEnquiryCommand({ id, contactId, saved, denied }: { id: string; contactId: string; saved: (result: Enquiry, signal: AbortSignal) => void | Promise<void>; denied?: EnquiryDenied }) {
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), reviewValid = useRef(true);
  const scope = useRef(`${id}:${contactId}`), attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null), binding = useRef<{ actor?: string; role?: string }>({});
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>();
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; binding.current = {}; }; }, []);
  const current = () => alive.current && scope.current === `${id}:${contactId}`;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && current() && !refused.current && !finished.current && !locked();
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (binding.current.actor && identity.user.id !== binding.current.actor || binding.current.role && identity.user.role !== binding.current.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  function deny(failure: ApiError) {
    if (!current() || refused.current) return;
    const knownSaved = Boolean(attempt.current?.result);
    refused.current = true; request.current?.abort(); attempt.current = undefined;
    setAccessError(failure); setError(failure); setBusy(false); setUncertain(false); setAcknowledged(knownSaved); denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure; }
  async function run(value: Attempt) {
    if (!hydrated || !current() || refused.current || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined);
    const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.result) {
        const result = await apiCommand(`/api/v1/enquiries/${id}`, owned.body, enquirySchema, owned.key, "PATCH", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return false;
        if (result.id !== id || result.contact.id !== contactId) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, result }; attempt.current = owned; setAcknowledged(true);
      }
      const result = owned.result; if (!result) throw new ApiError("INVALID_RESPONSE", 503);
      await saved(result, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.result) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && failure.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (current() && !controller.signal.aborted) setBusy(false); }
  }
  function begin() {
    if (!hydrated || !current() || refused.current || locked()) return false;
    finished.current = false; reviewValid.current = true; setComplete(false); setAcknowledged(false); setNeedsReview(false); setError(undefined); return true;
  }
  function submit(value: unknown) {
    if (!canEdit() || !reviewValid.current) return Promise.resolve(false);
    const parsed = editEnquirySchema.safeParse(value);
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const owned = { body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false };
    attempt.current = owned; setAcknowledged(false); return run(owned);
  }
  async function refresh(read: (signal: AbortSignal) => Promise<void>) {
    if (!canEdit()) return false;
    lock.current = true; setBusy(true); const controller = new AbortController(); request.current = controller;
    try { const identity = await apiGet("/api/v1/auth/me", meSchema, controller.signal); if (!current() || controller.signal.aborted) return false; authorize(identity); await read(controller.signal); return current() && !controller.signal.aborted; }
    catch (reason) { if (current() && !controller.signal.aborted) fail(reason); return false; }
    finally { lock.current = false; if (current() && !controller.signal.aborted) setBusy(false); }
  }
  return { busy, uncertain, acknowledged, complete, needsReview, error, accessError, protected: busy || uncertain, locked, canEdit, deny, begin, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), refresh };
}
