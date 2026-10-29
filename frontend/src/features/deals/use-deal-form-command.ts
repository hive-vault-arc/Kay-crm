"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { contactSchema, type Contact, type StaffRole } from "@/features/contacts/contracts";
import type { EnquiryDenied } from "@/features/contacts/use-enquiry-command";
import { dealSchema, editDealSchema, newDealSchema, resultSchema, type Deal } from "./contracts";

type Options = ({ mode: "create" } | { mode: "edit"; id: string; contactId: string }) & { role: StaffRole; actorId?: string; saved: (deal: Deal, contact: Contact, signal: AbortSignal) => void | Promise<void>; denied?: EnquiryDenied; protectedChanged?: (value: boolean) => void };
type Attempt = ({ mode: "create"; body: z.infer<typeof newDealSchema> } | { mode: "edit"; body: z.infer<typeof editDealSchema> }) & { key: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema> };

export function useDealFormCommand(options: Options) {
  const { actorId, role, saved, denied, protectedChanged } = options;
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), finished = useRef(false), reviewValid = useRef(true);
  const scopeKey = `${options.mode === "edit" ? `${options.id}:${options.contactId}` : "create"}:${actorId ?? ""}:${role}`, scope = useRef(scopeKey);
  const [origin] = useState(() => ({ actor: actorId, role })), binding = useRef<{ actor?: string; role?: string }>(origin);
  const request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>(), [comparison, setComparison] = useState<Deal>();
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
    setError(failure); setAccessError(failure); setAcknowledged(knownSaved); setBusy(false); setUncertain(false); protectedChanged?.(false); denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure; }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!current() || signal.aborted) return false; authorize(identity); return true; }
  async function run(value: Attempt) {
    if (!hydrated || !current() || refused.current || finished.current || lock.current) return false;
    lock.current = true; setBusy(true); setError(undefined); protectedChanged?.(true);
    const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.receipt) {
        const receipt = await apiCommand(options.mode === "edit" ? `/api/v1/deals/${options.id}` : "/api/v1/deals", owned.body, resultSchema, owned.key, owned.mode === "edit" ? "PATCH" : "POST", undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return false;
        if (receipt.customer_offer_id !== null || receipt.offer_version !== null || options.mode === "edit" && receipt.id !== options.id) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      const receipt = owned.receipt; if (!receipt || !await prove(controller.signal)) return false;
      const deal = await apiGet(`/api/v1/deals/${receipt.id}`, dealSchema, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      if (deal.id !== receipt.id || deal.version < receipt.version) throw new ApiError("INVALID_RESPONSE", 503);
      if (owned.mode === "create" && (deal.created_by_user_id !== binding.current.actor || deal.enquiry_id !== null)) {
        owned = { ...owned, receipt: undefined }; attempt.current = owned; setAcknowledged(false); throw new ApiError("INVALID_RESPONSE", 503);
      }
      const contactId = options.mode === "edit" ? options.contactId : owned.mode === "create" ? owned.body.contact_id ?? deal.contact.id : deal.contact.id;
      const contact = await apiGet(`/api/v1/contacts/${contactId}`, contactSchema, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      const atomicVersion = owned.mode === "edit" && owned.body.contact_fields && options.mode === "edit" && contact.id === options.contactId ? owned.body.contact_fields.expected_version + 1 : 0;
      if (contact.id !== deal.contact.id || contact.version < Math.max(deal.contact.version, atomicVersion)) throw new ApiError("INVALID_RESPONSE", 503);
      await saved(deal, contact, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (owned.mode === "edit" && !owned.uncertain && failure.status === 409) {
          reviewValid.current = false; setNeedsReview(true);
          try {
            if (!await prove(controller.signal)) return false;
            const fresh = await apiGet(`/api/v1/deals/${options.mode === "edit" ? options.id : ""}`, dealSchema, controller.signal);
            if (!current() || controller.signal.aborted) return false;
            if (options.mode !== "edit" || fresh.id !== options.id || fresh.version < owned.body.expected_version) throw new ApiError("INVALID_RESPONSE", 503);
            setComparison(fresh);
          } catch (comparisonFailure) { if (current() && !controller.signal.aborted && comparisonFailure instanceof ApiError && [401, 403, 404].includes(comparisonFailure.status)) deny(comparisonFailure); }
        }
      }
      return false;
    } finally { lock.current = false; if (current() && !controller.signal.aborted) { setBusy(false); protectedChanged?.(Boolean(attempt.current?.uncertain)); } }
  }
  function begin() { if (!hydrated || !current() || refused.current || locked() || options.mode === "create" && finished.current) return false; finished.current = false; reviewValid.current = true; setComplete(false); setAcknowledged(false); setNeedsReview(false); setComparison(undefined); setError(undefined); return true; }
  function submit(value: unknown) {
    if (!canEdit()) return Promise.resolve(false);
    let owned: Attempt;
    if (options.mode === "create") { const parsed = newDealSchema.safeParse(value); if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); } owned = { mode: "create", body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false }; }
    else { const parsed = editDealSchema.safeParse(value); if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); } owned = { mode: "edit", body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false }; }
    attempt.current = owned; setAcknowledged(false); return run(owned);
  }
  async function refresh(read: (signal: AbortSignal) => void | Promise<void>) {
    if (!canReview()) return false;
    lock.current = true; setBusy(true); protectedChanged?.(true); const controller = new AbortController(); request.current = controller;
    try { if (!await prove(controller.signal)) return false; await read(controller.signal); if (!current() || controller.signal.aborted) return false; return true; }
    catch (reason) { if (current() && !controller.signal.aborted) fail(reason); return false; }
    finally { lock.current = false; if (current() && !controller.signal.aborted) { setBusy(false); protectedChanged?.(false); } }
  }
  return { busy, uncertain, acknowledged, complete, needsReview, comparison, error, accessError, protected: busy || uncertain, active: () => current() && !refused.current, locked, canEdit, deny, begin, clearError: () => { if (canEdit()) setError(undefined); }, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), refresh };
}
