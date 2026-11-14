"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { FilePicker } from "@/components/shared/file-picker";
import { RecordSection } from "@/components/shared/record-workspace";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { playbackTarget, videoArchived, videoErrors, videoList, type InventoryVideo } from "./video-contracts";
import { uploadVideo } from "./video-transfer";

const statusLabel = {
  uploading: "Transfert à terminer",
  queued: "En attente d’analyse",
  processing: "Analyse et compression en cours",
  ready: "Prête à lire",
  failed: "Traitement échoué",
};

export function InventoryVideos({ kind, id }: { kind: "property" | "development"; id: string }) {
  const query = useQuery(`/api/v1/inventory-videos?parent_kind=${kind}&parent_id=${id}`, videoList);
  const hydrated = useHydrated();
  const fieldId = useId();
  const [file, setFile] = useState<File>();
  const [uploadId, setUploadId] = useState<string>();
  const [resume, setResume] = useState<InventoryVideo>();
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [selected, setSelected] = useState<string>();
  const [archiveId, setArchiveId] = useState<string>();
  const [archiveBusy, setArchiveBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const browse = useRef<HTMLButtonElement>(null);
  const operation = useRef<AbortController | null>(null);
  const archiveOperation = useRef<AbortController | null>(null);
  useEffect(() => () => { operation.current?.abort(); archiveOperation.current?.abort(); }, []);
  const { refreshQuietly } = query;
  const active = query.value?.items.some(item => item.state === "queued" || item.state === "processing");
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(refreshQuietly, 4000);
    return () => clearInterval(timer);
  }, [active, refreshQuietly]);

  if (query.error) return <RecordSection title="Vidéos"><RecordError error={query.error} retry={query.refresh} /></RecordSection>;
  if (!query.value?.enabled) return null;

  function choose(value?: File) {
    if (operation.current) return;
    setFile(value);
    setProgress(0);
    setError(undefined);
    setUploadId(value ? resume?.id ?? crypto.randomUUID() : undefined);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !uploadId || operation.current) return;
    const abort = new AbortController();
    operation.current = abort;
    setBusy(true);
    setError(undefined);
    try {
      await uploadVideo({ file, id: uploadId, parentKind: kind, parentId: id, signal: abort.signal, progress: setProgress });
      if (!abort.signal.aborted) {
        setFile(undefined);
        setUploadId(undefined);
        setResume(undefined);
      }
    } catch (reason) {
      if (!abort.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503));
    } finally {
      if (operation.current === abort) {
        operation.current = null;
        setBusy(false);
        refreshQuietly();
      }
    }
  }

  async function archive() {
    if (!archiveId || archiveOperation.current) return;
    const abort = new AbortController();
    archiveOperation.current = abort;
    setArchiveBusy(true);
    setError(undefined);
    try {
      await apiCommand(`/api/v1/inventory-videos/${archiveId}/archive`, {}, videoArchived, crypto.randomUUID(), "POST", undefined, abort.signal);
      if (abort.signal.aborted) return;
      if (selected === archiveId) setSelected(undefined);
      if (resume?.id === archiveId) { setResume(undefined); setFile(undefined); }
      setArchiveId(undefined);
      refreshQuietly();
    } catch (reason) {
      if (!abort.signal.aborted) setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503));
    } finally {
      if (archiveOperation.current === abort) {
        archiveOperation.current = null;
        setArchiveBusy(false);
      }
    }
  }

  const videos = query.value.items;
  return <RecordSection title="Vidéos">
    <form className="grid gap-3" onSubmit={event => void send(event)} aria-busy={busy}>
      <FilePicker id={fieldId} label={resume ? `Vidéo à reprendre · ${resume.filename}` : "Vidéo à ajouter"}
        accept=".mov,.mp4,video/quicktime,video/mp4" description="MOV ou MP4 · 3 minutes et 300 Mo maximum · jusqu’à 5 vidéos."
        inputRef={input} browseRef={browse} selected={file} choose={value => choose(value)} disabled={!hydrated || busy} />
      {file ? <div className="flex flex-wrap items-center gap-2">
        <Button action={error ? "retry" : "upload"} type="submit" disabled={!hydrated || busy}>{busy ? "Envoi en cours…" : error ? "Réessayer" : resume ? "Reprendre l’envoi" : "Ajouter la vidéo"}</Button>
        {busy ? <Button action="cancel" type="button" variant="outline" onClick={() => operation.current?.abort()}>Interrompre</Button> : null}
        <progress max={100} value={progress} aria-label="Transfert de la vidéo" />
      </div> : null}
      {resume && !busy ? <Button action="cancel" type="button" variant="outline" className="justify-self-start" onClick={() => { setResume(undefined); setFile(undefined); setUploadId(undefined); setError(undefined); }}>Annuler la reprise</Button> : null}
    </form>
    {error && !archiveId ? <p role="alert" className="text-sm text-danger">{videoErrors[error.code] ?? error.message}</p> : null}
    {videos.length ? <ul className="grid gap-3">{videos.map(video => (
      <li key={video.id} className="grid min-w-0 gap-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="wrap-anywhere text-sm font-medium">{video.filename}</h3>
            <p className="text-sm text-muted-foreground">{video.error_code ? videoErrors[video.error_code] ?? statusLabel.failed : statusLabel[video.state]}{video.duration_seconds ? ` · ${video.duration_seconds} s` : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {video.state === "ready" ? <Button action={selected === video.id ? "close" : "show"} type="button" variant="outline" onClick={() => setSelected(selected === video.id ? undefined : video.id)}>{selected === video.id ? "Fermer la vidéo" : "Lire la vidéo"}</Button> : null}
            {video.can_resume ? <Button action="upload" type="button" variant="outline" disabled={busy} onClick={() => { setResume(video); setFile(undefined); setUploadId(undefined); setError(undefined); browse.current?.focus(); }}>Reprendre</Button> : null}
            {video.can_archive ? <Button action="archive" type="button" variant="outline" onClick={() => { setError(undefined); setArchiveId(video.id); }}>Archiver la vidéo</Button> : null}
          </div>
        </div>
        {selected === video.id && video.state === "ready" ? <InventoryVideoPlayer id={video.id} label={video.filename} /> : null}
      </li>
    ))}</ul> : <p className="text-sm text-muted-foreground">Aucune vidéo sur ce dossier.</p>}
    <AlertDialog open={Boolean(archiveId)} onOpenChange={open => { if (!open && !archiveBusy) setArchiveId(undefined); }}>
      <AlertDialogContent>
        <AlertDialogTitle>Archiver cette vidéo ?</AlertDialogTitle>
        <AlertDialogDescription>Elle disparaîtra de la galerie du dossier.</AlertDialogDescription>
        {error && archiveId ? <p role="alert" className="text-sm text-danger">{videoErrors[error.code] ?? error.message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={archiveBusy}>Annuler</Button></AlertDialogCancel>
          <Button action="archive" variant="destructive" disabled={archiveBusy} onClick={() => void archive()}>Confirmer l’archivage</Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  </RecordSection>;
}

function InventoryVideoPlayer({ id, label }: { id: string; label: string }) {
  const [url, setUrl] = useState<string>();
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const time = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    void apiCommand(`/api/v1/inventory-videos/${id}/playback`, {}, playbackTarget, crypto.randomUUID(), "POST", undefined, abort.signal)
      .then(result => { if (!abort.signal.aborted) setUrl(result.url); })
      .catch(() => { if (!abort.signal.aborted) setError(true); });
    return () => abort.abort();
  }, [id, retry]);
  if (error) return <div className="grid gap-2">
    <p role="alert">Impossible de lire la vidéo. Réessayez pour renouveler l’accès.</p>
    <Button action="retry" type="button" variant="outline" className="justify-self-start" onClick={() => { setError(false); setUrl(undefined); setRetry(value => value + 1); }}>Réessayer la lecture</Button>
  </div>;
  if (!url) return <p role="status">Ouverture de la vidéo…</p>;
  return <video aria-label={label} className="max-h-[70dvh] w-full rounded-md bg-foreground" src={url}
    crossOrigin="anonymous" controls playsInline preload="metadata"
    onTimeUpdate={event => { time.current = event.currentTarget.currentTime; }}
    onLoadedMetadata={event => { event.currentTarget.currentTime = Math.min(time.current, event.currentTarget.duration); }}
    onError={() => setError(true)} />;
}
