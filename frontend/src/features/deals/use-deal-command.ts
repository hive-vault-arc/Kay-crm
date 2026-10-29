"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { z } from "zod";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand, type CommandLifecycle } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import type { StaffRole } from "@/features/contacts/contracts";
import type { EnquiryDenied } from "@/features/contacts/use-enquiry-command";
import { dealSchema, resultSchema, type Deal } from "./contracts";
import { dealCommandIntent, type DealCommandIntent, type DealMutationContext } from "./deal-command-intent";

type Attempt = { intent: DealCommandIntent; key: string; fingerprint: string; dispatched: boolean; uncertain: boolean; receipt?: z.infer<typeof resultSchema>; completed?: DealMutationContext["completed"] };
type Options = { actorId?: string; role?: StaffRole; denied?: EnquiryDenied; completed?: (deal: Deal, signal: AbortSignal) => void | Promise<void> };

// Shared ordinary transitions, qualification fields and scoped client proposals.
// Stock/outcome operations keep their dedicated guarded review workflows.
export function useDealCommand(id: string, starting?: () => void, options: Options = {}) {
  const hydrated = useHydrated(), alive = useRef(true), lock = useRef(false), refused = useRef(false), reviewValid = useRef(true);
  const scopeKey = `${id}:${options.actorId ?? ""}:${options.role ?? ""}`, scope = useRef(scopeKey), latestScope = useRef(scopeKey);
  const [origin] = useState(() => ({ actor: options.actorId, role: options.role })), binding = useRef<{ actor?: string; role?: string }>(origin);
  const attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null), finished = useRef<string | undefined>(undefined), offered = useRef<Deal | undefined>(undefined), minimumVersion = useRef(1);
  const [fresh, updateFresh] = useState<Deal>(), [externalBusy, setBusy] = useState(false), [writing, setWriting] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false), [needsReview, setNeedsReview] = useState(false);
  const [error, updateError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>(), [notice, setNotice] = useState("");
  useLayoutEffect(() => { latestScope.current = scopeKey; }, [scopeKey]);
  useEffect(() => { alive.current = true; binding.current = { ...origin }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; binding.current = {}; }; }, [origin]);
  const current = () => alive.current && scope.current === scopeKey && latestScope.current === scopeKey;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && current() && !refused.current && !locked() && reviewValid.current;
  function setFresh(value?: Deal) {
    if (!current() || refused.current) return;
    if (!value) { updateFresh(undefined); return; }
    const parsed = dealSchema.safeParse(value);
    if (parsed.success && parsed.data.id === id && parsed.data.version >= minimumVersion.current) { minimumVersion.current = parsed.data.version; updateFresh(parsed.data); }
  }
  const authorize: NonNullable<CommandLifecycle["beforeDispatch"]> = identity => {
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  };
  function deny(failure: ApiError) {
    if (!current() || refused.current) return;
    const knownSaved = Boolean(attempt.current?.receipt);
    refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined;
    updateError(failure); setAccessError(failure); updateFresh(undefined); setWriting(false); setBusy(false); setUncertain(false); setAcknowledged(knownSaved); options.denied?.(failure, knownSaved);
  }
  function fail(reason: unknown) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); updateError(failure); if ([401, 403, 404].includes(failure.status)) deny(failure); return failure; }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!current() || signal.aborted) return false; authorize(identity); return true; }
  async function read(signal: AbortSignal, minimum = 1) { const value = await apiGet(`/api/v1/deals/${id}`, dealSchema, signal); if (!current() || signal.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); if (value.id !== id || value.version < Math.max(minimum, minimumVersion.current)) throw new ApiError("INVALID_RESPONSE", 503); return value; }
  async function run(value: Attempt) {
    if (!hydrated || !current() || refused.current || lock.current) return false;
    lock.current = true; setWriting(true); updateError(undefined); setNotice("");
    const controller = new AbortController(); request.current = controller; let owned = value;
    try {
      if (!owned.receipt) {
        const intent = owned.intent;
        const receipt = await apiCommand(intent.path, intent.body, resultSchema, owned.key, intent.method, undefined, controller.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!current() || controller.signal.aborted) return false;
        const proposal = intent.kind === "proposal-create" || intent.kind === "proposal-edit";
        const wrongTarget = receipt.id !== id || receipt.version <= intent.expectedVersion;
        const wrongKind = proposal ? !receipt.customer_offer_id || !receipt.offer_version || intent.kind === "proposal-edit" && (receipt.customer_offer_id !== intent.proposalId || receipt.offer_version <= intent.body.expected_version) : receipt.customer_offer_id !== null || receipt.offer_version !== null;
        if (wrongTarget || wrongKind) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!owned.receipt || !await prove(controller.signal)) return false;
      const value = await read(controller.signal, owned.receipt.version);
      if (!current() || controller.signal.aborted) return false;
      await options.completed?.(value, controller.signal);
      if (!current() || controller.signal.aborted) return false;
      setFresh(value); owned.completed?.(value, controller.signal);
      if (!current() || controller.signal.aborted) return true;
      attempt.current = undefined; finished.current = owned.fingerprint; setUncertain(false); setComplete(true); setNotice("Modification enregistrée. L’historique conserve son auteur."); return true;
    } catch (reason) {
      if (!current() || controller.signal.aborted) return false;
      const failure = fail(reason);
      if (![401, 403, 404].includes(failure.status)) {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && failure.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (current() && !controller.signal.aborted) setWriting(false); }
  }
  function mutate(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH" = "POST", context?: DealMutationContext) {
    const intent = dealCommandIntent(id, path, body, method, context);
    if (!hydrated || !current() || refused.current || lock.current) return Promise.resolve(false);
    if (!intent) { if (!locked()) { setComplete(false); updateError(new ApiError("VALIDATION_ERROR", 422)); } return Promise.resolve(false); }
    const fingerprint = JSON.stringify(intent);
    if (attempt.current?.uncertain) return attempt.current.fingerprint === fingerprint ? run(attempt.current) : Promise.resolve(false);
    if (!canEdit() || finished.current === fingerprint) return Promise.resolve(false);
    minimumVersion.current = Math.max(minimumVersion.current, intent.expectedVersion);
    const owned: Attempt = { intent: structuredClone(intent), key: crypto.randomUUID(), fingerprint, dispatched: false, uncertain: false, completed: context?.completed };
    attempt.current = owned; setAcknowledged(false); setComplete(false); offered.current = undefined;
    try { starting?.(); } catch (reason) { attempt.current = undefined; fail(reason); return Promise.resolve(false); }
    return run(owned);
  }
  async function inspect(reader?: (signal: AbortSignal) => Promise<Deal>, callerSignal?: AbortSignal) {
    if (!hydrated || !current() || refused.current || locked() || callerSignal?.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    offered.current = undefined; lock.current = true; setWriting(true); const controller = new AbortController(); request.current = controller;
    const abort = () => controller.abort(); callerSignal?.addEventListener("abort", abort, { once: true });
    try { if (!await prove(controller.signal)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); const value = reader ? dealSchema.parse(await reader(controller.signal)) : await read(controller.signal); if (!current() || controller.signal.aborted) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); if (value.id !== id || value.version < minimumVersion.current) throw new ApiError("INVALID_RESPONSE", 503); offered.current = value; return value; }
    catch (reason) { const failure = current() && !controller.signal.aborted ? fail(reason) : new ApiError("DEPENDENCY_UNAVAILABLE", 503); throw failure; }
    finally { callerSignal?.removeEventListener("abort", abort); lock.current = false; if (current()) setWriting(false); }
  }
  function accept(value: Deal) { if (!hydrated || !current() || refused.current || locked() || offered.current !== value) return false; setFresh(value); minimumVersion.current = value.version; offered.current = undefined; finished.current = undefined; reviewValid.current = true; setNeedsReview(false); setComplete(false); updateError(undefined); return true; }
  async function reload() { const value = await inspect(); if (!accept(value)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503); return value; }
  function setError(value?: ApiError) { if (!current()) return; if (value && [401, 403, 404].includes(value.status)) deny(value); else if (!locked()) updateError(value); }
  const busy = writing || externalBusy;
  return { fresh, setFresh, busy, setBusy, error, setError, accessError, notice, setNotice, reload, mutate, inspect, accept, uncertain, acknowledged, complete, needsReview, protected: busy || uncertain, locked, canEdit, active: () => current() && !refused.current, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false), deny };
}
