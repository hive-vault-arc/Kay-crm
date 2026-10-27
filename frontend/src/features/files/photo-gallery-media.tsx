"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CameraIcon, ShowPasswordIcon } from "@/components/icons";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { documentSchema, type ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit } from "./transfers";
import { photoCanResume, photoDenied } from "./photo-upload-model";

export function PhotoCard({ photo, writable, disabled, begin, end, denied, refresh, resume, onChanged, openPreview, restoreFocus }: { photo: ProtectedDocument; writable: boolean; disabled: boolean; begin: () => boolean; end: () => void; denied: (error: ApiError) => void; refresh: () => void; resume?: (trigger: HTMLButtonElement) => void; onChanged: () => void; openPreview: (trigger: HTMLButtonElement) => void; restoreFocus?: () => void }) {
  const latest = photo.versions[0];
  const cleanId = photo.versions.find(version => version.state === "clean")?.id;
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const attempt = useRef({ fingerprint: "", key: "" });
  const locked = useRef(false), alive = useRef(true), archived = useRef(false), commandAbort = useRef<AbortController | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; commandAbort.current?.abort(); }; }, []);
  const archiveButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!cleanId) return;
    let active = true, objectUrl: string | undefined; const abort = new AbortController();
    async function load() {
      try {
        const permit = await requestFilePermit({ action: "download", document_id: photo.id, expected_version: photo.version, version_id: cleanId }, abort.signal);
        const blob = await downloadBytes(permit, abort.signal);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch (reason) { if (active && !abort.signal.aborted) { const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503); if (photoDenied(failure)) denied(failure); else { setPreviewFailed(true); setError(failure); } } }
    }
    void load();
    return () => { active = false; abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, previewRetry, denied]);
  async function command(action: "archive" | "retry-scan") {
    if (locked.current || disabled || !writable || !begin()) return;
    locked.current = true; const abort = new AbortController(); commandAbort.current = abort;
    setBusy(true); setError(undefined);
    const fingerprint = `${action}:${photo.version}`;
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { const result = await apiCommand(`/api/v1/documents/${photo.id}/${action}`, { expected_version: photo.version }, documentSchema, attempt.current.key, "POST", undefined, abort.signal); if (result.id !== photo.id || action === "archive" && !result.archived) throw new ApiError("INVALID_RESPONSE", 502); if (!alive.current || abort.signal.aborted) return; archived.current = action === "archive"; setConfirm(false); refresh(); if (action === "archive") onChanged(); }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if (photoDenied(failure)) denied(failure); else setError(failure); } }
    finally { locked.current = false; end(); if (alive.current) setBusy(false); }
  }
  return <li className="kay-photo-card" aria-busy={busy}>
    {url ? <Button type="button" variant="ghost" className="kay-photo-image" disabled={disabled || busy} aria-label={`Ouvrir la photo ${photo.filename}`} onClick={event => openPreview(event.currentTarget)}><Image src={url} alt="" fill unoptimized sizes="(min-width: 560px) 320px, 100vw" className="object-cover" onError={() => { setUrl(undefined); setPreviewFailed(true); }} /><span className="kay-photo-enlarge"><ShowPasswordIcon aria-hidden="true" size={16} />Agrandir</span></Button> : <div className="kay-photo-image kay-photo-placeholder"><CameraIcon aria-hidden="true" size={32} /><span>{previewFailed ? "Aperçu indisponible" : cleanId ? "Chargement de la photo…" : "Aperçu après analyse"}</span></div>}
    <div className="kay-photo-content"><h3>{photo.filename}</h3><p className="text-xs text-muted-foreground">{fileSizeLabel(photo.size_bytes)}</p><ProtectedFileState version={latest} />
    {error && !confirm ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
    <div className="kay-photo-actions">{previewFailed && cleanId ? <Button action="retry" type="button" variant="outline" disabled={busy || disabled} onClick={() => { setError(undefined); setPreviewFailed(false); setPreviewRetry(value => value + 1); }}>Réessayer l’aperçu</Button> : null}{resume && photoCanResume(photo, writable) ? <Button action="upload" type="button" variant="outline" disabled={busy || disabled} onClick={event => resume(event.currentTarget)}>Reprendre</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" type="button" variant="outline" disabled={busy || disabled} onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button ref={archiveButton} action="archive" type="button" variant="outline" disabled={busy || disabled} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div></div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (archived.current || !archiveButton.current?.isConnected) restoreFocus?.(); else archiveButton.current.focus(); }}><AlertDialogTitle>Archiver cette photo ?</AlertDialogTitle><AlertDialogDescription>Elle ne sera plus visible sur le dossier. L’historique du fichier est conservé.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}

export function PhotoViewer({ photos, index, change, close, returnFocus, fallbackFocus, denied }: { photos: ProtectedDocument[]; index: number; change: (index: number) => void; close: () => void; returnFocus: RefObject<HTMLButtonElement | null>; fallbackFocus: RefObject<HTMLHeadingElement | null>; denied: (error: ApiError) => void }) {
  const photo = photos[index];
  const cleanId = photo.versions.find(version => version.state === "clean")?.id;
  const [preview, setPreview] = useState<{ key: string; url: string }>();
  const [failedKey, setFailedKey] = useState<string>();
  const [navigation, setNavigation] = useState(0);
  const [retry, setRetry] = useState(0);
  const mediaKey = `${photo.id}:${photo.version}:${navigation}:${retry}`;
  function navigate(next: number) { setNavigation(value => value + 1); change(next); }
  useEffect(() => {
    if (!cleanId) return;
    let active = true; const abort = new AbortController();
    let objectUrl: string | undefined;
    async function load() {
      try {
        const permit = await requestFilePermit({ action: "download", document_id: photo.id, expected_version: photo.version, version_id: cleanId! }, abort.signal);
        const blob = await downloadBytes(permit, abort.signal);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: mediaKey, url: objectUrl });
        setFailedKey(undefined);
      } catch (reason) { if (active && !abort.signal.aborted) { if (reason instanceof ApiError && photoDenied(reason)) denied(reason); else setFailedKey(mediaKey); } }
    }
    void load();
    return () => { active = false; abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, mediaKey, denied]);
  const url = preview?.key === mediaKey ? preview.url : undefined;
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="inset-3 top-3 flex h-[calc(100dvh-1.5rem)] max-h-none max-w-none translate-y-0 flex-col overflow-hidden p-3 sm:inset-6 sm:top-6 sm:h-[calc(100dvh-3rem)] sm:p-5" onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); else fallbackFocus.current?.focus(); }} onKeyDown={event => {
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); navigate(index - 1); }
      if (event.key === "ArrowRight" && index < photos.length - 1) { event.preventDefault(); navigate(index + 1); }
    }}>
      <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><DialogTitle>Photos du dossier</DialogTitle><DialogDescription className="wrap-anywhere">{photo.filename} · {index + 1} sur {photos.length} photos analysées</DialogDescription></div><Button action="close" type="button" variant="outline" size="icon" aria-label="Fermer la photo" onClick={close}><span className="sr-only">Fermer</span></Button></div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm bg-foreground" aria-live="polite">{url ? <Image src={url} alt={`Photo du dossier : ${photo.filename}`} fill unoptimized sizes="(min-width: 1024px) 90vw, 100vw" className="object-contain" onError={() => { setPreview(undefined); setFailedKey(mediaKey); }} /> : failedKey === mediaKey ? <div className="grid justify-items-center gap-3 p-4 text-center text-background"><p role="alert">Impossible d’ouvrir cette photo.</p><Button action="retry" type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div> : <p role="status" className="text-background">Ouverture de la photo…</p>}</div>
      <div className="flex items-center justify-between gap-3"><Button action="back" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Précédente" disabled={index === 0} onClick={() => navigate(index - 1)}><span className="sr-only sm:not-sr-only">Précédente</span></Button><span className="text-sm text-muted-foreground" aria-live="polite">{index + 1} / {photos.length}</span><Button action="forward" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Suivante" disabled={index === photos.length - 1} onClick={() => navigate(index + 1)}><span className="sr-only sm:not-sr-only">Suivante</span></Button></div>
    </DialogContent>
  </Dialog>;
}
