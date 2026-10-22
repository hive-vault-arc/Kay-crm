"use client";
import { useId, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/shared/data-table";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { activityLabels, dealActivityLabels } from "@/features/contacts/ownership-contracts";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatInstant } from "@/lib/format";
import { activitiesSchema, activityKinds, directionLabels, kindLabels, type Activity } from "./contracts";
import { ActivityForm } from "./activity-form";

const labels: Record<string, string> = { ...activityLabels, ...dealActivityLabels, ...kindLabels, "enquiries.converted": "Conversion en affaire" };
const columns: ColumnDef<Activity>[] = [
  { id: "date", header: "Date", cell: ({ row }) => <time dateTime={row.original.occurred_at} className="block min-w-table-text tabular-nums">{formatInstant(row.original.occurred_at)}</time> },
  { id: "type", header: "Type", cell: ({ row }) => <span className="block min-w-table-text">{labels[row.original.action] ?? "Événement"}</span> },
  { id: "duration", header: "Durée", cell: ({ row }) => row.original.duration_minutes ? `${row.original.duration_minutes} min` : "Non précisée" },
  { id: "direction", header: "Sens", cell: ({ row }) => row.original.direction ? directionLabels[row.original.direction] : "Non précisé" },
  { id: "projects", header: "Projets évoqués", cell: ({ row }) => <span className="block min-w-table-text whitespace-pre-wrap wrap-anywhere">{row.original.projects.join("\n") || "Non précisés"}</span> },
  { id: "notes", header: "Notes de suivi", cell: ({ row }) => <div className="grid min-w-table-text gap-2 whitespace-pre-wrap wrap-anywhere">{row.original.body ? <p>{row.original.body}</p> : null}{row.original.reason ? <p>Motif : {row.original.reason}</p> : null}{!row.original.body && !row.original.reason ? <p>{labels[row.original.action] ?? "Événement enregistré"}</p> : null}</div> },
  { id: "actor", header: "Auteur", cell: ({ row }) => <span className="block min-w-table-text wrap-anywhere">{row.original.actor.display_name}</span> },
];

export function ActivityHistory({ scope, id, origin = false, writable = false }: { scope: "enquiries" | "deals"; id: string; origin?: boolean; writable?: boolean }) {
  const [page, setPage] = useState(1), [kind, setKind] = useState(""), [adding, setAdding] = useState(false), [notice, setNotice] = useState("");
  const selectId = useId(), addButton = useRef<HTMLButtonElement>(null);
  const title = origin ? "Historique du Lead d’origine" : scope === "enquiries" ? "Historique du Lead" : "Activités de l’affaire";
  const path = `${scope}/${id}/${origin ? "origin-activities" : "activities"}`;
  const query = useQuery(queryPath(path, { page, page_size: 20, kind }), activitiesSchema);
  function close() { setAdding(false); addButton.current?.focus(); }
  return <section className="grid min-w-0 gap-4 border-t pt-6" aria-label={title}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-section font-medium">{title}</h2><div className="flex flex-wrap gap-2"><Button liveRefresh action="refresh" variant="quiet" onClick={query.refresh}>Actualiser l’historique</Button>{writable && !origin ? <Button action="create" ref={addButton} aria-expanded={adding} onClick={() => { setAdding(true); setNotice(""); }}>Ajouter une activité</Button> : null}</div></div>
    {origin ? <p className="text-sm text-muted-foreground">Notes et échanges de la demande liée, conservés avec leur auteur et leur date d’origine. Lecture seule depuis l’affaire.</p> : null}
    {adding ? <ActivityForm path={`/api/v1/${scope}/${id}/activities`} cancel={close} saved={() => { close(); setNotice("Activité enregistrée."); setPage(1); query.refresh(); }} /> : null}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    <div className="grid gap-2 sm:w-64"><Label htmlFor={selectId}>Filtrer les activités</Label><NativeSelect id={selectId} value={kind} onChange={event => { setKind(event.target.value); setPage(1); }}><option value="">Toutes les activités</option>{activityKinds.map(code => <option key={code} value={code}>{kindLabels[code]}</option>)}<option value="system">Événements automatiques</option></NativeSelect></div>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div className="grid gap-2" role="status"><p>Chargement de l’historique…</p><div className="h-control rounded-md bg-muted" /></div> : <>
      <ScrollableResultsTable><DataTable columns={columns} rows={query.value.items} caption={title} scrollLabel={`Tableau : ${title}`} getRowId={row => row.id} emptyLabel={kind ? "Aucune activité de ce type." : origin && !query.value.origin_enquiry_id ? "Cette affaire n’a pas de Lead d’origine." : "Aucune activité enregistrée."} /></ScrollableResultsTable>
      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">{query.value.total} activité(s){query.value.last_activity_at ? <span>Dernière activité : {formatInstant(query.value.last_activity_at)}</span> : null}</p>
      <NumberedPages label={`Pages : ${title}`} page={page} size={20} total={query.value.total} change={setPage} />
    </>}
  </section>;
}
