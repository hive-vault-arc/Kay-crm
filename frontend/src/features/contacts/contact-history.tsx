"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { formatInstant } from "@/lib/format";
import { activityLabels, dealActivityLabels, assignmentsSchema, commandResultSchema, noteSchema, timelineSchema } from "./ownership-contracts";
import { NumberedPages } from "./numbered-pages";
import { RecordError } from "./record-states";
import { queryPath, useQuery } from "./use-query";

const kinds = { note: "Note", call: "Appel", email: "E-mail", meeting: "Rendez-vous", other: "Autre interaction" } as const;
function NoteForm({ id, saved }: { id: string; saved: () => void }) {
  const hydrated = useHydrated();
  const control = useId();
  const [kind, setKind] = useState<keyof typeof kinds>("note");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [success, setSuccess] = useState(false);
  const attempt = useRef({ body: "", key: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(undefined); setSuccess(false);
    const values = noteSchema.safeParse({ kind, body });
    if (!values.success) { setError(new ApiError("VALIDATION_ERROR", 422)); setBusy(false); return; }
    const fingerprint = JSON.stringify(values.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    try {
      await apiCommand(`/api/v1/contacts/${id}/notes`, values.data, commandResultSchema, attempt.current.key);
      setBody(""); attempt.current = { body: "", key: "" }; setSuccess(true); saved();
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  return <form className="grid max-w-reading gap-4" onSubmit={event => void submit(event)} aria-busy={busy}>
    <h3 className="font-medium">Ajouter une note ou consigner une interaction</h3>
    <p className="text-sm text-muted-foreground">L’auteur et l’heure d’enregistrement sont conservés. Consigner un e-mail ne l’envoie pas ; consigner un rendez-vous ne le planifie pas.</p>
    <fieldset disabled={!hydrated || busy} className="grid gap-4">
      <div className="grid gap-2"><Label htmlFor={`${control}-kind`}>Type d’entrée</Label><NativeSelect id={`${control}-kind`} value={kind} onChange={event => setKind(event.target.value as keyof typeof kinds)}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${control}-body`}>Texte de l’entrée</Label><Textarea id={`${control}-body`} required maxLength={4000} rows={4} value={body} onChange={event => setBody(event.target.value)} /></div>
      <Button className="justify-self-start" type="submit">{busy ? "Enregistrement…" : "Enregistrer l’entrée"}</Button>
    </fieldset>
    {error ? <RecordError error={error} /> : null}{success ? <p role="status" className="text-success">Entrée enregistrée, avec son auteur.</p> : null}
  </form>;
}

export function ContactTimeline({ id, archived }: { id: string; archived: boolean }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`contacts/${id}/timeline`, { page, page_size: 25 }), timelineSchema);
  return <div className="grid gap-8">
    <section className="grid gap-4"><h2 className="text-section font-medium">Historique du contact</h2>
      {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique…</p> : <>
        <p role="status">{query.value.total} événement(s), auteurs conservés.</p>
        {query.value.items.length ? <ol className="grid gap-6">{query.value.items.map(item => <li className="grid min-w-0 gap-2 border-b pb-4" key={item.id}>
          <h3 className="font-medium">{activityLabels[item.action] ?? (dealActivityLabels as Record<string, string>)[item.action] ?? "Événement"}</h3>
          <p className="wrap-anywhere">Auteur : {item.actor.display_name}</p><time className="text-sm text-muted-foreground" dateTime={item.occurred_at}>{formatInstant(item.occurred_at)}</time>
          {item.body ? <p className="whitespace-pre-wrap wrap-anywhere">{item.body}</p> : null}{item.reason ? <p className="whitespace-pre-wrap wrap-anywhere">Motif : {item.reason}</p> : null}
          {item.contact_id !== id ? <p className="wrap-anywhere text-sm">Contact d’origine : {item.contact_id}</p> : null}
          {item.related_contact_id ? <p className="wrap-anywhere text-sm">Contact lié à la fusion : {item.related_contact_id}</p> : null}
          {item.enquiry_id ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/leads/${item.enquiry_id}`}>Voir la demande liée</Link> : null}
          {item.deal_id ? <Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/deals/${item.deal_id}`}>Voir l’affaire liée</Link> : null}
        </li>)}</ol> : <p>Aucun événement enregistré.</p>}
        <NumberedPages label="Pages de l’historique" page={page} total={query.value.total} size={query.value.page_size} change={setPage} />
      </>}
    </section>
    {!archived ? <NoteForm id={id} saved={() => { setPage(1); query.refresh(); }} /> : <p>Restaurez ce contact pour ajouter une entrée.</p>}
  </div>;
}

export function ContactAssignments({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`contacts/${id}/assignment-events`, { page, page_size: 25 }), assignmentsSchema);
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
