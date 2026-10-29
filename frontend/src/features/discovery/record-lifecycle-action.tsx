"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { RecordError } from "@/features/contacts/record-states";
import { enquirySchema, recordLifecycleSchema, type Enquiry, type StaffRole } from "@/features/contacts/contracts";
import { dealSchema, type Deal } from "@/features/deals/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import type { LifecycleOperation } from "./record-lifecycle-contract";
import { useRecordLifecycleCommand } from "./use-record-lifecycle-command";

type Props = { id: string; version: number; archivedAt: string | null; label: string; actorId?: string; role: StaffRole; disabled?: boolean; heldChanged: (active: boolean) => void; denied: (error: ApiError, acknowledged?: boolean) => void } & (
  { kind: "enquiries"; onChanged: (record: Enquiry, signal: AbortSignal) => void | Promise<void> } |
  { kind: "deals"; onChanged: (record: Deal, signal: AbortSignal) => void | Promise<void> }
);
type Opening = { operation: LifecycleOperation; version: number; label: string };

export function RecordLifecycleAction(props: Props) { return <LifecycleActionLifetime key={`${props.kind}:${props.id}:${props.actorId ?? ""}:${props.role}`} {...props} />; }
function LifecycleActionLifetime(props: Props) {
  const [opening, setOpening] = useState<Opening>(), [guarded, setGuarded] = useState(false), opened = useRef<Opening | undefined>(undefined), lockRef = useRef<(() => boolean) | undefined>(undefined), formRef = useRef<HTMLFormElement | null>(null);
  const hydrated = useHydrated(), guard = useUnsavedGuard(), alive = useRef(true), archived = props.archivedAt !== null, noun = props.kind === "enquiries" ? "le prospect" : "l’affaire";
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const title = `${(opening?.operation ?? (archived ? "restore" : "archive")) === "restore" ? "Restaurer" : "Archiver"} ${noun}`;
  function closed() { if (!alive.current) return; opened.current = undefined; setOpening(undefined); setGuarded(false); props.heldChanged(false); }
  function changed(next: boolean) {
    if (!hydrated || !alive.current || lockRef.current?.()) return;
    if (next) { if (opened.current || props.disabled) return; const value: Opening = { operation: archived ? "restore" : "archive", version: props.version, label: props.label }; opened.current = value; props.heldChanged(true); setOpening(value); }
    else guard.request(() => { if (!lockRef.current?.()) closed(); }, formRef.current ?? undefined);
  }
  return <>{guard.dialog}<AlertDialog open={Boolean(opening)} onOpenChange={changed}>
    <AlertDialogTrigger asChild><Button action={archived ? "restore" : "archive"} type="button" variant={archived ? "outline" : "destructive"} disabled={!hydrated || props.disabled || guarded}>{title}</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{(opening?.operation ?? (archived ? "restore" : "archive")) === "restore" ? "La fiche redeviendra visible dans les listes actives si son archivage date de moins de 30 jours." : "La fiche quittera les listes actives. Son historique reste conservé et elle peut être restaurée pendant 30 jours. Les opérations liées doivent être terminées avant l’archivage."}</AlertDialogDescription>
      {opening ? <LifecycleConfirmation key={`${opening.operation}:${opening.version}`} {...props} opening={opening} title={title} lockRef={lockRef} formRef={formRef} protectedChanged={setGuarded} closed={closed} /> : null}
    </AlertDialogContent>
  </AlertDialog></>;
}
function LifecycleConfirmation(props: Props & { opening: Opening; title: string; lockRef: MutableRefObject<(() => boolean) | undefined>; formRef: MutableRefObject<HTMLFormElement | null>; protectedChanged: (active: boolean) => void; closed: () => void }) {
  const { opening, title, lockRef, formRef, protectedChanged } = props, reasonId = useId(), hydrated = useHydrated(), [reason, setReason] = useState(""), [expected, setExpected] = useState(opening.version), [invalid, setInvalid] = useState(false);
  const command = useRecordLifecycleCommand({ kind: props.kind, id: props.id, operation: opening.operation, version: props.version, actorId: props.actorId, role: props.role, denied: props.denied, saved: async (record, signal) => {
    if (props.kind === "enquiries") await props.onChanged(enquirySchema.parse(record), signal); else await props.onChanged(dealSchema.parse(record), signal);
    if (!signal.aborted) { changes.accept(); props.closed(); }
  } });
  const changes = useDossierDraft(reason.trim(), command.protected), comparison = command.comparison, review = command.review;
  const commandLocked = command.locked;
  useLayoutEffect(() => { lockRef.current = commandLocked; return () => { lockRef.current = undefined; }; }, [lockRef, commandLocked]);
  useLayoutEffect(() => { protectedChanged(command.protected); }, [protectedChanged, command.protected]);
  async function submit() {
    if (!hydrated || command.busy || props.disabled && !command.uncertain) return;
    if (command.uncertain) { await command.retry(); return; }
    if (!command.canEdit()) return;
    const parsed = recordLifecycleSchema.safeParse({ expected_version: expected, reason });
    if (!parsed.success) { setInvalid(true); formRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus(); return; }
    setInvalid(false); await command.submit(parsed.data);
  }
  if (command.accessError) return <>{command.acknowledged ? <p role="status">L’opération est enregistrée. Les droits d’accès ont changé.</p> : null}<RecordError error={command.accessError} /></>;
  return <><p className="wrap-anywhere font-medium">{opening.label}</p><form ref={formRef} className="grid min-w-0 gap-4" noValidate data-draft-managed="true" data-live-dirty={changes.dirty ? "true" : undefined} data-write-recovery={command.uncertain ? "true" : undefined} aria-busy={command.protected} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <div className="grid min-w-0 gap-2"><Label htmlFor={reasonId}>Motif obligatoire</Label><Textarea id={reasonId} value={reason} maxLength={1000} disabled={!hydrated || props.disabled || command.protected || !command.canEdit()} onChange={event => { if (command.canEdit() && !props.disabled) { setReason(event.target.value); setInvalid(false); } }} aria-invalid={invalid} aria-describedby={invalid ? `${reasonId}-error` : undefined} />{invalid ? <p id={`${reasonId}-error`} role="alert" className="text-danger">Indiquez un motif de 1 à 1 000 caractères.</p> : null}</div>
    {command.error ? <RecordError error={command.error} /> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération avec le motif conservé."}</p> : null}
    {command.needsReview ? <div className="grid min-w-0 gap-3"><p role="status">Le dossier a changé. Comparez son état actuel avant de confirmer la même opération.</p><Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={command.protected} onClick={() => void command.inspect()}>Comparer la version actuelle</Button></div> : null}
    {comparison ? <section className="grid min-w-0 gap-3 border-y py-4" aria-label="Version actuelle"><p className="wrap-anywhere font-medium">Version actuelle {comparison.version} · {"title" in comparison ? comparison.title : comparison.contact.name}</p><p>{comparison.archived_at ? "Archivé" : "Actif"} · {"assigned_agent" in comparison ? comparison.assigned_agent?.display_name ?? "File du responsable" : comparison.contact.primary_agent.display_name}</p>{review === "authority" ? <p>Vous pouvez consulter cette fiche. L’archivage et la restauration sont réservés à son agent responsable.</p> : review === "contact" ? <p>Le contact est archivé. Restaurez-le depuis sa fiche avant cette opération.</p> : review === "changed" ? <p>L’état a changé. Conservez la fiche, puis choisissez l’opération adaptée.</p> : <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={command.protected} onClick={() => { if (command.accept(comparison)) setExpected(comparison.version); }}>Conserver le motif sur cette version</Button>}</section> : null}
    <div className="flex flex-wrap gap-2"><Button action={opening.operation} type="submit" variant={opening.operation === "restore" ? "default" : "destructive"} disabled={!hydrated || command.busy || !command.uncertain && (props.disabled || !command.canEdit())}>{command.busy ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : `Confirmer : ${title.toLowerCase()}`}</Button><AlertDialogCancel asChild><Button action="cancel" type="button" variant="outline" disabled={command.protected}>Conserver la fiche</Button></AlertDialogCancel></div>
  </form></>;
}
