"use client";

import { useEffect, useRef, type ReactNode } from "react";

// The chosen calendar fills the remaining desktop viewport; short/phone pages stay native.
export function CalendarFrame({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const update = () => node.style.setProperty("--kay-calendar-room", `${Math.max(260, window.innerHeight - node.getBoundingClientRect().top - 24)}px`);
    update();
    const observer = new ResizeObserver(update);
    if (node.parentElement) observer.observe(node.parentElement);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, []);
  return <div ref={frame} className="kay-calendar-frame">{children}</div>;
}
