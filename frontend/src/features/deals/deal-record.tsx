"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { currentRecord } from "@/features/realtime/current-record";
import { apiGet, ApiError } from "@/lib/api/client";
import { useDealCommand } from "./use-deal-command";
import { dealSchema, ordinaryStages, stageLabels, type Deal } from "./contracts";
import { DealForm } from "./deal-form";
import { DealWorkspace } from "./deal-workspace";

export function DealRecord({ id, initialTask, role = "agent", actorId, initialTab }: { id: string; initialTask?: string; role?: StaffRole; actorId?: string; initialTab?: string }) {
  const query = useQuery(`/api/v1/deals/${id}`, dealSchema);
  const [editing, setEditing] = useState(false), [editReview, setEditReview] = useState<Deal>(), [comparison, setComparison] = useState<Deal>(), [resetRevision, setResetRevision] = useState(0);
  const { fresh, setFresh, busy, setBusy, error, setError, notice, setNotice, reload, mutate } = useDealCommand(id, () => setComparison(undefined));
  const [entryNotice, setEntryNotice] = useState("");
  const focusEdit = useRef(false), remote = currentRecord(query.value, fresh, id), value = remote ?? (editing ? editReview : undefined);
  const restoreFocus = useCallback((node: HTMLButtonElement | null) => { if (node && focusEdit.current) { focusEdit.current = false; node.focus(); } }, []);
  function endEdit() { focusEdit.current = true; setEditing(false); setEditReview(undefined); setBusy(false); }
  async function compare() { setBusy(true); try { setComparison(await apiGet(`/api/v1/deals/${id}`, dealSchema)); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); } finally { setBusy(false); } }
  const returnLink = <Button action="back" asChild variant="quiet" size="compact" className="justify-self-start"><Link href="/deals">Retour aux affaires</Link></Button>;
  const heading = <div className="grid min-w-0 justify-items-start gap-2">{returnLink}<PageHeader title="Affaire" description="Pipeline, prochaine action, propositions client et historique." route={`/deals/${id}`} /></div>;
  if (query.error && ((!editing && !remote) || [401, 403, 404].includes(query.error.status))) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(error.code)) return <>{heading}{entryNotice ? <p role="status">{entryNotice}</p> : null}<RecordError error={error} /></>;
  if (!value) return <>{heading}<p role="status">Chargement de l’affaire…</p></>;
  const writable = !value.contact.archived_at && !value.archived_at && (value.stage === "reserved" || ordinaryStages.includes(value.stage as typeof ordinaryStages[number]));
  const canArchive = !value.contact.archived_at && (role !== "agent" || (actorId && value.contact.primary_agent.id === actorId));
  if (editing && editReview) return <div className="grid min-w-0 gap-4">{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<DealForm key={`edit:${editReview.id}`} value={editReview} contact={editReview.contact} actorId={actorId} role={role} unavailable={Boolean(query.error || !remote || !writable || value.contact.id !== editReview.contact.id)} denied={(failure, acknowledged) => { setEntryNotice(acknowledged ? "L’affaire est enregistrée. Les droits d’accès ont changé." : ""); setError(failure); }} busyChanged={setBusy} cancel={endEdit} saved={async (_id, accepted) => { setFresh(accepted); endEdit(); setNotice("Affaire enregistrée."); }} /></div>;
  return <>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : null}<DealWorkspace key={`${id}:${resetRevision}`} contactChanged={query.refreshQuietly} denied={(failure, acknowledged) => { setEntryNotice(acknowledged ? "L’activité est enregistrée. Les droits d’accès ont changé." : ""); setError(failure); }} deal={value} role={role} writable={writable} canArchive={Boolean(canArchive)} busy={busy} busyChanged={setBusy} mutate={mutate} reload={reload} error={error} notice={notice} commandState={error ? <section className="grid gap-4" aria-label="Échec de la modification"><RecordError error={error} /><p>Votre saisie reste affichée. Une réponse interrompue peut avoir été enregistrée : réessayez la même action sans la modifier. En cas de conflit, comparez la version actuelle avant une nouvelle tentative.</p><Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void compare()}>Comparer la version actuelle</Button>{comparison ? <div className="grid gap-4 border-y py-4"><p className="wrap-anywhere">Version actuelle {comparison.version} : {comparison.title} · {stageLabels[comparison.stage]}</p><p className="whitespace-pre-wrap wrap-anywhere">Prochaine action actuelle : {comparison.next_action || "Non renseignée"}</p><p>Le chargement remplacera les formulaires affichés. Copiez votre brouillon si vous souhaitez le conserver.</p><Button action="refresh" type="button" variant="outline" disabled={busy} className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setFresh(comparison); setComparison(undefined); setError(undefined); setResetRevision(value => value + 1); }}>Charger cette version et réinitialiser les formulaires</Button></div> : null}</section> : null} onEdit={() => { if (!writable || busy) return; setEditReview(structuredClone(value)); setEditing(true); setNotice(""); setError(undefined); }} editRef={restoreFocus} initialTask={initialTask} initialTab={initialTab} /></>;
}
