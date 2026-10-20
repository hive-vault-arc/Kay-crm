"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
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

export function PropertyPhotos({ propertyId, writable, onChanged }: { propertyId: string; writable: boolean; onChanged: () => void }) {
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=property&parent_id=${propertyId}&purpose=photo&page=${page}&page_size=10`, documentsSchema);
  const [file, setFile] = useState<File>();
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
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

  async function upload() {
    if (!file || locked.current || (!resume && (query.value?.total ?? 0) >= photoLimit)) return;
    locked.current = true; setBusy(true); setProgress(undefined); setError(undefined); setNotice("");
    const controller = new AbortController(); abort.current = controller;
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    try {
      const converted = attempt.current.converted ?? await convertPropertyPhoto(file);
      attempt.current.converted = converted;
      if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      if (resume && (resume.filename !== converted.name || resume.size_bytes !== converted.size || resume.mime_type !== converted.type)) throw new ApiError("FILE_SIZE_MISMATCH", 422);
      const metadata = { parent_kind: "property", parent_id: propertyId, purpose: "photo", filename: converted.name, mime_type: converted.type, size_bytes: converted.size };
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
      {writable && (resume || (query.value && query.value.total < photoLimit)) ? <form className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={event => { event.preventDefault(); void upload(); }}>
        <div className="grid min-w-0 gap-2"><Label htmlFor={inputId}>{resume ? "Reprendre cette photo" : "Ajouter une photo"}</Label><Input ref={input} id={inputId} type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only left-0 top-0 h-px w-px border-0 p-0" tabIndex={-1} disabled={!hydrated || busy} onChange={event => { setFile(event.target.files?.[0]); setError(undefined); setNotice(""); attempt.current = { key: "", documentId: "" }; }} /><Button ref={chooser} action="file" type="button" variant="outline" className="justify-self-start" disabled={!hydrated || busy} onClick={() => input.current?.click()}>Choisir une image</Button><p className="wrap-anywhere text-sm text-muted-foreground" aria-live="polite">{file?.name ?? "Aucune image sélectionnée"} · 20 Mo maximum par image</p>{resume ? <p className="text-sm text-muted-foreground">Sélectionnez à nouveau la même image source pour reprendre {resume.filename}.</p> : null}</div>
        <div className="flex flex-wrap gap-2"><Button action="upload" type="submit" disabled={!hydrated || busy || !file}>{busy ? "Préparation ou transfert…" : "Envoyer la photo"}</Button>{busy ? <Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre</Button> : resume ? <Button action="cancel" type="button" variant="outline" onClick={() => { setResume(undefined); setFile(undefined); attempt.current = { key: "", documentId: "" }; if (input.current) input.current.value = ""; }}>Annuler la reprise</Button> : null}</div>
      </form> : null}
      {progress !== undefined ? <p role="status">Transfert WebP : {progress} %. Analyse antivirus à suivre.</p> : null}
      {error ? <p role="alert" className="text-danger">{error.message}</p> : null}{notice ? <p role="status" className="text-info">{notice}</p> : null}
      {!query.value ? <p role="status">Chargement des photos…</p> : query.value.items.length ? <ul className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">{query.value.items.map(photo => <PhotoCard key={`${photo.id}:${photo.version}`} photo={photo} writable={writable && !busy} refresh={() => { setPage(1); refresh(); }} onChanged={onChanged} resume={() => { setResume(photo); setFile(undefined); setError(undefined); attempt.current = { key: "", documentId: "" }; chooser.current?.focus(); }} />)}</ul> : <p className="text-sm text-muted-foreground">Aucune photo sur ce bien.</p>}
      {query.value && query.value.total >= photoLimit ? <p className="text-sm text-muted-foreground">Limite de 10 photos atteinte. Archivez une photo pour libérer une place.</p> : null}
      {query.value ? <NumberedPages label="Pages des photos du bien" page={page} total={query.value.total} size={10} change={setPage} /> : null}
    </>}
  </section>;
}

function PhotoCard({ photo, writable, refresh, resume, onChanged }: { photo: ProtectedDocument; writable: boolean; refresh: () => void; resume: () => void; onChanged: () => void }) {
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
    <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-muted">{url ? <Image src={url} alt={`Photo du bien : ${photo.filename}`} fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /> : <p className="grid h-full place-items-center px-3 text-center text-sm text-muted-foreground">{previewFailed ? "Aperçu indisponible" : cleanId ? "Chargement de la photo…" : "Aperçu après analyse"}</p>}</div>
    <div className="grid min-w-0 gap-1"><h3 className="wrap-anywhere text-sm font-medium">{photo.filename}</h3><p className="text-xs text-muted-foreground">{new Intl.NumberFormat("fr-MA").format(photo.size_bytes)} octets</p><ProtectedFileState version={latest} /></div>
    {error ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
    <div className="flex flex-wrap gap-2">{previewFailed && cleanId ? <Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => { setError(undefined); setPreviewFailed(false); setPreviewRetry(value => value + 1); }}>Réessayer l’aperçu</Button> : null}{writable && latest?.state === "awaiting_upload" ? <Button action="upload" type="button" variant="outline" disabled={busy} onClick={resume}>Reprendre</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" type="button" variant="outline" disabled={busy} onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button ref={archiveButton} action="archive" type="button" variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div>
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); archiveButton.current?.focus(); }}><AlertDialogTitle>Archiver cette photo ?</AlertDialogTitle><AlertDialogDescription>Elle ne sera plus visible sur le bien. L’historique du fichier est conservé.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}
