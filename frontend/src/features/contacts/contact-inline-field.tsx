"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { KayIconComponent } from "@/components/icons";
import { PhoneIcon, EmailIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InlineFieldForm, InlineFieldLoading, InlineRecordField, type InlineEditorControls } from "@/components/shared/inline-record-field";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { ContactFields } from "./contact-fields";
import { contactFieldsSchema, contactSchema, roleLabels, type Contact, type ContactSummary, type ContactFields as Values } from "./contracts";
import { countryLabel } from "./qualification-inputs";
import { languageLabels, qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";

import { contactEditValues as editableContactValues, type ContactEditBinding } from "./contact-edit-intent";
import { useContactEditCommand } from "./use-contact-edit-command";
import { ContactEditRecovery } from "./contact-edit-recovery";

export type ContactField = keyof Values;
export { editableContactValues as contactEditValues };
export function contactFieldText(contact: ContactSummary | Contact, field: ContactField): string {
  if (field === "name") return contact.name;
  if (field === "birth_date") return "birth_date" in contact && contact.birth_date ? contact.birth_date.split("-").reverse().join("/") : "Non renseignée";
  if (field === "type") return contact.type === "person" ? "Personne" : "Organisation";
  if (field === "country" || field === "nationality") return countryLabel(contact[field]);
  if (field === "languages") return contact.languages.map(value => languageLabels[value] ?? value).join(", ") || "Non renseignées";
  if (field === "phones") return "phones" in contact ? contact.phones.map(value => value.number + (value.label ? " · " + value.label : "") + (value.is_primary ? " · principal" : "")).join("\n") : contact.primary_phone;
  if (field === "emails") return "emails" in contact ? contact.emails.map(value => value.email + (value.label ? " · " + value.label : "") + (value.is_primary ? " · principal" : "")).join("\n") || "Non renseignés" : contact.primary_email || "Non renseigné";
  return "roles" in contact ? contact.roles.map(value => roleLabels[value]).join(", ") || "Non renseignés" : "Non renseignés";
}
export function ContactInlineField({ contact, field, label, icon, writable, saved, denied, display, methodScope = "all", actorId, role }: {
  contact: ContactSummary | Contact; field: ContactField; label: string; icon: KayIconComponent; writable: boolean; saved: (contact: Contact) => void | Promise<void>; denied: (error: ApiError, acknowledged?: boolean) => void; display?: ReactNode; methodScope?: "all" | "primary" | "secondary"; actorId?: ContactEditBinding["actorId"]; role?: ContactEditBinding["role"];
}) {
  const methods = field === "phones" ? "phones" in contact ? contact.phones.filter(value => methodScope === "all" || value.is_primary === (methodScope === "primary")).map(value => value.number) : methodScope === "secondary" ? [] : [contact.primary_phone] : field === "emails" ? "emails" in contact ? contact.emails.filter(value => methodScope === "all" || value.is_primary === (methodScope === "primary")).map(value => value.email) : methodScope !== "secondary" && contact.primary_email ? [contact.primary_email] : [] : [];
  return <InlineRecordField label={label} icon={icon} writable={writable && !contact.archived_at} display={display ?? <span className="whitespace-pre-wrap">{contactFieldText(contact, field)}</span>} actions={methods.length ? <div className="kay-inline-methods">{methods.map(value => <a key={value} href={(field === "phones" ? "tel:" : "mailto:") + value} aria-label={(field === "phones" ? "Appeler " : "Écrire à ") + value} title={value}>{field === "phones" ? <PhoneIcon size={16} aria-hidden="true" /> : <EmailIcon size={16} aria-hidden="true" />}</a>)}</div> : undefined} editor={controls => <ContactFieldLoader key={`${contact.id}:${actorId ?? ""}:${role ?? ""}`} actorId={actorId} role={role} id={contact.id} supplied={"phones" in contact ? contact : undefined} field={field} label={label} controls={controls} saved={saved} denied={denied} />} />;
}
function ContactFieldLoader(props: { id: string; supplied?: Contact; field: ContactField; label: string; controls: InlineEditorControls; saved: (contact: Contact) => void | Promise<void>; denied: (error: ApiError, acknowledged?: boolean) => void; actorId?: ContactEditBinding["actorId"]; role?: ContactEditBinding["role"] }) {
  return props.supplied ? <ContactFieldMetadata {...props} contact={props.supplied} /> : <ReadContactField {...props} />;
}
function ReadContactField(props: Parameters<typeof ContactFieldLoader>[0]) {
  const { denied } = props, query = useQuery(`/api/v1/contacts/${props.id}`, contactSchema), [loaded, setLoaded] = useState<Contact>();
  if (query.value && query.value.id === props.id && loaded !== query.value) setLoaded(query.value);
  const refusal = useMemo(() => query.error && [401, 403, 404].includes(query.error.status) ? query.error : query.value && query.value.id !== props.id ? new ApiError("NOT_FOUND", 404) : undefined, [query.error, query.value, props.id]);
  useEffect(() => { if (refusal) denied(refusal); }, [refusal, denied]);
  if (refusal) return <RecordError error={refusal} />;
  const contact = query.value ?? loaded;
  return contact ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<ContactFieldMetadata {...props} contact={contact} unavailable={Boolean(query.error || !query.value)} /></> : query.error ? <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
function ContactFieldMetadata(props: Parameters<typeof ContactFieldLoader>[0] & { contact: Contact; unavailable?: boolean }) {
  const { denied } = props, query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema), [loaded, setLoaded] = useState<QualificationMetadata>();
  if (query.value && loaded !== query.value) setLoaded(query.value);
  const refusal = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  useEffect(() => { if (refusal) denied(refusal); }, [refusal, denied]);
  if (refusal) return <RecordError error={refusal} />;
  if (props.contact.archived_at) return <><p role="status">Ce contact est archivé et reste en lecture seule.</p><Button autoFocus action="close" variant="quiet" onClick={props.controls.cancel}>Fermer</Button></>;
  const metadata = query.value ?? loaded;
  return metadata ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<ContactFieldEditor {...props} metadata={metadata} unavailable={Boolean(props.unavailable || query.error || !query.value)} /></> : query.error ? <><RecordError error={query.error} retry={query.refresh} /><Button autoFocus action="cancel" variant="quiet" onClick={props.controls.cancel}>Annuler</Button></> : <InlineFieldLoading cancel={props.controls.cancel} />;
}
export function ContactFieldEditor({ contact, metadata, field, label, controls, saved, denied, actorId, role, unavailable = false }: {
  contact: Contact; metadata: QualificationMetadata; field: ContactField; label: string; controls: InlineEditorControls; saved: (contact: Contact) => void | Promise<void>; denied: (error: ApiError, acknowledged?: boolean) => void; unavailable?: boolean;
} & ContactEditBinding) {
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: editableContactValues(contact) });
  const [version, setVersion] = useState(contact.version), [invalid, setInvalid] = useState("");
  const hydrated = useHydrated(), alive = useRef(true);
  const command = useContactEditCommand({ contact, actorId, role, available: !unavailable, completed: saved, denied });
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(values: Values) {
    setInvalid(""); await command.save({ ...values, expected_version: version }, async value => { await saved(value); if (alive.current) controls.saved(); });
  }
  function reload(current: Contact, keep: boolean) {
    if (!command.accept(current)) return;
    const value = form.getValues(field);
    form.reset(editableContactValues(current)); if (keep) form.setValue(field, value, { shouldDirty: true, shouldValidate: true }); setVersion(current.version); setInvalid("");
  }
  if (command.denial) return <>{command.acknowledged ? <p role="status">Les coordonnées sont enregistrées. Les droits d’accès ont changé.</p> : null}<RecordError error={command.denial} /></>;
  const current = command.comparison;
  const review = <><ContactEditRecovery command={command} unavailable={unavailable} />
    {current ? <div className="kay-inline-conflict"><p>Version actuelle {current.version} : <strong className="whitespace-pre-wrap">{contactFieldText(current, field)}</strong></p><p>Les autres coordonnées seront conservées depuis cette version.</p>{!current.archived_at ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={command.pending || unavailable} onClick={() => reload(current, false)}>Charger ce champ</Button><Button action="compare" type="button" variant="outline" disabled={command.pending || unavailable} onClick={() => reload(current, true)}>Conserver ma saisie</Button></div> : <p>Contact archivé : aucune modification possible.</p>}</div> : null}
  </>;
  return <Form {...form}><InlineFieldForm label={label} dirty={form.formState.isDirty} busy={command.pending || form.formState.isSubmitting} recovering={command.uncertain} reviewRequired={command.needsReview} review={review} disabled={!hydrated || !command.active() || command.complete || Boolean(contact.archived_at) || unavailable && !command.uncertain} submit={event => { event.preventDefault(); if (command.uncertain) void command.retry(); else void form.handleSubmit(submit, () => { const parsed = contactFieldsSchema.safeParse(form.getValues()); setInvalid(parsed.success ? "Vérifiez les coordonnées." : parsed.error.issues[0]?.message ?? "Vérifiez les coordonnées."); })(event); }} cancel={controls.cancel}>
    <ContactFields form={form} metadata={metadata} compact only={field} />
    {invalid ? <p role="alert" className="kay-inline-error">{invalid} Le bouton Modifier permet de revoir les autres coordonnées.</p> : null}
  </InlineFieldForm></Form>;
}
