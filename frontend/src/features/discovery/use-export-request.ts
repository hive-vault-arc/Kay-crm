"use client";

import { useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { createExportJob } from "./export-command";
import type { ExportJob } from "./contracts";
import type { ExportReview } from "./export-review";

const authorityLost = (error?: ApiError) => Boolean(error && [401, 403, 404].includes(error.status));
type Attempt = { key: string; review: ExportReview; actorId?: string; dispatched: boolean; uncertain: boolean; result?: ExportJob };

export function useExportRequest({ completed, denied, scopeError }: { completed: (job: ExportJob) => void | Promise<void>; denied: () => void; scopeError?: ApiError }) {
  const hydrated = useHydrated(), alive = useRef(true), sending = useRef(false), refused = useRef(false);
  const request = useRef<AbortController | null>(null), attempt = useRef<Attempt | undefined>(undefined);
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [acknowledged, setAcknowledged] = useState(false), [error, setError] = useState<ApiError>();
  // Remember a revoked scope and mask it in this render, before effects cancel transport.
  if (authorityLost(scopeError) && error !== scopeError) setError(scopeError);
  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); attempt.current = undefined; }; }, []);
  useEffect(() => {
    if (!authorityLost(scopeError)) return;
    refused.current = true; request.current?.abort(); attempt.current = undefined;
  }, [scopeError]);
  const locked = () => sending.current || Boolean(attempt.current?.uncertain);
  function clear() {
    if (!alive.current || locked() || refused.current || authorityLost(scopeError)) return false;
    attempt.current = undefined; setError(undefined); setAcknowledged(false); return true;
  }
  async function run(current: Attempt) {
    if (!hydrated || !alive.current || sending.current || refused.current || authorityLost(scopeError)) return false;
    sending.current = true; setPending(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    try {
      if (!current.result) {
        const result = await createExportJob(current.review.body, current.key, current, controller.signal, () => { current.dispatched = true; });
        if (!alive.current || controller.signal.aborted) return false;
        if (result.kind !== current.review.body.kind) throw new ApiError("INVALID_RESPONSE", 503);
        current.result = result; setAcknowledged(true);
      }
      await completed(current.result);
      if (!alive.current || controller.signal.aborted) return false;
      attempt.current = undefined; setUncertain(false); setAcknowledged(false); return true;
    } catch (reason) {
      if (!alive.current || controller.signal.aborted) return false;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      if (authorityLost(failure) && !current.result) {
        refused.current = true; attempt.current = undefined; setUncertain(false); denied();
      } else {
        current.uncertain = Boolean(current.result) || current.uncertain || current.dispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE");
        setUncertain(current.uncertain); if (!current.uncertain) attempt.current = undefined;
      }
      return false;
    } finally { sending.current = false; if (alive.current && !controller.signal.aborted) setPending(false); }
  }
  function submit(review: ExportReview) {
    if (!clear()) return Promise.resolve(false);
    const current: Attempt = { key: crypto.randomUUID(), review: structuredClone(review), dispatched: false, uncertain: false };
    attempt.current = current; return run(current);
  }
  const lostScope = authorityLost(scopeError) || authorityLost(error);
  return { pending: !lostScope && pending, uncertain: !lostScope && uncertain, acknowledged: !lostScope && acknowledged, error: authorityLost(scopeError) ? scopeError : error, denied: lostScope, locked, clear, submit, retry: () => attempt.current?.uncertain ? run(attempt.current) : Promise.resolve(false) };
}
