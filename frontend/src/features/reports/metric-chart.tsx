"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { useChartHover, useChartStable } from "@/components/charts/chart-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import type { Metric } from "./contracts";

const colors = ["var(--chart-series3)", "var(--chart-series4)", "var(--chart-series5)", "var(--chart-series2)", "var(--chart-series1)"];

function FocusPoint({ selected, points }: { selected: number | null; points: Metric["series"] }) {
  const { innerHeight, yScale } = useChartStable();
  const { setTooltipData } = useChartHover();
  useEffect(() => {
    const point = selected === null ? undefined : points[selected];
    const offset = selected === null ? 0 : points.slice(0, selected).reduce((sum, value) => sum + value.value, 0);
    setTooltipData(point ? { point, index: 0, x: yScale(offset + point.value / 2), yPositions: { value: innerHeight / 2 } } : null);
    return () => setTooltipData(null);
  }, [selected, points, innerHeight, yScale, setTooltipData]);
  return null;
}

export function MetricChart({ metric, open }: { metric: Metric; open: (id?: string) => void }) {
  const [page, setPage] = useState(1), [selected, setSelected] = useState<number | null>(null);
  const points = useMemo(() => metric.series.slice((page - 1) * 10, page * 10).map((p, index) => ({ ...p, number: String((page - 1) * 10 + index + 1) })), [metric.series, page]);
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const data = useMemo(() => [{ label: metric.label, value: total, ...Object.fromEntries(points.map((point, index) => [`agent${index}`, point.value])) }], [metric.label, total, points]);
  const domain = useMemo<[number, number]>(() => [0, total || 1], [total]);
  return <section className={`surface grid min-w-0 content-start gap-4 ${metric.key === "activities" ? "xl:col-span-2" : ""}`} aria-label={metric.label} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}>
    <h3 className="text-section font-medium">{metric.label}</h3>
    <p className="text-sm text-muted-foreground">{metric.basis === "current" ? "Situation actuelle. Attribution au responsable actuel." : metric.key === "won" ? "Période sélectionnée. Attribution au responsable lors de la clôture. Réouvertures exclues." : "Période sélectionnée. Attribution à l’auteur réel des actions enregistrées."} Nombre absolu, sans taux ni dénominateur.</p>
    {points.length ? <>
      <div aria-label={`Graphique : ${metric.label}`} role="group" className="min-w-0">
        <p className="text-xs text-muted-foreground">Barre empilée par contributeur. Total affiché : {total.toLocaleString("fr-MA")}.</p>
        <BarChart data={data} xDataKey="label" orientation="horizontal" stacked valueDomain={domain} margin={{ top: 8, right: 0, bottom: 8, left: 0 }} aspectRatio="auto" className="h-24" animationDuration={0}>
          {points.map((point, index) => <Bar key={point.id} dataKey={`agent${index}`} fill={colors[((page - 1) * 10 + index) % colors.length]} animate={false} lineCap="butt" />)}
          <ChartTooltip showDatePill={false} showCrosshair={false} showDots={false} damping={0} content={({ point }) => <p className="max-w-entry wrap-anywhere text-sm" role="tooltip">{String(point.label)} : {String(point.value)}</p>} />
          <FocusPoint selected={selected} points={points} />
        </BarChart>
      </div>
      <Table aria-label={`Valeurs : ${metric.label}`} className="table-fixed">
        <TableHeader><TableRow><TableHead className="w-3/4">Contributeur / responsable</TableHead><TableHead className="text-right">Nombre</TableHead></TableRow></TableHeader>
        <TableBody>{points.map((point, index) => <TableRow key={point.id}>
          <TableCell className="whitespace-normal wrap-anywhere"><Button variant="link" className="h-auto min-h-control max-w-full justify-start gap-2 whitespace-normal text-start wrap-anywhere" onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => open(point.id)}><span aria-hidden="true" className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: colors[((page - 1) * 10 + index) % colors.length] }} /><span className="wrap-anywhere">{point.number}. {point.label}</span></Button></TableCell>
          <TableCell className="text-right tabular-nums">{point.value}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <NumberedPages page={page} size={10} total={metric.series.length} change={next => { setPage(next); setSelected(null); }} label={`Pages du graphique ${metric.key}`} />
    </> : <p>Aucune donnée pour ce graphique dans votre périmètre et cette période. Le total est 0.</p>}
    <Button action="preview" variant="outline" className="justify-self-start" onClick={() => open()}>Voir les dossiers : {metric.total}</Button>
  </section>;
}
