"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { dealsSchema, stageLabels } from "@/features/deals/contracts";
import { DrillDown } from "./drill-down";
import { workspaceRecordsSchema, type WorkspaceMetric } from "./workspace-contracts";
import { workspaceLabels } from "./workspace-kpis";
import type { ActiveStage } from "./workspace-pipeline";

export type WorkspacePeriod = { start_on?: string; end_on?: string; assigned_agent_id?: string };
export type WorkspaceTarget = { kind: "metric"; metric: WorkspaceMetric } | { kind: "stage"; stage: ActiveStage } | { kind: "outcome"; outcome: "won" | "lost" | "cancelled" };
export type WorkspaceSelection = { period: WorkspacePeriod } & WorkspaceTarget;

export function WorkspaceRecords({ selection, close, returnFocus }: { selection: WorkspaceSelection; close: () => void; returnFocus: RefObject<HTMLElement | null> }) {
  const title = selection.kind === "metric" ? workspaceLabels[selection.metric] : `Affaires · ${stageLabels[selection.kind === "stage" ? selection.stage : selection.outcome]}`;
  return <RecordDrawer label={title} description={selection.kind === "stage" ? "Situation actuelle, même responsable et périmètre que le pipeline." : selection.kind === "outcome" ? "Période sélectionnée. Attribution au responsable lors de la clôture, dans votre périmètre actuel." : "Dossiers correspondant exactement à l’indicateur et à la période sélectionnés."} hideTrigger initialOpen onClosed={close} returnFocus={returnFocus}>{(dismiss) => selection.kind === "metric" ? <MetricRecords selection={selection} /> : selection.kind === "stage" ? <StageRecords selection={selection} /> : <DrillDown selection={{ metric: selection.outcome, start_on: selection.period.start_on!, end_on: selection.period.end_on!, attribution_id: selection.period.assigned_agent_id }} close={dismiss} />}</RecordDrawer>;
}

function MetricRecords({ selection }: { selection: WorkspaceSelection & { kind: "metric" } }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("reports/workspace/records", { ...selection.period, metric: selection.metric, page, page_size: 20 }), workspaceRecordsSchema);
  return query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des dossiers…</p> : <div className="grid min-w-0 gap-4"><p>{query.value.total.toLocaleString("fr-MA")} dossier(s) accessible(s)</p><ul className="kay-work-list">{query.value.items.map(item => <li key={item.id}><Link className="kay-dash-record" href={item.href}><strong>{item.label}</strong>{item.attribution_label ? <small>{item.attribution_label}</small> : null}</Link></li>)}</ul>{query.value.total === 0 ? <p>Aucun dossier accessible pour cette sélection.</p> : null}<NumberedPages compact page={page} total={query.value.total} size={20} change={setPage} label="Pages des dossiers de l’indicateur" /></div>;
}

function StageRecords({ selection }: { selection: WorkspaceSelection & { kind: "stage" } }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("deals", { stage: selection.stage, assigned_agent_id: selection.period.assigned_agent_id, page, page_size: 20, archive: "active" }), dealsSchema);
  return query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des affaires…</p> : <div className="grid min-w-0 gap-4"><p>{query.value.total.toLocaleString("fr-MA")} affaire(s) à l’étape {stageLabels[selection.stage]}</p><ul className="kay-work-list">{query.value.items.map(item => <li key={item.id}><Link className="kay-dash-record" href={`/deals/${item.id}`}><strong>{item.contact.name}</strong><span>{item.title}</span><small>{item.contact.primary_agent.display_name}</small></Link></li>)}</ul>{query.value.total === 0 ? <p>Aucune affaire accessible à cette étape.</p> : null}<NumberedPages compact page={page} total={query.value.total} size={20} change={setPage} label="Pages des affaires de l’étape" /></div>;
}
