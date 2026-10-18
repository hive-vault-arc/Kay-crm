"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { activityKinds, activityResultSchema, directionLabels, kindLabels, newActivitySchema } from "./contracts";

export function ActivityForm({ path, saved, cancel }: { path: `/api/v1/${string}`; saved: () => void; cancel: () => void }) {
  const id = useId(), lock = useRef(false), attempt = useRef({ fingerprint: "", key: "" });
  const [busy, setBusy] = useState(false), [invalid, setInvalid] = useState(""), [error, setError] = useState<ApiError>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const parsed = newActivitySchema.safeParse({ kind: form.get("kind"), body: form.get("body"), duration_minutes: form.get("duration") ? Number(form.get("duration")) : null, direction: form.get("direction") || null, projects: [1, 2, 3].map(index => String(form.get(`project${index}`) ?? "").trim()).filter(Boolean) });
    if (!parsed.success) { setInvalid("Renseignez une note et vérifiez les champs. Les projets doivent être distincts."); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError(undefined); setInvalid("");
    try { await apiCommand(path, parsed.data, activityResultSchema, attempt.current.key); saved(); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form onSubmit={submit} aria-label="Nouvelle activité" className="grid gap-4 rounded-md border bg-card p-4">
    <div className="grid gap-4 md:grid-cols-3">
      <div className="grid gap-2"><Label htmlFor={`${id}-kind`}>Type d’activité</Label><NativeSelect id={`${id}-kind`} name="kind" disabled={busy}>{activityKinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-duration`}>Durée (minutes, facultative)</Label><Input id={`${id}-duration`} name="duration" type="number" min={1} max={1440} step={1} disabled={busy} /></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-direction`}>Sens de l’échange</Label><NativeSelect id={`${id}-direction`} name="direction" disabled={busy}><option value="">Non précisé</option>{Object.entries(directionLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
    </div>
    <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(index => <div key={index} className="grid gap-2"><Label htmlFor={`${id}-project${index}`}>Projet évoqué {index} (facultatif)</Label><Input id={`${id}-project${index}`} name={`project${index}`} maxLength={160} disabled={busy} /></div>)}</div>
    <p className="text-sm text-muted-foreground">Ces libellés gardent le contexte de l’échange, sans modifier les projets ni le stock.</p>
    <div className="grid gap-2"><Label htmlFor={`${id}-body`}>Notes de suivi</Label><Textarea id={`${id}-body`} name="body" required maxLength={4000} rows={4} disabled={busy} autoFocus aria-describedby={`${id}-help`} /><p id={`${id}-help`} className="text-sm text-muted-foreground">Auteur et date enregistrés automatiquement. L’activité restera dans l’historique, sans modification ni suppression.</p></div>
    {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}
    {error ? <div className="grid gap-2"><RecordError error={error} /><p>Votre saisie est conservée. Réessayez sans la modifier si la réponse a été interrompue.</p></div> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button action="close" type="button" variant="outline" disabled={busy} onClick={cancel}>Annuler</Button><Button action="save" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l’activité"}</Button></div>
  </form>;
}
