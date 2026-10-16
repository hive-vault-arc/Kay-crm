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
import { DevelopmentIcon, CompletedIcon, DealIcon, InboxIcon, ContactsIcon, FinanceIcon } from "@/components/icons";

const highlights: { key: MetricKey; tone: string; icon: typeof ContactsIcon }[] = [
  { key: "contacts", tone: "bg-info-background text-info", icon: ContactsIcon },
  { key: "enquiries", tone: "bg-purple-background text-purple", icon: InboxIcon },
  { key: "active_deals", tone: "bg-warning-background text-warning", icon: DealIcon },
  { key: "won", tone: "bg-success-background text-success", icon: CompletedIcon },
  { key: "collections", tone: "bg-teal-background text-teal", icon: FinanceIcon },
];

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
      {query.value ? <dl className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">{highlights.map(({ key, tone, icon: Icon }) => {
          const metric = query.value?.metrics.find(value => value.key === key);
          return metric ? <div key={key} className={`grid min-w-0 content-start gap-1 rounded-md border border-current/15 px-4 py-2 ${tone}`}><dt className="flex items-start justify-between gap-2 text-sm font-medium"><span className="wrap-anywhere">{metric.label}</span><Icon aria-hidden="true" className="size-5 shrink-0" /></dt><dd><Button variant="link" className="h-auto min-h-control min-w-control max-w-full justify-start whitespace-normal p-0 text-left text-2xl font-semibold text-inherit tabular-nums wrap-anywhere" aria-label={`Dossiers : ${metric.label}`} onClick={() => open(metric.key)}>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</Button></dd><p className="text-xs">{metric.basis === "current" ? "Situation actuelle" : "Période sélectionnée"}</p></div> : null;
        })}</dl> : null}
      {query.value ? <PipelineOverview /> : null}
      {children}
      <form className="filter-surface flex flex-wrap items-end gap-3" aria-label="Période des indicateurs" onSubmit={e => {
        e.preventDefault(); const draft = { start_on: start.current?.value, end_on: end.current?.value };
        if (!periodQuery.safeParse(draft).success || !draft.start_on || !draft.end_on) { setValidation(true); start.current?.focus(); return; }
        setValidation(false); setSelection(undefined); setPeriod(draft); query.refresh();
      }}>
        <div className="grid gap-2"><Label htmlFor="report-start">Du (inclus)</Label><Input ref={start} id="report-start" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={period.start_on ?? query.value?.start_on} aria-describedby={validation ? "report-period-error" : undefined} /></div>
        <div className="grid gap-2"><Label htmlFor="report-end">Au (inclus)</Label><Input ref={end} id="report-end" type="date" min="1900-01-01" max="2100-12-31" required defaultValue={period.end_on ?? query.value?.end_on} aria-describedby={validation ? "report-period-error" : undefined} /></div>
        <Button type="submit">Appliquer la période</Button><Button variant="outline" type="button" onClick={() => { setSelection(undefined); query.refresh(); }}>Actualiser les indicateurs</Button>
      </form>
      {validation ? <p role="alert" id="report-period-error" className="text-danger">Choisissez deux dates dans l’ordre, sur 366 jours maximum.</p> : null}
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des indicateurs…</p> : <>
        <p>{query.value.scope === "agency" ? "Périmètre : agence." : "Périmètre : dossiers attribués ou partagés. Inventaire lié uniquement aux affaires et sélections accessibles."}</p>
        <p className="text-sm text-muted-foreground">Du {formatBusinessDate(query.value.start_on)} au {formatBusinessDate(query.value.end_on)}, Africa/Casablanca. Contacts, affaires actives et inventaire : situation actuelle. Résultats, demandes, actions et encaissements : période sélectionnée.</p>
        <section className="surface grid gap-3" aria-label="Autres indicateurs"><h3 className="flex items-center gap-2 font-medium"><DevelopmentIcon aria-hidden="true" className="size-4" />Inventaire et autres résultats</h3><dl className="grid min-w-0 gap-x-6 sm:grid-cols-2 xl:grid-cols-4">{query.value.metrics.filter(metric => !highlights.some(item => item.key === metric.key)).map(metric => <div key={metric.key} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t py-1"><dt className="min-w-0 flex-1 wrap-anywhere text-xs text-muted-foreground">{metric.label}</dt><dd><Button variant="link" className="min-w-control tabular-nums" aria-label={`Dossiers : ${metric.label}`} onClick={() => open(metric.key)}>{metric.unit === "MAD" ? formatMAD(metric.value) : metric.value}</Button></dd></div>)}</dl></section>
        <p className="text-sm text-muted-foreground">Les niveaux d’inventaire ne s’additionnent pas : un programme n’est pas une unité physique, une offre de vente ou de location n’est pas un bien supplémentaire. Les encaissements ne sont ni les prix conclus ni les commissions prévues.</p>
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">{query.value.metrics.filter(metric => ["contacts", "won", "activities"].includes(metric.key)).map(metric => <MetricChart key={`${metric.key}:${query.value?.start_on}:${query.value?.end_on}:${query.value?.now}`} metric={metric} open={id => open(metric.key, id)} />)}</div>
        <p className="text-sm text-muted-foreground">Activité : actions du journal contact, hors signalements automatiques de stock et propagation des fusions. Les appels ou paiements externes non enregistrés ne sont pas déduits.</p>
      </>}
      {selection ? <DrillDown key={JSON.stringify(selection)} selection={selection} close={() => { setSelection(undefined); lastTrigger.current?.focus(); }} /> : null}
    </section>
    <Exceptions />
  </div>;
}
