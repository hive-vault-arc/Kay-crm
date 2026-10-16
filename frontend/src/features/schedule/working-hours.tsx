"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { policyEditSchema, policyPreviewSchema, policySchema, type Policy, type PolicyPreview } from "./contracts";
import { typeLabels } from "./contracts";
import { localLabel } from "./time";

const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type Window = Policy["working_windows"][number] & { key: string };
const keyed = (values: Policy["working_windows"]) => values.map((v, i) => ({ ...v, key: `loaded-${i}` }));
export function WorkingHours() {
  const query = useQuery("/api/v1/visit-schedule/policy", policySchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  return query.value ? <PolicyForm initial={query.value} /> : <p role="status">Chargement des horaires…</p>;
}
function PolicyForm({ initial }: { initial: Policy }) {
  const [works, setWorks] = useState(() => keyed(initial.working_windows)), [breaks, setBreaks] = useState(() => keyed(initial.lunch_breaks));
  const [capacity, setCapacity] = useState(String(initial.company_car_capacity_per_hour)), [version, setVersion] = useState(initial.version);
  const [preview, setPreview] = useState<PolicyPreview>(), [error, setError] = useState<ApiError>(), [busy, setBusy] = useState(false), [success, setSuccess] = useState(false), [current, setCurrent] = useState<Policy>();
  const hydrated = useHydrated(), attempt = useRef({ body: "", key: "" }), previewHeading = useRef<HTMLHeadingElement>(null);
  function changed() { setPreview(undefined); setSuccess(false); }
  async function submit(save: boolean) {
    setBusy(true); setError(undefined); setSuccess(false);
    const body = policyEditSchema.safeParse({ expected_version: version, company_car_capacity_per_hour: Number(capacity), working_windows: works.map(({ weekday, start_local, end_local }) => ({ weekday, start_local, end_local })), lunch_breaks: breaks.map(({ weekday, start_local, end_local }) => ({ weekday, start_local, end_local })) });
    if (!body.success) { setError(new ApiError("VALIDATION_ERROR", 422)); setBusy(false); return; }
    const values = save && preview ? { ...body.data, preview_hash: preview.preview_hash } : body.data;
    const serialized = JSON.stringify(values);
    if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    try {
      const result = await apiCommand(save ? "/api/v1/visit-schedule/policy" : "/api/v1/visit-schedule/policy/preview", values, policyPreviewSchema, attempt.current.key, save ? "PUT" : "POST");
      if (save) { setVersion(result.policy.version); setPreview(undefined); setSuccess(true); }
      else { setPreview(result); requestAnimationFrame(() => previewHeading.current?.focus()); }
    } catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
      if (["VERSION_CONFLICT", "SCHEDULE_REPREVIEW_REQUIRED"].includes(failure.code)) { setPreview(undefined); try { setCurrent(await apiGet("/api/v1/visit-schedule/policy", policySchema)); } catch { /* The existing error and draft stay visible. */ } }
    } finally { setBusy(false); }
  }
  return <form noValidate aria-label="Horaires de travail" onSubmit={event => { event.preventDefault(); void submit(false); }} className="form-surface grid min-w-0 gap-6"><p>Heure de l’agence : Africa/Casablanca. Les visites au bureau restent possibles à toute heure. Une journée sans plage est fermée aux visites hors bureau.</p><fieldset disabled={!hydrated || busy} className="grid min-w-0 gap-6"><div className="grid max-w-entry gap-2"><Label htmlFor="car-capacity">Visites avec véhicule de société par heure</Label><Input id="car-capacity" type="number" min={1} max={1000} step={1} value={capacity} onChange={e => { setCapacity(e.target.value); changed(); }} /><p className="text-sm text-muted-foreground">Limite pour toute l’agence. Chaque heure touchée compte, sauf l’heure exacte de fin.</p></div>
    {days.map((day, index) => <section key={day} className="grid min-w-0 gap-4 border-t pt-6" aria-label={day}><h2 className="text-section font-medium">{day}</h2><WindowRows day={index+1} name="Plage de travail" rows={works} update={setWorks} changed={changed} /><WindowRows day={index+1} name="Pause déjeuner" rows={breaks} update={setBreaks} changed={changed} />{!works.some(w => w.weekday === index+1) ? <p className="text-sm text-muted-foreground">Fermé aux nouvelles visites hors bureau.</p> : null}</section>)}
    {error ? <RecordError error={error} /> : null}{current ? <section className="grid gap-2"><p>Version actuelle {current.version}, capacité {current.company_car_capacity_per_hour}. Votre proposition est conservée.</p><Button action="compare" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setVersion(current.version); setCurrent(undefined); setError(undefined); }}>Comparer à nouveau avec cette version</Button></section> : null}
    <Button action="preview" type="submit" className="justify-self-start">{busy ? "Vérification…" : "Prévisualiser l’impact"}</Button>
    {preview ? <section className="grid gap-4 border-t pt-6" aria-label="Impact du changement"><h2 ref={previewHeading} tabIndex={-1} className="text-section font-medium">{preview.affected_total} visite(s) future(s) à revoir</h2><p>Aucune visite ne sera déplacée ni annulée. La capacité sera revérifiée au moment de chaque nouvelle réservation.</p><ul className="grid gap-4">{preview.affected.map(v => <li key={v.id} className="grid gap-2 border-b pb-4"><span className="font-medium wrap-anywhere">{v.title}</span><span>{typeLabels[v.type]} : {localLabel(v.start_at)}</span><span className="text-warning">{new ApiError(v.code, 409).message}</span></li>)}</ul>{preview.affected_total > preview.affected.length ? <p>Les {preview.affected.length} premières visites sont affichées. Le calendrier permet de parcourir la suite.</p> : null}<Button action="save" type="button" className="justify-self-start" onClick={() => void submit(true)}>Enregistrer les horaires</Button></section> : null}
    {success ? <p role="status" className="text-success">Horaires enregistrés. Les visites existantes sont conservées.</p> : null}</fieldset></form>;
}
function WindowRows({ day, name, rows, update, changed }: { day: number; name: string; rows: Window[]; update: (rows: Window[]) => void; changed: () => void }) {
  const values = rows.filter(w => w.weekday === day);
  return <div className="grid min-w-0 gap-4"><h3 className="font-medium">{name}</h3>{values.map((row, index) => <div key={row.key} className="grid min-w-0 gap-4 sm:grid-cols-3"><div className="grid min-w-0 gap-2"><Label htmlFor={`${name}-${day}-${row.key}-start`}>{name} {index+1} : début</Label><Input id={`${name}-${day}-${row.key}-start`} type="time" value={row.start_local} onChange={e => { update(rows.map(w => w === row ? { ...w, start_local: e.target.value } : w)); changed(); }} /></div><div className="grid min-w-0 gap-2"><Label htmlFor={`${name}-${day}-${row.key}-end`}>{name} {index+1} : fin</Label><Input id={`${name}-${day}-${row.key}-end`} type="time" value={row.end_local} onChange={e => { update(rows.map(w => w === row ? { ...w, end_local: e.target.value } : w)); changed(); }} /></div><Button action="remove" type="button" variant="outline" className="self-end justify-self-start" aria-label={`Retirer ${name.toLowerCase()} ${index+1} ${days[day-1]}`} onClick={() => { update(rows.filter(w => w !== row)); changed(); }}>Retirer</Button></div>)}<Button action="add" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" disabled={rows.length >= 42} onClick={() => { update([...rows, { key: crypto.randomUUID(), weekday: day, start_local: "", end_local: "" }]); changed(); }}>Ajouter {name.toLowerCase()} {days[day-1]}</Button></div>;
}
