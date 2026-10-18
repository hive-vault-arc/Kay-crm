import Link from "next/link";
import tokens from "../../../../branding/kay-ui-tokens.json";
import { statusLabels, typeLabels, type Policy, type Visit } from "./contracts";
import { civilLabel, dayEvents, minuteOfDay } from "./calendar-model";
import { localLabel } from "./time";
import { visitIcons, VisitStatus } from "./calendar-visit";

const geometry = tokens.layoutPx;
export function VisitWeekGrid({ days, visits, policy, today }: { days: string[]; visits: Visit[]; policy?: Policy; today?: string }) {
  const columns = days.map(day => dayEvents(visits, day, tokens.controlPx.touchTarget / geometry.calendarHour * 60));
  const items = columns.flat();
  const from = Math.min(8, ...items.map(item => Math.floor(item.start / 60)));
  const to = Math.max(18, ...items.map(item => Math.ceil(item.end / 60)));
  const hours = Array.from({ length: to - from }, (_, index) => from + index);
  const dayWidth = Math.max(geometry.calendarDayMin, ...items.map(item => item.lanes * geometry.calendarLaneMin + geometry.calendarInset * 2));
  const gridTemplateColumns = `var(--layout-calendar-time-rail) repeat(7,minmax(${dayWidth / 16}rem,1fr))`;
  return <div className="calendar-week-grid min-w-0 overflow-auto rounded-md border bg-card" role="region" aria-label="Grille horaire de la semaine, défilement horizontal et vertical" tabIndex={0}>
    <div style={{ gridTemplateColumns }} className="calendar-week-header sticky top-0 z-20 grid border-b bg-card"><span className="sr-only">Heure</span><div aria-hidden="true" />{days.map((day, index) => <h2 key={day} className="calendar-day-heading border-l text-center" data-today={day === today} data-weekend={index > 4}>
      <span className="font-sans text-xs font-medium capitalize">{civilLabel(day, { weekday: "long" })}</span><span className="calendar-date-number">{Number(day.slice(8))}</span><span className="font-sans text-xs capitalize">{civilLabel(day, { month: "short" })}</span>
    </h2>)}</div>
    <div style={{ gridTemplateColumns }} className="grid"><div>{hours.map(hour => <div key={hour} className="calendar-hour border-b px-2 pt-1 text-xs text-muted-foreground tabular-nums">{String(hour).padStart(2, "0")}:00</div>)}</div>
      {days.map((day, index) => <div key={day} className="calendar-day relative min-w-0 border-l" data-weekend={index > 4} style={{ height: `${hours.length * geometry.calendarHour / 16}rem` }}>
        {hours.map(hour => <div key={hour} aria-hidden="true" className="calendar-hour border-b" />)}
        {policy?.lunch_breaks.filter(pause => pause.weekday === index + 1).map((pause, pauseIndex) => <div key={pauseIndex} className="calendar-pause absolute inset-x-0 overflow-hidden border-y bg-muted/70 px-1 pt-2 text-center text-xs text-muted-foreground" style={{ top: `${(minuteOfDay(pause.start_local) - from * 60) / 60 * geometry.calendarHour / 16}rem`, height: `${(minuteOfDay(pause.end_local) - minuteOfDay(pause.start_local)) / 60 * geometry.calendarHour / 16}rem` }}>Pause</div>)}
        {columns[index].map(({ visit, start, end, lane, lanes }) => {
          const Icon = visitIcons[visit.type];
          const height = Math.max(tokens.controlPx.touchTarget, (end - start) / 60 * geometry.calendarHour - geometry.calendarInset);
          const label = `${visit.title}, ${visit.contact_name}, ${typeLabels[visit.type]}, ${statusLabels[visit.status]}, ${localLabel(visit.start_local)} à ${localLabel(visit.end_local)}`;
          return <Link key={visit.id} href={`/visits/${visit.id}`} title={label} aria-label={label} data-visit-kind={visit.type} data-status={visit.status} className="calendar-visit absolute z-10 rounded-sm" style={{ top: `${(start - from * 60) / 60 * geometry.calendarHour / 16}rem`, height: `${height / 16}rem`, left: `calc(${lane / lanes * 100}% + ${geometry.calendarInset * 2 / 16}rem)`, width: `calc(${100 / lanes}% - ${geometry.calendarInset * 2 / 16}rem)` }}>
            <div className="flex h-full min-w-0 gap-2 overflow-hidden px-2 py-1"><Icon aria-hidden="true" className="calendar-kind-icon mt-0.5 size-5 shrink-0" /><div className="min-w-0 flex-1"><span className="block truncate font-semibold">{visit.start_local.slice(0, 10) < day ? "Suite" : visit.start_local.slice(11, 16)}</span><span className="block truncate">{visit.title}</span>{height >= 56 ? <VisitStatus status={visit.status} /> : null}{visit.review_code && height >= 76 ? <span className="block text-warning">À revoir</span> : null}</div></div>
          </Link>;
        })}
      </div>)}
    </div>
  </div>;
}
