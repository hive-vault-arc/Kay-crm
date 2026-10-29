"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { type InventoryTarget, type Offering } from "./contracts";
import { externalSchema } from "./outcome-contracts";
import { StockReviewFacts } from "./stock-review";
import { InventoryRecordContext, type InventoryRecord, type InventoryRecordScope } from "./record-scope";
import { useExternalOutcomeCommand } from "./use-external-outcome-command";
import type { ExternalStockScope } from "./external-stock-review";

type Props = { target: InventoryTarget; offering: Offering; saved: () => void | Promise<void>; iconOnly?: boolean; disabled?: boolean };
export function ExternalOutcome(props: Props) {
  const host = useContext(InventoryRecordContext);
  if (!host || host.role === "agent" || props.offering.kind === "holiday") return null;
  const scope: ExternalStockScope = { root: props.target.inventoryLevel === "development" ? "developments" : "properties", id: props.target.id, version: props.target.version, offeringId: props.offering.id, offeringVersion: props.offering.version, kind: props.offering.kind, actorId: host.actorId, role: host.role };
  return <ExternalOutcomeLifetime key={`${scope.root}:${scope.id}:${scope.offeringId}:${scope.actorId ?? ""}:${scope.role}`} {...props} scope={scope} host={host} />;
}
function ExternalOutcomeLifetime({ offering, saved, iconOnly = false, disabled = false, scope, host }: Props & { scope: ExternalStockScope; host: InventoryRecordScope }) {
  const [open, setOpen] = useState(false), [completedOn, setCompletedOn] = useState(""), [explanation, setExplanation] = useState(""), [invalid, setInvalid] = useState("");
  const alive = useRef(true), submitting = useRef(false), reported = useRef(false), titleInput = useRef<HTMLHeadingElement>(null), dateInput = useRef<HTMLInputElement>(null), reasonInput = useRef<HTMLTextAreaElement>(null);
  const command = useExternalOutcomeCommand(scope, host), hydrated = useHydrated(), review = command.review?.review;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const action = scope.kind === "sale" ? "Marquer vendue ailleurs" : "Marquer louée ailleurs";
  async function finish(_record: InventoryRecord, signal: AbortSignal) {
    if (!alive.current || signal.aborted || reported.current) return;
    await saved();
    if (!alive.current || signal.aborted || reported.current) return;
    reported.current = true; setOpen(false); setExplanation(""); setCompletedOn("");
  }
  async function submit() {
    if (!hydrated || submitting.current || command.pending) return;
    if (command.uncertain) { submitting.current = true; try { await command.retry(); } finally { submitting.current = false; } return; }
    if (!review || !command.canEdit()) return;
    const data = externalSchema.safeParse({ expected_version: review.expected_target_version, offering_id: review.offering_id, expected_offering_version: review.expected_offering_version, expected_development_version: review.expected_development_version, expected_stock_fingerprint: review.expected_stock_fingerprint, completed_on: completedOn, explanation });
    if (!data.success) { setInvalid("Indiquez une date et un motif partagé (1 à 1 000 caractères), sans information privée sur un client."); if (!completedOn) dateInput.current?.focus(); else reasonInput.current?.focus(); return; }
    submitting.current = true; reported.current = false; setInvalid("");
    try { await command.submit({ completed_on: data.data.completed_on, explanation: data.data.explanation }, finish); }
    finally { submitting.current = false; }
  }
  function close() { if (submitting.current || command.locked()) return; setOpen(false); if (command.review?.readonly) host.accept(command.review.record); }
  if (!command.active()) return <AlertDialog open={open} onOpenChange={next => { if (!next) close(); }}><AlertDialogContent><AlertDialogTitle>Action indisponible</AlertDialogTitle><AlertDialogDescription>Vérifiez vos droits et l’état actuel du dossier.</AlertDialogDescription>{command.error ? <RecordError error={command.error} /> : null}<AlertDialogCancel asChild><Button action="back" type="button" variant="outline">Retour</Button></AlertDialogCancel></AlertDialogContent></AlertDialog>;
  return <AlertDialog open={open} onOpenChange={next => { if (submitting.current || command.locked()) return; if (!next) close(); else if (!disabled && host.available && command.active()) { setOpen(true); setInvalid(""); void command.inspect(); } }}>
    <AlertDialogTrigger asChild><Button action="outcome" type="button" variant={iconOnly ? "quiet" : "outline"} size={iconOnly ? "icon" : "default"} aria-label={iconOnly ? action : undefined} className="justify-self-start" disabled={!hydrated || disabled || !host.available || !command.active()}><span className={iconOnly ? "sr-only" : undefined}>{action}</span></Button></AlertDialogTrigger>
    <AlertDialogContent onEscapeKeyDown={event => { if (submitting.current || command.locked()) event.preventDefault(); }} onOpenAutoFocus={event => { event.preventDefault(); titleInput.current?.focus(); }}><AlertDialogTitle ref={titleInput} tabIndex={-1}>{action}</AlertDialogTitle><AlertDialogDescription>Résultat externe, réservé aux responsables. Cette action modifie le stock et signale les affaires concernées, sans créer de gain KAY, de commission ni d’encaissement.</AlertDialogDescription>
      {!review && !command.error && !command.review?.readonly ? <p role="status">Vérification du périmètre et des effets…</p> : null}{review ? <StockReviewFacts review={review} /> : null}
      {command.review?.readonly ? <p role="status">Cette offre a changé ou n’est plus active. Fermez ce panneau pour consulter la fiche actuelle avant une nouvelle action.</p> : null}
      <form aria-label={action} aria-busy={command.pending || command.uncertain} data-draft-managed data-live-dirty={Boolean(completedOn || explanation) || command.uncertain || undefined} data-write-recovery={command.uncertain || undefined} noValidate className="grid min-w-0 gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}><fieldset className="grid min-w-0 gap-4" disabled={command.pending || command.uncertain || !command.canEdit()}><legend className="sr-only">Résultat externe</legend><div className="grid gap-2"><Label htmlFor={`external-date-${offering.id}`}>Date du résultat externe (obligatoire)</Label><Input ref={dateInput} id={`external-date-${offering.id}`} type="date" value={completedOn} onChange={event => { if (!submitting.current && command.canEdit()) setCompletedOn(event.target.value); }} aria-describedby={invalid ? `external-invalid-${offering.id}` : undefined} /></div><div className="grid gap-2"><Label htmlFor={`external-reason-${offering.id}`}>Motif partagé, sans donnée privée (obligatoire)</Label><Textarea ref={reasonInput} id={`external-reason-${offering.id}`} value={explanation} maxLength={1000} onChange={event => { if (!submitting.current && command.canEdit()) setExplanation(event.target.value); }} aria-describedby={invalid ? `external-invalid-${offering.id}` : undefined} /></div></fieldset>
        {invalid ? <p role="alert" className="text-danger" id={`external-invalid-${offering.id}`}>{invalid}</p> : null}{command.error ? <><RecordError error={command.error} /><p>Votre saisie est conservée. Réessayez la même opération après une interruption ; actualisez les effets en cas de conflit.</p></> : null}
        {command.uncertain ? <p role="status">{command.acknowledged ? "Le résultat externe est enregistré. Actualisez sa lecture sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
        <div className="flex flex-wrap gap-2"><Button action="confirm" type="submit" disabled={!hydrated || command.pending || !command.uncertain && !command.canEdit()}>{command.pending ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : action}</Button><Button action="refresh" type="button" variant="outline" disabled={command.protected || !command.active()} onClick={() => void command.inspect()}>Actualiser les effets</Button><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={command.protected}>Retour</Button></AlertDialogCancel></div>
      </form>
    </AlertDialogContent>
  </AlertDialog>;
}
