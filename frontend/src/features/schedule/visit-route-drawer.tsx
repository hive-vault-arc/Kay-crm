"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RecordDrawer } from "@/components/shared/record-drawer";

export function VisitRouteDrawer({ title, description, children }: {
  title: string; description: string; children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const router = useRouter();
  const focus = useRef<HTMLElement | null>(null);
  const fallback = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const calendar = document.querySelector(".kay-visit-workspace");
    const current = document.activeElement;
    if (current instanceof HTMLElement && calendar?.contains(current)) focus.current = current;
    fallback.current = calendar?.querySelector<HTMLElement>('[data-route="/visits"]') ?? null;
  }, []);
  return <RecordDrawer initialOpen hideTrigger label={title} title={title} description={description} className="kay-calendar-drawer" returnFocus={focus} fallbackFocus={fallback} onClosed={() => {
    router.replace("/visits", { scroll: false });
  }}>{close => typeof children === "function" ? children(close) : children}</RecordDrawer>;
}
