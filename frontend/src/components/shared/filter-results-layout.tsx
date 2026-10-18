"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";

const desktopQuery = "(min-width: 80rem)";
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => true;

export function FilterResultsLayout({ title, filters, children, active = false, inline = false, widePanel = false, reference = false, activeCount = 0, reset, className, panelHeading }: {
  title: string;
  filters: (close: () => void) => ReactNode;
  children: ReactNode;
  active?: boolean;
  inline?: boolean;
  widePanel?: boolean;
  reference?: boolean;
  activeCount?: number;
  reset?: () => void;
  className?: string;
  panelHeading?: ReactNode;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const focusedInPanel = useRef(false);
  useEffect(() => {
    function rememberFocus(event: FocusEvent) {
      if (event.target instanceof HTMLElement) focusedInPanel.current = Boolean(event.target.closest("[data-filter-panel]"));
    }
    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, []);
  const subscribe = useCallback((change: () => void) => {
    const media = window.matchMedia(desktopQuery);
    let frame = 0;
    function changed() {
      const focused = document.activeElement;
      // CSS can blur the hidden rail before matchMedia delivers its change event.
      const inPanel = focusedInPanel.current || (focused instanceof HTMLElement && focused.closest("[data-filter-panel]"));
      const id = focused instanceof HTMLElement ? focused.id : "";
      setOpen(false);
      change();
      cancelAnimationFrame(frame);
      if (inPanel) frame = requestAnimationFrame(() => {
        if (media.matches) (id && panel.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`) || panel.current?.querySelector<HTMLElement>("input, select, button"))?.focus();
        else trigger.current?.focus();
      });
    }
    media.addEventListener("change", changed);
    return () => { media.removeEventListener("change", changed); cancelAnimationFrame(frame); };
  }, []);
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const close = () => setOpen(false);
  if (inline) return <div className="grid min-w-0 gap-3">{filters(close)}{children}</div>;
  return (
    <div className={`grid min-w-0 items-start gap-4 xl:grid-cols-[var(--layout-filter-panel)_minmax(0,1fr)] xl:gap-6${widePanel ? " crm-wide-filter-layout" : ""}${reference ? " crm-reference-filter-layout" : ""} ${className ?? ""}`}>
      {desktop ? (
        <aside ref={panel} data-filter-panel="desktop" aria-label={title} className="filter-rail hidden min-w-0 rounded-md border bg-card p-4 xl:sticky xl:top-6 xl:block xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto">
          {panelHeading !== undefined ? panelHeading : reference ? <div className="crm-filter-heading"><h2>Filtres</h2><span>{activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}</span><Button action="reset" variant="quiet" size="compact" type="button" onClick={reset}>Effacer</Button></div> : <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
          {filters(close)}
        </aside>
      ) : (
        <div className="xl:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild><Button action="filter" ref={trigger} variant="outline" disabled={!hydrated} aria-label="Afficher les filtres">{active ? "Filtres appliqués" : "Filtres"}</Button></SheetTrigger>
            <SheetContent side="left" data-filter-panel="mobile" closeLabel="Fermer les filtres" className="filter-rail w-full max-w-reading overflow-y-auto p-4 sm:max-w-sm" onCloseAutoFocus={event => { if (window.matchMedia(desktopQuery).matches) event.preventDefault(); }}>
              <SheetHeader className="p-0 pr-10 text-left"><SheetTitle>{title}</SheetTitle><SheetDescription className="sr-only">Recherche et filtres de cette liste.</SheetDescription></SheetHeader>
              {filters(close)}
            </SheetContent>
          </Sheet>
        </div>
      )}
      <div data-list-results className="grid min-w-0 content-start gap-3">{children}</div>
    </div>
  );
}
