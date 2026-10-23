"use client";
import { useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { availabilitySchema, colleaguesSchema, editVisitSchema, newVisitSchema, policySchema, resultSchema, typeLabels, type Visit } from "./contracts";
import { LocalTimeField } from "./local-time-field";
import { localLabel } from "./time";
import { WorkContextSelect, type WorkContext } from "@/features/work/work-context-select";

const textSchema = z.object({ title: z.string().trim().min(1,"Nommez cette visite.").max(160), location: z.string().trim().min(1,"Indiquez le lieu.").max(1000), overlap_reason: z.string().trim().max(1000) });
export function VisitForm({ contactId, contactName, actorId, value, saved, cancel }: { contactId: string; contactName: string; actorId: string; value?: Visit; saved: (id: string) => void; cancel?: () => void }) {
  const form = useForm<z.infer<typeof textSchema>>({ resolver: zodResolver(textSchema), defaultValues: { title: value?.title ?? "", location: value?.location ?? "", overlap_reason: "" } });
  const [type, setType] = useState<Visit["type"]>(value?.type ?? "company_car"), [status, setStatus] = useState<"draft" | "scheduled">("scheduled");
  const [context, setContext] = useState<WorkContext>({ enquiry_id: value?.enquiry_id ?? null, deal_id: value?.deal_id ?? null });
  const [startLocal, setStartLocal] = useState(value?.start_local.slice(0,16) ?? ""), [endLocal, setEndLocal] = useState(value?.end_local.slice(0,16) ?? "");
  const [start, setStart] = useState(value?.start_at ?? ""), [end, setEnd] = useState(value?.end_at ?? ""), [selected, setSelected] = useState<string[]>(value?.participant_ids ?? [actorId]);
  const [preview, setPreview] = useState<z.infer<typeof availabilitySchema>>(), [error, setError] = useState<ApiError>(), [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<Visit>(), [expectedVersion, setExpectedVersion] = useState(value?.version);
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema), colleagues = useQuery(queryPath("calendar/colleagues", { contact_id: contactId }), colleaguesSchema);
  const attempt = useRef({ body: "", key: "" }), hydrated = useHydrated(), id = useId(), busy = checking || form.formState.isSubmitting;
  const availabilityPath = start && end && new Date(end) > new Date(start) ? queryPath("calendar/availability", { type, start_at: start, end_at: end, exclude_visit_id: value?.id }) : undefined;
  const [previewKey, setPreviewKey] = useState("");
  async function check() {
    setError(undefined); setChecking(true); setPreview(undefined);
    try { if (!availabilityPath) throw new ApiError("VALIDATION_ERROR",422); const result = await apiGet(availabilityPath, availabilitySchema); setPreviewKey(availabilityPath); setPreview(result); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503)); }
    finally { setChecking(false); }
  }
  async function submit(text: z.infer<typeof textSchema>) {
    setError(undefined);
    if (!value && !context.enquiry_id && !context.deal_id) { setError(new ApiError("ENQUIRY_CONTEXT_REQUIRED", 422)); return; }
    const fields = { ...text, type, start_at: start, end_at: end, participant_ids: [...selected].sort(), ...context, property_id: value?.property_id ?? null };
    const body = value ? editVisitSchema.safeParse({ ...fields, expected_version: expectedVersion }) : newVisitSchema.safeParse({ ...fields, contact_id: contactId, status });
    if (!body.success || !availabilityPath || (status !== "draft" && (!preview || previewKey !== availabilityPath))) { setError(new ApiError("VALIDATION_ERROR",422)); return; }
    const serialized = JSON.stringify(body.data); if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    try { const result = await apiCommand(value ? `/api/v1/visits/${value.id}/reschedule` : "/api/v1/visits", body.data, resultSchema, attempt.current.key); saved(result.id); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503); setError(failure); if (value && failure.code === "VERSION_CONFLICT") { const { visitSchema } = await import("./contracts"); try { setCurrent(await apiGet(`/api/v1/visits/${value.id}`, visitSchema)); } catch { /* Preserve the original failure and form. */ } } }
  }
  if (error && ["NOT_FOUND","FORBIDDEN","UNAUTHENTICATED","CONTACT_ARCHIVED"].includes(error.code)) return <RecordError error={error} />;
  const activePreview = previewKey === availabilityPath ? preview : undefined;
  return <Form {...form}><form noValidate aria-label={value ? "Modifier la visite" : "Nouvelle visite"} className="form-surface grid min-w-0 max-w-reading gap-6" onSubmit={e => void form.handleSubmit(submit)(e)}><p className="wrap-anywhere">Contact : {contactName}</p><fieldset disabled={!hydrated || busy} className="grid min-w-0 gap-6">
    {!value ? <WorkContextSelect contactId={contactId} value={context} change={setContext} /> : null}
    <FormField control={form.control} name="title" render={({ field }) => <FormItem><FormLabel>Titre de la visite</FormLabel><FormControl><Input {...field} maxLength={160} /></FormControl><FormMessage /></FormItem>} />
    <div className="grid gap-2"><Label htmlFor={`${id}-type`}>Type de visite</Label><NativeSelect id={`${id}-type`} value={type} onChange={e => setType(e.target.value as Visit["type"])}>{Object.entries(typeLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
    <FormField control={form.control} name="location" render={({ field }) => <FormItem><FormLabel>Lieu de la visite</FormLabel><FormControl><Textarea {...field} maxLength={1000} /></FormControl><FormMessage /></FormItem>} />
    <LocalTimeField label="Début" local={startLocal} changeLocal={setStartLocal} instant={start} choose={setStart} /><LocalTimeField label="Fin" local={endLocal} changeLocal={setEndLocal} instant={end} choose={setEnd} />
    <fieldset className="grid min-w-0 gap-2"><legend className="mb-2 font-medium">Participants de l’équipe</legend>{colleagues.error ? <RecordError error={colleagues.error} retry={colleagues.refresh} /> : !colleagues.value ? <p role="status">Chargement des participants…</p> : colleagues.value.items.map(u => <Label key={u.id} htmlFor={`${id}-participant-${u.id}`} className="flex min-h-control min-w-0 items-center gap-2 wrap-anywhere"><Checkbox id={`${id}-participant-${u.id}`} checked={selected.includes(u.id)} onCheckedChange={checked => setSelected(ids => checked ? [...ids,u.id] : ids.filter(x => x !== u.id))} />{u.display_name}</Label>)}{value?.participants.filter(u => selected.includes(u.id) && colleagues.value && !colleagues.value.items.some(eligible => eligible.id === u.id)).map(u => <div key={u.id} className="grid gap-2"><p className="wrap-anywhere">Participant précédent non éligible : {u.display_name}</p><Button action="remove" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => setSelected(ids => ids.filter(uid => uid !== u.id))}>Retirer {u.display_name}</Button></div>)}<p className="text-sm text-muted-foreground">Seules les personnes autorisées sur ce contact peuvent participer. La participation ne donne aucun accès supplémentaire.</p></fieldset>
    {policy.error ? <RecordError error={policy.error} retry={policy.refresh} /> : policy.value ? <section className="grid gap-2"><h2 className="text-section font-medium">Règles du créneau</h2><p>Au bureau : toute heure. Hors bureau : plages ouvertes sans pause déjeuner. Avec véhicule : {policy.value.company_car_capacity_per_hour} visite(s) par heure pour toute l’agence.</p><p>Plages : {policy.value.working_windows.length ? policy.value.working_windows.map(w => `${["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][w.weekday-1]} ${w.start_local}-${w.end_local}`).join(", ") : "non configurées"}. Pauses : {policy.value.lunch_breaks.length ? policy.value.lunch_breaks.map(w => `${["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"][w.weekday-1]} ${w.start_local}-${w.end_local}`).join(", ") : "aucune"}.</p></section> : <p role="status">Chargement des règles…</p>}
    <Button action="preview" type="button" variant="outline" className="justify-self-start" disabled={!availabilityPath} onClick={() => void check()}>Vérifier le créneau</Button>
    {activePreview ? <section aria-label="Disponibilité du créneau" className="grid gap-2 border-y py-4"><p role="status" className={activePreview.bookable ? "text-success" : "text-danger"}>{activePreview.bookable ? "Créneau compatible avec les horaires et la capacité." : new ApiError(activePreview.code ?? "VALIDATION_ERROR",409).message}</p>{activePreview.company_car_intervals.map(slot => <p key={slot.start_at}>{localLabel(slot.local_label)} : {slot.remaining} place(s) restante(s) sur {slot.capacity}.</p>)}<p className="text-sm text-muted-foreground">Prévisualisation uniquement. L’enregistrement revérifie le créneau et les chevauchements des participants.</p></section> : <p className="text-sm text-muted-foreground">Vérifiez le créneau avant de planifier ou replanifier.</p>}
    <FormField control={form.control} name="overlap_reason" render={({ field }) => <FormItem><FormLabel>Explication du chevauchement éventuel</FormLabel><FormControl><Textarea {...field} maxLength={1000} /></FormControl><p className="text-sm text-muted-foreground">Obligatoire si un participant a déjà un rendez-vous. Elle ne contourne ni les horaires ni la capacité.</p><FormMessage /></FormItem>} />
    {!value ? <div className="grid gap-2"><Label htmlFor={`${id}-status`}>Enregistrer comme</Label><NativeSelect id={`${id}-status`} value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="scheduled">Visite planifiée</option><option value="draft">Brouillon : aucun créneau garanti</option></NativeSelect></div> : null}
    {error ? <div className="grid gap-2"><RecordError error={error} /><p>Votre saisie est conservée. Après une réponse interrompue, réessayez sans modifier la saisie pour éviter un doublon.</p></div> : null}
    {current ? <section className="grid gap-2"><p>Version actuelle {current.version} : {current.title}, {localLabel(current.start_local)}.</p><p>Examinez la version actuelle avant une nouvelle tentative. Votre saisie reste conservée.</p><Button action="compare" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setExpectedVersion(current.version); setCurrent(undefined); setPreview(undefined); setError(undefined); }}>Conserver ma saisie sur cette version</Button></section> : null}
    <div className="flex flex-wrap gap-2"><Button action={value ? "save" : "create"} type="submit" disabled={Boolean(current) || !start || !end || !selected.length || !colleagues.value || (status !== "draft" && !activePreview)}>{checking ? "Vérification…" : form.formState.isSubmitting ? "Enregistrement…" : value ? "Replanifier la visite" : "Enregistrer la visite"}</Button>{cancel ? <Button action="cancel" type="button" variant="outline" onClick={cancel}>Annuler les modifications</Button> : null}</div></fieldset></form></Form>;
}
