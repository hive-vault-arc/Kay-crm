"use client";
import { TaskIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { colleaguesSchema } from "@/features/schedule/contracts";
import { LocalTimeField } from "@/features/schedule/local-time-field";
import { localLabel } from "@/features/schedule/time";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { editTaskSchema, newTaskSchema, resultSchema, taskSchema, type Task } from "./contracts";

type Props = { contactId: string; dealId?: string; value?: Task; saved: (id: string) => Promise<void>; cancel: () => void };
export function TaskForm(props: Props) {
  const me = useQuery("/api/v1/auth/me", meSchema);
  const colleagues = useQuery(queryPath("calendar/colleagues", { contact_id: props.contactId }), colleaguesSchema);
  if (me.error || colleagues.error) return <RecordError error={(me.error ?? colleagues.error)!} retry={() => { me.refresh(); colleagues.refresh(); }} />;
  if (!me.value || !colleagues.value) return <p role="status">Chargement des responsables autorisés…</p>;
  return <Editor {...props} currentUser={me.value.user.id} owners={colleagues.value.items} />;
}

function Editor({ contactId, dealId, value, currentUser, owners, saved, cancel }: Props & { currentUser: string; owners: { id: string; display_name: string }[] }) {
  const id = useId(), hydrated = useHydrated();
  const [title, setTitle] = useState(value?.title ?? ""), [notes, setNotes] = useState(value?.notes ?? "");
  const [owner, setOwner] = useState(value?.owner_user_id ?? (owners.some(u => u.id === currentUser) ? currentUser : ""));
  const [local, setLocal] = useState(value?.due_local.slice(0, 16) ?? ""), [due, setDue] = useState(value?.due_at ?? "");
  const [baseVersion, setBaseVersion] = useState(value?.version), [comparison, setComparison] = useState<Task>();
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [invalid, setInvalid] = useState("");
  const attempt = useRef({ fingerprint: "", key: "" }), lock = useRef(false);
  const denied = error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(error.code);
  const blocked = error?.code === "CONTACT_ARCHIVED" || comparison?.status !== undefined && comparison.status !== "open" || comparison?.contact_archived;
  async function submit() {
    if (lock.current || blocked) return;
    const fields = { title, notes, owner_user_id: owner, due_at: due, deal_id: value?.deal_id ?? dealId ?? null, property_id: value?.property_id ?? null };
    const parsed = value ? editTaskSchema.safeParse({ ...fields, expected_version: baseVersion }) : newTaskSchema.safeParse({ ...fields, contact_id: contactId });
    if (!parsed.success) { setInvalid("Renseignez le titre, un responsable autorisé et une échéance valide. Choisissez l’occurrence si l’heure est répétée."); return; }
    setInvalid(""); setError(undefined); setComparison(undefined); setBusy(true); lock.current = true;
    const path = value ? `/api/v1/tasks/${value.id}` as const : "/api/v1/tasks" as const, method = value ? "PATCH" as const : "POST" as const;
    const fingerprint = JSON.stringify({ path, method, body: parsed.data });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { const result = await apiCommand(path, parsed.data, resultSchema, attempt.current.key, method); await saved(result.id); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function compare() {
    if (!value) return; setBusy(true);
    try { setComparison(await apiGet(`/api/v1/tasks/${value.id}`, taskSchema)); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  if (denied) return <RecordError error={error} />;
  return <form aria-label={value ? "Modifier la tâche" : "Créer une tâche"} aria-describedby={invalid ? `${id}-invalid` : undefined} className="grid min-w-0 max-w-reading gap-6 border-t pt-5" noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
    <SectionHeading as="h3" icon={TaskIcon}>{value ? "Modifier la tâche" : "Nouvelle tâche"}</SectionHeading>
    <fieldset disabled={!hydrated || busy || Boolean(blocked)} className="grid min-w-0 gap-4">
      <div className="grid gap-2"><Label htmlFor={`${id}-title`}>Titre de la tâche</Label><Input autoFocus id={`${id}-title`} aria-required="true" aria-invalid={Boolean(invalid && !title.trim())} aria-describedby={invalid ? `${id}-invalid` : undefined} value={title} maxLength={160} onChange={e => setTitle(e.target.value)} /></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-owner`}>Responsable de la tâche</Label><NativeSelect id={`${id}-owner`} value={owner} onChange={e => setOwner(e.target.value)}><option value="">Choisir un responsable</option>{value && !owners.some(u => u.id === value.owner_user_id) ? <option value={value.owner_user_id} disabled>{value.owner_name} : accès retiré, choisissez un autre responsable</option> : null}{owners.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}</NativeSelect></div>
      <LocalTimeField label="Échéance de la tâche" local={local} changeLocal={setLocal} instant={due} choose={setDue} />
      <div className="grid gap-2"><Label htmlFor={`${id}-notes`}>Consignes de la tâche</Label><Textarea id={`${id}-notes`} value={notes} maxLength={1000} onChange={e => setNotes(e.target.value)} /></div>
    </fieldset>
    <p className="text-sm text-muted-foreground">Le rappel interne suit l’échéance et le responsable actuels. Aucun e-mail, SMS ou message externe n’est envoyé.</p>
    {invalid ? <p id={`${id}-invalid`} role="alert" className="text-danger">{invalid}</p> : null}
    {error ? <section className="grid gap-4" aria-label="Échec de la tâche"><RecordError error={error} /><p>Votre saisie reste affichée. Si la réponse a été interrompue, réessayez la même action sans modifier les champs.</p>{value ? <Button className="justify-self-start" type="button" variant="outline" disabled={busy} onClick={() => void compare()}>Comparer la version actuelle</Button> : null}</section> : null}
    {comparison ? <section className="grid gap-4 border-y py-4" aria-label="Version actuelle de la tâche"><p className="wrap-anywhere">Version actuelle {comparison.version} : {comparison.title}</p><p>Échéance actuelle : {localLabel(comparison.due_local)}</p><p className="wrap-anywhere">Responsable actuel : {comparison.owner_name}</p>{comparison.status === "open" && !comparison.contact_archived ? <Button type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setBaseVersion(comparison.version); setComparison(undefined); setError(undefined); }}>Conserver ma saisie avec cette version</Button> : <p>Cette tâche n’est plus modifiable. Fermez le formulaire pour consulter son état actuel.</p>}</section> : null}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!hydrated || busy || Boolean(blocked)}>{busy ? "Enregistrement…" : "Enregistrer la tâche"}</Button><Button type="button" variant="outline" disabled={busy} onClick={cancel}>Fermer le formulaire</Button></div>
  </form>;
}
