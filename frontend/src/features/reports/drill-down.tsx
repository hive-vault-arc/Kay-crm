"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EmptyFolderIcon, FileIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { formatMAD } from "@/lib/format";
import { drillSchema, type MetricKey } from "./contracts";
import { matchesDrill, reportTitles } from "./report-model";

export type Selection = { metric: MetricKey; attribution_id?: string; start_on: string; end_on: string };
export function DrillDown({ selection, close, closeLabel = "Fermer les dossiers", onDenied }: { selection: Selection; close: () => void; closeLabel?: string; onDenied?: (error: ApiError) => void }) {
  const [page, setPage] = useState(1), heading = useRef<HTMLHeadingElement>(null);
  const query = useQuery(queryPath("reports/drill-down", { ...selection, page, page_size: 10 }), drillSchema);
  const value = query.value && matchesDrill(query.value, selection, page) ? query.value : undefined;
  const error = query.error ?? (query.value && !value ? new ApiError("DEPENDENCY_UNAVAILABLE", 503) : undefined);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) onDenied?.(query.error); }, [query.error, onDenied]);
  return <section className="kay-report-records" aria-label="Dossiers de l’indicateur">
    <Button action="back" variant="quiet" className="justify-self-start" onClick={close}>{closeLabel}</Button>
    <h2 data-report-heading ref={heading} tabIndex={-1} className="kay-report-view-title"><FileIcon aria-hidden="true" className="size-5" />{reportTitles[selection.metric]}</h2>
    {error ? <RecordError error={error} retry={query.refresh} /> : !value ? <p role="status">Chargement des dossiers…</p> : <>
      <p className="kay-report-caption">{value.metric.label} · {value.total.toLocaleString("fr-MA")} dossier(s) accessible(s){value.metric.unit === "MAD" ? ` · ${formatMAD(value.metric.value)}` : ""}. {value.metric.basis === "current" ? "Situation actuelle." : `Période du ${value.start_on} au ${value.end_on}, dates inclusives.`}</p>
      {value.items.length ? <ul className="kay-work-list">{value.items.map(item => <li key={item.id}><Button asChild action="forward" variant="quiet" className="kay-report-record"><Link href={item.href}><span className="kay-report-record-copy"><strong>{item.label}</strong>{item.attribution_label ? <small>{item.attribution_label}</small> : null}</span>{value.metric.unit === "MAD" ? <span className="kay-report-record-value">{formatMAD(item.value)}</span> : null}</Link></Button></li>)}</ul> : <div className="kay-report-empty"><EmptyFolderIcon aria-hidden="true" className="size-6" /><strong>Aucun dossier pour cette sélection</strong><p>Changez d’indicateur ou de période pour poursuivre.</p></div>}
      <NumberedPages compact page={value.page} size={value.page_size} total={value.total} change={setPage} label="Pages des dossiers de l’indicateur" />
    </>}
  </section>;
}
