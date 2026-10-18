"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { CalendarIcon, ColumnsIcon, TaskIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { FilterResultsLayout } from "@/components/shared/filter-results-layout";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { busySchema, calendarContextSchema, colleaguesSchema, policySchema, typeLabels, visitsSchema, visitStatusOrder, visitTypeOrder, type Policy, type Visit } from "./contracts";
import { dayLabel, localLabel, resolveLocal } from "./time";
import { calendarDay, visitListPath, occursOn, weekLabel, weekStart } from "./calendar-model";
import { VisitWeekGrid } from "./week-grid";
import { CalendarSidebar } from "./calendar-sidebar";
import { CalendarVisit } from "./calendar-visit";

type Period = { start_at: string; end_at: string };
export function VisitCalendar({ actorId, administrator = false }: { actorId: string; administrator?: boolean }) {
  const query = useQuery("/api/v1/calendar/context", calendarContextSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <Calendar initial={query.value.today} actorId={actorId} administrator={administrator} /> : <p role="status">Chargement du calendrier…</p>;
}
function Calendar({ initial, actorId, administrator }: { initial: string; actorId: string; administrator: boolean }) {
  const [date, setDate] = useState(initial), [mode, setMode] = useState("details"), [user, setUser] = useState(actorId);
  const [view, setView] = useState("week"), [rulesOpen, setRulesOpen] = useState(false);
  const rulesTrigger = useRef<HTMLButtonElement | null>(null);
  const startDay = weekStart(date), days = Array.from({ length: 7 }, (_, index) => calendarDay(startDay, index));
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema);
  const colleagues = useQuery("/api/v1/calendar/colleagues", colleaguesSchema);
  function rules(event: MouseEvent<HTMLButtonElement>) { rulesTrigger.current = event.currentTarget; setRulesOpen(true); }
  function choose(value: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-03" && value <= "2100-12-24") setDate(value); }
  return <Tabs value={view} onValueChange={setView} className="calendar-page gap-3">
    <div className="calendar-toolbar filter-toolbar flex min-w-0 flex-wrap items-center gap-3">
      <div className="calendar-period flex min-w-0 items-center rounded-md border bg-card"><Button action="back" variant="ghost" size="icon" aria-label="Semaine précédente" disabled={startDay <= "2000-01-03"} onClick={() => choose(calendarDay(startDay, -7))} /><label className="calendar-date-picker relative flex min-h-control min-w-0 items-center justify-center gap-3 px-3"><CalendarIcon aria-hidden="true" className="size-5 shrink-0" /><span aria-hidden="true" className="text-sm font-semibold">{weekLabel(days)}</span><Input aria-label="Semaine contenant le" type="date" min="2000-01-03" max="2100-12-24" value={date} onChange={event => choose(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label><Button action="forward" variant="ghost" size="icon" aria-label="Semaine suivante" disabled={startDay >= "2100-12-20"} onClick={() => choose(calendarDay(startDay, 7))} /></div>
      <Button action="visit" variant="outline" onClick={() => choose(initial)}>Aujourd’hui</Button>
      <div className="calendar-mode-control"><NativeSelect aria-label="Afficher" value={mode} onChange={event => setMode(event.target.value)}><option value="details">Visites accessibles</option><option value="busy">Disponibilités d’un collègue</option></NativeSelect></div>
      {mode === "busy" ? <div className="calendar-mode-control"><NativeSelect aria-label="Collègue" value={user} onChange={event => setUser(event.target.value)}>{colleagues.value?.items.map(colleague => <option key={colleague.id} value={colleague.id}>{colleague.display_name}</option>)}</NativeSelect></div> : null}
      <Button action="settings" variant="ghost" className="calendar-rules-trigger text-link" onClick={rules}>Règles et disponibilités</Button>
      <TabsList className="calendar-view-tabs ml-auto" aria-label="Présentation du calendrier"><TabsTrigger value="week" disabled={mode === "busy"}><CalendarIcon aria-hidden="true" className="mr-2 size-4" />Semaine</TabsTrigger><TabsTrigger value="agenda" disabled={mode === "busy"}><TaskIcon aria-hidden="true" className="mr-2 size-4" />Agenda</TabsTrigger><TabsTrigger value="types" disabled={mode === "busy"}><ColumnsIcon aria-hidden="true" className="mr-2 size-4" />Par type</TabsTrigger></TabsList>
    </div>
    {policy.error ? <RecordError error={policy.error} retry={policy.refresh} /> : null}
    {mode === "busy" && colleagues.error ? <RecordError error={colleagues.error} retry={colleagues.refresh} /> : null}
    <Week key={`${startDay}/${mode}/${user}`} days={days} date={date} today={initial} choose={choose} busy={mode === "busy"} user={user} policy={policy.value} rules={rules} />
    <Sheet open={rulesOpen} onOpenChange={setRulesOpen}><SheetContent closeLabel="Fermer les règles" className="w-full overflow-y-auto p-5 sm:max-w-reading" onCloseAutoFocus={event => { event.preventDefault(); rulesTrigger.current?.focus(); }}><SheetHeader className="mb-5 p-0 pr-8 text-left"><SheetTitle>Règles et disponibilités</SheetTitle><SheetDescription>Heures de l’agence : Africa/Casablanca.</SheetDescription></SheetHeader><div className="grid gap-4"><p>Un créneau vide indique seulement qu’aucun rendez-vous CRM n’est enregistré, pas une disponibilité personnelle garantie.</p>{policy.value ? <><p>Politique version {policy.value.version}. Capacité avec véhicule : {policy.value.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence.</p><p>{policy.value.working_windows.length ? "Les visites hors bureau suivent les plages de travail et les pauses. Les visites au bureau restent indépendantes de ces restrictions." : "Horaires non configurés : seules les nouvelles visites au bureau peuvent être planifiées."}</p></> : <p>Règles de l’agence indisponibles.</p>}{administrator ? <Button action="settings" variant="outline" asChild><Link href="/settings/working-hours">Gérer les horaires de travail</Link></Button> : null}</div></SheetContent></Sheet>
  </Tabs>;
}
function Week({ days, busy, user, ...props }: { days: string[]; busy: boolean; user: string; date: string; today: string; choose: (date: string) => void; policy?: Policy; rules: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const [period, setPeriod] = useState<Period>(), [error, setError] = useState<ApiError>(), [retry, setRetry] = useState(0);
  const first = days[0];
  useEffect(() => {
    let active = true;
    Promise.all([resolveLocal(`${first}T00:00`), resolveLocal(`${calendarDay(first, 7)}T00:00`)]).then(([start, end]) => {
      if (!start.choices.length || !end.choices.length) throw new ApiError("VALIDATION_ERROR", 422);
      if (active) setPeriod({ start_at: start.choices[0].instant, end_at: end.choices[0].instant });
    }).catch(reason => { if (active) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); });
    return () => { active = false; };
  }, [first, retry]);
  if (error) return <RecordError error={error} retry={() => { setError(undefined); setRetry(value => value + 1); }} />;
  if (!period) return <p role="status">Résolution de la semaine…</p>;
  return busy ? <BusyWeek days={days} period={period} user={user} /> : <DetailsWeek days={days} period={period} {...props} />;
}
function DetailsWeek({ days, period, date, today, choose, policy, rules }: { days: string[]; period: Period; date: string; today: string; choose: (date: string) => void; policy?: Policy; rules: (event: MouseEvent<HTMLButtonElement>) => void }) {
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<Visit["type"][]>([...visitTypeOrder]);
  const [statuses, setStatuses] = useState<Visit["status"][]>([...visitStatusOrder]);
  const query = useQuery(visitListPath(period, page, types, statuses), visitsSchema);
  function toggleType(type: Visit["type"]) { setTypes(values => values.includes(type) ? values.filter(value => value !== type) : [...values, type]); setPage(1); }
  function toggleStatus(status: Visit["status"]) { setStatuses(values => values.includes(status) ? values.filter(value => value !== status) : [...values, status]); setPage(1); }
  return <FilterResultsLayout className="calendar-workbench" title="Filtres du calendrier" panelHeading={null} active={types.length !== 3 || statuses.length !== 5} filters={() => <CalendarSidebar date={date} today={today} choose={choose} policy={policy} value={query.value} types={types} statuses={statuses} toggleType={toggleType} toggleStatus={toggleStatus} rules={rules} />}>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <div role="status" className="surface min-h-chart">Chargement des visites…</div> : <>
      <TabsContent value="week"><div className="calendar-desktop-grid"><VisitWeekGrid days={days} visits={query.value.items} policy={policy} today={today} /></div><div className="calendar-default-agenda"><Agenda days={days} visits={query.value.items} /></div></TabsContent>
      <TabsContent value="agenda"><Agenda days={days} visits={query.value.items} /></TabsContent>
      <TabsContent value="types"><div className="grid gap-5" aria-label="Visites par type">{visitTypeOrder.map(type => <section key={type} className="grid min-w-0 gap-3"><h2 className="text-section">{typeLabels[type]}</h2>{query.value!.items.filter(visit => visit.type === type).map(visit => <CalendarVisit key={visit.id} visit={visit} />)}{!query.value!.items.some(visit => visit.type === type) ? <p className="text-sm text-muted-foreground">Aucune visite de ce type sur cette page.</p> : null}</section>)}</div></TabsContent>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{query.value.total} visite(s) accessible(s) cette semaine.</p><Button action="refresh" variant="ghost" size="compact" onClick={query.refresh}>Actualiser les visites</Button></div>
      {!query.value.total ? <p role="status">{query.value.unfiltered_total ? "Aucune visite ne correspond aux filtres sélectionnés." : "Aucune visite accessible pour cette semaine. Planifiez une visite depuis un contact accessible."}</p> : null}
      {query.value.total > 50 || page > 1 ? <NumberedPages page={page} total={query.value.total} size={50} change={setPage} label="Pages des visites de la semaine" /> : null}
    </>}
  </FilterResultsLayout>;
}
function Agenda({ days, visits }: { days: string[]; visits: Visit[] }) {
  return <div role="region" className="grid min-w-0 gap-4" aria-label="Calendrier de la semaine">{days.map(day => <section key={day} aria-label={dayLabel(day)} className="surface grid min-w-0 content-start gap-3"><h2 className="font-medium capitalize">{dayLabel(day)}</h2>{visits.filter(visit => occursOn(visit, day)).map(visit => <CalendarVisit key={visit.id} visit={visit} />)}{!visits.some(visit => occursOn(visit, day)) ? <p className="text-xs text-muted-foreground">Aucune visite sur cette page.</p> : null}</section>)}</div>;
}
function BusyWeek({ days, period, user }: { days: string[]; period: Period; user: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("calendar/free-busy", { ...period, user_id: user, page, page_size: 50 }), busySchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement des disponibilités CRM…</p>;
  return <section className="grid min-w-0 gap-4" aria-label="Disponibilités CRM du collègue"><div className="flex flex-wrap gap-4"><h2 className="text-section font-medium">Occupé dans le CRM</h2><Button action="refresh" variant="outline" onClick={query.refresh}>Actualiser les disponibilités</Button></div><p>Aucun titre, contact, lieu ou détail privé n’est transmis dans cette vue.</p><ul className="grid gap-4">{query.value.items.map((visit, index) => <li key={`${visit.start_at}/${visit.end_at}/${index}`} className="border-b pb-4">Occupé : {localLabel(visit.start_at)} à {localLabel(visit.end_at)}</li>)}</ul>{!query.value.total ? <p role="status">Aucun rendez-vous CRM enregistré pour ce collègue du {dayLabel(days[0])} au {dayLabel(days[6])}.</p> : null}<NumberedPages page={page} total={query.value.total} size={50} change={setPage} label="Pages des disponibilités CRM" /></section>;
}
