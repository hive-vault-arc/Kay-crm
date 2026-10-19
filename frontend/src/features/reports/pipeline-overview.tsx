"use client";
import Link from "next/link";
import { DistributionFunnel } from "@/components/charts/distribution-funnel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { enquiriesSchema, statusLabels, writableStatusSchema } from "@/features/contacts/contracts";
import { dealsSchema, stageLabels } from "@/features/deals/contracts";

const stageColor = (hue: string) => `var(--riviera-color-stage-${hue}-fill)`;
const colors = ["blue", "cyan", "orange", "yellow", "purple", "green", "red", "slate"].map(stageColor);
const leadColors = { new: stageColor("blue"), in_progress: stageColor("cyan"), follow_up: stageColor("yellow"), analysis: stageColor("purple"), qualified: stageColor("green"), not_qualified: stageColor("orange"), lost: stageColor("red"), junk_lead: stageColor("pink"), closed: stageColor("slate") };
const terminalLeadStatuses = new Set(["lost", "junk_lead", "closed"]);

export function PipelineOverview() {
  const deals = useQuery("/api/v1/deals?page=1&page_size=1", dealsSchema);
  const leads = useQuery("/api/v1/enquiries?page=1&page_size=1", enquiriesSchema);
  return <section className="grid min-w-0 gap-3" aria-label="Répartition des pipelines" aria-describedby="dashboard-pipeline-description"><h2 className="sr-only">Répartition des pipelines</h2><div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-2">
    <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des prospects"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des prospects</h2><Button action="enquiry" variant="link" className="px-0" asChild><Link href="/leads">Tous les prospects</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle · répartition par étape.<span className="sr-only"> Hors prospects convertis et contacts archivés.</span></p>
      {leads.error ? <RecordError error={leads.error} retry={leads.refresh} /> : !leads.value ? <div aria-busy="true"><p role="status">Chargement du pipeline des prospects…</p><Skeleton aria-hidden="true" className="mt-2 h-28 w-full" /></div> : <DistributionFunnel points={writableStatusSchema.options.filter(status => !terminalLeadStatuses.has(status)).map(status => ({ label: statusLabels[status], value: leads.value!.status_counts[status], color: leadColors[status] }))} footerPoints={writableStatusSchema.options.filter(status => terminalLeadStatuses.has(status)).map(status => ({ label: statusLabels[status], value: leads.value!.status_counts[status], color: leadColors[status] }))} />}
    </section>
    <section className="grid min-w-0 grid-rows-[auto_auto_1fr] gap-2 rounded-md border bg-card p-3" aria-label="Pipeline des affaires"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-section font-semibold">Pipeline des affaires</h2><Button action="deal" variant="link" className="px-0" asChild><Link href="/deals">Toutes les affaires</Link></Button></div><p className="text-xs text-muted-foreground">Situation actuelle · répartition par étape.<span className="sr-only"> Contacts archivés exclus. Les étapes peuvent être sautées; aucun taux de conversion n’est déduit.</span></p>
      {deals.error ? <RecordError error={deals.error} retry={deals.refresh} /> : !deals.value ? <div aria-busy="true"><p role="status">Chargement du pipeline des affaires…</p><Skeleton aria-hidden="true" className="mt-2 h-28 w-full" /></div> : <DistributionFunnel points={Object.entries(stageLabels).map(([key, label], index) => ({ label, value: deals.value!.stage_counts[key as keyof typeof stageLabels], color: colors[index] }))} />}
    </section>
  </div><p id="dashboard-pipeline-description" className="sr-only">La hauteur des segments représente les effectifs actuels, pas un parcours de conversion. Les étapes peuvent être sautées.</p></section>;
}
