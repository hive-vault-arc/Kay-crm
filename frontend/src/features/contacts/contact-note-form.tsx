"use client";
import { useId, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { useEntryCommand, type EntryDenied } from "@/features/activities/use-entry-command";
import { RecordError } from "./record-states";

const kinds = { note: "Note", call: "Appel", email: "E-mail", meeting: "Rendez-vous", other: "Autre interaction" } as const;
type NoteProps = { id: string; saved: (signal: AbortSignal) => void | Promise<void>; denied?: EntryDenied };
export function ContactNoteForm(props: NoteProps) { return <NoteLifetime key={props.id} {...props} />; }
function NoteLifetime({ id, saved, denied }: NoteProps) {
  const hydrated = useHydrated(), control = useId();
  const [kind, setKind] = useState<keyof typeof kinds>("note"), [body, setBody] = useState("");
  const command = useEntryCommand({ path: `/api/v1/contacts/${id}/notes`, denied, saved: async signal => { draft.accept(); await saved(signal); } });
  const draft = useDossierDraft({ kind, body }, command.protected);
  if (command.accessError) return <section className="grid gap-3"><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">L’entrée est enregistrée. Les droits d’accès ont changé.</p> : null}</section>;
  return <form className="grid max-w-reading gap-4" method="post" data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} aria-busy={command.protected} onSubmit={event => { event.preventDefault(); void (command.uncertain ? command.retry() : command.submit({ kind, body })); }}>
    <h3 className="font-medium">Ajouter une note ou consigner une interaction</h3>
    <p className="text-sm text-muted-foreground">L’auteur et l’heure d’enregistrement sont conservés. Consigner un e-mail ne l’envoie pas ; consigner un rendez-vous ne le planifie pas.</p>
    <fieldset disabled={!hydrated || command.protected || command.complete} className="grid gap-4">
      <div className="grid gap-2"><Label htmlFor={`${control}-kind`}>Type d’entrée</Label><NativeSelect id={`${control}-kind`} value={kind} onChange={event => { if (command.canEdit()) setKind(event.target.value as keyof typeof kinds); }}>{Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
      <div className="grid gap-2"><Label htmlFor={`${control}-body`}>Texte de l’entrée</Label><Textarea id={`${control}-body`} required maxLength={4000} rows={4} value={body} onChange={event => { if (command.canEdit()) setBody(event.target.value); }} /></div>
    </fieldset>
    {command.error ? <RecordError error={command.error} /> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "L’entrée est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même entrée pour retrouver son résultat."}</p> : command.complete ? <p role="status">Entrée enregistrée, avec son auteur.</p> : null}
    <Button action="save" className="justify-self-start" type="submit" disabled={!hydrated || command.busy || command.complete}>{command.busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Enregistrer l’entrée"}</Button>
  </form>;
}
