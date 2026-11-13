"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { TaskListCard } from "./task-presentation";
import { tasksSchema } from "./contracts";
import { TaskForm } from "./task-form";
import { TaskRecord } from "./task-record";

export function TaskPanel({ contactId, dealId, writable, initialTask, title = "Tâches du dossier" }: { contactId: string; dealId?: string; writable: boolean; initialTask?: string; title?: string }) {
  const [page, setPage] = useState(1), [selected, setSelected] = useState(initialTask), [creating, setCreating] = useState(false), [notice, setNotice] = useState("");
  const hydrated = useHydrated(), focusCreate = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  const restoreCreate = useCallback((node: HTMLButtonElement | null) => { if (node && focusCreate.current) { focusCreate.current = false; node.focus(); } }, []);
  const query = useQuery(queryPath("tasks", { contact_id: contactId, deal_id: dealId, page, page_size: 20 }), tasksSchema);
  useEffect(() => { if (initialTask) heading.current?.focus(); }, [initialTask]);
  function close() { setSelected(undefined); setCreating(false); focusCreate.current = true; query.refreshQuietly(); heading.current?.focus(); }
  return <section className="kay-work-panel grid min-w-0 gap-5" aria-label={title}>
    <h2 ref={heading} tabIndex={-1} className="text-section">{title}</h2>
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {creating ? <TaskForm contactId={contactId} dealId={dealId} saved={async id => { setSelected(id); setCreating(false); setNotice("Tâche enregistrée."); query.refreshQuietly(); }} cancel={close} /> : <div className="flex flex-wrap gap-2">{writable ? <Button action="create" ref={restoreCreate} type="button" disabled={!hydrated || Boolean(selected)} onClick={() => { setCreating(true); setSelected(undefined); setNotice(""); }}>Créer une tâche</Button> : <p>Tâches en lecture seule pour ce dossier.</p>}<Button liveRefresh action="refresh" type="button" variant="outline" disabled={!hydrated || Boolean(selected)} onClick={query.refresh}>Actualiser les tâches</Button></div>}
    {!creating ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des tâches…</p> : <>{query.value.items.length ? <ul className="kay-work-list">{query.value.items.map(task => <li key={task.id}><TaskListCard task={task} clock={query.value!} selected={selected === task.id} disabled={Boolean(selected) && selected !== task.id} open={() => setSelected(task.id)} /></li>)}</ul> : <p>Aucune tâche enregistrée pour ce dossier.</p>}{query.value.has_previous || query.value.has_next ? <NumberedPages compact page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des tâches du dossier" /> : null}</>}{selected ? <TaskRecord key={selected} id={selected} contactId={contactId} dealId={dealId} writable={writable} changed={query.refreshQuietly} close={close} /> : null}</> : null}
  </section>;
}
