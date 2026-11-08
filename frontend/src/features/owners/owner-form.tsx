"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DossierFormHeader, useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { RecordHeader } from "@/components/shared/record-header";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { ContactFields } from "@/features/contacts/contact-fields";
import { ContactSelector } from "@/features/contacts/contact-selector";
import { contactFieldsSchema, contactSchema, editContactSchema, newContactSchema, type Contact, type ContactFields as Values, type StaffRole } from "@/features/contacts/contracts";
import { qualificationMetadataSchema, type QualificationMetadata } from "@/features/contacts/qualification-contracts";
import { CommandError, RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { ownerRoleBody, ownerValues } from "./owner-form-model";
import { useOwnerFormCommand } from "./use-owner-form-command";
import { OwnerContactChoice, OwnerContactSnapshot } from "./owner-form-parts";
import { OwnerLoading } from "./owner-loading";

type OwnerFormOptions = { actorId?: string; presentation?: "page" | "drawer"; onSaved?: (id: string, contact?: Contact) => void | Promise<void>; cancel?: () => void; onDenied?: (error: ApiError, acknowledged?: boolean) => void };
export function OwnerForm({ id, role, actorId, presentation = "page", ...options }: { id?: string; role: StaffRole } & OwnerFormOptions) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [revision, setRevision] = useState(0), [loaded, setLoaded] = useState<QualificationMetadata>();
  if (metadata.value && loaded !== metadata.value) setLoaded(metadata.value);
  const heading = presentation === "drawer" ? null : <RecordHeader title={id ? "Modifier le propriétaire" : "Ajouter un propriétaire"} route={id ? `/owners/${id}/edit` : "/owners/new"} backHref={id ? `/owners/${id}` : "/owners"} />;
  const onDenied = options.onDenied;
  useEffect(() => { if (metadata.error && [401, 403, 404].includes(metadata.error.status)) onDenied?.(metadata.error); }, [metadata.error, onDenied]);
  const retry = () => { metadata.refresh(); setRevision(value => value + 1); }, current = metadata.value ?? loaded;
  if (metadata.error && [401, 403, 404].includes(metadata.error.status)) return <>{heading}<RecordError error={metadata.error} retry={retry} /></>;
  if (!current) return metadata.error ? <>{heading}<RecordError error={metadata.error} retry={metadata.refresh} /></> : <>{heading}<OwnerLoading label="Chargement du formulaire" /></>;
  const props = { role, actorId, metadata: current, retry, presentation, unavailable: Boolean(metadata.error || !metadata.value), readError: metadata.error, readRetry: metadata.refresh, ...options }, key = `${id ?? "new"}:${actorId ?? ""}:${role}:${revision}`;
  return id ? <OwnerEditLoader key={key} id={id} {...props} /> : <OwnerFormFields key={key} {...props} />;
}
type OwnerFieldsProps = { role: StaffRole; metadata: QualificationMetadata; retry: () => void; unavailable: boolean; readError?: ApiError; readRetry: () => void } & OwnerFormOptions;
function OwnerEditLoader({ id, ...props }: { id: string } & OwnerFieldsProps) {
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const [loaded, setLoaded] = useState<Contact>(), [aliasError] = useState(() => new ApiError("NOT_FOUND", 404));
  const mismatch = Boolean(loaded && query.value && loaded.id !== query.value.id), refusal = query.error && [401, 403, 404].includes(query.error.status) ? query.error : mismatch ? aliasError : undefined;
  if (query.value && !mismatch && loaded !== query.value) setLoaded(query.value);
  const onDenied = props.onDenied;
  useEffect(() => { if (refusal) onDenied?.(refusal); }, [refusal, onDenied]);
  if (refusal) return <RecordError error={refusal} retry={props.retry} />;
  const contact = query.value ?? loaded;
  if (!contact) return query.error ? <RecordError error={query.error} retry={query.refresh} /> : <OwnerLoading label="Chargement du propriétaire" />;
  return <OwnerFormFields key={`${contact.id}:${props.actorId ?? ""}:${props.role}`} {...props} contact={contact} unavailable={Boolean(props.unavailable || query.error || !query.value)} readError={query.error ?? props.readError} readRetry={query.error ? query.refresh : props.readRetry} />;
}
function OwnerFormFields({ role, actorId, metadata, contact, retry, presentation = "page", onSaved, cancel, onDenied, unavailable, readError, readRetry }: { contact?: Contact } & OwnerFieldsProps) {
  const hydrated = useHydrated(), router = useRouter(), scope = useRef<HTMLFormElement>(null), guard = useUnsavedGuard();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: ownerValues(contact) });
  const values = useWatch({ control: form.control });
  const [mode, setMode] = useState("new"), [selected, setSelected] = useState<Contact>(), [selectedId, setSelectedId] = useState("");
  const [agent, setAgent] = useState(""), [agentName, setAgentName] = useState("");
  const [version, setVersion] = useState(contact?.version ?? 1), [validating, setValidating] = useState(false), [selecting, setSelecting] = useState(false);
  const [localError, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const lock = useRef(false), mounted = useRef(true), lookup = useRef<AbortController | null>(null), trigger = useRef<HTMLButtonElement>(null);
  const isReuse = !contact && mode === "existing";
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; lookup.current?.abort(); }; }, []);
  const hidePrivate = useCallback((failure: ApiError, acknowledged?: boolean) => { lookup.current?.abort(); setDenied(failure); setSelected(undefined); setSelectedId(""); onDenied?.(failure, acknowledged); }, [onDenied]);
  const command = useOwnerFormCommand({ contact, subject: contact ?? selected, actorId, role, available: !unavailable, denied: hidePrivate }), saving = validating || command.busy;
  const activeValues = { fields: values, agent: !contact ? agent : "", selectedId: isReuse ? selectedId : "", recovery: command.uncertain }, draft = useDossierDraft(activeValues, saving);
  const current = command.comparison, error = localError ?? command.error;
  function authorityDenied(failure: ApiError) { command.deny(failure); }
  async function finish(value: Contact, confirmed: typeof activeValues, signal: AbortSignal) { if (!mounted.current || signal.aborted) return; draft.accept(confirmed); if (onSaved) await onSaved(value.id, value); else router.push(`/owners/${value.id}`); }
  function clearChoice() { if (lock.current || !command.reset()) return; lookup.current?.abort(); setSelected(undefined); setSelectedId(""); setSelecting(false); setError(undefined); }
  async function chooseExisting(id: string) {
    if (lock.current || !command.canEdit() || !contactSchema.shape.id.safeParse(id).success || !command.reset()) return;
    lookup.current?.abort(); const controller = new AbortController(); lookup.current = controller;
    setMode("existing"); setSelected(undefined); setSelectedId(id); setSelecting(true); setError(undefined);
    try { const result = await apiGet(`/api/v1/contacts/${id}`, contactSchema, controller.signal); if (!controller.signal.aborted && mounted.current) setSelected(result); }
    catch (reason) { if (!controller.signal.aborted && mounted.current) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if ([401, 403, 404].includes(failure.status)) authorityDenied(failure); else setError(failure); } }
    finally { if (!controller.signal.aborted && mounted.current) setSelecting(false); }
  }
  async function persist(fields?: Values) {
    if (isReuse && (!selected || selected.archived_at)) return;
    const confirmed = structuredClone({ ...activeValues, recovery: false });
    const completed = (value: Contact, signal: AbortSignal) => finish(value, confirmed, signal);
    if (isReuse && selected?.roles.includes("owner")) { await command.start({ kind: "open", id: selected.id, version: selected.version }, completed); return; }
    if (!isReuse && !contact && role !== "agent" && !agent) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const ownerFields = fields && { ...fields, roles: [...new Set([...fields.roles, "owner" as const])] };
    const parsed = isReuse && selected ? editContactSchema.safeParse(ownerRoleBody(selected)) : contact ? editContactSchema.safeParse({ ...ownerFields, expected_version: version }) : newContactSchema.safeParse({ ...ownerFields, ...(role !== "agent" ? { primary_agent_id: agent } : {}) });
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const target = isReuse ? selected : contact;
    if (target) await command.start({ kind: isReuse ? "add-role" : "edit", id: target.id, body: editContactSchema.parse(parsed.data) }, completed);
    else await command.start({ kind: "create", body: newContactSchema.parse(parsed.data) }, completed);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || selecting || !hydrated || command.busy || !command.uncertain && !command.canEdit()) return;
    lock.current = true; setValidating(true); setError(undefined);
    try { if (command.uncertain) await command.retry(); else if (isReuse) await persist(); else await form.handleSubmit(persist)(event); }
    finally { lock.current = false; if (mounted.current) setValidating(false); }
  }
  function adopt(value: Contact, keep = false) {
    if (!command.accept(value)) return;
    if (isReuse) { setSelected(value); setSelectedId(value.id); }
    else { setVersion(value.version); if (!keep) { const fields = ownerValues(value); form.reset(fields); draft.accept({ fields, agent: "", selectedId: "", recovery: false }); } form.setFocus("name"); }
    setError(undefined);
  }
  const route = contact ? `/owners/${contact.id}/edit` : "/owners/new", back = contact ? `/owners/${contact.id}` : "/owners";
  const title = contact ? "Modifier le propriétaire" : "Ajouter un propriétaire";
  const heading = presentation === "drawer" ? null : <RecordHeader title={title} route={route} backHref={back} />;
  if (denied || command.denial) return <>{heading}{command.acknowledged ? <p role="status">La modification est enregistrée. Les droits d’accès ont changé.</p> : null}<RecordError error={denied ?? command.denial!} retry={retry} /></>;
  if (contact?.archived_at && !saving && !command.uncertain) return <>{heading}<p className="text-sm text-warning">Ce contact est archivé. Gérez sa restauration depuis sa fiche avant de le modifier.</p></>;
  const fieldsDisabled = !hydrated || saving || command.uncertain || command.complete || command.needsReview || unavailable || !command.active();
  const actions = <>{presentation === "drawer" && cancel ? <Button action="cancel" type="button" variant="outline" disabled={saving || command.uncertain} onClick={cancel}>Annuler</Button> : <Button action="cancel" asChild variant="outline" disabled={saving || command.uncertain}><Link prefetch={false} href={back}>Annuler</Link></Button>}<Button ref={trigger} action={command.uncertain ? "retry" : contact ? "save" : isReuse && selected?.roles.includes("owner") ? "show" : "create"} type="submit" disabled={!hydrated || saving || selecting || command.complete || !command.active() || !command.uncertain && (unavailable || command.needsReview || isReuse && (!selected || Boolean(selected.archived_at)))}>{saving ? "Enregistrement…" : command.uncertain ? command.kind === "open" ? "Réessayer l’ouverture" : command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : contact ? "Enregistrer les modifications" : isReuse ? selected?.roles.includes("owner") ? "Ouvrir le propriétaire" : "Ajouter le rôle Propriétaire" : "Créer le propriétaire"}</Button></>;
  return <>{guard.dialog}<Form {...form}><form ref={scope} noValidate className={presentation === "drawer" ? "kay-drawer-form" : "kay-dossier-form"} aria-label={title} data-draft-managed data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} aria-busy={saving} onSubmit={event => void submit(event)}>
    {presentation === "page" ? <DossierFormHeader title={title} route={route} backHref={back} description="Identité et coordonnées du contact propriétaire." actions={actions} /> : null}
    <div className={presentation === "drawer" ? "kay-owner-drawer-fields" : "kay-surface kay-form-sheet"}>
      {readError ? <RecordError error={readError} retry={readRetry} /> : null}
      <CommandError error={error} record="propriétaire" reuse={!contact && !command.uncertain ? id => void chooseExisting(id) : undefined} returnFocus={trigger} dismiss={() => { setError(undefined); command.clear(); }} />
      {command.uncertain ? <p role="status" className="text-sm text-muted-foreground">{command.kind === "open" ? "L’ouverture a été interrompue. Réessayez le même contact pour retrouver son état actuel." : command.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
      {command.needsReview && !current ? <Button action="compare" type="button" variant="outline" disabled={saving || unavailable} onClick={() => void command.compare()}>Comparer la version actuelle</Button> : null}
      {!contact ? <RecordSection title="Contact propriétaire"><fieldset disabled={fieldsDisabled} className="grid min-w-0 gap-4"><Label htmlFor="owner-contact-mode">Contact</Label><NativeSelect id="owner-contact-mode" value={mode} onChange={event => { if (!lock.current && command.canEdit()) { clearChoice(); setMode(event.target.value); } }}><option value="new">Créer un nouveau contact</option><option value="existing">Choisir un contact existant</option></NativeSelect>
        {isReuse ? selected ? <OwnerContactChoice contact={selected} change={clearChoice} disabled={saving || command.uncertain || command.needsReview || unavailable} /> : <><ContactSelector choose={item => void chooseExisting(item.id)} denied={authorityDenied} />{selecting ? <p role="status">Chargement du contact sélectionné…</p> : null}{error && selectedId && !selecting ? <Button action="retry" type="button" variant="outline" className="justify-self-start" onClick={() => void chooseExisting(selectedId)}>Recharger le contact sélectionné</Button> : null}</> : <p className="text-sm text-muted-foreground">Choisissez un contact existant pour éviter un doublon.</p>}
      </fieldset></RecordSection> : null}
      <fieldset hidden={isReuse} disabled={fieldsDisabled || isReuse} className={`grid min-w-0 gap-0 ${contact ? "" : "border-t pt-5"}`}><ContactFields form={form} metadata={metadata} requiredRole="owner" workspace ownerLayout assignment={!contact && !isReuse && role !== "agent" ? <AgentPicker value={agent} selectedLabel={agentName} change={(id, name) => { if (!lock.current && command.canEdit()) { setAgent(id); setAgentName(name ?? ""); } }} denied={authorityDenied} /> : <p className="text-sm text-muted-foreground">Agent responsable : {contact?.primary_agent.display_name ?? "vous-même"}. L’attribution ne change pas dans cette fiche.</p>} /></fieldset>
      {current ? <RecordSection title={`Version actuelle ${current.version}`}><OwnerContactSnapshot contact={current} /><p className="text-sm">Votre saisie est conservée. Comparez-la avant de poursuivre.</p>{current.archived_at ? <p className="text-sm text-warning">Contact archivé : aucune modification possible.</p> : <div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" disabled={saving || unavailable} onClick={() => guard.request(() => adopt(current), scope.current ?? undefined)}>Charger la version actuelle</Button>{!isReuse ? <Button action="compare" type="button" variant="outline" disabled={saving || unavailable} onClick={() => adopt(current, true)}>Conserver ma saisie sur cette version</Button> : null}</div>}</RecordSection> : null}
      <p className="text-sm text-muted-foreground">Les biens se rattachent depuis leur fiche dans Projets. Le rôle Propriétaire ne crée aucun lien de propriété.</p>
    </div>
    {presentation === "drawer" ? <div className="kay-form-footer">{actions}</div> : null}
  </form></Form></>;
}
