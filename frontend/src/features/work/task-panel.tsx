"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { localLabel } from "@/features/schedule/time";
import { tasksSchema, taskStatusLabels } from "./contracts";
import { TaskForm } from "./task-form";
import { TaskRecord } from "./task-record";

export function TaskPanel({ contactId, dealId, writable, initialTask }: { contactId: string; dealId?: string; writable: boolean; initialTask?: string }) {
  const [page, setPage] = useState(1), [selected, setSelected] = useState(initialTask), [creating, setCreating] = useState(false), [notice, setNotice] = useState("");
  const hydrated = useHydrated(), focusCreate = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const restoreCreate = useCallback((node: HTMLButtonElement | null) => { if (node && focusCreate.current) { focusCreate.current = false; node.focus(); } }, []);
  const query = useQuery(queryPath("tasks", { contact_id: contactId, deal_id: dealId, page }), tasksSchema);
  useEffect(() => { if (initialTask) heading.current?.focus(); }, [initialTask]);
  function close() { setSelected(undefined); setCreating(false); focusCreate.current = true; query.refreshQuietly(); heading.current?.focus(); }
  return <section className="surface grid min-w-0 gap-6" aria-label="Tâches du dossier">
    <h2 ref={heading} tabIndex={-1} className="text-section font-medium">Tâches du dossier</h2>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {creating ? <TaskForm contactId={contactId} dealId={dealId} saved={async id => { setSelected(id); setCreating(false); setNotice("Tâche enregistrée."); query.refreshQuietly(); }} cancel={close} /> : <div className="flex flex-wrap gap-2">{writable ? <Button action="create" ref={restoreCreate} type="button" disabled={!hydrated || Boolean(selected)} onClick={() => { setCreating(true); setSelected(undefined); setNotice(""); }}>Créer une tâche</Button> : <p>Contact archivé : les tâches restent consultables en lecture seule.</p>}<Button action="refresh" type="button" variant="outline" disabled={!hydrated || Boolean(selected)} onClick={query.refresh}>Actualiser les tâches</Button></div>}
    {!creating ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des tâches…</p> : <>{query.value.items.length ? <ul className="grid min-w-0 gap-4">{query.value.items.map(task => <li key={task.id} className="grid min-w-0 gap-2 border-t pt-4"><Button action="task" type="button" variant="outline" aria-pressed={selected === task.id} disabled={Boolean(selected) && selected !== task.id} className="h-auto min-h-control justify-self-start whitespace-normal text-start wrap-anywhere" onClick={() => setSelected(task.id)}>{task.title}</Button><p className="wrap-anywhere">{taskStatusLabels[task.status]} : {localLabel(task.due_local)}</p><p className="wrap-anywhere text-sm text-muted-foreground">Responsable : {task.owner_name}</p></li>)}</ul> : <p>Aucune tâche enregistrée pour ce dossier.</p>}<NumberedPages page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des tâches du dossier" /></>}{selected ? <TaskRecord key={selected} id={selected} contactId={contactId} dealId={dealId} writable={writable} changed={query.refreshQuietly} close={close} /> : null}</> : null}
  </section>;
}
