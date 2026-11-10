"use client";

import type { ReactNode } from "react";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePhoneLayout } from "@/hooks/use-phone-layout";

export type ProjectView = "cards" | "list";
export type ProjectFilterRail = { hidden: boolean; close: () => void };

export function ProjectFilters({ id, title, activeCount, reset, rail, filters, children }: {
  id: string; title: string; activeCount: number; reset: () => void; rail: ProjectFilterRail;
  filters: (close: () => void) => ReactNode; children: ReactNode;
}) {
  return <FilterResultsLayout title={title} reference surface={false} active={activeCount > 0} activeCount={activeCount}
    railId={id} railHidden={rail.hidden} reset={reset} filters={filters} panelHeading={<div className="kay-sales-filter-heading">
      <h2>Filtres</h2><Button action="reset" type="button" size="compact" variant="quiet" onClick={reset}>Réinitialiser</Button>
      <Button action="close" type="button" variant="quiet" size="icon" aria-label="Fermer les filtres" onClick={rail.close}><span className="sr-only">Fermer</span></Button>
    </div>}>{children}</FilterResultsLayout>;
}

export function ProjectResultsView({ view, status, loading, cards, list, footer, children }: {
  view: ProjectView; status: string; loading?: "biens" | "programmes"; cards?: ReactNode; list?: ReactNode; footer?: ReactNode; children?: ReactNode;
}) {
  const phone = usePhoneLayout();
  const layout = phone ? "cards" : view;
  return <div className="kay-project-results" data-project-layout={layout}>
    <p role="status" className="sr-only">{status}</p>
    <div className="kay-project-items">{loading ? <div role="status" aria-label={`Chargement ${layout === "cards" ? "des cartes" : "de la liste"} de ${loading}`} className={layout === "cards" ? "kay-project-grid" : "grid gap-2"}>
      {Array.from({ length: layout === "cards" ? 4 : 8 }, (_, index) => <Skeleton key={index} className={layout === "cards" ? "kay-project-skeleton" : "h-11"} aria-hidden="true" />)}
    </div> : children ?? (layout === "cards" ? cards : list)}</div>
    {footer ? <div className="kay-project-pagination">{footer}</div> : null}
  </div>;
}
