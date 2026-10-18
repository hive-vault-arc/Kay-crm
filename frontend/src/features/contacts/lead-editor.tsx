"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ContactIcon, EnquiryIcon } from "@/components/icons";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { contactFieldsSchema, contactSchema, editEnquirySchema, enquirySchema, statusLabels, writableStatusSchema, type Contact, type ContactFields as ClientValues, type Enquiry } from "./contracts";
import { ContactFields } from "./contact-fields";
import { LeadQualificationFields } from "./lead-qualification-fields";
import { qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { CommandError, RecordError } from "./record-states";
import { useQuery } from "./use-query";

const fields = editEnquirySchema.omit({ expected_version: true, contact_fields: true });
type Values = z.infer<typeof fields>;
function clientValues(contact: Contact): ClientValues {
  return { name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails, roles: contact.roles, country: contact.country, nationality: contact.nationality, languages: contact.languages };
}
function leadValues(enquiry: Enquiry): Values {
  return { message: enquiry.message, status: writableStatusSchema.parse(enquiry.status), initial_budget: enquiry.initial_budget ?? "", campaign_source: enquiry.campaign_source, rating: enquiry.rating };
}

export function LeadEditor({ enquiry }: { enquiry: Enquiry }) {
  if (enquiry.status === "converted") return <section className="surface grid gap-4"><h2 className="text-section font-semibold">Prospect déjà converti</h2><p>Son historique est conservé. Poursuivez le suivi depuis l’affaire.</p><Button action="show" asChild><Link href={enquiry.converted_deal_id ? `/deals/${enquiry.converted_deal_id}` : `/leads/${enquiry.id}`}>Ouvrir l’affaire</Link></Button></section>;
  return <LoadEditor enquiry={enquiry} />;
}
function LoadEditor({ enquiry }: { enquiry: Enquiry }) {
  const contact = useQuery(`/api/v1/contacts/${enquiry.contact.id}`, contactSchema);
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  if (contact.error || metadata.error) return <RecordError error={(contact.error ?? metadata.error)!} retry={() => { contact.refresh(); metadata.refresh(); }} />;
  return contact.value && metadata.value ? <LeadEditorForm enquiry={enquiry} contact={contact.value} metadata={metadata.value} /> : <p role="status">Chargement du contact et des champs du prospect…</p>;
}
function LeadEditorForm({ enquiry, contact, metadata }: { enquiry: Enquiry; contact: Contact; metadata: QualificationMetadata }) {
  const hydrated = useHydrated();
  const clientForm = useForm<ClientValues>({ resolver: zodResolver(contactFieldsSchema), defaultValues: clientValues(contact) });
  const form = useForm<Values>({ resolver: zodResolver(fields), defaultValues: leadValues(enquiry) });
  const [budget, campaign, rating, status] = useWatch({ control: form.control, name: ["initial_budget", "campaign_source", "rating", "status"] });
  const qualification = { initial_budget: budget, campaign_source: campaign, rating, status };
  const [versions, setVersions] = useState({ lead: enquiry.version, contact: contact.version });
  const [error, setError] = useState<ApiError>();
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloading, setReloading] = useState(false);
  const attempt = useRef({ body: "", key: "" });
  const originalClient = useRef(JSON.stringify(clientValues(contact)));
  const current = enquirySchema.safeParse(error?.details?.current);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || reloading) return;
    setError(undefined); setSuccess(false);
    if (!(await clientForm.trigger(undefined, { shouldFocus: true }))) return;
    if (!clientForm.getValues("languages")?.length) { clientForm.setError("languages", { message: "Choisissez au moins une langue." }); return; }
    if (!(await form.trigger(undefined, { shouldFocus: true }))) return;
    const client = clientForm.getValues();
    const changed = JSON.stringify(client) !== originalClient.current;
    const body = { ...form.getValues(), expected_version: versions.lead, ...(changed ? { contact_fields: { ...client, expected_version: versions.contact } } : {}) };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try {
      const result = await apiCommand(`/api/v1/enquiries/${enquiry.id}`, body, enquirySchema, attempt.current.key, "PATCH");
      setVersions({ lead: result.version, contact: result.contact.version });
      originalClient.current = JSON.stringify(client); setSuccess(true);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  async function reload() {
    setReloading(true);
    try {
      const [lead, client] = await Promise.all([
        apiGet(`/api/v1/enquiries/${enquiry.id}`, enquirySchema),
        apiGet(`/api/v1/contacts/${contact.id}`, contactSchema),
      ]);
      if (lead.status === "converted") { setError(new ApiError("LEAD_CONVERTED", 409)); return; }
      form.reset(leadValues(lead)); clientForm.reset(clientValues(client));
      setVersions({ lead: lead.version, contact: client.version });
      originalClient.current = JSON.stringify(clientValues(client)); setError(undefined);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setReloading(false); }
  }
  return <form noValidate onSubmit={event => void submit(event)} className="crm-form" aria-busy={busy || reloading}>
    <fieldset disabled={!hydrated || busy || reloading} className="crm-form-grid">
      <section className="form-surface grid min-w-0 gap-4"><SectionHeading compact icon={ContactIcon}>Coordonnées du client</SectionHeading><Form {...clientForm}><ContactFields form={clientForm} metadata={metadata} requireLanguages compact /></Form></section>
      <section className="form-surface grid min-w-0 gap-4"><SectionHeading compact icon={EnquiryIcon} tone="purple">Qualification du prospect</SectionHeading>
        <Form {...form}><LeadQualificationFields value={qualification} change={patch => {
          if (patch.initial_budget !== undefined) form.setValue("initial_budget", patch.initial_budget, { shouldDirty: true, shouldValidate: true });
          if (patch.campaign_source !== undefined) form.setValue("campaign_source", patch.campaign_source, { shouldDirty: true });
          if (patch.status !== undefined) form.setValue("status", patch.status, { shouldDirty: true });
          if (patch.rating !== undefined) form.setValue("rating", patch.rating, { shouldDirty: true });
        }} metadata={metadata} budgetError={form.formState.errors.initial_budget?.message} />
          <FormField control={form.control} name="message" render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} maxLength={4000} /></FormControl><FormMessage /></FormItem>} />
        </Form>
      </section>
    </fieldset>
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {current.success ? <section className="surface grid gap-3 border-warning bg-warning-background" aria-label="Comparaison du prospect"><h2 className="font-medium">Version actuelle {current.data.version}</h2><p>{current.data.contact.name} · {statusLabels[current.data.status]} · {current.data.initial_budget ?? "Budget non renseigné"}</p><p>Votre saisie est conservée. Rechargez les coordonnées et la qualification avant de reprendre la modification.</p><Button action="refresh" type="button" variant="outline" className="justify-self-start" disabled={reloading} onClick={() => void reload()}>Charger la version actuelle</Button></section> : null}
    {success ? <p role="status" className="text-success">Prospect enregistré.</p> : null}
    <p className="text-xs text-muted-foreground">La provenance et le responsable sont conservés. Les coordonnées partagées sont mises à jour sur le contact, dans le même enregistrement.</p>
    <div className="crm-form-actions"><Button action="save" disabled={!hydrated || busy || reloading} type="submit">{busy ? "Enregistrement…" : "Enregistrer le prospect"}</Button><Button action="back" asChild variant="outline"><Link href={`/leads/${enquiry.id}`}>Voir le prospect</Link></Button></div>
  </form>;
}
