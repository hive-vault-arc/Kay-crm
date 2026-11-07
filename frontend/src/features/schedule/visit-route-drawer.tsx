"use client";

import { useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RecordDrawer } from "@/components/shared/record-drawer";

export function VisitRouteDrawer({ title, description, children }: {
  title: string; description: string; children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const router = useRouter();
  const focus = useRef<HTMLElement | null>(null);
  return <RecordDrawer initialOpen hideTrigger label={title} title={title} description={description} returnFocus={focus} onClosed={() => {
    focus.current = document.querySelector<HTMLElement>('[data-route="/visits"]');
    router.replace("/visits", { scroll: false });
  }}>{close => typeof children === "function" ? children(close) : children}</RecordDrawer>;
}
