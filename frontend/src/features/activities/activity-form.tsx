"use client";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { activityKinds, directionLabels, kindLabels, newActivitySchema } from "./contracts";
import { useEntryCommand, type EntryDenied } from "./use-entry-command";

type ActivityProps = { path: `/api/v1/${string}`; saved: (signal: AbortSignal) => void | Promise<void>; cancel: () => void; denied?: EntryDenied };
export function ActivityForm(props: ActivityProps) { return <ActivityLifetime key={props.path} {...props} />; }
function ActivityLifetime({ path, saved, cancel, denied }: ActivityProps) {
  const hydrated = useHydrated(), bodyInput = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [invalid, setInvalid] = useState(""), [values, setValues] = useState<Record<string, FormDataEntryValue>>({});
  const command = useEntryCommand({ path, denied, saved: async signal => { draft.accept(); await saved(signal); } });
  const draft = useDossierDraft(values, command.protected);
  useEffect(() => { if (hydrated) bodyInput.current?.focus(); }, [hydrated]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (command.uncertain) { await command.retry(); return; } if (!command.canEdit()) return;
    const form = new FormData(event.currentTarget);
    const parsed = newActivitySchema.safeParse({ kind: form.get("kind"), body: form.get("body"), duration_minutes: form.get("duration") ? Number(form.get("duration")) : null, direction: form.get("direction") || null, projects: [1, 2, 3].map(index => String(form.get(`project${index}`) ?? "").trim()).filter(Boolean) });
    if (!parsed.success) { setInvalid("Renseignez une note et vérifiez les champs. Les projets doivent être distincts."); return; }
    setInvalid(""); await command.submit(parsed.data);
  }
  if (command.accessError) return <section className="grid gap-3"><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">L’activité est enregistrée. Les droits d’accès ont changé.</p> : null}</section>;
  return <form method="post" data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} onChange={event => { if (command.canEdit()) setValues(Object.fromEntries(new FormData(event.currentTarget))); }} onSubmit={submit} aria-busy={command.protected} aria-label="Nouvelle activité" className="kay-drawer-form">
    <fieldset className="grid min-w-0 gap-5" disabled={!hydrated || command.protected || command.complete}>
      <div className="grid gap-2"><Label htmlFor={`${id}-kind`}>Type d’activité</Label><NativeSelect id={`${id}-kind`} name="kind">{activityKinds.map(kind => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-body`}>Notes de suivi *</Label><Textarea id={`${id}-body`} ref={bodyInput} name="body" required maxLength={4000} rows={5} aria-describedby={`${id}-help`} /><p id={`${id}-help`} className="text-xs text-muted-foreground">Auteur et date enregistrés automatiquement. L’activité restera dans l’historique, sans modification ni suppression.</p></div>
      <div className="kay-form-pair"><div className="grid gap-2"><Label htmlFor={`${id}-duration`}>Durée (minutes, facultative)</Label><Input id={`${id}-duration`} name="duration" type="number" min={1} max={1440} step={1} /></div><div className="grid gap-2"><Label htmlFor={`${id}-direction`}>Sens de l’échange</Label><NativeSelect id={`${id}-direction`} name="direction"><option value="">Non précisé</option>{Object.entries(directionLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div></div>
      <fieldset className="kay-drawer-form-section"><legend className="mb-3 text-sm font-medium">Projets évoqués</legend><div className="grid min-w-0 gap-4">{[1, 2, 3].map(index => <div key={index} className="grid gap-2"><Label htmlFor={`${id}-project${index}`}>Projet {index} (facultatif)</Label><Input id={`${id}-project${index}`} name={`project${index}`} maxLength={160} /></div>)}</div><p className="mt-3 text-xs text-muted-foreground">Ces libellés gardent le contexte de l’échange, sans modifier les projets ni le stock.</p></fieldset>
    </fieldset>
    {invalid ? <p role="alert" className="text-danger">{invalid}</p> : null}
    {command.error ? <RecordError error={command.error} /> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "L’activité est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même activité pour retrouver son résultat."}</p> : command.complete ? <p role="status">Activité enregistrée.</p> : null}
    <div className="kay-form-footer"><Button action="close" type="button" variant="outline" disabled={!hydrated || command.protected} onClick={() => { if (command.canEdit() || command.complete) cancel(); }}>Annuler</Button><Button action="save" type="submit" disabled={!hydrated || command.busy || command.complete}>{command.busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Enregistrer l’activité"}</Button></div>
  </form>;
}
