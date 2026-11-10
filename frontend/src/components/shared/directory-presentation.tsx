"use client";

import { useRef, useState, type ReactNode } from "react";
import { EmptyFolderIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePhoneLayout } from "@/hooks/use-phone-layout";

export function useDirectoryRail(id: string, activeCount: number, reset: () => void, hydrated: boolean) {
  const phone = usePhoneLayout();
  const [open, setOpen] = useState(true);
  const trigger = useRef<HTMLButtonElement>(null);
  const control = phone ? null : <Button action="filter" ref={trigger} variant={open ? "secondary" : "outline"} disabled={!hydrated} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>Filtres{activeCount ? ` · ${activeCount}` : ""}</Button>;
  const heading = <div className="kay-sales-filter-heading">
    <h2>Filtres</h2>
    <Button action="reset" type="button" size="compact" variant="quiet" onClick={reset}>Réinitialiser</Button>
    <Button action="close" type="button" size="icon" variant="quiet" aria-label="Fermer les filtres" onClick={() => { setOpen(false); trigger.current?.focus(); }}><span className="sr-only">Fermer</span></Button>
  </div>;
  return { control, rail: { railId: id, railHidden: !open, panelHeading: heading } };
}

export function DirectoryLoading({ label }: { label: string }) {
  return <div className="kay-sales-loading" role="status" aria-busy="true">
    <span className="sr-only">{label}</span>
    {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} aria-hidden="true" />)}
  </div>;
}

export function DirectoryEmpty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className="kay-sales-empty">
    <EmptyFolderIcon aria-hidden="true" size={24} />
    <h2>{title}</h2>
    <p>{children}</p>
    {action}
  </section>;
}
