"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { userCommand } from "./api";
import { commandSchema, userRoute, type StaffUser } from "./contracts";
import { useStaffOperationScope } from "./staff-operation-scope";

type Method = "POST" | "PATCH" | "DELETE";
type Operation = { path: `/api/v1/${string}`; method: Method };
type Attempt = Operation & { body: unknown; key: string; dispatched: boolean; uncertain: boolean; result?: { user: StaffUser } };
export const staffAuthorityErrors = new Set(["FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "NOT_FOUND"]);

export function useStaffCommand({ actorId, targetId, completed, denied, rejected }: {
  actorId: string; targetId?: string;
  completed: (user: StaffUser, operation: Operation) => void | Promise<void>;
  denied: (error: ApiError) => void;
  rejected?: (error: ApiError) => void;
}) {
  const scope = useStaffOperationScope(), { claim, release, otherOwner } = scope, hydrated = useHydrated();
  const owner = useRef(Symbol("staff-command")), alive = useRef(true), sending = useRef(false), refused = useRef(false);
  const request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined);
  const [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [error, setError] = useState<ApiError>();
  useEffect(() => {
    alive.current = true;
    const token = owner.current;
    return () => {
      alive.current = false; request.current?.abort();
      if (attempt.current) { attempt.current.body = undefined; attempt.current.result = undefined; }
      attempt.current = undefined; release(token);
    };
  }, [release]);
  const locked = () => sending.current || Boolean(attempt.current?.uncertain);
  function reserve() {
    return hydrated && alive.current && !refused.current && !locked() && claim(owner.current);
  }
  function cancelReservation() { if (!locked()) release(owner.current); }

  async function run(current: Attempt) {
    if (!hydrated || !alive.current || refused.current || sending.current || !claim(owner.current)) return false;
    sending.current = true; setBusy(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    try {
      if (!current.result) {
        const result = await userCommand(current.path, current.body, commandSchema, current.key, current.method, {
          actorId, signal: controller.signal, dispatched: () => { current.dispatched = true; },
        });
        if (!alive.current || controller.signal.aborted) return false;
        if (targetId && result.user.id !== targetId) throw new ApiError("INVALID_RESPONSE", 503);
        current.result = result;
        // After acknowledgement only the safe response is needed, never another credential-bearing request.
        current.body = undefined; setAcknowledged(true);
      }
      await completed(current.result.user, { path: current.path, method: current.method });
      if (!alive.current || controller.signal.aborted) return false;
      attempt.current = undefined; setUncertain(false); setAcknowledged(false); release(owner.current); return true;
    } catch (reason) {
      if (!alive.current || controller.signal.aborted) return false;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      if (staffAuthorityErrors.has(failure.code) && !current.result) {
        refused.current = true; attempt.current = undefined; setUncertain(false); release(owner.current); denied(failure);
      } else {
        current.uncertain = Boolean(current.result) || current.uncertain || current.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE");
        setUncertain(current.uncertain);
        if (!current.uncertain) { attempt.current = undefined; release(owner.current); rejected?.(failure); }
      }
      return false;
    } finally { sending.current = false; if (alive.current) setBusy(false); }
  }

  function save(path: `/api/v1/${string}`, body: unknown, method: Method) {
    if (!reserve()) return Promise.resolve(false);
    const key = path.slice("/api/v1/".length), requestedTarget = key.split("/")[1];
    if (!path.startsWith("/api/v1/") || !userRoute(key, method) || (targetId ? requestedTarget !== targetId : key !== "users")) {
      release(owner.current); setError(new ApiError("VALIDATION_ERROR", 422)); return Promise.resolve(false);
    }
    // No serialized password fingerprint, draft snapshot, persistent cache or alternate request owner.
    const current: Attempt = { path, method, body: structuredClone(body), key: crypto.randomUUID(), dispatched: false, uncertain: false };
    attempt.current = current;
    return run(current);
  }
  function clear() {
    if (locked()) return false;
    attempt.current = undefined; setError(undefined); setAcknowledged(false); release(owner.current); return true;
  }
  return {
    busy, uncertain, acknowledged, error, scopeActive: scope.active, save, reserve, cancelReservation, clear, locked,
    otherBusy: () => otherOwner(owner.current),
    retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false),
  };
}

export function StaffCommandFailure({ command, reload }: { command: ReturnType<typeof useStaffCommand>; reload?: () => void }) {
  if (!command.error) return null;
  return <div className="grid min-w-0 gap-3"><RecordError error={command.error} />{command.uncertain ? <>
    <p>{command.acknowledged ? "L’opération est enregistrée. Actualisez son résultat pour terminer." : "La réponse est interrompue. L’opération est peut-être enregistrée. Réessayez la même opération pour retrouver son résultat."}</p>
    <Button action="retry" type="button" variant="outline" disabled={command.busy} onClick={() => void command.retry()}>{command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération"}</Button>
  </> : reload ? <Button action="refresh" type="button" variant="outline" disabled={command.busy} onClick={reload}>Recharger la fiche</Button> : null}</div>;
}
