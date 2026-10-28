"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { contactSchema, type StaffRole } from "./contracts";
import { commandResultSchema, previewSchema, ownershipPreviewMatches, ownershipResultMatches, type ChangeIntent, type Operation, type OwnershipResult, type OwnershipReview } from "./ownership-contracts";
import { ownershipIdentity, ownershipRequest, type OwnershipIdentity } from "./ownership-client";

export type OwnershipDenied = (error: ApiError, acknowledged?: boolean) => void;
type Attempt = { review: OwnershipReview; dispatched: boolean; uncertain: boolean; result?: OwnershipResult };
const authorityLost = (error: ApiError) => [401, 403, 404].includes(error.status);

export function useOwnershipCommand({ sourceId, role, completed, denied }: {
  sourceId: string; role: StaffRole;
  completed: (target: string, operation: Operation, signal: AbortSignal) => Promise<void>;
  denied?: OwnershipDenied;
}) {
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), reviewValid = useRef(true);
  const binding = useRef<OwnershipIdentity>({ role }), request = useRef<AbortController | null>(null);
  const reviewed = useRef<OwnershipReview | undefined>(undefined), attempt = useRef<Attempt | undefined>(undefined);
  const [prepared, setPrepared] = useState<OwnershipReview>(), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>(), [needsReview, setNeedsReview] = useState(false), [aliases, setAliases] = useState<string[]>([]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); reviewed.current = undefined; attempt.current = undefined; }; }, []);
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && alive.current && !refused.current && !locked() && !reviewed.current;
  function deny(failure: ApiError) {
    if (!alive.current || refused.current) return;
    const saved = Boolean(attempt.current?.result);
    refused.current = true; request.current?.abort(); reviewed.current = undefined; attempt.current = undefined;
    setPrepared(undefined); setUncertain(false); setAcknowledged(saved); setBusy(false); setAccessError(failure); setError(failure); setAliases([]);
    denied?.(failure, saved);
  }
  function failed(reason: unknown) {
    const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    setError(failure); if (authorityLost(failure)) deny(failure); return failure;
  }
  async function prepare(intent: ChangeIntent) {
    if (!canEdit() || role === "agent" && intent.operation !== "merge") return false;
    lock.current = true; setBusy(true); setError(undefined); setAliases([]);
    const controller = new AbortController(); request.current = controller;
    try {
      const snapshot = structuredClone(intent);
      const preview = await ownershipRequest(sourceId, "preview", snapshot, previewSchema, crypto.randomUUID(), binding.current, controller.signal);
      if (!alive.current || controller.signal.aborted) return false;
      if (!ownershipPreviewMatches(sourceId, snapshot, preview)) throw new ApiError("INVALID_RESPONSE", 503);
      const value = { sourceId, intent: snapshot, preview, key: crypto.randomUUID() };
      reviewed.current = value; reviewValid.current = true; setPrepared(value); setNeedsReview(false); setAcknowledged(false); return true;
    } catch (reason) { if (alive.current && !controller.signal.aborted) failed(reason); return false; }
    finally { lock.current = false; if (alive.current && !controller.signal.aborted) setBusy(false); }
  }
  async function confirm() {
    if (!hydrated || !alive.current || refused.current || lock.current || !reviewed.current || !reviewValid.current) return false;
    let current: Attempt = attempt.current ?? { review: reviewed.current, dispatched: false, uncertain: false };
    attempt.current = current; lock.current = true; setBusy(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    try {
      if (!current.result) {
        const value = current.review;
        const result = await ownershipRequest(sourceId, value.intent.operation, { ...value.intent, preview_token: value.preview.preview_token }, commandResultSchema, value.key, binding.current, controller.signal, () => { current = { ...current, dispatched: true }; attempt.current = current; });
        if (!alive.current || controller.signal.aborted) return false;
        if (!ownershipResultMatches(value, result)) throw new ApiError("INVALID_RESPONSE", 503);
        current = { ...current, result }; attempt.current = current; setAcknowledged(true);
      }
      const result = current.result;
      if (!result) throw new ApiError("INVALID_RESPONSE", 503);
      await completed(result.contact_id, current.review.intent.operation, controller.signal);
      if (!alive.current || controller.signal.aborted) return false;
      attempt.current = undefined; reviewed.current = undefined; setPrepared(undefined); setUncertain(false); return true;
    } catch (reason) {
      if (!alive.current || controller.signal.aborted) return false;
      const failure = failed(reason);
      if (!authorityLost(failure)) {
        current = { ...current, uncertain: Boolean(current.result) || current.uncertain || current.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") }; attempt.current = current;
        setUncertain(current.uncertain);
        if (!current.uncertain) { attempt.current = undefined; if (failure.status === 409 || failure.status === 422) { reviewValid.current = false; setNeedsReview(true); } }
      }
      return false;
    } finally { lock.current = false; if (alive.current && !controller.signal.aborted) setBusy(false); }
  }
  function dismiss() {
    if (!alive.current || refused.current || locked()) return false;
    reviewed.current = undefined; attempt.current = undefined; reviewValid.current = true;
    setPrepared(undefined); setError(undefined); setNeedsReview(false); setAcknowledged(false); return true;
  }
  async function refresh(survivorId?: string) {
    if (!canEdit()) return;
    lock.current = true; setBusy(true); setError(undefined); setAliases([]);
    const controller = new AbortController(); request.current = controller;
    try {
      await ownershipIdentity(binding.current, controller.signal);
      const [contact, survivor] = await Promise.all([apiGet(`/api/v1/contacts/${sourceId}`, contactSchema, controller.signal), survivorId ? apiGet(`/api/v1/contacts/${survivorId}`, contactSchema, controller.signal) : undefined]);
      if (!alive.current || controller.signal.aborted) return;
      const redirects = [...(contact.id !== sourceId ? [contact.id] : []), ...(survivor && survivor.id !== survivorId ? [survivor.id] : [])];
      if (redirects.length) { setAliases([...new Set(redirects)]); throw new ApiError("CONTACT_MERGED", 409); }
      return { contact, survivor, signal: controller.signal };
    } catch (reason) { if (alive.current && !controller.signal.aborted) failed(reason); }
    finally { lock.current = false; if (alive.current && !controller.signal.aborted) setBusy(false); }
  }
  return { prepared, busy, uncertain, acknowledged, error, accessError, needsReview, aliases, protected: busy || uncertain, canEdit, locked, prepare, confirm, dismiss, refresh, deny };
}
