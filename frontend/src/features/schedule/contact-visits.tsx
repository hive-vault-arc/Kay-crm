"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordSection } from "@/components/shared/record-workspace";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { calendarContextSchema, statusLabels, visitsSchema } from "./contracts";
import { monthShift } from "./calendar-model";
import { localLabel, resolveLocal } from "./time";

export function ContactVisits({ contactId, writable }: { contactId: string; writable: boolean }) {
  const clock = useQuery("/api/v1/calendar/context", calendarContextSchema);
  return <RecordSection title="Visites" action={writable ? <Button action="visit" asChild variant="outline"><Link href={`/visits/new?contact_id=${contactId}`}>Planifier</Link></Button> : undefined}>
    {clock.error ? <RecordError error={clock.error} retry={clock.refresh} /> : clock.value ? <VisitMonth contactId={contactId} initial={clock.value.today.slice(0, 7)} /> : <p role="status">Chargement du calendrier…</p>}
  </RecordSection>;
}
function VisitMonth({ contactId, initial }: { contactId: string; initial: string }) {
  const [month, setMonth] = useState(initial);
  return <><Input type="month" aria-label="Mois des visites" min="2000-01" max="2100-12" value={month} onChange={event => { if (/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value); }} /><ResolvedMonth key={`${contactId}:${month}`} contactId={contactId} month={month} /></>;
}
function ResolvedMonth({ contactId, month }: { contactId: string; month: string }) {
  const [period, setPeriod] = useState<{ start_at: string; end_at: string }>();
  const [error, setError] = useState<ApiError>();
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([resolveLocal(`${month}-01T00:00`), resolveLocal(`${monthShift(`${month}-01`, 1)}T00:00`)]).then(([start, end]) => {
      if (cancelled) return;
      if (start.choices.length !== 1 || end.choices.length !== 1) { setError(new ApiError("DEPENDENCY_UNAVAILABLE", 503)); return; }
      setPeriod({ start_at: start.choices[0].instant, end_at: end.choices[0].instant }); setError(undefined);
    }).catch(reason => { if (!cancelled) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); });
    return () => { cancelled = true; };
  }, [month, retry]);
  return error ? <RecordError error={error} retry={() => setRetry(value => value + 1)} /> : period ? <MonthRows contactId={contactId} period={period} /> : <p role="status">Chargement du mois…</p>;
}
function MonthRows({ contactId, period }: { contactId: string; period: { start_at: string; end_at: string } }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath("visits", { ...period, contact_id: contactId, page, page_size: 5 }), visitsSchema);
  return query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des visites…</p> : <><p className="text-xs text-muted-foreground">{query.value.total} visite(s) ce mois-ci</p>{query.value.items.length ? <ul className="grid gap-2">{query.value.items.map(visit => <li key={visit.id} className="kay-support-entry"><Link className="inline-flex min-h-control items-center font-medium hover:underline" href={`/visits/${visit.id}`}>{visit.title}</Link><CrmStatusBadge state={visit.status}>{statusLabels[visit.status]}</CrmStatusBadge><p>{localLabel(visit.start_local)}</p><p>{visit.participants.map(person => person.display_name).join(", ")}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune visite pour ce mois.</p>}{query.value.total > query.value.page_size ? <NumberedPages compact label="Pages des visites du contact" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}</>;
}
