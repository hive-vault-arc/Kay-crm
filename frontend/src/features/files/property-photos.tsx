"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { ShowPasswordIcon, UploadIcon } from "@/components/icons";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { documentSchema, documentsSchema, maxFileBytes, type ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit, uploadBytes } from "./transfers";

const photoLimit = 10;
const sourceTypes = new Map([["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["webp", "image/webp"]]);

export async function convertPropertyPhoto(file: File): Promise<File> {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (file.size <= 0 || file.size > maxFileBytes) throw new ApiError("FILE_TOO_LARGE", 413);
  if (sourceTypes.get(extension) !== file.type) throw new ApiError("UNSUPPORTED_MEDIA_TYPE", 415);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new ApiError("PHOTO_CONVERSION_FAILED", 415); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 25_000_000) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new ApiError("PHOTO_CONVERSION_FAILED", 415)), "image/webp", 0.82));
    if (blob.type !== "image/webp" || !blob.size || blob.size > maxFileBytes) throw new ApiError("PHOTO_CONVERSION_FAILED", 415);
    const stem = file.name.replace(/\.[^.]+$/, "").replace(/[\\/:"<>|?*\p{C}]/gu, "-").trim().slice(0, 175) || "photo";
    return new File([blob], `${stem}.webp`, { type: "image/webp" });
  } finally { bitmap.close(); }
}

export function PropertyPhotos({ propertyId, parentKind = "property", writable, uploadable = writable, onChanged }: { propertyId: string; parentKind?: "property" | "development"; writable: boolean; uploadable?: boolean; onChanged: () => void }) {
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${propertyId}&purpose=photo&page=${page}&page_size=10`, documentsSchema);
  const [file, setFile] = useState<File>();
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>();
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const chooser = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const abort = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const attempt = useRef<{ key: string; documentId: string; converted?: File }>({ key: "", documentId: "" });
  const thumbnailPending = useRef<string | null>(null);
  const observed = useRef<Record<string, string>>({});
  const pending = Boolean(query.value?.items.some(item => item.versions[0]?.state === "pending_scan"));
  const cleanPhotos = query.value?.items.filter(item => item.versions.some(version => version.state === "clean")) ?? [];
  const selectedIndex = cleanPhotos.findIndex(item => item.id === selectedPhotoId);
  const refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    if (!query.value) return;
    const next = Object.fromEntries(query.value.items.map(item => [item.id, item.versions[0]?.state ?? "awaiting_upload"]));
    const newlyClean = query.value.items.some(item => item.versions[0]?.state === "clean" && (observed.current[item.id] === "pending_scan" || thumbnailPending.current === item.id));
    if (newlyClean) { thumbnailPending.current = null; onChanged(); }
    observed.current = next;
  }, [query.value, onChanged]);

  async function upload(selected: File) {
    if (locked.current || (!resume && (query.value?.total ?? 0) >= photoLimit)) return;
    locked.current = true; setBusy(true); setProgress(undefined); setError(undefined); setNotice("");
    const controller = new AbortController(); abort.current = controller;
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    try {
      const converted = attempt.current.converted ?? await convertPropertyPhoto(selected);
      attempt.current.converted = converted;
      if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      if (resume && (resume.filename !== converted.name || resume.size_bytes !== converted.size || resume.mime_type !== converted.type)) throw new ApiError("FILE_SIZE_MISMATCH", 422);
      const metadata = { parent_kind: parentKind, parent_id: propertyId, purpose: "photo", filename: converted.name, mime_type: converted.type, size_bytes: converted.size };
      let document: ProtectedDocument;
      const existingId = resume?.id ?? attempt.current.documentId;
      if (existingId) document = await apiGet(`/api/v1/documents/${existingId}`, documentSchema, controller.signal);
      else { document = await apiCommand("/api/v1/documents", metadata, documentSchema, attempt.current.key); attempt.current.documentId = document.id; }
      if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      const permit = await requestFilePermit({ action: "upload", document_id: document.id, expected_version: document.version });
      await uploadBytes(permit, converted, setProgress, controller.signal);
      thumbnailPending.current = document.id;
      setNotice("Photo WebP envoyée. Elle sera visible après l’analyse antivirus.");
      setFile(undefined); setResume(undefined); attempt.current = { key: "", documentId: "" };
      if (input.current) input.current.value = "";
      setPage(1);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("PHOTO_CONVERSION_FAILED", 415)); }
    finally { locked.current = false; setBusy(false); setProgress(undefined); abort.current = null; refresh(); if (controller.signal.aborted) heading.current?.focus(); }
  }

  return <section aria-label="Photos du bien" className="surface grid min-w-0 gap-5 xl:col-span-2">
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><h2 ref={heading} tabIndex={-1} className="text-section font-medium"><UploadIcon aria-hidden="true" className="mr-2 inline size-5 align-[-0.15em]" />Photos du bien</h2><p className="text-sm text-muted-foreground">JPEG, PNG ou WebP convertis en WebP avant l’envoi. Les photos sont partagées avec l’équipe après analyse.</p></div><p className="text-sm font-medium" aria-live="polite">{query.value ? `${query.value.total} / ${photoLimit} photos` : "Chargement…"}</p></div>
    {query.error ? <RecordError error={query.error} retry={refresh} /> : <>
      {uploadable && (resume || (query.value && query.value.total < photoLimit)) ? <fieldset className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <legend className="sr-only">Envoi d’une photo</legend>
        <div className="grid min-w-0 gap-2"><Label htmlFor={inputId}>{resume ? "Reprendre cette photo" : "Ajouter une photo"}</Label><Input ref={input} id={inputId} type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only left-0 top-0 h-px w-px border-0 p-0" tabIndex={-1} disabled={!hydrated || busy} onChange={event => { const selected = event.target.files?.[0]; if (!selected) return; setFile(selected); setError(undefined); setNotice(""); attempt.current = { key: "", documentId: "" }; void upload(selected); }} /><Button ref={chooser} action="file" type="button" variant="outline" className="justify-self-start" disabled={!hydrated || busy} onClick={() => input.current?.click()}>Choisir une image</Button><p className="wrap-anywhere text-sm text-muted-foreground" aria-live="polite">{busy ? "Préparation et envoi automatique…" : file?.name ?? "Aucune image sélectionnée"} · 20 Mo maximum par image</p>{resume ? <p className="text-sm text-muted-foreground">Sélectionnez à nouveau la même image source pour reprendre {resume.filename}.</p> : null}</div>
        <div className="flex flex-wrap gap-2">{busy ? <Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre</Button> : error && file ? <Button action="retry" type="button" variant="outline" onClick={() => void upload(file)}>Réessayer l’envoi</Button> : resume ? <Button action="cancel" type="button" variant="outline" onClick={() => { setResume(undefined); setFile(undefined); attempt.current = { key: "", documentId: "" }; if (input.current) input.current.value = ""; }}>Annuler la reprise</Button> : null}</div>
      </fieldset> : null}
      {progress !== undefined ? <p role="status">Transfert WebP : {progress} %. Analyse antivirus à suivre.</p> : null}
      {error ? <p role="alert" className="text-danger">{error.message}</p> : null}{notice ? <p role="status" className="text-info">{notice}</p> : null}
      {!query.value ? <p role="status">Chargement des photos…</p> : query.value.items.length ? <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">{query.value.items.map(photo => <PhotoCard key={`${photo.id}:${photo.version}`} photo={photo} writable={writable && !busy} resumable={uploadable && !busy && (writable || photo.can_upload === true)} refresh={() => { setPage(1); refresh(); }} onChanged={onChanged} openPreview={trigger => { previewTrigger.current = trigger; setSelectedPhotoId(photo.id); }} resume={() => { setResume(photo); setFile(undefined); setError(undefined); attempt.current = { key: "", documentId: "" }; requestAnimationFrame(() => chooser.current?.focus()); }} />)}</ul> : <p className="text-sm text-muted-foreground">Aucune photo sur ce bien.</p>}
      {query.value && query.value.total >= photoLimit ? <p className="text-sm text-muted-foreground">Limite de 10 photos atteinte. Archivez une photo pour libérer une place.</p> : null}
      {query.value ? <NumberedPages label="Pages des photos du bien" page={page} total={query.value.total} size={10} change={setPage} /> : null}
      {selectedIndex >= 0 ? <PhotoViewer photos={cleanPhotos} index={selectedIndex} change={index => setSelectedPhotoId(cleanPhotos[index]?.id)} close={() => setSelectedPhotoId(undefined)} returnFocus={previewTrigger} /> : null}
    </>}
  </section>;
}

function PhotoCard({ photo, writable, resumable, refresh, resume, onChanged, openPreview }: { photo: ProtectedDocument; writable: boolean; resumable: boolean; refresh: () => void; resume: () => void; onChanged: () => void; openPreview: (trigger: HTMLButtonElement) => void }) {
  const latest = photo.versions[0];
  const cleanId = photo.versions.find(version => version.state === "clean")?.id;
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const attempt = useRef({ fingerprint: "", key: "" });
  const archiveButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!cleanId) return;
    let active = true, objectUrl: string | undefined;
    async function load() {
      try {
        const permit = await requestFilePermit({ action: "download", document_id: photo.id, expected_version: photo.version, version_id: cleanId });
        const blob = await downloadBytes(permit);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch { if (active) { setPreviewFailed(true); setError(new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); } }
    }
    void load();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, previewRetry]);
  async function command(action: "archive" | "retry-scan") {
    if (busy) return;
    setBusy(true); setError(undefined);
    const fingerprint = `${action}:${photo.version}`;
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(`/api/v1/documents/${photo.id}/${action}`, { expected_version: photo.version }, documentSchema, attempt.current.key); setConfirm(false); refresh(); if (action === "archive") onChanged(); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { setBusy(false); }
  }
  return <li className="grid min-w-0 content-start gap-3 rounded-md border bg-card p-3">
    {url ? <Button type="button" variant="ghost" className="group relative block aspect-[4/3] h-auto min-h-0 w-full overflow-hidden rounded-sm bg-muted p-0 focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ouvrir la photo ${photo.filename}`} onClick={event => openPreview(event.currentTarget)}><Image src={url} alt="" fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" onError={() => { setUrl(undefined); setPreviewFailed(true); }} /><span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-sm bg-card/95 px-2 py-1 text-xs text-foreground shadow-sm"><ShowPasswordIcon aria-hidden="true" className="size-4" />Voir</span></Button> : <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-sm bg-muted px-3 text-center text-sm text-muted-foreground">{previewFailed ? "Aperçu indisponible" : cleanId ? "Chargement de la photo…" : "Aperçu après analyse"}</div>}
    <div className="grid min-w-0 gap-1"><h3 className="wrap-anywhere text-sm font-medium">{photo.filename}</h3><p className="text-xs text-muted-foreground">{new Intl.NumberFormat("fr-MA").format(photo.size_bytes)} octets</p><ProtectedFileState version={latest} /></div>
    {error ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
    <div className="flex flex-wrap gap-2">{previewFailed && cleanId ? <Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => { setError(undefined); setPreviewFailed(false); setPreviewRetry(value => value + 1); }}>Réessayer l’aperçu</Button> : null}{resumable && (!latest || latest.state === "awaiting_upload") ? <Button action="upload" type="button" variant="outline" disabled={busy} onClick={resume}>Reprendre</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button ref={archiveButton} action="archive" type="button" variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); archiveButton.current?.focus(); }}><AlertDialogTitle>Archiver cette photo ?</AlertDialogTitle><AlertDialogDescription>Elle ne sera plus visible sur le bien. L’historique du fichier est conservé.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}

function PhotoViewer({ photos, index, change, close, returnFocus }: { photos: ProtectedDocument[]; index: number; change: (index: number) => void; close: () => void; returnFocus: React.RefObject<HTMLButtonElement | null> }) {
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
    let active = true;
    let objectUrl: string | undefined;
    async function load() {
      try {
        const permit = await requestFilePermit({ action: "download", document_id: photo.id, expected_version: photo.version, version_id: cleanId! });
        const blob = await downloadBytes(permit);
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ key: mediaKey, url: objectUrl });
        setFailedKey(undefined);
      } catch { if (active) setFailedKey(mediaKey); }
    }
    void load();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, photo.version, cleanId, mediaKey]);
  const url = preview?.key === mediaKey ? preview.url : undefined;
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="inset-3 top-3 flex h-[calc(100dvh-1.5rem)] max-h-none max-w-none translate-y-0 flex-col overflow-hidden p-3 sm:inset-6 sm:top-6 sm:h-[calc(100dvh-3rem)] sm:p-5" onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }} onKeyDown={event => {
      if (event.key === "ArrowLeft" && index > 0) { event.preventDefault(); navigate(index - 1); }
      if (event.key === "ArrowRight" && index < photos.length - 1) { event.preventDefault(); navigate(index + 1); }
    }}>
      <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><DialogTitle>Photos du bien</DialogTitle><DialogDescription className="wrap-anywhere">{photo.filename} · {index + 1} sur {photos.length} photos analysées</DialogDescription></div><Button action="close" type="button" variant="outline" size="icon" aria-label="Fermer la photo" onClick={close}><span className="sr-only">Fermer</span></Button></div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-sm bg-foreground" aria-live="polite">{url ? <Image src={url} alt={`Photo du bien : ${photo.filename}`} fill unoptimized sizes="(min-width: 1024px) 90vw, 100vw" className="object-contain" onError={() => { setPreview(undefined); setFailedKey(mediaKey); }} /> : failedKey === mediaKey ? <div className="grid justify-items-center gap-3 p-4 text-center text-background"><p role="alert">Impossible d’ouvrir cette photo.</p><Button action="retry" type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</Button></div> : <p role="status" className="text-background">Ouverture de la photo…</p>}</div>
      <div className="flex items-center justify-between gap-3"><Button action="back" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Précédente" disabled={index === 0} onClick={() => navigate(index - 1)}><span className="sr-only sm:not-sr-only">Précédente</span></Button><span className="text-sm text-muted-foreground" aria-live="polite">{index + 1} / {photos.length}</span><Button action="forward" type="button" variant="outline" size="icon" className="sm:w-auto sm:px-4" aria-label="Suivante" disabled={index === photos.length - 1} onClick={() => navigate(index + 1)}><span className="sr-only sm:not-sr-only">Suivante</span></Button></div>
    </DialogContent>
  </Dialog>;
}
