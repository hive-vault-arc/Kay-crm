"use client";
import { useEffect, useRef, useState } from "react";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { notificationsSchema, readSchema } from "./contracts";

export const notificationFilters = { all: "Toutes", unread: "Non lues", read: "Lues" } as const;
export type NotificationState = keyof typeof notificationFilters;
export type NotificationPage = typeof notificationsSchema._output;
export const notificationDenied = (error?: ApiError) => Boolean(error && [401, 403, 404].includes(error.status));
export function notificationPageValid(value: NotificationPage, page: number, size: number, state: NotificationState) {
  return value.page === page && value.page_size === size && value.items.length <= size && value.total >= value.items.length &&
    new Set(value.items.map(item => item.id)).size === value.items.length &&
    value.items.every(item => state === "all" || (state === "read") === Boolean(item.read_at));
}

// Read-state is idempotent and never changes the underlying task, visit or file.
// Keeping the exact ID/key also handles an acknowledgement lost after commit.
export function useNotificationFeed(size: 10 | 20, initialState: NotificationState = "all") {
  const [state, setState] = useState(initialState), [page, setPage] = useState(1), [busy, setBusy] = useState<string>(), [error, setError] = useState<ApiError>(), [uncertain, setUncertain] = useState(false), [notice, setNotice] = useState("");
  const lock = useRef(false), alive = useRef(true), request = useRef<AbortController | null>(null), attempt = useRef<{ id: string; key: string } | undefined>(undefined), hydrated = useHydrated();
  const query = useQuery(queryPath("notifications", { state, page, page_size: size }), notificationsSchema);
  const authority = notificationDenied(query.error) ? query.error : notificationDenied(error) ? error : undefined;
  const invalid = query.value && !notificationPageValid(query.value, page, size, state);
  const problem = authority ?? query.error ?? (invalid ? new ApiError("DEPENDENCY_UNAVAILABLE", 503) : undefined) ?? error;
  const value = authority || query.error || invalid ? undefined : query.value;
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => { if (authority) { attempt.current = undefined; request.current?.abort(); } }, [authority]);
  async function markRead(id: string) {
    if (!hydrated || lock.current || !alive.current || authority || attempt.current && attempt.current.id !== id) return false;
    if (!attempt.current && !value?.items.some(item => item.id === id && !item.read_at)) return false;
    const current = attempt.current ?? { id, key: crypto.randomUUID() }; attempt.current = current;
    const abort = new AbortController(); request.current = abort; lock.current = true; setBusy(id); setError(undefined); setNotice("");
    try {
      await apiCommand(`/api/v1/notifications/${current.id}/read`, {}, readSchema, current.key, "POST", undefined, abort.signal);
      if (!alive.current || abort.signal.aborted) return false;
      attempt.current = undefined; setUncertain(false); setNotice("Notification marquée comme lue."); query.refresh();
      // This existing scoped invalidation also works when socket updates are off.
      window.dispatchEvent(new CustomEvent("kay:live-invalidate", { detail: ["notifications"] }));
      return true;
    } catch (failure) {
      if (!alive.current || abort.signal.aborted) return false;
      const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      const unknown = problem.status >= 500 || problem.code === "INVALID_RESPONSE";
      if (!unknown) attempt.current = undefined;
      setUncertain(unknown); setError(problem); return false;
    } finally { lock.current = false; if (alive.current) setBusy(undefined); }
  }
  function refresh() { if (!hydrated || lock.current || attempt.current && uncertain) return; attempt.current = undefined; setError(undefined); setNotice(""); setUncertain(false); query.refresh(); }
  function filter(next: NotificationState) { if (!hydrated || lock.current || uncertain || !Object.hasOwn(notificationFilters, next)) return; setState(next); setPage(1); setError(undefined); setNotice(""); }
  function changePage(next: number) { if (hydrated && !lock.current && !uncertain && Number.isInteger(next) && next > 0) { setPage(next); setNotice(""); } }
  return { state, page, size, value, problem, authority, busy, uncertain: uncertain && !authority, notice, hydrated, filter, changePage, refresh, markRead, retry: () => attempt.current ? markRead(attempt.current.id) : Promise.resolve(false), locked: () => lock.current };
}
