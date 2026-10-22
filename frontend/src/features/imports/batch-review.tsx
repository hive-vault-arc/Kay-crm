"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { batchPageSchema, batchSchema, countsSchema } from "./contracts";
import { importCommand } from "./client";
import { ImportRows } from "./import-rows";

function batchStatus(state: string, uncertain: boolean, approving: boolean) {
  if (uncertain || approving) return "Résultat d’approbation à vérifier : aucun résultat définitif n’est confirmé ici.";
  if (state === "repreview_required") return "Import annulé intégralement : aucun contact de ce lot n’a été créé. Les données ont changé ; un nouvel aperçu est obligatoire.";
  if (state === "uploaded") return "Fichier reçu : générez l’aperçu avant l’approbation.";
  if (["awaiting_upload", "uploading"].includes(state)) return "Transfert non confirmé. Sélectionnez le même fichier et réessayez, ou envoyez un nouveau lot.";
  return "Aperçu uniquement : aucun contact de ce lot n’a encore été créé.";
}

export function BatchReview({ id, uploadBusy }: { id: string; uploadBusy: boolean }) {
  const [operation, setOperation] = useState<"approval" | "preview">("preview");
  const [page, setPage] = useState(1), [fallback, setFallback] = useState<string>(), [overrides, setOverrides] = useState<Record<number, string | null>>({}), [busy, setBusy] = useState(false), [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>(), [confirm, setConfirm] = useState(false), [uncertain, setUncertain] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null), locked = useRef(false), attempt = useRef<{ key: string; body: { preview_hash: string; fallback_agent_id: string | null } } | null>(null);
  const query = useQuery(`/api/v1/imports/${id}?page=${page}&page_size=25`, batchPageSchema), data = query.value;
  if (data && fallback === undefined) setFallback(data.fallback_agent_id ?? "");
  if (data?.state === "committed" && uncertain) setUncertain(false);
  const counts = countsSchema.safeParse(data?.counts), dirty = Object.keys(overrides).length > 0 || Boolean(data && (fallback ?? "") !== (data.fallback_agent_id ?? ""));
  const committed = data?.state === "committed", canPreview = data && ["uploaded", "previewed", "repreview_required"].includes(data.state), canApprove = data?.state === "previewed" && counts.success && counts.data.invalid === 0 && !dirty;
  function refresh() { query.refresh(); setDenied(undefined); setError(undefined); }
  async function run(approve: boolean) {
    if (locked.current || !data) return;
    locked.current = true; setBusy(true); setOperation(approve ? "approval" : "preview"); setError(undefined);
    try {
      if (approve) {
        if (!data.preview_hash) return;
        attempt.current ??= { key: crypto.randomUUID(), body: { preview_hash: data.preview_hash, fallback_agent_id: data.fallback_agent_id } };
        await importCommand(`/api/v1/imports/${id}/approve`, attempt.current.body, batchSchema, attempt.current.key);
        setUncertain(false); attempt.current = null;
      } else {
        await importCommand(`/api/v1/imports/${id}/preview`, { fallback_agent_id: fallback || null, row_agents: Object.entries(overrides).map(([number, agent_id]) => ({ row_number: Number(number), agent_id })) }, batchSchema);
        setOverrides({}); setUncertain(false);
      }
      query.refresh(); heading.current?.focus();
    } catch (reason) {
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(failure.status)) { setDenied(failure); query.refresh(); }
      else { setError(failure); if (approve && failure.status >= 500) setUncertain(true); else if (approve) { attempt.current = null; setUncertain(false); query.refresh(); } }
    } finally { locked.current = false; setBusy(false); setConfirm(false); }
  }
  if (denied || query.error) return <RecordError error={denied ?? query.error!} retry={refresh} />;
  return <section aria-label="Aperçu et résultat du lot" className="surface grid min-w-0 gap-6 border-t pt-6">
    <h2 ref={heading} tabIndex={-1} className="text-section font-medium">Aperçu et résultat du lot</h2>
    {!data ? <p role="status">Chargement du lot…</p> : <>
      <p className="wrap-anywhere">Fichier : {data.filename}</p>
      {committed && data.result ? <div role="status" className="grid gap-2 text-success"><p>Import approuvé : {data.result.committed} contact(s) créé(s), {data.result.skipped_existing} ligne(s) ignorée(s).</p><p>Résultat conservé du {formatInstant(data.result.approved_at)}. Un nouvel envoi ne remplace pas ces contacts.</p></div> : <p role="status">{batchStatus(data.state, uncertain, busy && operation === "approval")}</p>}
      {counts.success && !uncertain ? <p>{counts.data.eligible} à créer ; {counts.data.skipped_existing} ignorée(s) ; {counts.data.invalid} à corriger ; {counts.data.committed} créée(s).</p> : null}
      {error ? <RecordError error={error} /> : null}
      {uncertain ? <p role="alert" className="text-warning">Résultat non confirmé : le serveur peut avoir terminé. Actualisez le lot ou réessayez la même approbation. Ne renvoyez pas un nouveau fichier pour cette tentative.</p> : null}
      <div className="flex flex-wrap gap-2"><Button liveRefresh action="refresh" type="button" variant="outline" disabled={busy || uploadBusy} onClick={refresh}>Actualiser le lot</Button>{uncertain ? <Button action="retry" type="button" disabled={busy || uploadBusy || committed} onClick={() => void run(true)}>Réessayer l’approbation</Button> : null}</div>
      {canPreview && !committed ? <fieldset disabled={busy || uploadBusy || uncertain} className="grid min-w-0 max-w-reading gap-4"><AgentPicker label="Agent de remplacement des lignes sans agent_email" value={fallback ?? ""} change={setFallback} /><p className="text-sm">Utilisé seulement si agent_email est vide et si la ligne n’a pas de sélection propre. Les autres attributions restent inchangées.</p><Button action="preview" type="button" variant="outline" className="justify-self-start" onClick={() => void run(false)}>Générer un nouvel aperçu</Button></fieldset> : null}
      {dirty ? <p className="text-warning">Attributions modifiées : générez un nouvel aperçu avant de changer de page ou d’approuver.</p> : null}
      {counts.success && counts.data.invalid > 0 ? <p className="text-danger">Approbation bloquée : corrigez toutes les lignes invalides dans le fichier ou leurs attributions.</p> : null}
      {canPreview && !committed ? <Button action="confirm" ref={trigger} type="button" className="justify-self-start" disabled={!canApprove || busy || uploadBusy || uncertain} onClick={() => setConfirm(true)}>Approuver l’import</Button> : null}
      {busy ? <p role="status">{operation === "approval" ? "Approbation en cours…" : "Prévisualisation en cours…"} Ne lancez pas un autre lot.</p> : null}
      {!uncertain ? <ImportRows rows={data.items} editable={Boolean(canPreview && !committed && !busy && !uploadBusy)} overrides={overrides} change={(number, agent) => setOverrides(old => ({ ...old, [number]: agent }))} /> : null}
      {!data.items.length ? <p>Aucune ligne prévisualisée pour ce lot.</p> : null}
      <fieldset disabled={busy || uploadBusy || dirty || uncertain}><NumberedPages page={page} total={data.total} size={data.page_size} change={setPage} label="Pages du lot" /></fieldset>
      <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}><AlertDialogTitle>Approuver tout le lot ?</AlertDialogTitle><AlertDialogDescription>{counts.success ? `${counts.data.eligible} nouveau(x) contact(s) seront créés ensemble avec les agents affichés. ${counts.data.skipped_existing} ligne(s) seront ignorée(s) sans modification du contact existant. Si les droits, agents ou téléphones ont changé, aucune création du lot ne sera conservée.` : "Vérifiez toutes les lignes avant de confirmer."}</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={busy}>Revenir à l’aperçu</Button></AlertDialogCancel><Button action="confirm" type="button" disabled={busy} onClick={() => void run(true)}>{busy ? "Approbation en cours…" : "Confirmer l’import"}</Button></div></AlertDialogContent></AlertDialog>
    </>}
  </section>;
}
