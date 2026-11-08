"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";
import type { Deal } from "./contracts";
import type { DealCommandRecovery } from "./deal-command-intent";
import { readDealStock, type ReviewedDealStock } from "./deal-stock-review";

export function useDealStockReview(opening: Deal, recovery: DealCommandRecovery | undefined, effects: boolean, initiallyOpen: boolean) {
  const [current, setCurrent] = useState<ReviewedDealStock>({ deal: opening }), [reading, setReading] = useState(false), [error, setError] = useState<ApiError>(), [loaded, setLoaded] = useState(false);
  const alive = useRef(true), lock = useRef(false), request = useRef<AbortController | null>(null), latest = useRef(recovery);
  useEffect(() => { latest.current = recovery; }, [recovery]);
  async function refresh(callerSignal?: AbortSignal) {
    const owner = latest.current;
    if (!alive.current || lock.current || !owner?.active() || owner.locked() || callerSignal?.aborted) return false;
    lock.current = true; setReading(true); setError(undefined);
    const controller = new AbortController(); request.current = controller;
    const abort = () => controller.abort(); callerSignal?.addEventListener("abort", abort, { once: true });
    try {
      let reviewed: ReviewedDealStock | undefined;
      const deal = await owner.inspect(async signal => { reviewed = await readDealStock(opening, effects, signal); return reviewed.deal; }, controller.signal);
      if (!alive.current || controller.signal.aborted || !reviewed || !owner.active() || !owner.accept(deal)) return false;
      setCurrent({ ...reviewed, deal }); setLoaded(true); return true;
    } catch (reason) { if (alive.current && !controller.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); return false; }
    finally { callerSignal?.removeEventListener("abort", abort); lock.current = false; if (alive.current) setReading(false); }
  }
  const initialize = useRef(refresh);
  useEffect(() => {
    alive.current = true; const controller = new AbortController();
    if (initiallyOpen) void Promise.resolve().then(() => { if (!controller.signal.aborted) return initialize.current(controller.signal); });
    return () => { alive.current = false; controller.abort(); request.current?.abort(); };
  }, [initiallyOpen]);
  return { ...current, reading, error, refresh, locked: () => lock.current, ready: loaded && (!effects || Boolean(current.stockReview)) };
}
