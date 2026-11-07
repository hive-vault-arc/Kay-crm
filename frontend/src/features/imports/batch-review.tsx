"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RecordSection } from "@/components/shared/record-workspace";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { AgentPicker } from "@/features/contacts/agent-picker";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import type { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { useImportReview } from "./use-import-review";
import { ImportRows } from "./import-rows";
import type { Batch } from "./contracts";

export function batchStatus(state: string, uncertain: boolean, approving: boolean) {
  if (uncertain || approving) return "Résultat d’approbation à vérifier : aucun résultat définitif n’est confirmé ici.";
  if (state === "repreview_required") return "Import annulé intégralement : aucun contact de ce lot n’a été créé. Les données ont changé ; un nouvel aperçu est obligatoire.";
  if (state === "uploaded") return "Fichier reçu : générez l’aperçu avant l’approbation.";
  if (["awaiting_upload", "uploading"].includes(state)) return "Transfert non confirmé. Sélectionnez le même fichier et réessayez, ou envoyez un nouveau lot.";
  return "Aperçu uniquement : aucun contact de ce lot n’a encore été créé.";
}

export function BatchReview({ id, uploadBusy, blockedChanged, authorityDenied, uploadLocked, resume }: { id: string; uploadBusy: boolean; blockedChanged: (blocked: boolean) => void; authorityDenied: (error: ApiError) => void; uploadLocked?: () => boolean; resume?: (batch: Batch) => void }) {
  const model = useImportReview(id, uploadBusy, blockedChanged, authorityDenied, uploadLocked);
  const { data, counts, busy, uncertain, operation, committed, canPreview, review } = model;
  const trigger = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const approving = busy && operation === "approval", hiddenRows = uncertain || approving;
  return <form data-draft-managed data-live-dirty={model.dirty || uncertain || undefined} aria-busy={model.disabled} aria-label="Aperçu et résultat du lot" onSubmit={event => event.preventDefault()} className="kay-surface min-w-0 p-4 sm:p-6">
    <h2 ref={heading} tabIndex={-1} className="sr-only">Aperçu et résultat du lot</h2>
    <RecordSection title={committed ? "Résultat du lot" : "Aperçu du lot"} action={<>
      <Button liveRefresh action="refresh" type="button" variant="outline" disabled={busy || uploadBusy} onClick={model.refresh}>Actualiser le lot</Button>
      {resume && data && ["awaiting_upload", "uploading"].includes(data.state) ? <Button action="upload" type="button" variant="outline" disabled={model.disabled} onClick={() => resume(data)}>Reprendre le transfert</Button> : null}
      {uncertain ? <Button action="retry" type="button" disabled={busy || uploadBusy || committed} onClick={() => void model.approve()}>Réessayer l’approbation</Button> : canPreview ? <>
        <Button action="preview" type="button" variant="outline" disabled={model.disabled} onClick={() => void model.preview()}>Générer un nouvel aperçu</Button>
        <Button action="confirm" ref={trigger} type="button" disabled={!model.canApprove} onClick={model.openReview}>Approuver l’import</Button>
      </> : null}
    </>}>
      {model.error ? <RecordError error={model.error} retry={model.readError ? model.refresh : undefined} /> : null}
      {!data && !model.error ? <p role="status">Chargement du lot…</p> : null}
      {uncertain ? <p role="alert" className="text-warning">Résultat non confirmé : le serveur peut avoir terminé. Actualisez le lot ou réessayez la même approbation. Ne renvoyez pas un nouveau fichier pour cette tentative.</p> : null}
      {data ? <>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm"><strong className="wrap-anywhere">{data.filename}</strong><span className="text-muted-foreground">{fileSizeLabel(data.size_bytes)} · {formatInstant(data.created_at)}</span></div>
        {committed && data.result ? <div role="status" className="grid gap-2 text-success"><p>Import approuvé : {data.result.committed} contact(s) créé(s), {data.result.skipped_existing} ligne(s) ignorée(s).</p><p>Résultat conservé du {formatInstant(data.result.approved_at)}. Un nouvel envoi ne remplace pas ces contacts.</p></div> : <p role="status" className="text-sm text-muted-foreground">{batchStatus(data.state, uncertain, approving)}</p>}
        {counts.success && !hiddenRows ? <div className="flex flex-wrap gap-2" role="group" aria-label="Comptage du lot">
          <Badge variant="info">{counts.data.eligible} à créer</Badge><Badge variant="neutral">{counts.data.skipped_existing} ignorée(s)</Badge><Badge variant={counts.data.invalid ? "danger" : "neutral"}>{counts.data.invalid} à corriger</Badge><Badge variant="success">{counts.data.committed} créée(s)</Badge>
        </div> : null}
        {canPreview && !committed && !hiddenRows ? <fieldset disabled={model.disabled} className="grid min-w-0 gap-3 border-y py-4 lg:grid-cols-2 lg:gap-6">
          <AgentPicker label="Agent de remplacement des lignes sans agent_email" value={model.fallback} change={model.changeFallback} denied={authorityDenied} />
          <p className="text-sm text-muted-foreground">Le remplacement concerne uniquement les lignes sans agent_email ni sélection propre. Les autres attributions restent inchangées. Toute modification doit être prévisualisée.</p>
        </fieldset> : null}
        {model.dirty ? <p className="text-sm text-warning">Attributions modifiées : générez un nouvel aperçu avant de changer de page ou d’approuver.</p> : null}
        {counts.success && counts.data.invalid > 0 && !hiddenRows ? <p className="text-sm text-danger">Approbation bloquée : corrigez toutes les lignes invalides dans le fichier ou leurs attributions.</p> : null}
        {busy ? <p role="status">{approving ? "Approbation en cours…" : "Prévisualisation en cours…"} Ne lancez pas un autre lot.</p> : null}
        {!hiddenRows ? <><ImportRows rows={data.items} editable={canPreview && !committed && !model.disabled} overrides={model.overrides} change={model.changeRow} authorityDenied={authorityDenied} /><fieldset disabled={model.disabled || model.dirty}><NumberedPages page={model.page} total={data.total} size={data.page_size} change={model.changePage} label="Pages du lot" /></fieldset></> : null}
      </> : null}
    </RecordSection>
    <AlertDialog open={Boolean(review)} onOpenChange={open => { if (!open) model.closeReview(); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); (trigger.current?.isConnected ? trigger.current : heading.current)?.focus(); }}>
      <AlertDialogTitle>Approuver tout le lot ?</AlertDialogTitle>
      <AlertDialogDescription>{review ? `${review.counts.eligible} nouveau(x) contact(s) seront créés ensemble avec les agents affichés. ${review.counts.skipped_existing} ligne(s) seront ignorée(s) sans modification du contact existant. Si les droits, agents ou téléphones ont changé, aucune création du lot ne sera conservée.` : "Vérifiez toutes les lignes avant de confirmer."}</AlertDialogDescription>
      {model.staleReview ? <p role="alert" className="text-sm text-warning">Le lot a changé depuis l’ouverture. Revenez à l’aperçu et vérifiez les lignes avant une nouvelle confirmation.</p> : null}
      <div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="back" type="button" variant="outline" disabled={busy}>Revenir à l’aperçu</Button></AlertDialogCancel><Button action="confirm" type="button" disabled={busy || model.staleReview || !model.canApprove} onClick={() => void model.approve()}>{busy ? "Approbation en cours…" : "Confirmer l’import"}</Button></div>
    </AlertDialogContent></AlertDialog>
  </form>;
}
