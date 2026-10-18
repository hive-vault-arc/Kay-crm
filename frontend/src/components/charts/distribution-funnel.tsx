"use client";

import { useMemo } from "react";
import { BarChart } from "./bar-chart";
import { Bar } from "./bar";

export type DistributionStage = { label: string; value: number; color: string };

export function DistributionFunnel({ points, footerPoints = [] }: { points: DistributionStage[]; footerPoints?: DistributionStage[] }) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const data = useMemo(() => [{ label: "Répartition actuelle", ...Object.fromEntries(points.map((point, index) => [`stage${index}`, point.value])) }], [points]);
  const domain = useMemo<[number, number]>(() => [0, total], [total]);
  return <div className="grid min-w-0 items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    {total > 0 ? <div aria-hidden="true" className="min-w-0" style={{ clipPath: "polygon(0 0,100% 0,68% 78%,68% 100%,32% 100%,32% 78%)" }}>
      <BarChart data={data} xDataKey="label" orientation="horizontal" stacked valueDomain={domain} barGap={0} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} aspectRatio="1.35 / 1" className="rotate-90" animationDuration={0}>
        {points.map((point, index) => <Bar key={point.label} dataKey={`stage${index}`} fill={point.color} animate={false} lineCap="butt" />)}
      </BarChart>
    </div> : <p className="flex min-h-40 items-center justify-center p-4 text-center text-sm text-muted-foreground">Aucun dossier dans ce périmètre.</p>}
    <dl className="grid min-w-0 gap-y-2">{points.map(point => <div key={point.label} className="flex min-w-0 items-center justify-between gap-3 text-sm"><dt className="flex min-w-0 items-center gap-2 font-medium"><span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: point.color }} /><span className="wrap-anywhere">{point.label}</span></dt><dd className="shrink-0 whitespace-nowrap text-muted-foreground tabular-nums">{point.value.toLocaleString("fr-MA")} dossier(s)</dd></div>)}</dl>
    {footerPoints.length ? <dl className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t pt-2 text-xs sm:justify-start">{footerPoints.map(point => <div key={point.label} className="flex min-w-0 items-center gap-1"><dt className="flex min-w-0 items-center gap-1 text-muted-foreground"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: point.color }} /><span className="wrap-anywhere">{point.label}</span></dt><dd className="shrink-0 tabular-nums text-muted-foreground">{point.value.toLocaleString("fr-MA")}</dd></div>)}</dl> : null}
  </div>;
}
