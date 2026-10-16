"use client";
import { useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { Grid } from "@/components/charts/grid";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { useChartHover, useChartStable } from "@/components/charts/chart-context";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import type { Metric } from "./contracts";

function FocusPoint({ selected }: { selected: number | null }) {
  const { data, innerWidth, yScale } = useChartStable();
  const { setTooltipData } = useChartHover();
  useEffect(() => {
    const point = selected === null ? undefined : data[selected];
    setTooltipData(point && selected !== null ? { point, index: selected, x: (selected + .5) * innerWidth / data.length, yPositions: { value: yScale(Number(point.value)) } } : null);
    return () => setTooltipData(null);
  }, [selected, data, innerWidth, yScale, setTooltipData]);
  return null;
}

export function MetricChart({ metric, open }: { metric: Metric; open: (id?: string) => void }) {
  const [page, setPage] = useState(1), [selected, setSelected] = useState<number | null>(null);
  const points = useMemo(() => metric.series.slice((page - 1) * 10, page * 10).map((p, index) => ({ ...p, number: String((page - 1) * 10 + index + 1) })), [metric.series, page]);
  return <section className="surface grid min-w-0 gap-4" aria-label={metric.label} onKeyDown={e => { if (e.key === "Escape") setSelected(null); }}>
    <h3 className="text-section font-medium">{metric.label}</h3>
    <p className="text-sm text-muted-foreground">{metric.basis === "current" ? "Situation actuelle. Attribution au responsable actuel." : metric.key === "won" ? "Période sélectionnée. Attribution au responsable lors de la clôture. Réouvertures exclues." : "Période sélectionnée. Attribution à l’auteur réel des actions enregistrées."} Nombre absolu, sans taux ni dénominateur.</p>
    {points.length ? <>
      <div aria-label={`Graphique : ${metric.label}`} role="group" className="min-w-0">
        <BarChart data={points} xDataKey="number" aspectRatio="auto" className="h-chart" animationDuration={0}>
          <Grid horizontal /><Bar dataKey="value" fill={metric.key === "contacts" ? "var(--chart-series3)" : metric.key === "won" ? "var(--chart-series5)" : "var(--chart-series4)"} animate={false} lineCap="butt" /><BarXAxis />
          <ChartTooltip showDatePill={false} showCrosshair={false} showDots={false} damping={0} content={({ point }) => <p className="max-w-entry wrap-anywhere text-sm" role="tooltip">{String(point.label)} : {String(point.value)}</p>} />
          <FocusPoint selected={selected} />
        </BarChart>
      </div>
      <Table aria-label={`Valeurs : ${metric.label}`} className="table-fixed">
        <TableHeader><TableRow><TableHead>Contributeur / responsable</TableHead><TableHead className="text-right">Nombre</TableHead></TableRow></TableHeader>
        <TableBody>{points.map((point, index) => <TableRow key={point.id}>
          <TableCell className="whitespace-normal wrap-anywhere"><Button variant="link" className="h-auto min-h-control max-w-full whitespace-normal text-start wrap-anywhere" onFocus={() => setSelected(index)} onBlur={() => setSelected(null)} onClick={() => open(point.id)}>{point.number}. {point.label}</Button></TableCell>
          <TableCell className="text-right tabular-nums">{point.value}</TableCell>
        </TableRow>)}</TableBody>
      </Table>
      <NumberedPages page={page} size={10} total={metric.series.length} change={next => { setPage(next); setSelected(null); }} label={`Pages du graphique ${metric.key}`} />
    </> : <p>Aucune donnée pour ce graphique dans votre périmètre et cette période. Le total est 0.</p>}
    <Button variant="outline" className="justify-self-start" onClick={() => open()}>Voir les dossiers : {metric.total}</Button>
  </section>;
}
