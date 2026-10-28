"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useHydrated } from "@/hooks/use-hydrated";
import { removeSchema, shortlistSchema, type Requirement } from "./contracts";
import { compareShortlist, type OfferingChoice } from "./model";
import { OfferingFacts } from "./offering-card";
import { OfferingSearch } from "./offering-search";
import { RequirementFailure, useRequirementCommand, type RequirementDenied, type RequirementSaved } from "./use-requirement-command";

export function ShortlistForm({ value, originalId, writable, saved, denied, cancel }: { value: Requirement; originalId?: string; writable: boolean; saved: RequirementSaved; denied: RequirementDenied; cancel: () => void }) {
  const original = value.shortlist.find(item => item.offering.id === originalId);
  const [source, setSource] = useState(value), [choice, setChoice] = useState<OfferingChoice | undefined>(() => original ? { offering: original.offering } : undefined), [feedback, setFeedback] = useState(original?.feedback ?? ""), [action, setAction] = useState("update"), [invalid, setInvalid] = useState(false), [pending, setPending] = useState<{ expected_version: number }>();
  const id = useId(), form = useRef<HTMLFormElement>(null), submit = useRef<HTMLButtonElement>(null), confirmation = useRef<HTMLHeadingElement>(null), alive = useRef(true), hydrated = useHydrated(), guard = useUnsavedGuard();
  const command = useRequirementCommand({ id: value.id, writable, saved: onSaved, denied, compare: signal => compareShortlist(value.contact_id, value.id, choice, originalId, action === "remove", signal) });
  const fields = { offeringId: choice?.offering.id ?? "", feedback, action, recovery: command.uncertain }, draft = useDossierDraft(fields, command.busy);
  async function onSaved(result: { id: string; version: number }, signal: AbortSignal) { draft.accept({ ...fields, recovery: false }); await saved(result, signal); }
  useEffect(() => { alive.current = true; form.current?.querySelector<HTMLElement>("input,select,textarea")?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => { if (invalid) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [invalid]);
  const disabled = !hydrated || !writable || command.busy || command.uncertain || Boolean(pending);
  function choose(next?: OfferingChoice) { if (disabled || command.locked() || originalId) return; setChoice(next); setInvalid(false); }
  async function remove() { if (!pending || !hydrated || !writable || command.locked() || !originalId) return; await command.save(`/api/v1/requirements/${value.id}/shortlist/${originalId}`, pending, "DELETE"); if (alive.current) setPending(undefined); }
  return <form ref={form} className="kay-drawer-form" noValidate aria-label={originalId ? "Modifier l’avis ou retirer une offre" : "Sélectionner une offre"} data-draft-managed data-live-dirty={draft.dirty} data-write-recovery={command.uncertain} aria-busy={command.busy} onSubmit={event => {
    event.preventDefault(); if (disabled || command.locked() || originalId && !original) return;
    if (originalId && action === "remove") { const parsed = removeSchema.safeParse({ expected_version: source.version }); if (parsed.success) setPending(parsed.data); return; }
    const parsed = shortlistSchema.safeParse({ expected_version: source.version, offering_id: choice?.offering.id, expected_offering_version: choice?.offering.version, feedback: feedback.trim() || null });
    if (!parsed.success || !choice || choice.offering.kind !== source.intent) { setInvalid(true); return; }
    setInvalid(false); void command.save(`/api/v1/requirements/${value.id}/shortlist`, parsed.data, "POST");
  }}>
    <RecordSection title={originalId ? "Avis et sélection" : "Sélectionner une offre"} description={`Recherche : ${source.title}. Les offres sont choisies manuellement, sans réservation ni changement du stock.`}>
      <fieldset disabled={disabled} className="grid min-w-0 gap-5 border-0 p-0"><legend className="sr-only">Offre exacte et avis</legend>
        {originalId ? original ? <><OfferingFacts offering={choice?.offering ?? original.offering} /><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-action`}>Action sur cette sélection</Label><NativeSelect id={`${id}-action`} value={action} onChange={event => { if (!disabled && !command.locked()) { setAction(event.target.value); setInvalid(false); } }}><option value="update">Modifier l’avis</option><option value="remove">Retirer de la sélection</option></NativeSelect></div></> : <p role="alert">Cette offre n’est plus sélectionnée. Revenez aux recherches.</p> : <OfferingSearch requirement={source} disabled={disabled} choice={choice} select={choose} denied={denied} />}
        {action !== "remove" ? <><div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-feedback`}>Avis sur cette offre</Label><Textarea id={`${id}-feedback`} name="feedback" value={feedback} maxLength={2000} aria-invalid={invalid} aria-describedby={invalid ? `${id}-validation` : undefined} onChange={event => { if (!disabled && !command.locked()) { setFeedback(event.target.value); setInvalid(false); } }} /></div>{choice && !originalId ? <details className="kay-entry-note"><summary>Vérifier l’offre sélectionnée</summary><div className="pt-3"><OfferingFacts offering={choice.offering} /></div></details> : null}</> : <p className="text-sm text-muted-foreground">Seul le lien avec cette recherche sera retiré. L’offre et le stock restent conservés.</p>}
      </fieldset>
    </RecordSection>
    {!writable ? <p role="status">Ce dossier est en lecture seule.</p> : null}
    {invalid ? <p id={`${id}-validation`} role="alert" className="text-sm text-danger">Choisissez une offre correspondant à la recherche et limitez l’avis à 2 000 caractères.</p> : null}
    <RequirementFailure command={command} keep={current => { if (!current.value) return; setSource(current.value); if (current.offering) setChoice(previous => ({ ...previous, offering: current.offering! })); const entry = current.value.shortlist.find(item => item.offering.id === originalId); draft.accept({ offeringId: entry?.offering.id ?? "", feedback: entry?.feedback ?? "", action: "update", recovery: false }); }} />
    <footer className="kay-form-footer"><Button action="cancel" type="button" variant="outline" disabled={command.busy} onClick={() => { if (!command.isBusy()) guard.request(cancel, form.current ?? undefined); }}>Annuler</Button><Button ref={submit} action={action === "remove" ? "remove" : "save"} type="submit" variant={action === "remove" ? "destructive" : "default"} disabled={disabled || Boolean(originalId && !original)}>{command.busy ? "Enregistrement…" : action === "remove" ? "Retirer de la sélection" : originalId ? "Enregistrer l’avis" : "Enregistrer la sélection"}</Button></footer>
    {pending ? <AlertDialog open onOpenChange={open => { if (!open && !command.isBusy()) setPending(undefined); }}><AlertDialogContent onOpenAutoFocus={event => { event.preventDefault(); confirmation.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); submit.current?.focus(); }}><AlertDialogTitle ref={confirmation} tabIndex={-1}>Retirer cette offre de la sélection ?</AlertDialogTitle><AlertDialogDescription>Cette action retire uniquement le lien avec cette recherche. Elle ne modifie ni l’offre, ni une réservation.</AlertDialogDescription><p className="wrap-anywhere">{choice?.offering.target?.reference} · {choice?.offering.target?.label}</p><div className="flex flex-wrap gap-2"><Button action="confirm" type="button" variant="destructive" disabled={command.busy || !writable || !hydrated} onClick={() => void remove()}>{command.busy ? "Retrait…" : "Confirmer le retrait"}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={command.busy} onClick={() => setPending(undefined)}>Conserver l’offre</Button></AlertDialogCancel></div></AlertDialogContent></AlertDialog> : null}
    {guard.dialog}
  </form>;
}
