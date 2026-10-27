"use client";

import { CalendarIcon, DealIcon, ContactsIcon, ClockIcon, MoreIcon } from "@/components/icons";
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

export function WorkspaceKpis({ value, open }: { value: Workspace; open: (metric: WorkspaceMetric) => void }) {
  return <div className="kay-dash-kpis">{(Object.keys(workspaceLabels) as WorkspaceMetric[]).map(key => {
    const metric = value.kpis[key];
    const comparison = "previous_total" in metric ? countComparison(metric.total, metric.previous_total) : null;
    const good = comparison?.direction === "same" ? "same" : (key === "follow_ups" ? comparison?.direction === "down" : comparison?.direction === "up") ? "good" : "bad";
    return <article className="kay-dash-kpi" key={key}>
      <Button variant="ghost" className="kay-dash-kpi-content" onClick={() => open(key)} aria-label={`${workspaceLabels[key]} : ${metric.total}. Voir les dossiers.`}><span className="kay-dash-kpi-heading"><span className="kay-dash-symbol">{key === "enquiries" ? <ContactsIcon size={20} aria-hidden="true" /> : key === "active_deals" ? <DealIcon size={20} aria-hidden="true" /> : key === "upcoming_visits" ? <CalendarIcon size={20} aria-hidden="true" /> : <ClockIcon size={20} aria-hidden="true" />}</span><span><span>{workspaceLabels[key]}</span><small>{comparison ? "Période sélectionnée" : key === "active_deals" ? "Portefeuille actuel" : "Période sélectionnée"}</small></span></span><span className="kay-dash-kpi-metric"><strong>{metric.total.toLocaleString("fr-MA")}</strong><span className="kay-dash-change" data-tone={comparison ? good : "same"}>{comparison?.label ?? "En cours"}</span></span></Button>
      <Popover><PopoverTrigger asChild><Button variant="quiet" size="icon" className="kay-dash-kpi-menu" aria-label={`À propos : ${workspaceLabels[key]}`}><MoreIcon size={16} aria-hidden="true" /></Button></PopoverTrigger><PopoverContent align="end" className="grid gap-3 text-sm"><p>{descriptions[key]}</p><p className="text-muted-foreground">{comparison?.text ?? "Aucune comparaison historique."}</p><Button action="forward" variant="outline" onClick={() => open(key)}>Voir les dossiers</Button></PopoverContent></Popover>
    </article>;
  })}</div>;
}
