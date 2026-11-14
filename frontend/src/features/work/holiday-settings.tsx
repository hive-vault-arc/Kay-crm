"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarIcon } from "@/components/icons";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordEntry } from "@/components/shared/record-entry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { formatInstant } from "@/lib/format";
import { resultSchema } from "./contracts";
import { holidayConfirmationSchema, holidaySettingsSchema, holidaySpan, type Holiday } from "./holiday-contracts";

const state = {
  pending: ["En attente de date", "draft"],
  estimated: ["Date prévisionnelle", "in_progress"],
  fixed: ["Date fixe", "active"],
  confirmed: ["Confirmée par une source officielle", "active"],
  manual: ["Confirmée par l’administration", "active"],
} as const;
const providerLabels = { moroccoapi: "MoroccoAPI", agenda: "Agenda Maroc" };
const errors = {
  UNSUPPORTED_YEAR: "Année non publiée",
  FEED_UNAVAILABLE: "Source indisponible",
  INVALID_FEED: "Réponse invalide",
};

export function HolidaySettings({ actorId }: { actorId: string }) {
  const query = useQuery("/api/v1/work/holidays", holidaySettingsSchema);
  const [notice, setNotice] = useState("");
  const { value, error } = query;
  const years = [...new Set(value?.items.map(item => item.year))];
  return <>
    <header className="kay-settings-content-head"><div>
      <h2>Jours fériés</h2>
      <p>Dates au Maroc et rappels internes à l’équipe.</p>
    </div></header>
    <div className="grid min-w-0 gap-4">
      {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
      {error ? <RecordError error={error} retry={query.refresh} /> : null}
      {!value && !error ? <div role="status" className="kay-surface kay-settings-form-card grid gap-3"><span className="sr-only">Chargement des jours fériés…</span><Skeleton className="h-6 w-44" /><Skeleton className="h-24 w-full" /></div> : null}
      {value ? <>
        {!value.enabled ? <p className="kay-surface kay-settings-form-card text-sm">La synchronisation et l’envoi des rappels sont désactivés.</p> : null}
        <section className="kay-surface kay-settings-form-card" aria-labelledby="holiday-sync">
          <header className="kay-settings-panel-head"><CalendarIcon size={20} aria-hidden="true" /><h3 id="holiday-sync">Synchronisation des sources</h3></header>
          {value.sync.length ? <dl className="grid gap-3 sm:grid-cols-2">{value.sync.map(row => <div key={`${row.provider}-${row.year}`} className="min-w-0">
            <dt className="text-sm font-medium">{providerLabels[row.provider]} · {row.year}</dt>
            <dd className="text-sm text-muted-foreground">{row.succeeded_at ? <>Dernier succès · <time dateTime={row.succeeded_at}>{formatInstant(row.succeeded_at)}</time></> : "Aucune synchronisation réussie."}</dd>
            {row.error_code ? <dd className="text-sm text-warning">{errors[row.error_code]} · {formatInstant(row.attempted_at)}</dd> : null}
          </div>)}</dl> : <p className="text-sm text-muted-foreground">Aucune synchronisation enregistrée.</p>}
        </section>
        {!years.length ? <p className="text-sm text-muted-foreground">Aucun jour férié disponible pour le moment.</p> : years.map(year => <section key={year} className="grid min-w-0 gap-3" aria-label={`Jours fériés ${year}`}>
          <h3 className="text-section">{year}</h3>
          <ul className="grid min-w-0 gap-3 xl:grid-cols-2">{value.items.filter(item => item.year === year).map(item => <li key={item.id} className="min-w-0">
            <RecordEntry title={item.name} icon={CalendarIcon} status={<CrmStatusBadge state={state[item.status][1]}>{state[item.status][0]}</CrmStatusBadge>} meta={[{ label: "Date", value: item.start_on && item.end_on ? holidaySpan(item.start_on, item.end_on) : "À confirmer" }]}
              actions={<><Button action="forward" asChild variant="quiet"><a href={item.source_url} target="_blank" rel="noopener noreferrer">Ouvrir la source</a></Button>{value.enabled && item.category === "religious" ? <RecordDrawer action="edit" label={`${item.status === "confirmed" || item.status === "manual" ? "Corriger" : "Confirmer"} · ${item.name}`} title="Confirmer la date officielle" description="Saisissez les dates indiquées dans le communiqué officiel.">{(close, finish) =>
                <HolidayForm initial={item} actorId={actorId} cancel={close} saved={() => { setNotice(`${item.name} · date officielle enregistrée.`); query.refreshQuietly(); finish(); }} />
              }</RecordDrawer> : null}</>} />
          </li>)}</ul>
        </section>)}
      </> : null}
    </div>
  </>;
}

function HolidayForm({ initial: current, actorId, cancel, saved }: { initial: Holiday; actorId: string; cancel: () => void; saved: () => void }) {
  const id = useId();
  const [initial] = useState(current);
  const [fields, setFields] = useState({
    start_on: initial.start_on ?? "",
    end_on: initial.end_on ?? "",
    source_url: initial.status === "confirmed" || initial.status === "manual" ? initial.source_url : "",
  });
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState<ApiError>();
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  const pending = useRef<{ key: string; payload: string } | null>(null);
  const draft = useDossierDraft(fields, busy);
  const changed = current.version !== initial.version || problem?.code === "VERSION_CONFLICT";
  const locked = busy || changed || problem?.status === 403;
  const edit = (name: keyof typeof fields, value: string) => setFields(previous => ({ ...previous, [name]: value }));
  async function submit() {
    if (locked || request.current) return;
    const body = holidayConfirmationSchema.safeParse({ ...fields, end_on: fields.end_on || fields.start_on, expected_version: initial.version });
    if (!body.success) { setProblem(new ApiError("VALIDATION_ERROR", 422)); return; }
    const payload = JSON.stringify(body.data);
    if (pending.current?.payload !== payload) pending.current = { key: crypto.randomUUID(), payload };
    const abort = new AbortController();
    request.current = abort;
    setBusy(true);
    setProblem(undefined);
    try {
      await apiCommand(`/api/v1/work/holidays/${initial.id}/confirm`, body.data, resultSchema, pending.current.key, "POST", undefined, abort.signal, {
        beforeDispatch(identity) {
          if (identity.user.id !== actorId || identity.user.role !== "administrator") throw new ApiError("FORBIDDEN", 403);
        },
      });
      if (abort.signal.aborted) return;
      draft.accept(fields);
      saved();
    } catch (error) {
      if (!abort.signal.aborted) setProblem(error instanceof ApiError ? error : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally { request.current = null; if (!abort.signal.aborted) setBusy(false); }
  }
  return <form method="post" className="kay-drawer-form" aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <fieldset disabled={locked} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="grid min-w-0 gap-2"><Label htmlFor={id + "-start"}>Premier jour</Label><Input id={id + "-start"} type="date" min={`${initial.year}-01-01`} max={`${initial.year}-12-31`} required value={fields.start_on} onChange={event => edit("start_on", event.target.value)} /></div>
      <div className="grid min-w-0 gap-2"><Label htmlFor={id + "-end"}>Dernier jour (facultatif)</Label><Input id={id + "-end"} type="date" min={fields.start_on || `${initial.year}-01-01`} value={fields.end_on} onChange={event => edit("end_on", event.target.value)} /></div>
      <div className="grid min-w-0 gap-2 sm:col-span-2"><Label htmlFor={id + "-source"}>Lien du communiqué officiel</Label><Input id={id + "-source"} type="url" maxLength={2048} required value={fields.source_url} onChange={event => edit("source_url", event.target.value)} placeholder="https://habous.gov.ma/…" aria-describedby={id + "-hint"} /><p id={id + "-hint"} className="text-xs text-muted-foreground">Utilisez un lien du ministère des Habous ou du portail officiel marocain.</p></div>
    </fieldset>
    {changed ? <p role="alert" className="text-sm text-destructive">Cette date a été modifiée entre-temps. Fermez ce formulaire puis ouvrez la version actuelle.</p> : problem?.code === "HOLIDAYS_DISABLED" ? <p role="alert" className="text-sm text-destructive">Le traitement des jours fériés est désactivé.</p> : problem ? <RecordError error={problem} /> : null}
    <div className="kay-form-footer">
      <Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button>
      <Button action="save" type="submit" disabled={locked}>{busy ? "Enregistrement…" : "Enregistrer la date"}</Button>
    </div>
  </form>;
}
