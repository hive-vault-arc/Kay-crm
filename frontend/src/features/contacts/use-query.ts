"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { apiGet, ApiError } from "@/lib/api/client";
import { matchesTopics } from "@/features/realtime/query-topics";
import { subscribeLive } from "@/features/realtime/live-events";

function deferDetail(path: string) {
  const recordRead = /^\/api\/v1\/(contacts|enquiries|deals|tasks|requirements|commissions|visits|properties|developments)\/[a-f0-9-]{36}$/.test(path.split("?")[0]);
  return (recordRead || path === "/api/v1/visit-schedule/policy" || path.startsWith("/api/v1/generated-documents/context")) && Boolean(document.querySelector("[data-live-dirty]"));
}

export function queryPath(kind: string, values: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== "") query.set(key, String(value));
  return `/api/v1/${kind}?${query.toString().replace(/\+/g, "%20")}` as `/api/v1/${string}`;
}
export function useQuery<T>(path: `/api/v1/${string}`, schema: z.ZodType<T>) {
  const [state, setState] = useState<{ path: string; value?: T; error?: ApiError }>();
  const [retry, setRetry] = useState(0);
  const fetching = useRef(false), queued = useRef(false);
  const liveRequest = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    const backgroundLive = liveRequest.current; liveRequest.current = false;
    fetching.current = true;
    apiGet(path, schema, abort.signal).then(value => {
      if (abort.signal.aborted) return;
      if (backgroundLive && deferDetail(path)) { window.dispatchEvent(new Event("kay:live-deferred")); return; }
      setState({ path, value });
    }).catch(reason => {
      if (!abort.signal.aborted) setState({ path, error: reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503) });
    }).finally(() => {
      if (!abort.signal.aborted) {
        fetching.current = false;
        if (queued.current) { queued.current = false; liveRequest.current = true; setRetry(value => value + 1); }
      }
    });
    return () => { abort.abort(); fetching.current = false; };
  }, [path, schema, retry]);
  const refresh = useCallback(() => { setState(undefined); setRetry(value => value + 1); }, []);
  const refreshQuietly = useCallback(() => setRetry(value => value + 1), []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const changed = (topics?: string[]) => {
      if (topics && !matchesTopics(path, topics)) return;
      if (document.visibilityState !== "visible") return;
      if (deferDetail(path)) {
        window.dispatchEvent(new Event("kay:live-deferred")); return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (fetching.current) queued.current = true;
        else { liveRequest.current = true; refreshQuietly(); }
      }, 300 + Math.random() * 200);
    };
    const unsubscribe = subscribeLive(changed);
    return () => { clearTimeout(timer); queued.current = false; unsubscribe(); };
  }, [path, refreshQuietly]);
  return { value: state?.path === path ? state.value : undefined, error: state?.path === path ? state.error : undefined, refresh, refreshQuietly };
}
