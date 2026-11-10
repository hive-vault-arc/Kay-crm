"use client";
import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { useLifecycleProjection } from "@/features/discovery/use-lifecycle-projection";
import { currentRecord } from "@/features/realtime/current-record";
import { useDealCommand } from "./use-deal-command";
import { dealSchema, ordinaryStages, stageLabels, type Deal } from "./contracts";
import { DealForm } from "./deal-form";
import { DealWorkspace } from "./deal-workspace";

type Props = { id: string; initialTask?: string; role?: StaffRole; actorId?: string; initialTab?: string };
export function DealRecord(props: Props) { return <DealRecordLifetime key={`${props.id}:${props.actorId ?? ""}:${props.role ?? "agent"}`} {...props} />; }
function DealRecordLifetime({ id, initialTask, role = "agent", actorId, initialTab }: Props) {
  const query = useQuery(`/api/v1/deals/${id}`, dealSchema);
  const [editing, setEditing] = useState(false), [editReview, setEditReview] = useState<Deal>(), [comparison, setComparison] = useState<Deal>(), [resetRevision, setResetRevision] = useState(0);
  const [entryNotice, setEntryNotice] = useState("");
  const command = useDealCommand(id, () => setComparison(undefined), { actorId, role, denied: (_failure, acknowledged) => { setEntryNotice(acknowledged ? "La modification est enregistrée. Les droits d’accès ont changé." : ""); } });
  const { fresh, setFresh, busy, setBusy, error, setError, notice, setNotice, reload, mutate } = command;
  const [cached, setCached] = useState<Deal>();
  const focusEdit = useRef(false), remote = currentRecord(query.value?.id === id ? query.value : undefined, fresh, id), retained = currentRecord(remote, cached, id);
  const lifecycle = useLifecycleProjection(retained, query.error), value = lifecycle.value ?? (editing ? editReview : undefined);
  const deniedRead = query.error && [401, 403, 404].includes(query.error.status) ? query.error : undefined;
  if (deniedRead && cached) setCached(undefined);
  else if (!deniedRead && retained && retained !== cached) setCached(retained);
  useLayoutEffect(() => { if (deniedRead) command.deny(deniedRead); }, [deniedRead, command]);
  const restoreFocus = useCallback((node: HTMLButtonElement | null) => { if (node && focusEdit.current) { focusEdit.current = false; node.focus(); } }, []);
  function endEdit() { focusEdit.current = true; setEditing(false); setEditReview(undefined); setBusy(false); }
  async function compare() { try { const current = await command.inspect(); if (command.active()) setComparison(current); } catch { /* The command owner presents scoped read/authority errors. */ } }
  const returnLink = <Button action="back" asChild variant="quiet" size="compact" className="justify-self-start"><Link href="/deals">Retour aux affaires</Link></Button>;
  const heading = <div className="grid min-w-0 justify-items-start gap-2">{returnLink}<PageHeader title="Affaire" description="Pipeline, prochaine action, propositions client et historique." route={`/deals/${id}`} /></div>;
  if (query.error && ((!editing && !value) || deniedRead)) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (error && [401, 403, 404].includes(error.status)) return <>{heading}{entryNotice ? <p role="status">{entryNotice}</p> : null}<RecordError error={error} /></>;
  if (!value) return <>{heading}<div className="kay-sales-loading-record" role="status"><span className="sr-only">Chargement de l’affaire…</span><Skeleton aria-hidden="true" className="motion-reduce:animate-none" /><Skeleton aria-hidden="true" className="motion-reduce:animate-none" /></div></>;
  const writable = !value.contact.archived_at && !value.archived_at && (value.stage === "reserved" || ordinaryStages.includes(value.stage as typeof ordinaryStages[number]));
  const canArchive = !value.contact.archived_at && (role !== "agent" || (actorId && value.contact.primary_agent.id === actorId));
  if (editing && editReview) return <div className="grid min-w-0 gap-4">{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<DealForm key={`edit:${editReview.id}`} value={editReview} contact={editReview.contact} actorId={actorId} role={role} unavailable={Boolean(query.error || !remote || !writable || value.contact.id !== editReview.contact.id)} denied={(failure, acknowledged) => { setEntryNotice(acknowledged ? "L’affaire est enregistrée. Les droits d’accès ont changé." : ""); setError(failure); }} busyChanged={setBusy} cancel={endEdit} saved={async (_id, accepted) => { setFresh(accepted); endEdit(); setNotice("Affaire enregistrée."); }} /></div>;
  return <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<DealWorkspace recovery={command} key={`${id}:${resetRevision}`} contactChanged={query.refreshQuietly} denied={(failure, acknowledged) => { setEntryNotice(acknowledged ? "L’activité est enregistrée. Les droits d’accès ont changé." : ""); setError(failure); }} deal={value} role={role} writable={writable} canArchive={Boolean(canArchive) || lifecycle.holding} actorId={actorId} lifecycleHeldChanged={lifecycle.hold} lifecycleSaved={async (record, signal) => { if (signal.aborted) return; setFresh(record); setNotice("État de l’affaire enregistré."); query.refreshQuietly(); }} lifecycleDenied={(failure, acknowledged) => { setEntryNotice(acknowledged ? "L’opération est enregistrée. Les droits d’accès ont changé." : ""); setError(failure); }} busy={busy} busyChanged={setBusy} mutate={mutate} reload={reload} error={error} notice={notice} commandState={error || command.uncertain ? <section className="grid gap-4" aria-label="Échec de la modification">{error ? <RecordError error={error} /> : null}<p>{command.uncertain ? command.acknowledged ? "La modification est enregistrée. Actualisez son résultat sans l’enregistrer à nouveau." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat." : "Votre saisie reste affichée. Comparez la version actuelle avant une nouvelle tentative."}</p>{command.uncertain ? <Button action="retry" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void command.retry()}>{command.acknowledged ? "Actualiser le résultat" : "Réessayer la même opération"}</Button> : null}<Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy || command.uncertain} onClick={() => void compare()}>Comparer la version actuelle</Button>{comparison ? <div className="grid gap-4 border-y py-4"><p className="wrap-anywhere">Version actuelle {comparison.version} : {comparison.title} · {stageLabels[comparison.stage]}</p><p className="whitespace-pre-wrap wrap-anywhere">Prochaine action actuelle : {comparison.next_action || "Non renseignée"}</p><p>Le chargement remplacera les formulaires affichés. Copiez votre brouillon si vous souhaitez le conserver.</p><Button action="refresh" type="button" variant="outline" disabled={busy || command.uncertain} className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { if (command.accept(comparison)) { setComparison(undefined); setResetRevision(value => value + 1); } }}>Charger cette version et réinitialiser les formulaires</Button></div> : null}</section> : null} onEdit={() => { if (!writable || busy || command.protected || command.locked()) return; setEditReview(structuredClone(value)); setEditing(true); setNotice(""); setError(undefined); }} editRef={restoreFocus} initialTask={initialTask} initialTab={initialTab} /></>;
}
