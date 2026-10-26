"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
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
import { documentSchema, documentsSchema, maxFileBytes, mimeTypes, newDocumentSchema, type ParentKind, type ProtectedDocument } from "./contracts";
import { downloadBytes, requestFilePermit, uploadBytes } from "./transfers";

export function FilePanel({ parentKind, parentId, writable }: { parentKind: ParentKind; parentId: string; writable: boolean }) {
  return <FilePanelBody key={`${parentKind}:${parentId}`} parentKind={parentKind} parentId={parentId} writable={writable} />;
}

function FilePanelBody({ parentKind, parentId, writable }: { parentKind: ParentKind; parentId: string; writable: boolean }) {
  const inSheet = useInSheet();
  const inventoryParent = parentKind === "property" || parentKind === "development";
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${parentId}&purpose=attachment&page=${page}&page_size=20`, documentsSchema);
  const [file, setFile] = useState<File>();
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
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
  const attempt = useRef({ key: "", documentId: "" });
  const locked = useRef(false);
  const pending = Boolean(query.value?.items.some(item => item.versions.some(version => version.state === "pending_scan")));
  const refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  useEffect(() => () => abort.current?.abort(), []);
  async function upload() {
    if (locked.current || !file || !writable) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    const metadata = { parent_kind: parentKind, parent_id: parentId, filename: file.name, mime_type: file.type, size_bytes: file.size };
    if (!newDocumentSchema.safeParse(metadata).success || mimeTypes[extension] !== file.type || (inventoryParent && file.type.startsWith("image/"))) { setError(new ApiError(file.size > maxFileBytes ? "FILE_TOO_LARGE" : inventoryParent ? "PROPERTY_PHOTO_WEBP_REQUIRED" : "UNSUPPORTED_MEDIA_TYPE", 422)); return; }
    if (resume && (resume.filename !== file.name || resume.mime_type !== file.type || resume.size_bytes !== file.size)) { setError(new ApiError("FILE_SIZE_MISMATCH", 422)); return; }
    locked.current = true; setBusy(true); setError(undefined); setNotice(""); setProgress(0);
    const controller = new AbortController(); abort.current = controller;
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    try {
      let document: ProtectedDocument;
      const existingId = resume?.id ?? attempt.current.documentId;
      if (existingId) document = await apiGet(`/api/v1/documents/${existingId}`, documentSchema, controller.signal);
      else {
        document = await apiCommand("/api/v1/documents", metadata, documentSchema, attempt.current.key);
        attempt.current.documentId = document.id;
      }
      if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      const permit = await requestFilePermit({ action: "upload", document_id: document.id, expected_version: document.version });
      await uploadBytes(permit, file, setProgress, controller.signal);
      setNotice("Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.");
      setFile(undefined); setResume(undefined); attempt.current = { key: "", documentId: "" };
      if (fileInput.current) fileInput.current.value = "";
      setUploadOpen(false);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); }
    finally { locked.current = false; setBusy(false); setProgress(undefined); abort.current = null; if (controller.signal.aborted) heading.current?.focus(); refresh(); }
  }
  function closeUpload() {
    if (busy) return;
    guard.request(() => { setUploadOpen(false); setFile(undefined); setResume(undefined); setError(undefined); attempt.current = { key: "", documentId: "" }; if (fileInput.current) fileInput.current.value = ""; }, window.document.getElementById(uploadId) ?? window.document);
  }
  function showUpload(document?: ProtectedDocument) {
    if (busy || !writable) return;
    uploadTrigger.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    setResume(document); setFile(undefined); setError(undefined); setNotice(""); attempt.current = { key: "", documentId: "" }; setUploadOpen(true);
  }
  return <section aria-label="Pièces jointes" className="kay-record-section kay-file-panel" data-in-sheet={inSheet}>
    <header className="kay-section-head"><h2 ref={heading} tabIndex={-1}>Pièces jointes</h2>{writable ? <Button action="upload" ref={chooser} variant="outline" disabled={!hydrated || busy} onClick={() => showUpload()}>Ajouter un document</Button> : null}</header>
    <p className="kay-section-description">{parentKind === "contact" || parentKind === "deal" ? "Documents privés liés au contact, accessibles selon vos droits." : "Documents partagés avec l’équipe. Les justificatifs privés restent sur la fiche du contact."}</p>
    {query.error ? <RecordError error={query.error} retry={refresh} /> : <>
      {!writable ? <p className="text-sm text-muted-foreground">{parentKind === "deal" || parentKind === "contact" ? "Documents en lecture seule dans l’état actuel du dossier." : "Les pièces jointes sont gérées par les responsables."}</p> : null}
      {notice ? <p role="status" className="text-info">{notice}</p> : null}
      {!query.value ? <p role="status">Chargement des pièces jointes…</p> : query.value.items.length ? <div className="kay-file-collection"><div className="kay-file-columns" aria-hidden="true"><span>Document</span><span title="Historique récent renvoyé par le serveur">Versions récentes</span><span>Taille</span><span>Actions</span></div><ul className="kay-file-list">{query.value.items.map(document => <FileRow key={document.id + ":" + document.version} document={document} writable={writable && !busy} refresh={refresh} returnFocus={() => heading.current?.focus()} resume={() => showUpload(document)} />)}</ul></div> : <p className="text-sm text-muted-foreground">Aucune pièce jointe sur cette page.{writable ? " Ajoutez un document pour commencer." : ""}</p>}
      {query.value && (query.value.has_previous || query.value.has_next) ? <NumberedPages label="Pages des pièces jointes" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}
    </>}
    <Sheet open={uploadOpen} onOpenChange={open => { if (!open) closeUpload(); }}><SheetContent id={uploadId} className="kay-record-drawer kay-document-uploader" closeLabel="Fermer l’ajout de document" onOpenAutoFocus={event => { event.preventDefault(); browse.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); const target = uploadTrigger.current; if (target?.isConnected) target.focus(); else chooser.current?.focus(); }}>
      <SheetHeader className="kay-drawer-head"><SheetTitle>{resume ? resume.versions[0]?.state === "clean" ? "Ajouter une version" : "Reprendre le transfert" : "Ajouter un document"}</SheetTitle><SheetDescription>Le fichier sera disponible après son analyse antivirus.</SheetDescription></SheetHeader>
      <form className="kay-document-upload" data-live-dirty={file ? "true" : undefined} aria-busy={busy} onSubmit={event => { event.preventDefault(); void upload(); }}>
        <div className="kay-drawer-body">
          {resume ? <div className="kay-upload-context"><FileIcon size={20} aria-hidden="true" /><div><span>Document concerné</span><strong>{resume.filename}</strong><small>Conservez le même nom, format et nombre d’octets ({new Intl.NumberFormat("fr-MA").format(resume.size_bytes)}).</small></div></div> : null}
          <FilePicker id={inputId} label={resume ? "Fichier à envoyer à nouveau" : "Fichier"} accept={inventoryParent ? ".pdf,.docx,.xlsx" : ".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"} inputRef={fileInput} browseRef={browse} selected={file} disabled={!hydrated || busy || !writable} description={inventoryParent ? "PDF, DOCX ou XLSX sans macro · 20 Mo maximum. Les images s’ajoutent dans Photos." : "JPEG, PNG, WebP, PDF, DOCX ou XLSX sans macro · 20 Mo maximum (20 971 520 octets)."} choose={selected => { setFile(selected); setError(undefined); setNotice(""); attempt.current = { key: "", documentId: "" }; }} />
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
