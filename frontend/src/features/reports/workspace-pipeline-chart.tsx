"use client";

import { useReducedMotion } from "motion/react";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import type { PieData } from "@/components/charts/pie-context";

// The complete exact values remain in the keyboard-operable legend outside this decorative SVG.
export function WorkspacePipelineChart({ series, active, hover }: { series: PieData[]; active: number | null; hover: (index: number | null) => void }) {
  const reduced = useReducedMotion();
  const empty = series.every(row => row.value === 0);
  const data = empty ? [{ label: "Aucune affaire active", value: 1, color: "var(--workspace-line)" }] : series;
  const selected = !empty && active !== null && series[active]?.value > 0 ? active : null;
  return <PieChart className="kay-dash-bklit" data={data} innerRadius={85} startAngle={-Math.PI / 2} endAngle={Math.PI / 2} padAngle={empty ? 0 : .035} cornerRadius={6} hoverOffset={0} hoveredIndex={selected} onHoverChange={empty ? undefined : hover} enterTransition={{ duration: reduced ? 0 : .65, ease: [.22, 1, .36, 1] }} enterStaggerScale={0}>
    {data.map((row, index) => <PieSlice key={row.label} index={index} animate={!reduced} hoverEffect={reduced || empty ? "none" : "translate"} hoverOffset={reduced || empty ? 0 : -4} showGlow={false} />)}
  </PieChart>;
}
