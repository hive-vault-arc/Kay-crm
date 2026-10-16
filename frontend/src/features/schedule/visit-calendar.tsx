"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { busySchema, calendarContextSchema, colleaguesSchema, policySchema, statusLabels, typeLabels, visitsSchema } from "./contracts";
import { civilDay, dayLabel, localLabel, resolveLocal } from "./time";
import { VisitWeekGrid } from "./week-grid";
import type { Policy } from "./contracts";
import { Badge } from "@/components/ui/badge";

function weekStart(date: string) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return civilDay(date, -(weekday === 0 ? 6 : weekday-1));
}
export function VisitCalendar({ actorId }: { actorId: string }) {
  const query = useQuery("/api/v1/calendar/context", calendarContextSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <Calendar initial={query.value.today} actorId={actorId} /> : <p role="status">Chargement du calendrier…</p>;
}
function Calendar({ initial, actorId }: { initial: string; actorId: string }) {
  const [date, setDate] = useState(initial), [mode, setMode] = useState("details"), [user, setUser] = useState(actorId);
  const startDay = weekStart(date), days = Array.from({ length: 7 }, (_,i) => civilDay(startDay,i));
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema), colleagues = useQuery("/api/v1/calendar/colleagues", colleaguesSchema);
  return <div className="grid min-w-0 gap-3"><div className="filter-toolbar flex min-w-0 flex-wrap items-end gap-4"><div className="flex flex-wrap items-end gap-3"><div className="grid min-w-0 gap-2"><Label className="sr-only" htmlFor="calendar-date">Semaine contenant le</Label><Input id="calendar-date" type="date" min="2000-01-01" max="2100-12-24" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }} /></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDate(civilDay(startDay,-7))}>Semaine précédente</Button><Button variant="outline" onClick={() => setDate(initial)}>Aujourd’hui</Button><Button variant="outline" onClick={() => setDate(civilDay(startDay,7))}>Semaine suivante</Button></div></div>
    <div className="flex min-w-0 flex-wrap gap-3"><div className="grid min-w-0 max-w-xs gap-2"><Label className="sr-only" htmlFor="calendar-mode">Afficher</Label><NativeSelect id="calendar-mode" value={mode} onChange={e => setMode(e.target.value)}><option value="details">Visites accessibles</option><option value="busy">Disponibilités d’un collègue</option></NativeSelect></div>{mode === "busy" ? <div className="grid min-w-0 gap-2"><Label htmlFor="calendar-colleague">Collègue</Label><NativeSelect id="calendar-colleague" value={user} onChange={e => setUser(e.target.value)}>{colleagues.value?.items.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</NativeSelect>{colleagues.error ? <RecordError error={colleagues.error} retry={colleagues.refresh} /> : null}</div> : null}</div>
    <details className="min-w-0 max-w-reading"><summary className="flex min-h-control cursor-pointer items-center text-sm font-medium text-link">Règles et disponibilités</summary><div className="grid gap-2 py-2"><p className="text-xs text-muted-foreground">Heures de l’agence : Africa/Casablanca. Un créneau vide indique seulement qu’aucun rendez-vous CRM n’est enregistré, pas une disponibilité personnelle garantie.</p>{policy.value ? <p className="text-sm text-muted-foreground">Politique version {policy.value.version}. Capacité avec véhicule : {policy.value.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence. {policy.value.working_windows.length ? "Les visites hors bureau suivent les plages de travail et les pauses." : "Horaires non configurés : seules les nouvelles visites au bureau peuvent être planifiées."}</p> : null}</div></details></div>{policy.error ? <RecordError error={policy.error} retry={policy.refresh} /> : !policy.value ? <p role="status">Chargement des règles…</p> : null}
    <Week key={`${startDay}/${mode}/${user}`} days={days} busy={mode === "busy"} user={user} policy={policy.value} />
  </div>;
}
function Week({ days, busy, user, policy }: { days: string[]; busy: boolean; user: string; policy?: Policy }) {
  const [period, setPeriod] = useState<{ start_at: string; end_at: string }>(), [error, setError] = useState<ApiError>(), [retry, setRetry] = useState(0);
  const first = days[0];
  useEffect(() => {
    let active = true;
    Promise.all([resolveLocal(`${first}T00:00`),resolveLocal(`${civilDay(first,7)}T00:00`)]).then(([a,b]) => { if (!a.choices.length || !b.choices.length) throw new ApiError("VALIDATION_ERROR",422); if (active) setPeriod({ start_at: a.choices[0].instant, end_at: b.choices[0].instant }); }).catch(reason => { if (active) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503)); });
    return () => { active = false; };
  }, [first,retry]);
  if (error) return <RecordError error={error} retry={() => { setError(undefined); setRetry(n => n+1); }} />;
  if (!period) return <p role="status">Résolution de la semaine…</p>;
  return busy ? <BusyWeek days={days} period={period} user={user} /> : <DetailsWeek days={days} period={period} policy={policy} />;
}
function DetailsWeek({ days, period, policy }: { days: string[]; period: { start_at: string; end_at: string }; policy?: Policy }) {
  const [page, setPage] = useState(1), query = useQuery(queryPath("visits", { ...period, page, page_size: 50 }), visitsSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement des visites…</p>;
  return <><div className="flex flex-wrap items-center gap-4"><p>{query.value.total} visite(s) accessible(s) cette semaine.</p><Button variant="outline" onClick={query.refresh}>Actualiser les visites</Button><div className="flex flex-wrap gap-2" aria-label="Types de visites"><Badge>Au bureau</Badge><Badge variant="info">Sans véhicule de société</Badge><Badge variant="warning">Avec véhicule de société</Badge></div></div><VisitWeekGrid days={days} visits={query.value.items} policy={policy} /><div className="grid min-w-0 gap-4 xl:hidden" aria-label="Calendrier de la semaine">{days.map(day => <section key={day} aria-label={dayLabel(day)} className="surface grid min-w-0 content-start gap-4"><h2 className="font-medium capitalize">{dayLabel(day)}</h2><ul className="grid min-w-0 gap-4">{query.value!.items.filter(v => v.start_local.slice(0,10) <= day && (v.end_local.slice(0,10) > day || (v.end_local.slice(0,10) === day && v.end_local.slice(11,16) !== "00:00"))).map(v => <li key={v.id} className={`grid min-w-0 gap-2 rounded-sm border p-3 ${v.type === "office" ? "bg-accent" : v.type === "company_car" ? "bg-warning-background" : "bg-info-background"}`}><Link href={`/visits/${v.id}`} className="inline-flex min-h-control items-center text-link underline wrap-anywhere">{v.title}</Link><p className="text-sm wrap-anywhere">{v.contact_name}</p><p className="text-sm">{localLabel(v.start_local)} à {localLabel(v.end_local)}</p><p className="text-sm">{typeLabels[v.type]}</p><p className={v.status === "confirmed" ? "text-success" : "text-neutral"}>{statusLabels[v.status]}</p>{v.review_code ? <p className="text-sm text-warning">À revoir : {new ApiError(v.review_code,409).message}</p> : null}</li>)}</ul></section>)}</div>{query.value.total === 0 ? <p role="status">Aucune visite accessible pour cette semaine. Planifiez une visite depuis un contact accessible.</p> : null}<NumberedPages page={page} total={query.value.total} size={50} change={setPage} label="Pages des visites de la semaine" /></>;
}
function BusyWeek({ days, period, user }: { days: string[]; period: { start_at: string; end_at: string }; user: string }) {
  const [page, setPage] = useState(1), query = useQuery(queryPath("calendar/free-busy", { ...period, user_id: user, page, page_size:50 }), busySchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement des disponibilités CRM…</p>;
  return <section className="grid min-w-0 gap-4" aria-label="Disponibilités CRM du collègue"><div className="flex flex-wrap gap-4"><h2 className="text-section font-medium">Occupé dans le CRM</h2><Button variant="outline" onClick={query.refresh}>Actualiser les disponibilités</Button></div><p>Aucun titre, contact, lieu ou détail privé n’est transmis dans cette vue.</p><ul className="grid gap-4">{query.value.items.map((v,i) => <li key={`${v.start_at}/${v.end_at}/${i}`} className="border-b pb-4">Occupé : {localLabel(v.start_at)} à {localLabel(v.end_at)}</li>)}</ul>{!query.value.total ? <p role="status">Aucun rendez-vous CRM enregistré pour ce collègue du {dayLabel(days[0])} au {dayLabel(days[6])}.</p> : null}<NumberedPages page={page} total={query.value.total} size={50} change={setPage} label="Pages des disponibilités CRM" /></section>;
}
