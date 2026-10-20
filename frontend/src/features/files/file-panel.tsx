"use client";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { EmptyFolderIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${parentId}&purpose=attachment&page=${page}&page_size=20`, documentsSchema);
  const [file, setFile] = useState<File>();
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const chooser = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const abort = useRef<AbortController | null>(null);
  const attempt = useRef({ key: "", documentId: "" });
  const locked = useRef(false);
  const pending = Boolean(query.value?.items.some(item => item.versions.some(version => version.state === "pending_scan")));
  const refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  useEffect(() => () => abort.current?.abort(), []);
  async function upload() {
    if (locked.current || !file) return;
    const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
    const metadata = { parent_kind: parentKind, parent_id: parentId, filename: file.name, mime_type: file.type, size_bytes: file.size };
    if (!newDocumentSchema.safeParse(metadata).success || mimeTypes[extension] !== file.type || (parentKind === "property" && file.type.startsWith("image/"))) { setError(new ApiError(file.size > maxFileBytes ? "FILE_TOO_LARGE" : parentKind === "property" ? "PROPERTY_PHOTO_WEBP_REQUIRED" : "UNSUPPORTED_MEDIA_TYPE", 422)); return; }
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
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); }
    finally { locked.current = false; setBusy(false); setProgress(undefined); abort.current = null; if (controller.signal.aborted) heading.current?.focus(); refresh(); }
  }
  return <section aria-label="Pièces jointes" className="grid min-w-0 gap-6 border-t pt-6">
    <div className="grid gap-2"><h2 ref={heading} tabIndex={-1} className="flex items-center gap-3 text-section font-medium"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-info-background text-info"><EmptyFolderIcon aria-hidden="true" className="size-4" /></span>Pièces jointes</h2><p className="max-w-reading text-sm text-muted-foreground">{parentKind === "contact" || parentKind === "deal" ? "Documents privés liés au contact. Seules les personnes autorisées peuvent les consulter." : "Fichiers partagés avec l’équipe. Les justificatifs privés des propriétaires et promoteurs restent sur leurs fiches Contacts."}</p></div>
    {query.error ? <RecordError error={query.error} retry={refresh} /> : <>
    {writable ? <form className="grid min-w-0 max-w-reading gap-4" onSubmit={event => { event.preventDefault(); void upload(); }}>
      <fieldset disabled={!hydrated || busy} className="relative grid min-w-0 gap-2"><Label htmlFor={inputId}>{resume ? "Sélectionner à nouveau le fichier" : "Fichier à ajouter"}</Label><Input ref={fileInput} id={inputId} type="file" tabIndex={-1} className="sr-only left-0 top-0 h-px w-px border-0 p-0" accept={parentKind === "property" ? ".pdf,.docx,.xlsx" : ".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"} aria-describedby={`${inputId}-help`} onChange={event => { setFile(event.target.files?.[0]); setError(undefined); setNotice(""); attempt.current = { key: "", documentId: "" }; }} /><Button action="file" ref={chooser} type="button" variant="outline" className="justify-self-start" aria-describedby={`${inputId}-selection ${inputId}-help`} onClick={() => fileInput.current?.click()}>Choisir un fichier</Button><p id={`${inputId}-selection`} className="wrap-anywhere text-sm" aria-live="polite">{file?.name ?? "Aucun fichier sélectionné"}</p><p id={`${inputId}-help`} className="text-sm text-muted-foreground">{parentKind === "property" ? "PDF, DOCX ou XLSX sans macro. Les images s’ajoutent dans Photos. 20 Mo maximum." : "JPEG, PNG, WebP, PDF, DOCX ou XLSX sans macro. 20 Mo maximum (20 971 520 octets)."}</p>{resume ? <p className="wrap-anywhere">Reprise de {resume.filename}. Conservez le même nom, format et nombre d’octets.</p> : null}</fieldset>
      <div className="flex flex-wrap gap-2"><Button action="upload" type="submit" disabled={!hydrated || busy || !file}>{busy ? "Transfert en cours…" : error ? "Réessayer le transfert" : "Envoyer le fichier"}</Button>{busy ? <Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button> : resume ? <Button action="cancel" type="button" variant="outline" onClick={() => { setResume(undefined); setFile(undefined); attempt.current = { key: "", documentId: "" }; if (fileInput.current) fileInput.current.value = ""; }}>Annuler la reprise</Button> : null}</div>
    </form> : <p className="text-sm text-muted-foreground">{parentKind === "deal" ? "Pièces jointes en lecture seule pour l’état actuel de l’affaire ou du contact." : parentKind === "contact" ? "Contact archivé : les documents ne peuvent pas être modifiés tant que le contact n’est pas restauré." : "Lecture seule : les pièces jointes d’inventaire sont gérées par les responsables."}</p>}
    {progress !== undefined ? <p role="status">Transfert : {progress} %. L’analyse antivirus n’est pas encore terminée.</p> : null}
    {error ? <p role="alert" className="text-danger">{error.message}</p> : null}{notice ? <p role="status" className="text-info">{notice}</p> : null}
    {!query.value ? <p role="status">Chargement des pièces jointes…</p> : query.value.items.length ? <ul className="grid min-w-0 gap-6">{query.value.items.map(document => <FileRow key={`${document.id}:${document.version}`} document={document} writable={writable && !busy} refresh={refresh} returnFocus={() => heading.current?.focus()} resume={() => { setResume(document); setFile(undefined); setError(undefined); attempt.current = { key: "", documentId: "" }; chooser.current?.focus(); }} />)}</ul> : <p>Aucune pièce jointe sur cette page.{writable ? " Ajoutez un fichier pour commencer." : ""}</p>}
    {query.value ? <NumberedPages label="Pages des pièces jointes" page={page} total={query.value.total} size={20} change={setPage} /> : null}
    </>}
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
  return <li className="grid min-w-0 gap-4 border-b pb-6">
    <div className="grid min-w-0 gap-2"><h3 className="wrap-anywhere font-medium">{document.filename}</h3><p className="text-sm text-muted-foreground">{new Intl.NumberFormat("fr-MA").format(document.size_bytes)} octets</p><ProtectedFileState version={latest} /></div>
    {error ? <p role="alert" className="text-danger">{error.message}</p> : null}
    <div className="flex flex-wrap gap-2"><Button action="download" variant="outline" disabled={busy || !clean} aria-label={`Télécharger ${document.filename}`} onClick={() => void open()}>Télécharger{clean && latest?.id !== clean.id ? " la version précédente" : ""}</Button>{document.mime_type.startsWith("image/") && clean ? <Button action="preview" ref={previewButton} variant="outline" disabled={busy} aria-label={`Afficher ${document.filename}`} onClick={() => void open(true)}>Afficher l’image</Button> : null}{writable && (!latest || latest.state === "awaiting_upload") ? <Button action="upload" variant="outline" disabled={busy} onClick={resume}>Reprendre le transfert</Button> : null}{writable && latest?.state === "pending_scan" && latest.scan_error ? <Button action="retry" variant="outline" disabled={busy} onClick={() => void command("retry-scan")}>Réessayer l’analyse</Button> : null}{writable ? <Button action="archive" ref={archiveButton} variant="destructive" disabled={busy} aria-label={`Archiver ${document.filename}`} onClick={() => setConfirm(true)}>Archiver</Button> : null}</div>
    {busy ? <p role="status">Opération sur le fichier en cours…</p> : null}
    {preview ? <div className="grid min-w-0 justify-items-start gap-4"><Image src={preview} alt={`Aperçu du fichier ${document.filename}`} width={640} height={480} unoptimized className="h-auto max-h-96 w-auto max-w-full object-contain" /><Button action="close" variant="outline" onClick={() => { setPreview(undefined); if (url.current) URL.revokeObjectURL(url.current); url.current = undefined; previewButton.current?.focus(); }}>Fermer l’aperçu</Button></div> : null}
    <AlertDialog open={confirm} onOpenChange={open => { if (!busy) setConfirm(open); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (archived.current) returnFocus(); else archiveButton.current?.focus(); }}><AlertDialogTitle>Archiver cette pièce jointe ?</AlertDialogTitle><AlertDialogDescription>Le fichier ne sera plus proposé au téléchargement. Ses versions et son historique seront conservés.</AlertDialogDescription><div className="flex flex-wrap gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline" disabled={busy}>Annuler</Button></AlertDialogCancel><Button action="archive" variant="destructive" disabled={busy} onClick={() => void command("archive")}>Confirmer l’archivage</Button></div>{error ? <p role="alert" className="text-danger">{error.message}</p> : null}</AlertDialogContent></AlertDialog>
  </li>;
}
