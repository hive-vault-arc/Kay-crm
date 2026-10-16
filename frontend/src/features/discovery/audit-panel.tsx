"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatInstant } from "@/lib/format";
import { useHydrated } from "@/hooks/use-hydrated";
import { auditSchema, familyLabels } from "./contracts";
export function AuditPanel() {
  const [draft, setDraft] = useState({ family: "", start_on: "", end_on: "" }), [filters, setFilters] = useState(draft), [page, setPage] = useState(1), [error, setError] = useState("");
  const result = useQuery(queryPath("audit/events", { ...filters, page, page_size: 25 }), auditSchema), hydrated = useHydrated();
  return <div className="grid min-w-0 gap-3"><Button asChild variant="outline" className="justify-self-start"><Link href="/dashboard">Retour au tableau de bord</Link></Button><p className="max-w-reading text-sm text-muted-foreground">Actions horodatées et acteurs conservés. Les valeurs privées ne sont pas recopiées ici. Les événements métier et financiers ne sont pas purgés.</p><form className="filter-toolbar" onSubmit={event => { event.preventDefault(); if (draft.start_on && draft.end_on && draft.start_on > draft.end_on) { setError("La date de début doit précéder la date de fin."); return; } setError(""); setFilters(draft); setPage(1); }}><fieldset disabled={!hydrated} className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"><div className="contents"><div className="grid gap-2"><Label htmlFor="audit-family">Famille d’événements</Label><NativeSelect id="audit-family" value={draft.family} onChange={e => setDraft({ ...draft, family: e.target.value })}><option value="">Toutes les familles</option>{Object.entries(familyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><div className="grid gap-2"><Label htmlFor="audit-from">À partir du</Label><Input id="audit-from" type="date" value={draft.start_on} onChange={e => setDraft({ ...draft, start_on: e.target.value })} /></div><div className="grid gap-2"><Label htmlFor="audit-to">Jusqu’au</Label><Input id="audit-to" type="date" value={draft.end_on} onChange={e => setDraft({ ...draft, end_on: e.target.value })} /></div></div><Button className="justify-self-start" variant="outline">Filtrer le journal</Button></fieldset></form>{error ? <p role="alert" className="text-danger">{error}</p> : null}
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement du journal…</p> : <><p role="status">{result.value.total} événement(s).</p><ul className="grid gap-4">{result.value.items.map(row => <li className="grid min-w-0 gap-2 border-b pb-4 sm:grid-cols-2" key={row.id}><div className="grid gap-1"><p className="font-medium wrap-anywhere">{row.action}</p><p className="wrap-anywhere">Acteur : {row.actor_name}</p></div><time dateTime={row.created_at}>{formatInstant(row.created_at)}</time></li>)}</ul>{!result.value.items.length ? <p>Aucun événement sur cette page. Modifiez les filtres ou revenez à la première page.</p> : null}<NumberedPages label="Pages du journal" page={page} size={25} total={result.value.total} change={setPage} /></>}</div>;
}
