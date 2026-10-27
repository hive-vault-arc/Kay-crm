"use client";
import { useId, useRef, useState } from "react";
import { CalendarIcon, SettingsIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordEntry } from "@/components/shared/record-entry";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { policyEditSchema, policyPreviewSchema, policySchema, type Policy, type PolicyPreview } from "./contracts";
import { typeLabels } from "./contracts";
import { localLabel } from "./time";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const authorityErrors = new Set(["FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "NOT_FOUND"]);
type Window = Policy["working_windows"][number] & { key: string };
const keyed = (values: Policy["working_windows"]) => values.map((value, index) => ({ ...value, key: `loaded-${index}` }));
const plain = (values: Window[]) => values.map(({ weekday, start_local, end_local }) => ({ weekday, start_local, end_local }));

export function WorkingHours() {
  const query = useQuery("/api/v1/visit-schedule/policy", policySchema);
  const [saved, setSaved] = useState<Policy>(), [error, setError] = useState<ApiError>();
  const value = saved && (!query.value || saved.version > query.value.version) ? saved : query.value;
  const failure = query.error ?? error;
  if (failure) return <RecordError error={failure} retry={() => { setError(undefined); query.refresh(); }} />;
  if (!value) return <p role="status">Chargement des horaires…</p>;
  return <><div className="kay-settings-hours-layout"><section className="kay-surface kay-settings-form-card"><header className="kay-settings-panel-head"><CalendarIcon size={20} aria-hidden="true" /><div><h3>Semaine de travail</h3><p>Plages et pauses actuellement configurées.</p></div></header><WorkingWeek policy={value} /></section><aside className="kay-settings-support"><section className="kay-surface kay-settings-form-card"><header className="kay-settings-panel-head"><SettingsIcon size={20} aria-hidden="true" /><h3>Organisation des visites</h3></header><dl className="kay-settings-facts"><div><dt>Capacité avec véhicule</dt><dd>{value.company_car_capacity_per_hour} / heure</dd></div><div><dt>Fuseau horaire</dt><dd>{value.time_zone}</dd></div></dl><p className="mb-5 text-sm text-muted-foreground">Les plages et pauses sont définies séparément pour chaque jour.</p><RecordDrawer label="Plages et pauses par jour" title="Plages de travail et pauses" description="Prévisualisez les visites à revoir avant chaque enregistrement." action="visit">{(close, finish) => <PolicyForm initial={value} cancel={close} saved={policy => { setSaved(policy); finish(); }} denied={setError} />}</RecordDrawer></section><p className="text-sm text-muted-foreground">Les visites concernées sont prévisualisées avant l’application des nouveaux horaires. Les visites au bureau restent possibles à toute heure.</p></aside></div>{saved ? <p role="status" className="text-success">Horaires enregistrés. Les visites existantes sont conservées.</p> : null}</>;
}
function WorkingWeek({ policy }: { policy: Policy }) {
  return <dl className="kay-settings-schedule">{days.map((day, index) => {
    const windows = policy.working_windows.filter(row => row.weekday === index + 1), breaks = policy.lunch_breaks.filter(row => row.weekday === index + 1);
    return <div key={day}><dt>{day}</dt><dd>{windows.length ? <>{windows.map((row, number) => <span key={number}>{row.start_local}–{row.end_local}</span>)}{breaks.length ? <small>Pause · {breaks.map(row => `${row.start_local}–${row.end_local}`).join(" · ")}</small> : null}</> : <span className="text-muted-foreground">Fermé</span>}</dd></div>;
  })}</dl>;
}
function PolicyForm({ initial, saved, cancel, denied }: { initial: Policy; saved: (policy: Policy) => void; cancel: () => void; denied: (error: ApiError) => void }) {
  const [works, setWorks] = useState(() => keyed(initial.working_windows)), [breaks, setBreaks] = useState(() => keyed(initial.lunch_breaks));
  const [capacity, setCapacity] = useState(String(initial.company_car_capacity_per_hour)), [version, setVersion] = useState(initial.version);
  const [preview, setPreview] = useState<PolicyPreview>(), [previewBody, setPreviewBody] = useState("");
  const [error, setError] = useState<ApiError>(), [busy, setBusy] = useState(false), [current, setCurrent] = useState<Policy>();
  const hydrated = useHydrated(), id = useId(), attempt = useRef({ body: "", key: "" }), operation = useRef(false), previewHeading = useRef<HTMLHeadingElement>(null);
  const values = { company_car_capacity_per_hour: capacity, working_windows: plain(works), lunch_breaks: plain(breaks) };
  const draft = useDossierDraft(values, busy);
  const previewLease = useRef<{ signature: string; hash: string } | undefined>(undefined), edits = useRef(0);
  function changed() { edits.current += 1; previewLease.current = undefined; setPreview(undefined); setPreviewBody(""); }
  async function compare() {
    try { setCurrent(await apiGet("/api/v1/visit-schedule/policy", policySchema)); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if (authorityErrors.has(failure.code)) denied(failure); else setError(failure); }
  }
  async function submit(save: boolean) {
    if (!hydrated || operation.current || busy || current) return;
    operation.current = true; setBusy(true); setError(undefined);
    const body = policyEditSchema.safeParse({ ...values, company_car_capacity_per_hour: Number(capacity), expected_version: version });
    if (!body.success || save && (!preview || previewBody !== JSON.stringify(body.data) || previewLease.current?.signature !== previewBody || previewLease.current.hash !== preview.preview_hash)) { setError(new ApiError("VALIDATION_ERROR", 422)); setBusy(false); operation.current = false; return; }
    const command = save && preview ? { ...body.data, preview_hash: preview.preview_hash } : body.data;
    const serialized = JSON.stringify(command), requestedEdit = edits.current;
    if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    try {
      const result = await apiCommand(save ? "/api/v1/visit-schedule/policy" : "/api/v1/visit-schedule/policy/preview", command, policyPreviewSchema, attempt.current.key, save ? "PUT" : "POST");
      if (save) { draft.accept(); saved(result.policy); }
      else if (edits.current === requestedEdit) { previewLease.current = { signature: JSON.stringify(body.data), hash: result.preview_hash }; setPreview(result); setPreviewBody(JSON.stringify(body.data)); requestAnimationFrame(() => previewHeading.current?.focus()); }
    } catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
      if (authorityErrors.has(failure.code)) denied(failure);
      else if (["VERSION_CONFLICT", "SCHEDULE_REPREVIEW_REQUIRED"].includes(failure.code)) { changed(); await compare(); }
    } finally { operation.current = false; setBusy(false); }
  }
  return <form id={id} method="post" noValidate aria-label="Horaires de travail" aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} onSubmit={event => { event.preventDefault(); void submit(false); }} className="kay-drawer-form"><p className="text-sm text-muted-foreground">Africa/Casablanca. Une journée sans plage est fermée aux visites hors bureau. Les visites au bureau restent possibles à toute heure.</p><fieldset disabled={!hydrated || busy} className="kay-settings-policy-editor"><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-capacity`}>Visites avec véhicule par heure pour l’agence</Label><Input id={`${id}-capacity`} type="number" min={1} max={1000} step={1} value={capacity} onChange={event => { setCapacity(event.target.value); changed(); }} /><p className="text-xs text-muted-foreground">Chaque heure touchée compte, sauf l’heure exacte de fin.</p></div>
    {days.map((day, index) => <section key={day} className="kay-settings-policy-day" aria-label={day}><h3><CalendarIcon size={16} aria-hidden="true" />{day}</h3><div className="kay-settings-policy-groups"><WindowRows day={index + 1} name="Plages de travail" rows={works} update={setWorks} changed={changed} /><WindowRows day={index + 1} name="Pauses" rows={breaks} update={setBreaks} changed={changed} /></div>{!works.some(row => row.weekday === index + 1) ? <p className="text-xs text-muted-foreground">Fermé aux nouvelles visites hors bureau.</p> : null}</section>)}
    {error ? <RecordError error={error} /> : null}{current ? <section className="grid min-w-0 gap-3"><h3 className="font-medium">Version actuelle {current.version}</h3><p className="text-sm">Capacité {current.company_car_capacity_per_hour} par heure. Votre proposition est conservée ; comparez ces plages avant une nouvelle prévisualisation.</p><WorkingWeek policy={current} /><Button action="compare" type="button" variant="outline" className="h-auto min-h-control whitespace-normal" onClick={() => { setVersion(current.version); setCurrent(undefined); changed(); setError(undefined); }}>Prévisualiser à partir de cette version</Button></section> : null}
    {error && !current && !preview ? <Button action="compare" type="button" variant="outline" onClick={() => { if (operation.current) return; operation.current = true; setBusy(true); void compare().finally(() => { operation.current = false; setBusy(false); }); }}>Charger la version actuelle</Button> : null}
    <Button action="preview" type="submit" disabled={Boolean(current)} className="justify-self-start">{busy ? "Vérification…" : "Prévisualiser l’impact"}</Button>
    {preview ? <section className="kay-form-disclosure grid min-w-0 gap-4" aria-label="Impact du changement"><h2 ref={previewHeading} tabIndex={-1} className="font-medium">{preview.affected_total} visite(s) future(s) à revoir</h2><p className="text-sm">Aucune visite ne sera déplacée ni annulée. La capacité sera revérifiée au moment de chaque nouvelle réservation.</p><ul className="grid gap-3">{preview.affected.map(visit => <li key={visit.id}><RecordEntry title={visit.title} meta={[{ label: "Type", value: typeLabels[visit.type] }, { label: "Début", value: localLabel(visit.start_at) }]}><p className="text-warning">{new ApiError(visit.code, 409).message}</p></RecordEntry></li>)}</ul>{preview.affected_total > preview.affected.length ? <p className="text-sm">Les {preview.affected.length} premières visites sont affichées. Le calendrier permet de parcourir la suite.</p> : null}<Button action="save" type="button" onClick={() => void submit(true)}>Enregistrer les horaires</Button></section> : null}
    </fieldset><div className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button></div></form>;
}
function WindowRows({ day, name, rows, update, changed }: { day: number; name: string; rows: Window[]; update: (rows: Window[]) => void; changed: () => void }) {
  return <section className="grid min-w-0 gap-3"><h4 className="text-xs font-medium text-muted-foreground">{name}</h4>{rows.filter(row => row.weekday === day).map((row, index) => <div key={row.key} className="kay-settings-window-row"><div className="grid min-w-0 gap-2"><Label htmlFor={`${name}-${day}-${row.key}-start`}>Début <span className="sr-only">{name} {index + 1} {days[day - 1]}</span></Label><Input id={`${name}-${day}-${row.key}-start`} type="time" value={row.start_local} onChange={event => { update(rows.map(value => value === row ? { ...value, start_local: event.target.value } : value)); changed(); }} /></div><div className="grid min-w-0 gap-2"><Label htmlFor={`${name}-${day}-${row.key}-end`}>Fin <span className="sr-only">{name} {index + 1} {days[day - 1]}</span></Label><Input id={`${name}-${day}-${row.key}-end`} type="time" value={row.end_local} onChange={event => { update(rows.map(value => value === row ? { ...value, end_local: event.target.value } : value)); changed(); }} /></div><Button action="remove" type="button" variant="quiet" size="icon" aria-label={`Retirer ${name.toLowerCase()} ${index + 1} ${days[day - 1]}`} onClick={() => { update(rows.filter(value => value !== row)); changed(); }} /></div>)}<Button action="add" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" disabled={rows.length >= 42} onClick={() => { update([...rows, { key: crypto.randomUUID(), weekday: day, start_local: "", end_local: "" }]); changed(); }}>Ajouter {name === "Pauses" ? "une pause" : "une plage"}</Button></section>;
}
