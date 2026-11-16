"use client";
import { useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/icons";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { RecordError } from "@/features/contacts/record-states";
import { enquiriesSchema } from "@/features/contacts/contracts";
import { dealsSchema } from "@/features/deals/contracts";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { availabilitySchema, calendarContextSchema, colleaguesSchema, editVisitSchema, newVisitSchema, policySchema, resultSchema, typeLabels, visitSchema, type Visit } from "./contracts";
import { WorkPropertySelect } from "@/features/work/work-property-select";
import { VisitSlotPreview } from "./visit-slot-preview";
import { LocalTimeField } from "./local-time-field";
import { localLabel } from "./time";

const textSchema = z.object({ overlap_reason: z.string().trim().max(1000), notes: z.string().trim().max(1000) });
const defaultDuration = 60 * 60 * 1000;
type Booking = z.infer<typeof newVisitSchema> | z.infer<typeof editVisitSchema>;

async function visitContext(contactId: string) {
  const scope = { contact_id: contactId, page_size: 1 };
  const { items: deals } = await apiGet(queryPath("deals", { ...scope, sort: "-updated_at" }), dealsSchema);
  if (deals[0]) return { deal_id: deals[0].id, enquiry_id: null };
  const { items: enquiries } = await apiGet(queryPath("enquiries", { ...scope, sort: "-received_at" }), enquiriesSchema);
  if (enquiries[0]) return { deal_id: null, enquiry_id: enquiries[0].id };
  throw new ApiError("VISIT_CONTEXT_UNAVAILABLE", 422);
}

export function VisitForm({ contactId, contactName, actorId, value: initialValue, saved, cancel, initialDate, changeContact }: { contactId: string; contactName: string; actorId: string; value?: Visit; saved: (id: string) => void; cancel?: () => void; initialDate?: string; changeContact?: () => void }) {
  const [value, setValue] = useState(initialValue);
  const form = useForm<z.infer<typeof textSchema>>({ resolver: zodResolver(textSchema), defaultValues: { overlap_reason: value?.overlap_reason ?? "", notes: value?.notes ?? "" } });
  const [type, setType] = useState<Visit["type"]>(value?.type ?? "company_car");
  const [startLocal, setStartLocal] = useState(value?.start_local.slice(0,16) ?? (initialDate ? `${initialDate}T` : ""));
  const [start, setStart] = useState(value?.start_at ?? ""), [selected, setSelected] = useState<string[]>(value?.participant_ids ?? [actorId]);
  const duration = value ? Date.parse(value.end_at) - Date.parse(value.start_at) : defaultDuration;
  const end = start ? new Date(Date.parse(start) + duration).toISOString() : "";
  const [propertyId, setPropertyId] = useState(value?.property_id ?? null);
  const [preview, setPreview] = useState<z.infer<typeof availabilitySchema>>(), [error, setError] = useState<ApiError>(), [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<Visit>();
  const capabilities = useQuery("/api/v1/calendar/context", calendarContextSchema);
  const policy = useQuery("/api/v1/visit-schedule/policy", policySchema), colleagues = useQuery(queryPath("calendar/colleagues", { contact_id: contactId }), colleaguesSchema);
  const attempt = useRef<{ intent: string; body: Booking; key: string }>(undefined);
  const notesSection = useRef<HTMLDetailsElement>(null);
  const hydrated = useHydrated(), id = useId(), busy = checking || form.formState.isSubmitting;
  const guard = useUnsavedGuard();
  const operation = useRef<"preview" | "save" | null>(null);
  const text = useWatch({ control: form.control });
  const draft = useDossierDraft({ text, type, startLocal, start: start ? Date.parse(start) : null, selected: [...selected].sort(), propertyId }, busy);
  const notesEnabled = value?.notes !== undefined || capabilities.value?.notes_supported === true || Boolean(text.notes);
  const availabilityPath = start && end ? queryPath("calendar/availability", { type, start_at: start, end_at: end, exclude_visit_id: value?.id }) : undefined;
  const [previewKey, setPreviewKey] = useState("");
  async function check() {
    if (!hydrated || operation.current) return;
    operation.current = "preview";
    setError(undefined); setChecking(true); setPreview(undefined);
    try { if (!availabilityPath) throw new ApiError("VALIDATION_ERROR",422); const result = await apiGet(availabilityPath, availabilitySchema); setPreviewKey(availabilityPath); setPreview(result); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503)); }
    finally { operation.current = null; setChecking(false); }
  }
  async function submit(text: z.infer<typeof textSchema>) {
    setError(undefined);
    const { notes, ...requiredText } = text;
    // Keep the wire fields understood by the running API while its process is on the earlier code.
    const fields = { ...requiredText, ...(notesEnabled ? { notes } : {}), title: value?.title ?? "Visite", location: value?.location ?? "Non renseigné", type, start_at: start, end_at: end, participant_ids: [...selected].sort(), deal_id: value?.deal_id ?? null, enquiry_id: value?.enquiry_id ?? null, property_id: propertyId };
    const body = value ? editVisitSchema.safeParse({ ...fields, expected_version: value.version }) : newVisitSchema.safeParse({ ...fields, contact_id: contactId, status: "scheduled" });
    if (!body.success || !availabilityPath || !preview?.bookable || previewKey !== availabilityPath) { setError(new ApiError("VALIDATION_ERROR",422)); return; }
    const intent = JSON.stringify(body.data);
    try {
      if (attempt.current?.intent !== intent) {
        const context = value ? undefined : await visitContext(contactId);
        attempt.current = { intent, body: { ...body.data, ...context }, key: crypto.randomUUID() };
      }
      const result = await apiCommand(value ? `/api/v1/visits/${value.id}/reschedule` : "/api/v1/visits", attempt.current.body, resultSchema, attempt.current.key);
      draft.accept(); saved(result.id);
    } catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE",503);
      setError(failure);
      if (failure.code === "VISIT_OVERLAP_REASON_REQUIRED" && notesSection.current) notesSection.current.open = true;
      if (failure.code === "INVALID_VISIT_CONTEXT" || failure.code === "INVALID_WORK_CONTEXT") attempt.current = undefined;
      if (value && failure.code === "VERSION_CONFLICT") { try { setCurrent(await apiGet(`/api/v1/visits/${value.id}`, visitSchema)); } catch (comparison) { if (comparison instanceof ApiError && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(comparison.code)) setError(comparison); } }
    }
  }
  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hydrated || operation.current || busy || current) return;
    operation.current = "save";
    try { await form.handleSubmit(submit)(event); }
    finally { operation.current = null; }
  }
  const denied = [error, policy.error, colleagues.error, capabilities.error].find(problem => problem && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED", "CONTACT_ARCHIVED"].includes(problem.code));
  if (denied) return <RecordError error={denied} />;
  const activePreview = previewKey === availabilityPath ? preview : undefined;
  const blockedComparison = current && (current.contact_archived || current.contact_id !== contactId || ["completed", "not_completed", "cancelled"].includes(current.status));
  const scope = () => document.getElementById(id + "-form")?.parentElement ?? document;
  return <>{guard.dialog}<Form {...form}><form method="post" id={id + "-form"} aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} noValidate aria-label={value ? "Modifier la visite" : "Nouvelle visite"} className="kay-drawer-form kay-visit-form" onSubmit={event => void submitEvent(event)}>
    <div className="kay-contact-choice"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><div className="grid min-w-0 gap-1"><span className="text-xs text-muted-foreground">Contact</span><strong className="text-sm wrap-anywhere">{contactName}</strong></div>{changeContact ? <Button action="contact" type="button" variant="ghost" disabled={busy} onClick={() => guard.request(changeContact, scope())}>Changer</Button> : null}</div></div>
    <fieldset disabled={!hydrated || busy} className="grid min-w-0 gap-5">
      <div className="grid gap-2"><Label htmlFor={`${id}-type`}>Type de visite</Label><NativeSelect id={`${id}-type`} value={type} onChange={event => setType(event.target.value as Visit["type"])}>{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
      <WorkPropertySelect value={propertyId} change={setPropertyId} purpose="visit" />
      <LocalTimeField split label="Heure" splitLabels={{ date: "Date", time: "Heure" }} local={startLocal} changeLocal={setStartLocal} instant={start} choose={setStart} />
      <fieldset className="kay-drawer-form-section grid min-w-0 gap-3"><legend className="mb-3 text-sm font-medium">Participants de l’équipe *</legend>{colleagues.error ? <RecordError error={colleagues.error} retry={colleagues.refresh} /> : !colleagues.value ? <p role="status">Chargement des participants…</p> : <div className="kay-visit-participants">{colleagues.value.items.map(user => <Label key={user.id} htmlFor={`${id}-participant-${user.id}`} className="flex min-h-control min-w-0 items-center gap-2 wrap-anywhere"><Checkbox id={`${id}-participant-${user.id}`} checked={selected.includes(user.id)} onCheckedChange={checked => setSelected(ids => checked ? [...ids, user.id] : ids.filter(id => id !== user.id))} />{user.display_name}</Label>)}</div>}{value?.participants.filter(user => selected.includes(user.id) && colleagues.value && !colleagues.value.items.some(eligible => eligible.id === user.id)).map(user => <div key={user.id} className="grid gap-2"><p className="text-sm wrap-anywhere">Participant précédent non éligible : {user.display_name}</p><Button action="remove" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => setSelected(ids => ids.filter(id => id !== user.id))}>Retirer {user.display_name}</Button></div>)}<p className="text-xs text-muted-foreground">Seules les personnes autorisées sur ce contact peuvent participer. La participation ne donne aucun accès supplémentaire.</p></fieldset>
      <VisitSlotPreview policy={policy.value} error={policy.error} retry={policy.refresh} preview={activePreview} check={() => void check()} canCheck={Boolean(availabilityPath)} checking={checking} />
      <details ref={notesSection} className="kay-form-disclosure kay-visit-disclosure"><summary>Notes et chevauchement<ChevronDownIcon size={16} aria-hidden="true" /></summary><div className="grid gap-4 pt-3">{notesEnabled ? <FormField control={form.control} name="notes" render={({ field }) => <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} rows={3} maxLength={1000} /></FormControl><p className="text-xs text-muted-foreground">Informations utiles pour préparer la visite.</p><FormMessage /></FormItem>} /> : null}<FormField control={form.control} name="overlap_reason" render={({ field }) => <FormItem><FormLabel>Explication du chevauchement éventuel</FormLabel><FormControl><Textarea {...field} rows={3} maxLength={1000} /></FormControl><p className="text-xs text-muted-foreground">Obligatoire si un participant a déjà un rendez-vous. Elle ne contourne ni les horaires ni la capacité.</p><FormMessage /></FormItem>} /></div></details>
    </fieldset>
    {error ? <div className="grid gap-2"><RecordError error={error} /><p className="text-sm">Votre saisie est conservée. Après une réponse interrompue, réessayez sans la modifier.</p></div> : null}
    {current ? <section className="kay-visit-availability grid gap-3"><p className="text-sm">Version actuelle {current.version} : {localLabel(current.start_local)}.</p>{blockedComparison ? <p>Le contexte ou l’état de cette visite a changé. Fermez puis rouvrez sa fiche avant de poursuivre.</p> : <><p className="text-sm">Examinez la version actuelle avant une nouvelle tentative. Votre saisie reste conservée.</p>{current.notes !== undefined ? <div className="grid gap-1 text-sm"><strong>Notes de la version actuelle</strong><p className="whitespace-pre-wrap wrap-anywhere">{current.notes || "Aucune note."}</p></div> : null}<Button action="compare" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setValue(current); setCurrent(undefined); setPreview(undefined); setError(undefined); }}>Conserver ma saisie sur cette version</Button></>}</section> : null}
    <p className="text-xs text-muted-foreground">Visite planifiée : rappels internes J−1 et H−1, puis suivi après la fin. Horaires de Casablanca.</p>
    <div className="kay-form-footer kay-visit-form-footer">{cancel ? <Button action="cancel" type="button" variant="outline" disabled={busy} onClick={() => guard.request(cancel, scope())}>{value ? "Annuler les modifications" : "Annuler"}</Button> : null}<Button action={value ? "save" : "create"} type="submit" disabled={!hydrated || busy || Boolean(current) || !start || !selected.length || !colleagues.value || !activePreview?.bookable}>{checking ? "Vérification…" : form.formState.isSubmitting ? "Enregistrement…" : value ? "Enregistrer" : "Planifier"}</Button></div>
  </form></Form></>;
}
