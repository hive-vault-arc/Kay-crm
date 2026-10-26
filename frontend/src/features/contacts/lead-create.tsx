"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { apiCommand } from "@/lib/api/command";
import { contactFieldsSchema, contactSchema, enquirySchema, newEnquirySchema, type ContactFields as Values, type ContactSummary, type StaffRole } from "./contracts";
import { ContactFields, blankContact } from "./contact-fields";
import { AgentPicker } from "./agent-picker";
import { ContactSelector } from "./contact-selector";
import { CommandError, RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { blankQualification, LeadQualificationFields, type LeadQualification } from "./lead-qualification-fields";

export function LeadCreate({ role }: { role: StaffRole }) {
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  if (query.value && !query.error) return <LeadCreateForm role={role} metadata={query.value} />;
  return <><RecordHeader title="Nouveau prospect" route="/leads/new" backHref="/leads" />{query.error ? <RecordError error={query.error} retry={query.refresh} /> : <p role="status">Chargement des pays, langues et sources…</p>}</>;
}
function LeadCreateForm({ role, metadata }: { role: StaffRole; metadata: QualificationMetadata }) {
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
  const [error, setError] = useState<ApiError>();
  const [busy, setBusy] = useState(false);
  const [reusing, setReusing] = useState(false);
  const [submission] = useState(() => crypto.randomUUID());
  const attempt = useRef({ body: "", key: "" });
  const submitButton = useRef<HTMLButtonElement>(null);
  const reuseFocus = useRef(false);
  const lock = useRef(false);
  const contactValues = useWatch({ control: form.control });
  const draft = useDossierDraft({ contact: contactValues, mode, contactId: selected?.id, agent, queue, message, qualification });
  const guard = useUnsavedGuard();
  useEffect(() => {
    if (!reusing && reuseFocus.current) {
      reuseFocus.current = false;
      submitButton.current?.focus();
    }
  }, [reusing]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || busy || reusing) return;
    lock.current = true;
    try {
    setError(undefined);
    setBudgetError(undefined);
    if (mode === "new" && !(await form.trigger(undefined, { shouldFocus: true }))) return;
    if (mode === "new" && !form.getValues("languages")?.length) { form.setError("languages", { type: "required", message: "Choisissez au moins une langue." }); return; }
    if (!qualification.initial_budget.trim()) { setBudgetError("Choisissez un budget ou un montant exact."); return; }
    if (mode === "existing" && selected && !selected.languages.length) { setError(new ApiError("LANGUAGES_REQUIRED", 422)); return; }
    if ((mode === "existing" && !selected) || (mode === "new" && role !== "agent" && !agent)) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const parsed = newEnquirySchema.safeParse({ ...(mode === "new" ? { new_contact: { ...form.getValues(), ...(role !== "agent" ? { primary_agent_id: agent } : {}) } } : { contact_id: selected?.id }), ...qualification, message, source: "manual", source_submission_id: submission, ...(role !== "agent" ? { assigned_agent_id: queue ? null : mode === "new" ? agent : selected?.primary_agent.id } : {}) });
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try { const result = await apiCommand("/api/v1/enquiries", parsed.data, enquirySchema, attempt.current.key); draft.accept(); router.push(`/leads/${result.id}`); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); setBusy(false); }
    } finally { lock.current = false; }
  }
  async function reuse(id: string) {
    setReusing(true); reuseFocus.current = true;
    setError(undefined);
    try { const contact = await apiGet(`/api/v1/contacts/${id}`, contactSchema); setSelected(contact); setMode("existing"); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setReusing(false); }
  }
  return <Form {...form}><form noValidate onSubmit={event => void submit(event)} className="kay-dossier-form" data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} aria-busy={busy || reusing}>
    <DossierFormHeader title="Nouveau prospect" route="/leads/new" backHref="/leads" description="Contact et dossier" actions={<><Button action="cancel" type="button" variant="outline" disabled={busy || reusing} onClick={() => guard.request(() => router.push("/leads"))}>Annuler</Button><Button action="create" ref={submitButton} type="submit" disabled={!hydrated || busy || reusing}>{reusing ? "Chargement…" : busy ? "Enregistrement…" : "Créer le prospect"}</Button></>} />
    <fieldset disabled={!hydrated || busy || reusing} className="kay-form-sheet kay-surface">
      <RecordSection title="Contact">
      <div className="kay-form-context"><div className="grid gap-2"><Label htmlFor="contact-mode">Contact de la demande</Label><NativeSelect id="contact-mode" value={mode} onChange={event => { setMode(event.target.value); setError(undefined); }}><option value="new">Nouveau contact</option><option value="existing">Contact existant</option></NativeSelect></div></div>
      {mode === "new" ? <><ContactFields form={form} metadata={metadata} requireLanguages compact workspace /></> : <>{selected ? <div className="kay-contact-choice"><p className="wrap-anywhere"><strong>Contact choisi : {selected.name}</strong></p><p>{selected.primary_phone}</p>{!selected.languages.length ? <p className="text-warning">Complétez les langues dans <Link className="text-link underline" href={`/contacts/${selected.id}`}>la fiche du contact</Link> avant de créer le prospect.</p> : null}<Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => setSelected(undefined)}>Choisir un autre contact</Button></div> : <ContactSelector choose={setSelected} />}</>}
      </RecordSection><RecordSection title="Qualification du prospect">
        <LeadQualificationFields workspace value={qualification} change={values => { setQualification(current => ({ ...current, ...values })); setBudgetError(undefined); }} metadata={metadata} budgetError={budgetError} message={<div className="kay-form-field"><Label htmlFor="enquiry-message">Message</Label><Textarea id="enquiry-message" value={message} maxLength={4000} rows={3} onChange={event => setMessage(event.target.value)} /></div>} />
      </RecordSection>
      <RecordSection title="Responsabilité"><div className="kay-form-columns">{mode === "new" && role !== "agent" ? <AgentPicker value={agent} change={setAgent} /> : <p className="text-sm text-muted-foreground">{role === "agent" ? "Vous êtes responsable du nouveau contact. Le responsable d’un contact existant est conservé." : "Le responsable du contact choisi est conservé."}</p>}
        {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="enquiry-queue">Attribution de la demande</Label><NativeSelect id="enquiry-queue" value={queue ? "queue" : "owner"} onChange={event => setQueue(event.target.value === "queue")}><option value="owner">Agent responsable du contact</option><option value="queue">Non attribuée, file du responsable</option></NativeSelect></div> : null}
      </div></RecordSection>
    </fieldset>
    <div className="kay-form-feedback"><CommandError error={error} reuse={id => void reuse(id)} dismiss={() => setError(undefined)} returnFocus={submitButton} />
    {reusing ? <p role="status">Chargement du contact choisi…</p> : null}

    <p className="text-xs text-muted-foreground">Le contact et le prospect sont enregistrés ensemble. La conversion en affaire vous demandera le projet, le budget et le motif d’achat.</p></div>
  {guard.dialog}</form></Form>;
}
