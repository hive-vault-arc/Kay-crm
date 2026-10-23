"use client";
import { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { currentRecord } from "@/features/realtime/current-record";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import type { Offering } from "@/features/inventory/contracts";
import { detailSchema, requirementsSchema, resultSchema, type Requirement } from "./contracts";
import { RequirementFacts } from "./requirement-facts";
import { RequirementForm } from "./requirement-form";
import { OfferingSearch } from "./offering-search";
import { OfferingFacts } from "./offering-card";

export function RequirementPanel({ contactId, writable, compact = false }: { contactId: string; writable: boolean; compact?: boolean }) {
  const [page, setPage] = useState(1); const [selected, setSelected] = useState<string>(); const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null); const hydrated = useHydrated();
  const list = useQuery(queryPath("requirements", { contact_id: contactId, page, page_size: 10 }), requirementsSchema);
  function close() { setSelected(undefined); requestAnimationFrame(() => heading.current?.focus()); }
  if (list.error) return <section className="grid min-w-0 gap-4" aria-label="Recherches du contact"><h2 className="text-section font-medium">Recherches du contact</h2><RecordError error={list.error} retry={list.refresh} /></section>;
  return <section className={compact ? "surface grid min-w-0 gap-3" : "surface grid min-w-0 gap-6"} aria-label="Recherches du contact"><h2 tabIndex={-1} ref={heading} className={compact ? "text-base font-medium" : "text-section font-medium"}>Recherches du contact</h2><p className={compact ? "text-sm text-muted-foreground" : undefined}>Chaque recherche est indépendante. Les choix et avis restent liés à cette recherche, pas à toutes les demandes du contact.</p>{!writable ? <p className="text-muted-foreground">Contact archivé : recherches conservées en lecture seule. Restaurez le contact pour les modifier.</p> : null}{notice ? <p role="status" className="text-success">{notice}</p> : null}
    {list.error ? <RecordError error={list.error} retry={list.refresh} /> : !list.value ? <p role="status">Chargement des recherches…</p> : <>{!compact || list.value.total > 0 ? <p className="text-sm text-muted-foreground">{list.value.total} recherche(s) accessible(s).</p> : null}{list.value.items.length ? <ul className="grid min-w-0 gap-2">{list.value.items.map(row => <li key={row.id}><Button action={selected === row.id ? "select" : "search"} variant="outline" className="h-auto min-h-control max-w-full items-start justify-start whitespace-normal text-left aria-pressed:border-ring aria-pressed:bg-accent aria-pressed:text-accent-foreground" disabled={!hydrated || selected === "new"} aria-pressed={selected === row.id} onClick={() => { setSelected(row.id); setNotice(""); }}><span className="min-w-0 wrap-anywhere">{row.title} ({row.intent === "sale" ? "achat" : "location"}, {row.shortlist_count} offre(s))</span></Button></li>)}</ul> : <p>Aucune recherche enregistrée. Ajoutez un besoin d’achat ou de location pour commencer.</p>}{!compact || list.value.total > 10 ? <NumberedPages label="Pages des recherches" page={page} total={list.value.total} size={10} change={next => { setPage(next); close(); }} /> : null}</>}
    {writable && !selected ? <Button action="create" className="justify-self-start" disabled={!hydrated || Boolean(list.error) || !list.value} onClick={() => { setSelected("new"); setNotice(""); }}>Nouvelle recherche</Button> : null}
    {selected === "new" && writable ? <RequirementForm contactId={contactId} cancel={close} saved={async id => { await apiGet(`/api/v1/requirements/${id}`, detailSchema); setSelected(id); setNotice("Recherche enregistrée."); list.refreshQuietly(); }} /> : selected ? <RequirementDetail key={selected} id={selected} contactId={contactId} writable={writable} close={close} changed={list.refreshQuietly} /> : null}
  </section>;
}

function RequirementDetail({ id, contactId, writable, close, changed }: { id: string; contactId: string; writable: boolean; close: () => void; changed: () => void }) {
  const query = useQuery(`/api/v1/requirements/${id}`, detailSchema);
  const [fresh, setFresh] = useState<Requirement>(); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<ApiError>(); const [notice, setNotice] = useState("");
  const attempt = useRef({ key: "", fingerprint: "" }); const value = currentRecord(query.value, fresh, id);
  const focusEdit = useRef(false);
  const restoreEditFocus = useCallback((node: HTMLButtonElement | null) => {
    if (node && focusEdit.current) { focusEdit.current = false; node.focus(); }
  }, []);
  const shortlistHeading = useRef<HTMLHeadingElement>(null);
  function endEdit() { focusEdit.current = true; setEditing(false); }
  async function reload() { const current = await apiGet(`/api/v1/requirements/${id}`, detailSchema); setFresh(current); return current; }
  async function mutate(offering: Offering, feedback?: string | null, remove = false) {
    if (!value || busy) return;
    const body = remove ? { expected_version: value.version } : { expected_version: value.version, offering_id: offering.id, expected_offering_version: offering.version, feedback: feedback ?? null };
    const path = `/api/v1/requirements/${id}/shortlist${remove ? `/${offering.id}` : ""}` as const;
    const fingerprint = JSON.stringify({ path, body });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { key: crypto.randomUUID(), fingerprint };
    setBusy(true); setError(undefined); setNotice("");
    try { await apiCommand(path, body, resultSchema, attempt.current.key, remove ? "DELETE" : "POST"); await reload(); changed(); setNotice(remove ? "Offre retirée de cette sélection." : "Sélection et avis enregistrés."); if (remove) requestAnimationFrame(() => shortlistHeading.current?.focus()); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(error.code)) return <RecordError error={error} />;
  if (!value) return <p role="status">Chargement de la recherche…</p>;
  return <section className="grid min-w-0 gap-6 border-t pt-6" aria-label="Recherche sélectionnée">{editing && writable ? <RequirementForm key={`${value.id}:${value.version}`} contactId={contactId} value={value} cancel={endEdit} saved={async () => { await reload(); endEdit(); changed(); setNotice("Recherche enregistrée."); }} /> : <><RequirementFacts value={value} /><div className="flex flex-wrap gap-2">{writable ? <Button action="edit" ref={restoreEditFocus} type="button" disabled={busy} onClick={() => { setEditing(true); setNotice(""); }}>Modifier la recherche</Button> : null}<Button action="close" type="button" variant="outline" disabled={busy} onClick={close}>Fermer la recherche</Button></div>{notice ? <p role="status" className="text-success">{notice}</p> : null}{error ? <div className="grid gap-4"><RecordError error={error} /><p>La saisie reste affichée. Une réponse interrompue peut avoir été enregistrée : réessayez la même action sans la modifier. En cas de conflit, comparez les offres puis actualisez les versions avant une nouvelle tentative.</p><Button action="refresh" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" disabled={busy} onClick={() => { void reload().then(() => setError(undefined)).catch(reason => setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503))); }}>Actualiser les versions</Button></div> : null}
      <section className="grid min-w-0 gap-6" aria-label="Sélection de la recherche"><h3 ref={shortlistHeading} tabIndex={-1} className="text-section font-medium">Offres sélectionnées</h3>{value.shortlist.length ? <ul className="grid min-w-0 gap-6">{value.shortlist.map(entry => <li key={entry.offering.id} className="grid min-w-0 gap-4 border-t pt-4"><OfferingFacts offering={entry.offering} /><Feedback offering={entry.offering} initial={entry.feedback} writable={writable} busy={busy} save={feedback => void mutate(entry.offering, feedback)} remove={() => void mutate(entry.offering, undefined, true)} /></li>)}</ul> : <p>Aucune offre sélectionnée pour cette recherche.</p>}</section>
      {writable ? <div className="grid gap-2"><Link className="inline-flex min-h-control items-center justify-self-start text-link underline" href={`/deals/new?contact_id=${contactId}&requirement_id=${id}`}>Créer une affaire pour cette recherche</Link>{value.shortlist.map(entry => <Link key={entry.offering.id} className="inline-flex min-h-control items-center justify-self-start wrap-anywhere text-link underline" href={`/deals/new?contact_id=${contactId}&requirement_id=${id}&offering_id=${entry.offering.id}`}>Créer une affaire avec {entry.offering.target?.reference ?? "cette offre"}</Link>)}</div> : null}
      {writable ? <OfferingSearch requirement={value} pending={busy} select={offering => void mutate(offering)} /> : null}
    </>}</section>;
}

function Feedback({ offering, initial, writable, busy, save, remove }: { offering: Offering; initial: string | null; writable: boolean; busy: boolean; save: (value: string | null) => void; remove: () => void }) {
  const [feedback, setFeedback] = useState(initial ?? ""); const id = useId();
  return writable ? <form className="grid min-w-0 max-w-reading gap-4" onSubmit={event => { event.preventDefault(); save(feedback || null); }} aria-label={`Avis pour ${offering.target?.reference ?? "l’offre"}`}><div className="grid gap-2"><Label htmlFor={id}>Avis sur cette offre</Label><Input id={id} maxLength={2000} value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)} /></div><div className="flex flex-wrap gap-2"><Button action="save" type="submit" variant="outline" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l’avis"}</Button><Button action="remove" type="button" variant="destructive" disabled={busy} onClick={remove}>Retirer de la sélection</Button></div></form> : <p className="whitespace-pre-wrap wrap-anywhere">Avis : {initial || "non renseigné"}</p>;
}
