"use client";

import { useEffect, useRef, useState } from "react";
import type { Selection } from "./drill-down";
import type { AttributionMetric } from "./report-model";

type ParentView = { kind: "overview" } | { kind: "attribution"; metric: AttributionMetric } | { kind: "alerts" };
export type ReportView = ParentView | { kind: "drill"; selection: Selection; parent: ParentView };
type Position = { target: HTMLElement | null; scroller: HTMLElement | null; top: number };

export function useReportNavigation() {
  const [view, setView] = useState<ReportView>({ kind: "overview" });
  const history = useRef<{ view: ReportView; position: Position }[]>([]);
  const pending = useRef<Position | "heading" | null>(null), root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const next = pending.current;
    pending.current = null;
    if (!next) return;
    if (next === "heading") {
      root.current?.closest<HTMLElement>(".kay-drawer-body")?.scrollTo({ top: 0 });
      root.current?.querySelector<HTMLElement>('[data-report-active="true"] [data-report-heading]')?.focus({ preventScroll: true });
    } else {
      if (next.scroller?.isConnected) next.scroller.scrollTop = next.top;
      if (next.target?.isConnected) next.target.focus({ preventScroll: true });
      else root.current?.querySelector<HTMLElement>('[data-report-active="true"] [data-report-heading]')?.focus({ preventScroll: true });
    }
  }, [view]);
  function open(next: ReportView) {
    const target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroller = root.current?.closest<HTMLElement>(".kay-drawer-body") ?? null;
    history.current.push({ view, position: { target, scroller, top: scroller?.scrollTop ?? 0 } });
    pending.current = "heading";
    setView(next);
  }
  function back() {
    const previous = history.current.pop();
    if (previous) { pending.current = previous.position; setView(previous.view); }
  }
  function reset() {
    history.current = [];
    pending.current = "heading";
    setView({ kind: "overview" });
  }
  return { view, root, open, back, reset };
}
