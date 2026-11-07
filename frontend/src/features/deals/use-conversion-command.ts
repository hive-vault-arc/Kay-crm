"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { enquirySchema, type Enquiry, type StaffRole } from "@/features/contacts/contracts";
import type { EnquiryDenied } from "@/features/contacts/use-enquiry-command";
import { dealSchema, resultSchema } from "./contracts";
import { convertLeadSchema } from "./qualification-contracts";

type Result = z.infer<typeof resultSchema>;
type Attempt = { body: z.infer<typeof convertLeadSchema>; key: string; dispatched: boolean; uncertain: boolean; receipt?: Result };
type Options = { id: string; contactId: string; actorId?: string; role?: StaffRole; saved: (result: Result, signal: AbortSignal) => void | Promise<void>; denied?: EnquiryDenied; protectedChanged: (value: boolean) => void };

// Conversion creates a different record: receipt acknowledgement, current source
// and scoped destination proof, then navigation each have their own recovery.
export function useConversionCommand({ id, contactId, actorId, role, saved, denied, protectedChanged }: Options) {
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), reviewValid = useRef(true);
  const scopeKey = `${id}:${contactId}:${actorId ?? ""}:${role ?? ""}`, scope = useRef(scopeKey);
  const [origin] = useState(() => ({ actor: actorId, role }));
  const binding = useRef<{ actor?: string; role?: string }>(origin), request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>();
  useEffect(() => { alive.current = true; binding.current = { ...origin }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; binding.current = {}; }; }, [origin]);
  const current = () => alive.current && scope.current === scopeKey;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canReview = () => hydrated && current() && !refused.current && !finished.current && !locked();
  const canEdit = () => canReview() && reviewValid.current;
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  function deny(failure: ApiError) {
    if (!current() || refused.current) return;
    const knownSaved = Boolean(attempt.current?.receipt);
    refused.current = true; request.current?.abort(); attempt.current = undefined;
    setAccessError(failure); setError(failure); setBusy(false); setUncertain(false); setAcknowledged(knownSaved); protectedChanged(false); denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure; }
  async function run(value: Attempt) {
    if (!hydrated || !current() || refused.current || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); protectedChanged(true);
    const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand(`/api/v1/enquiries/${id}/convert`, owned.body, resultSchema, owned.key, "POST", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return false;
        if (receipt.customer_offer_id !== null || receipt.offer_version !== null) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      const receipt = owned.receipt; if (!receipt) throw new ApiError("INVALID_RESPONSE", 503);
      const identity = await apiGet("/api/v1/auth/me", meSchema, controller.signal);
      if (!current() || controller.signal.aborted) return false; authorize(identity);
      const [source, destination] = await Promise.all([apiGet(`/api/v1/enquiries/${id}`, enquirySchema, controller.signal), apiGet(`/api/v1/deals/${receipt.id}`, dealSchema, controller.signal)]);
      if (!current() || controller.signal.aborted) return false;
      if (source.id !== id || destination.id !== receipt.id || destination.version < receipt.version) throw new ApiError("INVALID_RESPONSE", 503);
      if (destination.enquiry_id !== id || destination.created_by_user_id !== binding.current.actor) {
        // A proven foreign receipt is not an acknowledged conversion of this
        // prospect. Retrieve the original operation again, never a new key.
        owned = { ...owned, receipt: undefined }; attempt.current = owned; setAcknowledged(false); throw new ApiError("INVALID_RESPONSE", 503);
      }
      if (source.status !== "converted" || destination.contact.id !== source.contact.id) throw new ApiError("INVALID_RESPONSE", 503);
      await saved(receipt, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && failure.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (current() && !controller.signal.aborted) { setBusy(false); protectedChanged(Boolean(attempt.current?.uncertain)); } }
  }
  function submit(value: unknown) {
    if (!canEdit()) return Promise.resolve(false);
    const parsed = convertLeadSchema.safeParse(value);
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const owned: Attempt = { body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false };
    attempt.current = owned; setAcknowledged(false); return run(owned);
  }
  async function refresh(accept: (value: Enquiry, signal: AbortSignal) => void | Promise<void>) {
    if (!canReview()) return false;
    lock.current = true; setBusy(true); protectedChanged(true); const controller = new AbortController(); request.current = controller;
    try {
      const identity = await apiGet("/api/v1/auth/me", meSchema, controller.signal); if (!current() || controller.signal.aborted) return false; authorize(identity);
      const value = await apiGet(`/api/v1/enquiries/${id}`, enquirySchema, controller.signal); if (!current() || controller.signal.aborted) return false;
      if (value.id !== id) throw new ApiError("INVALID_RESPONSE", 503);
      await accept(value, controller.signal); if (!current() || controller.signal.aborted) return false;
      reviewValid.current = true; setNeedsReview(false); setError(undefined); return true;
    } catch (reason) { if (current() && !controller.signal.aborted) fail(reason); return false; }
    finally { lock.current = false; if (current() && !controller.signal.aborted) { setBusy(false); protectedChanged(false); } }
  }
  return { busy, uncertain, acknowledged, complete, needsReview, error, accessError, protected: busy || uncertain, active: () => current() && !refused.current, locked, canEdit, deny, clearError: () => { if (canEdit()) setError(undefined); }, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), refresh };
}
