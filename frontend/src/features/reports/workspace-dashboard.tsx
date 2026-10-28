"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const Reports = dynamic(() => import("./report-dashboard").then(module => module.ReportDashboard), { loading: () => <p role="status">Chargement des rapports…</p> });

export function WorkspaceDashboard({ displayName, role }: { displayName: string; role: "agent" | "manager" | "administrator" }) {
  const [applied, setApplied] = useState<WorkspacePeriod>({}), [draft, setDraft] = useState<WorkspacePeriod>({});
  const [resolved, setResolved] = useState<WorkspacePeriod>();
  const [agentLabel, setAgentLabel] = useState(""), [validation, setValidation] = useState(false);
  const [selection, setSelection] = useState<WorkspaceSelection>(), [tool, setTool] = useState<"reports" | "work">();
  const trigger = useRef<HTMLElement | null>(null), start = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated();
  const query = useQuery(queryPath("reports/workspace", applied), workspaceSchema);
  // Retain the authoritative initial civil period when a refresh clears transient data.
  if (query.value && !resolved) setResolved({ start_on: query.value.start_on, end_on: query.value.end_on });
  const form = { start_on: draft.start_on ?? resolved?.start_on ?? "", end_on: draft.end_on ?? resolved?.end_on ?? "", assigned_agent_id: draft.assigned_agent_id ?? "" };
  const changed = Boolean(applied.assigned_agent_id || form.assigned_agent_id || (resolved && ((applied.start_on && applied.start_on !== resolved.start_on) || (applied.end_on && applied.end_on !== resolved.end_on) || form.start_on !== resolved.start_on || form.end_on !== resolved.end_on)));
  const remember = () => { trigger.current = document.activeElement as HTMLElement | null; };
  const period = query.value ? { start_on: query.value.start_on, end_on: query.value.end_on, assigned_agent_id: query.value.assigned_agent_id ?? undefined } : undefined;
  const open = (next: WorkspaceTarget) => { if (period) { remember(); setSelection({ ...next, period }); } };
  const openTool = (next: "reports" | "work") => { remember(); setTool(next); };
  return <div className="kay-selected-dashboard">
    <div className="kay-dash-toolbar"><form aria-label="Filtres du tableau de bord" className="kay-dash-filters" onSubmit={event => {
      event.preventDefault(); const result = workspaceQuery.safeParse({ ...form, assigned_agent_id: form.assigned_agent_id || undefined });
      if (!result.success || !form.start_on || !form.end_on) { setValidation(true); start.current?.focus(); return; }
      setValidation(false); setSelection(undefined); setApplied(result.data); query.refresh();
    }}><WorkspaceAgentPicker value={form.assigned_agent_id} label={query.error ? "Équipe" : agentLabel} change={(id, name) => { setDraft(current => ({ ...current, assigned_agent_id: id })); setAgentLabel(name); }} />
      <div className="kay-dash-date-field"><Label htmlFor="workspace-report-start">Du</Label><Input ref={start} id="workspace-report-start" type="date" required min="1900-01-01" max="2100-12-31" value={form.start_on} onChange={event => setDraft(current => ({ ...current, start_on: event.target.value }))} aria-describedby={validation ? "workspace-period-error" : undefined} /></div>
      <div className="kay-dash-date-field"><Label htmlFor="workspace-report-end">Au</Label><Input id="workspace-report-end" type="date" required min="1900-01-01" max="2100-12-31" value={form.end_on} onChange={event => setDraft(current => ({ ...current, end_on: event.target.value }))} aria-describedby={validation ? "workspace-period-error" : undefined} /></div>
      <Button action="filter" type="submit" variant="outline" disabled={!hydrated}>Appliquer</Button>{changed ? <Button action="refresh" variant="quiet" type="button" disabled={!hydrated} onClick={() => { setApplied({}); setDraft({}); setResolved(undefined); setAgentLabel(""); setSelection(undefined); setValidation(false); query.refresh(); }}>Réinitialiser</Button> : null}
    </form><div className="flex flex-wrap gap-2"><Button action="task" variant="quiet" onClick={() => openTool("work")} disabled={!hydrated}>Travail</Button><Button action="preview" variant="quiet" onClick={() => openTool("reports")} disabled={!hydrated}>Rapports</Button><Button liveRefresh action="refresh" variant="quiet" size="icon" aria-label="Actualiser le tableau de bord" onClick={query.refresh} disabled={!hydrated} /></div></div>
    {validation ? <p role="alert" id="workspace-period-error" className="text-danger">Choisissez deux dates dans l’ordre, entre 1900 et 2100, sur 366 jours maximum.</p> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div role="status" className="kay-dash-loading">Chargement de votre tableau de bord…</div> : <>
      <p className="sr-only">{query.value.scope === "agency" ? "Périmètre de l’agence" : "Dossiers attribués ou partagés"}. Dates inclusives et heure de Casablanca. Les cartes précisent leur période ou leur situation actuelle.</p>
      <div className="kay-dash-overview"><span className="kay-dash-brand" aria-hidden="true"><Image src="/images/workspace/kay-key-only-black-transparent.png" width={430} height={430} alt="" className="kay-dash-key-light" /><Image src="/images/workspace/kay-key-only-white-transparent.png" width={430} height={430} alt="" className="kay-dash-key-dark" /></span><div className="kay-dash-welcome"><h2>Bonjour {displayName.trim().split(/\s+/)[0]}.</h2><p>Vos priorités et rendez-vous, en un regard.</p></div><WorkspaceKpis value={query.value} open={metric => open({ kind: "metric", metric })} /></div>
      <div className="kay-dash-workspace"><WorkspacePipeline value={query.value} all={() => open({ kind: "metric", metric: "active_deals" })} stage={stage => open({ kind: "stage", stage })} outcome={outcome => open({ kind: "outcome", outcome })} /><WorkspaceProperties value={query.value.inventory} /><WorkspaceVisits value={query.value.visits} /><WorkspaceFollowUps value={query.value.follow_ups} open={() => open({ kind: "metric", metric: "follow_ups" })} /><WorkspaceTasks value={query.value.tasks} clock={query.value} action={<Button action="forward" variant="quiet" onClick={() => openTool("work")}>Tout voir</Button>} /><WorkspaceTeam value={query.value.team} audit={role !== "agent"} action={<Button action="forward" variant="quiet" onClick={() => openTool("reports")}>Rapports</Button>} /></div>
      {selection ? <WorkspaceRecords key={JSON.stringify(selection)} selection={selection} close={() => setSelection(undefined)} returnFocus={trigger} /> : null}
    </>}
    {tool ? <RecordDrawer key={tool} label={tool === "reports" ? "Rapports détaillés" : "Travail et suivi"} description={tool === "reports" ? "Rapports complets sur vos dossiers accessibles, avec leurs propres filtres. Les résultats conservent le responsable à la clôture et l’activité conserve l’auteur réel." : "Vos tâches accessibles par échéance et les visites échues à renseigner. Les liens ouvrent le dossier concerné."} hideTrigger initialOpen onClosed={() => setTool(undefined)} returnFocus={trigger}>{tool === "reports" ? <Reports initialPeriod={period} /> : <div className="grid min-w-0 gap-6"><DashboardTasks /><VisitFollowUp /></div>}</RecordDrawer> : null}
  </div>;
}
