"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CrmDirectoryHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { DataTable } from "@/components/shared/data-table";
import { DirectoryEmpty, DirectoryLoading } from "@/components/shared/directory-presentation";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { ScrollableResultsTable } from "@/components/shared/scrollable-results-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ContactSelector } from "@/features/contacts/contact-selector";
import type { ContactSummary } from "@/features/contacts/contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { localLabel } from "@/features/schedule/time";
import { bucketLabels, tasksSchema, type Bucket, type Task } from "./contracts";
import { TaskForm } from "./task-form";
import { TaskStatus } from "./task-presentation";
import { TaskRecord } from "./task-record";
import { taskContext, taskDueState } from "./task-time";

type Panel = { kind: "new" } | { kind: "record"; task: Task };
const PAGE_SIZE = 50;

export function TasksDirectory({ actorId }: { actorId: string }) {
  const [bucket, setBucket] = useState<Bucket>("open");
  const [mine, setMine] = useState(true);
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<Panel>();
  const [notice, setNotice] = useState("");
  const createButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement>(null);
  const { value, error, refresh, refreshQuietly } = useQuery(
    queryPath("tasks", { bucket, owner_user_id: mine ? actorId : undefined, page, page_size: PAGE_SIZE }),
    tasksSchema,
  );

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    { id: "task", header: "Tâche", cell: ({ row: { original: task } }) =>
      <Button action="task" variant="quiet" type="button" className="h-auto min-h-control max-w-full justify-start whitespace-normal text-left wrap-anywhere"
        onClick={event => { opener.current = event.currentTarget; setPanel({ kind: "record", task }); }}>
        {task.title}
      </Button> },
    { id: "kind", header: "Type", cell: ({ row: { original: task } }) =>
      <div className="flex flex-wrap items-center gap-2">
        <span>{task.kind === "reminder" ? "Rappel" : "Tâche"}</span>
        {task.important ? <CrmStatusBadge state="in_progress" dot={false}>Important</CrmStatusBadge> : null}
      </div> },
    { id: "due", header: "Échéance", cell: ({ row: { original: task } }) => {
      const due = value ? taskDueState(task, value) : "";
      return <span className="kay-task-due" data-overdue={due === "overdue"}>
        <time dateTime={task.due_at}>{localLabel(task.due_local)}</time>
        {due ? <small>{due === "overdue" ? "En retard" : "Aujourd’hui"}</small> : null}
      </span>;
    } },
    { id: "context", header: "Dossier", cell: ({ row: { original: task } }) => {
      const context = taskContext(task);
      return <Link className="inline-flex min-h-control items-center wrap-anywhere hover:underline" href={context.href}>
        {context.label} · {task.contact_name}
      </Link>;
    } },
    { id: "owner", header: "Responsable", cell: ({ row }) => row.original.owner_name },
    { id: "status", header: "État", cell: ({ row }) => <TaskStatus status={row.original.status} /> },
  ], [value]);

  function create(trigger: HTMLElement) {
    opener.current = trigger;
    setNotice("");
    setPanel({ kind: "new" });
  }

  return <div className="crm-directory kay-sales-directory" data-sales-view="list">
    <CrmDirectoryHeader title="Tâches" count={error ? undefined : value?.total} unavailable={Boolean(error)}
      noun="échéances" description="Consultez vos tâches et rappels ou créez une échéance liée à un dossier."
      route="/tasks" actions={<Button ref={createButton} action="create" variant="creation"
        onClick={event => create(event.currentTarget)}>Nouvelle tâche</Button>} />
    <div className="kay-sales-list">
      <div className="kay-work-controls" data-filter-panel role="group" aria-label="Filtres des tâches">
        <div className="grid gap-2">
          <Label htmlFor="tasks-assignment">Attribution</Label>
          <NativeSelect id="tasks-assignment" value={mine ? "mine" : "accessible"} onChange={event => {
            setMine(event.target.value === "mine");
            setPage(1);
          }}>
            <option value="mine">Mes tâches</option>
            <option value="accessible">Toutes les tâches accessibles</option>
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tasks-bucket">État ou période</Label>
          <NativeSelect id="tasks-bucket" value={bucket} onChange={event => {
            setBucket(event.target.value as Bucket);
            setPage(1);
          }}>
            {Object.entries(bucketLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </NativeSelect>
        </div>
        <Button liveRefresh action="refresh" variant="outline" type="button" onClick={refresh}>Actualiser</Button>
      </div>
      {notice ? <p role="status" className="text-success">{notice}</p> : null}
      {error ? <RecordError error={error} retry={refresh} /> : !value ? <DirectoryLoading label="Chargement des tâches…" />
        : value.items.length ? <ScrollableResultsTable>
          <DataTable className="crm-directory-table" columns={columns} rows={value.items} getRowId={task => task.id}
            caption="Tâches et rappels" emptyLabel="Aucune échéance" scrollLabel="Tableau des tâches" />
        </ScrollableResultsTable>
        : <DirectoryEmpty title={value.total ? "Aucune échéance sur cette page" : "Aucune échéance pour ces filtres"}
          action={value.total ? <Button action="back" variant="outline" onClick={() => setPage(1)}>Première page</Button> : undefined}>
          {value.total ? "Revenez à la première page pour retrouver vos résultats." : "Changez les filtres ou créez une tâche liée à un dossier."}
        </DirectoryEmpty>}
      {value && (value.total > 0 || page > 1) ? <div className="kay-sales-pagination">
        <NumberedPages compact page={page} total={value.total} size={value.page_size} change={setPage} label="Pages des tâches" />
      </div> : null}
    </div>
    {panel ? <RecordDrawer hideTrigger initialOpen
      label={panel.kind === "new" ? "Nouvelle tâche" : "Détail de la tâche"}
      description={panel.kind === "new" ? "Choisissez le contact, puis le prospect ou l’affaire concernée." : "Échéance, responsable et historique."}
      onClosed={() => setPanel(undefined)} returnFocus={opener} fallbackFocus={createButton}>
      {(close, done) => panel.kind === "new" ? <CreateTask close={close} saved={() => {
        setNotice("Tâche enregistrée.");
        refreshQuietly();
        done();
      }} /> : <TaskRecord id={panel.task.id} contactId={panel.task.contact_id} dealId={panel.task.deal_id ?? undefined}
        writable changed={refreshQuietly} close={close} />}
    </RecordDrawer> : null}
  </div>;
}

function CreateTask({ close, saved }: { close: () => void; saved: () => void }) {
  const [contact, setContact] = useState<ContactSummary>();
  const scope = useRef<HTMLDivElement>(null);
  const { request, dialog } = useUnsavedGuard();
  if (!contact) return <ContactSelector choose={setContact} />;
  return <div ref={scope} className="grid min-w-0 gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="wrap-anywhere text-sm">Contact choisi · <strong>{contact.name}</strong></p>
      <Button action="contact" type="button" variant="quiet"
        onClick={() => request(() => setContact(undefined), scope.current ?? document)}>
        Changer de contact
      </Button>
    </div>
    <TaskForm contactId={contact.id} saved={async () => saved()} cancel={close} />
    {dialog}
  </div>;
}
