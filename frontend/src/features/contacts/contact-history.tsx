"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/shared/data-table";
import { RecordDrawer } from "@/components/shared/record-drawer";
import type { ApiError } from "@/lib/api/client";
import type { EntryDenied } from "@/features/activities/use-entry-command";
import { formatInstant } from "@/lib/format";
import { activityLabels, dealActivityLabels, assignmentsSchema, timelineSchema } from "./ownership-contracts";
import { ContactNoteForm } from "./contact-note-form";
import { NumberedPages } from "./numbered-pages";
import { RecordError } from "./record-states";
import { queryPath, useQuery } from "./use-query";

export function ContactTimeline({ id, archived, revision, denied }: { id: string; archived: boolean; revision?: number; denied?: EntryDenied }) {
  const [page, setPage] = useState(1);
  const [accessError, setAccessError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const query = useQuery(queryPath(`contacts/${id}/timeline`, { page, page_size: 25 }), timelineSchema, revision);
  const title = (action: string) => (activityLabels as Record<string, string>)[action] ?? (dealActivityLabels as Record<string, string>)[action] ?? "Événement";
  const failure = accessError ?? query.error;
  if (failure && [401, 403, 404].includes(failure.status)) return <section className="grid gap-3">{notice ? <p role="status">{notice}</p> : null}<RecordError error={failure} retry={() => { setAccessError(undefined); setNotice(""); query.refresh(); }} /></section>;
  return <section className="grid min-w-0 gap-4"><div className="kay-section-head"><h2>Historique du contact</h2>{!archived ? <RecordDrawer label="Ajouter une activité" action="add" description="Consigner une note ou une interaction avec son auteur.">{(_close, saved) => <ContactNoteForm id={id} denied={(failure, acknowledged) => { setAccessError(failure); setNotice(acknowledged ? "L’entrée est enregistrée. Les droits d’accès ont changé." : ""); denied?.(failure, acknowledged); }} saved={() => { setPage(1); query.refreshQuietly(); setNotice("Entrée enregistrée, avec son auteur."); saved(); }} />}</RecordDrawer> : null}</div>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique…</p> : <>
      <p role="status" className="text-sm text-muted-foreground">{query.value.total} événement(s), auteurs conservés.</p>
      <DataTable rows={query.value.items} getRowId={item => item.id} columns={[
        { id: "date", header: "Date", cell: ({ row }) => <time dateTime={row.original.occurred_at}>{formatInstant(row.original.occurred_at)}</time> },
        { id: "event", header: "Événement", cell: ({ row }) => title(row.original.action) },
        { id: "note", header: "Note", cell: ({ row: { original: item } }) => <div className="grid gap-2 text-sm">{item.body ? <p className="whitespace-pre-wrap wrap-anywhere">{item.body}</p> : null}{item.reason ? <p className="whitespace-pre-wrap wrap-anywhere">Motif : {item.reason}</p> : null}{item.contact_id !== id ? <p className="wrap-anywhere text-xs">Contact d’origine : {item.contact_id}</p> : null}{item.related_contact_id ? <p className="wrap-anywhere text-xs">Contact de la fusion : {item.related_contact_id}</p> : null}{item.enquiry_id ? <Link className="inline-flex min-h-control items-center hover:underline" href={`/leads/${item.enquiry_id}`}>Voir le prospect</Link> : null}{item.deal_id ? <Link className="inline-flex min-h-control items-center hover:underline" href={`/deals/${item.deal_id}`}>Voir l’affaire</Link> : null}{!item.body && !item.reason && !item.enquiry_id && !item.deal_id ? "—" : null}</div> },
        { id: "author", header: "Auteur", cell: ({ row }) => row.original.actor.display_name },
      ]} caption="Historique du contact et de ses dossiers" footerCaption emptyLabel="Aucun événement enregistré." mobileCard={item => <article className="grid gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{title(item.action)}</strong><time className="text-xs text-muted-foreground" dateTime={item.occurred_at}>{formatInstant(item.occurred_at)}</time></div><p className="text-xs text-muted-foreground">{item.actor.display_name}</p>{item.body ? <p className="whitespace-pre-wrap wrap-anywhere text-sm">{item.body}</p> : null}{item.reason ? <p className="whitespace-pre-wrap wrap-anywhere text-sm">Motif : {item.reason}</p> : null}{item.contact_id !== id ? <p className="wrap-anywhere text-xs">Contact d’origine : {item.contact_id}</p> : null}{item.related_contact_id ? <p className="wrap-anywhere text-xs">Contact de la fusion : {item.related_contact_id}</p> : null}{item.enquiry_id ? <Link className="inline-flex min-h-control items-center text-sm hover:underline" href={`/leads/${item.enquiry_id}`}>Voir le prospect</Link> : null}{item.deal_id ? <Link className="inline-flex min-h-control items-center text-sm hover:underline" href={`/deals/${item.deal_id}`}>Voir l’affaire</Link> : null}</article>} />
      <NumberedPages compact label="Pages de l’historique" page={page} total={query.value.total} size={query.value.page_size} change={setPage} />
    </>}
  </section>;
}

export function ContactAssignments({ id, revision }: { id: string; revision?: number }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`contacts/${id}/assignment-events`, { page, page_size: 25 }), assignmentsSchema, revision);
  return <section className="grid gap-4"><h2 className="text-section font-medium">Historique d’attribution</h2>
    <p className="text-sm text-muted-foreground">L’acteur de la décision ne remplace jamais l’auteur des contributions.</p>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des attributions…</p> : <>
      {query.value.items.length ? <ol className="grid gap-6">{query.value.items.map(item => <li key={item.id} className="grid min-w-0 gap-2 border-b pb-4">
        <h3 className="font-medium">{{ primary: "Changement de responsable", collaborator_added: "Collaboration accordée", collaborator_removed: "Collaboration retirée", enquiry: "Attribution de demande" }[item.action] ?? "Attribution"}</h3>
        <p className="wrap-anywhere">Acteur : {item.actor.display_name}</p><time className="text-sm text-muted-foreground" dateTime={item.occurred_at}>{formatInstant(item.occurred_at)}</time>
        <p className="wrap-anywhere">Avant : {item.previous_user?.display_name ?? "Aucun"} · Après : {item.new_user?.display_name ?? (item.action === "enquiry" ? "File du responsable" : "Aucun")}</p>
        <p className="whitespace-pre-wrap wrap-anywhere">Motif : {item.reason}</p>
        {item.enquiry_id ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/leads/${item.enquiry_id}`}>Voir la demande liée</Link> : null}
      </li>)}</ol> : <p>Aucun changement d’attribution enregistré.</p>}
      <NumberedPages label="Pages des attributions" page={page} total={query.value.total} size={query.value.page_size} change={setPage} />
    </>}
  </section>;
}
