"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type MutableRefObject } from "react";
import { PropertyIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { propertySchema } from "@/features/inventory/contracts";
import { archiveDevelopmentSchema, developmentSchema } from "@/features/inventory/development-contracts";
import { lifecycleReview } from "@/features/inventory/record-command-intent";
import type { InventoryRecord } from "@/features/inventory/record-scope";
import { useInventoryRecordCommand } from "@/features/inventory/use-record-command";

type Props = { kind: "properties" | "developments"; id: string; version: number; reference: string; archived: boolean; saved: (record?: InventoryRecord) => void | Promise<void>; refresh: () => void };
type Opening = { operation: "archive" | "restore"; version: number; reference: string };
export function LifecyclePanel(props: Props) {
  const hydrated = useHydrated(), guard = useUnsavedGuard(), [opening, setOpening] = useState<Opening>(), [guarded, setGuarded] = useState(false), alive = useRef(true), opened = useRef(opening), latest = useRef(props), scope = useRef<HTMLFormElement>(null), locked = useRef<(() => boolean) | undefined>(undefined);
  useLayoutEffect(() => { latest.current = props; opened.current = opening; }, [props, opening]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  function closed() { if (!alive.current) return; opened.current = undefined; setOpening(undefined); setGuarded(false); }
  function cancel(refresh = false) { if (!alive.current || locked.current?.()) return; guard.request(() => { if (!alive.current || locked.current?.()) return; closed(); if (refresh) latest.current.refresh(); }, scope.current ?? undefined); }
  function toggle() { if (!hydrated || !alive.current || locked.current?.()) return; if (opened.current) cancel(); else { const value: Opening = { operation: latest.current.archived ? "restore" : "archive", version: latest.current.version, reference: latest.current.reference }; opened.current = value; setOpening(value); } }
  return <>{guard.dialog}<section className="grid min-w-0 gap-4 border-t pt-4" aria-label="Cycle de vie de l’inventaire"><h3 className="font-medium">État : {props.archived ? "Archivé" : "Actif"}</h3><p className="text-sm text-muted-foreground">L’historique et les références sont conservés. L’archivage est bloqué en présence d’une campagne actuelle ; un programme contenant des unités nécessite une revue.</p>
    <Button action={opening?.operation ?? (props.archived ? "restore" : "archive")} type="button" variant="outline" className="justify-self-start" disabled={!hydrated || guarded} onClick={toggle}>{(opening?.operation ?? (props.archived ? "restore" : "archive")) === "restore" ? "Restaurer ce dossier" : "Archiver ce dossier"}</Button>
    {opening ? <LifecycleConfirmation key={`${props.kind}:${props.id}:${opening.operation}:${opening.version}`} {...props} opening={opening} scope={scope} lockRef={locked} protectedChanged={setGuarded} cancel={() => cancel()} refreshCurrent={() => cancel(true)} closed={closed} /> : null}
  </section></>;
}
function LifecycleConfirmation({ kind, id, version, archived, saved, opening, scope, lockRef, protectedChanged, cancel, refreshCurrent, closed }: Props & { opening: Opening; scope: MutableRefObject<HTMLFormElement | null>; lockRef: MutableRefObject<(() => boolean) | undefined>; protectedChanged: (active: boolean) => void; cancel: () => void; refreshCurrent: () => void; closed: () => void }) {
  const reasonId = useId(), hydrated = useHydrated(), command = useInventoryRecordCommand({ root: kind, id, version, kind: "lifecycle", operation: opening.operation });
  const alive = useRef(true), lock = useRef(false), reading = useRef<AbortController | null>(null), reported = useRef(false), [reason, setReason] = useState(""), [expected, setExpected] = useState(opening.version), [invalid, setInvalid] = useState(false), [comparison, setComparison] = useState<InventoryRecord>(), [readBusy, setReadBusy] = useState(false), [readError, setReadError] = useState<ApiError>(), [accessError, setAccessError] = useState<ApiError>();
  const busy = command.pending || readBusy, changes = useDossierDraft(reason.trim(), command.protected || readBusy), action = opening.operation === "archive" ? "Archiver" : "Restaurer", changedState = archived !== (opening.operation === "restore"), review = comparison ? lifecycleReview({ root: kind, id, operation: opening.operation }, comparison) : undefined;
  const commandLocked = command.locked;
  useLayoutEffect(() => { lockRef.current = () => lock.current || commandLocked(); return () => { lockRef.current = undefined; }; }, [lockRef, commandLocked]);
  useEffect(() => { protectedChanged(command.protected || readBusy); }, [protectedChanged, command.protected, readBusy]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; reading.current?.abort(); }; }, []);
  function failure(error: ApiError) { if ([401, 403, 404].includes(error.status)) { command.deny(error); setAccessError(error); changes.accept(); setComparison(undefined); } }
  async function compare() {
    if (!hydrated || lock.current || command.locked()) return; lock.current = true; setReadBusy(true); setReadError(undefined); reading.current?.abort(); const abort = new AbortController(); reading.current = abort;
    try { const current = await command.inspect<InventoryRecord>(signal => kind === "properties" ? apiGet(`/api/v1/properties/${id}`, propertySchema, signal) : apiGet(`/api/v1/developments/${id}`, developmentSchema, signal), abort.signal); if (alive.current && !abort.signal.aborted) setComparison(current); }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const error = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); setReadError(error); failure(error); } }
    finally { if (alive.current) { lock.current = false; setReadBusy(false); } }
  }
  function accept() { if (!comparison || review !== "ready" || !command.accept(comparison)) return; setExpected(comparison.version); setComparison(undefined); setReadError(undefined); }
  async function submit() {
    if (!hydrated || lock.current || command.pending) return;
    if (command.uncertain) { lock.current = true; try { const error = await command.retry(); if (error && alive.current) failure(error); } finally { lock.current = false; } return; }
    if (!command.canEdit() || comparison || changedState) return;
    const parsed = archiveDevelopmentSchema.safeParse({ expected_version: expected, reason }); if (!parsed.success) { setInvalid(true); scope.current?.querySelector<HTMLInputElement>("input")?.focus(); return; }
    setInvalid(false); lock.current = true; reported.current = false;
    try { const error = await command.submit(`/api/v1/${kind}/${id}/${opening.operation}`, parsed.data, "POST", async (record, signal) => { if (!alive.current || signal.aborted || reported.current) return; await saved(record); if (alive.current && !signal.aborted && !reported.current) { reported.current = true; changes.accept(); closed(); } }); if (error && alive.current) failure(error); }
    finally { lock.current = false; }
  }
  if (accessError) return <>{command.acknowledged ? <p role="status">L’opération est enregistrée. Les droits d’accès ont changé.</p> : null}<RecordError error={accessError} /></>;
  return <form ref={scope} className="grid min-w-0 gap-4" noValidate aria-label={`${action} le dossier`} data-managed-draft="true" data-live-dirty={changes.dirty ? "true" : undefined} data-write-recovery={command.uncertain ? "true" : undefined} aria-busy={busy || command.uncertain} onSubmit={event => { event.preventDefault(); void submit(); }}>
    <p className="wrap-anywhere">{action} {opening.reference} ? Aucun historique ne sera supprimé.</p>
    {command.needsReview || changedState || readError ? <div className="grid gap-3">{readError ? <RecordError error={readError} /> : <p role="status">Le dossier a changé. Comparez son état actuel avant de confirmer la même opération.</p>}<Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy || command.uncertain} onClick={() => void compare()}>Comparer la version actuelle</Button></div> : null}
    {comparison ? <RecordSection title={`Version actuelle ${comparison.version}`} description="Votre motif reste conservé. L’opération choisie ne change pas."><RecordEntry icon={PropertyIcon} title={"name" in comparison ? comparison.name : comparison.marketing_name || comparison.reference} meta={[{ label: "Référence", value: comparison.reference }, { label: "État", value: comparison.archived_at ? "Archivé" : "Actif" }, { label: "Campagnes actuelles", value: comparison.offerings.filter(offering => offering.is_current).length }, ...("unit_count" in comparison ? [{ label: "Unités physiques", value: comparison.unit_count }] : [])]} />{review === "changed" ? <p role="status">L’état du dossier a changé. Actualisez la fiche pour choisir une nouvelle opération.</p> : review === "stock" ? <p role="status">Archivage bloqué : une campagne actuelle ou une unité physique nécessite une revue du stock. Aucune opération liée ne sera modifiée.</p> : <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={accept}>Conserver le motif sur cette version</Button>}{review !== "ready" ? <Button action="retry" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={refreshCurrent}>Actualiser la fiche</Button> : null}</RecordSection> : null}
    <div className="grid min-w-0 gap-2"><Label htmlFor={reasonId}>Motif obligatoire</Label><Input id={reasonId} name="reason" required maxLength={1000} value={reason} disabled={!hydrated || busy || changedState || Boolean(comparison) || !command.canEdit()} aria-invalid={invalid} aria-describedby={invalid ? `${reasonId}-invalid` : undefined} onChange={event => { if (!lock.current && command.canEdit() && !comparison && !changedState) { setReason(event.target.value); setInvalid(false); } }} />{invalid ? <p id={`${reasonId}-invalid`} role="alert" className="text-danger">Indiquez un motif de 1 à 1 000 caractères.</p> : null}</div>
    {command.error ? <RecordError error={command.error} /> : null}{command.error?.code === "STOCK_REVIEW_REQUIRED" ? <p>Archivage bloqué : consultez les offres et les unités, puis demandez une revue au responsable. Aucune réservation ni transaction n’a été modifiée.</p> : null}
    {command.uncertain ? <p role="status">{command.acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
    <div className="flex flex-wrap gap-2"><Button action={opening.operation} type="submit" disabled={!hydrated || busy || !command.uncertain && (changedState || Boolean(comparison) || !command.canEdit())}>{readBusy ? "Comparaison…" : command.pending ? "Enregistrement…" : command.uncertain ? command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : opening.operation === "restore" ? "Confirmer la restauration" : "Confirmer l’archivage"}</Button><Button action="cancel" type="button" variant="outline" disabled={busy || command.uncertain} onClick={cancel}>Annuler</Button></div>
  </form>;
}
