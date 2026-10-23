"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContactIcon } from "@/components/icons";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { ContactFields, blankContact } from "@/features/contacts/contact-fields";
import { contactFieldsSchema, contactSchema, newContactSchema, type Contact, type ContactFields as Values, type StaffRole } from "@/features/contacts/contracts";
import { qualificationMetadataSchema, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { CommandError, RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { OwnerLoading } from "./owner-loading";

function valuesFor(contact?: Contact): Values {
  return contact ? {
    name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails,
    roles: [...new Set([...contact.roles, "owner" as const])],
    country: contact.country, nationality: contact.nationality, languages: contact.languages,
  } : { ...blankContact, roles: ["owner"] };
}

export function OwnerForm({ id, role }: { id?: string; role: StaffRole }) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const title = id ? "Modifier le propriétaire" : "Ajouter un propriétaire";
  const heading = <PageHeader title={title} description="Identité et coordonnées privées du contact propriétaire." route={id ? `/owners/${id}/edit` : "/owners/new"} icon={ContactIcon} />;
  if (metadata.error) return <>{heading}<RecordError error={metadata.error} retry={metadata.refresh} /></>;
  if (!metadata.value) return <>{heading}<OwnerLoading label="Chargement du formulaire" /></>;
  return <div className="grid min-w-0 gap-5">{heading}{id ? <OwnerEditLoader id={id} role={role} metadata={metadata.value} /> : <OwnerFormFields role={role} metadata={metadata.value} />}</div>;
}

function OwnerEditLoader({ id, role, metadata }: { id: string; role: StaffRole; metadata: QualificationMetadata }) {
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <OwnerLoading label="Chargement du propriétaire" />;
  return <OwnerFormFields key={`${id}:${query.value.version}`} role={role} metadata={metadata} contact={query.value} />;
}

function OwnerFormFields({ role, metadata, contact }: { role: StaffRole; metadata: QualificationMetadata; contact?: Contact }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: valuesFor(contact) });
  const [agent, setAgent] = useState("");
  const [error, setError] = useState<ApiError>();
  const attempt = useRef({ body: "", key: "" });
  const title = contact ? "Enregistrer les modifications" : "Créer le propriétaire";
  async function submit(values: Values) {
    setError(undefined);
    const fields = { ...values, roles: [...new Set([...values.roles, "owner" as const])] };
    if (!contact && role !== "agent" && !agent) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const body = contact ? { ...fields, expected_version: contact.version } : { ...fields, ...(role !== "agent" ? { primary_agent_id: agent } : {}) };
    const parsed = contact ? contactFieldsSchema.safeParse(fields) : newContactSchema.safeParse(body);
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    try {
      const saved = await apiCommand(contact ? `/api/v1/contacts/${contact.id}` : "/api/v1/contacts", body, contactSchema, attempt.current.key, contact ? "PATCH" : "POST");
      router.push(`/owners/${saved.id}`);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
  }
  return <Form {...form}><form noValidate className="form-surface grid min-w-0 gap-6" aria-busy={form.formState.isSubmitting} onSubmit={event => void form.handleSubmit(submit)(event)}>
    <div className="grid gap-1"><h2 className="text-section font-medium">Coordonnées du propriétaire</h2><p className="text-sm text-muted-foreground">Le numéro est privé et reste soumis aux droits Contacts. Un propriétaire peut aussi avoir d’autres rôles.</p></div>
    <fieldset disabled={!hydrated || form.formState.isSubmitting} className="grid min-w-0 gap-5"><ContactFields form={form} metadata={metadata} requiredRole="owner" />{!contact && role !== "agent" ? <AgentPicker value={agent} change={setAgent} /> : !contact ? <p className="text-sm text-muted-foreground">Vous serez l’agent responsable de ce contact.</p> : null}</fieldset>
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {error?.code === "VERSION_CONFLICT" ? <p className="text-sm text-warning">Ce contact a changé. Conservez votre saisie, ouvrez la fiche actuelle dans un autre onglet et comparez avant de réessayer.</p> : null}
    <p className="text-sm text-muted-foreground">Pour rattacher un bien ou un programme, ouvrez sa fiche « Propriétaires ». L’identité du contact ne suffit pas à créer un lien de propriété.</p>
    <div className="flex flex-wrap gap-2"><Button action={contact ? "save" : "create"} type="submit" disabled={!hydrated || form.formState.isSubmitting}>{form.formState.isSubmitting ? "Enregistrement…" : title}</Button><Button action="cancel" asChild variant="outline"><Link href={contact ? `/owners/${contact.id}` : "/owners"}>Annuler</Link></Button></div>
  </form></Form>;
}
