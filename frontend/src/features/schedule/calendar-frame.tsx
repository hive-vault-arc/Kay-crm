import type { ReactNode } from "react";

export function CalendarFrame({ children }: { children: ReactNode }) {
  return <div className="kay-calendar-frame">{children}</div>;
}
