"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
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
  const hydrated = useHydrated(), bodyInput = useRef<HTMLTextAreaElement>(null);
  const id = useId(), lock = useRef(false), attempt = useRef({ fingerprint: "", key: "" });
  const [busy, setBusy] = useState(false), [invalid, setInvalid] = useState(""), [error, setError] = useState<ApiError>();
  useEffect(() => { if (hydrated) bodyInput.current?.focus(); }, [hydrated]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!hydrated || lock.current) return;
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
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(error.code)) return <RecordError error={error} />;
  return <form method="post" onSubmit={submit} aria-busy={busy} aria-label="Nouvelle activité" className="kay-drawer-form">
    <fieldset className="grid min-w-0 gap-5" disabled={!hydrated || busy}>
      <div className="grid gap-2"><Label htmlFor={`${id}-kind`}>Type d’activité</Label><NativeSelect id={`${id}-kind`} name="kind">{activityKinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-body`}>Notes de suivi *</Label><Textarea id={`${id}-body`} ref={bodyInput} name="body" required maxLength={4000} rows={5} aria-describedby={`${id}-help`} /><p id={`${id}-help`} className="text-xs text-muted-foreground">Auteur et date enregistrés automatiquement. L’activité restera dans l’historique, sans modification ni suppression.</p></div>
      <div className="kay-form-pair"><div className="grid gap-2"><Label htmlFor={`${id}-duration`}>Durée (minutes, facultative)</Label><Input id={`${id}-duration`} name="duration" type="number" min={1} max={1440} step={1} /></div><div className="grid gap-2"><Label htmlFor={`${id}-direction`}>Sens de l’échange</Label><NativeSelect id={`${id}-direction`} name="direction"><option value="">Non précisé</option>{Object.entries(directionLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div></div>
      <fieldset className="kay-drawer-form-section"><legend className="mb-3 text-sm font-medium">Projets évoqués</legend><div className="grid min-w-0 gap-4">{[1, 2, 3].map(index => <div key={index} className="grid gap-2"><Label htmlFor={`${id}-project${index}`}>Projet {index} (facultatif)</Label><Input id={`${id}-project${index}`} name={`project${index}`} maxLength={160} /></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Ces libellés gardent le contexte de l’échange, sans modifier les projets ni le stock.</p></fieldset>
    </fieldset>
    {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}
    {error ? <div className="grid gap-2"><RecordError error={error} /><p>Votre saisie est conservée. Réessayez sans la modifier si la réponse a été interrompue.</p></div> : null}
    <div className="kay-form-footer"><Button action="close" type="button" variant="outline" disabled={!hydrated || busy} onClick={cancel}>Annuler</Button><Button action="save" type="submit" disabled={!hydrated || busy}>{busy ? "Enregistrement…" : "Enregistrer l’activité"}</Button></div>
  </form>;
}