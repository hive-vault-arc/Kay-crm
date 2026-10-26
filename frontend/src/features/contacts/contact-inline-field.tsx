"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { KayIconComponent } from "@/components/icons";
import { PhoneIcon, EmailIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InlineFieldForm, InlineFieldLoading, InlineRecordField, type InlineEditorControls } from "@/components/shared/inline-record-field";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { ContactFields } from "./contact-fields";
import { contactFieldsSchema, contactSchema, editContactSchema, roleLabels, type Contact, type ContactSummary, type ContactFields as Values } from "./contracts";
import { countryLabel } from "./qualification-inputs";
import { languageLabels, qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { RecordError, CommandError } from "./record-states";
import { useQuery } from "./use-query";

export type ContactField = keyof Values;
export function contactEditValues(contact: Contact): Values {
  return { name: contact.name, type: contact.type, phones: contact.phones, emails: contact.emails, roles: contact.roles, country: contact.country, nationality: contact.nationality, languages: contact.languages };
}
export function contactFieldText(contact: ContactSummary | Contact, field: ContactField): string {
  if (field === "name") return contact.name;
  if (field === "type") return contact.type === "person" ? "Personne" : "Organisation";
  if (field === "country" || field === "nationality") return countryLabel(contact[field]);
  if (field === "languages") return contact.languages.map(value => languageLabels[value] ?? value).join(", ") || "Non renseignées";
  if (field === "phones") return "phones" in contact ? contact.phones.map(value => value.number + (value.label ? " · " + value.label : "") + (value.is_primary ? " · principal" : "")).join("\n") : contact.primary_phone;
  if (field === "emails") return "emails" in contact ? contact.emails.map(value => value.email + (value.label ? " · " + value.label : "") + (value.is_primary ? " · principal" : "")).join("\n") || "Non renseignés" : contact.primary_email || "Non renseigné";
  return "roles" in contact ? contact.roles.map(value => roleLabels[value]).join(", ") || "Non renseignés" : "Non renseignés";
}
export function ContactInlineField({ contact, field, label, icon, writable, saved, denied, display, methodScope = "all" }: {
  contact: ContactSummary | Contact; field: ContactField; label: string; icon: KayIconComponent; writable: boolean; saved: (contact: Contact) => void; denied: (error: ApiError) => void; display?: ReactNode; methodScope?: "all" | "primary" | "secondary";
}) {
  const methods = field === "phones" ? "phones" in contact ? contact.phones.filter(value => methodScope === "all" || value.is_primary === (methodScope === "primary")).map(value => value.number) : methodScope === "secondary" ? [] : [contact.primary_phone] : field === "emails" ? "emails" in contact ? contact.emails.filter(value => methodScope === "all" || value.is_primary === (methodScope === "primary")).map(value => value.email) : methodScope !== "secondary" && contact.primary_email ? [contact.primary_email] : [] : [];
  return <InlineRecordField label={label} icon={icon} writable={writable && !contact.archived_at} display={display ?? <span className="whitespace-pre-wrap">{contactFieldText(contact, field)}</span>} actions={methods.length ? <div className="kay-inline-methods">{methods.map(value => <a key={value} href={(field === "phones" ? "tel:" : "mailto:") + value} aria-label={(field === "phones" ? "Appeler " : "Écrire à ") + value} title={value}>{field === "phones" ? <PhoneIcon size={16} aria-hidden="true" /> : <EmailIcon size={16} aria-hidden="true" />}</a>)}</div> : undefined} editor={controls => <ContactFieldLoader id={contact.id} supplied={"phones" in contact ? contact : undefined} field={field} label={label} controls={controls} saved={saved} denied={denied} />} />;
}
function ContactFieldLoader(props: { id: string; supplied?: Contact; field: ContactField; label: string; controls: InlineEditorControls; saved: (contact: Contact) => void; denied: (error: ApiError) => void }) {
  return props.supplied ? <ContactFieldMetadata {...props} contact={props.supplied} /> : <ReadContactField {...props} />;
}
function ReadContactField(props: Parameters<typeof ContactFieldLoader>[0]) {
  const { denied } = props;
  const query = useQuery(`/api/v1/contacts/${props.id}`, contactSchema);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  return query.error ? <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></> : query.value ? <ContactFieldMetadata {...props} contact={query.value} /> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
function ContactFieldMetadata(props: Parameters<typeof ContactFieldLoader>[0] & { contact: Contact }) {
  const { denied } = props;
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  useEffect(() => { if (query.error && ["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(query.error.code)) denied(query.error); }, [query.error, denied]);
  if (props.contact.archived_at) return <><p role="status">Ce contact est archivé et reste en lecture seule.</p><Button autoFocus action="close" variant="quiet" onClick={props.controls.cancel}>Fermer</Button></>;
  if (query.error) return <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></>;
  return query.value ? <ContactFieldEditor {...props} metadata={query.value} /> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function ContactFieldEditor({ contact, metadata, field, label, controls, saved, denied }: {
  contact: Contact; metadata: QualificationMetadata; field: ContactField; label: string; controls: InlineEditorControls; saved: (contact: Contact) => void; denied: (error: ApiError) => void;
}) {
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: contactEditValues(contact) });
  const [version, setVersion] = useState(contact.version), [error, setError] = useState<ApiError>(), [invalid, setInvalid] = useState("");
  const [reviewedId] = useState(contact.id);
  const hydrated = useHydrated(), lock = useRef(false), attempt = useRef({ body: "", key: "" });
  const current = contactSchema.safeParse(error?.details?.current);
  async function submit(values: Values) {
    if (lock.current || contact.id !== reviewedId || contact.archived_at) return;
    const parsed = editContactSchema.safeParse({ ...values, expected_version: version });
    if (!parsed.success) { setInvalid(parsed.error.issues[0]?.message ?? "Vérifiez les coordonnées."); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    lock.current = true; setError(undefined); setInvalid("");
    try { const result = await apiCommand(`/api/v1/contacts/${reviewedId}`, parsed.data, contactSchema, attempt.current.key, "PATCH"); saved(result); controls.saved(); }
    catch (reason) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setError(failure); if (["FORBIDDEN", "NOT_FOUND", "UNAUTHENTICATED", "PASSWORD_CHANGE_REQUIRED"].includes(failure.code)) denied(failure); }
    finally { lock.current = false; }
  }
  function reload(keep: boolean) {
    if (!current.success || current.data.id !== reviewedId || current.data.archived_at) return;
    const value = form.getValues(field);
    form.reset(contactEditValues(current.data)); if (keep) form.setValue(field, value, { shouldDirty: true, shouldValidate: true }); setVersion(current.data.version); setError(undefined); setInvalid("");
  }
  return <Form {...form}><InlineFieldForm label={label} dirty={form.formState.isDirty} busy={form.formState.isSubmitting} disabled={!hydrated || contact.id !== reviewedId || Boolean(contact.archived_at)} submit={event => void form.handleSubmit(submit, () => { const parsed = contactFieldsSchema.safeParse(form.getValues()); setInvalid(parsed.success ? "Vérifiez les coordonnées." : parsed.error.issues[0]?.message ?? "Vérifiez les coordonnées."); })(event)} cancel={controls.cancel}>
    <ContactFields form={form} metadata={metadata} compact only={field} />
    {invalid ? <p role="alert" className="kay-inline-error">{invalid} Le bouton Modifier permet de revoir les autres coordonnées.</p> : null}
    <CommandError error={error} dismiss={() => setError(undefined)} />
    {current.success && current.data.id === reviewedId ? <div className="kay-inline-conflict"><p>Version actuelle {current.data.version} : <strong className="whitespace-pre-wrap">{contactFieldText(current.data, field)}</strong></p><p>Les autres coordonnées seront conservées depuis cette version.</p>{!current.data.archived_at ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => reload(false)}>Charger ce champ</Button><Button action="compare" type="button" variant="outline" onClick={() => reload(true)}>Conserver ma saisie</Button></div> : <p>Contact archivé : aucune modification possible.</p>}</div> : null}
  </InlineFieldForm></Form>;
}
