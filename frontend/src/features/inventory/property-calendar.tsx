"use client";

import { useEffect, useId, useRef, useState } from "react";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { civilLabel, monthShift, monthWeeks } from "@/features/schedule/calendar-model";
import { periodLabels, propertyCalendarSchema, type PropertyPeriod } from "./period-contracts";
import { PropertyPeriodForm } from "./property-period-form";

const agencyMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit" });
const weekdays = [["Lun", "Lundi"], ["Mar", "Mardi"], ["Mer", "Mercredi"], ["Jeu", "Jeudi"], ["Ven", "Vendredi"], ["Sam", "Samedi"], ["Dim", "Dimanche"]];
const descriptions = {
  hold: "Une offre de location est réservée sans dates. Libérez cette réservation depuis son affaire avant d’ajouter une période.",
  rented: "Ce bien est loué sans date de fin dans le CRM.",
  sold: "Ce bien a été vendu.",
};
const periodColors = { booking: "bg-info-background text-info", closure: "bg-warning-background text-warning" };

export function PropertyCalendar({ id, writable, busy }: { id: string; writable: boolean; busy: boolean }) {
  const heading = useId();
  const monthHeading = useRef<HTMLHeadingElement>(null);
  const focusAfterSave = useRef(false);
  const [month, setMonth] = useState(() => agencyMonth.format(new Date()) + "-01");
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState("");
  const query = useQuery(queryPath(`properties/${id}/calendar`, { month }), propertyCalendarSchema);
  const value = query.value;
  const date = selected ?? (value?.today.slice(0, 7) === month.slice(0, 7) ? value.today : month);
  const chosen = value?.items.find(period => period.start_on <= date && date < period.end_on);
  const months = monthWeeks(month);
  const blocked = value?.undated_block;
  const todayMonth = value ? `${value.today.slice(0, 7)}-01` : month;
  const canAdd = writable && value && !blocked;
  useEffect(() => {
    if (focusAfterSave.current && value && !busy) {
      focusAfterSave.current = false;
      monthHeading.current?.focus();
    }
  }, [value, busy]);
  const dayLabel = (day: string) => civilLabel(day, { day: "numeric", month: "long", year: "numeric" });

  function changeMonth(next: string) {
    setSelected(undefined);
    setNotice("");
    setMonth(next);
  }

  function onSaved(message: string) {
    focusAfterSave.current = true;
    setNotice(message);
    query.refreshQuietly();
  }

  return <RecordSection title="Réservations et fermetures"
    description="Les périodes sont en dates locales. La date de fin reste disponible pour une nouvelle réservation."
    action={canAdd ? <RecordDrawer label="Ajouter une période" action="create"
      description="Enregistrez une réservation ou bloquez des dates pour une fermeture." busy={busy}>
      {(close, done) => <PropertyPeriodForm id={id} date={date} version={value.version} close={close} conflict={query.refreshQuietly}
        saved={() => { done(); onSaved("Période enregistrée."); }} />}
    </RecordDrawer> : undefined}>
    <div className="grid min-w-0 gap-4">
      {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
      {blocked ? <p role="status" className="rounded-md bg-warning-background p-3 text-sm text-warning">{descriptions[blocked]}</p> : null}
      <section className="grid min-w-0 gap-3" aria-labelledby={heading}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 ref={monthHeading} tabIndex={-1} id={heading} className="text-section capitalize" aria-live="polite">{civilLabel(month, { month: "long", year: "numeric" })}</h3>
          <div className="flex flex-wrap gap-1">
            <Button type="button" action="visit" variant="quiet" disabled={!value || month === todayMonth}
              onClick={() => changeMonth(todayMonth)}>Ce mois-ci</Button>
            <Button type="button" action="previous" size="icon" variant="outline" aria-label="Mois précédent"
              disabled={month <= "2000-01-01"} onClick={() => changeMonth(monthShift(month, -1))} />
            <Button type="button" action="next" size="icon" variant="outline" aria-label="Mois suivant"
              disabled={month >= "2100-12-01"} onClick={() => changeMonth(monthShift(month, 1))} />
          </div>
        </div>
        {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !value
          ? <div role="status"><span className="sr-only">Chargement du calendrier…</span><Skeleton className="h-48 w-full" /></div>
          : <div className="grid min-w-0 grid-cols-7 gap-0.5 text-center">
            {weekdays.map(([short, full]) => <span key={short} className="py-1 text-xs font-medium text-muted-foreground"><span aria-hidden="true">{short}</span><span className="sr-only">{full}</span></span>)}
            {months.flat().map(day => {
              if (!day.startsWith(month.slice(0, 7))) return <span key={day} aria-hidden="true" />;
              const period = value.items.find(item => item.start_on <= day && day < item.end_on);
              const label = period ? periodLabels[period.kind] : blocked && day >= value.today ? "Indisponible" : "Disponible";
              return <Button key={day} type="button" variant="ghost" data-control="calendar-day"
                className={`min-h-control min-w-0 px-0 tabular-nums ${period ? periodColors[period.kind] : blocked && day >= value.today ? "bg-muted text-muted-foreground" : ""} ${day === date ? "ring-1 ring-inset ring-current" : ""}`}
                aria-label={`${dayLabel(day)} · ${label}`} aria-pressed={day === date}
                aria-current={day === value.today ? "date" : undefined}
                onClick={() => setSelected(day)}>{Number(day.slice(-2))}</Button>;
            })}
          </div>}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(periodLabels).map(([kind, label]) => <span key={kind}
            className={`rounded-full px-2 py-1 ${periodColors[kind as PropertyPeriod["kind"]]}`}>{label}</span>)}
        </div>
      </section>
      {value ? <div className="grid min-w-0 gap-3">
        <p aria-live="polite" className="text-sm"><strong>{dayLabel(date)}</strong> · {chosen ? periodLabels[chosen.kind] : blocked && date >= value.today ? "Indisponible" : "Disponible"}</p>
        <h3 className="text-section">Périodes du mois</h3>
        {value.items.length ? <ul className="grid min-w-0 gap-2">
          {value.items.map(period => <li key={period.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div className="grid min-w-0 gap-1 text-sm">
              <strong>{periodLabels[period.kind]}</strong>
              <p>Du {dayLabel(period.start_on)} au {dayLabel(period.end_on)} (fin exclue)</p>
              {period.note ? <p className="whitespace-pre-wrap wrap-anywhere text-muted-foreground">{period.note}</p> : null}
            </div>
            {writable ? <div className="flex flex-wrap gap-1">
              {!blocked ? <RecordDrawer label="Modifier la période" action="edit" busy={busy} description="Modifiez les dates, le type ou la note de cette période.">
                {(close, done) => <PropertyPeriodForm id={id} date={date} version={value.version} period={period} close={close} conflict={query.refreshQuietly}
                  saved={() => { done(); onSaved("Période modifiée."); }} />}
              </RecordDrawer> : null}
              <RecordDrawer label="Annuler la période" action="cancelRecord" busy={busy}
                description="Les dates seront libérées. L’annulation restera dans l’historique du bien.">
                {(close, done) => <PropertyPeriodForm id={id} date={date} version={value.version} period={period} cancel close={close}
                  saved={() => { done(); onSaved("Période annulée."); }} />}
              </RecordDrawer>
            </div> : null}
          </li>)}
        </ul> : <p className="text-sm text-muted-foreground">Aucune réservation ni fermeture enregistrée ce mois-ci.</p>}
      </div> : null}
    </div>
  </RecordSection>;
}
