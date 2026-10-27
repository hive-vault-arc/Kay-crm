"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DossierFormHeader, useDossierDraft } from "@/components/shared/dossier-form";
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
import { apiCommand } from "@/lib/api/command";
import { ownerRoleBody, ownerValues } from "./owner-form-model";
import { OwnerContactChoice, OwnerContactSnapshot } from "./owner-form-parts";
import { OwnerLoading } from "./owner-loading";

type OwnerFormOptions = { presentation?: "page" | "drawer"; onSaved?: (id: string, contact?: Contact) => void; cancel?: () => void; onDenied?: () => void };
export function OwnerForm({ id, role, presentation = "page", ...options }: { id?: string; role: StaffRole } & OwnerFormOptions) {
  const metadata = useQuery("/api/v1/contacts/metadata", qualificationMetadataSchema);
  const [revision, setRevision] = useState(0);
  const heading = presentation === "drawer" ? null : <RecordHeader title={id ? "Modifier le propriétaire" : "Ajouter un propriétaire"} route={id ? `/owners/${id}/edit` : "/owners/new"} backHref={id ? `/owners/${id}` : "/owners"} />;
  const onDenied = options.onDenied;
  useEffect(() => { if (metadata.error && [401, 403, 404].includes(metadata.error.status)) onDenied?.(); }, [metadata.error, onDenied]);
  const retry = () => { metadata.refresh(); setRevision(value => value + 1); };
  if (metadata.error) return <>{heading}<RecordError error={metadata.error} retry={retry} /></>;
  if (!metadata.value) return <>{heading}<OwnerLoading label="Chargement du formulaire" /></>;
  return id ? <OwnerEditLoader key={revision} id={id} role={role} metadata={metadata.value} retry={retry} presentation={presentation} {...options} /> : <OwnerFormFields key={revision} role={role} metadata={metadata.value} retry={retry} presentation={presentation} {...options} />;
}
function OwnerEditLoader({ id, role, metadata, retry, ...options }: { id: string; role: StaffRole; metadata: QualificationMetadata; retry: () => void } & OwnerFormOptions) {
  const query = useQuery(`/api/v1/contacts/${id}`, contactSchema);
  const onDenied = options.onDenied;
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) onDenied?.(); }, [query.error, onDenied]);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <OwnerLoading label="Chargement du propriétaire" />;
  return <OwnerFormFields key={`${id}:${query.value.version}`} role={role} metadata={metadata} contact={query.value} retry={retry} {...options} />;
}
function OwnerFormFields({ role, metadata, contact, retry, presentation = "page", onSaved, cancel, onDenied }: { role: StaffRole; metadata: QualificationMetadata; contact?: Contact; retry: () => void } & OwnerFormOptions) {
  const hydrated = useHydrated(), router = useRouter();
  const form = useForm<Values>({ resolver: zodResolver(contactFieldsSchema), defaultValues: ownerValues(contact) });
  const values = useWatch({ control: form.control });
  const [mode, setMode] = useState("new"), [selected, setSelected] = useState<Contact>(), [selectedId, setSelectedId] = useState("");
  const [agent, setAgent] = useState(""), [agentName, setAgentName] = useState("");
  const [version, setVersion] = useState(contact?.version ?? 1), [saving, setSaving] = useState(false), [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const lock = useRef(false), mounted = useRef(true), lookup = useRef<AbortController | null>(null), attempt = useRef({ body: "", key: "" }), trigger = useRef<HTMLButtonElement>(null);
  const isReuse = !contact && mode === "existing";
  const activeValues = { fields: values, agent: !contact ? agent : "", selectedId: isReuse ? selectedId : "" };
  const draft = useDossierDraft(activeValues, saving);
  const snapshot = contactSchema.safeParse(error?.details?.current);
  const current = snapshot.success && snapshot.data.id === (isReuse ? selected?.id : contact?.id) ? snapshot : { success: false as const };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; lookup.current?.abort(); }; }, []);
  const authorityDenied = useCallback((failure: ApiError) => { lookup.current?.abort(); setDenied(failure); setSelected(undefined); setSelectedId(""); onDenied?.(); }, [onDenied]);
  function finish(id: string, value?: Contact) { draft.accept(activeValues); if (onSaved) onSaved(id, value); else router.push(`/owners/${id}`); }
  function clearChoice() { if (lock.current) return; lookup.current?.abort(); setSelected(undefined); setSelectedId(""); setSelecting(false); setError(undefined); }
  async function chooseExisting(id: string) {
    if (lock.current || !contactSchema.shape.id.safeParse(id).success) return;
    lookup.current?.abort(); const controller = new AbortController(); lookup.current = controller;
    setMode("existing"); setSelected(undefined); setSelectedId(id); setSelecting(true); setError(undefined);
    try { const result = await apiGet(`/api/v1/contacts/${id}`, contactSchema, controller.signal); if (!controller.signal.aborted && mounted.current) setSelected(result); }
    catch (reason) { if (!controller.signal.aborted && mounted.current) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if ([401, 403, 404].includes(failure.status)) authorityDenied(failure); else setError(failure); } }
    finally { if (!controller.signal.aborted && mounted.current) setSelecting(false); }
  }
  async function persist(fields?: Values) {
    if (isReuse && (!selected || selected.archived_at)) return;
    if (isReuse && selected?.roles.includes("owner")) { finish(selected.id, selected); return; }
    if (!isReuse && !contact && role !== "agent" && !agent) { setError(new ApiError("INVALID_ASSIGNEE", 422)); return; }
    const ownerFields = fields && { ...fields, roles: [...new Set([...fields.roles, "owner" as const])] };
    const parsed = isReuse && selected ? editContactSchema.safeParse(ownerRoleBody(selected)) : contact ? editContactSchema.safeParse({ ...ownerFields, expected_version: version }) : newContactSchema.safeParse({ ...ownerFields, ...(role !== "agent" ? { primary_agent_id: agent } : {}) });
    if (!parsed.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const target = isReuse ? selected : contact, path = target ? `/api/v1/contacts/${target.id}` as const : "/api/v1/contacts", method = target ? "PATCH" : "POST";
    const fingerprint = JSON.stringify({ path, method, body: parsed.data });
    if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, key: crypto.randomUUID() };
    try { const saved = await apiCommand(path, parsed.data, contactSchema, attempt.current.key, method); if (mounted.current) finish(saved.id, saved); }
    catch (reason) { if (mounted.current) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if ([401, 403, 404].includes(failure.status)) authorityDenied(failure); else setError(failure); } }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (lock.current || selecting || !hydrated) return;
    lock.current = true; setSaving(true); setError(undefined);
    try { if (isReuse) await persist(); else await form.handleSubmit(persist)(event); }
    finally { lock.current = false; if (mounted.current) setSaving(false); }
  }
  const route = contact ? `/owners/${contact.id}/edit` : "/owners/new", back = contact ? `/owners/${contact.id}` : "/owners";
  const title = contact ? "Modifier le propriétaire" : "Ajouter un propriétaire";
  const heading = presentation === "drawer" ? null : <RecordHeader title={title} route={route} backHref={back} />;
  if (denied) return <>{heading}<RecordError error={denied} retry={retry} /></>;
  if (contact?.archived_at) return <>{heading}<p className="text-sm text-warning">Ce contact est archivé. Gérez sa restauration depuis sa fiche avant de le modifier.</p></>;
  const actions = <>{presentation === "drawer" && cancel ? <Button action="cancel" type="button" variant="outline" disabled={saving} onClick={cancel}>Annuler</Button> : <Button action="cancel" asChild variant="outline" disabled={saving}><Link prefetch={false} href={back}>Annuler</Link></Button>}<Button ref={trigger} action={contact ? "save" : isReuse && selected?.roles.includes("owner") ? "show" : "create"} type="submit" disabled={!hydrated || saving || selecting || isReuse && (!selected || Boolean(selected.archived_at))}>{saving ? "Enregistrement…" : contact ? "Enregistrer les modifications" : isReuse ? selected?.roles.includes("owner") ? "Ouvrir le propriétaire" : "Ajouter le rôle Propriétaire" : "Créer le propriétaire"}</Button></>;
  return <Form {...form}><form noValidate className={presentation === "drawer" ? "kay-drawer-form" : "kay-dossier-form"} aria-label={title} data-draft-managed data-live-dirty={draft.dirty || undefined} aria-busy={saving} onSubmit={event => void submit(event)}>
    {presentation === "page" ? <DossierFormHeader title={title} route={route} backHref={back} description="Identité et coordonnées du contact propriétaire." actions={actions} /> : null}
    <div className={presentation === "drawer" ? "kay-owner-drawer-fields" : "kay-surface kay-form-sheet"}>
      <CommandError error={error} record="propriétaire" reuse={!contact ? id => void chooseExisting(id) : undefined} returnFocus={trigger} dismiss={() => setError(undefined)} />
      {!contact ? <RecordSection title="Contact propriétaire"><fieldset disabled={!hydrated || saving} className="grid min-w-0 gap-4"><Label htmlFor="owner-contact-mode">Contact</Label><NativeSelect id="owner-contact-mode" value={mode} onChange={event => { if (!lock.current) { clearChoice(); setMode(event.target.value); } }}><option value="new">Créer un nouveau contact</option><option value="existing">Choisir un contact existant</option></NativeSelect>
        {isReuse ? selected ? <OwnerContactChoice contact={selected} change={clearChoice} disabled={saving} /> : <><ContactSelector choose={item => void chooseExisting(item.id)} denied={authorityDenied} />{selecting ? <p role="status">Chargement du contact sélectionné…</p> : null}{error && selectedId && !selecting ? <Button action="retry" type="button" variant="outline" className="justify-self-start" onClick={() => void chooseExisting(selectedId)}>Recharger le contact sélectionné</Button> : null}</> : <p className="text-sm text-muted-foreground">Choisissez un contact existant pour éviter un doublon.</p>}
      </fieldset></RecordSection> : null}
      <fieldset hidden={isReuse} disabled={!hydrated || saving || isReuse} className={`grid min-w-0 gap-0 ${contact ? "" : "border-t pt-5"}`}><ContactFields form={form} metadata={metadata} requiredRole="owner" workspace ownerLayout assignment={!contact && !isReuse && role !== "agent" ? <AgentPicker value={agent} selectedLabel={agentName} change={(id, name) => { setAgent(id); setAgentName(name ?? ""); }} denied={authorityDenied} /> : <p className="text-sm text-muted-foreground">Agent responsable : {contact?.primary_agent.display_name ?? "vous-même"}. L’attribution ne change pas dans cette fiche.</p>} /></fieldset>
      {current.success ? <RecordSection title={`Version actuelle ${current.data.version}`}><OwnerContactSnapshot contact={current.data} /><p className="text-sm">Votre saisie est conservée. Comparez-la avant de poursuivre.</p><div className="flex flex-wrap gap-2"><Button action="refresh" type="button" variant="outline" onClick={() => { if (isReuse) setSelected(current.data); else { const next = ownerValues(current.data); form.reset(next); draft.accept({ fields: next, agent: "", selectedId: "" }); setVersion(current.data.version); } setError(undefined); }}>Charger la version actuelle</Button>{!isReuse ? <Button action="compare" type="button" variant="outline" onClick={() => { setVersion(current.data.version); setError(undefined); form.setFocus("name"); }}>Conserver ma saisie sur cette version</Button> : null}</div></RecordSection> : null}
      <p className="text-sm text-muted-foreground">Les biens se rattachent depuis leur fiche dans Projets. Le rôle Propriétaire ne crée aucun lien de propriété.</p>
    </div>
    {presentation === "drawer" ? <div className="kay-form-footer">{actions}</div> : null}
  </form></Form>;
}
