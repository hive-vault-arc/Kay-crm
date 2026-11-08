"use client";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { contactFieldsSchema, roleLabels, type Contact, type ContactFields as Values } from "./contracts";
import { ContactFields } from "./contact-fields";
import { RecordError } from "./record-states";
import { useQuery } from "./use-query";
import { languageLabels, qualificationMetadataSchema, type QualificationMetadata } from "./qualification-contracts";
import { countryLabel } from "./qualification-inputs";
import { contactEditValues, type ContactEditBinding } from "./contact-edit-intent";
import { useContactEditCommand } from "./use-contact-edit-command";
import { ContactEditRecovery } from "./contact-edit-recovery";

type Props = { contact: Contact; saved: (contact: Contact) => void | Promise<void>; cancel: () => void; denied?: (error: ApiError, acknowledged?: boolean) => void } & ContactEditBinding;
const ignore = () => {};
export function ContactEditor(props: Props) {
  const query = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema), [loaded, setLoaded] = useState<QualificationMetadata>();
  if (query.value && loaded !== query.value) setLoaded(query.value);
  const denied = props.denied ?? ignore, refusal = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  useEffect(() => { if (refusal) denied(refusal); }, [refusal, denied]);
  if (refusal) return <RecordError error={refusal} />;
  const metadata = query.value ?? loaded;
  return metadata ? <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<ContactEditorForm key={`${props.contact.id}:${props.actorId ?? ""}:${props.role ?? ""}`} {...props} denied={denied} metadata={metadata} unavailable={Boolean(query.error || !query.value)} /></> : query.error ? <RecordError error={query.error} retry={query.refresh} /> : <p role="status">Chargement des pays et langues…</p>;
}
function ContactEditorForm({ contact, saved, cancel, metadata, denied = ignore, actorId, role, unavailable }: Props & { metadata: QualificationMetadata; unavailable: boolean }) {
  const hydrated = useHydrated(), alive = useRef(true), scope = useRef<HTMLFormElement>(null), guard = useUnsavedGuard();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: contactEditValues(contact) });
  const [version, setVersion] = useState(contact.version);
  const command = useContactEditCommand({ contact, completed: saved, denied, actorId, role, available: !unavailable });
  const values = useWatch({ control: form.control });
  const draft = useDossierDraft({ fields: values, recovery: command.uncertain }, command.pending || form.formState.isSubmitting);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(values: Values) {
    const confirmed = structuredClone(values);
    await command.save({ ...confirmed, expected_version: version }, async value => { await saved(value); if (alive.current) draft.accept({ fields: confirmed, recovery: false }); });
  }
  function adopt(current: Contact, keep: boolean) {
    if (!command.accept(current)) return;
    setVersion(current.version);
    if (!keep) { const fields = contactEditValues(current); form.reset(fields); draft.accept({ fields, recovery: false }); }
    form.setFocus("name");
  }
  if (command.denial) return <>{command.acknowledged ? <p role="status">Les coordonnées sont enregistrées. Les droits d’accès ont changé.</p> : null}<RecordError error={command.denial} /></>;
  const current = command.comparison, disabled = !hydrated || command.pending || command.complete || !command.active() || !command.uncertain && !command.canEdit();
  return <>{guard.dialog}<Form {...form}><form ref={scope} noValidate aria-label="Modifier les coordonnées du contact" onSubmit={event => { event.preventDefault(); if (command.uncertain) void command.retry(); else void form.handleSubmit(submit)(event); }} className="kay-dossier-form" data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} data-write-recovery={command.uncertain || undefined} aria-busy={command.pending || form.formState.isSubmitting}>
    <fieldset className="kay-form-sheet" disabled={!hydrated || command.protected || unavailable || !command.canEdit()}><ContactFields form={form} metadata={metadata} workspace /></fieldset>
    {contact.archived_at ? <p role="status" className="text-sm text-muted-foreground">Ce contact est archivé : les coordonnées sont conservées en lecture seule.</p> : null}
    <ContactEditRecovery command={command} unavailable={unavailable} />
    {current ? <section className="grid gap-4 rounded-md border border-warning bg-warning-background p-4" aria-label="Comparaison du contact"><h3 className="font-medium">Version actuelle {current.version}</h3><p className="wrap-anywhere">{current.name}</p><p>{current.type === "person" ? "Personne" : "Organisation"}</p><div className="grid gap-2"><h4 className="font-medium">Téléphones actuels</h4>{current.phones.map(phone => <p className="wrap-anywhere" key={phone.number}>{phone.number}{phone.label ? `, ${phone.label}` : ""}{phone.is_primary ? " (principal)" : ""}</p>)}</div><div className="grid gap-2"><h4 className="font-medium">E-mails actuels</h4>{current.emails.length ? current.emails.map(email => <p className="wrap-anywhere" key={email.email}>{email.email}{email.label ? `, ${email.label}` : ""}{email.is_primary ? " (principal)" : ""}</p>) : <p>Non renseignés.</p>}</div><p>Rôles actuels : {current.roles.map(value => roleLabels[value]).join(", ") || "non renseignés"}</p><p>Pays de résidence : {countryLabel(current.country)}</p><p>Nationalité : {countryLabel(current.nationality)}</p><p>Langues : {current.languages.map(value => languageLabels[value] ?? value).join(", ") || "Non renseignées"}</p><p>Votre saisie reste dans le formulaire. Comparez-la avant de remplacer la version actuelle.</p>{!current.archived_at ? <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={command.pending || unavailable} onClick={() => guard.request(() => adopt(current, false), scope.current ?? undefined)}>Charger la version actuelle</Button><Button action="compare" type="button" variant="outline" className="h-auto min-h-control whitespace-normal" disabled={command.pending || unavailable} onClick={() => adopt(current, true)}>Conserver ma saisie pour remplacer cette version</Button></div> : <p>Contact archivé : aucune modification possible.</p>}</section> : null}
    <p className="text-sm text-muted-foreground">La source initiale et l’agent responsable ne changent pas ici. Toutes les demandes de ce contact utiliseront cette identité.</p>
    <div className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={command.pending} onClick={cancel}>Annuler la modification</Button><Button action={command.uncertain ? "retry" : "save"} disabled={disabled} type="submit">{command.pending ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la modification" : "Enregistrer le contact"}</Button></div>
  </form></Form></>;
}
