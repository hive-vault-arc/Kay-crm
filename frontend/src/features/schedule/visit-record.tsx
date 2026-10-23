"use client";
import Link from "next/link";
import { useCallback, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { currentRecord } from "@/features/realtime/current-record";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { actionLabels, historySchema, resultSchema, statusLabels, typeLabels, visitSchema, type Visit } from "./contracts";
import { VisitForm } from "./visit-form";
import { localLabel } from "./time";

export function VisitRecord({ id, actorId }: { id: string; actorId: string }) {
  const query = useQuery(`/api/v1/visits/${id}`, visitSchema), [fresh, setFresh] = useState<Visit>(), [editing, setEditing] = useState(false), [notice, setNotice] = useState(""), [error, setError] = useState<ApiError>();
  const recordHeading = useRef<HTMLHeadingElement>(null), focusEdit = useRef(false), hydrated = useHydrated(), value = currentRecord(query.value, fresh, id);
  const restoreFocus = useCallback((node: HTMLButtonElement | null) => { if (node && focusEdit.current) { focusEdit.current = false; node.focus(); } }, []);
  async function saved() {
    try { setFresh(await apiGet(`/api/v1/visits/${id}`, visitSchema)); focusEdit.current = true; setEditing(false); setNotice("Visite enregistrée. Son historique et son auteur sont conservés."); setError(undefined); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503)); }
  }
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!value) return <p role="status">Chargement de la visite…</p>;
  if (error && ["NOT_FOUND","FORBIDDEN","UNAUTHENTICATED"].includes(error.code)) return <RecordError error={error} />;
  const terminal = value.contact_archived || value.status === "completed" || value.status === "cancelled";
  return <div className="record-stack grid min-w-0 max-w-reading gap-5"><section className="grid min-w-0 gap-4"><h2 ref={recordHeading} tabIndex={-1} className="text-section font-medium wrap-anywhere">{value.title}</h2><Link className="inline-flex min-h-control items-center text-link underline wrap-anywhere" href={`/contacts/${value.contact_id}`}>{value.contact_name}</Link><p>{typeLabels[value.type]} : <strong>{statusLabels[value.status]}</strong></p><p>Du {localLabel(value.start_local)} au {localLabel(value.end_local)}.</p><p>Fuseau : Africa/Casablanca. Version {value.version}, politique vérifiée version {value.policy_version}.</p><p className="whitespace-pre-wrap wrap-anywhere">Lieu : {value.location}</p><p className="wrap-anywhere">Participants : {value.participants.map(u => u.display_name).join(", ")}</p>{value.overlap_reason ? <p className="whitespace-pre-wrap wrap-anywhere">Chevauchement expliqué : {value.overlap_reason}</p> : null}{value.outcome ? <p className="whitespace-pre-wrap wrap-anywhere">Résultat ou motif : {value.outcome}</p> : null}{value.review_code ? <p role="status" className="text-warning">À revoir selon la politique actuelle : {new ApiError(value.review_code,409).message}. Cette visite n’a pas été annulée automatiquement.</p> : null}</section>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}{error ? <RecordError error={error} retry={() => void saved()} /> : null}
    {value.contact_archived ? <p role="status">Contact archivé : visite conservée en lecture seule.</p> : null}{terminal ? <p>Visite conservée en lecture seule. Une nouvelle visite garde sa propre identité.</p> : editing ? <VisitForm key={value.version} contactId={value.contact_id} contactName={value.contact_name} actorId={actorId} value={value} saved={() => void saved()} cancel={() => { focusEdit.current = true; setEditing(false); }} /> : <><Button action="edit" ref={restoreFocus} disabled={!hydrated} className="justify-self-start" onClick={() => { setEditing(true); setNotice(""); }}>Modifier ou replanifier la visite</Button><div className="flex flex-wrap gap-4">{value.status !== "confirmed" ? <VisitAction value={value} action="confirm" saved={saved} finished={() => requestAnimationFrame(() => recordHeading.current?.focus())} /> : null}{value.status !== "draft" ? <VisitAction value={value} action="complete" saved={saved} finished={() => requestAnimationFrame(() => recordHeading.current?.focus())} /> : null}<VisitAction value={value} action="cancel" saved={saved} finished={() => requestAnimationFrame(() => recordHeading.current?.focus())} /></div></>}
    <Button liveRefresh action="refresh" variant="outline" disabled={editing} className="justify-self-start" onClick={() => { setFresh(undefined); query.refresh(); setNotice(""); setEditing(false); }}>Actualiser la visite</Button><VisitHistory key={id} id={id} revision={value.version} /><Button action="back" asChild variant="outline" className="justify-self-start"><Link href="/visits">Retour au calendrier</Link></Button></div>;
}
function VisitAction({ value, action, saved, finished }: { value: Visit; action: "confirm" | "complete" | "cancel"; saved: () => Promise<void>; finished: () => void }) {
  const [invalid, setInvalid] = useState(""), committed = useRef(false); const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [error, setError] = useState<ApiError>(), [busy, setBusy] = useState(false);
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), attempt = useRef({ body: "", key: "" }), hydrated = useHydrated();
  const label = action === "confirm" ? "Confirmer la visite" : action === "complete" ? "Terminer la visite" : "Annuler la visite";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(undefined); setInvalid("");
    if (action !== "confirm" && !reason.trim()) { setInvalid(action === "complete" ? "Indiquez le résultat de la visite." : "Indiquez un motif d’annulation."); return; }
    const body = { expected_version: value.version, reason: reason.trim() }, serialized = JSON.stringify(body);
    if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    setBusy(true);
    try { await apiCommand(`/api/v1/visits/${value.id}/${action}`, body, resultSchema, attempt.current.key); committed.current = true; await saved(); setOpen(false); }
    catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE",503)); }
    finally { setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}><AlertDialogTrigger asChild><Button action={action === "cancel" ? "cancelRecord" : "complete"} variant={action === "cancel" ? "destructive" : "outline"} disabled={!hydrated}>{label}</Button></AlertDialogTrigger><AlertDialogContent onCloseAutoFocus={event => { if (committed.current && action !== "confirm") { event.preventDefault(); finished(); } }} onOpenAutoFocus={e => { e.preventDefault(); heading.current?.focus(); }}><AlertDialogTitle ref={heading} tabIndex={-1}>{label}</AlertDialogTitle><AlertDialogDescription>{action === "confirm" ? "Les horaires, la capacité et les participants seront revérifiés. Un chevauchement ordinaire doit être expliqué." : "Le rendez-vous reste dans l’historique et ne consommera plus de capacité. Cette action ne peut pas réécrire son résultat ensuite."}</AlertDialogDescription><p className="wrap-anywhere">{value.title} : {typeLabels[value.type]}, {localLabel(value.start_local)}.</p><form noValidate className="grid min-w-0 gap-4" onSubmit={e => void submit(e)}><fieldset disabled={busy} className="grid min-w-0 gap-4"><Label htmlFor={id}>{action === "confirm" ? "Explication du chevauchement éventuel" : action === "complete" ? "Résultat de la visite (obligatoire)" : "Motif d’annulation (obligatoire)"}</Label><Textarea id={id} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? `${id}-error` : undefined} />{invalid ? <p id={`${id}-error`} role="alert" className="text-danger">{invalid}</p> : null}{error ? <div className="grid gap-2"><RecordError error={error} /><p>La saisie est conservée. Après une interruption, réessayez la même action sans la modifier.</p></div> : null}<div className="flex flex-wrap gap-2"><Button action={action === "cancel" ? "cancelRecord" : "complete"} type="submit" variant={action === "cancel" ? "destructive" : "default"}>{busy ? "Enregistrement…" : label}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Conserver la visite</Button></AlertDialogCancel></div></fieldset></form></AlertDialogContent></AlertDialog>;
}
function VisitHistory({ id, revision }: { id: string; revision?: number }) {
  const query = useQuery(`/api/v1/visits/${id}/history`, historySchema, revision);
  return <section className="grid min-w-0 gap-4 border-t pt-6"><h2 className="text-section font-medium">Historique de la visite</h2>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique…</p> : <><ol className="grid gap-4">{query.value.items.map(e => <li key={e.id} className="grid gap-2 border-b pb-4"><p className="font-medium wrap-anywhere">{actionLabels[e.action]} par {e.actor.display_name}</p><p>Version {e.version} : {statusLabels[e.snapshot.status]}. {localLabel(e.occurred_at)}.</p><p className="text-sm">Instants enregistrés : {localLabel(e.snapshot.start_at)} à {localLabel(e.snapshot.end_at)}.</p>{e.reason ? <p className="whitespace-pre-wrap wrap-anywhere">{e.reason}</p> : null}</li>)}</ol><p className="text-sm text-muted-foreground">Les 100 derniers événements sont affichés. L’origine et les auteurs sont conservés même après transfert ou fusion du contact.</p></>}</section>;
}
