"use client";
import Link from "next/link";
import { DistributionFunnel } from "@/components/charts/distribution-funnel";
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
  return <section className="grid min-w-0 gap-3" aria-label="Répartition des pipelines"><div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2"><h2 className="text-section font-semibold">Répartition des pipelines</h2><p className="text-xs text-muted-foreground">Dossiers accessibles, situation actuelle</p></div><div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-2">
    <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des prospects"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des prospects</h2><Button action="enquiry" variant="link" className="px-0" asChild><Link href="/leads">Tous les prospects</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle des demandes accessibles, hors contacts archivés.</p>
      {fresh.error || active.error || closed.error ? <RecordError error={(fresh.error ?? active.error ?? closed.error)!} retry={() => { fresh.refresh(); active.refresh(); closed.refresh(); }} /> : !fresh.value || !active.value || !closed.value ? <p role="status">Chargement du pipeline des prospects…</p> : <DistributionFunnel points={[{ label: statusLabels.new, value: fresh.value.total, color: colors[0] }, { label: statusLabels.in_progress, value: active.value.total, color: colors[1] }, { label: statusLabels.closed, value: closed.value.total, color: colors[2] }]} />}
    </section>
    <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des affaires"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des affaires</h2><Button action="deal" variant="link" className="px-0" asChild><Link href="/deals">Toutes les affaires</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle, hors contacts archivés. Étapes sautables : aucun taux de conversion n’est déduit.</p>
      {deals.error ? <RecordError error={deals.error} retry={deals.refresh} /> : !deals.value ? <p role="status">Chargement du pipeline des affaires…</p> : <DistributionFunnel points={Object.entries(stageLabels).map(([key, label], index) => ({ label, value: deals.value!.stage_counts[key as keyof typeof stageLabels], color: colors[index] }))} />}
    </section>
  </div><p className="text-xs text-muted-foreground">La hauteur des segments représente les effectifs actuels, pas un parcours de conversion. Les étapes peuvent être sautées.</p></section>;
}
