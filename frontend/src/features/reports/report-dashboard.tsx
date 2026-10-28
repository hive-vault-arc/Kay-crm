"use client";

import dynamic from "next/dynamic";
import { useCallback, useId, useRef, useState } from "react";
import { ContactsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { DrillDown } from "./drill-down";
import { Exceptions } from "./exceptions";
import { matchesReportPeriod, reportPeriodQuery, selectedReportSchema, attributionTitles, type ReportPeriod } from "./report-model";
import { useReportNavigation } from "./report-navigation";
import { ReportOverview } from "./report-overview";

const MetricChart = dynamic(() => import("./metric-chart").then(module => module.MetricChart), { ssr: false, loading: () => <p role="status">Chargement du graphique…</p> });

export function ReportDashboard({ initialPeriod }: { initialPeriod?: ReportPeriod }) {
  const [applied, setApplied] = useState<ReportPeriod>(() => {
    const result = reportPeriodQuery.safeParse({ start_on: initialPeriod?.start_on, end_on: initialPeriod?.end_on });
    return result.success ? result.data : {};
  });
  const [draft, setDraft] = useState<ReportPeriod>({}), [resolved, setResolved] = useState<ReportPeriod>();
  const [validation, setValidation] = useState(false), [denial, setDenial] = useState<ApiError>();
  const start = useRef<HTMLInputElement>(null), id = useId();
  const { view, root, open, back, reset } = useReportNavigation();
  const query = useQuery(queryPath("reports/dashboard", applied), selectedReportSchema);
  const value = query.value && matchesReportPeriod(query.value, applied) ? query.value : undefined;
  if (value && !resolved) setResolved({ start_on: value.start_on, end_on: value.end_on });
  const form = { start_on: draft.start_on ?? applied.start_on ?? resolved?.start_on ?? "", end_on: draft.end_on ?? applied.end_on ?? resolved?.end_on ?? "" };
  const error = denial ?? query.error ?? (query.value && !value ? new ApiError("DEPENDENCY_UNAVAILABLE", 503) : undefined);
  const denied = useCallback((failure: ApiError) => { if ([401, 403, 404].includes(failure.status)) setDenial(failure); }, []);
  const attribution = view.kind === "attribution" ? view : view.kind === "drill" && view.parent.kind === "attribution" ? view.parent : undefined;
  const attributed = attribution ? value?.metrics.find(metric => metric.key === attribution.metric) : undefined;
  const retry = () => { setDenial(undefined); reset(); query.refresh(); };
  return <div ref={root} className="kay-reports">
    <div hidden={view.kind !== "overview"} data-report-active={view.kind === "overview"}>
      <h2 data-report-heading tabIndex={-1} className="sr-only">Rapports détaillés</h2>
      <form className="kay-report-controls" aria-label="Période des indicateurs" onSubmit={event => {
        event.preventDefault(); const result = reportPeriodQuery.safeParse(form);
        if (!result.success || !form.start_on || !form.end_on) { setValidation(true); start.current?.focus(); return; }
        setValidation(false); setDenial(undefined); setApplied(result.data); query.refresh();
      }}>
        <div className="kay-report-period"><div><Label htmlFor={`${id}-start`}>Du (inclus)</Label><Input ref={start} id={`${id}-start`} type="date" min="1900-01-01" max="2100-12-31" required value={form.start_on} onChange={event => setDraft(current => ({ ...current, start_on: event.target.value }))} aria-describedby={validation ? `${id}-error` : undefined} /></div>
          <div><Label htmlFor={`${id}-end`}>Au (inclus)</Label><Input id={`${id}-end`} type="date" min="1900-01-01" max="2100-12-31" required value={form.end_on} onChange={event => setDraft(current => ({ ...current, end_on: event.target.value }))} aria-describedby={validation ? `${id}-error` : undefined} /></div></div>
        <div className="kay-report-period-actions"><p className="kay-report-caption">Résultats et activités sur la période. Portefeuille et stock à ce jour. Dates inclusives, heure de Casablanca.</p><Button action="filter" variant="outline" type="submit">Appliquer la période</Button><Button liveRefresh action="refresh" variant="quiet" size="icon" type="button" aria-label="Actualiser les rapports" onClick={query.refresh} /></div>
        {validation ? <p role="alert" id={`${id}-error`} className="text-danger">Choisissez deux dates dans l’ordre, entre 1900 et 2100, sur 366 jours maximum.</p> : null}
      </form>
    </div>
    {error ? <RecordError error={error} retry={retry} /> : !value ? <p role="status">Chargement des indicateurs…</p> : <>
      <div hidden={view.kind !== "overview"}><p className="kay-report-scope">{value.scope === "agency" ? "Toute l’agence" : "Mes dossiers accessibles"}</p><ReportOverview metrics={value.metrics} drill={metric => open({ kind: "drill", selection: { metric, start_on: value.start_on, end_on: value.end_on }, parent: { kind: "overview" } })} attribution={metric => open({ kind: "attribution", metric })} alerts={() => open({ kind: "alerts" })} /></div>
      {attribution && attributed ? <div hidden={view.kind !== "attribution"} className="kay-report-attribution" data-report-active={view.kind === "attribution"}>
        <Button action="back" variant="quiet" onClick={() => back()}>Tous les rapports</Button>
        <h2 data-report-heading tabIndex={-1} className="kay-report-view-title"><ContactsIcon aria-hidden="true" className="size-5" />{attributionTitles[attribution.metric]}</h2>
        <MetricChart key={`${attributed.key}:${value.start_on}:${value.end_on}`} metric={attributed} open={attribution_id => open({ kind: "drill", selection: { metric: attributed.key, attribution_id, start_on: value.start_on, end_on: value.end_on }, parent: attribution })} />
      </div> : null}
      {view.kind === "alerts" ? <div data-report-active="true"><Button action="back" variant="quiet" onClick={() => back()}>Tous les rapports</Button><Exceptions onDenied={denied} /></div> : null}
      {view.kind === "drill" ? <div data-report-active="true"><DrillDown key={JSON.stringify(view.selection)} selection={view.selection} close={() => back()} closeLabel={view.parent.kind === "attribution" ? "Retour aux attributions" : "Tous les rapports"} onDenied={denied} /></div> : null}
    </>}
  </div>;
}
