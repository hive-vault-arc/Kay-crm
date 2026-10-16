"use client";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { contactFieldsSchema, contactSchema, roleLabels, type Contact, type ContactFields as Values } from "./contracts";
import { ContactFields } from "./contact-fields";
import { CommandError } from "./record-states";

function editable(contact: Contact): Values {
  return { name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails, roles: contact.roles };
}
export function ContactEditor({ contact, saved, cancel }: { contact: Contact; saved: (contact: Contact) => void; cancel: () => void }) {
  const hydrated = useHydrated();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: editable(contact) });
  const [version, setVersion] = useState(contact.version);
  const [error, setError] = useState<ApiError>();
  const attempt = useRef({ key: "", body: "" });
  const current = contactSchema.safeParse(error?.details?.current);
  async function submit(values: Values) {
    setError(undefined);
    const body = { ...values, expected_version: version };
    const fingerprint = JSON.stringify(body);
    if (attempt.current.body !== fingerprint) attempt.current = { key: crypto.randomUUID(), body: fingerprint };
    try { saved(await apiCommand(`/api/v1/contacts/${contact.id}`, body, contactSchema, attempt.current.key, "PATCH")); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
  }
  return <Form {...form}><form noValidate onSubmit={event => void form.handleSubmit(submit)(event)} className="form-surface grid max-w-reading gap-6" aria-busy={form.formState.isSubmitting}>
    <fieldset className="grid min-w-0 gap-4" disabled={!hydrated || form.formState.isSubmitting}><ContactFields form={form} /></fieldset>
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {current.success ? <section className="grid gap-4 rounded-md border border-warning bg-warning-background p-4" aria-label="Comparaison du contact"><h3 className="font-medium">Version actuelle {current.data.version}</h3><p className="wrap-anywhere">{current.data.name}</p><p>{current.data.type === "person" ? "Personne" : "Organisation"}</p><div className="grid gap-2"><h4 className="font-medium">Téléphones actuels</h4>{current.data.phones.map(phone => <p className="wrap-anywhere" key={phone.number}>{phone.number}{phone.label ? `, ${phone.label}` : ""}{phone.is_primary ? " (principal)" : ""}</p>)}</div><div className="grid gap-2"><h4 className="font-medium">E-mails actuels</h4>{current.data.emails.length ? current.data.emails.map(email => <p className="wrap-anywhere" key={email.email}>{email.email}{email.label ? `, ${email.label}` : ""}{email.is_primary ? " (principal)" : ""}</p>) : <p>Non renseignés.</p>}</div><p>Rôles actuels : {current.data.roles.map(value => roleLabels[value]).join(", ") || "non renseignés"}</p><p>Votre saisie reste dans le formulaire. Comparez-la avant de remplacer la version actuelle.</p><div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => { form.reset(editable(current.data)); setVersion(current.data.version); setError(undefined); form.setFocus("name"); }}>Charger la version actuelle</Button><Button action="compare" type="button" variant="outline" className="h-auto min-h-control whitespace-normal" onClick={() => { setVersion(current.data.version); setError(undefined); form.setFocus("name"); }}>Conserver ma saisie pour remplacer cette version</Button></div></section> : null}
    <p className="text-sm text-muted-foreground">La source initiale et l’agent responsable ne changent pas ici. Toutes les demandes de ce contact utiliseront cette identité.</p>
    <div className="flex flex-wrap gap-2"><Button action="save" disabled={!hydrated || form.formState.isSubmitting} type="submit">{form.formState.isSubmitting ? "Enregistrement…" : "Enregistrer le contact"}</Button><Button action="cancel" type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={cancel}>Annuler la modification</Button></div>
  </form></Form>;
}
