"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordActions } from "@/components/shared/record-actions";
import { RecordEntry } from "@/components/shared/record-entry";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { VisitRouteDrawer } from "./visit-route-drawer";
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
  const query = useQuery(`/api/v1/visits/${id}`, visitSchema);
  const [fresh, setFresh] = useState<Visit>(), [editing, setEditing] = useState(false), [historyVisited, setHistoryVisited] = useState(false);
  const [notice, setNotice] = useState(""), [error, setError] = useState<ApiError>();
  const recordHeading = useRef<HTMLDivElement>(null), hydrated = useHydrated(), value = currentRecord(query.value, fresh, id);
  const guard = useUnsavedGuard();
  const focusDetails = () => requestAnimationFrame(() => recordHeading.current?.focus());
  const frame = (body: React.ReactNode, record?: Visit) => <VisitRouteDrawer title={record?.title ?? "Visite"} description="Rendez-vous, participants et historique">{guard.dialog}{body}</VisitRouteDrawer>;
  async function saved() {
    try { setFresh(await apiGet(`/api/v1/visits/${id}`, visitSchema)); setEditing(false); setNotice("Visite enregistrée."); setError(undefined); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); throw failure; }
  }
  if (query.error) return frame(<RecordError error={query.error} retry={query.refresh} />);
  if (!value) return frame(<p role="status">Chargement de la visite…</p>);
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(error.code)) return frame(<RecordError error={error} />);
  const terminal = value.contact_archived || ["completed", "not_completed", "cancelled"].includes(value.status);
  return frame(<div className="kay-visit-record">
    <div ref={recordHeading} tabIndex={-1} className="kay-visit-meta" role="group" aria-label={`Détails de ${value.title}`}><CrmStatusBadge state={value.status}>{statusLabels[value.status]}</CrmStatusBadge><span>{typeLabels[value.type]}</span></div>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}{error ? <RecordError error={error} retry={() => guard.request(() => { void saved().catch(() => {}); })} /> : null}
    {editing && !terminal ? <VisitForm contactId={value.contact_id} contactName={value.contact_name} actorId={actorId} value={value} saved={() => { void saved().catch(() => {}); }} cancel={() => { setEditing(false); focusDetails(); }} /> : <>
      <div className="kay-contact-choice"><span className="text-xs text-muted-foreground">Contact</span><Link className="inline-flex min-h-control items-center text-sm font-medium text-link hover:underline wrap-anywhere" href={`/contacts/${value.contact_id}`}>{value.contact_name}</Link></div>
      <div className="kay-visit-related">{value.enquiry_id ? <Button action="show" asChild variant="ghost"><Link href={`/leads/${value.enquiry_id}`}>Prospect lié</Link></Button> : null}{value.deal_id ? <Button action="show" asChild variant="ghost"><Link href={`/deals/${value.deal_id}`}>Affaire liée</Link></Button> : null}{value.property_id ? <Button action="show" asChild variant="ghost"><Link href={`/projects/properties/${value.property_id}`}>Bien ou unité</Link></Button> : null}</div>
      <dl className="kay-visit-facts"><div><dt>Début</dt><dd>{localLabel(value.start_local)}</dd></div><div><dt>Fin</dt><dd>{localLabel(value.end_local)}</dd></div><div><dt>Lieu</dt><dd className="whitespace-pre-wrap wrap-anywhere">{value.location}</dd></div><div><dt>Participants</dt><dd className="wrap-anywhere">{value.participants.map(user => user.display_name).join(", ")}</dd></div></dl>
      {value.notes || value.overlap_reason ? <details className="kay-form-disclosure"><summary>{value.notes ? "Notes et chevauchement" : "Chevauchement expliqué"}</summary><div className="grid gap-4 pt-3">{value.notes ? <div className="grid gap-1 text-sm"><h3 className="font-semibold">Notes</h3><p className="whitespace-pre-wrap wrap-anywhere">{value.notes}</p></div> : null}{value.overlap_reason ? <div className="grid gap-1 text-sm"><h3 className="font-semibold">Explication du chevauchement</h3><p className="whitespace-pre-wrap wrap-anywhere">{value.overlap_reason}</p></div> : null}</div></details> : null}
      {value.outcome ? <RecordEntry title="Résultat ou motif"><p className="whitespace-pre-wrap wrap-anywhere">{value.outcome}</p></RecordEntry> : null}
      {value.review_code ? <p role="status" className="text-sm text-warning">À revoir selon la politique actuelle : {new ApiError(value.review_code, 409).message}. Cette visite n’a pas été annulée automatiquement.</p> : null}
      {value.contact_archived ? <p role="status" className="text-sm">Contact archivé : visite conservée en lecture seule.</p> : null}
      {terminal ? <p className="text-sm text-muted-foreground">Visite conservée en lecture seule. Une nouvelle visite garde sa propre identité.</p> : <VisitControls value={value} edit={() => { setEditing(true); setNotice(""); }} saved={saved} denied={setError} finished={focusDetails} />}

    </>}
      <details className="kay-form-disclosure kay-drawer-form-section" onToggle={event => { if (event.currentTarget.open) setHistoryVisited(true); }}><summary>Historique de la visite</summary>{historyVisited ? <div className="grid gap-4 pt-3"><p className="text-xs text-muted-foreground">Africa/Casablanca · version {value.version} · politique vérifiée version {value.policy_version}.</p><VisitHistory key={id} id={id} revision={value.version} denied={setError} /></div> : null}</details>
      <Button liveRefresh action="refresh" type="button" variant="ghost" disabled={!hydrated || editing} className="justify-self-start" onClick={() => { setFresh(undefined); query.refresh(); setNotice(""); }}>Actualiser la visite</Button>
  </div>, value);
}

function VisitControls({ value, edit, saved, denied, finished }: { value: Visit; edit: () => void; saved: () => Promise<void>; denied: (error: ApiError) => void; finished: () => void }) {
  const [command, setCommand] = useState<{ action: "confirm" | "complete" | "not-completed" | "cancel"; value: Visit }>();
  const primary = useRef<HTMLButtonElement>(null), hydrated = useHydrated();
  const canFinish = ["scheduled", "confirmed"].includes(value.status);
  const primaryAction = value.status === "confirmed" ? "complete" : "confirm";
  return <div className="kay-form-footer"><RecordActions><Button action="edit" type="button" variant="ghost" disabled={!hydrated} onClick={edit}>Replanifier</Button>{value.status === "scheduled" ? <Button action="complete" type="button" variant="ghost" onClick={() => setCommand({ action: "complete", value })}>Terminer la visite</Button> : null}{canFinish ? <Button action="cancelRecord" type="button" variant="ghost" onClick={() => setCommand({ action: "not-completed", value })}>Marquer non réalisée</Button> : null}<Button action="cancelRecord" type="button" variant="destructive" onClick={() => setCommand({ action: "cancel", value })}>Annuler la visite</Button></RecordActions><Button action="complete" ref={primary} type="button" disabled={!hydrated} onClick={() => setCommand({ action: primaryAction, value })}>{primaryAction === "complete" ? "Terminer la visite" : "Confirmer"}</Button>{command ? <VisitAction key={command.action} dialogOnly value={command.value} action={command.action} saved={saved} denied={denied} finished={finished} returnFocus={primary} closed={() => setCommand(undefined)} /> : null}</div>;
}
export function VisitAction({ value, action, saved, finished, dialogOnly = false, closed, returnFocus, denied }: { value: Visit; action: "confirm" | "complete" | "not-completed" | "cancel"; saved: () => Promise<void> | void; finished?: () => void; dialogOnly?: boolean; closed?: () => void; returnFocus?: RefObject<HTMLButtonElement | null>; denied?: (error: ApiError) => void }) {
  const [invalid, setInvalid] = useState(""), committed = useRef(false), lock = useRef(false); const [open, setOpen] = useState(dialogOnly), [reason, setReason] = useState(""), [error, setError] = useState<ApiError>(), [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(value);
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), attempt = useRef({ body: "", key: "" }), hydrated = useHydrated();
  const label = action === "confirm" ? "Confirmer la visite" : action === "complete" ? "Terminer la visite" : action === "not-completed" ? "Marquer non réalisée" : "Annuler la visite";
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!hydrated || lock.current) return; setError(undefined); setInvalid("");
    if (action !== "confirm" && !reason.trim()) { setInvalid(action === "complete" ? "Indiquez le résultat de la visite." : action === "not-completed" ? "Indiquez pourquoi la visite n’a pas eu lieu." : "Indiquez un motif d’annulation."); return; }
    const body = { expected_version: reviewed.version, reason: reason.trim() }, serialized = JSON.stringify(body);
    if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    lock.current = true; setBusy(true);
    try { await apiCommand(`/api/v1/visits/${reviewed.id}/${action}`, body, resultSchema, attempt.current.key); committed.current = true; await saved(); setOpen(false); closed?.(); }
    catch (failure) { const problem = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE",503); setError(problem); if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(problem.code)) denied?.(problem); }
    finally { lock.current = false; setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!lock.current) { if (next) setReviewed(value); setOpen(next); if (!next) closed?.(); } }} >{!dialogOnly ? <AlertDialogTrigger asChild><Button action={action === "cancel" ? "cancelRecord" : "complete"} variant={action === "cancel" ? "destructive" : "outline"} disabled={!hydrated}>{label}</Button></AlertDialogTrigger> : null}<AlertDialogContent onCloseAutoFocus={event => { if (committed.current && action !== "confirm" && finished) { event.preventDefault(); finished(); } else if (returnFocus) { event.preventDefault(); returnFocus.current?.focus(); } }} onOpenAutoFocus={e => { e.preventDefault(); heading.current?.focus(); }}><AlertDialogTitle ref={heading} tabIndex={-1}>{label}</AlertDialogTitle><AlertDialogDescription>{action === "confirm" ? "Les horaires, la capacité et les participants seront revérifiés. Un chevauchement ordinaire doit être expliqué." : "Le rendez-vous reste dans l’historique et ne consommera plus de capacité. Cette action ne peut pas réécrire son résultat ensuite."}</AlertDialogDescription><p className="wrap-anywhere">{reviewed.title} : {typeLabels[reviewed.type]}, {localLabel(reviewed.start_local)}.</p><form method="post" aria-busy={busy} noValidate className="grid min-w-0 gap-4" onSubmit={e => void submit(e)}><fieldset disabled={!hydrated || busy} className="grid min-w-0 gap-4"><Label htmlFor={id}>{action === "confirm" ? "Explication du chevauchement éventuel" : action === "complete" ? "Résultat de la visite (obligatoire)" : action === "not-completed" ? "Pourquoi la visite n’a pas eu lieu (obligatoire)" : "Motif d’annulation (obligatoire)"}</Label><Textarea id={id} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} aria-invalid={Boolean(invalid)} aria-describedby={invalid ? `${id}-error` : undefined} />{invalid ? <p id={`${id}-error`} role="alert" className="text-danger">{invalid}</p> : null}{error ? <div className="grid gap-2"><RecordError error={error} /><p>La saisie est conservée. Après une interruption, réessayez la même action sans la modifier.</p></div> : null}<div className="flex flex-wrap gap-2"><Button action={action === "cancel" ? "cancelRecord" : "complete"} type="submit" variant={action === "cancel" ? "destructive" : "default"}>{busy ? "Enregistrement…" : label}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline">Conserver la visite</Button></AlertDialogCancel></div></fieldset></form></AlertDialogContent></AlertDialog>;
}
function VisitHistory({ id, revision, denied }: { id: string; revision?: number; denied: (error: ApiError) => void }) {
  const query = useQuery(`/api/v1/visits/${id}/history`, historySchema, revision);
  const [page, setPage] = useState(1);
  useEffect(() => { if (query.error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement de l’historique…</p>;
  const entries = query.value.items.slice((page - 1) * 20, page * 20);
  return <><ol className="grid gap-3">{entries.map(event => <li key={event.id}><RecordEntry title={actionLabels[event.action]} status={<CrmStatusBadge state={event.snapshot.status}>{statusLabels[event.snapshot.status]}</CrmStatusBadge>} meta={[{ label: "Auteur", value: event.actor.display_name }, { label: "Date", value: localLabel(event.occurred_at) }]}><p className="text-xs text-muted-foreground">Version {event.version} · Instants enregistrés : {localLabel(event.snapshot.start_at)} à {localLabel(event.snapshot.end_at)}.</p>{event.snapshot.notes ? <details><summary className="min-h-control cursor-pointer py-3 text-xs text-muted-foreground">Notes enregistrées</summary><p className="whitespace-pre-wrap wrap-anywhere">{event.snapshot.notes}</p></details> : null}{event.reason ? <p className="whitespace-pre-wrap wrap-anywhere">{event.reason}</p> : null}</RecordEntry></li>)}</ol>{!entries.length ? <p className="text-sm text-muted-foreground">Aucun événement sur cette page.</p> : null}<NumberedPages compact page={page} size={20} total={query.value.items.length} change={setPage} label="Pages de l’historique de la visite" /><p className="text-xs text-muted-foreground">Les 100 derniers événements sont disponibles. L’origine et les auteurs sont conservés après transfert ou fusion du contact.</p></>;
}
