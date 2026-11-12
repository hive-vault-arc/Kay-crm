"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DossierFormHeader, useDossierDraft } from "@/components/shared/dossier-form";
import { RecordHeader } from "@/components/shared/record-header";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { contactFieldsSchema, contactSchema, editEnquirySchema, enquirySchema, statusLabels, writableStatusSchema, type Contact, type ContactFields as ClientValues, type Enquiry } from "./contracts";
import { ContactFields } from "./contact-fields";
import { LeadQualificationFields } from "./lead-qualification-fields";
import { qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { CommandError, RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { useEnquiryCommand } from "./use-enquiry-command";
import { currentRecord } from "@/features/realtime/current-record";

const fields = editEnquirySchema.omit({ expected_version: true, contact_fields: true });
type Values = z.infer<typeof fields>;
function clientValues(contact: Contact): ClientValues {
  return { name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails, roles: contact.roles, country: contact.country, nationality: contact.nationality, birth_date: contact.birth_date, languages: contact.languages };
}
function leadValues(enquiry: Enquiry): Values {
  return { message: enquiry.message, status: writableStatusSchema.parse(enquiry.status), initial_budget: enquiry.initial_budget ?? "", campaign_source: enquiry.campaign_source, rating: enquiry.rating };
}

export function LeadEditor({ enquiry }: { enquiry: Enquiry }) {
  if (enquiry.status === "converted") return <><RecordHeader title="Modifier le prospect" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} /><section className="surface grid gap-4"><h2 className="text-section">Prospect déjà converti</h2><p>Son historique est conservé. Poursuivez le suivi depuis l’affaire.</p><Button action="show" asChild><Link href={enquiry.converted_deal_id ? `/deals/${enquiry.converted_deal_id}` : `/leads/${enquiry.id}`}>Ouvrir l’affaire</Link></Button></section></>;
  return <LoadEditor key={enquiry.id + ":" + enquiry.contact.id} enquiry={enquiry} />;
}
function LoadEditor({ enquiry }: { enquiry: Enquiry }) {
  const contact = useQuery(`/api/v1/contacts/${enquiry.contact.id}`, contactSchema);
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [loaded, setLoaded] = useState<{ contact: Contact; metadata: QualificationMetadata }>();
  const incoming = contact.value?.id === enquiry.contact.id && metadata.value ? { contact: contact.value, metadata: metadata.value } : undefined;
  if (incoming && (loaded?.contact !== incoming.contact || loaded.metadata !== incoming.metadata)) setLoaded(incoming);
  const failure = [contact.error, metadata.error].find(error => error && [401, 403, 404].includes(error.status));
  const value = incoming ?? loaded, mismatch = Boolean(contact.value && contact.value.id !== enquiry.contact.id);
  if (failure) return <><RecordHeader title="Modifier le prospect" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} /><RecordError error={failure} retry={() => { contact.refresh(); metadata.refresh(); }} /></>;
  if (value) return <>{contact.error || metadata.error || mismatch ? <RecordError error={contact.error ?? metadata.error ?? new ApiError("CONTACT_MERGED", 409)} retry={() => { contact.refresh(); metadata.refresh(); }} /> : null}<LeadEditorForm key={enquiry.id + ":" + enquiry.contact.id} enquiry={enquiry} contact={value.contact} metadata={value.metadata} unavailable={Boolean(contact.error || metadata.error || !contact.value || !metadata.value || mismatch)} /></>;
  return <><RecordHeader title="Modifier le prospect" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} />{contact.error || metadata.error || mismatch ? <RecordError error={contact.error ?? metadata.error ?? new ApiError("CONTACT_MERGED", 409)} retry={() => { contact.refresh(); metadata.refresh(); }} /> : <p role="status">Chargement du contact et des champs du prospect…</p>}</>;
}
function LeadEditorForm({ enquiry, contact, metadata, unavailable = false }: { enquiry: Enquiry; contact: Contact; metadata: QualificationMetadata; unavailable?: boolean }) {
  const hydrated = useHydrated();
  const clientForm = useForm<ClientValues>({ resolver: zodResolver(contactFieldsSchema), defaultValues: clientValues(contact) });
  const form = useForm<Values>({ resolver: zodResolver(fields), defaultValues: leadValues(enquiry) });
  const [budget, campaign, rating, status] = useWatch({ control: form.control, name: ["initial_budget", "campaign_source", "rating", "status"] });
  const qualification = { initial_budget: budget, campaign_source: campaign, rating, status };
  const [versions, setVersions] = useState({ lead: enquiry.version, contact: contact.version });
  const [acceptedContact, setAcceptedContact] = useState(contact);
  const displayContact = currentRecord(contact, acceptedContact, contact.id) ?? contact;
  const [validationError, setValidationError] = useState<ApiError>();
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(false), [converted, setConverted] = useState<Enquiry>(), [redirected, setRedirected] = useState<{ saved: boolean }>();
  const lock = useRef(false);
  const clientDraft = useWatch({ control: clientForm.control });
  const leadDraft = useWatch({ control: form.control });
  const originalClient = useRef(JSON.stringify(clientValues(contact)));
  const command = useEnquiryCommand({ id: enquiry.id, contactId: contact.id, saved: async (result, signal) => {
    const fresh = await apiGet(`/api/v1/contacts/${contact.id}`, contactSchema, signal);
    if (signal.aborted) return;
    if (fresh.id !== contact.id) {
      const current = await apiGet(`/api/v1/enquiries/${enquiry.id}`, enquirySchema, signal);
      if (signal.aborted) return;
      if (current.id !== enquiry.id || current.contact.id !== fresh.id) throw new ApiError("INVALID_RESPONSE", 503);
      setRedirected({ saved: true }); draft.accept(); setSuccess(true); return;
    }
    if (fresh.version < result.contact.version) throw new ApiError("INVALID_RESPONSE", 503);
    const client = clientValues(fresh), lead = leadValues(result);
    setVersions({ lead: result.version, contact: fresh.version }); setAcceptedContact(fresh); originalClient.current = JSON.stringify(client);
    form.reset(lead); clientForm.reset(client); draft.accept({ client, lead }); setSuccess(true);
  } });
  const draft = useDossierDraft({ client: clientDraft, lead: leadDraft }, command.protected || validating);
  const error = validationError ?? command.error;
  const current = enquirySchema.safeParse(error?.details?.current);
  const readonly = Boolean(converted || redirected || displayContact.archived_at || enquiry.archived_at || enquiry.contact.archived_at);
  function renew() {
    if (lock.current || unavailable || readonly) return false;
    if (command.complete ? !command.begin() : !command.canEdit()) return false;
    setValidationError(undefined); setSuccess(false); return true;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (command.uncertain) { await command.retry(); return; }
    if (lock.current || unavailable || readonly) return;
    if (command.complete && (!draft.dirty || !command.begin())) return;
    if (!command.canEdit()) return;
    lock.current = true; setValidating(true);
    try {
    setValidationError(undefined); setSuccess(false);
    if (!(await clientForm.trigger(undefined, { shouldFocus: true })) || !command.canEdit()) return;
    if (!clientForm.getValues("languages")?.length) { clientForm.setError("languages", { message: "Choisissez au moins une langue." }); return; }
    if (!(await form.trigger(undefined, { shouldFocus: true })) || !command.canEdit()) return;
    const client = clientForm.getValues();
    const changed = JSON.stringify(client) !== originalClient.current;
    const body = { ...form.getValues(), expected_version: versions.lead, ...(changed ? { contact_fields: { ...client, expected_version: versions.contact } } : {}) };
    await command.submit(body);
    } finally { lock.current = false; if (command.active()) setValidating(false); }
  }
  async function reload() {
    if (lock.current || !command.canEdit()) return;
    let readonlyResult = false;
    const refreshed = await command.refresh(async signal => {
      const [lead, client] = await Promise.all([
        apiGet(`/api/v1/enquiries/${enquiry.id}`, enquirySchema, signal),
        apiGet(`/api/v1/contacts/${contact.id}`, contactSchema, signal),
      ]);
      if (signal.aborted) return;
      if (lead.id !== enquiry.id || lead.contact.id !== client.id) throw new ApiError("CONTACT_MERGED", 409);
      if (client.id !== contact.id) { readonlyResult = true; setRedirected({ saved: false }); draft.accept(); return; }
      if (lead.status === "converted") { readonlyResult = true; setConverted(lead); return; }
      form.reset(leadValues(lead)); clientForm.reset(clientValues(client));
      setVersions({ lead: lead.version, contact: client.version });
      setAcceptedContact(client);
      originalClient.current = JSON.stringify(clientValues(client)); draft.accept({ client: clientValues(client), lead: leadValues(lead) }); setValidationError(undefined); setSuccess(false);
    });
    if (refreshed && !readonlyResult) command.begin();
  }
  if (command.accessError) return <><RecordHeader title="Modifier le prospect" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} /><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">Le prospect est enregistré. Les droits d’accès ont changé.</p> : null}</>;
  if (redirected) return <><RecordHeader title={redirected.saved ? "Prospect enregistré" : "Contact fusionné"} route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} /><p role="status">{redirected.saved ? "Le prospect est enregistré. Son contact a été fusionné ; ouvrez la fiche actualisée pour poursuivre." : "Le contact a été fusionné. Reprenez la modification depuis le prospect actualisé."}</p><Button action="show" asChild><Link href={`/leads/${enquiry.id}`}>Ouvrir le prospect actualisé</Link></Button></>;
  if (converted) return <><RecordHeader title="Prospect déjà converti" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} /><p>Son historique est conservé. Poursuivez le suivi depuis l’affaire.</p><Button action="show" asChild><Link href={converted.converted_deal_id ? `/deals/${converted.converted_deal_id}` : `/leads/${enquiry.id}`}>Ouvrir l’affaire</Link></Button></>;
  return <form noValidate onChange={() => { if (command.complete) renew(); }} onSubmit={event => void submit(event)} className="kay-dossier-form" aria-busy={command.protected || validating} data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined}>
    <DossierFormHeader title="Modifier le prospect" route={`/leads/${enquiry.id}/edit`} backHref={`/leads/${enquiry.id}`} description={displayContact.name} actions={<><Button action="back" asChild variant="outline" disabled={command.protected || validating}><Link href={`/leads/${enquiry.id}`}>Retour au prospect</Link></Button><Button action="save" disabled={!hydrated || command.busy || validating || !command.uncertain && (unavailable || readonly || command.needsReview)} type="submit">{command.busy || validating ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Enregistrer"}</Button></>} />
    <fieldset disabled={!hydrated || command.protected || validating || unavailable || readonly} className="kay-form-sheet kay-surface">
      <RecordSection title="Contact"><Form {...clientForm}><ContactFields form={clientForm} metadata={metadata} requireLanguages compact workspace /></Form></RecordSection>
      <RecordSection title="Qualification du prospect">
        <Form {...form}><LeadQualificationFields workspace value={qualification} change={patch => {
          if (!renew()) return;
          if (patch.initial_budget !== undefined) form.setValue("initial_budget", patch.initial_budget, { shouldDirty: true, shouldValidate: true });
          if (patch.campaign_source !== undefined) form.setValue("campaign_source", patch.campaign_source, { shouldDirty: true });
          if (patch.status !== undefined) form.setValue("status", patch.status, { shouldDirty: true });
          if (patch.rating !== undefined) form.setValue("rating", patch.rating, { shouldDirty: true });
        }} metadata={metadata} budgetError={form.formState.errors.initial_budget?.message} message={<FormField control={form.control} name="message" render={({ field }) => <FormItem className="kay-form-field"><FormLabel>Message</FormLabel><FormControl><Textarea {...field} rows={3} maxLength={4000} /></FormControl><FormMessage /></FormItem>} />} />
        </Form>
      </RecordSection>
    </fieldset>
    <CommandError error={error} dismiss={() => { if (command.canEdit()) setValidationError(undefined); }} />
    {command.uncertain ? <p role="status">{command.acknowledged ? "Le prospect est enregistré. Actualisez ses coordonnées sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même modification pour retrouver son résultat."}</p> : null}
    {current.success && current.data.id === enquiry.id && current.data.contact.id === contact.id && !command.uncertain ? <section className="surface grid gap-3 border-warning bg-warning-background" aria-label="Comparaison du prospect"><h2 className="font-medium">Version actuelle {current.data.version}</h2><p>{current.data.contact.name} · {statusLabels[current.data.status]} · {current.data.initial_budget ?? "Budget non renseigné"}</p><p>Votre saisie est conservée. Rechargez les coordonnées et la qualification avant de reprendre la modification.</p><Button action="refresh" type="button" variant="outline" className="justify-self-start" disabled={command.protected || validating} onClick={() => void reload()}>Charger la version actuelle</Button></section> : null}
    {success ? <p role="status" className="text-success">Prospect enregistré.</p> : null}
    <p className="text-xs text-muted-foreground">La provenance et le responsable sont conservés. Les coordonnées partagées sont mises à jour sur le contact, dans le même enregistrement.</p>

  </form>;
}
