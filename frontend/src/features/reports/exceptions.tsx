"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, NotificationIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { exceptionsSchema } from "./contracts";
import { matchesExceptions } from "./report-model";

export function Exceptions({ onDenied }: { onDenied?: (error: ApiError) => void } = {}) {
  const [kind, setKind] = useState<"stale_inventory" | "inactive_deals">("inactive_deals"), [page, setPage] = useState(1);
  const heading = useRef<HTMLHeadingElement>(null), id = useId();
  const query = useQuery(queryPath("reports/exceptions", { kind, page, page_size: 10 }), exceptionsSchema);
  const value = query.value && matchesExceptions(query.value, kind, page) ? query.value : undefined;
  const error = query.error ?? (query.value && !value ? new ApiError("DEPENDENCY_UNAVAILABLE", 503) : undefined);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) onDenied?.(query.error); }, [query.error, onDenied]);
  return <section className="kay-report-records" aria-label="Alertes à examiner">
    <h2 data-report-heading ref={heading} tabIndex={-1} className="kay-report-view-title"><NotificationIcon aria-hidden="true" className="size-5" />Alertes à examiner</h2>
    <div data-filter-panel className="kay-report-controls"><div className="kay-report-alert-filter"><div><Label htmlFor={`${id}-kind`}>Type d’alerte</Label><NativeSelect id={`${id}-kind`} value={kind} onChange={event => { if (event.target.value === "stale_inventory" || event.target.value === "inactive_deals") { setKind(event.target.value); setPage(1); } }}><option value="inactive_deals">Affaires : 14 jours sans activité</option><option value="stale_inventory">Inventaire : 30 jours sans confirmation</option></NativeSelect></div><Button liveRefresh action="refresh" variant="quiet" size="icon" aria-label="Actualiser les alertes" onClick={query.refresh} /></div>
      <p className="kay-report-caption">Situation actuelle, en jours écoulés UTC. Aucune action automatique sur les dossiers. Les biens physiques sont comptés une fois ; les offres de programme entier restent distinctes.</p></div>
    {error ? <RecordError error={error} retry={query.refresh} /> : !value ? <p role="status">Chargement des alertes…</p> : <><p className="kay-report-caption">{value.total.toLocaleString("fr-MA")} alerte(s) dans votre périmètre.</p>
      {value.items.length ? <ul className="kay-work-list">{value.items.map(item => <li key={item.id}><Button asChild action="forward" variant="quiet" className="kay-report-record"><Link href={item.href}><span className="kay-report-record-copy"><strong>{item.label}</strong><small>{item.kind === "property" ? "Bien physique" : item.kind === "development" ? "Offre de programme entier" : "Affaire"} · {item.age_days} jours écoulés</small></span></Link></Button></li>)}</ul> : <div className="kay-report-empty"><CheckIcon aria-hidden="true" className="size-6" /><strong>Aucune alerte à examiner</strong><p>Aucun dossier pour cette catégorie dans votre périmètre.</p></div>}
      <NumberedPages compact page={value.page} size={value.page_size} total={value.total} change={setPage} label="Pages des alertes" /></>}
  </section>;
}
