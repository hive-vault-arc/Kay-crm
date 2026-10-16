"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function ScrollableResultsTable({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const region = root.current?.querySelector<HTMLElement>('[data-slot="table-container"]');
    const table = region?.querySelector("table");
    if (!region || !table) return;
    const observer = new ResizeObserver(() => setOverflow(region.scrollWidth > region.clientWidth + 1));
    observer.observe(region);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="grid min-w-0 gap-3">
    <p hidden={!overflow} className="text-sm text-muted-foreground">Faites défiler le tableau horizontalement pour lire les colonnes choisies.</p>
    {children}
  </div>;
}
