"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContactIcon, DealIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { ContactFields, blankContact } from "@/features/contacts/contact-fields";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactFieldsSchema, contactSchema, type Contact, type ContactFields as ClientFields, type ContactSummary, type StaffRole } from "@/features/contacts/contracts";
import { campaignLabels, qualificationMetadataSchema, ratingLabels, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { BudgetInput } from "@/features/contacts/qualification-inputs";
import { CommandError, RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { Offering } from "@/features/inventory/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { dealSchema, editDealSchema, newDealSchema, ordinaryStages, resultSchema, stageLabels, type Deal, type DealContext, type DealFields } from "./contracts";
import { OfferingPicker, RequirementPicker } from "./context-picker";
import { ProjectPicker, type ProjectSelection } from "./project-picker";
import { paymentLabels } from "./qualification-contracts";

type Props = {
  contact?: ContactSummary; role?: StaffRole; context?: DealContext; offering?: Offering | null;
  value?: Deal; saved: (id: string) => Promise<void>; cancel?: () => void; busyChanged?: (busy: boolean) => void; denied?: (error: ApiError) => void;
};
type ProjectDraft = { id: string; selected?: ProjectSelection };
function clientValues(contact: Contact): ClientFields {
  return { name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails, roles: contact.roles, country: contact.country, nationality: contact.nationality, languages: contact.languages };
}
function dealValues(value?: Deal): DealFields {
  return { initial_budget: value?.initial_budget ?? "", campaign_source: value?.campaign_source ?? "unknown", rating: value?.rating ?? "cold", purchase_reasons: value?.purchase_reasons ?? [], projects: [], payment_method: value?.payment_method as DealFields["payment_method"] ?? null, number_of_rooms: value?.number_of_rooms ?? null, notes: value?.notes ?? "", next_action: value?.next_action ?? "", requirement_id: value?.requirement_id ?? null, offering_id: value?.offering?.id ?? null, expected_offering_version: value?.offering?.version ?? null };
}
function projectValues(value?: Deal): ProjectDraft[] {
  return value?.projects.length ? value.projects.map(project => ({ id: String(project.position), selected: { label: project.name, choice: project.development_id ? { development_id: project.development_id } : project.property_id ? { property_id: project.property_id } : { external_name: project.external_name } } })) : [{ id: "1" }];
}

export function DealForm(props: Props) {
  const { denied } = props;
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  useEffect(() => { if (metadata.error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(metadata.error.code)) denied?.(metadata.error); }, [metadata.error, denied]);
  if (metadata.error) return <RecordError error={metadata.error} retry={metadata.refresh} />;
  if (!metadata.value) return <p role="status">Chargement des champs de qualification…</p>;
  return props.value ? <EditClientLoader {...props} metadata={metadata.value} contactId={props.value.contact.id} /> : <DealEditorForm {...props} metadata={metadata.value} />;
}
function EditClientLoader(props: Props & { metadata: QualificationMetadata; contactId: string }) {
  const { denied } = props;
  const client = useQuery(`/api/v1/contacts/${props.contactId}`, contactSchema);
  useEffect(() => { if (client.error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(client.error.code)) denied?.(client.error); }, [client.error, denied]);
  if (client.error) return <RecordError error={client.error} retry={client.refresh} />;
  return client.value ? <DealEditorForm {...props} profile={client.value} /> : <p role="status">Chargement du profil du client…</p>;
}
function DealEditorForm({ contact, role = "agent", context = {}, offering = null, value, profile, metadata, saved, cancel, busyChanged, denied }: Props & { profile?: Contact; metadata: QualificationMetadata }) {
  const client = useForm<ClientFields>({ resolver: zodResolver(contactFieldsSchema), defaultValues: profile ? clientValues(profile) : blankContact });
  const [mode, setMode] = useState(contact ? "existing" : "new");
  const [selectedContact, setSelectedContact] = useState(contact);
  const [agent, setAgent] = useState("");
  const [fields, setFields] = useState(() => ({ ...dealValues(value), requirement_id: value?.requirement_id ?? context.requirement_id ?? null }));
  const [projects, setProjects] = useState(() => projectValues(value));
  const [selectedOffering, setSelectedOffering] = useState(value?.offering ?? offering);
  const [stage, setStage] = useState<(typeof ordinaryStages)[number]>("new");
  const [versions, setVersions] = useState({ deal: value?.version ?? 1, contact: profile?.version ?? 1 });
  const [error, setError] = useState<ApiError>();
  const [validation, setValidation] = useState<string[]>([]);
  const [current, setCurrent] = useState<Deal>();
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const baseline = useRef(profile ? JSON.stringify(clientValues(profile)) : "");
  const attempt = useRef({ key: "", body: "" });
  const submitButton = useRef<HTMLButtonElement>(null);
  const validationSummary = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  useEffect(() => { if (validation.length) validationSummary.current?.focus(); }, [validation]);
  function change(patch: Partial<DealFields>) { setFields(previous => ({ ...previous, ...patch })); setValidation([]); }
  async function reuse(id: string) {
    setReloading(true); setError(undefined);
    try { setSelectedContact(await apiGet(`/api/v1/contacts/${id}`, contactSchema)); setMode("existing"); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setReloading(false); submitButton.current?.focus(); }
  }
  async function loadCurrent() {
    if (!value) return;
    setReloading(true);
    try {
      const [deal, freshClient] = await Promise.all([apiGet(`/api/v1/deals/${value.id}`, dealSchema), apiGet(`/api/v1/contacts/${value.contact.id}`, contactSchema)]);
      if (![...ordinaryStages, "reserved"].includes(deal.stage)) { setError(new ApiError("DEAL_DEDICATED_COMMAND_REQUIRED", 409)); return; }
      setFields(dealValues(deal)); setProjects(projectValues(deal)); setSelectedOffering(deal.offering); setSelectedContact(deal.contact);
      client.reset(clientValues(freshClient)); baseline.current = JSON.stringify(clientValues(freshClient)); setVersions({ deal: deal.version, contact: freshClient.version }); setCurrent(undefined); setError(undefined);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setReloading(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy || reloading) return;
    setError(undefined); setValidation([]);
    if ((value || mode === "new") && !(await client.trigger(undefined, { shouldFocus: true }))) return;
    if ((value || mode === "new") && !client.getValues("languages")?.length) { client.setError("languages", { message: "Choisissez au moins une langue." }, { shouldFocus: true }); return; }
    if (!value && mode === "existing" && !selectedContact) { setValidation(["Choisissez le contact de l’affaire."]); return; }
    if (!value && mode === "existing" && !selectedContact?.languages.length) { setError(new ApiError("LANGUAGES_REQUIRED", 422)); return; }
    if (!value && mode === "new" && role !== "agent" && !agent) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const clientFields = client.getValues();
    const qualification = { ...fields, projects: projects.map(project => project.selected?.choice ?? {}), offering_id: selectedOffering?.id ?? null, expected_offering_version: selectedOffering?.version ?? null };
    const body = value ? { ...qualification, expected_version: versions.deal, ...(JSON.stringify(clientFields) !== baseline.current ? { contact_fields: { ...clientFields, expected_version: versions.contact } } : {}) } : { ...qualification, stage, ...(mode === "new" ? { new_contact: { ...clientFields, ...(role !== "agent" ? { primary_agent_id: agent } : {}) } } : { contact_id: selectedContact?.id }) };
    const parsed = (value ? editDealSchema : newDealSchema).safeParse(body);
    if (!parsed.success) { setValidation([...new Set(parsed.error.issues.map(issue => issue.message))]); return; }
    const serialized = JSON.stringify(parsed.data);
    if (attempt.current.body !== serialized) attempt.current = { body: serialized, key: crypto.randomUUID() };
    setBusy(true); busyChanged?.(true);
    try { const result = await apiCommand(value ? `/api/v1/deals/${value.id}` : "/api/v1/deals", parsed.data, resultSchema, attempt.current.key, value ? "PATCH" : "POST"); await saved(result.id); }
    catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure);
      if (["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(failure.code)) denied?.(failure);
      if (value && failure.code === "DEAL_VERSION_CONFLICT") {
        try { setCurrent(await apiGet(`/api/v1/deals/${value.id}`, dealSchema)); }
        catch (comparison) { if (comparison instanceof ApiError && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED"].includes(comparison.code)) setError(comparison); }
      }
    } finally { setBusy(false); busyChanged?.(false); }
  }
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED", "DEAL_DEDICATED_COMMAND_REQUIRED"].includes(error.code)) return <RecordError error={error} />;
  const projectFields = (project: ProjectDraft, index: number) => <section key={project.id} className={`grid min-w-0 content-start gap-2 border-b pb-4${index > 0 && projects.length === 2 ? " lg:col-span-2" : ""}`} aria-label={`Projet ${index + 1}`}><ProjectPicker selected={project.selected} choose={selected => { setProjects(previous => previous.map(item => item.id === project.id ? { ...item, selected } : item)); setValidation([]); }} />{projects.length > 1 ? <Button action="release" type="button" variant="outline" className="justify-self-start" onClick={() => setProjects(previous => previous.filter(item => item.id !== project.id))}>Retirer le projet {index + 1}</Button> : null}</section>;
  return <Form {...client}><form noValidate aria-label={value ? "Modifier l’affaire" : "Nouvelle affaire"} aria-busy={busy || reloading} className="crm-form" onSubmit={event => void submit(event)}>
    <fieldset disabled={!hydrated || busy || reloading} className="crm-form-grid">
      <section className="form-surface grid min-w-0 gap-4"><SectionHeading compact icon={ContactIcon}>Client</SectionHeading>
        {!value && !contact ? <div className="grid gap-2"><Label htmlFor="deal-client-mode">Client de l’affaire</Label><NativeSelect id="deal-client-mode" value={mode} onChange={event => { setMode(event.target.value); setError(undefined); }}><option value="new">Nouveau contact</option><option value="existing">Contact existant</option></NativeSelect></div> : null}
        {value || mode === "new" ? <><ContactFields form={client} metadata={metadata} requireLanguages compact />{!value && role !== "agent" ? <AgentPicker value={agent} change={setAgent} /> : null}</> : selectedContact ? <div className="grid gap-2"><p className="font-medium wrap-anywhere">{selectedContact.name}</p><p>{selectedContact.primary_phone} · Responsable : {selectedContact.primary_agent.display_name}</p><Link href={`/contacts/${selectedContact.id}`} className="inline-flex min-h-control items-center text-link underline">Consulter le profil du contact</Link>{!selectedContact.languages.length ? <p className="text-warning">Renseignez ses langues dans sa fiche avant de créer l’affaire.</p> : null}{!contact ? <Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => setSelectedContact(undefined)}>Changer de contact</Button> : null}</div> : <ContactSelector choose={setSelectedContact} />}
      </section>
      <section className="form-surface grid min-w-0 gap-4"><SectionHeading compact icon={DealIcon} tone="purple">Qualification et projets</SectionHeading>
        <div className="grid min-w-0 gap-4 @5xl:grid-cols-2"><div className="grid min-w-0 content-start gap-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="deal-budget">Budget *</Label><BudgetInput id="deal-budget" metadata={metadata} value={fields.initial_budget} onChange={initial_budget => change({ initial_budget })} /></div>
          <div className="grid gap-2"><Label htmlFor="deal-source">Source</Label><NativeSelect id="deal-source" value={fields.campaign_source} onChange={event => change({ campaign_source: event.target.value as DealFields["campaign_source"] })}>{Object.entries(campaignLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
          <div className="grid gap-2"><Label htmlFor="deal-rating">Qualification</Label><NativeSelect id="deal-rating" value={fields.rating} onChange={event => change({ rating: event.target.value as DealFields["rating"] })}>{Object.entries(ratingLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
          {!value ? <div className="grid gap-2"><Label htmlFor="initial-stage">Étape initiale</Label><NativeSelect id="initial-stage" value={stage} onChange={event => setStage(event.target.value as typeof stage)}>{ordinaryStages.map(code => <option key={code} value={code}>{stageLabels[code]}</option>)}</NativeSelect></div> : null}</div>
          <fieldset className="grid gap-2"><legend className="mb-2 font-medium">Motifs d’achat *</legend><div className="grid gap-1 sm:grid-cols-2">{metadata.purchase_reasons.map(reason => <Label key={reason.value} className="flex min-h-control items-center gap-2"><Checkbox checked={fields.purchase_reasons.includes(reason.value as DealFields["purchase_reasons"][number])} onCheckedChange={checked => change({ purchase_reasons: checked ? [...fields.purchase_reasons, reason.value as DealFields["purchase_reasons"][number]] : fields.purchase_reasons.filter(code => code !== reason.value) })} />{reason.label}</Label>)}</div></fieldset>
          <div className="grid gap-2"><Label htmlFor="deal-notes">Notes</Label><Textarea id="deal-notes" rows={3} maxLength={4000} value={fields.notes} onChange={event => change({ notes: event.target.value })} /></div>
        </div><div className="grid min-w-0 content-start gap-4">{projectFields(projects[0], 0)}
          <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="deal-payment">Financement (facultatif)</Label><NativeSelect id="deal-payment" value={fields.payment_method ?? ""} onChange={event => change({ payment_method: event.target.value as DealFields["payment_method"] || null })}><option value="">Non renseigné</option>{Object.entries(paymentLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div><div className="grid gap-2"><Label htmlFor="deal-rooms">Nombre de pièces (facultatif)</Label><Input id="deal-rooms" inputMode="numeric" type="number" min={0} max={50} value={fields.number_of_rooms ?? ""} onChange={event => change({ number_of_rooms: event.target.value === "" ? null : Number(event.target.value) })} /></div></div>
          <div className="grid gap-2"><Label htmlFor="deal-next-action">Prochaine action</Label><Textarea id="deal-next-action" maxLength={1000} rows={3} value={fields.next_action} onChange={event => change({ next_action: event.target.value })} /></div>
        </div></div>
        {projects.length > 1 ? <div className="grid min-w-0 gap-4 lg:grid-cols-2">{projects.slice(1).map((project, index) => projectFields(project, index + 1))}</div> : null}
        {projects.length < 3 ? <Button action="create" type="button" variant="outline" className="justify-self-start" onClick={() => setProjects(previous => [...previous, { id: crypto.randomUUID() }])}>Ajouter un projet (maximum 3)</Button> : null}
      </section>
      <details className="form-surface"><summary className="min-h-control cursor-pointer py-3">Recherche et offre d’inventaire liées (facultatif)</summary><div className="grid min-w-0 gap-5 pt-4 lg:grid-cols-2">{selectedContact ? <RequirementPicker contactId={selectedContact.id} selected={fields.requirement_id} choose={requirement_id => change({ requirement_id })} /> : <p>Les recherches seront disponibles après la création du contact.</p>}<OfferingPicker selected={selectedOffering} choose={setSelectedOffering} /></div></details>
    </fieldset>
    {validation.length ? <div ref={validationSummary} tabIndex={-1} role="alert" className="grid gap-2 text-danger"><p>Complétez la qualification avant d’enregistrer.</p><ul className="list-inside list-disc">{validation.map(message => <li key={message}>{message}</li>)}</ul></div> : null}
    <CommandError error={error} record="affaire" reuse={!value ? id => void reuse(id) : undefined} dismiss={() => setError(undefined)} returnFocus={submitButton} />
    {current ? <section aria-label="Version actuelle de l’affaire" className="grid gap-3 border-y py-4"><h3 className="font-medium">Version actuelle {current.version}</h3><p className="wrap-anywhere">{current.title} · {stageLabels[current.stage]}</p><p>Votre brouillon est conservé. Charger la version actuelle remplacera les champs affichés.</p><Button action="refresh" type="button" variant="outline" className="justify-self-start" disabled={busy || reloading} onClick={() => void loadCurrent()}>Charger la version actuelle</Button></section> : null}
    <div className="crm-form-actions"><Button action={value ? "save" : "create"} ref={submitButton} type="submit" disabled={!hydrated || busy || reloading || Boolean(current)}>{busy ? "Enregistrement…" : value ? "Enregistrer l’affaire" : "Créer l’affaire"}</Button>{cancel ? <Button action="cancel" type="button" variant="outline" disabled={busy || reloading} onClick={cancel}>Annuler les modifications</Button> : <Button action="back" asChild variant="outline"><Link href="/deals">Retour aux affaires</Link></Button>}</div>
  </form></Form>;
}
