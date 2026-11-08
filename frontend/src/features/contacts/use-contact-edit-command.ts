"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { contactSchema, editContactSchema, type Contact, type StaffRole } from "./contracts";
import { contactEditReceipt, contactProjectionValid, type ContactEditBinding, type ContactEditBody } from "./contact-edit-intent";

type Completed = (value: Contact) => void | Promise<void>;
type Denied = (error: ApiError, acknowledged?: boolean) => void;
type Attempt = { body: ContactEditBody; key: string; dispatched: boolean; uncertain: boolean; receipt?: Contact; completed: Completed };
const lost = (error: ApiError) => [401, 403, 404].includes(error.status);

export function useContactEditCommand({ contact, completed, denied, actorId, role, available = true }: {
  contact: Contact; completed: Completed; denied: Denied; available?: boolean;
} & ContactEditBinding) {
  const hydrated = useHydrated(), key = `${contact.id}:${actorId ?? ""}:${role ?? ""}`;
  const [origin] = useState(() => ({ id: contact.id, actor: actorId, role, version: contact.version }));
  const alive = useRef(true), refused = useRef(false), finished = useRef(false), lock = useRef(false), currentKey = useRef(key), openingKey = useRef(key);
  const binding = useRef<{ actor?: string; role?: StaffRole }>({ actor: origin.actor, role: origin.role });
  const expected = useRef(origin.version), minimum = useRef(origin.version), reviewValid = useRef(true), offered = useRef<Contact | undefined>(undefined);
  const attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false);
  const [error, setError] = useState<ApiError>(), [denial, setDenial] = useState<ApiError>(), [comparison, setComparison] = useState<Contact>(), [needsReview, setNeedsReview] = useState(false);
  useLayoutEffect(() => { currentKey.current = key; if (contact.id === origin.id) minimum.current = Math.max(minimum.current, contact.version); }, [key, contact.id, contact.version, origin.id]);
  useEffect(() => { alive.current = true; binding.current = { actor: origin.actor, role: origin.role }; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; binding.current = {}; }; }, [origin]);
  const active = () => alive.current && !refused.current && openingKey.current === currentKey.current;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && !finished.current && available && !contact.archived_at && contactProjectionValid(contact) && !locked() && reviewValid.current;
  function deny(problem: ApiError) {
    if (!active()) return;
    const saved = Boolean(attempt.current?.receipt); refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined;
    setDenial(problem); setError(problem); setComparison(undefined); setPending(false); setUncertain(false); setAcknowledged(saved); denied(problem, saved);
  }
  function authorize(identity: ReturnType<typeof meSchema.parse>) {
    if (!active()) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    if (binding.current.actor && binding.current.actor !== identity.user.id || binding.current.role && binding.current.role !== identity.user.role) throw new ApiError("FORBIDDEN", 403);
    binding.current = { actor: identity.user.id, role: identity.user.role };
  }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!active() || signal.aborted) return false; authorize(identity); return true; }
  async function read(signal: AbortSignal) {
    const value = await apiGet(`/api/v1/contacts/${origin.id}`, contactSchema, signal);
    if (value.id !== origin.id) throw new ApiError("NOT_FOUND", 404);
    if (value.version < minimum.current || !contactProjectionValid(value)) throw new ApiError("INVALID_RESPONSE", 503);
    return value;
  }
  async function run(value: Attempt) {
    if (!hydrated || !active() || finished.current || lock.current) return false;
    lock.current = true; setPending(true); setError(undefined); const abort = new AbortController(); request.current = abort; let owned = value;
    try {
      if (!owned.receipt) {
        const result = await apiCommand(`/api/v1/contacts/${origin.id}`, owned.body, contactSchema, owned.key, "PATCH", undefined, abort.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!active() || abort.signal.aborted) return false;
        const receipt = contactEditReceipt(origin.id, owned.body, result);
        if (!receipt) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!await prove(abort.signal)) return false;
      const current = await read(abort.signal);
      if (!active() || abort.signal.aborted) return false;
      if (!owned.receipt || current.version < owned.receipt.version) throw new ApiError("INVALID_RESPONSE", 503);
      await owned.completed(current);
      if (!active() || abort.signal.aborted) return false;
      attempt.current = undefined; finished.current = true; setUncertain(false); setComplete(true); return true;
    } catch (failure) {
      if (!active() || abort.signal.aborted) return false;
      const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem);
      if (lost(problem)) deny(problem);
      else {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.uncertain || owned.dispatched && (problem.status >= 500 || problem.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && problem.status === 409) { reviewValid.current = false; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (active() && !abort.signal.aborted) setPending(false); }
  }
  function save(value: unknown, done: Completed = completed) {
    if (!canEdit()) return Promise.resolve(false);
    const parsed = editContactSchema.safeParse(value);
    if (!parsed.success || parsed.data.expected_version !== expected.current) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const owned: Attempt = { body: structuredClone(parsed.data), key: crypto.randomUUID(), dispatched: false, uncertain: false, completed: done };
    attempt.current = owned; offered.current = undefined; setComparison(undefined); setAcknowledged(false); return run(owned);
  }
  async function compare() {
    if (!hydrated || !active() || finished.current || locked()) return;
    lock.current = true; setPending(true); offered.current = undefined; setComparison(undefined); const abort = new AbortController(); request.current = abort;
    try {
      if (!await prove(abort.signal)) return;
      const value = await read(abort.signal);
      if (active() && !abort.signal.aborted) { offered.current = value; reviewValid.current = false; setNeedsReview(true); setComparison(value); }
    } catch (failure) { if (active() && !abort.signal.aborted) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (lost(problem)) deny(problem); } }
    finally { lock.current = false; if (active() && !abort.signal.aborted) setPending(false); }
  }
  function accept(value: Contact) {
    if (!hydrated || !active() || finished.current || locked() || !available || offered.current !== value || value.archived_at || value.id !== origin.id || value.version < minimum.current) return false;
    expected.current = value.version; minimum.current = value.version; reviewValid.current = true; offered.current = undefined; attempt.current = undefined;
    setComparison(undefined); setNeedsReview(false); setError(undefined); setAcknowledged(false); return true;
  }
  function clear() { if (!active() || locked() || !reviewValid.current) return; attempt.current = undefined; setError(undefined); }
  return { pending, uncertain, acknowledged, complete, error, denial, comparison, needsReview, protected: pending || uncertain, active, canEdit, locked, save, compare, accept, clear, deny, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
