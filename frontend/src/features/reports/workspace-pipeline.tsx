"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { stageLabels } from "@/features/deals/contracts";
import type { Workspace } from "./workspace-contracts";

export const activeStages = ["new", "visit", "negotiation", "documents", "reserved"] as const;
export type ActiveStage = typeof activeStages[number];
const tokens = ["proposition", "visite", "negotiation", "converted", "pending"];
const PipelineChart = dynamic(() => import("./workspace-pipeline-chart").then(module => module.WorkspacePipelineChart), { ssr: false, loading: () => <span className="sr-only" role="status">Chargement du graphique…</span> });

export function WorkspacePipeline({ value, stage, outcome, all }: { value: Workspace; stage: (stage: ActiveStage) => void; outcome: (outcome: "won" | "lost" | "cancelled") => void; all?: () => void }) {
  const [pointer, setPointer] = useState<number | null>(null), [focus, setFocus] = useState<number | null>(null);
  const series = activeStages.map((key, index) => ({ label: stageLabels[key], value: value.pipeline[key], color: `color-mix(in srgb, var(--kay-status-${tokens[index]}-dot) 75%, white)` }));
  const selected = pointer ?? focus;
  return <section className="kay-dash-card kay-dash-pipeline" aria-label="Pipeline commercial">
    <header className="kay-dash-head"><h2>Répartition des affaires</h2>{all ? <Button action="forward" variant="quiet" onClick={all}>Tout voir</Button> : null}</header>
    <p className="kay-dash-note">Actuellement · affaires accessibles</p>
    <div className="kay-dash-arc" aria-hidden="true"><PipelineChart series={series} active={selected} hover={setPointer} /><span className="kay-dash-arc-total"><strong>{value.kpis.active_deals.total.toLocaleString("fr-MA")}</strong><small>affaires actives</small></span></div>
    <ul className="kay-dash-stages" aria-label="Nombre exact par étape">{activeStages.map((key, index) => <li key={key}><Button variant="ghost" className="kay-dash-stage" data-active={selected === index} onPointerEnter={event => { if (event.pointerType !== "touch") setPointer(index); }} onPointerLeave={() => setPointer(null)} onFocus={() => setFocus(index)} onBlur={() => setFocus(null)} onClick={() => stage(key)} aria-label={`${stageLabels[key]} : ${value.pipeline[key]}. Voir les affaires.`}><span aria-hidden="true" className="kay-dash-dot" style={{ background: series[index].color }} /><span>{stageLabels[key]}</span><strong>{value.pipeline[key].toLocaleString("fr-MA")}</strong></Button></li>)}</ul>
    <div className="kay-dash-outcomes"><p className="kay-dash-note">Clôtures sur la période</p><dl>{(["won", "lost", "cancelled"] as const).map(key => <div key={key}><dt>{stageLabels[key]}</dt><dd><Button variant="link" onClick={() => outcome(key)} aria-label={`${stageLabels[key]} : ${value.outcomes[key]}. Voir les clôtures.`}>{value.outcomes[key].toLocaleString("fr-MA")}</Button></dd></div>)}</dl></div>
  </section>;
}
