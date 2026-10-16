"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { exceptionsSchema } from "./contracts";

export function Exceptions() {
  const [kind, setKind] = useState("stale_inventory"), [page, setPage] = useState(1);
  const query = useQuery(queryPath("reports/exceptions", { kind, page, page_size: 10 }), exceptionsSchema);
  return <section className="grid min-w-0 gap-4 border-t pt-8" aria-label="Alertes à examiner"><h2 className="text-section font-medium">Alertes à examiner</h2>
    <div className="flex flex-wrap items-end gap-4"><div className="grid min-w-0 gap-2"><Label htmlFor="report-exception-kind">Type d’alerte</Label><NativeSelect id="report-exception-kind" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="stale_inventory">Inventaire : 30 jours sans confirmation</option><option value="inactive_deals">Affaires : 14 jours sans activité</option></NativeSelect></div><Button action="refresh" variant="outline" onClick={query.refresh}>Actualiser les alertes</Button></div>
    <p className="text-sm text-muted-foreground">Situation actuelle, en jours écoulés. Les alertes ne retirent aucun bien et ne clôturent aucune affaire. Les biens physiques sont comptés une fois; les offres de programme entier restent distinctes.</p>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des alertes…</p> : <><p>{query.value.total} alerte(s) dans votre périmètre.</p>{query.value.items.length ? <ul className="grid gap-4">{query.value.items.map(item => <li key={item.id} className="grid min-w-0 gap-2 border-t pt-4"><Link className="inline-flex min-h-control items-center justify-self-start wrap-anywhere text-link underline" href={item.href}>{item.label}</Link><p>{item.kind === "property" ? "Bien physique" : item.kind === "development" ? "Offre de programme entier" : "Affaire"} : {item.age_days} jours écoulés.</p></li>)}</ul> : <p>Aucune alerte pour ce type dans votre périmètre.</p>}<NumberedPages page={query.value.page} size={query.value.page_size} total={query.value.total} change={setPage} label="Pages des alertes" /></>}
  </section>;
}
