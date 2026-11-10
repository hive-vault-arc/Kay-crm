"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { TaskForm } from "@/features/work/task-form";
import { TaskPanel } from "@/features/work/task-panel";
import { tasksSchema } from "@/features/work/contracts";
import { localLabel } from "@/features/schedule/time";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";

type Scope = { enquiryId: string; dealId?: never } | { dealId: string; enquiryId?: never };
export function RecordSupportTasks({ contactId, enquiryId, dealId, writable, initialTask, onSaved }: Scope & {
  contactId: string; writable: boolean; initialTask?: string; onSaved: () => void;
}) {
  const query = useQuery(queryPath("tasks", { contact_id: contactId, deal_id: dealId, bucket: "upcoming", page: 1, page_size: 2 }), tasksSchema);
  const [task, setTask] = useState<string>();
  const trigger = useRef<HTMLButtonElement>(null);
  const title = dealId ? "Tâches de l’affaire" : "Tâches du contact";
  return <section className="kay-record-upcoming" aria-label={dealId ? "Tâches à venir de l’affaire" : "Tâches à venir du contact"}>
    <div className="kay-record-support-head">
      <h3>Tâches à venir {query.value ? <span>{query.value.total}</span> : null}</h3>
      <RecordDrawer label="Toutes les tâches" title={title} action="forward" description={dealId ? "Échéances et responsables de cette affaire." : "Tâches partagées entre les dossiers autorisés de ce contact."} initialOpen={Boolean(initialTask)}>
        <TaskPanel contactId={contactId} dealId={dealId} writable={writable} initialTask={initialTask} />
      </RecordDrawer>
    </div>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des tâches…</p> :
      query.value.items.length ? <ul>{query.value.items.map(item => <li key={item.id}>
        <Button type="button" action="task" variant="quiet" className="kay-record-task-preview" onClick={event => { trigger.current = event.currentTarget; setTask(item.id); }}>
          <span className="kay-record-task-copy"><strong>{item.title}</strong><small><time dateTime={item.due_at}>{localLabel(item.due_local)}</time> · {item.owner_name}</small></span>
        </Button>
      </li>)}</ul> : <p>Aucune tâche à venir.</p>}
    {task ? <RecordDrawer hideTrigger initialOpen label={title} description="Consultez la tâche sélectionnée et son dossier." onClosed={() => setTask(undefined)} returnFocus={trigger}>
      <TaskPanel contactId={contactId} dealId={dealId} writable={writable} initialTask={task} />
    </RecordDrawer> : null}
    {writable ? <RecordDrawer label={dealId ? "Ajouter une tâche" : "Planifier une relance"} action="add" description={dealId ? "Créer une tâche reliée à cette affaire." : "Créer une tâche reliée à ce prospect et à son contact."}>
      {(close, saved) => <TaskForm contactId={contactId} enquiryId={enquiryId} dealId={dealId} presentation={dealId ? undefined : "follow-up"} saved={async () => { saved(); query.refreshQuietly(); onSaved(); }} cancel={close} />}
    </RecordDrawer> : null}
  </section>;
}
