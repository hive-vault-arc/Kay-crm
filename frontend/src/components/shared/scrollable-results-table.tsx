"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { useInSheet } from "@/components/ui/sheet";

export function ScrollableResultsTable({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const phone = usePhoneLayout();
  const inSheet = useInSheet();
  useEffect(() => {
    const region = root.current?.querySelector<HTMLElement>('[data-slot="table-container"]');
    const table = region?.querySelector("table");
    if (!region || !table) return;
    const observer = new ResizeObserver(() => setOverflow(region.scrollWidth > region.clientWidth + 1));
    observer.observe(region);
    observer.observe(table);
    return () => observer.disconnect();
  }, [phone, inSheet]);
  return <div ref={root} className="grid min-w-0 gap-3">
    <p hidden={phone || inSheet || !overflow} className="text-sm text-muted-foreground">Faites défiler le tableau horizontalement pour lire les colonnes choisies.</p>
    {children}
  </div>;
}
