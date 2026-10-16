"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { TaskIcon, ContactIcon, EnquiryIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { contactFieldsSchema, contactSchema, enquirySchema, newEnquirySchema, sourceLabels, type ContactFields as Values, type ContactSummary, type StaffRole } from "./contracts";
import { ContactFields, blankContact } from "./contact-fields";
import { AgentPicker } from "./agent-picker";
import { ContactSelector } from "./contact-selector";
import { CommandError } from "./record-states";

export function LeadCreate({ role }: { role: StaffRole }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: blankContact });
  const [mode, setMode] = useState("new");
  const [selected, setSelected] = useState<ContactSummary>();
  const [agent, setAgent] = useState("");
  const [queue, setQueue] = useState(false);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<keyof typeof sourceLabels>("manual");
  const [error, setError] = useState<ApiError>();
  const [busy, setBusy] = useState(false);
  const [reusing, setReusing] = useState(false);
  const [submission] = useState(() => crypto.randomUUID());
  const attempt = useRef({ body: "", key: "" });
  const submitButton = useRef<HTMLButtonElement>(null);
  const reuseFocus = useRef(false);
  useEffect(() => {
    if (!reusing && reuseFocus.current) {
      reuseFocus.current = false;
      submitButton.current?.focus();
    }
  }, [reusing]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || reusing) return;
    setError(undefined);
    if (mode === "new" && !(await form.trigger(undefined, { shouldFocus: true }))) return;
    if ((mode === "existing" && !selected) || (mode === "new" && role !== "agent" && !agent)) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const parsed = newEnquirySchema.safeParse({ ...(mode === "new" ? { new_contact: { ...form.getValues(), ...(role !== "agent" ? { primary_agent_id: agent } : {}) } } : { contact_id: selected?.id }), message, source, source_submission_id: submission, ...(role !== "agent" ? { assigned_agent_id: queue ? null : mode === "new" ? agent : selected?.primary_agent.id } : {}) });
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try { const result = await apiCommand("/api/v1/enquiries", parsed.data, enquirySchema, attempt.current.key); router.push(`/leads/${result.id}`); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); setBusy(false); }
  }
  async function reuse(id: string) {
    setReusing(true); reuseFocus.current = true;
    setError(undefined);
    try { const contact = await apiGet(`/api/v1/contacts/${id}`, contactSchema); setSelected(contact); setMode("existing"); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setReusing(false); }
  }
  return <Form {...form}><form noValidate onSubmit={event => void submit(event)} className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]" aria-busy={busy || reusing}>
    <fieldset disabled={!hydrated || busy || reusing} className="grid min-w-0 content-start gap-5">
      <section className="form-surface grid min-w-0 gap-5"><SectionHeading icon={ContactIcon}>Contact</SectionHeading>
      <div className="grid gap-2"><Label htmlFor="contact-mode">Contact de la demande</Label><NativeSelect id="contact-mode" value={mode} onChange={event => { setMode(event.target.value); setError(undefined); }}><option value="new">Nouveau contact</option><option value="existing">Contact existant</option></NativeSelect></div>
      {mode === "new" ? <><ContactFields form={form} />{role !== "agent" ? <AgentPicker value={agent} change={setAgent} /> : <p className="text-sm text-muted-foreground">Vous serez l’agent responsable du nouveau contact.</p>}</> : <>{selected ? <div className="grid gap-2"><p className="wrap-anywhere"><strong>Contact choisi : {selected.name}</strong></p><p>{selected.primary_phone}</p><Button type="button" variant="outline" className="justify-self-start" onClick={() => setSelected(undefined)}>Choisir un autre contact</Button></div> : <ContactSelector choose={setSelected} />}</>}
      </section><fieldset className="form-surface grid gap-4"><legend className="sr-only">Demande</legend><SectionHeading icon={EnquiryIcon} tone="purple">Demande</SectionHeading>
        <div className="grid gap-2"><Label htmlFor="enquiry-source">Source</Label><NativeSelect id="enquiry-source" value={source} onChange={event => setSource(event.target.value as keyof typeof sourceLabels)}>{Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
        <div className="grid gap-2"><Label htmlFor="enquiry-message">Message de la demande (facultatif)</Label><Textarea id="enquiry-message" value={message} maxLength={4000} rows={4} onChange={event => setMessage(event.target.value)} /></div>
        {role !== "agent" ? <div className="grid gap-2"><Label htmlFor="enquiry-queue">Attribution de la demande</Label><NativeSelect id="enquiry-queue" value={queue ? "queue" : "owner"} onChange={event => setQueue(event.target.value === "queue")}><option value="owner">Agent responsable du contact</option><option value="queue">Non attribuée, file du responsable</option></NativeSelect></div> : null}
      </fieldset>
    </fieldset>
    <LeadDraftSummary control={form.control} mode={mode} contact={selected} source={source} />
    <div className="grid min-w-0 gap-4 xl:col-span-2"><CommandError error={error} reuse={id => void reuse(id)} dismiss={() => setError(undefined)} returnFocus={submitButton} />
    {reusing ? <p role="status">Chargement du contact choisi…</p> : null}
    <div className="flex flex-wrap gap-2"><Button ref={submitButton} type="submit" disabled={!hydrated || busy || reusing}>{reusing ? "Chargement du contact…" : busy ? "Enregistrement…" : "Créer le Lead"}</Button><Button asChild variant="outline"><Link href="/leads">Annuler</Link></Button></div>
    <p className="text-sm text-muted-foreground">Le contact et sa demande sont enregistrés ensemble. Une nouvelle demande ne crée pas automatiquement une affaire.</p></div>
  </form></Form>;
}

function LeadDraftSummary({ control, mode, contact, source }: { control: Control<Values>; mode: string; contact?: ContactSummary; source: keyof typeof sourceLabels }) {
  const name = useWatch({ control, name: "name" }), phones = useWatch({ control, name: "phones" });
  return <aside className="grid min-w-0 content-start gap-4 self-start rounded-md border bg-accent p-4" aria-label="Résumé de la saisie"><h2 className="flex items-center gap-2 font-semibold"><TaskIcon aria-hidden="true" className="size-4 text-link" />Résumé de la demande</h2><dl className="grid gap-4 text-sm"><div><dt className="mb-1 text-xs text-muted-foreground">Contact</dt><dd className="wrap-anywhere">{mode === "existing" ? contact?.name || "À sélectionner" : name || "À renseigner"}</dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Téléphone principal</dt><dd className="wrap-anywhere">{mode === "existing" ? contact?.primary_phone || "À sélectionner" : phones.find(phone => phone.is_primary)?.number || "À renseigner"}</dd></div><div><dt className="mb-1 text-xs text-muted-foreground">Source</dt><dd>{sourceLabels[source]}</dd></div></dl><p className="border-t pt-3 text-xs text-muted-foreground">Brouillon : aucune demande n’est créée avant l’enregistrement.</p></aside>;
}
