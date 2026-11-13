"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { FileIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, useInSheet } from "@/components/ui/sheet";
import { FilePicker } from "@/components/shared/file-picker";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { RecordError } from "@/features/contacts/record-states";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { meSchema } from "@/lib/auth/contracts";
import { documentSchema, documentsSchema, identityCardMimeTypes, maxFileBytes, mimeTypes, newDocumentSchema, type ParentKind, type ProtectedDocument } from "./contracts";
import { requestFilePermit, uploadBytes } from "./transfers";
import { FileRow } from "./file-row";
import { convertPropertyPhoto, isHeifSource, photoAccept } from "./photo-conversion";

type UploadAttempt = { key: string; documentId: string; file?: File; prepared?: File; metadata?: ReturnType<typeof newDocumentSchema.parse>; minimum: number; permitVersion?: string; actor?: { id: string; role: string } };
const attachmentBatchLimit = 10;
const emptyUploadAttempt = (): UploadAttempt => ({ key: "", documentId: "", minimum: 0 });
type UploadBinding = { actorId?: string; role?: ReturnType<typeof meSchema.parse>["user"]["role"] };

type FilePanelProps = { parentKind: ParentKind; parentId: string; writable: boolean; purpose?: "attachment" | "identity_card" } & UploadBinding;

export function FilePanel(props: FilePanelProps) {
  const { parentKind, parentId, actorId, role, purpose } = props;
  return <FilePanelBody key={`${parentKind}:${parentId}:${purpose ?? "attachment"}:${actorId ?? ""}:${role ?? ""}`} {...props} />;
}

function FilePanelBody({ parentKind, parentId, writable, actorId, role, purpose = "attachment" }: FilePanelProps) {
  const inSheet = useInSheet();
  const identityCard = purpose === "identity_card";
  const title = identityCard ? "Carte nationale d’identité" : "Pièces jointes";
  const addLabel = identityCard ? "Ajouter une copie" : "Ajouter un document";
  const inventoryParent = parentKind === "property" || parentKind === "development";
  const hydrated = useHydrated();
  const [page, setPage] = useState(1);
  const query = useQuery(`/api/v1/documents?parent_kind=${parentKind}&parent_id=${parentId}&purpose=${purpose}&page=${page}&page_size=20`, documentsSchema);
  const [loaded, setLoaded] = useState<ReturnType<typeof documentsSchema.parse>>(), [protectedRows, setProtectedRows] = useState(() => new Map<string, ProtectedDocument>());
  const rowOwnership = useRef(protectedRows), scope = useRef<HTMLElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const file = files[0];
  const [resume, setResume] = useState<ProtectedDocument>();
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState<ApiError>();
  const [scopeDenial, setScopeDenial] = useState<ApiError>();
  const deniedRead = Boolean(query.error && [401, 403, 404].includes(query.error.status));
  if (deniedRead && loaded) setLoaded(undefined);
  if (deniedRead && protectedRows.size) setProtectedRows(new Map());
  if (query.value && !query.error && !scopeDenial && query.value.page === page && loaded !== query.value) setLoaded(query.value);
  const list = query.value && !query.error ? query.value : loaded?.page === page ? loaded : undefined;
  const rows = new Map(list?.items.map(document => [document.id, document])); protectedRows.forEach((document, id) => { if (!rows.has(id)) rows.set(id, document); });

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
  const pending = !query.error && Boolean(query.value?.items.some(item => item.versions.some(version => version.state === "pending_scan")));
  const refresh = query.refreshQuietly;
  useEffect(() => { if (!pending) return; const timer = setInterval(refresh, 2000); return () => clearInterval(timer); }, [pending, refresh]);
  useLayoutEffect(() => { available.current = writable && !deniedRead; if (!available.current) { abort.current?.abort(); attempt.current = emptyUploadAttempt(); setFiles([]); setResume(undefined); setUploadOpen(false); setBusy(false); setRecovering(false); setProgress(undefined); } if (deniedRead) rowOwnership.current = new Map(); }, [writable, deniedRead]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); attempt.current = emptyUploadAttempt(); }; }, []);
  function chooseFiles(selected: File[]) {
    if (!alive.current || !available.current || locked.current || attempt.current.file) return;
    if (selected.length > attachmentBatchLimit) {
      setFiles([]); setError(new ApiError("FILE_BATCH_LIMIT", 422)); return;
    }
    setFiles(selected); setError(undefined); setNotice("");
  }
  async function upload() {
    if (!hydrated || !alive.current || locked.current || !files.length || !available.current) return;
    locked.current = true; setBusy(true); setError(undefined); setNotice("");
    const controller = new AbortController(); abort.current = controller;
    let owned = attempt.current;
    const current = () => alive.current && available.current && attempt.current === owned;
    const check = () => { if (!current()) return false; if (controller.signal.aborted) throw new ApiError("FILE_TRANSFER_INTERRUPTED", 503); return true; };
    function authorize(identity: ReturnType<typeof meSchema.parse>) { if (!current() || identity.must_change_password || actorId && identity.user.id !== actorId || role && identity.user.role !== role || inventoryParent && identity.user.role === "agent" || owned.actor && (identity.user.id !== owned.actor.id || identity.user.role !== owned.actor.role)) throw new ApiError("FORBIDDEN", 403); owned.actor ??= { id: identity.user.id, role: identity.user.role }; }
    try {
      for (const [index, selected] of files.entries()) {
        if (!check()) return;
        setProgress(0);
        if (!owned.file) {
          owned = { key: crypto.randomUUID(), documentId: resume?.id ?? "", minimum: resume?.version ?? 0, file: selected };
          attempt.current = owned;
        }
        const bytes = owned.prepared ?? (!inventoryParent && isHeifSource(selected) ? await convertPropertyPhoto(selected, controller.signal) : selected);
        if (!check()) return;
        owned.prepared = bytes;
        const extension = bytes.name.split(".").at(-1)?.toLowerCase() ?? "";
        const mime = bytes.type || mimeTypes[extension];
        const metadata = owned.metadata ?? { parent_kind: parentKind, parent_id: parentId, filename: bytes.name, mime_type: mime, size_bytes: bytes.size, ...(identityCard ? { purpose } : {}) };
        if (!newDocumentSchema.safeParse(metadata).success || mimeTypes[extension] !== mime || (inventoryParent && mime.startsWith("image/")) || (identityCard && !identityCardMimeTypes.has(mime))) {
          throw new ApiError(bytes.size > maxFileBytes ? "FILE_TOO_LARGE" : inventoryParent ? "PROPERTY_PHOTO_WEBP_REQUIRED" : "UNSUPPORTED_MEDIA_TYPE", 422);
        }
        if (resume && (resume.filename !== bytes.name || resume.mime_type !== mime || resume.size_bytes !== bytes.size)) throw new ApiError("FILE_SIZE_MISMATCH", 422);
        owned.metadata = newDocumentSchema.parse(metadata);
        function validate(value: ProtectedDocument, id?: string) { if (id && value.id !== id) throw new ApiError("NOT_FOUND", 404); if (value.archived || value.can_upload === false) throw new ApiError("FORBIDDEN", 403); if (value.filename !== metadata.filename || value.mime_type !== metadata.mime_type || value.size_bytes !== metadata.size_bytes || value.purpose !== purpose || value.version < owned.minimum) throw new ApiError("INVALID_RESPONSE", 503); owned.minimum = value.version; return value; }
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
          const uploadFile = bytes.type ? bytes : new File([bytes], bytes.name, { type: mime, lastModified: bytes.lastModified });
          await uploadBytes(permit, uploadFile, value => { if (current() && !controller.signal.aborted) setProgress(value); }, controller.signal);
        }
        if (!check()) return;
        setNotice(previous && previous.state !== "awaiting_upload" ? "Le transfert est enregistré. Consultez le résultat de l’analyse dans la liste." : "Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.");
        setFiles(files.slice(index + 1)); setResume(undefined); setRecovering(false);
        owned = emptyUploadAttempt(); attempt.current = owned;
      }
      if (fileInput.current) fileInput.current.value = "";
      setUploadOpen(false);
    } catch (reason) {
      if (!current()) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      setError(failure);
      if ([401, 403, 404].includes(failure.status)) {
        available.current = false; setScopeDenial(failure); setFiles([]); setResume(undefined); setUploadOpen(false); attempt.current = emptyUploadAttempt(); setRecovering(false);
      } else {
        const uncertain = Boolean(owned.metadata && (owned.documentId || failure.status >= 500));
        setRecovering(uncertain);
        if (!uncertain) attempt.current = emptyUploadAttempt();
      }
    } finally {
      locked.current = false;
      if (alive.current) {
        setBusy(false); setProgress(undefined);
        if (abort.current === controller) abort.current = null;
        if (available.current && controller.signal.aborted) heading.current?.focus();
        if (available.current) refresh();
      }
    }
  }
  function closeUpload() {
    if (busy) return;
    guard.request(() => { if (!alive.current || locked.current) return; setUploadOpen(false); setFiles([]); setResume(undefined); setError(undefined); setRecovering(false); attempt.current = emptyUploadAttempt(); if (fileInput.current) fileInput.current.value = ""; }, window.document.getElementById(uploadId) ?? window.document);
  }
  function showUpload(document?: ProtectedDocument) {
    if (!alive.current || locked.current || busy || recovering || rowOwnership.current.size || attempt.current.file || !available.current) return;
    uploadTrigger.current = window.document.activeElement instanceof HTMLElement ? window.document.activeElement : null;
    setResume(document); setFiles([]); setError(undefined); setNotice(""); attempt.current = emptyUploadAttempt(); setUploadOpen(true);
  }
  function rowOwned(active: boolean, document: ProtectedDocument) { if (!alive.current) return; const previous = rowOwnership.current.get(document.id); if (active && previous === document || !active && !previous || active && previous && previous.version > document.version) return; const next = new Map(rowOwnership.current); if (active) next.set(document.id, document); else next.delete(document.id); rowOwnership.current = next; setProtectedRows(next); }
  function rowDenied(error: ApiError, acknowledged: boolean) { if (!alive.current) return; available.current = false; abort.current?.abort(); attempt.current = emptyUploadAttempt(); setFiles([]); setResume(undefined); setUploadOpen(false); setLoaded(undefined); setScopeDenial(error); setNotice(acknowledged ? "L’opération est enregistrée. Les droits d’accès ont changé." : ""); rowOwnership.current = new Map(); setProtectedRows(rowOwnership.current); }
  if (scopeDenial) return <>{notice ? <p role="status">{notice}</p> : null}<RecordError error={scopeDenial} /></>;
  return <section ref={scope} aria-label={title} className="kay-record-section kay-file-panel" data-in-sheet={inSheet}>
    <header className="kay-section-head"><h2 ref={heading} tabIndex={-1}>{title}</h2>{writable && !deniedRead ? <Button action="upload" ref={chooser} variant="outline" disabled={!hydrated || busy || recovering || protectedRows.size > 0} onClick={() => showUpload()}>{addLabel}</Button> : null}</header>
    <p className="kay-section-description">{identityCard ? "Copies privées de la carte, accessibles selon les droits du contact." : parentKind === "contact" || parentKind === "deal" ? "Documents privés liés au contact, accessibles selon vos droits." : "Documents partagés avec l’équipe. Les justificatifs privés restent sur la fiche du contact."}</p>
    {query.error ? <RecordError error={query.error} retry={refresh} /> : null}{!deniedRead ? <>
      {!writable ? <p className="text-sm text-muted-foreground">{parentKind === "deal" || parentKind === "contact" ? "Documents en lecture seule dans l’état actuel du dossier." : "Les pièces jointes sont gérées par les responsables."}</p> : null}
      {notice ? <p role="status" className="text-info">{notice}</p> : null}
      {!list ? <p role="status">Chargement des pièces jointes…</p> : rows.size ? <div className="kay-file-collection"><div className="kay-file-columns" aria-hidden="true"><span>Document</span><span title="Historique récent renvoyé par le serveur">Versions récentes</span><span>Taille</span><span>Actions</span></div><ul className="kay-file-list">{[...rows.values()].map(document => <FileRow key={document.id} document={document} actorId={actorId} role={role} readable={Boolean(!query.error && query.value?.items.some(row => row.id === document.id))} writable={writable && !busy && !recovering} owned={rowOwned} denied={rowDenied} refresh={refresh} returnFocus={() => heading.current?.focus()} resume={() => showUpload(document)} />)}</ul></div> : <p className="text-sm text-muted-foreground">{identityCard ? "Aucune copie enregistrée." : <>Aucune pièce jointe sur cette page.{writable ? " Ajoutez un document pour commencer." : ""}</>}</p>}
      {list && (list.has_previous || list.has_next) ? <NumberedPages label="Pages des pièces jointes" page={page} total={list.total} size={list.page_size} change={next => guard.request(() => { rowOwnership.current = new Map(); setProtectedRows(rowOwnership.current); setPage(next); }, scope.current ?? undefined)} /> : null}
    </> : null}
    <Sheet open={uploadOpen} onOpenChange={open => { if (!open) closeUpload(); }}><SheetContent id={uploadId} className="kay-record-drawer kay-document-uploader" closeLabel="Fermer l’ajout de document" onOpenAutoFocus={event => { event.preventDefault(); browse.current?.focus(); }} onCloseAutoFocus={event => { event.preventDefault(); const target = uploadTrigger.current; if (target?.isConnected) target.focus(); else chooser.current?.focus(); }}>
      <SheetHeader className="kay-drawer-head"><SheetTitle>{resume ? resume.versions[0]?.state === "clean" ? "Ajouter une version" : "Reprendre le transfert" : addLabel}</SheetTitle><SheetDescription>Le fichier sera disponible après son analyse antivirus.</SheetDescription></SheetHeader>
      <form className="kay-document-upload" data-draft-managed data-write-recovery={recovering || undefined} data-live-dirty={file || recovering ? "true" : undefined} aria-busy={busy} onSubmit={event => { event.preventDefault(); void upload(); }}>
        <div className="kay-drawer-body">
          {resume ? <div className="kay-upload-context"><FileIcon size={20} aria-hidden="true" /><div><span>Document concerné</span><strong>{resume.filename}</strong><small>Conservez le même nom, format et nombre d’octets ({new Intl.NumberFormat("fr-MA").format(resume.size_bytes)}).</small></div></div> : null}
          <FilePicker id={inputId} label={resume ? "Fichier à envoyer à nouveau" : "Fichier"} accept={inventoryParent ? ".pdf,.docx,.xlsx" : identityCard ? `${photoAccept},.pdf` : `${photoAccept},.pdf,.docx,.xlsx`} inputRef={fileInput} browseRef={browse} selected={file} selection={files} chooseFiles={inventoryParent || resume ? undefined : chooseFiles} disabled={!hydrated || busy || recovering || !writable} description={inventoryParent ? "PDF, DOCX ou XLSX sans macro · 20 Mo maximum. Les images s’ajoutent dans Photos." : identityCard ? "JPEG, PNG, WebP, HEIC, HEIF ou PDF · 20 Mo par fichier." : "JPEG, PNG, WebP, HEIC, HEIF, PDF, DOCX ou XLSX sans macro · 20 Mo par fichier."} choose={selected => chooseFiles(selected ? [selected] : [])} />
          {progress !== undefined ? <div className="kay-upload-progress" role="status"><progress max={100} value={progress} aria-label="Progression du transfert" /><p>Transfert : {progress} %. Analyse antivirus à suivre.</p></div> : null}
          {error ? <p role="alert" className="text-sm text-danger">{error.message}</p> : null}
        </div>
        <footer className="kay-upload-footer">{busy ? <Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button> : <Button action="cancel" type="button" variant="outline" onClick={closeUpload}>Annuler</Button>}<Button action="upload" type="submit" disabled={!hydrated || busy || !file || !writable}>{busy ? "Transfert…" : error ? "Réessayer" : files.length > 1 ? "Envoyer les fichiers" : "Envoyer le fichier"}</Button></footer>
      </form>
    </SheetContent></Sheet>{guard.dialog}
  </section>;
}
