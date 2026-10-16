"use client";
import dynamic from "next/dynamic";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatBusinessDate, formatMAD } from "@/lib/format";
import { dashboardSchema, periodQuery, type MetricKey } from "./contracts";
import { DrillDown, type Selection } from "./drill-down";
import { Exceptions } from "./exceptions";
import { DevelopmentIcon } from "@/components/icons";
import { KpiSummary } from "./kpi-summary";

const highlightKeys: MetricKey[] = ["contacts", "enquiries", "active_deals", "won", "collections"];

const MetricChart = dynamic(() => import("./metric-chart").then(module => module.MetricChart), { ssr: false, loading: () => <p role="status">Chargement du graphique…</p> });
const PipelineOverview = dynamic(() => import("./pipeline-overview").then(module => module.PipelineOverview), { ssr: false, loading: () => <p role="status">Chargement des pipelines…</p> });
export function ReportDashboard({ children }: { children?: ReactNode }) {
  const [period, setPeriod] = useState<{ start_on?: string; end_on?: string }>({}), [validation, setValidation] = useState(false), [selection, setSelection] = useState<Selection>();
  const start = useRef<HTMLInputElement>(null), end = useRef<HTMLInputElement>(null), lastTrigger = useRef<HTMLElement | null>(null);
  const query = useQuery(queryPath("reports/dashboard", period), dashboardSchema);
  // Keep the server-resolved default period selected when transient query data clears.
  if (query.value && !period.start_on) {
    setPeriod({ start_on: query.value.start_on, end_on: query.value.end_on });
  }
  function open(metric: MetricKey, attribution_id?: string) {
    if (!query.value) return;
    lastTrigger.current = document.activeElement as HTMLElement;
    setSelection({ metric, attribution_id, start_on: query.value.start_on, end_on: query.value.end_on });
  }
  return <div className="grid min-w-0 gap-4">
    <section className="grid min-w-0 gap-4" aria-label="Indicateurs CRM"><h2 className="sr-only">Indicateurs CRM</h2>
      <form className="filter-surface flex flex-wrap items-end gap-3" aria-label="Période des indicateurs" onSubmit={e => {
        e.preventDefault(); const draft = { start_on: start.current?.value, end_on: end.current?.value };
        if (!periodQuery.safeParse(draft).success || !draft.start_on || !draft.end_on) { setValidation(true); start.current?.focus(); return; }
        setValidation(false); setSelection(undefined); setPeriod(draft); query.refresh();
      }}>
        <div className="grid gap-2"><Label htmlFor="report-start">Du (inclus)</Label><Input ref={start} id="report-start" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={period.start_on ?? query.value?.start_on} aria-describedby={validation ? "report-period-error" : undefined} /></div>
        <div className="grid gap-2"><Label htmlFor="report-end">Au (inclus)</Label><Input ref={end} id="report-end" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={period.end_on ?? query.value?.end_on} aria-describedby={validation ? "report-period-error" : undefined} /></div>
        <Button action="filter" type="submit">Appliquer la période</Button><Button action="refresh" variant="outline" type="button" onClick={() => { setSelection(undefined); query.refresh(); }}>Actualiser les indicateurs</Button>
      </form>
      {validation ? <p role="alert" id="report-period-error" className="text-danger">Choisissez deux dates dans l’ordre, sur 366 jours maximum.</p> : null}
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des indicateurs…</p> : <>
        <KpiSummary metrics={query.value.metrics} open={open} />
        <p className="text-sm text-muted-foreground">{query.value.scope === "agency" ? "Périmètre : agence." : "Périmètre : dossiers attribués ou partagés. Inventaire lié uniquement aux affaires et sélections accessibles."}</p>
        <p className="text-sm text-muted-foreground">Du {formatBusinessDate(query.value.start_on)} au {formatBusinessDate(query.value.end_on)}, Africa/Casablanca. Contacts, affaires actives et inventaire : situation actuelle. Résultats, demandes, actions et encaissements : période sélectionnée.</p>
        <PipelineOverview />
        <section className="grid min-w-0 gap-3" aria-label="Activité de l’équipe"><div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2"><h2 className="text-section font-semibold">Activité de l’équipe</h2><p className="text-xs text-muted-foreground">Contributions réelles et dossiers attribués</p></div>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">{(["activities", "won", "contacts"] as const).map(key => {
            const metric = query.value?.metrics.find(value => value.key === key);
            return metric ? <MetricChart key={`${key}:${query.value?.start_on}:${query.value?.end_on}:${query.value?.now}`} metric={metric} open={id => open(metric.key, id)} /> : null;
          })}</div>
          <p className="text-xs text-muted-foreground">Les actions sont attribuées à leur auteur réel, pas à des Leads ou affaires uniques travaillés. Actions et gains : période sélectionnée. Contacts : situation actuelle. Pas de séries quotidiennes.</p>
        </section>
        <section className="surface grid gap-3" aria-label="Autres indicateurs"><h3 className="flex items-center gap-2 font-medium"><DevelopmentIcon aria-hidden="true" className="size-4" />Inventaire et autres résultats</h3><dl className="grid min-w-0 gap-x-6 sm:grid-cols-2 xl:grid-cols-4">{query.value.metrics.filter(metric => !highlightKeys.includes(metric.key)).map(metric => <div key={metric.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t py-1"><dt className="min-w-0 flex-1 wrap-anywhere text-xs text-muted-foreground">{metric.label}</dt><dd><Button variant="link" className="min-w-control tabular-nums" aria-label={`Dossiers : ${metric.label}`} onClick={() => open(metric.key)}>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</Button></dd></div>)}</dl></section>
        <p className="text-sm text-muted-foreground">Les niveaux d’inventaire ne s’additionnent pas : un programme n’est pas une unité physique, une offre de vente ou de location n’est pas un bien supplémentaire. Les encaissements ne sont ni les prix conclus ni les commissions prévues.</p>
        <p className="text-sm text-muted-foreground">Activité : actions du journal contact, hors signalements automatiques de stock et propagation des fusions. Les appels ou paiements externes non enregistrés ne sont pas déduits.</p>
      </>}
      {children}
      {selection ? <DrillDown key={JSON.stringify(selection)} selection={selection} close={() => { setSelection(undefined); lastTrigger.current?.focus(); }} /> : null}
    </section>
    <Exceptions />
  </div>;
}
