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
import { importCommand, uploadImport } from "./client";
import { batchSchema, createSchema, csvHeaders } from "./contracts";
import { BatchReview } from "./batch-review";

export function ImportPanel({ role, batchId }: { role: StaffRole; batchId?: string }) {
  return role === "agent" ? <RecordError error={new ApiError("FORBIDDEN", 403)} /> : <ImportComposer batchId={batchId} />;
}

function ImportComposer({ batchId }: { batchId?: string }) {
  const router = useRouter(), hydrated = useHydrated(), guard = useUnsavedGuard();
  const [selected, setSelected] = useState(batchId), [revision, setRevision] = useState(0);
  const [file, setFile] = useState<File>(), [fallback, setFallback] = useState("");
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<ApiError>(), [denied, setDenied] = useState<ApiError>();
  const input = useRef<HTMLInputElement>(null), chooser = useRef<HTMLButtonElement>(null), reviewRoot = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null), lock = useRef(false), reviewBlocked = useRef(false), mounted = useRef(true);
  const attempt = useRef({ key: "", batchId: "" });
  const draft = useDossierDraft({ file: file ? { name: file.name, size: file.size, modified: file.lastModified } : null, fallback }, busy);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); }; }, []);
  const blockedChanged = useCallback((value: boolean) => { reviewBlocked.current = value; setBlocked(value); }, []);
  const authorityDenied = useCallback((failure: ApiError) => {
    setDenied(failure); setFile(undefined); setFallback(""); setError(undefined); attempt.current = { key: "", batchId: "" };
    if (input.current) input.current.value = "";
    reviewBlocked.current = false; setBlocked(false);
  }, []);
  function choose(value?: File) {
    if (lock.current || reviewBlocked.current) return;
    setFile(value); attempt.current = { key: "", batchId: "" }; setError(undefined); setProgress(0);
  }
  async function upload() {
    if (lock.current || reviewBlocked.current || !file) return;
    if (!createSchema.safeParse({ filename: file.name, size_bytes: file.size }).success) { setError(new ApiError("IMPORT_FILE_INVALID", 422)); chooser.current?.focus(); return; }
    lock.current = true; setBusy(true); setProgress(0); setError(undefined);
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    const controller = new AbortController(); abort.current = controller;
    const initialFallback = fallback || null;
    try {
      const id = await uploadImport(file, attempt.current, setProgress, controller.signal);
      await importCommand(`/api/v1/imports/${id}/preview`, { fallback_agent_id: initialFallback }, batchSchema, undefined, controller.signal);
      if (!mounted.current) return;
      setSelected(id); setRevision(value => value + 1); router.replace(`/leads?view=import&batch=${id}`, { scroll: false });
      setFile(undefined); setFallback(""); draft.accept({ file: null, fallback: "" }); attempt.current = { key: "", batchId: "" };
      if (input.current) input.current.value = "";
    } catch (reason) {
      if (!mounted.current) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      if ([401, 403, 404].includes(failure.status)) { authorityDenied(failure); draft.accept({ file: null, fallback: "" }); }
      else {
        setError(failure);
        if (attempt.current.batchId) { const id = attempt.current.batchId; setSelected(id); setRevision(value => value + 1); router.replace(`/leads?view=import&batch=${id}`, { scroll: false }); }
      }
    } finally { lock.current = false; abort.current = null; if (mounted.current) setBusy(false); }
  }
  if (denied) return <RecordError error={denied} retry={() => { setDenied(undefined); setRevision(value => value + 1); draft.accept({ file: null, fallback: "" }); }} />;
  return <section aria-label="Import de contacts" className="grid min-w-0 gap-4">
    <Button action="back" asChild variant="outline" className="justify-self-start"><Link prefetch={false} href="/leads">Retour aux Prospects</Link></Button>
    <details open={!selected || Boolean(file) || busy || undefined} className="kay-surface min-w-0">
      <summary hidden={!selected} className="min-h-control cursor-pointer px-5 py-3 text-sm font-medium">Envoyer un fichier corrigé</summary>
      <form data-draft-managed data-live-dirty={draft.dirty || undefined} aria-busy={busy} aria-label="Fichier CSV de contacts" className="p-4 sm:p-6" onSubmit={event => { event.preventDefault(); if (reviewRoot.current) guard.request(() => void upload(), reviewRoot.current); }}>
        <RecordSection title={selected ? "Nouveau lot" : "Choisir le fichier"} description="Contacts uniquement : aucun Lead, bien ou affaire n’est créé. Un nouveau fichier conserve le lot précédent sans le modifier." action={<Button action="upload" type="submit" disabled={!hydrated || !file || busy || blocked}>{busy ? "Transfert et aperçu en cours…" : error ? "Réessayer le fichier" : "Envoyer et prévisualiser"}</Button>}>
          <fieldset disabled={!hydrated || busy || blocked} className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
            <FilePicker id="import-csv" label="Fichier CSV" accept=".csv,text/csv" description="CSV UTF-8 · 20 Mo maximum · 50 000 lignes" selected={file} choose={choose} disabled={!hydrated || busy || blocked} inputRef={input} browseRef={chooser} />
            <div className="grid min-w-0 gap-4"><AgentPicker label="Agent de remplacement du nouveau lot" value={fallback} change={setFallback} denied={authorityDenied} /><p className="text-sm text-muted-foreground">Pour les lignes sans agent_email uniquement. Vous pourrez aussi choisir un agent par ligne dans l’aperçu.</p>
              <details><summary className="min-h-control cursor-pointer py-3 text-sm font-medium">Format et colonnes du CSV</summary><div className="grid min-w-0 gap-3 text-sm text-muted-foreground"><p className="wrap-anywhere">En-tête exact : {csvHeaders}</p><p>UTF-8 (BOM accepté), séparateur virgule. Plusieurs valeurs : |. Entourez de guillemets les valeurs contenant une virgule ou un saut de ligne. Téléphones internationaux avec + et indicatif.</p><p>Rôles autorisés : buyer, seller, owner, tenant, developer. agent_email désigne un agent actif. Les numéros existants ignorent la ligne entière, sans modifier le contact connu.</p><p>20 Mo maximum (20 971 520 octets), 50 000 lignes hors en-tête. Les numéros désignent les enregistrements CSV, même si une note occupe plusieurs lignes de texte.</p></div></details>
            </div>
          </fieldset>
          {busy ? <div className="flex flex-wrap items-center gap-3"><p role="status" className="text-sm">Transfert : {progress} %. Aucun contact n’est créé avant l’approbation.</p><Button action="cancel" type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button></div> : null}
          {blocked ? <p role="status" className="text-sm text-warning">Terminez ou vérifiez l’opération du lot actuel avant d’envoyer un autre fichier.</p> : null}
          {error ? <RecordError error={error} /> : null}
        </RecordSection>
      </form>
    </details>
    <div ref={reviewRoot} className="min-w-0">{selected ? <BatchReview key={`${selected}:${revision}`} id={selected} uploadBusy={busy} blockedChanged={blockedChanged} authorityDenied={authorityDenied} /> : <p className="text-sm text-muted-foreground">Envoyez votre CSV pour examiner les lignes avant toute création.</p>}</div>
    {guard.dialog}
  </section>;
}
