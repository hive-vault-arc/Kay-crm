"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { localLabel } from "@/features/schedule/time";
import { useHydrated } from "@/hooks/use-hydrated";
import { bucketLabels, followUpSchema, tasksSchema, taskStatusLabels, type Bucket } from "./contracts";
import { NotificationPanel } from "./notification-panel";
import { ReportDashboard } from "@/features/reports/report-dashboard";

export function WorkDashboard() {
  return <div className="grid min-w-0 gap-5"><ReportDashboard><div className="grid min-w-0 items-start gap-4 xl:grid-cols-2"><div className="surface max-h-96 overflow-y-auto" role="region" aria-label="Travail quotidien, défilement vertical" tabIndex={0}><DashboardTasks /></div><div id="notifications" className="surface max-h-96 overflow-y-auto" role="region" aria-label="Notifications, défilement vertical" tabIndex={0}><NotificationPanel /></div></div></ReportDashboard><div className="surface"><VisitFollowUp /></div></div>;
}

function DashboardTasks() {
  const id = useId(), hydrated = useHydrated(), [bucket, setBucket] = useState<Bucket>("today"), [page, setPage] = useState(1);
  const query = useQuery(queryPath("tasks", { bucket, page }), tasksSchema);
  return <section className="grid min-w-0 gap-4" aria-label="Travail à faire"><h2 className="text-section font-medium">Travail à faire</h2><div className="flex flex-wrap items-end gap-4"><div className="grid gap-2"><Label htmlFor={id}>Période des tâches</Label><NativeSelect id={id} value={bucket} onChange={e => { setBucket(e.target.value as Bucket); setPage(1); }}>{Object.entries(bucketLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div><Button action="refresh" type="button" variant="outline" disabled={!hydrated} onClick={query.refresh}>Actualiser le travail</Button></div>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement du travail…</p> : <><p>{query.value.total} tâche(s) accessible(s) : {bucketLabels[bucket].toLowerCase()}. Heure de l’agence : Africa/Casablanca.</p>{query.value.items.length ? <ul className="grid min-w-0 gap-4">{query.value.items.map(task => <li key={task.id} className="grid min-w-0 gap-2 border-t pt-4"><Link className="inline-flex min-h-control items-center justify-self-start wrap-anywhere text-link underline" href={task.deal_id ? `/deals/${task.deal_id}?task=${task.id}` : `/contacts/${task.contact_id}?task=${task.id}`}>{task.title}</Link><p className="wrap-anywhere">{task.contact_name} : {taskStatusLabels[task.status]}</p><p className={task.status === "open" && Date.parse(task.due_at) < Date.parse(query.value?.now ?? task.due_at) ? "text-danger" : "text-muted-foreground"}>{localLabel(task.due_local)}{task.status === "open" && Date.parse(task.due_at) < Date.parse(query.value?.now ?? task.due_at) ? " : en retard" : ""}</p><p className="wrap-anywhere text-sm text-muted-foreground">Responsable : {task.owner_name}</p></li>)}</ul> : <p>Aucune tâche pour cette période dans votre périmètre. Créez une tâche depuis la fiche contact ou l’affaire concernée.</p>}<NumberedPages page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages du travail accessible" /></>}
  </section>;
}

export function VisitFollowUp() {
  const [page, setPage] = useState(1), hydrated = useHydrated();
  const query = useQuery(queryPath("visits/follow-up", { page }), followUpSchema);
  return <section className="grid min-w-0 gap-4 border-t pt-8" aria-label="Visites à renseigner"><h2 className="text-section font-medium">Visites à renseigner</h2><p className="text-sm text-muted-foreground">Visites dont la fin est passée, encore planifiées ou confirmées. Consignez le résultat, annulez ou replanifiez la même visite.</p><Button action="refresh" type="button" variant="outline" className="justify-self-start" disabled={!hydrated} onClick={query.refresh}>Actualiser le suivi des visites</Button>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement du suivi des visites…</p> : <>{query.value.items.length ? <ul className="grid min-w-0 gap-4">{query.value.items.map(visit => <li key={visit.id} className="grid min-w-0 gap-2 border-t pt-4"><Link className="inline-flex min-h-control items-center justify-self-start wrap-anywhere text-link underline" href={`/visits/${visit.id}`}>{visit.title}</Link><p className="wrap-anywhere">{visit.contact_name} : fin prévue le {localLabel(visit.end_local)}</p></li>)}</ul> : <p>Aucune visite échue à renseigner dans votre périmètre.</p>}<NumberedPages page={query.value.page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages du suivi des visites" /></>}
  </section>;
}
