"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { FileIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import type { ApiError } from "@/lib/api/client";
import type { ProtectedDocument } from "./contracts";
import { useFileRowActions, type FileRowBinding } from "./use-file-row-actions";

export function FileRow({ document, writable, readable, actorId, role, refresh, resume, returnFocus, owned, denied }: { document: ProtectedDocument; writable: boolean; readable: boolean; refresh: () => void | Promise<void>; resume: () => void; returnFocus: () => void; owned: (active: boolean, document: ProtectedDocument) => void; denied: (error: ApiError, acknowledged: boolean) => void } & FileRowBinding) {
  const latest = document.versions[0], clean = document.versions.find(version => version.state === "clean");
  const [confirm, setConfirm] = useState(false), review = useRef<ProtectedDocument | undefined>(undefined);
  const archiveButton = useRef<HTMLButtonElement>(null), previewButton = useRef<HTMLButtonElement>(null), archived = useRef(false);
  const actions = useFileRowActions({ document, writable, readable, actorId, role, owned, denied });
  const { busy, recovering, acknowledged, operation, error, preview } = actions;
  const blocked = busy || recovering || !actions.canStart(), writeBlocked = blocked || !writable;
  async function completed(value: ProtectedDocument, signal: AbortSignal) { await refresh(); if (!signal.aborted) { if (value.archived) { archived.current = true; setConfirm(false); } returnFocus(); } }
  function archive() { if (!blocked && writable) { actions.clearError(); review.current = document; setConfirm(true); } }
  const retryingScan = recovering && operation === "retry-scan";
  return <li className="kay-file-entry" aria-busy={actions.commandBusy} data-draft-managed data-live-dirty={recovering || undefined} data-write-recovery={recovering || undefined}>
    <div className="kay-file-entry-head"><span className="kay-file-entry-symbol"><FileIcon size={20} aria-hidden="true" /></span><div><h3>{document.filename}</h3><ProtectedFileState version={latest} /></div></div><p className="kay-file-versions"><span className="kay-file-mobile-label">Versions · </span>{document.versions.length >= 49 ? "49+" : document.versions.length}</p><p className="kay-file-size">{fileSizeLabel(document.size_bytes)}</p>
    {error ? <p role="alert" className="text-danger">{error.message}</p> : null}
    <div className="kay-file-actions">
      <Button action="download" variant="outline" disabled={blocked || !clean} aria-label={`Télécharger ${document.filename}`} onClick={() => void actions.open()}>Télécharger{clean && latest?.id !== clean.id ? " la version précédente" : ""}</Button>
      {document.mime_type.startsWith("image/") && clean ? <Button action="preview" ref={previewButton} variant="outline" disabled={blocked} aria-label={`Afficher ${document.filename}`} onClick={() => void actions.open(true)}>Afficher l’image</Button> : null}
      {writable && latest?.state === "clean" ? <Button action="upload" variant="outline" disabled={blocked} aria-label={"Ajouter une version de " + document.filename} title="Ajouter une version" onClick={() => { if (!blocked && actions.canStart()) resume(); }}>Ajouter une version</Button> : null}
      {writable && (!latest || latest.state === "awaiting_upload") ? <Button action="upload" variant="outline" disabled={blocked} aria-label={"Reprendre le transfert de " + document.filename} title="Reprendre le transfert" onClick={() => { if (!blocked && actions.canStart()) resume(); }}>Reprendre le transfert</Button> : null}
      {retryingScan || writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" variant="outline" disabled={retryingScan ? busy || !actions.canRecover() : blocked} aria-label={"Réessayer l’analyse de " + document.filename} title="Réessayer l’analyse" onClick={() => void (retryingScan ? actions.retry() : actions.start("retry-scan", document, completed))}>{retryingScan ? acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Réessayer l’analyse"}</Button> : null}
      {writable ? <Button action="archive" ref={archiveButton} variant="destructive" disabled={blocked} aria-label={`Archiver ${document.filename}`} onClick={archive}>Archiver</Button> : null}
    </div>
    {busy ? <p role="status">Opération sur le fichier en cours…</p> : null}
    {acknowledged && operation === "archive" && !busy && !recovering ? <p role="status">L’archivage est enregistré. La liste est en cours d’actualisation.</p> : null}
    {recovering ? <p role="status">{acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans la répéter." : "La réponse est interrompue. Réessayez la même opération pour retrouver son résultat."}</p> : null}
    {preview ? <div className="grid min-w-0 justify-items-start gap-4"><Image src={preview} alt={`Aperçu du fichier ${document.filename}`} width={640} height={480} unoptimized className="h-auto max-h-96 w-auto max-w-full object-contain" /><Button action="close" variant="outline" onClick={() => { actions.closePreview(); previewButton.current?.focus(); }}>Fermer l’aperçu</Button></div> : null}
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy && !recovering) setConfirm(open); }}><AlertDialogContent data-draft-managed aria-busy={actions.commandBusy} data-live-dirty={recovering || undefined} data-write-recovery={recovering || undefined} onCloseAutoFocus={event => { event.preventDefault(); if (archived.current) returnFocus(); else archiveButton.current?.focus(); }}><AlertDialogTitle>Archiver cette pièce jointe ?</AlertDialogTitle><AlertDialogDescription>Le fichier ne sera plus proposé au téléchargement. Ses versions et son historique seront conservés.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy || recovering}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={recovering ? busy || !actions.canRecover() : writeBlocked} onClick={() => void (recovering ? actions.retry() : review.current && actions.start("archive", review.current, completed))}>{recovering ? acknowledged ? "Actualiser le résultat" : "Réessayer la même opération" : "Confirmer l’archivage"}</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}{error?.code === "FILE_VERSION_CONFLICT" && !recovering ? <><p className="text-sm text-muted-foreground">Actualisez la liste, puis ouvrez à nouveau la confirmation du document.</p><Button action="refresh" variant="outline" disabled={busy} onClick={() => void refresh()}>Actualiser les documents</Button></> : null}</AlertDialogContent></AlertDialog>
  </li>;
}
