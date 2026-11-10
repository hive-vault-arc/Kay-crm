"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChartIcon, NotificationIcon, TaskIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { DashboardTasks, VisitFollowUp } from "@/features/work/work-dashboard";
import { useHydrated } from "@/hooks/use-hydrated";
import { workspaceQuery, workspaceSchema } from "./workspace-contracts";
import { WorkspaceAgentPicker } from "./workspace-agent-picker";
import { WorkspaceKpis } from "./workspace-kpis";
import { WorkspacePipeline } from "./workspace-pipeline";
import { WorkspaceFollowUps, WorkspaceProperties, WorkspaceTasks, WorkspaceTeam, WorkspaceVisits } from "./workspace-previews";
import { WorkspaceRecords, type WorkspacePeriod, type WorkspaceSelection, type WorkspaceTarget } from "./workspace-records";

const Reports = dynamic(() => import("./report-dashboard").then(module => module.ReportDashboard), { loading: () => <DashboardModuleLoading label="Chargement des rapports…" /> });
const Alerts = dynamic(() => import("./exceptions").then(module => module.Exceptions), { loading: () => <DashboardModuleLoading label="Chargement des alertes…" /> });
const tools = {
  work: { label: "Travail à faire", description: "Vos tâches accessibles par échéance et les visites échues à renseigner.", icon: TaskIcon },
  reports: { label: "Indicateurs CRM", title: "Rapports détaillés", description: "Résultats commerciaux, portefeuille et inventaire dans votre périmètre.", icon: ChartIcon },
  alerts: { label: "Alertes à examiner", description: "Dossiers sans activité et disponibilités à vérifier.", icon: NotificationIcon },
} as const;
type Tool = keyof typeof tools;

function DashboardModuleLoading({ label }: { label: string }) {
  return <div role="status" className="grid gap-3"><span className="sr-only">{label}</span><Skeleton className="h-5 w-1/3" aria-hidden="true" /><Skeleton className="h-20" aria-hidden="true" /><Skeleton className="h-20" aria-hidden="true" /></div>;
}

export function WorkspaceDashboard({ displayName, role }: { displayName: string; role: "agent" | "manager" | "administrator" }) {
  const [applied, setApplied] = useState<WorkspacePeriod>({}), [draft, setDraft] = useState<WorkspacePeriod>({});
  const [resolved, setResolved] = useState<WorkspacePeriod>();
  const [agentLabel, setAgentLabel] = useState(""), [validation, setValidation] = useState(false);
  const [selection, setSelection] = useState<WorkspaceSelection>(), [tool, setTool] = useState<Tool>();
  const trigger = useRef<HTMLElement | null>(null), start = useRef<HTMLInputElement>(null);
  const toolsTrigger = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();
  const path = queryPath("reports/workspace", applied);
  const query = useQuery(path, workspaceSchema);
  // Retain the authoritative initial civil period when a refresh clears transient data.
  if (query.value && !resolved) setResolved({ start_on: query.value.start_on, end_on: query.value.end_on });
  const form = { start_on: draft.start_on ?? resolved?.start_on ?? "", end_on: draft.end_on ?? resolved?.end_on ?? "", assigned_agent_id: draft.assigned_agent_id ?? "" };
  const changed = Boolean(applied.assigned_agent_id || form.assigned_agent_id || (resolved && ((applied.start_on && applied.start_on !== resolved.start_on) || (applied.end_on && applied.end_on !== resolved.end_on) || form.start_on !== resolved.start_on || form.end_on !== resolved.end_on)));
  const remember = () => { trigger.current = document.activeElement as HTMLElement | null; };
  const period = query.value ? { start_on: query.value.start_on, end_on: query.value.end_on, assigned_agent_id: query.value.assigned_agent_id ?? undefined } : undefined;
  const open = (next: WorkspaceTarget, focus?: HTMLElement) => {
    if (!period) return;
    if (focus) trigger.current = focus;
    else remember();
    setSelection({ ...next, period });
  };
  const openTool = (next: Tool, fromMenu = false) => {
    if (fromMenu) trigger.current = toolsTrigger.current;
    else remember();
    setTool(next);
  };
  return <div className="kay-selected-dashboard">
    <header className="kay-dash-toolbar">
      <h1 data-route="/dashboard" tabIndex={-1} className="sr-only">Tableau de bord</h1>
      <form data-filter-panel aria-label="Filtres du tableau de bord" className="kay-dash-filters" onSubmit={event => {
      event.preventDefault(); const result = workspaceQuery.safeParse({ ...form, assigned_agent_id: form.assigned_agent_id || undefined });
      if (!result.success || !form.start_on || !form.end_on) { setValidation(true); start.current?.focus(); return; }
      setValidation(false); setSelection(undefined);
      if (queryPath("reports/workspace", result.data) === path) query.refresh();
      else setApplied(result.data);
    }}>
      <div className="kay-dash-agent-field"><WorkspaceAgentPicker value={form.assigned_agent_id} label={query.error ? "Équipe" : agentLabel} change={(id, name) => { setDraft(current => ({ ...current, assigned_agent_id: id })); setAgentLabel(name); }} /></div>
      <div className="kay-dash-date-field"><Label htmlFor="workspace-report-start">Du</Label><Input ref={start} id="workspace-report-start" type="date" required min="1900-01-01" max="2100-12-31" value={form.start_on} onChange={event => setDraft(current => ({ ...current, start_on: event.target.value }))} aria-describedby={validation ? "workspace-period-error" : undefined} /></div>
      <div className="kay-dash-date-field"><Label htmlFor="workspace-report-end">Au</Label><Input id="workspace-report-end" type="date" required min="1900-01-01" max="2100-12-31" value={form.end_on} onChange={event => setDraft(current => ({ ...current, end_on: event.target.value }))} aria-describedby={validation ? "workspace-period-error" : undefined} /></div>
      <Button action="confirm" type="submit" variant="outline" disabled={!hydrated}>Appliquer</Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><Button ref={toolsTrigger} type="button" variant="outline" className="kay-dash-tools" disabled={!hydrated}><ChartIcon size={16} aria-hidden="true" />Suivi et rapports</Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={event => { if (tool) event.preventDefault(); }}>
          {(Object.keys(tools) as Tool[]).map(key => {
            const { label, icon: Icon } = tools[key];
            return <DropdownMenuItem key={key} onSelect={() => openTool(key, true)}><Icon size={16} aria-hidden="true" />{label}</DropdownMenuItem>;
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {changed ? <Button action="reset" className="kay-dash-reset" variant="quiet" type="button" disabled={!hydrated} onClick={() => {
        setApplied({}); setDraft({}); setResolved(undefined); setAgentLabel(""); setSelection(undefined); setValidation(false);
        if (path === queryPath("reports/workspace", {})) query.refresh();
      }}>Réinitialiser</Button> : null}
      <Button liveRefresh action="refresh" variant="quiet" size="icon" type="button" aria-label="Actualiser le tableau de bord" onClick={query.refresh} disabled={!hydrated} />
      </form>
      <Button className="kay-dash-create" action="create" asChild><Link href="/leads/new">Nouveau prospect</Link></Button>
    </header>
    {validation ? <p role="alert" id="workspace-period-error" className="text-danger">Choisissez deux dates dans l’ordre, entre 1900 et 2100, sur 366 jours maximum.</p> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div role="status">
      <span className="sr-only">Chargement de votre tableau de bord…</span>
      <div className="kay-dash-overview" aria-hidden="true">
        <div className="kay-dash-welcome"><Skeleton className="h-9 w-3/4 motion-reduce:animate-none" /><Skeleton className="mt-3 h-4 w-5/6 motion-reduce:animate-none" /></div>
        <div className="kay-dash-kpis">{[0, 1, 2, 3].map(index => <div className="kay-dash-kpi p-4" key={index}>
          <Skeleton className="h-8 w-3/4 motion-reduce:animate-none" /><Skeleton className="mt-5 h-7 w-12 motion-reduce:animate-none" />
        </div>)}</div>
      </div>
      <div className="kay-dash-workspace" aria-hidden="true">
        <div className="kay-dash-card kay-dash-pipeline"><Skeleton className="h-5 w-2/3 motion-reduce:animate-none" /><Skeleton className="h-36 motion-reduce:animate-none" /></div>
        <div className="kay-dash-card kay-dash-showcase"><Skeleton className="h-5 w-1/3 motion-reduce:animate-none" /><Skeleton className="h-36 motion-reduce:animate-none" /></div>
        <div className="kay-dash-card kay-dash-agenda"><Skeleton className="h-5 w-2/3 motion-reduce:animate-none" /><Skeleton className="h-36 motion-reduce:animate-none" /></div>
      </div>
    </div> : <>
      <p className="sr-only">{query.value.scope === "agency" ? "Périmètre de l’agence" : "Dossiers attribués ou partagés"}. Dates inclusives et heure de Casablanca. Les cartes précisent leur période ou leur situation actuelle.</p>
      <section className="kay-dash-overview" aria-label="Vue d’ensemble de l’activité"><span className="kay-dash-brand" aria-hidden="true"><Image src="/images/workspace/kay-key-only-black-transparent.png" width={430} height={430} alt="" className="kay-dash-key-light" /><Image src="/images/workspace/kay-key-only-white-transparent.png" width={430} height={430} alt="" className="kay-dash-key-dark" /></span><div className="kay-dash-welcome"><h2>Bonjour {displayName.trim().split(/\s+/)[0]}.</h2><p>Vos priorités et rendez-vous, en un regard.</p></div><WorkspaceKpis value={query.value} open={(metric, focus) => open({ kind: "metric", metric }, focus)} /></section>
      <div className="kay-dash-workspace">
        <WorkspacePipeline value={query.value} all={() => open({ kind: "metric", metric: "active_deals" })} stage={stage => open({ kind: "stage", stage })} outcome={outcome => open({ kind: "outcome", outcome })} />
        <WorkspaceProperties value={query.value.inventory} />
        <WorkspaceVisits value={query.value.visits} />
        <WorkspaceFollowUps value={query.value.follow_ups} open={() => open({ kind: "metric", metric: "follow_ups" })} />
        <WorkspaceTasks value={query.value.tasks} clock={query.value} action={<Button action="forward" variant="quiet" onClick={() => openTool("work")}>Travail à faire</Button>} />
        <WorkspaceTeam value={query.value.team} audit={role !== "agent"} />
      </div>
      {selection ? <WorkspaceRecords key={JSON.stringify(selection)} selection={selection} close={() => setSelection(undefined)} returnFocus={trigger} /> : null}
    </>}
    {tool ? <RecordDrawer key={tool} label={tool === "reports" ? tools.reports.title : tools[tool].label} description={tools[tool].description} hideTrigger initialOpen onClosed={() => setTool(undefined)} returnFocus={trigger}>
      {tool === "reports" ? <Reports initialPeriod={period} /> : tool === "alerts" ? <Alerts /> : <div className="grid min-w-0 gap-6"><DashboardTasks /><VisitFollowUp /></div>}
    </RecordDrawer> : null}
  </div>;
}
