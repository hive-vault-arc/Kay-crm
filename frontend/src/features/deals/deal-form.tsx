"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DossierFormHeader, useDossierDraft } from "@/components/shared/dossier-form";
import { RecordSection } from "@/components/shared/record-workspace";
import { RecordHeader } from "@/components/shared/record-header";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
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
import { dealSchema, editDealSchema, newDealSchema, ordinaryStages, stageLabels, type Deal, type DealContext, type DealFields } from "./contracts";
import { OfferingPicker, RequirementPicker } from "./context-picker";
import { ProjectPicker, type ProjectSelection } from "./project-picker";
import { paymentLabels } from "./qualification-contracts";
import { useDealFormCommand } from "./use-deal-form-command";
import type { EnquiryDenied } from "@/features/contacts/use-enquiry-command";

type Props = {
  contact?: ContactSummary; role?: StaffRole; actorId?: string; context?: DealContext; offering?: Offering | null; unavailable?: boolean;
  value?: Deal; saved: (id: string, accepted: Deal, signal: AbortSignal) => Promise<void>; cancel?: () => void; busyChanged?: (busy: boolean) => void; denied?: EnquiryDenied;
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
  return <DealFormLifetime key={`${props.value?.id ?? "new"}:${props.value?.contact.id ?? props.contact?.id ?? ""}:${props.actorId ?? ""}:${props.role ?? "agent"}:${JSON.stringify(props.context ?? {})}`} {...props} />;
}
function DealFormLifetime(props: Props) {
  const { denied } = props;
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<QualificationMetadata>();
  if (metadata.value && metadata.value !== loaded) setLoaded(metadata.value);
  const failure = metadata.error && [401, 403, 404].includes(metadata.error.status) ? metadata.error : undefined;
  useEffect(() => { if (failure) denied?.(failure); }, [failure, denied]);
  const value = metadata.value ?? loaded;
  if (failure || !value) return <><RecordHeader title={props.value ? "Modifier l’affaire" : "Nouvelle affaire"} route={props.value ? `/deals/${props.value.id}` : "/deals/new"} backHref="/deals" />{metadata.error ? <RecordError error={metadata.error} retry={metadata.refresh} /> : <p role="status">Chargement des champs de qualification…</p>}</>;
  const unavailable = props.unavailable || Boolean(metadata.error || !metadata.value);
  return <>{metadata.error ? <RecordError error={metadata.error} retry={metadata.refresh} /> : null}{props.value ? <EditClientLoader {...props} metadata={value} contactId={props.value.contact.id} unavailable={unavailable} /> : <DealEditorForm {...props} metadata={value} unavailable={unavailable} />}</>;
}
function EditClientLoader(props: Props & { metadata: QualificationMetadata; contactId: string }) {
  const { denied } = props;
  const client = useQuery(`/api/v1/contacts/${props.contactId}`, contactSchema);
  const [loaded, setLoaded] = useState<Contact>();
  if (client.value?.id === props.contactId && client.value !== loaded) setLoaded(client.value);
  const failure = client.error && [401, 403, 404].includes(client.error.status) ? client.error : undefined;
  useEffect(() => { if (failure) denied?.(failure); }, [failure, denied]);
  if (failure) return <RecordError error={failure} />;
  const profile = client.value?.id === props.contactId ? client.value : loaded, mismatch = Boolean(client.value && client.value.id !== props.contactId);
  if (!profile) return mismatch ? <div className="grid gap-3"><p>Les coordonnées ont changé. Reprenez depuis l’affaire actualisée.</p><Button action="show" asChild><Link href={`/deals/${props.value?.id}`}>Ouvrir l’affaire actualisée</Link></Button></div> : client.error ? <RecordError error={client.error} retry={client.refresh} /> : <p role="status">Chargement du profil du client…</p>;
  return <>{client.error || mismatch ? <RecordError error={client.error ?? new ApiError("CONTACT_MERGED", 409)} retry={client.refresh} /> : null}<DealEditorForm {...props} profile={profile} unavailable={props.unavailable || Boolean(client.error || !client.value || mismatch)} /></>;
}
function DealEditorForm({ contact, role = "agent", actorId, context = {}, offering = null, value, profile, metadata, saved, cancel, busyChanged, denied, unavailable = false }: Props & { profile?: Contact; metadata: QualificationMetadata }) {
  const client = useForm<ClientFields>({ resolver: zodResolver(contactFieldsSchema), defaultValues: profile ? clientValues(profile) : blankContact });
  const [mode, setMode] = useState(contact ? "existing" : "new");
  const [selectedContact, setSelectedContact] = useState(contact);
  const [agent, setAgent] = useState("");
  const [fields, setFields] = useState(() => ({ ...dealValues(value), requirement_id: value?.requirement_id ?? context.requirement_id ?? null }));
  const [projects, setProjects] = useState(() => projectValues(value));
  const [selectedOffering, setSelectedOffering] = useState(value?.offering ?? offering);
  const [stage, setStage] = useState<(typeof ordinaryStages)[number]>("new");
  const [versions, setVersions] = useState({ deal: value?.version ?? 1, contact: profile?.version ?? 1 });
  const [validationError, setValidationError] = useState<ApiError>();
  const [validation, setValidation] = useState<string[]>([]);
  const [validating, setValidating] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [acceptedContact, setAcceptedContact] = useState(profile);
  const [readonly, setReadonly] = useState<{ deal: Deal; saved: boolean }>();
  const [success, setSuccess] = useState(false), [linkedNotice, setLinkedNotice] = useState("");
  const baseline = useRef(profile ? JSON.stringify(clientValues(profile)) : "");
  const acceptedOnce = useRef(false);
  const submitButton = useRef<HTMLButtonElement>(null);
  const validationSummary = useRef<HTMLDivElement>(null);
  const focusLanguages = useRef(false);
  const hydrated = useHydrated();
  const router = useRouter();
  const lock = useRef(false);
  const available = useRef(!unavailable);
  const currentWritable = !value || !value.archived_at && !value.contact.archived_at && [...ordinaryStages, "reserved"].includes(value.stage);
  useLayoutEffect(() => { available.current = !unavailable && currentWritable && !readonly; }, [unavailable, currentWritable, readonly]);
  const clientDraft = useWatch({ control: client.control });
  const command = useDealFormCommand({ ...(value ? { mode: "edit" as const, id: value.id, contactId: value.contact.id } : { mode: "create" as const }), role, actorId, denied, protectedChanged: busyChanged, saved: async (deal, freshClient, signal) => {
    if (value && (freshClient.id !== value.contact.id || deal.archived_at || freshClient.archived_at || ![...ordinaryStages, "reserved"].includes(deal.stage))) { setReadonly({ deal, saved: true }); draft.accept(); setSuccess(true); }
    else {
      const fresh = clientValues(freshClient), qualified = dealValues(deal), nextProjects = projectValues(deal);
      client.reset(fresh); baseline.current = JSON.stringify(fresh); setAcceptedContact(freshClient); setFields(qualified); setProjects(nextProjects); setSelectedOffering(deal.offering); setSelectedContact(deal.contact); setVersions({ deal: deal.version, contact: freshClient.version });
      draft.accept({ client: fresh, mode, contact: deal.contact.id, agent, fields: qualified, projects: nextProjects, selectedOffering: deal.offering, stage }); setSuccess(true);
    }
    acceptedOnce.current = true; await saved(deal.id, deal, signal);
  } });
  const draft = useDossierDraft({ client: clientDraft, mode, contact: selectedContact?.id, agent, fields, projects, selectedOffering, stage }, command.protected || validating);
  const error = validationError ?? command.error, current = command.comparison;
  const guard = useUnsavedGuard();
  useEffect(() => { if (validation.length) validationSummary.current?.focus(); }, [validation]);
  useEffect(() => {
    if (validating || !focusLanguages.current) return;
    focusLanguages.current = false;
    client.setFocus("languages");
  }, [client, validating]);
  function renew() {
    if (lock.current || !available.current || (command.complete ? !command.begin() : !command.canEdit())) return false;
    setValidationError(undefined); command.clearError(); setValidation([]); setSuccess(false); return true;
  }
  function change(patch: Partial<DealFields>) { if (renew()) setFields(previous => ({ ...previous, ...patch })); }
  function chooseContact(next?: ContactSummary) {
    if (!renew()) return;
    if (selectedContact?.id !== next?.id && fields.requirement_id) { setFields(previous => ({ ...previous, requirement_id: null })); setLinkedNotice("La recherche liée a été retirée après le changement de contact."); }
    setSelectedContact(next);
  }
  async function reuse(id: string) {
    if (!renew()) return;
    setReloading(true);
    await command.refresh(async signal => {
      const fresh = await apiGet(`/api/v1/contacts/${id}`, contactSchema, signal); if (signal.aborted) return;
      if (selectedContact?.id !== fresh.id && fields.requirement_id) { setFields(previous => ({ ...previous, requirement_id: null })); setLinkedNotice("La recherche liée a été retirée après le changement de contact."); }
      setSelectedContact(fresh); setMode("existing");
    });
    if (command.active()) { setReloading(false); submitButton.current?.focus(); }
  }
  async function loadCurrent() {
    if (!value || lock.current) return;
    let terminal = false;
    const refreshed = await command.refresh(async signal => {
      const [deal, freshClient] = await Promise.all([apiGet(`/api/v1/deals/${value.id}`, dealSchema, signal), apiGet(`/api/v1/contacts/${value.contact.id}`, contactSchema, signal)]);
      if (signal.aborted) return;
      if (deal.id !== value.id || deal.contact.id !== freshClient.id || freshClient.version < deal.contact.version) throw new ApiError("INVALID_RESPONSE", 503);
      if (freshClient.id !== value.contact.id || deal.archived_at || freshClient.archived_at || ![...ordinaryStages, "reserved"].includes(deal.stage)) { terminal = true; setReadonly({ deal, saved: false }); return; }
      setFields(dealValues(deal)); setProjects(projectValues(deal)); setSelectedOffering(deal.offering); setSelectedContact(deal.contact);
      client.reset(clientValues(freshClient)); baseline.current = JSON.stringify(clientValues(freshClient)); setAcceptedContact(freshClient); setVersions({ deal: deal.version, contact: freshClient.version }); setValidationError(undefined); setValidation([]); setSuccess(false);
      draft.accept({ client: clientValues(freshClient), mode, contact: deal.contact.id, agent, fields: dealValues(deal), projects: projectValues(deal), selectedOffering: deal.offering, stage });
    });
    if (refreshed && !terminal) command.begin();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (lock.current) return;
    if (command.uncertain) { await command.retry(); return; }
    if (!available.current || value && acceptedOnce.current && !draft.dirty) return;
    if (command.complete && !command.begin() || !command.canEdit()) return;
    lock.current = true; setValidating(true); busyChanged?.(true);
    try {
    setValidationError(undefined); setValidation([]); setSuccess(false);
    if ((value || mode === "new") && (!(await client.trigger(undefined, { shouldFocus: true })) || !command.canEdit() || !available.current)) return;
    if ((value || mode === "new") && !client.getValues("languages")?.length) {
      client.setError("languages", { message: "Choisissez au moins une langue." });
      focusLanguages.current = true;
      return;
    }
    if (!value && mode === "existing" && !selectedContact) { setValidation(["Choisissez le contact de l’affaire."]); return; }
    if (!value && mode === "existing" && !selectedContact?.languages.length) { setValidationError(new ApiError("LANGUAGES_REQUIRED", 422)); return; }
    if (!value && mode === "new" && role !== "agent" && !agent) { setValidationError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const clientFields = client.getValues();
    const qualification = { ...fields, projects: projects.map(project => project.selected?.choice ?? {}), offering_id: selectedOffering?.id ?? null, expected_offering_version: selectedOffering?.version ?? null };
    const body = value ? { ...qualification, expected_version: versions.deal, ...(JSON.stringify(clientFields) !== baseline.current ? { contact_fields: { ...clientFields, expected_version: versions.contact } } : {}) } : { ...qualification, stage, ...(mode === "new" ? { new_contact: { ...clientFields, ...(role !== "agent" ? { primary_agent_id: agent } : {}) } } : { contact_id: selectedContact?.id }) };
    const parsed = (value ? editDealSchema : newDealSchema).safeParse(body);
    if (!parsed.success) { setValidation([...new Set(parsed.error.issues.map(issue => issue.message))]); return; }
    await command.submit(parsed.data);
    } finally { lock.current = false; if (command.active()) { setValidating(false); busyChanged?.(command.locked()); } }
  }
  if (command.accessError) return <><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">L’affaire est enregistrée. Les droits d’accès ont changé.</p> : null}</>;
  if (readonly) return <div className="grid gap-3"><p role="status">{readonly.saved ? "L’affaire est enregistrée. Reprenez depuis sa fiche actualisée." : "Ce dossier a changé. Reprenez depuis sa fiche actualisée."}</p><Button action="show" asChild><Link href={`/deals/${readonly.deal.id}`}>Ouvrir l’affaire actualisée</Link></Button></div>;
  const projectFields = (project: ProjectDraft, index: number) => <section key={project.id} className="kay-form-project" aria-label={`Projet ${index + 1}`}><h3 className="text-sm font-medium">{index ? `Projet ${index + 1}` : "Projet principal"}</h3><ProjectPicker selected={project.selected} choose={selected => { if (renew()) setProjects(previous => previous.map(item => item.id === project.id ? { ...item, selected } : item)); }} denied={command.deny} />{projects.length > 1 ? <Button action="release" type="button" variant="ghost" className="justify-self-start" onClick={() => { if (renew()) setProjects(previous => previous.filter(item => item.id !== project.id)); }}>Retirer le projet {index + 1}</Button> : null}</section>;
  return <Form {...client}><form noValidate aria-label={value ? "Modifier l’affaire" : "Nouvelle affaire"} aria-busy={command.protected || validating} className="kay-dossier-form" data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} onChange={() => { if (command.complete) renew(); }} onSubmit={event => void submit(event)}>
    <DossierFormHeader title={value ? "Modifier l’affaire" : "Nouvelle affaire"} route={value ? `/deals/${value.id}` : "/deals/new"} backHref={value ? `/deals/${value.id}` : "/deals"} description={acceptedContact?.name ?? value?.contact.name ?? "Contact et dossier"} actions={<><Button action="cancel" type="button" variant="outline" disabled={command.protected || validating} onClick={() => { if (command.active() && !lock.current && !command.locked()) guard.request(() => { if (command.active() && !command.locked()) { if (cancel) cancel(); else router.push("/deals"); } }); }}>Annuler</Button><Button action={value ? "save" : "create"} ref={submitButton} type="submit" disabled={!hydrated || command.busy || validating || !command.uncertain && (unavailable || !currentWritable || command.needsReview || !value && command.complete)}>{reloading ? "Chargement…" : command.busy || validating ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : value ? "Enregistrer" : "Créer l’affaire"}</Button></>} />
    <fieldset disabled={!hydrated || command.protected || validating || unavailable || !currentWritable || command.needsReview || !value && command.complete} className="kay-form-sheet kay-surface">
      <RecordSection title="Contact">
        {!value && !contact ? <div className="kay-form-context"><div className="grid gap-2"><Label htmlFor="deal-client-mode">Client de l’affaire</Label><NativeSelect id="deal-client-mode" value={mode} onChange={event => { if (!renew()) return; setMode(event.target.value); if (fields.requirement_id) { setFields(previous => ({ ...previous, requirement_id: null })); setLinkedNotice("La recherche liée a été retirée après le changement de contact."); } }}><option value="new">Nouveau contact</option><option value="existing">Contact existant</option></NativeSelect></div>{mode === "new" && role !== "agent" ? <AgentPicker value={agent} change={next => { if (renew()) setAgent(next); }} denied={command.deny} /> : null}</div> : null}
        {value || mode === "new" ? <ContactFields form={client} metadata={metadata} requireLanguages compact workspace /> : selectedContact ? <div className="kay-contact-choice"><p className="font-medium wrap-anywhere">{selectedContact.name}</p><div className="kay-contact-choice-meta"><span>{selectedContact.primary_phone}</span><span>Responsable : {selectedContact.primary_agent.display_name}</span><Link href={`/contacts/${selectedContact.id}`} className="inline-flex min-h-control items-center text-link underline">Fiche du contact</Link></div>{!selectedContact.languages.length ? <p className="text-warning">Renseignez ses langues dans sa fiche avant de créer l’affaire.</p> : null}{!contact ? <Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => chooseContact(undefined)}>Changer de contact</Button> : null}</div> : <ContactSelector choose={chooseContact} denied={command.deny} />}
      </RecordSection>
      <RecordSection title="Projet et budget">
        <div className="kay-form-columns"><div className="kay-form-column">{projects.map(projectFields)}{projects.length < 3 ? <Button action="create" type="button" variant="outline" className="justify-self-start" onClick={() => { if (renew()) setProjects(previous => [...previous, { id: crypto.randomUUID() }]); }}>Ajouter un projet</Button> : null}</div>
          <div className="kay-form-column"><div className="kay-form-field"><Label htmlFor="deal-budget">Budget *</Label><BudgetInput id="deal-budget" metadata={metadata} value={fields.initial_budget} onChange={initial_budget => change({ initial_budget })} /></div>
            <details className="kay-form-disclosure"><summary>Recherche et offre liées (facultatif)</summary><div className="grid min-w-0 gap-5 pt-4">{selectedContact && (value || mode === "existing") ? <RequirementPicker contactId={selectedContact.id} selected={fields.requirement_id} choose={requirement_id => change({ requirement_id })} denied={command.deny} /> : <p className="text-sm text-muted-foreground">Les recherches seront disponibles après la création du contact.</p>}<OfferingPicker selected={selectedOffering} choose={next => { if (renew()) setSelectedOffering(next); }} denied={command.deny} /></div></details>
          </div>
        </div>
      </RecordSection>
      <RecordSection title="Qualification de l’affaire"><div className="kay-form-columns"><div className="kay-form-column">
        <div className="kay-form-field"><Label htmlFor="deal-rating">Qualification</Label><NativeSelect id="deal-rating" value={fields.rating} onChange={event => change({ rating: event.target.value as DealFields["rating"] })}>{Object.entries(ratingLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
        <div className="kay-form-field"><Label htmlFor="deal-payment">Financement</Label><NativeSelect id="deal-payment" value={fields.payment_method ?? ""} onChange={event => change({ payment_method: event.target.value as DealFields["payment_method"] || null })}><option value="">Non renseigné</option>{Object.entries(paymentLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
        <div className="kay-form-field"><Label htmlFor="deal-rooms">Pièces</Label><Input id="deal-rooms" inputMode="numeric" type="number" min={0} max={50} value={fields.number_of_rooms ?? ""} onChange={event => change({ number_of_rooms: event.target.value === "" ? null : Number(event.target.value) })} /></div>
        <div className="kay-form-field"><Label htmlFor="deal-next-action">Action prévue</Label><Textarea id="deal-next-action" maxLength={1000} rows={3} value={fields.next_action} onChange={event => change({ next_action: event.target.value })} /></div>
      </div><div className="kay-form-column">
        <div className="kay-form-field"><Label htmlFor="deal-source">Campagne</Label><NativeSelect id="deal-source" value={fields.campaign_source} onChange={event => change({ campaign_source: event.target.value as DealFields["campaign_source"] })}>{Object.entries(campaignLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</NativeSelect></div>
        {!value ? <div className="kay-form-field"><Label htmlFor="initial-stage">Étape initiale</Label><NativeSelect id="initial-stage" value={stage} onChange={event => { if (renew()) setStage(event.target.value as typeof stage); }}>{ordinaryStages.map(code => <option key={code} value={code}>{stageLabels[code]}</option>)}</NativeSelect></div> : null}
        <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Motifs d’achat *</legend><div className="flex flex-wrap gap-x-5 gap-y-1">{metadata.purchase_reasons.map(reason => <Label key={reason.value} className="flex min-h-control items-center gap-2"><Checkbox checked={fields.purchase_reasons.includes(reason.value as DealFields["purchase_reasons"][number])} onCheckedChange={checked => change({ purchase_reasons: checked ? [...new Set([...fields.purchase_reasons, reason.value as DealFields["purchase_reasons"][number]])] : fields.purchase_reasons.filter(code => code !== reason.value) })} />{reason.label}</Label>)}</div></fieldset>
        <div className="kay-form-field"><Label htmlFor="deal-notes">Notes</Label><Textarea id="deal-notes" rows={3} maxLength={4000} value={fields.notes} onChange={event => change({ notes: event.target.value })} /></div>
      </div></div></RecordSection>
    </fieldset>
    <div className="kay-form-feedback">
      {linkedNotice ? <p role="status">{linkedNotice}</p> : null}
      {unavailable || !currentWritable ? <p role="status">Les données actuelles sont indisponibles ou le dossier est en lecture seule. Actualisez avant un nouvel enregistrement.</p> : null}
      {command.uncertain ? <p role="status">{command.acknowledged ? "L’affaire est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
      {success ? <p role="status">Affaire enregistrée.</p> : null}
      {validation.length ? <div ref={validationSummary} tabIndex={-1} role="alert" className="grid gap-2 text-danger"><p>Complétez la qualification avant d’enregistrer.</p><ul className="list-inside list-disc">{validation.map(message => <li key={message}>{message}</li>)}</ul></div> : null}
      <CommandError error={error} record="affaire" reuse={!value ? id => void reuse(id) : undefined} dismiss={() => { if (renew()) setValidationError(undefined); }} returnFocus={submitButton} />
      {command.needsReview ? <section aria-label="Version actuelle de l’affaire" className="grid gap-3 border-y py-4"><h3 className="font-medium">Version actuelle {current?.version ?? "à vérifier"}</h3>{current ? <p className="wrap-anywhere">{current.title} · {stageLabels[current.stage]}</p> : null}<p>Votre brouillon est conservé. Charger la version actuelle remplacera les champs affichés.</p><Button action="refresh" type="button" variant="outline" className="justify-self-start" disabled={command.protected || validating} onClick={() => void loadCurrent()}>Charger la version actuelle</Button></section> : null}
    </div>{guard.dialog}
  </form></Form>;
}
