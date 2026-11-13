"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { usePhoneLayout } from "@/hooks/use-phone-layout";
import { calendarWorkSchema, type CalendarWorkItem } from "@/features/work/contracts";
import { ApiError } from "@/lib/api/client";
import { busySchema, calendarContextSchema, colleaguesSchema, policySchema, typeLabels, visitsSchema, visitStatusOrder, visitTypeOrder, type Policy, type Visit, type VisitPage } from "./contracts";
import { dayLabel, localLabel, resolveLocal } from "./time";
import { calendarDay, visitListPath, weekLabel, weekStart } from "./calendar-model";
import { VisitWeekGrid, BusyWeekGrid } from "./week-grid";
import { CalendarSidebar } from "./calendar-sidebar";
import { CalendarPriority } from "./calendar-priority";
import { CalendarVisit } from "./calendar-visit";
import { CalendarFrame } from "./calendar-frame";
import { VisitAction } from "./visit-record";

type Period = { start_at: string; end_at: string };
type View = "week" | "agenda" | "types";
const calendarTitle = { title: "Calendrier des visites", description: "Rendez-vous, disponibilités et échéances importantes", route: "/visits" };
const planVisit = <Button action="create" asChild><Link href="/visits/new" scroll={false}>Planifier une visite</Link></Button>;
export function VisitCalendar({ actorId, administrator = false }: { actorId: string; administrator?: boolean }) {
  const query = useQuery("/api/v1/calendar/context", calendarContextSchema);
  if (query.value && !query.error) return <Calendar initial={query.value.today} actorId={actorId} administrator={administrator} />;
  return <><PageHeader {...calendarTitle} actions={planVisit} />{query.error ? <RecordError error={query.error} retry={query.refresh} /> : <CalendarLoading label="Chargement du calendrier…" />}</>;
}
export function Calendar({ initial, actorId, administrator }: { initial: string; actorId: string; administrator: boolean }) {
  const [date, setDate] = useState(initial), [mode, setMode] = useState("details"), [user, setUser] = useState(actorId);
  const [view, setView] = useState<View>("week"), [types, setTypes] = useState<Visit["type"][]>([...visitTypeOrder]);
  const [statuses, setStatuses] = useState<Visit["status"][]>(visitStatusOrder.filter(status => status !== "cancelled"));
  const [filtersOpen, setFiltersOpen] = useState(false), [revision, setRevision] = useState(0), [cancelVisit, setCancelVisit] = useState<Visit>();
  const [scopeFailure, setScopeFailure] = useState<ApiError>();
  const [counts, setCounts] = useState<{ key: string; value: VisitPage }>();
  const focusTarget = useRef<HTMLButtonElement>(null), phone = usePhoneLayout();
  const startDay = weekStart(date), days = Array.from({ length: 7 }, (_, index) => calendarDay(startDay, index));
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema), colleagues = useQuery("/api/v1/calendar/colleagues", colleaguesSchema);
  const busy = mode === "busy", displayed = busy ? phone ? "agenda" : "week" : phone && view === "week" ? "agenda" : view;
  const countKey = `${startDay}/${types.join(",")}/${statuses.join(",")}/${mode}`;
  const reportCounts = useCallback((value?: VisitPage) => setCounts(value ? { key: countKey, value } : undefined), [countKey]);
  const currentCounts = counts?.key === countKey ? counts.value : undefined;
  const active = types.length !== visitTypeOrder.length || statuses.length !== visitStatusOrder.length - 1 || statuses.includes("cancelled");
  function choose(value: string) { if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= "2000-01-03" && value <= "2100-12-24" && calendarDay(value) === value) setDate(value); }
  function toggleType(type: Visit["type"]) { setTypes(values => values.includes(type) ? values.filter(value => value !== type) : [...values, type]); }
  function toggleStatus(status: Visit["status"]) { setStatuses(values => values.includes(status) ? values.filter(value => value !== status) : [...values, status]); }
  if (scopeFailure) return <><PageHeader {...calendarTitle} actions={planVisit} /><RecordError error={scopeFailure} retry={() => { setScopeFailure(undefined); setCounts(undefined); setRevision(value => value + 1); }} /></>;
  return <Tabs value={displayed} onValueChange={value => { if (["week", "agenda", "types"].includes(value)) setView(value as View); }} className="kay-calendar">
    <div className="kay-calendar-controls">
      <PageHeader {...calendarTitle} navigation={<TabsList aria-label="Présentation du calendrier" className="kay-calendar-views">{!phone ? <TabsTrigger data-calendar-view="week" value="week">Semaine</TabsTrigger> : null}<TabsTrigger value="agenda" disabled={busy && !phone}>Agenda</TabsTrigger>{!busy ? <TabsTrigger value="types">Par type</TabsTrigger> : null}</TabsList>} actions={<div className="kay-calendar-tools" data-filter-panel="calendar-toolbar">
          <div className="kay-calendar-mode"><NativeSelect aria-label="Données du calendrier" value={mode} onChange={event => setMode(event.target.value)}><option value="details">Visites accessibles</option><option value="busy">Disponibilités d’un collègue</option></NativeSelect></div>
          {busy ? <div className="kay-calendar-mode"><NativeSelect aria-label="Collègue" value={user} onChange={event => setUser(event.target.value)}>{!colleagues.value?.items.length ? <option value={actorId}>Moi</option> : colleagues.value.items.map(colleague => <option key={colleague.id} value={colleague.id}>{colleague.display_name}</option>)}</NativeSelect></div> : null}
          {!busy ? <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}><SheetTrigger asChild><Button action="filter" variant="outline" aria-label={active ? "Filtres du calendrier, sélection active" : "Filtres du calendrier"}><span className="kay-calendar-tool-label">Filtres</span></Button></SheetTrigger><SheetContent data-filter-panel="calendar" className="kay-record-drawer kay-calendar-drawer" closeLabel="Fermer les filtres du calendrier"><SheetHeader className="kay-drawer-head"><SheetTitle>Filtres du calendrier</SheetTitle><SheetDescription>La sélection porte sur toute la semaine accessible, avant pagination.</SheetDescription></SheetHeader><div className="kay-drawer-body"><CalendarSidebar compact date={date} today={initial} choose={choose} value={currentCounts} types={types} statuses={statuses} toggleType={toggleType} toggleStatus={toggleStatus} /></div><footer className="kay-upload-footer"><Button action="confirm" onClick={() => setFiltersOpen(false)}>Voir les visites</Button></footer></SheetContent></Sheet> : null}
          <CalendarRules policy={policy.value} error={policy.error} retry={policy.refresh} administrator={administrator} />
          {planVisit}
        </div>} />
      <div className="kay-calendar-navigation"><div className="kay-calendar-range"><Button ref={focusTarget} action="previous" variant="quiet" size="icon" aria-label="Semaine précédente" disabled={startDay <= "2000-01-03"} onClick={() => choose(calendarDay(startDay, -7))} /><span role="status">{weekLabel(days)}</span><Button action="next" variant="quiet" size="icon" aria-label="Semaine suivante" disabled={startDay >= "2100-12-20"} onClick={() => choose(calendarDay(startDay, 7))} /></div><Button action="visit" variant="outline" onClick={() => choose(initial)}>Aujourd’hui</Button><label className="kay-calendar-jump" data-filter-panel><span className="sr-only">Aller à une date</span><Input type="date" min="2000-01-03" max="2100-12-24" aria-label="Aller à une date" value={date} onChange={event => choose(event.target.value)} /></label></div>
    </div>
    {busy && colleagues.error ? <RecordError error={colleagues.error} retry={colleagues.refresh} /> : null}
    <Week key={startDay} days={days} busy={busy} user={user} today={initial} types={types} statuses={statuses} revision={revision} pageKey={countKey} counts={reportCounts} cancel={setCancelVisit} />
    {cancelVisit ? <VisitAction key={cancelVisit.id} dialogOnly denied={error => { setCancelVisit(undefined); setCounts(undefined); setScopeFailure(error); }} value={cancelVisit} action="cancel" saved={() => setRevision(value => value + 1)} closed={() => setCancelVisit(undefined)} returnFocus={focusTarget} /> : null}
  </Tabs>;
}
function CalendarLoading({ label }: { label: string }) {
  return <CalendarFrame><div className="kay-calendar-loading" role="status"><span className="sr-only">{label}</span>{[0, 1, 2, 3, 4, 5, 6].map(day => <Skeleton key={day} aria-hidden="true" className="motion-reduce:animate-none" />)}</div></CalendarFrame>;
}
function CalendarRules({ policy, error, retry, administrator }: { policy?: Policy; error?: ApiError; retry: () => void; administrator: boolean }) {
  return <Sheet><SheetTrigger asChild><Button action="help" variant="outline" aria-label="Règles et disponibilités"><span className="kay-calendar-tool-label">Règles</span></Button></SheetTrigger><SheetContent className="kay-record-drawer kay-calendar-drawer" closeLabel="Fermer les règles"><SheetHeader className="kay-drawer-head"><SheetTitle>Règles et disponibilités</SheetTitle><SheetDescription>Heure de l’agence : Africa/Casablanca.</SheetDescription></SheetHeader><div className="kay-drawer-body"><p>Un créneau vide indique seulement qu’aucun rendez-vous CRM n’est enregistré, pas une disponibilité personnelle garantie.</p>{error ? <RecordError error={error} retry={retry} /> : !policy ? <p role="status">Chargement des règles…</p> : <><p>Politique version {policy.version}. Capacité avec véhicule : {policy.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence.</p><p>{policy.working_windows.length ? "Les visites hors bureau suivent les plages de travail et évitent les pauses. Les visites au bureau et les réunions restent indépendantes de ces restrictions." : "Horaires non configurés : les visites au bureau et les réunions peuvent être planifiées."}</p><PolicyWindows title="Plages de travail" rows={policy.working_windows} /><PolicyWindows title="Pauses" rows={policy.lunch_breaks} /></>}{administrator ? <Button action="settings" variant="outline" asChild><Link href="/settings/working-hours">Gérer les horaires de travail</Link></Button> : null}</div></SheetContent></Sheet>;
}
function PolicyWindows({ title, rows }: { title: string; rows: Policy["working_windows"] }) {
  return <section className="kay-calendar-policy"><h3>{title}</h3>{rows.length ? <ul>{rows.map((row, index) => <li key={index}><span>{["Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam.", "Dim."][row.weekday - 1]}</span><strong>{row.start_local}–{row.end_local}</strong></li>)}</ul> : <p>Aucune plage configurée.</p>}</section>;
}
function Week({ days, busy, user, ...props }: { days: string[]; busy: boolean; user: string; today: string; types: Visit["type"][]; statuses: Visit["status"][]; revision: number; pageKey: string; counts: (value?: VisitPage) => void; cancel: (value: Visit) => void }) {
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
  if (!period) return <CalendarLoading label="Résolution de la semaine…" />;
  return busy ? <BusyWeek key={user} days={days} period={period} user={user} today={props.today} /> : <DetailsWeek key={props.pageKey} days={days} period={period} {...props} />;
}
function DetailsWeek({ days, period, today, types, statuses, revision, counts, cancel }: { days: string[]; period: Period; today: string; types: Visit["type"][]; statuses: Visit["status"][]; revision: number; counts: (value?: VisitPage) => void; cancel: (value: Visit) => void }) {
  const [page, setPage] = useState(1), query = useQuery(visitListPath(period, page, types, statuses), visitsSchema, revision);
  const [priorityPage, setPriorityPage] = useState(1);
  const priorities = useQuery(queryPath("work/calendar", { ...period, page: priorityPage, page_size: 50 }), calendarWorkSchema);
  const important = priorities.error ? [] : priorities.value?.items ?? [];
  const value = query.value;
  useEffect(() => { counts(query.error ? undefined : value); }, [value, query.error, counts]);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!value) return <CalendarLoading label="Chargement des visites…" />;
  return <CalendarFrame><div className="kay-calendar-collection"><TabsContent value="week"><VisitWeekGrid days={days} visits={value.items} important={important} today={today} /><div className="kay-calendar-phone-fallback"><Agenda visits={value.items} important={important} cancel={cancel} showEmpty={value.total > 0} /></div></TabsContent><TabsContent value="agenda"><Agenda visits={value.items} important={important} cancel={cancel} showEmpty={value.total > 0} /></TabsContent><TabsContent value="types"><div className="kay-calendar-by-type" role="region" tabIndex={0} aria-label="Visites par type">{value.total > 0 ? visitTypeOrder.filter(type => types.includes(type)).map(type => <section key={type}><header><h2>{typeLabels[type]}</h2><span>{value.type_counts[type] ?? 0} sur la semaine</span></header><Agenda visits={value.items.filter(visit => visit.type === type)} cancel={cancel} grouped /></section>) : null}{important.length ? <section><header><h2>Échéances importantes</h2></header><Agenda visits={[]} important={important} cancel={cancel} grouped /></section> : null}</div></TabsContent></div>
    {priorities.error ? <RecordError error={priorities.error} retry={priorities.refresh} /> : !priorities.value ? <p className="kay-calendar-empty" role="status">Chargement des échéances importantes…</p> : null}
    {priorities.value && (priorities.value.has_previous || priorities.value.has_next) ? <NumberedPages compact page={priorityPage} total={priorities.value.total} size={priorities.value.page_size} change={setPriorityPage} label="Pages des échéances importantes" /> : null}
    <footer className="kay-calendar-footer"><p role="status">{value.total} visite(s) accessible(s) cette semaine{value.total > value.items.length ? ` · ${value.items.length} sur cette page` : ""}.</p><Button liveRefresh action="refresh" variant="quiet" size="compact" onClick={() => { query.refresh(); priorities.refresh(); }}>Actualiser les visites</Button></footer>{!value.total && !important.length && priorities.value ? <p role="status" className="kay-calendar-empty">{value.unfiltered_total ? "Aucune visite ne correspond aux filtres sélectionnés." : "Aucune visite accessible pour cette semaine. Planifiez une visite depuis un contact accessible."}</p> : null}{value.has_previous || value.has_next ? <NumberedPages compact page={page} total={value.total} size={value.page_size} change={setPage} label="Pages des visites de la semaine" /> : null}</CalendarFrame>;
}
export function Agenda({ visits, important = [], cancel, grouped = false, showEmpty = true }: { visits: Visit[]; important?: CalendarWorkItem[]; cancel: (value: Visit) => void; grouped?: boolean; showEmpty?: boolean }) {
  const events = [
    ...visits.map(visit => ({ at: visit.start_local, card: <CalendarVisit key={visit.id} visit={visit} onCancel={cancel} /> })),
    ...important.map(item => ({ at: item.due_local, card: <CalendarPriority key={item.id} item={item} /> })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return <div role={grouped ? undefined : "region"} tabIndex={grouped ? undefined : 0} className="kay-calendar-agenda" aria-label={grouped ? undefined : "Agenda des visites"}>{events.length ? events.map(event => event.card) : showEmpty ? <p className="kay-calendar-empty">Aucun rendez-vous sur cette page.</p> : null}</div>;
}
function BusyWeek({ days, period, user, today }: { days: string[]; period: Period; user: string; today: string }) {
  const [page, setPage] = useState(1), query = useQuery(queryPath("calendar/free-busy", { ...period, user_id: user, page, page_size: 50 }), busySchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <CalendarLoading label="Chargement des disponibilités CRM…" />;
  return <CalendarFrame><div className="kay-calendar-collection"><TabsContent value="week"><BusyWeekGrid days={days} intervals={query.value.items} today={today} /><div className="kay-calendar-phone-fallback"><BusyAgenda intervals={query.value.items} /></div></TabsContent><TabsContent value="agenda"><BusyAgenda intervals={query.value.items} /></TabsContent></div><footer className="kay-calendar-footer"><p>Aucun titre, contact, lieu ou détail privé n’est transmis dans cette vue.</p><Button liveRefresh action="refresh" variant="quiet" size="compact" onClick={query.refresh}>Actualiser</Button></footer>{!query.value.total ? <p role="status">Aucun rendez-vous CRM enregistré pour ce collègue du {dayLabel(days[0])} au {dayLabel(days[6])}.</p> : null}{query.value.has_previous || query.value.has_next ? <NumberedPages compact page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des disponibilités CRM" /> : null}</CalendarFrame>;
}

function BusyAgenda({ intervals }: { intervals: { start_at: string; end_at: string }[] }) {
  return <ul role="region" tabIndex={0} aria-label="Occupation CRM" className="kay-calendar-agenda">{intervals.map((value, index) => <li key={`${value.start_at}/${value.end_at}/${index}`} className="kay-calendar-busy-entry"><strong>Occupé</strong><span>{localLabel(value.start_at)} à {localLabel(value.end_at)}</span></li>)}</ul>;
}
