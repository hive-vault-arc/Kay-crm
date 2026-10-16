import Link from "next/link";
import { dayLabel, localLabel } from "./time";
import { statusLabels, typeLabels, type Policy, type Visit } from "./contracts";

const tones = { office: "bg-accent text-accent-foreground", without_company_car: "bg-info-background text-info", company_car: "bg-warning-background text-warning" };
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

export function VisitWeekGrid({ days, visits, policy }: { days: string[]; visits: Visit[]; policy?: Policy }) {
  const from = Math.min(8, ...visits.map(visit => visit.start_local.slice(0, 10) < days[0] ? 0 : Math.floor(minutes(visit.start_local.slice(11, 16)) / 60)));
  const to = Math.max(19, ...visits.map(visit => visit.end_local.slice(0, 10) > visit.start_local.slice(0, 10) ? 24 : Math.ceil(minutes(visit.end_local.slice(11, 16)) / 60)));
  const hours = Array.from({ length: to - from }, (_, index) => from + index), height = hours.length * 64;
  const columns = days.map(day => {
        const endAt: number[] = [];
        const items = visits.filter(visit => visit.start_local.slice(0, 10) <= day && (visit.end_local.slice(0, 10) > day || visit.end_local.slice(0, 10) === day && visit.end_local.slice(11, 16) !== "00:00"))
          .map(visit => ({ visit, start: visit.start_local.slice(0, 10) < day ? 0 : minutes(visit.start_local.slice(11, 16)), end: visit.end_local.slice(0, 10) > day ? 1440 : minutes(visit.end_local.slice(11, 16)) }))
          .sort((a, b) => a.start - b.start || a.visit.id.localeCompare(b.visit.id))
          .map(item => { let lane = endAt.findIndex(end => end <= item.start); if (lane < 0) lane = endAt.length; endAt[lane] = Math.max(item.end, item.start + 44); return { ...item, lane }; });
        return { items, lanes: Math.max(1, endAt.length) };
  });
  // Preserve 44px appointment targets; dense overlap scrolls inside this named grid.
  const dayWidth = Math.max(96, ...columns.map(column => column.lanes * 48 + 4));
  const gridTemplateColumns = `3.5rem repeat(7,minmax(${dayWidth}px,1fr))`;
  return <div className="hidden min-w-0 overflow-auto rounded-md border bg-card xl:block" style={{ maxHeight: "38rem" }} role="region" aria-label="Grille horaire de la semaine, défilement horizontal et vertical" tabIndex={0}>
    <div style={{ gridTemplateColumns }} className="sticky top-0 z-20 grid border-b bg-card"><span className="p-3 text-xs text-muted-foreground">Heure</span>{days.map(day => <h2 key={day} className="border-l px-2 py-3 text-center text-xs font-semibold capitalize">{dayLabel(day)}</h2>)}</div>
    <div style={{ gridTemplateColumns }} className="grid">
      <div>{hours.map(hour => <div key={hour} className="h-16 border-b px-2 pt-1 text-xs text-muted-foreground tabular-nums">{String(hour).padStart(2, "0")}:00</div>)}</div>
      {days.map((day, dayIndex) => {
        const { items, lanes } = columns[dayIndex];
        return <div key={day} className="relative min-w-0 border-l" style={{ height }}>
          {hours.map(hour => <div key={hour} aria-hidden="true" className="h-16 border-b" />)}
          {policy?.lunch_breaks.filter(pause => pause.weekday === dayIndex + 1).map((pause, index) => <div key={index} className="absolute inset-x-0 overflow-hidden border-y border-dashed bg-muted/80 px-1 text-center text-xs text-muted-foreground" style={{ top: (minutes(pause.start_local) - from * 60) / 60 * 64, height: (minutes(pause.end_local) - minutes(pause.start_local)) / 60 * 64 }}><span>Pause</span></div>)}
          {items.map(({ visit, start, end, lane }) => <Link key={visit.id} href={`/visits/${visit.id}`} title={`${visit.title} · ${visit.contact_name} · ${typeLabels[visit.type]} · ${statusLabels[visit.status]} · ${localLabel(visit.start_local)} à ${localLabel(visit.end_local)}`} aria-label={`${visit.title}, ${typeLabels[visit.type]}, ${statusLabels[visit.status]}, ${localLabel(visit.start_local)} à ${localLabel(visit.end_local)}`} className={`absolute z-10 grid min-h-control min-w-0 content-start gap-1 overflow-hidden rounded-sm border border-current/20 px-2 py-1 text-xs hover:brightness-95 ${tones[visit.type]} ${visit.status === "cancelled" ? "line-through" : ""}`} style={{ top: (start - from * 60) / 60 * 64, height: Math.max(44, (end - start) / 60 * 64 - 3), left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}>
            <span className="truncate font-semibold">{visit.start_local.slice(11, 16)} · {visit.title}</span><span className="truncate">{visit.contact_name}</span><span className="truncate">{typeLabels[visit.type]} · {statusLabels[visit.status]}</span>{visit.review_code ? <span>À revoir</span> : null}
          </Link>)}
        </div>;
      })}
    </div>
  </div>;
}
