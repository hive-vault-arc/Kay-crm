"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { localLabel } from "@/features/schedule/time";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { resultSchema, taskActionLabels, taskHistorySchema, taskSchema, taskStatusLabels, type Task } from "./contracts";
import { TaskForm } from "./task-form";

export function TaskRecord({ id, contactId, dealId, writable, changed, close }: { id: string; contactId: string; dealId?: string; writable: boolean; changed: () => void; close: () => void }) {
  const query = useQuery(`/api/v1/tasks/${id}`, taskSchema), hydrated = useHydrated();
  const [fresh, setFresh] = useState<Task>(), [editing, setEditing] = useState(false), [notice, setNotice] = useState("");
  const [reloadError, setReloadError] = useState<ApiError>();
  const task = (fresh && (!query.value || fresh.version >= query.value.version) ? fresh : query.value), focusEdit = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const initialFocus = useRef(true);
  useEffect(() => { if (task && initialFocus.current) { initialFocus.current = false; heading.current?.focus(); } }, [task]);
  const restore = useCallback((node: HTMLButtonElement | null) => { if (node && focusEdit.current) { focusEdit.current = false; node.focus(); } }, []);
  async function reload() {
    try { const row = await apiGet(`/api/v1/tasks/${id}`, taskSchema); setFresh(row); changed(); setReloadError(undefined); return row; }
    catch (failure) { const error = failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReloadError(error); throw error; }
  }
  async function endEdit(saved = false) { await reload(); focusEdit.current = true; setEditing(false); if (saved) setNotice("Tâche enregistrée."); }
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!task) return <p role="status">Chargement de la tâche…</p>;
  if (task.contact_id !== contactId || (dealId && task.deal_id !== dealId)) return <RecordError error={new ApiError("NOT_FOUND", 404)} />;
  if (reloadError && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(reloadError.code)) return <RecordError error={reloadError} />;
  const canWrite = writable && !task.contact_archived && task.status === "open";
  return <section aria-label="Tâche sélectionnée" className="grid min-w-0 gap-6 border-t pt-6">
    <h3 ref={heading} tabIndex={-1} className="wrap-anywhere text-section font-medium">{task.title}</h3>
    {reloadError ? <RecordError error={reloadError} /> : null}
    {editing && canWrite ? <TaskForm key={task.id} contactId={task.contact_id} value={task} saved={async () => { await endEdit(true); }} cancel={() => { void endEdit().catch(() => { focusEdit.current = true; setEditing(false); }); }} /> : <>
      <TaskFacts task={task} />{notice ? <p role="status" className="text-success">{notice}</p> : null}
      <Button liveRefresh action="refresh" type="button" variant="outline" className="justify-self-start" onClick={() => { void reload().catch(() => {}); }}>Actualiser la tâche</Button>
      <div className="flex flex-wrap gap-2">{canWrite ? <><Button action="edit" ref={restore} type="button" disabled={!hydrated} onClick={() => { setEditing(true); setNotice(""); }}>Modifier la tâche</Button>{(["completed", "cancelled"] as const).map(action => <TaskFinish key={`${task.version}:${action}`} task={task} action={action} saved={async () => { await reload(); setNotice(action === "completed" ? "Tâche terminée. Les rappels obsolètes sont invalidés." : "Tâche annulée. Les rappels obsolètes sont invalidés."); }} terminalFocus={() => heading.current?.focus()} />)}</> : <p>Tâche conservée en lecture seule. Son historique reste disponible.</p>}<Button action="close" type="button" variant="outline" onClick={close}>Fermer la tâche</Button></div>
      <TaskHistory key={task.version} id={id} />
    </>}
  </section>;
}

export function TaskFacts({ task }: { task: Task }) {
  return <dl className="grid min-w-0 gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">État</dt><dd>{taskStatusLabels[task.status]}</dd></div><div><dt className="text-sm text-muted-foreground">Échéance</dt><dd>{localLabel(task.due_local)}</dd></div><div><dt className="text-sm text-muted-foreground">Responsable</dt><dd className="wrap-anywhere">{task.owner_name}{!task.owner_eligible ? " (accès retiré)" : ""}</dd></div><div><dt className="text-sm text-muted-foreground">Consignes</dt><dd className="whitespace-pre-wrap wrap-anywhere">{task.notes || "Non renseignées"}</dd></div>{task.outcome ? <div><dt className="text-sm text-muted-foreground">Compte rendu</dt><dd className="whitespace-pre-wrap wrap-anywhere">{task.outcome}</dd></div> : null}</dl>;
}

function TaskFinish({ task, action, saved, terminalFocus }: { task: Task; action: "completed" | "cancelled"; saved: () => Promise<void>; terminalFocus: () => void }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>();
  const attempt = useRef({ fingerprint: "", key: "" }), lock = useRef(false), titleRef = useRef<HTMLHeadingElement>(null), terminal = useRef(false), id = useId();
  const label = action === "completed" ? "Terminer la tâche" : "Annuler la tâche";
  async function confirm() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(undefined);
    const body = { expected_version: task.version, reason }, fingerprint = JSON.stringify(body);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(`/api/v1/tasks/${task.id}/${action === "completed" ? "complete" : "cancel"}`, body, resultSchema, attempt.current.key); terminal.current = true; await saved(); setOpen(false); }
    catch (failure) { terminal.current = false; setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); lock.current = false; }
  }
  return <AlertDialog open={open} onOpenChange={next => { if (!busy) setOpen(next); }}><AlertDialogTrigger asChild><Button action={action === "cancelled" ? "cancelRecord" : "complete"} type="button" variant={action === "cancelled" ? "destructive" : "outline"}>{label}</Button></AlertDialogTrigger><AlertDialogContent onOpenAutoFocus={e => { e.preventDefault(); titleRef.current?.focus(); }} onCloseAutoFocus={e => { if (terminal.current) { e.preventDefault(); terminalFocus(); } }}><AlertDialogTitle ref={titleRef} tabIndex={-1}>{label}</AlertDialogTitle><AlertDialogDescription>Cette action conserve la tâche et son auteur, puis invalide ses rappels non actuels. Aucun message externe n’est envoyé.</AlertDialogDescription><p className="wrap-anywhere font-medium">{task.title}</p><div className="grid gap-2"><Label htmlFor={id}>Compte rendu (facultatif)</Label><Textarea id={id} value={reason} maxLength={1000} disabled={busy} onChange={e => setReason(e.target.value)} /></div>{error ? <div className="grid gap-2"><RecordError error={error} /><p>La saisie est conservée. Réessayez la même action. En cas de conflit, fermez puis rechargez la tâche.</p></div> : null}<div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={busy}>Revenir à la tâche</Button></AlertDialogCancel><Button action={action === "cancelled" ? "cancelRecord" : "complete"} type="button" variant={action === "cancelled" ? "destructive" : "default"} disabled={busy} onClick={() => void confirm()}>{busy ? "Enregistrement…" : label}</Button></div></AlertDialogContent></AlertDialog>;
}

function TaskHistory({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/tasks/${id}/history?page=${page}`, taskHistorySchema);
  return <section className="record-stack grid gap-4" aria-label="Historique de la tâche">
    <h4 className="font-medium">Historique de la tâche</h4>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique…</p> : <>
      <ol className="grid gap-4">{query.value.items.map(e => <li key={e.id} className="grid gap-2 border-t pt-4"><p>{taskActionLabels[e.action]} : {e.actor.display_name}</p><p className="text-sm text-muted-foreground">{localLabel(e.occurred_local)} : version {e.version}</p></li>)}</ol>
      <NumberedPages page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages de l’historique de la tâche" />
    </>}
  </section>;
}
