"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { DossierFormHeader, useDossierDraft } from "@/components/shared/dossier-form";
import { RecordSection } from "@/components/shared/record-workspace";
import { RecordHeader } from "@/components/shared/record-header";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { contactFieldsSchema, contactSchema, newEnquirySchema, type ContactFields as Values, type ContactSummary, type StaffRole } from "./contracts";
import { ContactFields, blankContact } from "./contact-fields";
import { AgentPicker } from "./agent-picker";
import { ContactSelector } from "./contact-selector";
import { CommandError, RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { blankQualification, LeadQualificationFields, type LeadQualification } from "./lead-qualification-fields";
import { useEnquiryCommand } from "./use-enquiry-command";

export function LeadCreate({ role, actorId }: { role: StaffRole; actorId?: string }) {
  return <LoadLeadCreate key={`${role}:${actorId ?? ""}`} role={role} actorId={actorId} />;
}
function LoadLeadCreate({ role, actorId }: { role: StaffRole; actorId?: string }) {
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<QualificationMetadata>();
  if (query.value && query.value !== loaded) setLoaded(query.value);
  const failure = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  const metadata = query.value ?? loaded;
  if (metadata && !failure) return <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<LeadCreateForm key={`${role}:${actorId ?? ""}`} role={role} actorId={actorId} metadata={metadata} unavailable={Boolean(query.error || !query.value)} /></>;
  return <><RecordHeader title="Nouveau prospect" route="/leads/new" backHref="/leads" />{query.error ? <RecordError error={query.error} retry={query.refresh} /> : <p role="status">Chargement des pays, langues et sources…</p>}</>;
}
function LeadCreateForm({ role, actorId, metadata, unavailable = false }: { role: StaffRole; actorId?: string; metadata: QualificationMetadata; unavailable?: boolean }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: blankContact });
  const [mode, setMode] = useState("new");
  const [selected, setSelected] = useState<ContactSummary>();
  const [agent, setAgent] = useState("");
  const [queue, setQueue] = useState(false);
  const [message, setMessage] = useState("");
  const [qualification, setQualification] = useState<LeadQualification>(blankQualification);
  const [budgetError, setBudgetError] = useState<string>();
  const [validationError, setValidationError] = useState<ApiError>();
  const [validating, setValidating] = useState(false);
  const [reusing, setReusing] = useState(false);
  const [created, setCreated] = useState<string>();
  const [submission] = useState(() => crypto.randomUUID());
  const submitButton = useRef<HTMLButtonElement>(null);
  const reuseFocus = useRef(false);
  const lock = useRef(false);
  const available = useRef(!unavailable);
  useLayoutEffect(() => { available.current = !unavailable; }, [unavailable]);
  const contactValues = useWatch({ control: form.control });
  const command = useEnquiryCommand({ mode: "create", role, actorId, saved: result => { setCreated(result.id); draft.accept(); router.push(`/leads/${result.id}`); } });
  const draft = useDossierDraft({ contact: contactValues, mode, contactId: selected?.id, agent, queue, message, qualification }, command.protected || validating);
  const error = validationError ?? command.error;
  const guard = useUnsavedGuard();
  useEffect(() => {
    if (!reusing && reuseFocus.current) {
      reuseFocus.current = false;
      submitButton.current?.focus();
    }
  }, [reusing]);
  function change() {
    if (lock.current || !available.current || !command.canEdit() || !command.begin()) return false;
    setValidationError(undefined); setBudgetError(undefined); return true;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (command.uncertain) { await command.retry(); return; }
    if (!available.current || !command.canEdit()) return;
    lock.current = true; setValidating(true);
    try {
    setValidationError(undefined);
    setBudgetError(undefined);
    if (mode === "new" && (!(await form.trigger(undefined, { shouldFocus: true })) || !command.canEdit() || !available.current)) return;
    if (mode === "new" && !form.getValues("languages")?.length) { form.setError("languages", { type: "required", message: "Choisissez au moins une langue." }); return; }
    if (!qualification.initial_budget.trim()) { setBudgetError("Choisissez un budget ou un montant exact."); return; }
    if (mode === "existing" && selected && !selected.languages.length) { setValidationError(new ApiError("LANGUAGES_REQUIRED", 422)); return; }
    if ((mode === "existing" && !selected) || (mode === "new" && role !== "agent" && !agent)) { setValidationError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const parsed = newEnquirySchema.safeParse({ ...(mode === "new" ? { new_contact: { ...form.getValues(), ...(role !== "agent" ? { primary_agent_id: agent } : {}) } } : { contact_id: selected?.id }), ...qualification, message, source: "manual", source_submission_id: submission, ...(role !== "agent" ? { assigned_agent_id: queue ? null : mode === "new" ? agent : selected?.primary_agent.id } : {}) });
    if (!parsed.success) { setValidationError(new ApiError("VALIDATION_ERROR", 422)); return; }
    await command.submit(parsed.data);
    } finally { lock.current = false; if (command.active()) setValidating(false); }
  }
  async function reuse(id: string) {
    if (!change()) return;
    setReusing(true); reuseFocus.current = true;
    await command.refresh(async signal => {
      const contact = await apiGet(`/api/v1/contacts/${id}`, contactSchema, signal);
      if (signal.aborted) return;
      setSelected(contact); setMode("existing");
    });
    if (command.active()) setReusing(false);
  }
  if (command.accessError) return <><RecordHeader title="Nouveau prospect" route="/leads/new" backHref="/leads" /><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">Le prospect est créé. Les droits d’accès ont changé.</p> : null}</>;
  return <Form {...form}><form noValidate onSubmit={event => void submit(event)} className="kay-dossier-form" data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} aria-busy={command.protected || validating}>
    <DossierFormHeader title="Nouveau prospect" route="/leads/new" backHref="/leads" description="Contact et dossier" actions={<><Button action="cancel" type="button" variant="outline" disabled={command.protected || validating || command.complete} onClick={() => { if (!lock.current && command.canEdit()) guard.request(() => { if (command.canEdit()) router.push("/leads"); }); }}>Annuler</Button><Button action="create" ref={submitButton} type="submit" disabled={!hydrated || command.busy || validating || command.complete || !command.uncertain && unavailable}>{reusing ? "Chargement…" : command.busy || validating ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Ouvrir le prospect créé" : "Réessayer la même opération" : "Créer le prospect"}</Button></>} />
    <fieldset disabled={!hydrated || command.protected || validating || unavailable || command.complete} className="kay-form-sheet kay-surface">
      <RecordSection title="Contact">
      <div className="kay-form-context"><div className="grid gap-2"><Label htmlFor="contact-mode">Contact de la demande</Label><NativeSelect id="contact-mode" value={mode} onChange={event => { if (change()) setMode(event.target.value); }}><option value="new">Nouveau contact</option><option value="existing">Contact existant</option></NativeSelect></div></div>
      {mode === "new" ? <><ContactFields form={form} metadata={metadata} requireLanguages compact workspace /></> : <>{selected ? <div className="kay-contact-choice"><p className="wrap-anywhere"><strong>Contact choisi : {selected.name}</strong></p><p>{selected.primary_phone}</p>{!selected.languages.length ? <p className="text-warning">Complétez les langues dans <Link className="text-link underline" href={`/contacts/${selected.id}`}>la fiche du contact</Link> avant de créer le prospect.</p> : null}<Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => { if (change()) setSelected(undefined); }}>Choisir un autre contact</Button></div> : <ContactSelector choose={contact => { if (change()) setSelected(contact); }} denied={command.deny} />}</>}
      </RecordSection><RecordSection title="Qualification du prospect">
        <LeadQualificationFields workspace value={qualification} change={values => { if (change()) setQualification(current => ({ ...current, ...values })); }} metadata={metadata} budgetError={budgetError} message={<div className="kay-form-field"><Label htmlFor="enquiry-message">Message</Label><Textarea id="enquiry-message" value={message} maxLength={4000} rows={3} onChange={event => { if (change()) setMessage(event.target.value); }} /></div>} />
      </RecordSection>
      <RecordSection title="Responsabilité"><div className="kay-form-columns">{mode === "new" && role !== "agent" ? <AgentPicker value={agent} change={value => { if (change()) setAgent(value); }} denied={command.deny} /> : <p className="text-sm text-muted-foreground">{role === "agent" ? "Vous êtes responsable du nouveau contact. Le responsable d’un contact existant est conservé." : "Le responsable du contact choisi est conservé."}</p>}
        {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="enquiry-queue">Attribution de la demande</Label><NativeSelect id="enquiry-queue" value={queue ? "queue" : "owner"} onChange={event => { if (change()) setQueue(event.target.value === "queue"); }}><option value="owner">Agent responsable du contact</option><option value="queue">Non attribuée, file du responsable</option></NativeSelect></div> : null}
      </div></RecordSection>
    </fieldset>
    <div className="kay-form-feedback"><CommandError error={error} reuse={id => void reuse(id)} dismiss={() => { change(); }} returnFocus={submitButton} />
    {reusing ? <p role="status">Chargement du contact choisi…</p> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "Le prospect est créé. Rouvrez son résultat sans le créer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
    {command.complete && created ? <p role="status">Prospect créé. <Link className="text-link underline" href={`/leads/${created}`}>Ouvrir le prospect</Link></p> : null}

    <p className="text-xs text-muted-foreground">Le contact et le prospect sont enregistrés ensemble. La conversion en affaire vous demandera le projet, le budget et le motif d’achat.</p></div>
  {guard.dialog}</form></Form>;
}
