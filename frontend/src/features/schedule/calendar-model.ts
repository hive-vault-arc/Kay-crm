import type { Visit } from "./contracts";

export function calendarDay(value: string, offset = 0) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function weekStart(value: string) {
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
  return calendarDay(value, -(weekday === 0 ? 6 : weekday - 1));
}
export function monthShift(value: string, offset: number) {
  const date = new Date(`${value.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 10);
}
export function monthWeeks(value: string) {
  const first = `${value.slice(0, 7)}-01`, start = weekStart(first);
  const end = calendarDay(monthShift(first, 1), -1);
  return Array.from({ length: Math.ceil((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000 / 7 + 1 / 7) }, (_, index) =>
    Array.from({ length: 7 }, (_, day) => calendarDay(start, index * 7 + day)));
}
export function civilLabel(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}
export function weekLabel(days: string[]) {
  const first = days[0], last = days[6];
  return `${civilLabel(first, first.slice(0, 7) === last.slice(0, 7) ? { day: "numeric" } : { day: "numeric", month: "short" })} - ${civilLabel(last, { day: "numeric", month: "long", year: "numeric" })}`;
}
export const minuteOfDay = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
export function occursOn(visit: Visit, day: string) {
  return visit.start_local.slice(0, 10) <= day && (visit.end_local.slice(0, 10) > day || (visit.end_local.slice(0, 10) === day && visit.end_local.slice(11, 16) !== "00:00"));
}

export function dayEvents(visits: Visit[], day: string, minimumMinutes: number) {
  const source = visits.filter(visit => occursOn(visit, day)).map(visit => ({ visit,
    start: visit.start_local.slice(0, 10) < day ? 0 : minuteOfDay(visit.start_local.slice(11, 16)),
    end: visit.end_local.slice(0, 10) > day ? 1440 : minuteOfDay(visit.end_local.slice(11, 16)),
  })).sort((a, b) => a.start - b.start || a.visit.id.localeCompare(b.visit.id));
  type Event = typeof source[number] & { lane: number; lanes: number };
  const result: Event[] = [], group: Event[] = [], laneEnds: number[] = [];
  function flush() { for (const item of group) { item.lanes = laneEnds.length; result.push(item); } group.length = 0; laneEnds.length = 0; }
  for (const item of source) {
    if (group.length && laneEnds.every(end => end <= item.start)) flush();
    let lane = laneEnds.findIndex(end => end <= item.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = Math.max(item.end, item.start + minimumMinutes);
    group.push({ ...item, lane, lanes: 1 });
  }
  flush(); return result;
}

export function visitListPath(period: { start_at: string; end_at: string }, page: number, types: string[], statuses: string[]) {
  const params = new URLSearchParams({ ...period, page: String(page), page_size: "50", types: types.join(","), statuses: statuses.join(",") });
  return `/api/v1/visits?${params.toString()}` as const;
}
