"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { useHydrated } from "@/hooks/use-hydrated";
import { contactSchema, type Contact, type ContactSummary, type StaffRole } from "./contracts";
import { AgentPicker } from "./agent-picker";
import { ContactSelector } from "./contact-selector";
import { commandResultSchema, intentSchema, operationLabels, previewSchema, type ChangeIntent, type Operation, type Preview } from "./ownership-contracts";
import { OwnershipImpact } from "./ownership-impact";
import { RecordError } from "./record-states";

export function OwnershipControls({ contact, role, changed }: { contact: Contact; role: StaffRole; changed: (id: string, operation: Operation) => Promise<void> }) {
  const hydrated = useHydrated();
  const control = useId();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(contact);
  const [operation, setOperation] = useState<Operation>(contact.archived_at ? "restore" : role === "agent" ? "merge" : "assign");
  const [agent, setAgent] = useState("");
  const [retain, setRetain] = useState(false);
  const [grants, setGrants] = useState(contact.collaborators);
  const [candidate, setCandidate] = useState<{ id: string; display_name: string }>();
  const [survivor, setSurvivor] = useState<ContactSummary>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<ApiError>();
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{ intent: ChangeIntent; preview: Preview; key: string }>();
  const previewButton = useRef<HTMLButtonElement>(null);
  const operations: Operation[] = current.archived_at ? ["restore"] : role === "agent" ? ["merge"] : ["assign", "collaborators", "archive", "merge"];

  async function prepare(event: React.FormEvent) {
    event.preventDefault(); setError(undefined); setBusy(true);
    const fields = operation === "assign" ? { primary_agent_id: agent, retain_previous: retain } : operation === "collaborators" ? { collaborator_ids: grants.map(value => value.id) } : operation === "merge" ? { survivor_id: survivor?.id, survivor_expected_version: survivor?.version } : {};
    const intent = intentSchema.safeParse({ operation, expected_version: current.version, reason, ...fields });
    if (!intent.success || survivor?.id === current.id && operation === "merge") { setError(new ApiError("VALIDATION_ERROR", 422)); setBusy(false); return; }
    try {
      const preview = await apiCommand(`/api/v1/contacts/${current.id}/preview`, intent.data, previewSchema, crypto.randomUUID());
      setPrepared({ intent: intent.data, preview, key: crypto.randomUUID() });
    } catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!prepared) return;
    setBusy(true); setError(undefined);
    try {
      const result = await apiCommand(`/api/v1/contacts/${current.id}/${prepared.intent.operation}`, { ...prepared.intent, preview_token: prepared.preview.preview_token }, commandResultSchema, prepared.key, prepared.intent.operation === "collaborators" ? "PUT" : "POST");
      await changed(result.contact_id, prepared.intent.operation);
      setPrepared(undefined); setOpen(false);
    } catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  async function refreshVersions() {
    setBusy(true); setError(undefined);
    try {
      const [fresh, target] = await Promise.all([apiGet(`/api/v1/contacts/${current.id}`, contactSchema), survivor ? apiGet(`/api/v1/contacts/${survivor.id}`, contactSchema) : undefined]);
      setCurrent(fresh); if (target) setSurvivor(target); setPrepared(undefined);
    } catch (failure) { setError(failure instanceof ApiError ? failure : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  return <section className="grid max-w-reading gap-4" aria-label="Gestion du contact">
    <Button action={role === "agent" ? "compare" : "settings"} className="justify-self-start" variant="outline" disabled={!hydrated} aria-expanded={open} aria-controls={`${control}-panel`} onClick={() => setOpen(!open)}>{role === "agent" ? "Fusionner ce contact" : "Gérer le contact"}</Button>
    {open ? <form id={`${control}-panel`} className="grid min-w-0 gap-6 border-t pt-6" aria-busy={busy} onSubmit={event => void prepare(event)}>
      <h3 className="text-section font-medium">Attribution et conservation</h3>
      <p className="wrap-anywhere text-sm">Version utilisée : {current.version} · Responsable : {current.primary_agent.display_name}</p>
      <fieldset className="grid min-w-0 gap-4" disabled={!hydrated || busy}>
        <div className="grid gap-2"><Label htmlFor={`${control}-operation`}>Opération</Label><NativeSelect id={`${control}-operation`} value={operation} onChange={event => { setOperation(event.target.value as Operation); setError(undefined); }}>{operations.map(value => <option key={value} value={value}>{operationLabels[value]}</option>)}</NativeSelect></div>
        {operation === "assign" ? <><AgentPicker value={agent} change={setAgent} label="Nouveau responsable" /><div className="flex items-start gap-2"><Checkbox id={`${control}-retain`} checked={retain} onCheckedChange={value => setRetain(value === true)} /><Label className="min-h-control flex-1 py-2 leading-relaxed" htmlFor={`${control}-retain`}>Conserver l’ancien responsable comme collaborateur</Label></div><p className="text-sm text-muted-foreground">Sans cette option, l’ancien responsable perd son accès. Les demandes dont l’attribution devient invalide rejoignent la file du responsable.</p></> : null}
        {operation === "collaborators" ? <div className="grid gap-4"><AgentPicker value={candidate?.id ?? ""} change={(id, label) => setCandidate(id ? { id, display_name: label ?? id } : undefined)} label="Collaborateur à ajouter" /><Button action="add" className="justify-self-start" type="button" variant="outline" disabled={!candidate || candidate.id === current.primary_agent.id || grants.some(value => value.id === candidate.id)} onClick={() => { if (candidate) { setGrants([...grants, candidate]); setCandidate(undefined); } }}>Ajouter le collaborateur</Button><ul className="grid gap-2">{grants.map(value => <li className="flex flex-wrap items-center gap-2" key={value.id}><span className="min-w-0 flex-1 wrap-anywhere">{value.display_name}</span><Button action="remove" type="button" variant="outline" className="h-auto min-h-control max-w-full wrap-anywhere whitespace-normal text-left" onClick={() => setGrants(grants.filter(grant => grant.id !== value.id))}>Retirer {value.display_name}</Button></li>)}</ul>{!grants.length ? <p>Aucun collaborateur sélectionné.</p> : null}</div> : null}
        {operation === "merge" ? <div className="grid min-w-0 gap-4"><p>Cette fiche sera la source fusionnée. Choisissez explicitement la fiche à conserver, dans votre périmètre.</p>{survivor ? <><p className="wrap-anywhere">Fiche conservée : <strong>{survivor.name}</strong> · Version {survivor.version}</p><Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => setSurvivor(undefined)}>Changer la fiche conservée</Button></> : <ContactSelector choose={setSurvivor} />}</div> : null}
        {operation === "archive" ? <p>L’archivage retire l’accès aux agents. Les demandes et l’historique restent liés. Un responsable peut restaurer cette même fiche, sans expiration automatique.</p> : null}
        {operation === "restore" ? <p>La restauration réactive la même fiche et ses liens. Les droits suivent le responsable et les collaborateurs actuels.</p> : null}
        <div className="grid gap-2"><Label htmlFor={`${control}-reason`}>Motif de l’opération</Label><Textarea id={`${control}-reason`} required rows={3} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></div>
        <Button action="preview" ref={previewButton} type="submit" className="justify-self-start">{busy ? "Vérification…" : "Vérifier l’impact"}</Button>
      </fieldset>
      {!prepared && error ? <RecordError error={error} /> : null}
      <Button action="refresh" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal text-start" disabled={busy} onClick={() => void refreshVersions()}>Actualiser les versions sans effacer le motif</Button>
    </form> : null}
    <AlertDialog open={Boolean(prepared)} onOpenChange={value => { if (!value && !busy) setPrepared(undefined); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); previewButton.current?.focus(); }}>
        <AlertDialogTitle>{prepared ? operationLabels[prepared.intent.operation] : "Vérifier l’opération"} ?</AlertDialogTitle>
        <AlertDialogDescription>Confirmez uniquement l’impact vérifié ci-dessous. Le serveur revérifiera vos droits et les liens au moment de l’enregistrement.</AlertDialogDescription>
        {prepared ? <OwnershipImpact preview={prepared.preview} intent={prepared.intent} /> : null}
        {error ? <RecordError error={error} /> : null}
        <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={busy}>Revoir ma saisie</Button></AlertDialogCancel><Button action={prepared?.intent.operation === "archive" ? "archive" : prepared?.intent.operation === "restore" ? "restore" : "confirm"} type="button" variant={prepared?.intent.operation === "merge" ? "destructive" : "default"} disabled={busy} className="h-auto min-h-control whitespace-normal" onClick={() => void confirm()}>{busy ? "Enregistrement…" : "Confirmer l’opération"}</Button></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
