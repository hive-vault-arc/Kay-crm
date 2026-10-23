"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ClockIcon, CompletedIcon, CloseIcon } from "@/components/icons";
import { civilLabel, monthShift, monthWeeks, weekStart } from "./calendar-model";
import { statusLabels, typeLabels, visitStatusOrder, visitTypeOrder, type Policy, type Visit, type VisitPage } from "./contracts";
import { visitIcons } from "./calendar-visit";

export function MiniMonth({ date, today, choose }: { date: string; today: string; choose: (date: string) => void }) {
  const [month, setMonth] = useState(date);
  return <section aria-label="Choisir une semaine" className="grid gap-2">
    <div className="flex items-center justify-between gap-2"><h2 className="text-lg capitalize">{civilLabel(month, { month: "long", year: "numeric" })}</h2><div className="flex"><Button action="back" size="icon" variant="ghost" aria-label="Mois précédent" disabled={month.slice(0, 7) <= "2000-01"} onClick={() => setMonth(value => monthShift(value, -1))} /><Button action="forward" size="icon" variant="ghost" aria-label="Mois suivant" disabled={month.slice(0, 7) >= "2100-12"} onClick={() => setMonth(value => monthShift(value, 1))} /></div></div>
    <div className="calendar-month-week text-xs text-muted-foreground" aria-hidden="true">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(day => <span key={day}>{day}</span>)}</div>
    <div className="grid">{monthWeeks(month).map(days => <Button type="button" variant="ghost" key={days[0]} className="calendar-month-week calendar-month-choice min-h-control" aria-label={`Semaine du ${civilLabel(days[0], { day: "numeric", month: "long", year: "numeric" })}`} aria-pressed={weekStart(date) === days[0]} disabled={days[0] < "2000-01-03" || days[0] > "2100-12-20"} onClick={() => choose(days[0])}>
      {days.map(day => <span key={day} data-outside={day.slice(0, 7) !== month.slice(0, 7)} data-selected={day === date} data-today={day === today}>{Number(day.slice(8))}</span>)}
    </Button>)}</div>
  </section>;
}

const weekdayNames = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
function lunchRows(policy: Policy) {
  const groups = new Map<string, number[]>();
  for (const row of policy.lunch_breaks) {
    const key = `${row.start_local}-${row.end_local}`;
    groups.set(key, [...(groups.get(key) ?? []), row.weekday]);
  }
  return [...groups].map(([period, weekdays]) => {
    const ordered = weekdays.toSorted((a, b) => a - b);
    const labels = ordered.length > 1 && ordered.at(-1)! - ordered[0] === ordered.length - 1
      ? `${weekdayNames[ordered[0] - 1]}-${weekdayNames[ordered.at(-1)! - 1]}`
      : ordered.map(day => weekdayNames[day - 1]).join(", ");
    return `${period} · ${labels}`;
  });
}
export function CalendarSidebar({ date, today, choose, policy, value, types, statuses, toggleType, toggleStatus, rules }: {
  date: string; today: string; choose: (date: string) => void; policy?: Policy; value?: VisitPage;
  types: Visit["type"][]; statuses: Visit["status"][];
  toggleType: (type: Visit["type"]) => void; toggleStatus: (status: Visit["status"]) => void;
  rules: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return <div className="calendar-sidebar grid min-w-0 gap-3">
    <MiniMonth key={date.slice(0, 7)} date={date} today={today} choose={choose} />
    <fieldset className="calendar-filter-group"><legend>Type de visite</legend>{visitTypeOrder.map(type => {
      const Icon = visitIcons[type];
      return <label key={type} className="calendar-filter min-h-control" data-visit-kind={type}><Checkbox checked={types.includes(type)} onCheckedChange={() => toggleType(type)} aria-label={typeLabels[type]} /><Icon aria-hidden="true" className="calendar-kind-icon size-5" /><span className="min-w-0 flex-1">{typeLabels[type]}</span><span className="text-xs tabular-nums text-muted-foreground">{value ? value.type_counts[type] : "…"}</span></label>;
    })}</fieldset>
    <fieldset className="calendar-filter-group"><legend>Statut</legend>{visitStatusOrder.filter(status => !value || status === "scheduled" || status === "confirmed" || value.status_counts[status] > 0).map(status => {
      const Icon = status === "confirmed" || status === "completed" ? CompletedIcon : status === "cancelled" || status === "not_completed" ? CloseIcon : ClockIcon;
      return <label key={status} className="calendar-filter min-h-control" data-calendar-status={status}><Checkbox checked={statuses.includes(status)} onCheckedChange={() => toggleStatus(status)} aria-label={status === "draft" ? "Brouillon" : statusLabels[status]} /><Icon aria-hidden="true" className="calendar-status-icon size-5" /><span className="min-w-0 flex-1">{status === "draft" ? "Brouillon" : statusLabels[status]}</span><span className="text-xs tabular-nums text-muted-foreground">{value ? value.status_counts[status] : "…"}</span></label>;
    })}</fieldset>
    <section className="calendar-lunch rounded-md border bg-muted p-3"><div className="flex gap-3"><ClockIcon aria-hidden="true" className="size-6 shrink-0 text-link" /><div className="grid min-w-0 gap-1"><h3 className="font-sans text-sm font-semibold">Pause déjeuner</h3>{!policy ? <p className="text-xs">Chargement des règles…</p> : !policy.lunch_breaks.length ? <p className="text-xs">Pas de pause configurée.</p> : lunchRows(policy).map(row => <p key={row} className="text-xs wrap-anywhere">{row}</p>)}</div></div><Button action="settings" variant="ghost" className="mt-3 w-full justify-start border-t text-link" onClick={rules}>Règles et disponibilités</Button></section>
  </div>;
}
