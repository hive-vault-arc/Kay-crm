"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CrmDirectoryHeader, CrmStatusBadge } from "@/components/shared/crm-presentation";
import { CrmStatusFilter } from "@/components/shared/crm-status-filter";
import { DataTable } from "@/components/shared/data-table";
import { DirectoryEmpty, DirectoryLoading } from "@/components/shared/directory-presentation";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
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
import { useHydrated } from "@/hooks/use-hydrated";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { bucketLabels, tasksSchema, taskStatusLabels, type Bucket, type Task } from "./contracts";
import { TaskForm } from "./task-form";
import { TaskStatus } from "./task-presentation";
import { TaskRecord } from "./task-record";
import { taskContext, taskDueState } from "./task-time";

type Panel = { kind: "new" } | { kind: "record"; task: Task };
const PAGE_SIZE = 50;
const duePeriods = ["today", "overdue", "upcoming"] as const;

function TaskStatusFilter({ owner, revision, value, change }: { owner?: string; revision: number; value: string; change: (value: string) => void }) {
  const scope = { owner_user_id: owner, page_size: 1 };
  const open = useQuery(queryPath("tasks", { ...scope, bucket: "open" }), tasksSchema, revision).value?.total;
  const completed = useQuery(queryPath("tasks", { ...scope, bucket: "completed" }), tasksSchema, revision).value?.total;
  const cancelled = useQuery(queryPath("tasks", { ...scope, bucket: "cancelled" }), tasksSchema, revision).value?.total;
  const counts = open === undefined || completed === undefined || cancelled === undefined ? undefined : { open, completed, cancelled };
  return <CrmStatusFilter label="Statut" labels={taskStatusLabels} counts={counts} value={value} change={change} />;
}

export function TasksDirectory({ actorId }: { actorId: string }) {
  const [bucket, setBucket] = useState<Bucket>("open");
  const [mine, setMine] = useState(true);
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<Panel>();
  const [notice, setNotice] = useState("");
  const [railOpen, setRailOpen] = useState(true);
  const [countRevision, setCountRevision] = useState(0);
  const phone = usePhoneLayout(), hydrated = useHydrated();
  const railTrigger = useRef<HTMLButtonElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement>(null);
  const owner = mine ? actorId : undefined;
  const period = duePeriods.find(value => value === bucket) ?? "";
  const selectedStatus = period ? "open" : bucket === "all" ? "" : bucket;
  const activeCount = Number(!mine) + Number(bucket !== "open");
  const { value, error, refresh, refreshQuietly } = useQuery(
    queryPath("tasks", { bucket, owner_user_id: owner, page, page_size: PAGE_SIZE }),
    tasksSchema,
  );

  const columns = useMemo<ColumnDef<Task>[]>(() => [
    { id: "task", header: "Tâche", size: 186, cell: ({ row: { original: task } }) =>
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
  function filterBucket(next: Bucket) { setBucket(next); setPage(1); }
  function reset() { setMine(true); filterBucket("open"); }
  function reload() { refresh(); setCountRevision(value => value + 1); }
  function changed() { refreshQuietly(); setCountRevision(value => value + 1); }

  return <div className="crm-directory kay-sales-directory" data-sales-view="list">
    <CrmDirectoryHeader title="Tâches" count={error ? undefined : value?.total} unavailable={Boolean(error)}
      noun="échéances" description="Consultez vos tâches et rappels ou créez une échéance liée à un dossier."
      route="/tasks" actions={<div className="kay-directory-tools">
        {!phone ? <Button ref={railTrigger} action="filter" type="button" variant={railOpen ? "secondary" : "outline"} disabled={!hydrated}
          aria-expanded={railOpen} aria-controls="tasks-filter-rail" onClick={() => setRailOpen(open => !open)}>Filtres{activeCount ? ` · ${activeCount}` : ""}</Button> : null}
        <Button liveRefresh action="refresh" variant="outline" type="button" onClick={reload}>Actualiser</Button>
        <Button ref={createButton} action="create" variant="creation" onClick={event => create(event.currentTarget)}>Nouvelle tâche</Button>
      </div>} />
    <FilterResultsLayout title="Filtres des tâches" reference active={activeCount > 0} activeCount={activeCount}
      reset={reset} railId="tasks-filter-rail" railHidden={!railOpen}
      panelHeading={<div className="kay-sales-filter-heading">
        <h2>Filtres</h2>
        <Button action="reset" type="button" size="compact" variant="quiet" onClick={reset}>Réinitialiser</Button>
        <Button action="close" type="button" size="icon" variant="outline" aria-label="Masquer le panneau de filtres" onClick={() => { setRailOpen(false); railTrigger.current?.focus(); }} />
      </div>}
      filters={close => <form className="crm-directory-filter-form kay-sales-filters" aria-label="Filtres des tâches" onSubmit={event => { event.preventDefault(); close(); }}>
        <fieldset disabled={!hydrated} className="grid min-w-0 gap-5">
          <TaskStatusFilter owner={owner} revision={countRevision} value={selectedStatus} change={status => filterBucket((status || "all") as Bucket)} />
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
            <Label htmlFor="tasks-period">Échéance des tâches à faire</Label>
            <NativeSelect id="tasks-period" value={period} onChange={event => filterBucket((event.target.value || "open") as Bucket)}>
              <option value="">Toutes les échéances</option>
              {duePeriods.map(key => <option key={key} value={key}>{bucketLabels[key]}</option>)}
            </NativeSelect>
          </div>
        </fieldset>
        <div className="crm-filter-submit">
          <Button action="filter" type="submit" variant="outline" disabled={!hydrated}>Appliquer</Button>
          <Button action="reset" type="button" variant="quiet" disabled={!hydrated} onClick={reset}>Réinitialiser</Button>
        </div>
      </form>}>
      <div className="kay-sales-list">
        {notice ? <p role="status" className="text-success">{notice}</p> : null}
        {error ? <RecordError error={error} retry={reload} /> : !value ? <DirectoryLoading label="Chargement des tâches…" />
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
    </FilterResultsLayout>
    {panel ? <RecordDrawer hideTrigger initialOpen
      label={panel.kind === "new" ? "Nouvelle tâche" : "Détail de la tâche"}
      description={panel.kind === "new" ? "Choisissez le contact, puis le prospect ou l’affaire concernée." : "Échéance, responsable et historique."}
      onClosed={() => setPanel(undefined)} returnFocus={opener} fallbackFocus={createButton}>
      {(close, done) => panel.kind === "new" ? <CreateTask close={close} saved={() => {
        setNotice("Tâche enregistrée.");
        changed();
        done();
      }} /> : <TaskRecord id={panel.task.id} contactId={panel.task.contact_id} dealId={panel.task.deal_id ?? undefined}
        writable changed={changed} close={close} />}
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
