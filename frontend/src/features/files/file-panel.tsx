"use client";
import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { FileIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, useInSheet } from "@/components/ui/sheet";
import { FilePicker, fileSizeLabel } from "@/components/shared/file-picker";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProtectedFileState } from "@/components/shared/protected-file-state";
import { RecordError } from "@/features/contacts/record-states";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { documentSchema, documentsSchema, maxFileBytes, mimeTypes, newDocumentSchema, type ParentKind, type ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit, uploadBytes } from "./transfers";

type UploadAttempt = { key: string; documentId: string; file?: File; metadata?: ReturnType<typeof newDocumentSchema.parse>; minimum: number; permitVersion?: string; actor?: { id: string; role: string } };
const emptyUploadAttempt = (): UploadAttempt => ({ key: "", documentId: "", minimum: 0 });
type UploadBinding = { actorId?: string; role?: ReturnType<typeof meSchema.parse>["user"]["role"] };

export function FilePanel({ parentKind, parentId, writable, actorId, role }: { parentKind: ParentKind; parentId: string; writable: boolean } & UploadBinding) {
  return <FilePanelBody key={`${parentKind}:${parentId}:${actorId ?? ""}:${role ?? ""}`} parentKind={parentKind} parentId={parentId} writable={writable} actorId={actorId} role={role} />;
}

function FilePanelBody({ parentKind, parentId, writable, actorId, role }: { parentKind: ParentKind; parentId: string; writable: boolean } & UploadBinding) {
  const inSheet = useInSheet();
  const inventoryParent = parentKind === "property" || parentKind === "development";
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${parentId}&purpose=attachment&page=${page}&page_size=20`, documentsSchema);
  const [file, setFile] = useState<File>();
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
  const [scopeDenial, setScopeDenial] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const inputId = useId();
  const uploadId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const chooser = useRef<HTMLButtonElement>(null);
  const browse = useRef<HTMLButtonElement>(null);
  const uploadTrigger = useRef<HTMLElement | null>(null);
  const guard = useUnsavedGuard();
  const heading = useRef<HTMLHeadingElement>(null);
  const abort = useRef<AbortController | null>(null);
  const attempt = useRef<UploadAttempt>(emptyUploadAttempt()), alive = useRef(true), available = useRef(writable);
  const locked = useRef(false);
  const pending = Boolean(query.value?.items.some(item => item.versions.some(version => version.state === "pending_scan")));
  const refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  const deniedRead = Boolean(query.error && [401, 403, 404].includes(query.error.status));
  useLayoutEffect(() => { available.current = writable && !deniedRead; if (!available.current) { abort.current?.abort(); attempt.current = emptyUploadAttempt(); setFile(undefined); setResume(undefined); setUploadOpen(false); setBusy(false); setRecovering(false); setProgress(undefined); } }, [writable, deniedRead]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); attempt.current = emptyUploadAttempt(); }; }, []);
  async function upload() {
    const selected = attempt.current.file ?? file;
    if (!hydrated || !alive.current || locked.current || !selected || !available.current) return;
    const extension = selected.name.split(".").at(-1)?.toLowerCase() ?? "";
    const metadata = attempt.current.metadata ?? { parent_kind: parentKind, parent_id: parentId, filename: selected.name, mime_type: selected.type, size_bytes: selected.size };
    if (!newDocumentSchema.safeParse(metadata).success || mimeTypes[extension] !== selected.type || (inventoryParent && selected.type.startsWith("image/"))) { setError(new ApiError(selected.size > maxFileBytes ? "FILE_TOO_LARGE" : inventoryParent ? "PROPERTY_PHOTO_WEBP_REQUIRED" : "UNSUPPORTED_MEDIA_TYPE", 422)); return; }
    if (resume && (resume.filename !== selected.name || resume.mime_type !== selected.type || resume.size_bytes !== selected.size)) { setError(new ApiError("FILE_SIZE_MISMATCH", 422)); return; }
    locked.current = true; setBusy(true); setError(undefined); setNotice(""); setProgress(0);
    const controller = new AbortController(); abort.current = controller;
    if (!attempt.current.file) attempt.current = { key: crypto.randomUUID(), documentId: resume?.id ?? "", minimum: resume?.version ?? 0, file: selected, metadata: newDocumentSchema.parse(metadata) };
    const owned = attempt.current;
    const current = () => alive.current && available.current && attempt.current === owned;
    const check = () => { if (!current()) return false; if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); return true; };
    function authorize(identity: ReturnType<typeof meSchema.parse>) { if (!current() || identity.must_change_password || actorId && identity.user.id !== actorId || role && identity.user.role !== role || inventoryParent && identity.user.role === "agent" || owned.actor && (identity.user.id !== owned.actor.id || identity.user.role !== owned.actor.role)) throw new ApiError("FORBIDDEN", 403); owned.actor ??= { id: identity.user.id, role: identity.user.role }; }
    function validate(value: ProtectedDocument, id?: string) { if (id && value.id !== id) throw new ApiError("NOT_FOUND", 404); if (value.archived || value.can_upload === false) throw new ApiError("FORBIDDEN", 403); if (value.filename !== metadata.filename || value.mime_type !== metadata.mime_type || value.size_bytes !== metadata.size_bytes || value.purpose !== "attachment" || value.version < owned.minimum) throw new ApiError("INVALID_RESPONSE", 503); owned.minimum = value.version; return value; }
    try {
      let document: ProtectedDocument;
      const existingId = owned.documentId;
      if (existingId) { authorize(await apiGet("/api/v1/auth/me", meSchema, controller.signal)); if (!check()) return; document = validate(await apiGet(`/api/v1/documents/${existingId}`, documentSchema, controller.signal), existingId); }
      else {
        document = await apiCommand("/api/v1/documents", owned.metadata!, documentSchema, owned.key, "POST", undefined, controller.signal, { beforeDispatch: authorize });
        if (!check()) return; validate(document); owned.documentId = document.id;
      }
      if (!check()) return;
      const previous = owned.permitVersion ? document.versions.find(value => value.id === owned.permitVersion) : undefined;
      if (owned.permitVersion && !previous) throw new ApiError("INVALID_RESPONSE", 503);
      if (!previous || previous.state === "awaiting_upload") {
        const permit = await requestFilePermit({ action: "upload", document_id: document.id, expected_version: document.version }, controller.signal, authorize);
        if (!check()) return;
        if (permit.document_version !== document.version + 1 || !documentSchema.shape.id.safeParse(permit.version_id).success) throw new ApiError("INVALID_RESPONSE", 503);
        owned.permitVersion = permit.version_id; owned.minimum = permit.document_version;
        await uploadBytes(permit, selected, value => { if (current() && !controller.signal.aborted) setProgress(value); }, controller.signal);
      }
      if (!check()) return;
      setNotice(previous && previous.state !== "awaiting_upload" ? "Le transfert est enregistré. Consultez le résultat de l’analyse dans la liste." : "Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.");
      setFile(undefined); setResume(undefined); attempt.current = emptyUploadAttempt(); setRecovering(false);
      if (fileInput.current) fileInput.current.value = "";
      setUploadOpen(false);
    } catch (reason) { if (current()) { const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503); setError(failure); if ([401, 403, 404].includes(failure.status)) { available.current = false; setScopeDenial(failure); setFile(undefined); setResume(undefined); setUploadOpen(false); attempt.current = emptyUploadAttempt(); setRecovering(false); } else { const uncertain = Boolean(owned.documentId) || failure.status >= 500; setRecovering(uncertain); if (!uncertain) attempt.current = emptyUploadAttempt(); } } }
    finally { locked.current = false; if (alive.current) { setBusy(false); setProgress(undefined); if (abort.current === controller) abort.current = null; if (available.current && controller.signal.aborted) heading.current?.focus(); if (available.current) refresh(); } }
  }
  function closeUpload() {
    if (busy) return;
    guard.request(() => { if (!alive.current || locked.current) return; setUploadOpen(false); setFile(undefined); setResume(undefined); setError(undefined); setRecovering(false); attempt.current = emptyUploadAttempt(); if (fileInput.current) fileInput.current.value = ""; }, window.document.getElementById(uploadId) ?? window.document);
  }
  function showUpload(document?: ProtectedDocument) {
    if (!alive.current || locked.current || busy || recovering || attempt.current.file || !available.current) return;
    uploadTrigger.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    setResume(document); setFile(undefined); setError(undefined); setNotice(""); attempt.current = emptyUploadAttempt(); setUploadOpen(true);
  }
  if (scopeDenial) return <RecordError error={scopeDenial} />;
  return <section aria-label="Pièces jointes" className="kay-record-section kay-file-panel" data-in-sheet={inSheet}>
    <header className="kay-section-head"><h2 ref={heading} tabIndex={-1}>Pièces jointes</h2>{writable && !deniedRead ? <Button action="upload" ref={chooser} variant="outline" disabled={!hydrated || busy || recovering} onClick={() => showUpload()}>Ajouter un document</Button> : null}</header>
    <p className="kay-section-description">{parentKind === "contact" || parentKind === "deal" ? "Documents privés liés au contact, accessibles selon vos droits." : "Documents partagés avec l’équipe. Les justificatifs privés restent sur la fiche du contact."}</p>
    {query.error ? <RecordError error={query.error} retry={refresh} /> : <>
      {!writable ? <p className="text-sm text-muted-foreground">{parentKind === "deal" || parentKind === "contact" ? "Documents en lecture seule dans l’état actuel du dossier." : "Les pièces jointes sont gérées par les responsables."}</p> : null}
      {notice ? <p role="status" className="text-info">{notice}</p> : null}
      {!query.value ? <p role="status">Chargement des pièces jointes…</p> : query.value.items.length ? <div className="kay-file-collection"><div className="kay-file-columns" aria-hidden="true"><span>Document</span><span title="Historique récent renvoyé par le serveur">Versions récentes</span><span>Taille</span><span>Actions</span></div><ul className="kay-file-list">{query.value.items.map(document => <FileRow key={document.id + ":" + document.version} document={document} writable={writable && !busy && !recovering} refresh={refresh} returnFocus={() => heading.current?.focus()} resume={() => showUpload(document)} />)}</ul></div> : <p className="text-sm text-muted-foreground">Aucune pièce jointe sur cette page.{writable ? " Ajoutez un document pour commencer." : ""}</p>}
      {query.value && (query.value.has_previous || query.value.has_next) ? <NumberedPages label="Pages des pièces jointes" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}
    </>}
    <Sheet open={uploadOpen} onOpenChange={open => { if (!open) closeUpload(); }}><SheetContent id={uploadId} className="kay-record-drawer kay-document-uploader" closeLabel="Fermer l’ajout de document" onOpenAutoFocus={event => { event.preventDefault(); browse.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); const target = uploadTrigger.current; if (target?.isConnected) target.focus(); else chooser.current?.focus(); }}>
      <SheetHeader className="kay-drawer-head"><SheetTitle>{resume ? resume.versions[0]?.state === "clean" ? "Ajouter une version" : "Reprendre le transfert" : "Ajouter un document"}</SheetTitle><SheetDescription>Le fichier sera disponible après son analyse antivirus.</SheetDescription></SheetHeader>
      <form className="kay-document-upload" data-draft-managed data-write-recovery={recovering || undefined} data-live-dirty={file || recovering ? "true" : undefined} aria-busy={busy} onSubmit={event => { event.preventDefault(); void upload(); }}>
        <div className="kay-drawer-body">
          {resume ? <div className="kay-upload-context"><FileIcon size={20} aria-hidden="true" /><div><span>Document concerné</span><strong>{resume.filename}</strong><small>Conservez le même nom, format et nombre d’octets ({new Intl.NumberFormat("fr-MA").format(resume.size_bytes)}).</small></div></div> : null}
          <FilePicker id={inputId} label={resume ? "Fichier à envoyer à nouveau" : "Fichier"} accept={inventoryParent ? ".pdf,.docx,.xlsx" : ".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"} inputRef={fileInput} browseRef={browse} selected={file} disabled={!hydrated || busy || recovering || !writable} description={inventoryParent ? "PDF, DOCX ou XLSX sans macro · 20 Mo maximum. Les images s’ajoutent dans Photos." : "JPEG, PNG, WebP, PDF, DOCX ou XLSX sans macro · 20 Mo maximum (20 971 520 octets)."} choose={selected => { if (!alive.current || !available.current || locked.current || attempt.current.file) return; setFile(selected); setError(undefined); setNotice(""); attempt.current = emptyUploadAttempt(); }} />
          {progress !== undefined ? <div className="kay-upload-progress" role="status"><progress max={100} value={progress} aria-label="Progression du transfert" /><p>Transfert : {progress} %. Analyse antivirus à suivre.</p></div> : null}
          {error ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
        </div>
        <footer className="kay-upload-footer">{busy ? <Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button> : <Button action="cancel" type="button" variant="outline" onClick={closeUpload}>Annuler</Button>}<Button action="upload" type="submit" disabled={!hydrated || busy || !file || !writable}>{busy ? "Transfert…" : error ? "Réessayer" : "Envoyer le fichier"}</Button></footer>
      </form>
    </SheetContent></Sheet>{guard.dialog}
  </section>;
}

function FileRow({ document, writable, refresh, resume, returnFocus }: { document: ProtectedDocument; writable: boolean; refresh: () => void; resume: () => void; returnFocus: () => void }) {
  const latest = document.versions[0];
  const clean = document.versions.find(version => version.state === "clean");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [confirm, setConfirm] = useState(false);
  const [preview, setPreview] = useState<string>();
  const url = useRef<string | undefined>(undefined);
  const locked = useRef(false);
  const attempt = useRef({ fingerprint: "", key: "" });
  const archiveButton = useRef<HTMLButtonElement>(null);
  const previewButton = useRef<HTMLButtonElement>(null);
  const archived = useRef(false);
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);
  async function command(action: "archive" | "retry-scan") {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(undefined);
    const fingerprint = `${action}:${document.version}`;
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(`/api/v1/documents/${document.id}/${action}`, { expected_version: document.version }, documentSchema, attempt.current.key); archived.current = action === "archive"; setConfirm(false); returnFocus(); refresh(); }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function open(previewOnly = false) {
    if (!clean || locked.current) return;
    locked.current = true; setBusy(true); setError(undefined);
    try {
      const permit = await requestFilePermit({ action: "download", document_id: document.id, expected_version: document.version, version_id: clean.id });
      const blob = await downloadBytes(permit);
      const objectUrl = URL.createObjectURL(blob);
      if (previewOnly) { if (url.current) URL.revokeObjectURL(url.current); url.current = objectUrl; setPreview(objectUrl); }
      else { const link = window.document.createElement("a"); link.href = objectUrl; link.download = document.filename; link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); }
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); }
    finally { locked.current = false; setBusy(false); }
  }
  return <li className="kay-file-entry">
    <div className="kay-file-entry-head"><span className="kay-file-entry-symbol"><FileIcon size={20} aria-hidden="true" /></span><div><h3>{document.filename}</h3><ProtectedFileState version={latest} /></div></div><p className="kay-file-versions"><span className="kay-file-mobile-label">Versions · </span>{document.versions.length >= 49 ? "49+" : document.versions.length}</p><p className="kay-file-size">{fileSizeLabel(document.size_bytes)}</p>
    {error ? <p role="alert" className="text-danger">{error.message}</p> : null}
    <div className="kay-file-actions"><Button action="download" variant="outline" disabled={busy || !clean} aria-label={`Télécharger ${document.filename}`} onClick={() => void open()}>Télécharger{clean && latest?.id !== clean.id ? " la version précédente" : ""}</Button>{document.mime_type.startsWith("image/") && clean ? <Button action="preview" ref={previewButton} variant="outline" disabled={busy} aria-label={`Afficher ${document.filename}`} onClick={() => void open(true)}>Afficher l’image</Button> : null}{writable && latest?.state === "clean" ? <Button action="upload" variant="outline" disabled={busy} aria-label={"Ajouter une version de " + document.filename} title="Ajouter une version" onClick={resume}>Ajouter une version</Button> : null}{writable && (!latest || latest.state === "awaiting_upload") ? <Button action="upload" variant="outline" disabled={busy} aria-label={"Reprendre le transfert de " + document.filename} title="Reprendre le transfert" onClick={resume}>Reprendre le transfert</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" variant="outline" disabled={busy} aria-label={"Réessayer l’analyse de " + document.filename} title="Réessayer l’analyse" onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button action="archive" ref={archiveButton} variant="destructive" disabled={busy} aria-label={`Archiver ${document.filename}`} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div>
    {busy ? <p role="status">Opération sur le fichier en cours…</p> : null}
    {preview ? <div className="grid min-w-0 justify-items-start gap-4"><Image src={preview} alt={`Aperçu du fichier ${document.filename}`} width={640} height={480} unoptimized className="h-auto max-h-96 w-auto max-w-full object-contain" /><Button action="close" variant="outline" onClick={() => { setPreview(undefined); if (url.current) URL.revokeObjectURL(url.current); url.current = undefined; previewButton.current?.focus(); }}>Fermer l’aperçu</Button></div> : null}
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (archived.current) returnFocus(); else archiveButton.current?.focus(); }}><AlertDialogTitle>Archiver cette pièce jointe ?</AlertDialogTitle><AlertDialogDescription>Le fichier ne sera plus proposé au téléchargement. Ses versions et son historique seront conservés.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}
