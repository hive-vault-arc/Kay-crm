"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FilePicker } from "@/components/shared/file-picker";
import { RecordSection } from "@/components/shared/record-workspace";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { AgentPicker } from "@/features/contacts/agent-picker";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { ApiError } from "@/lib/api/client";
import { useHydrated } from "@/hooks/use-hydrated";
import { importCommand, uploadImport, type ImportUploadAttempt } from "./client";
import { batchSchema, createSchema, csvHeaders, type Batch } from "./contracts";
import { BatchReview } from "./batch-review";

export function ImportPanel({ role, batchId }: { role: StaffRole; batchId?: string }) {
  return role === "agent" ? <RecordError error={new ApiError("FORBIDDEN", 403)} /> : <ImportComposer key={batchId ?? "new"} batchId={batchId} />;
}

function ImportComposer({ batchId }: { batchId?: string }) {
  const router = useRouter(), hydrated = useHydrated(), guard = useUnsavedGuard();
  const [selected, setSelected] = useState(batchId), [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File>(), [fallback, setFallback] = useState("");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const [resumeTarget, setResumeTarget] = useState<Pick<Batch, "id" | "filename" | "size_bytes">>(), [unknownMetadata, setUnknownMetadata] = useState(false);
  const input = useRef<HTMLInputElement>(null), chooser = useRef<HTMLButtonElement>(null), reviewRoot = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null), lock = useRef(false), reviewBlocked = useRef(false), mounted = useRef(true);
  const metadataLocked = useRef(false), resumeSelection = useRef<typeof resumeTarget>(undefined), attempt = useRef<ImportUploadAttempt>({ key: "", batchId: "" });
  const draft = useDossierDraft({ file: file ? { name: file.name, size: file.size, modified: file.lastModified } : null, fallback, resumeId: resumeTarget?.id }, busy || unknownMetadata);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); attempt.current = { key: "", batchId: "" }; resumeSelection.current = undefined; }; }, []);
  useEffect(() => { if (resumeTarget) chooser.current?.focus(); }, [resumeTarget]);
  const blockedChanged = useCallback((value: boolean) => { if (mounted.current) { reviewBlocked.current = value; setBlocked(value); } }, []);
  const uploadLocked = useCallback(() => lock.current || metadataLocked.current, []);
  const authorityDenied = useCallback((failure: ApiError) => {
    if (!mounted.current) return;
    abort.current?.abort(); metadataLocked.current = false; setUnknownMetadata(false); resumeSelection.current = undefined; setResumeTarget(undefined);
    setDenied(failure); setFile(undefined); setFallback(""); setError(undefined); attempt.current = { key: "", batchId: "" };
    if (input.current) input.current.value = "";
    reviewBlocked.current = false; setBlocked(false);
  }, []);
  function choose(value?: File) {
    if (!mounted.current || lock.current || metadataLocked.current || reviewBlocked.current) return;
    const target = resumeSelection.current;
    if (value && target && (value.name !== target.filename || value.size !== target.size_bytes)) {
      setError(new ApiError("IMPORT_FILE_INVALID", 422)); if (input.current) input.current.value = ""; return;
    }
    setFile(value); attempt.current = { key: "", batchId: target?.id ?? "" }; setError(undefined); setProgress(0);
  }
  function changeFallback(value: string) { if (mounted.current && !lock.current && !metadataLocked.current && !reviewBlocked.current) setFallback(value); }
  function resume(value: Batch) {
    if (!mounted.current || lock.current || metadataLocked.current || reviewBlocked.current || !["awaiting_upload", "uploading"].includes(value.state) || value.id !== selected) return;
    resumeSelection.current = { id: value.id, filename: value.filename, size_bytes: value.size_bytes }; setResumeTarget(resumeSelection.current);
    setFile(undefined); setFallback(value.fallback_agent_id ?? ""); setError(undefined); setProgress(0); attempt.current = { key: "", batchId: value.id };
    if (input.current) input.current.value = "";
  }
  function stopResume() {
    if (!mounted.current || lock.current || metadataLocked.current || reviewBlocked.current) return;
    resumeSelection.current = undefined; setResumeTarget(undefined); setFile(undefined); setFallback(""); setError(undefined); attempt.current = { key: "", batchId: "" };
    if (input.current) input.current.value = "";
  }
  async function upload() {
    if (!mounted.current || !hydrated || lock.current || reviewBlocked.current || !file) return;
    if (!createSchema.safeParse({ filename: file.name, size_bytes: file.size }).success) { setError(new ApiError("IMPORT_FILE_INVALID", 422)); chooser.current?.focus(); return; }
    lock.current = true; setBusy(true); setProgress(0); setError(undefined);
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    const controller = new AbortController(); abort.current = controller;
    const initialFallback = fallback || null;
    try {
      const id = await uploadImport(file, attempt.current, value => { if (mounted.current && !controller.signal.aborted) setProgress(value); }, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      metadataLocked.current = false; setUnknownMetadata(false);
      const preview = await importCommand(`/api/v1/imports/${id}/preview`, { fallback_agent_id: initialFallback }, batchSchema, undefined, controller.signal, { binding: attempt.current });
      if (!mounted.current || controller.signal.aborted) return;
      if (preview.id !== id || preview.state !== "previewed") throw new ApiError("INVALID_RESPONSE", 502);
      setSelected(id); setRevision(value => value + 1); router.replace(`/leads?view=import&batch=${id}`, { scroll: false });
      setFile(undefined); setFallback(""); resumeSelection.current = undefined; setResumeTarget(undefined); draft.accept({ file: null, fallback: "", resumeId: undefined }); attempt.current = { key: "", batchId: "" };
      if (input.current) input.current.value = "";
    } catch (reason) {
      if (!mounted.current) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(failure.status)) { authorityDenied(failure); draft.accept({ file: null, fallback: "" }); }
      else {
        setError(failure);
        if (!attempt.current.batchId && attempt.current.metadataDispatched && (failure.status >= 500 || failure.code === "INVALID_RESPONSE")) { metadataLocked.current = true; setUnknownMetadata(true); }
        if (attempt.current.batchId) { const id = attempt.current.batchId; setSelected(id); setRevision(value => value + 1); router.replace(`/leads?view=import&batch=${id}`, { scroll: false }); }
      }
    } finally { lock.current = false; abort.current = null; if (mounted.current) setBusy(false); }
  }
  if (denied) return <RecordError error={denied} retry={() => { setDenied(undefined); setRevision(value => value + 1); draft.accept({ file: null, fallback: "" }); }} />;
  return <section aria-label="Import de contacts" className="grid min-w-0 gap-4">
    <Button action="back" asChild variant="outline" className="justify-self-start"><Link prefetch={false} href="/leads">Retour aux Prospects</Link></Button>
    <details open={!selected || Boolean(file) || Boolean(resumeTarget) || busy || undefined} className="kay-surface min-w-0">
      <summary hidden={!selected} className="min-h-control cursor-pointer px-5 py-3 text-sm font-medium">Envoyer un fichier corrigé</summary>
      <form data-draft-managed data-live-dirty={draft.dirty || undefined} aria-busy={busy || unknownMetadata} aria-label="Fichier CSV de contacts" className="p-4 sm:p-6" onSubmit={event => {
        event.preventDefault(); if (!mounted.current) return;
        // This original retry owns the child review lock; it does not discard another draft.
        if (metadataLocked.current) void upload();
        else if (reviewRoot.current) guard.request(() => void upload(), reviewRoot.current);
      }}>
        <RecordSection title={resumeTarget ? "Reprendre le transfert" : selected ? "Nouveau lot" : "Choisir le fichier"} description="Contacts uniquement : aucun Lead, bien ou affaire n’est créé. Un nouveau fichier conserve le lot précédent sans le modifier." action={<Button action={unknownMetadata ? "retry" : "upload"} type="submit" disabled={!hydrated || !file || busy || blocked}>{busy ? "Transfert et aperçu en cours…" : unknownMetadata ? "Réessayer le même fichier" : error ? "Réessayer le fichier" : "Envoyer et prévisualiser"}</Button>}>
          {resumeTarget ? <div className="grid min-w-0 gap-2"><p className="wrap-anywhere text-sm">Sélectionnez {resumeTarget.filename} ({resumeTarget.size_bytes} octets). La reprise utilise le lot existant, sans en créer un autre.</p><Button action="back" type="button" variant="quiet" disabled={busy || blocked || unknownMetadata} className="justify-self-start" onClick={stopResume}>Choisir un nouveau lot</Button></div> : null}
          <fieldset disabled={!hydrated || busy || blocked || unknownMetadata} className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
            <FilePicker id="import-csv" label="Fichier CSV" accept=".csv,text/csv" description="CSV UTF-8 · 20 Mo maximum · 50 000 lignes" selected={file} choose={choose} disabled={!hydrated || busy || blocked || unknownMetadata} inputRef={input} browseRef={chooser} />
            <div className="grid min-w-0 gap-4"><AgentPicker label={resumeTarget ? "Agent de remplacement du lot repris" : "Agent de remplacement du nouveau lot"} value={fallback} change={changeFallback} denied={authorityDenied} /><p className="text-sm text-muted-foreground">Pour les lignes sans agent_email uniquement. Vous pourrez aussi choisir un agent par ligne dans l’aperçu.</p>
              <details><summary className="min-h-control cursor-pointer py-3 text-sm font-medium">Format et colonnes du CSV</summary><div className="grid min-w-0 gap-3 text-sm text-muted-foreground"><p className="wrap-anywhere">En-tête exact : {csvHeaders}</p><p>UTF-8 (BOM accepté), séparateur virgule. Plusieurs valeurs : |. Entourez de guillemets les valeurs contenant une virgule ou un saut de ligne. Téléphones internationaux avec + et indicatif.</p><p>Rôles autorisés : buyer, seller, owner, tenant, developer. agent_email désigne un agent actif. Les numéros existants ignorent la ligne entière, sans modifier le contact connu.</p><p>20 Mo maximum (20 971 520 octets), 50 000 lignes hors en-tête. Les numéros désignent les enregistrements CSV, même si une note occupe plusieurs lignes de texte.</p></div></details>
            </div>
          </fieldset>
          {busy ? <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-sm">Transfert : {progress} %. Aucun contact n’est créé avant l’approbation.</p><Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button></div> : null}
          {blocked ? <p role="status" className="text-sm text-warning">Terminez ou vérifiez l’opération du lot actuel avant d’envoyer un autre fichier.</p> : null}
          {unknownMetadata ? <p role="alert" className="text-sm text-warning">La création du lot n’est pas confirmée. Réessayez le même fichier pour retrouver ce lot avant d’en choisir un autre.</p> : null}
          {error ? <RecordError error={error} /> : null}
        </RecordSection>
      </form>
    </details>
    <div ref={reviewRoot} className="min-w-0">{selected ? <BatchReview key={`${selected}:${revision}`} id={selected} uploadBusy={busy || unknownMetadata} uploadLocked={uploadLocked} resume={resume} blockedChanged={blockedChanged} authorityDenied={authorityDenied} /> : <p className="text-sm text-muted-foreground">Envoyez votre CSV pour examiner les lignes avant toute création.</p>}</div>
    {guard.dialog}
  </section>;
}
