"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useHydrated } from "@/hooks/use-hydrated";

const desktopQuery = "(min-width: 831px)";
const desktopSnapshot = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => true;

export function FilterResultsLayout({ title, filters, children, active = false, inline = false, widePanel = false, reference = false, activeCount = 0, reset, className, panelHeading, mode = "rail", searchControl, surface = true }: {
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
  mode?: "rail" | "drawer";
  searchControl?: ReactNode;
  surface?: boolean;
}) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
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
  if (inline) return <div className="grid min-w-0 gap-3"><div data-filter-panel="inline">{filters(close)}</div>{children}</div>;
  return (
    <div data-filter-mode={mode} className={`kay-filter-layout${widePanel ? " kay-filter-wide" : ""}${reference ? " kay-filter-reference" : ""} ${className ?? ""}`}>
      {desktop && mode === "rail" ? (
        <aside ref={panel} data-filter-panel="desktop" aria-label={title} className="kay-filter-rail kay-surface">
          {panelHeading !== undefined ? panelHeading : reference ? <div className="crm-filter-heading"><h2>Filtres</h2><span>{activeCount} filtre{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}</span><Button action="reset" variant="quiet" size="compact" type="button" onClick={reset}>Effacer</Button></div> : <h2 className="mb-4 text-sm font-semibold">{title}</h2>}
          {filters(close)}
        </aside>
      ) : (
        <div className="kay-list-controls">
          {searchControl ? <div className="kay-list-search" data-filter-panel="search">{searchControl}</div> : null}
          <Sheet open={open} onOpenChange={setOpen}>
            {!searchControl ? <SheetTrigger asChild><Button action="search" size="icon" variant="outline" disabled={!hydrated} aria-label="Rechercher dans cette liste" onClick={() => setSearching(true)}><span className="sr-only">Rechercher</span></Button></SheetTrigger> : null}
            <SheetTrigger asChild><Button action="filter" size={mode === "drawer" && desktop ? "default" : "icon"} ref={trigger} variant="outline" disabled={!hydrated} aria-label={active ? `Afficher les filtres (${activeCount || 1} actif)` : "Afficher les filtres"} onClick={() => setSearching(false)}><span className={mode === "drawer" && desktop ? undefined : "sr-only"}>Filtres{activeCount ? ` · ${activeCount}` : ""}</span></Button></SheetTrigger>
            <SheetContent side="right" data-filter-panel="mobile" closeLabel="Fermer les filtres" className="kay-record-drawer" onOpenAutoFocus={event => { if (searching) { event.preventDefault(); document.querySelector<HTMLElement>('[data-filter-panel="mobile"] input')?.focus(); } }} onCloseAutoFocus={event => { if (window.matchMedia(desktopQuery).matches && mode === "rail") event.preventDefault(); }}>
              <SheetHeader className="kay-drawer-head"><SheetTitle>{searching ? "Rechercher" : title}</SheetTitle><SheetDescription>Affinez les résultats de cette liste.</SheetDescription></SheetHeader>
              <div className="kay-drawer-body kay-filter-fields">{filters(close)}</div>
            </SheetContent>
          </Sheet>
        </div>
      )}
      <div data-list-results data-surface={surface} className="kay-list-results">{children}</div>
    </div>
  );
}
