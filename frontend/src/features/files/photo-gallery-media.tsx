"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { CameraIcon, CompletedIcon, ShowPasswordIcon } from "@/components/icons";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { documentSchema, type ProtectedDocument } from "./contracts";
import { photoPreview, photoPreviewKey, type PhotoPreviewCache } from "./photo-previews";
import { photoCanResume, photoDenied } from "./photo-upload-model";

type PreviewScope = { cache: RefObject<PhotoPreviewCache>; previewAbort: RefObject<AbortController | null> };

export function PhotoCard({ photo, writable, disabled, begin, end, denied, refresh, resume, onChanged, onPrimaryChanged, openPreview, restoreFocus, cache, previewAbort }: { photo: ProtectedDocument; writable: boolean; disabled: boolean; begin: () => boolean; end: () => void; denied: (error: ApiError) => void; refresh: () => void; resume?: (trigger: HTMLButtonElement) => void; onChanged: () => void; onPrimaryChanged?: (selected: boolean) => void; openPreview: (trigger: HTMLButtonElement) => void; restoreFocus?: () => void } & PreviewScope) {
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
    let active = true, objectUrl: string | undefined;
    async function load() {
      try {
        const blob = await photoPreview(cache.current, { id: photo.id, version: photo.version }, cleanId!, false, previewAbort.current?.signal);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch (reason) { if (active) { const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503); if (photoDenied(failure)) denied(failure); else { setPreviewFailed(true); setError(failure); } } }
    }
    void load();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, previewRetry, denied, cache, previewAbort]);
  async function command(action: "archive" | "retry-scan" | "set-primary") {
    const allowed = action === "set-primary" ? onPrimaryChanged && cleanId && photo.is_primary_photo === false : writable;
    if (locked.current || disabled || !allowed || !begin()) return;
    locked.current = true; const abort = new AbortController(); commandAbort.current = abort;
    setBusy(true); setError(undefined);
    const fingerprint = `${action}:${photo.version}`;
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const result = await apiCommand(`/api/v1/documents/${photo.id}/${action}`, { expected_version: photo.version }, documentSchema, attempt.current.key, "POST", undefined, abort.signal);
      if (result.id !== photo.id || (action === "archive" && !result.archived) || (action === "set-primary" && result.is_primary_photo === undefined)) throw new ApiError("INVALID_RESPONSE", 502);
      if (!alive.current || abort.signal.aborted) return;
      attempt.current = { fingerprint: "", key: "" };
      if (action === "set-primary") {
        onPrimaryChanged?.(result.is_primary_photo === true);
        return;
      }
      archived.current = action === "archive"; setConfirm(false); refresh();
      if (action === "archive") onChanged();
    }
    catch (reason) { if (alive.current && !abort.signal.aborted) { const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503); if (photoDenied(failure)) denied(failure); else setError(failure); } }
    finally { locked.current = false; end(); if (alive.current) setBusy(false); }
  }
  return <li className="kay-photo-card" aria-busy={busy}>
    {url ? <Button type="button" variant="ghost" className="kay-photo-image" disabled={disabled || busy} aria-label={`Ouvrir la photo ${photo.filename}`} onClick={event => openPreview(event.currentTarget)}><Image src={url} alt="" fill unoptimized sizes="(min-width: 560px) 320px, 100vw" className="object-cover" onError={() => { setUrl(undefined); setPreviewFailed(true); }} /><span className="kay-photo-enlarge"><ShowPasswordIcon aria-hidden="true" size={16} />Agrandir</span></Button> : <div className="kay-photo-image kay-photo-placeholder"><CameraIcon aria-hidden="true" size={32} /><span>{previewFailed ? "Aperçu indisponible" : cleanId ? "Chargement de la photo…" : "Aperçu après analyse"}</span></div>}
    <div className="kay-photo-content"><h3>{photo.filename}</h3>{photo.is_primary_photo && cleanId ? <span className="flex items-center gap-2 text-sm font-medium text-success"><CompletedIcon aria-hidden="true" size={16} />Photo principale</span> : null}<p className="text-xs text-muted-foreground">{fileSizeLabel(photo.size_bytes)}</p><ProtectedFileState version={latest} />
    {error && !confirm ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
    <div className="kay-photo-actions">{onPrimaryChanged && cleanId && photo.is_primary_photo === false ? <Button action="select" type="button" variant="outline" disabled={busy || disabled} aria-label={`Définir comme photo principale : ${photo.filename}`} onClick={() => void command("set-primary")}>Définir comme photo principale</Button> : null}{previewFailed && cleanId ? <Button action="retry" type="button" variant="outline" disabled={busy || disabled} onClick={() => { cache.current.delete(photoPreviewKey(photo.id, cleanId)); setError(undefined); setPreviewFailed(false); setPreviewRetry(value => value + 1); }}>Réessayer l’aperçu</Button> : null}{resume && photoCanResume(photo, writable) ? <Button action="upload" type="button" variant="outline" disabled={busy || disabled} onClick={event => resume(event.currentTarget)}>Reprendre</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" type="button" variant="outline" disabled={busy || disabled} onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button ref={archiveButton} action="archive" type="button" variant="outline" disabled={busy || disabled} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div></div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (archived.current || !archiveButton.current?.isConnected) restoreFocus?.(); else archiveButton.current.focus(); }}><AlertDialogTitle>Archiver cette photo ?</AlertDialogTitle><AlertDialogDescription>Elle ne sera plus visible sur le dossier. L’historique du fichier est conservé.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}

export function PhotoViewer({ photos, index, page, hasPrevious, hasNext, busy, error, change, close, returnFocus, fallbackFocus, denied, cache, previewAbort }: { photos: ProtectedDocument[]; index: number; page: number; hasPrevious: boolean; hasNext: boolean; busy: boolean; error?: string; change: (index: number) => void; close: () => void; returnFocus: RefObject<HTMLButtonElement | null>; fallbackFocus: RefObject<HTMLHeadingElement | null>; denied: (error: ApiError) => void } & PreviewScope) {
  const photo = photos[index];
  const cleanId = photo.versions.find(version => version.state === "clean")?.id;
  const [preview, setPreview] = useState<{ key: string; url: string }>();
  const [failedKey, setFailedKey] = useState<string>();
  const [navigation, setNavigation] = useState(0);
  const [retry, setRetry] = useState(0);
  const content = useRef<HTMLDivElement>(null);
  const mediaKey = `${photo.id}:${photo.version}:${navigation}:${retry}`;
  const canGoBack = index > 0 || hasPrevious, canGoForward = index < photos.length - 1 || hasNext;
  function navigate(next: number) {
    if (busy) return;
    // Keep keyboard events inside the dialog when the active arrow becomes disabled.
    if (next <= 0 || next >= photos.length - 1) content.current?.focus();
    setNavigation(value => value + 1);
    change(next);
  }
  useEffect(() => {
    if (!cleanId) return;
    let active = true;
    let objectUrl: string | undefined;
    async function load() {
      try {
        const blob = await photoPreview(cache.current, { id: photo.id, version: photo.version }, cleanId!, false, previewAbort.current?.signal);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: mediaKey, url: objectUrl });
        setFailedKey(undefined);
      } catch (reason) { if (active) { if (reason instanceof ApiError && photoDenied(reason)) denied(reason); else setFailedKey(mediaKey); } }
    }
    void load();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, mediaKey, denied, cache, previewAbort]);
  const url = preview?.key === mediaKey ? preview.url : undefined;
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent ref={content} tabIndex={-1} className="inset-3 top-3 flex h-[calc(100dvh-1.5rem)] max-h-none max-w-none translate-y-0 flex-col overflow-hidden p-3 sm:inset-6 sm:top-6 sm:h-[calc(100dvh-3rem)] sm:p-5" onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); else fallbackFocus.current?.focus(); }} onKeyDown={event => {
      if (event.key === "ArrowLeft" && canGoBack) { event.preventDefault(); navigate(index - 1); }
      if (event.key === "ArrowRight" && canGoForward) { event.preventDefault(); navigate(index + 1); }
    }}>
      <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><DialogTitle>Photos du dossier</DialogTitle><DialogDescription className="wrap-anywhere">{photo.filename} · Page {page} · {index + 1} sur {photos.length} photos analysées</DialogDescription></div><Button action="close" type="button" variant="outline" size="icon" aria-label="Fermer la photo" onClick={close}><span className="sr-only">Fermer</span></Button></div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm bg-foreground" aria-live="polite">{url ? <Image src={url} alt={`Photo du dossier : ${photo.filename}`} fill unoptimized sizes="(min-width: 1024px) 90vw, 100vw" className="object-contain" onError={() => { setPreview(undefined); setFailedKey(mediaKey); }} /> : failedKey === mediaKey ? <div className="grid justify-items-center gap-3 p-4 text-center text-background"><p role="alert">Impossible d’ouvrir cette photo.</p><Button action="retry" type="button" variant="outline" onClick={() => { if (cleanId) cache.current.delete(photoPreviewKey(photo.id, cleanId)); setRetry(value => value + 1); }}>Réessayer</Button></div> : <p role="status" className="text-background">Ouverture de la photo…</p>}</div>
      {error ? <p role="alert" className="text-danger">{error}</p> : null}
      {busy ? <p role="status">Chargement de la page de photos…</p> : null}
      <div className="flex items-center justify-between gap-3"><Button action="back" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Précédente" disabled={busy || !canGoBack} onClick={() => navigate(index - 1)}><span className="sr-only sm:not-sr-only">Précédente</span></Button><span className="text-sm text-muted-foreground" aria-live="polite">{index + 1} / {photos.length}</span><Button action="forward" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Suivante" disabled={busy || !canGoForward} onClick={() => navigate(index + 1)}><span className="sr-only sm:not-sr-only">Suivante</span></Button></div>
    </DialogContent>
  </Dialog>;
}
