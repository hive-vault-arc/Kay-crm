"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatMAD } from "@/lib/format";
import { drillSchema, type MetricKey } from "./contracts";

export type Selection = { metric: MetricKey; attribution_id?: string; start_on: string; end_on: string };
export function DrillDown({ selection, close }: { selection: Selection; close: () => void }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("reports/drill-down", { ...selection, page, page_size: 10 }), drillSchema);
  const financial = query.value?.metric.unit === "MAD";
  return <section className="grid min-w-0 gap-4 border-t pt-8" aria-label="Dossiers de l’indicateur" tabIndex={-1} ref={node => { node?.focus({ preventScroll: true }); }}>
    <h3 className="text-section font-medium">Dossiers de l’indicateur</h3>
    <Button variant="outline" className="justify-self-start" onClick={close}>Fermer les dossiers</Button>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des dossiers…</p> : <>
      <p>{query.value.metric.label} : {query.value.total} dossier(s) accessible(s){query.value.metric.unit === "MAD" ? `, total ${formatMAD(query.value.metric.value)}` : ""}.</p>
      {query.value.items.length ? <ul className="grid min-w-0 gap-2">{query.value.items.map(item => <li key={item.id} className="grid min-w-0 gap-2 border-t pt-2"><Link className="inline-flex min-h-control items-center justify-self-start wrap-anywhere text-link underline" href={item.href}>{item.label}</Link>{item.attribution_label ? <p className="wrap-anywhere">{item.attribution_label}</p> : null}{financial ? <p>{formatMAD(item.value)}</p> : null}</li>)}</ul> : <p>Aucun dossier accessible pour cette sélection.</p>}
      <NumberedPages page={query.value.page} size={query.value.page_size} total={query.value.total} change={setPage} label="Pages des dossiers de l’indicateur" />
    </>}
  </section>;
}
