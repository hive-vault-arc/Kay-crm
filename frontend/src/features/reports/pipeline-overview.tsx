"use client";
import Link from "next/link";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { enquiriesSchema, statusLabels } from "@/features/contacts/contracts";
import { dealsSchema, stageLabels } from "@/features/deals/contracts";

const colors = ["var(--status-info-foreground)", "var(--status-purple-foreground)", "var(--status-warning-foreground)", "var(--status-teal-foreground)", "var(--chart-series4)", "var(--status-success-foreground)", "var(--status-danger-foreground)", "var(--status-neutral-foreground)"];

export function PipelineOverview() {
  const deals = useQuery("/api/v1/deals?page=1&page_size=1", dealsSchema);
  const fresh = useQuery("/api/v1/enquiries?status=new&page=1&page_size=1", enquiriesSchema);
  const active = useQuery("/api/v1/enquiries?status=in_progress&page=1&page_size=1", enquiriesSchema);
  const closed = useQuery("/api/v1/enquiries?status=closed&page=1&page_size=1", enquiriesSchema);
  return <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
    <section className="grid min-w-0 gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des prospects"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des prospects</h2><Button variant="link" className="px-0" asChild><Link href="/leads">Tous les prospects</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle des demandes accessibles, hors contacts archivés.</p>
      {fresh.error || active.error || closed.error ? <RecordError error={(fresh.error ?? active.error ?? closed.error)!} retry={() => { fresh.refresh(); active.refresh(); closed.refresh(); }} /> : !fresh.value || !active.value || !closed.value ? <p role="status">Chargement du pipeline des prospects…</p> : <StageChart points={[{ label: statusLabels.new, value: fresh.value.total }, { label: statusLabels.in_progress, value: active.value.total }, { label: statusLabels.closed, value: closed.value.total }]} />}
    </section>
    <section className="grid min-w-0 gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des affaires"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des affaires</h2><Button variant="link" className="px-0" asChild><Link href="/deals">Toutes les affaires</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle, hors contacts archivés. Étapes sautables : aucun taux de conversion n’est déduit.</p>
      {deals.error ? <RecordError error={deals.error} retry={deals.refresh} /> : !deals.value ? <p role="status">Chargement du pipeline des affaires…</p> : <StageChart points={Object.entries(stageLabels).map(([key, label]) => ({ label, value: deals.value!.stage_counts[key as keyof typeof stageLabels] }))} />}
    </section>
  </div>;
}

function StageChart({ points }: { points: { label: string; value: number }[] }) {
  const data = points.map((point, index) => ({ label: point.label, ...Object.fromEntries(points.map((_, key) => [`stage${key}`, key === index ? point.value : null])) }));
  return <div className="grid min-w-0 grid-cols-[minmax(6rem,1fr)_minmax(0,2fr)] gap-3">
    <dl className="flex min-h-40 flex-col justify-around gap-1">{points.map((point, index) => <div className="flex min-w-0 items-center justify-between gap-2 text-xs" key={point.label}><dt className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors[index] }} /><span className="wrap-anywhere">{point.label}</span></dt><dd className="font-semibold tabular-nums">{point.value}</dd></div>)}</dl>
    <div aria-hidden="true" className="min-w-0">{points.some(point => point.value > 0) ? <BarChart data={data} xDataKey="label" orientation="horizontal" stacked margin={{ top: 0, right: 8, bottom: 0, left: 0 }} aspectRatio="auto" className="h-40" animationDuration={0}>{points.map((point, index) => <Bar key={point.label} dataKey={`stage${index}`} fill={colors[index]} animate={false} lineCap="butt" />)}</BarChart> : <div className="flex h-40 items-center justify-center rounded-sm bg-muted p-4 text-center text-xs text-muted-foreground">Aucun dossier dans ce périmètre.</div>}</div>
  </div>;
}
