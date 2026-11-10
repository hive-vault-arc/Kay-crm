"use client";

import { animate } from "motion/mini";
import { useLayoutEffect, useRef, useState } from "react";
import { CalendarIcon, DealIcon, ContactsIcon, ClockIcon, MoreIcon, CircleCheckIcon, TrendDownIcon, TrendSteadyIcon, TrendUpIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Workspace, WorkspaceMetric } from "./workspace-contracts";

export const workspaceLabels: Record<WorkspaceMetric, string> = { enquiries: "Demandes reçues", active_deals: "Affaires actives", upcoming_visits: "Visites à venir", follow_ups: "Prospects à relancer" };
const descriptions: Record<WorkspaceMetric, string> = {
  enquiries: "Demandes reçues sur la période, y compris celles converties depuis.",
  active_deals: "Portefeuille actuel : cinq étapes actives, indépendamment de la date de création.",
  upcoming_visits: "Visites planifiées ou confirmées commençant sur la période, encore à venir ou en cours à l’heure de l’agence.",
  follow_ups: "Demandes reçues sur la période, actuellement à relancer et non converties. Aucune échéance de relance n’est déduite.",
};

export function countComparison(current: number, previous: number | null) {
  if (previous === null) return { label: "Sans comparaison", text: "Période précédente indisponible.", direction: "same" };
  const difference = current - previous;
  // A zero denominator is an absolute change, never an invented percentage.
  const label = previous === 0 ? (difference > 0 ? `+${difference}` : "0") : `${difference > 0 ? "+" : ""}${Math.round(difference / previous * 100)} %`;
  return { label, direction: difference > 0 ? "up" : difference < 0 ? "down" : "same", text: `${current} sur la période, contre ${previous} sur la période précédente de même durée, dans le périmètre actuel.` };
}

export function WorkspaceKpis({ value, open }: { value: Workspace; open: (metric: WorkspaceMetric, focus?: HTMLElement) => void }) {
  const group = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<WorkspaceMetric>();
  const openingRecords = useRef(false);
  useLayoutEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cards = group.current?.querySelectorAll<HTMLElement>(".kay-dash-kpi");
    if (preference.matches || !cards?.length) return;

    const entrance = animate(cards, { opacity: [.25, 1], transform: ["translateY(4px)", "none"] }, {
      duration: .32, delay: index => index * .04, ease: [.22, 1, .36, 1],
    });
    const cancel = () => entrance.cancel();
    preference.addEventListener("change", cancel, { once: true });
    return () => { preference.removeEventListener("change", cancel); cancel(); };
  }, []);

  return <div ref={group} className="kay-dash-kpis" role="group" aria-label="Indicateurs de l’activité">{(Object.keys(workspaceLabels) as WorkspaceMetric[]).map(key => {
    const metric = value.kpis[key];
    const comparison = "previous_total" in metric ? countComparison(metric.total, metric.previous_total) : null;
    const good = comparison?.direction === "same" ? "same" : (key === "follow_ups" ? comparison?.direction === "down" : comparison?.direction === "up") ? "good" : "bad";
    const Trend = comparison?.direction === "up" ? TrendUpIcon : comparison?.direction === "down" ? TrendDownIcon : comparison ? TrendSteadyIcon : CircleCheckIcon;
    return <article className="kay-dash-kpi" key={key}>
      <Button variant="ghost" className="kay-dash-kpi-content" onClick={() => open(key)} aria-label={`${workspaceLabels[key]} : ${metric.total}. Voir les dossiers.`}>
        <span className="kay-dash-kpi-heading">
          <span className="kay-dash-symbol">
            {key === "enquiries" ? <ContactsIcon size={18} aria-hidden="true" /> : key === "active_deals" ? <DealIcon size={18} aria-hidden="true" /> : key === "upcoming_visits" ? <CalendarIcon size={18} aria-hidden="true" /> : <ClockIcon size={18} aria-hidden="true" />}
          </span>
          <span><span>{workspaceLabels[key]}</span><small>{comparison && comparison.label !== "Sans comparaison" ? "Vs période précédente" : key === "active_deals" ? "Portefeuille actuel" : "Période sélectionnée"}</small></span>
        </span>
        <span className="kay-dash-kpi-metric">
          <strong>{metric.total.toLocaleString("fr-MA")}</strong>
          {comparison || key === "active_deals" ? <span className="kay-dash-change" data-tone={comparison ? good : "current"}><Trend size={16} aria-hidden="true" />{comparison?.label ?? "En cours"}</span> : null}
        </span>
      </Button>
      <Popover open={info === key} onOpenChange={next => setInfo(next ? key : undefined)}>
        <PopoverTrigger asChild><Button variant="quiet" size="icon" className="kay-dash-kpi-menu" data-metric-info={key} aria-label={`À propos : ${workspaceLabels[key]}`}><MoreIcon className="size-[17px]" aria-hidden="true" /></Button></PopoverTrigger>
        <PopoverContent align="end" className="grid w-60 max-w-[calc(100vw-24px)] gap-3 text-sm" onCloseAutoFocus={event => {
          if (openingRecords.current) { event.preventDefault(); openingRecords.current = false; }
        }}>
          <p>{descriptions[key]}</p><p className="text-muted-foreground">{comparison?.text ?? "Aucune comparaison historique."}</p>
          <Button action="forward" variant="outline" onClick={() => {
            openingRecords.current = true;
            setInfo(undefined);
            open(key, group.current?.querySelector<HTMLButtonElement>(`[data-metric-info="${key}"]`) ?? undefined);
          }}>Voir les dossiers</Button>
        </PopoverContent>
      </Popover>
    </article>;
  })}</div>;
}
