import Link from "next/link";
import { AddIcon } from "@/components/icons";
import { civilLabel, occursOn } from "./calendar-model";
import { localLabel } from "./time";
import type { CalendarWorkItem } from "@/features/work/contracts";
import { CalendarPriority } from "./calendar-priority";
import { CalendarVisit } from "./calendar-visit";
import type { Visit } from "./contracts";

export function VisitWeekGrid({ days, visits, important = [], today }: { days: string[]; visits: Visit[]; important?: CalendarWorkItem[]; today?: string }) {
  return <div className="kay-calendar-week" role="region" aria-label="Visites de la semaine, défilement horizontal" tabIndex={0}><div className="kay-calendar-days">{days.map(day => <section key={day} className="kay-calendar-day" data-today={day === today} aria-label={civilLabel(day, { dateStyle: "full" })}>
    <Link className="kay-calendar-day-create" href={`/visits/new?date=${day}`} scroll={false} aria-label={`Planifier une visite le ${civilLabel(day, { dateStyle: "full" })}`}><span>{civilLabel(day, { weekday: "long" })}</span><strong>{civilLabel(day, { day: "numeric", month: "short" })}</strong><AddIcon size={16} aria-hidden="true" /></Link>
    <div className="kay-calendar-day-events" role="region" tabIndex={0} aria-label={`Visites du ${civilLabel(day, { dateStyle: "full" })}`}>{[
      ...visits.filter(visit => occursOn(visit, day)).map(visit => ({ at: visit.start_local, card: <CalendarVisit key={visit.id} visit={visit} tile day={day} /> })),
      ...important.filter(item => item.due_local.startsWith(day)).map(item => ({ at: item.due_local, card: <CalendarPriority key={item.id} item={item} tile /> })),
    ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)).map(event => event.card)}<Link className="kay-calendar-day-space" href={`/visits/new?date=${day}`} scroll={false} tabIndex={-1} aria-label={`Planifier une visite le ${civilLabel(day, { dateStyle: "full" })}`} /></div>
  </section>)}</div></div>;
}

export type BusyInterval = { start_at: string; end_at: string; busy: true };
export function BusyWeekGrid({ days, intervals, today }: { days: string[]; intervals: BusyInterval[]; today?: string }) {
  return <div className="kay-calendar-week" role="region" aria-label="Occupation CRM de la semaine, défilement horizontal" tabIndex={0}><div className="kay-calendar-days">{days.map(day => <section key={day} className="kay-calendar-day" data-today={day === today} aria-label={civilLabel(day, { dateStyle: "full" })}>
    <h2 className="kay-calendar-day-create"><span>{civilLabel(day, { weekday: "long" })}</span><strong>{civilLabel(day, { day: "numeric", month: "short" })}</strong></h2>
    <div className="kay-calendar-day-events" role="region" tabIndex={0} aria-label={`Occupation du ${civilLabel(day, { dateStyle: "full" })}`}>{intervals.filter(value => occursOn({ start_local: value.start_at, end_local: value.end_at }, day)).map((value, index) => <div className="kay-calendar-busy-entry" key={`${value.start_at}/${value.end_at}/${index}`}><strong>Occupé</strong><span>{localLabel(value.start_at)} à {localLabel(value.end_at)}</span></div>)}</div>
  </section>)}</div></div>;
}
