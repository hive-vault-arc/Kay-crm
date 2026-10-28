"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useHydrated } from "@/hooks/use-hydrated";
import { type Contact, type ContactSummary, type StaffRole } from "./contracts";
import { AgentPicker } from "./agent-picker";
import { ContactSelector } from "./contact-selector";
import { intentSchema, operationLabels, type Operation } from "./ownership-contracts";
import { OwnershipImpact } from "./ownership-impact";
import { RecordError } from "./record-states";
import { useOwnershipCommand, type OwnershipDenied } from "./use-ownership-command";

type OwnershipProps = { contact: Contact; role: StaffRole; changed: (id: string, operation: Operation, signal: AbortSignal) => Promise<void>; embedded?: boolean; denied?: OwnershipDenied };
export function OwnershipControls(props: OwnershipProps) {
  return <OwnershipLifetime key={`${props.contact.id}:${props.role}`} {...props} />;
}
function OwnershipLifetime({ contact, role, changed, embedded = false, denied }: OwnershipProps) {
  const hydrated = useHydrated();
  const control = useId();
  const [open, setOpen] = useState(embedded);
  const [current, setCurrent] = useState(contact);
  const [operation, setOperation] = useState<Operation>(contact.archived_at ? "restore" : role === "agent" ? "merge" : "assign");
  const [agent, setAgent] = useState("");
  const [retain, setRetain] = useState(false);
  const [grants, setGrants] = useState(contact.collaborators);
  const [candidate, setCandidate] = useState<{ id: string; display_name: string }>();
  const [survivor, setSurvivor] = useState<ContactSummary>();
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<ApiError>();
  const previewButton = useRef<HTMLButtonElement>(null);
  const operations: Operation[] = current.archived_at ? ["restore"] : role === "agent" ? ["merge"] : ["assign", "collaborators", "archive", "merge"];
  const command = useOwnershipCommand({ sourceId: current.id, role, denied, completed: async (target, action, signal) => {
    draft.accept(); await changed(target, action, signal); if (!signal.aborted) setOpen(false);
  } });
  const { prepared, busy } = command, error = validationError ?? command.error;
  const protectedOperation = command.protected;
  const draft = useDossierDraft({ operation, agent, retain, grants: grants.map(value => value.id), survivor: survivor ? { id: survivor.id, version: survivor.version } : null, reason }, protectedOperation);
  function edit(update: () => void) { if (command.canEdit()) { setValidationError(undefined); update(); } }
  async function prepare(event: React.FormEvent) {
    event.preventDefault(); if (!command.canEdit()) return; setValidationError(undefined);
    const fields = operation === "assign" ? { primary_agent_id: agent, retain_previous: retain } : operation === "collaborators" ? { collaborator_ids: grants.map(value => value.id) } : operation === "merge" ? { survivor_id: survivor?.id, survivor_expected_version: survivor?.version } : {};
    const intent = intentSchema.safeParse({ operation, expected_version: current.version, reason, ...fields });
    if (!operations.includes(operation) || !intent.success || survivor?.id === current.id && operation === "merge") { setValidationError(new ApiError("VALIDATION_ERROR", 422)); return; }
    await command.prepare(intent.data);
  }
  async function refreshVersions() {
    setValidationError(undefined); const fresh = await command.refresh(survivor?.id);
    if (fresh && !fresh.signal.aborted) { setCurrent(fresh.contact); if (fresh.survivor) setSurvivor(fresh.survivor); }
  }
  if (command.accessError) return <section className="grid min-w-0 gap-3"><RecordError error={command.accessError} />{command.acknowledged ? <p role="status">L’opération est enregistrée. Les droits d’accès ont changé.</p> : null}</section>;
  return <section className="grid max-w-reading gap-4" aria-label="Gestion du contact" data-live-dirty={draft.dirty || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined}>
    {!embedded ? <Button action={role === "agent" ? "compare" : "settings"} className="justify-self-start" variant="outline" disabled={!hydrated || protectedOperation || Boolean(prepared)} aria-expanded={open} aria-controls={`${control}-panel`} onClick={() => { if (command.canEdit()) setOpen(!open); }}>{role === "agent" ? "Fusionner ce contact" : "Gérer le contact"}</Button> : null}
    {open ? <form id={`${control}-panel`} className="grid min-w-0 gap-6 border-t pt-6" method="post" data-draft-managed aria-busy={protectedOperation} onSubmit={event => void prepare(event)}>
      <h3 className="text-section font-medium">Attribution et conservation</h3>
      <p className="wrap-anywhere text-sm">Version utilisée : {current.version} · Responsable : {current.primary_agent.display_name}</p>
      <fieldset className="grid min-w-0 gap-4" disabled={!hydrated || protectedOperation || Boolean(prepared)}>
        <div className="grid gap-2"><Label htmlFor={`${control}-operation`}>Opération</Label><NativeSelect id={`${control}-operation`} value={operation} onChange={event => edit(() => setOperation(event.target.value as Operation))}>{operations.map(value => <option key={value} value={value}>{operationLabels[value]}</option>)}</NativeSelect></div>
        {operation === "assign" ? <><AgentPicker value={agent} change={value => edit(() => setAgent(value))} label="Nouveau responsable" denied={command.deny} /><div className="flex items-start gap-2"><Checkbox id={`${control}-retain`} checked={retain} onCheckedChange={value => edit(() => setRetain(value === true))} /><Label className="min-h-control flex-1 py-2 leading-relaxed" htmlFor={`${control}-retain`}>Conserver l’ancien responsable comme collaborateur</Label></div><p className="text-sm text-muted-foreground">Sans cette option, l’ancien responsable perd son accès. Les demandes dont l’attribution devient invalide rejoignent la file du responsable.</p></> : null}
        {operation === "collaborators" ? <div className="grid gap-4"><AgentPicker value={candidate?.id ?? ""} change={(id, label) => edit(() => setCandidate(id ? { id, display_name: label ?? id } : undefined))} label="Collaborateur à ajouter" denied={command.deny} /><Button action="add" className="justify-self-start" type="button" variant="outline" disabled={!candidate || candidate.id === current.primary_agent.id || grants.some(value => value.id === candidate.id)} onClick={() => edit(() => { if (candidate) { setGrants([...grants, candidate]); setCandidate(undefined); } })}>Ajouter le collaborateur</Button><ul className="grid gap-2">{grants.map(value => <li className="flex flex-wrap items-center gap-2" key={value.id}><span className="min-w-0 flex-1 wrap-anywhere">{value.display_name}</span><Button action="remove" type="button" variant="outline" className="h-auto min-h-control max-w-full wrap-anywhere whitespace-normal text-left" onClick={() => edit(() => setGrants(grants.filter(grant => grant.id !== value.id)))}>Retirer {value.display_name}</Button></li>)}</ul>{!grants.length ? <p>Aucun collaborateur sélectionné.</p> : null}</div> : null}
        {operation === "merge" ? <div className="grid min-w-0 gap-4"><p>Cette fiche sera la source fusionnée. Choisissez explicitement la fiche à conserver, dans votre périmètre.</p>{survivor ? <><p className="wrap-anywhere">Fiche conservée : <strong>{survivor.name}</strong> · Version {survivor.version}</p><Button action="contact" type="button" variant="outline" className="justify-self-start" onClick={() => edit(() => setSurvivor(undefined))}>Changer la fiche conservée</Button></> : <ContactSelector choose={value => edit(() => setSurvivor(value))} denied={command.deny} />}</div> : null}
        {operation === "archive" ? <p>L’archivage retire l’accès aux agents. Les demandes et l’historique restent liés. Un responsable peut restaurer cette même fiche, sans expiration automatique.</p> : null}
        {operation === "restore" ? <p>La restauration réactive la même fiche et ses liens. Les droits suivent le responsable et les collaborateurs actuels.</p> : null}
        <div className="grid gap-2"><Label htmlFor={`${control}-reason`}>Motif de l’opération</Label><Textarea id={`${control}-reason`} required rows={3} maxLength={1000} value={reason} onChange={event => edit(() => setReason(event.target.value))} /></div>
        <Button action="preview" ref={previewButton} type="submit" className="justify-self-start">{busy ? "Vérification…" : "Vérifier l’impact"}</Button>
      </fieldset>
      {!prepared && error ? <RecordError error={error} /> : null}{command.aliases.map(id => <Button key={id} action="contact" type="button" asChild variant="outline"><Link prefetch={false} href={`/contacts/${id}`}>Voir la fiche conservée</Link></Button>)}
      <Button action="refresh" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal text-start" disabled={!hydrated || protectedOperation || Boolean(prepared)} onClick={() => void refreshVersions()}>Actualiser les versions sans effacer le motif</Button>
    </form> : null}
    <AlertDialog open={Boolean(prepared)} onOpenChange={value => { if (!value) command.dismiss(); }}>
      <AlertDialogContent aria-busy={protectedOperation} onEscapeKeyDown={event => { if (command.locked()) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); previewButton.current?.focus(); }}>
        <AlertDialogTitle>{prepared ? operationLabels[prepared.intent.operation] : "Vérifier l’opération"} ?</AlertDialogTitle>
        <AlertDialogDescription>Confirmez uniquement l’impact vérifié ci-dessous. Le serveur revérifiera vos droits et les liens au moment de l’enregistrement.</AlertDialogDescription>
        {prepared ? <OwnershipImpact preview={prepared.preview} intent={prepared.intent} /> : null}
        {error ? <RecordError error={error} /> : null}{command.uncertain ? <p role="status">{command.acknowledged ? "L’opération est enregistrée. Actualisez le résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : command.needsReview ? <p role="alert">Revenez à la saisie, actualisez les versions et vérifiez de nouveau l’impact.</p> : null}
        <div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={protectedOperation}>Revoir ma saisie</Button></AlertDialogCancel><Button action={prepared?.intent.operation === "archive" ? "archive" : prepared?.intent.operation === "restore" ? "restore" : "confirm"} type="button" variant={prepared?.intent.operation === "merge" ? "destructive" : "default"} disabled={!hydrated || busy || command.needsReview} className="h-auto min-h-control whitespace-normal" onClick={() => void command.confirm()}>{busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Confirmer l’opération"}</Button></div>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
