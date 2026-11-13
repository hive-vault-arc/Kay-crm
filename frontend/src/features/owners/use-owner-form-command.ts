"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { contactSchema, type Contact, type StaffRole } from "@/features/contacts/contracts";
import { contactProjectionValid } from "@/features/contacts/contact-edit-intent";
import { ownerFormIntent, ownerFormReceipt, type OwnerFormIntent } from "./owner-form-intent";

type Completed = (value: Contact, signal: AbortSignal) => void | Promise<void>;
type Attempt = { intent: OwnerFormIntent; key: string; dispatched: boolean; uncertain: boolean; receipt?: Contact; completing: boolean; completed: Completed };
const lost = (error: ApiError) => [401, 403, 404].includes(error.status);

export function useOwnerFormCommand({ contact, subject, actorId, role, available = true, denied }: { contact?: Contact; subject?: Contact; actorId?: string; role: StaffRole; available?: boolean; denied: (error: ApiError, acknowledged?: boolean) => void }) {
  const hydrated = useHydrated(), key = `${contact?.id ?? "new"}:${actorId ?? ""}:${role}`;
  const [origin] = useState(() => ({ key, id: contact?.id, version: contact?.version, actor: actorId, role }));
  const alive = useRef(true), refused = useRef(false), finished = useRef(false), lock = useRef(false), latest = useRef(key), target = useRef(subject), binding = useRef(actorId);
  const minimum = useRef(new Map<string, number>()), accepted = useRef(new Map<string, number>()), reviewed = useRef<string | undefined>(undefined), offered = useRef<Contact | undefined>(undefined);
  const attempt = useRef<Attempt | undefined>(undefined), request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [complete, setComplete] = useState(false);
  const [kind, setKind] = useState<OwnerFormIntent["kind"]>(), [error, setError] = useState<ApiError>(), [denial, setDenial] = useState<ApiError>(), [comparison, setComparison] = useState<Contact>(), [needsReview, setNeedsReview] = useState(false);
  useLayoutEffect(() => { latest.current = key; target.current = subject; if (subject) minimum.current.set(subject.id, Math.max(minimum.current.get(subject.id) ?? 0, subject.version)); }, [key, subject]);
  useEffect(() => { const minimumVersions = minimum.current, acceptedVersions = accepted.current; alive.current = true; binding.current = origin.actor; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; offered.current = undefined; minimumVersions.clear(); acceptedVersions.clear(); binding.current = undefined; }; }, [origin]);
  const active = () => alive.current && !refused.current && latest.current === origin.key;
  const locked = () => lock.current || Boolean(attempt.current?.uncertain);
  const canEdit = () => hydrated && active() && available && !finished.current && !locked();
  function deny(problem: ApiError) {
    if (!active()) return;
    const recorded = Boolean(attempt.current?.receipt); refused.current = true; request.current?.abort(); attempt.current = undefined; offered.current = undefined;
    setDenial(problem); setError(problem); setBusy(false); setUncertain(false); setAcknowledged(recorded); setComparison(undefined); denied(problem, recorded);
  }
  function authorize(identity: ReturnType<typeof meSchema.parse>) {
    if (!active() || identity.user.role !== origin.role || binding.current && identity.user.id !== binding.current) throw new ApiError("FORBIDDEN", 403);
    if (identity.must_change_password) throw new ApiError("PASSWORD_CHANGE_REQUIRED", 403);
    binding.current = identity.user.id;
  }
  async function prove(signal: AbortSignal) { const identity = await apiGet("/api/v1/auth/me", meSchema, signal); if (!active() || signal.aborted) return false; authorize(identity); return true; }
  async function read(id: string, version: number, signal: AbortSignal) {
    const value = await apiGet(`/api/v1/contacts/${id}?owner_identity=true`, contactSchema, signal);
    if (value.id !== id) throw new ApiError("NOT_FOUND", 404);
    if (value.version < Math.max(minimum.current.get(id) ?? 0, version) || !contactProjectionValid(value)) throw new ApiError("INVALID_RESPONSE", 503);
    return value;
  }
  async function run(value: Attempt) {
    if (!hydrated || !active() || finished.current || lock.current) return false;
    let owned = value; const abort = new AbortController(); request.current = abort; lock.current = true; setBusy(true); setError(undefined);
    try {
      if (owned.intent.kind !== "open" && !owned.receipt) {
        const intent = owned.intent, path = intent.kind === "create" ? "/api/v1/contacts" : `/api/v1/contacts/${intent.id}` as const;
        const result = await apiCommand(path, intent.body, contactSchema, owned.key, intent.kind === "create" ? "POST" : "PATCH", undefined, abort.signal, { beforeDispatch: authorize, dispatched: () => { owned = { ...owned, dispatched: true }; attempt.current = owned; } });
        if (!active() || abort.signal.aborted) return false;
        const receipt = binding.current && ownerFormReceipt(intent, result, binding.current); if (!receipt) throw new ApiError("INVALID_RESPONSE", 503);
        owned = { ...owned, receipt }; attempt.current = owned; setAcknowledged(true);
      }
      if (!await prove(abort.signal)) return false;
      const intent = owned.intent, id = owned.receipt?.id ?? (intent.kind !== "create" ? intent.id : undefined);
      if (!id) throw new ApiError("INVALID_RESPONSE", 503);
      const current = await read(id, owned.receipt?.version ?? (intent.kind === "open" ? intent.version : 0), abort.signal);
      if (!active() || abort.signal.aborted) return false;
      if (intent.kind === "open" && (current.archived_at || !current.roles.includes("owner"))) throw new ApiError("VERSION_CONFLICT", 409);
      owned = { ...owned, completing: true }; attempt.current = owned;
      await owned.completed(current, abort.signal); if (!active() || abort.signal.aborted) return false;
      finished.current = true; attempt.current = undefined; setUncertain(false); setComplete(true); return true;
    } catch (reason) {
      if (!active() || abort.signal.aborted) return false;
      const problem = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem);
      if (lost(problem)) deny(problem);
      else {
        owned = { ...owned, uncertain: Boolean(owned.receipt) || owned.completing || owned.uncertain || owned.dispatched && (problem.status >= 500 || problem.code === "INVALID_RESPONSE") };
        attempt.current = owned.uncertain ? owned : undefined; setUncertain(owned.uncertain);
        if (!owned.uncertain && problem.status === 409 && owned.intent.kind !== "create") { reviewed.current = owned.intent.id; setNeedsReview(true); }
      }
      return false;
    } finally { lock.current = false; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function start(input: OwnerFormIntent, completed: Completed) {
    if (!canEdit() || reviewed.current) return Promise.resolve(false);
    const intent = ownerFormIntent(input), current = target.current;
    if (!intent) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const valid = intent.kind === "create" ? !origin.id && !current && (role === "agent" ? !intent.body.primary_agent_id : Boolean(intent.body.primary_agent_id))
      : intent.id === current?.id && !current.archived_at && (intent.kind === "edit" ? intent.id === origin.id && intent.body.expected_version === (accepted.current.get(intent.id) ?? origin.version) : !origin.id && (intent.kind === "open" || intent.body.expected_version === current.version));
    if (!valid) { setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false); }
    const owned: Attempt = { intent: structuredClone(intent), key: crypto.randomUUID(), dispatched: false, uncertain: false, completing: false, completed };
    attempt.current = owned; setKind(intent.kind); offered.current = undefined; setComparison(undefined); setAcknowledged(false); return run(owned);
  }
  async function compare() {
    const id = reviewed.current; if (!canEdit() || !id || target.current?.id !== id) return;
    lock.current = true; setBusy(true); offered.current = undefined; setComparison(undefined); const abort = new AbortController(); request.current = abort;
    try { if (!await prove(abort.signal)) return; const value = await read(id, 0, abort.signal); if (active() && !abort.signal.aborted) { offered.current = value; setComparison(value); } }
    catch (reason) { if (active() && !abort.signal.aborted) { const problem = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(problem); if (lost(problem)) deny(problem); } }
    finally { lock.current = false; if (active() && !abort.signal.aborted) setBusy(false); }
  }
  function accept(value: Contact) {
    if (!canEdit() || offered.current !== value || reviewed.current !== value.id || target.current?.id !== value.id || value.archived_at || value.version < (minimum.current.get(value.id) ?? 0)) return false;
    accepted.current.set(value.id, value.version); minimum.current.set(value.id, value.version); reviewed.current = undefined; offered.current = undefined;
    setComparison(undefined); setNeedsReview(false); setError(undefined); return true;
  }
  function reset() { if (!canEdit()) return false; reviewed.current = undefined; offered.current = undefined; setComparison(undefined); setNeedsReview(false); setError(undefined); setAcknowledged(false); return true; }
  function clear() { if (canEdit() && !reviewed.current) setError(undefined); }
  return { busy, uncertain, acknowledged, complete, kind, error, denial, comparison, needsReview, active, canEdit, locked, deny, start, compare, accept, reset, clear, protected: busy || uncertain, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
