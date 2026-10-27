"use client";
import { useEffect, useId, useRef, useState } from "react";
import { RefreshIcon } from "@/components/icons";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { FilePicker } from "@/components/shared/file-picker";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import type { ProtectedDocument } from "./contracts";
import { newPhotoAttempt, photoCanResume, photoDenied, photoLimit, photoSelectionError, sendPhoto, type PhotoPhase } from "./photo-upload-model";

export function PhotoUploadForm({ parentId, parentKind, resume, writable, uploadable, total, saved, cancel, denied }: {
  parentId: string; parentKind: "property" | "development"; resume?: ProtectedDocument; writable: boolean; uploadable: boolean; total: number;
  saved: (result: Awaited<ReturnType<typeof sendPhoto>>) => void; cancel: () => void; denied: (error: ApiError) => void;
}) {
  const id = useId(), hydrated = useHydrated(), scope = useRef<HTMLFormElement>(null), input = useRef<HTMLInputElement>(null), browse = useRef<HTMLButtonElement>(null);
  const alive = useRef(true), lock = useRef(false), completed = useRef(false), controller = useRef<AbortController | null>(null), attempt = useRef(newPhotoAttempt());
  const [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [frozen, setFrozen] = useState(false), [error, setError] = useState<ApiError>();
  const [phase, setPhase] = useState<PhotoPhase>("preparing"), [progress, setProgress] = useState<number>();
  const guard = useUnsavedGuard();
  const draft = useDossierDraft(file ? { name: file.name, type: file.type, size: file.size, modified: file.lastModified, resume: resume?.id } : null, busy);
  useEffect(() => { alive.current = true; browse.current?.focus(); return () => { alive.current = false; controller.current?.abort(); }; }, []);
  function choose(selected?: File) {
    if (lock.current || attempt.current.started || completed.current) return;
    setFile(selected); setError(selected ? photoSelectionError(selected) : undefined); attempt.current = newPhotoAttempt();
  }
  async function submit() {
    if (!hydrated || lock.current || completed.current || !file || !uploadable) return;
    if (resume && !photoCanResume(resume, writable)) { denied(new ApiError("FORBIDDEN", 403)); return; }
    if (!resume && !attempt.current.started && total >= photoLimit) { setError(new ApiError("PROPERTY_PHOTO_LIMIT", 409)); return; }
    lock.current = true; setBusy(true); setError(undefined); setProgress(undefined);
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await sendPhoto({ attempt: attempt.current, file, parentKind, parentId, resume, writable, signal: abort.signal, progress: value => { if (alive.current) setProgress(value); }, phase: value => { if (alive.current) setPhase(value); }, reserved: () => { if (alive.current) setFrozen(true); } });
      if (!alive.current || abort.signal.aborted) return;
      completed.current = true; setFile(undefined); draft.accept(null); saved(result);
    } catch (reason) {
      if (!alive.current) return;
      const failure = abort.signal.aborted ? new ApiError("FILE_TRANSFER_INTERRUPTED", 503) : reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if (photoDenied(failure)) { setFile(undefined); draft.accept(null); denied(failure); } else setError(failure);
    } finally { lock.current = false; if (alive.current) { setBusy(false); setProgress(undefined); controller.current = null; } }
  }
  return <>{guard.dialog}<form ref={scope} className="kay-drawer-form" aria-label={resume ? "Reprendre la photo" : "Ajouter une photo"} aria-busy={busy} data-draft-managed data-live-dirty={draft.dirty ? "true" : undefined} noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
    {error ? <RecordError error={error} /> : null}
    {resume ? <div className="kay-upload-context"><RefreshIcon aria-hidden="true" size={20} /><div><span>Photo à reprendre</span><strong>{resume.filename}</strong><small>Sa place est déjà conservée dans la galerie. Choisissez la même image source.</small></div></div> : null}
    <RecordSection title={resume ? "Reprendre la photo" : "Ajouter une photo"} description="La photo sera partagée avec l’équipe après son analyse antivirus."><fieldset disabled={!hydrated || busy || frozen || !uploadable} className="min-w-0"><legend className="sr-only">Image à envoyer</legend><FilePicker id={id} label={resume ? "Image à reprendre" : "Photo à ajouter"} accept=".jpg,.jpeg,.png,.webp" description="JPG, PNG ou WebP · 20 Mo maximum." inputRef={input} browseRef={browse} selected={file} choose={choose} disabled={!hydrated || busy || frozen || !uploadable} /></fieldset>
      <p className="text-sm text-muted-foreground">{resume && resume.mime_type !== "image/webp" ? "Cette photo ancienne se reprend dans son format d’origine, sans conversion de ses octets." : "Conversion WebP automatique à l’envoi, sans copie des métadonnées de la source."}</p>
    </RecordSection>
    {frozen ? <p className="text-sm text-muted-foreground">Cette tentative conserve la même image. Réessayez son envoi ou revenez à la galerie pour vérifier l’état de la photo.</p> : null}
    {busy ? <div className="kay-photo-feedback"><div className="kay-upload-progress" role="status"><span>{phase === "preparing" ? "Préparation de l’image…" : phase === "authorizing" ? "Vérification du transfert privé…" : `Transfert : ${progress ?? 0} % · analyse antivirus à suivre.`}</span><progress aria-label="Envoi de la photo" max={100} value={phase === "uploading" ? progress : undefined} /></div><Button action="cancel" type="button" variant="outline" onClick={() => controller.current?.abort()}>Interrompre</Button></div> : null}
    <div className="kay-form-footer"><Button action="back" type="button" variant="outline" disabled={busy} onClick={() => guard.request(cancel, scope.current ?? undefined)}>Retour à la galerie</Button><Button action={error ? "retry" : "upload"} type="submit" disabled={!hydrated || busy || !file || !uploadable || Boolean(file && photoSelectionError(file))}>{busy ? "Envoi en cours…" : error ? "Réessayer" : resume ? "Reprendre" : "Ajouter la photo"}</Button></div>
  </form></>;
}
