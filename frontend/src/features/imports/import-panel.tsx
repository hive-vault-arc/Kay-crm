"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StaffRole } from "@/features/contacts/contracts";
import { RecordError } from "@/features/contacts/record-states";
import { ApiError } from "@/lib/api/client";
import { importCommand, uploadImport } from "./client";
import { batchSchema, createSchema, csvHeaders } from "./contracts";
import { BatchReview } from "./batch-review";
import { useHydrated } from "@/hooks/use-hydrated";

export function ImportPanel({ role, batchId }: { role: StaffRole; batchId?: string }) {
  const hydrated = useHydrated();
  const [previewVersion, setPreviewVersion] = useState(0);
  const router = useRouter(), [selected, setSelected] = useState(batchId), [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState<ApiError>();
  const input = useRef<HTMLInputElement>(null), chooser = useRef<HTMLButtonElement>(null), abort = useRef<AbortController | null>(null), locked = useRef(false), attempt = useRef({ key: "", batchId: "" });
  useEffect(() => () => abort.current?.abort(), []);
  if (role === "agent") return <RecordError error={new ApiError("FORBIDDEN", 403)} />;
  async function upload() {
    if (locked.current || !file) return;
    if (!createSchema.safeParse({ filename: file.name, size_bytes: file.size }).success) { setError(new ApiError("IMPORT_FILE_INVALID", 422)); chooser.current?.focus(); return; }
    locked.current = true; setBusy(true); setProgress(0); setError(undefined);
    if (!attempt.current.key) attempt.current.key = crypto.randomUUID();
    const controller = new AbortController(); abort.current = controller;
    try {
      const id = await uploadImport(file, attempt.current, setProgress, controller.signal);
      await importCommand(`/api/v1/imports/${id}/preview`, {}, batchSchema, undefined, controller.signal);
      setSelected(id); setPreviewVersion(version => version + 1); router.replace(`/leads?view=import&batch=${id}`);
      setFile(undefined); attempt.current = { key: "", batchId: "" }; if (input.current) input.current.value = "";
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); if (attempt.current.batchId) { setSelected(attempt.current.batchId); router.replace(`/leads?view=import&batch=${attempt.current.batchId}`); } }
    finally { locked.current = false; setBusy(false); abort.current = null; }
  }
  return <section aria-label="Import de contacts" className="grid min-w-0 gap-8">
    <Button asChild variant="outline" className="justify-self-start"><Link href="/leads">Retour aux Prospects</Link></Button>
    <form className="form-surface grid min-w-0 max-w-reading gap-4" onSubmit={event => { event.preventDefault(); void upload(); }} aria-label="Fichier CSV de contacts">
      <div className="grid gap-2"><h2 className="text-section font-medium">{selected ? "Envoyer un fichier corrigé" : "Choisir le fichier"}</h2><p className="text-sm">Contacts uniquement : aucun Lead, bien ou affaire n’est créé. Un nouveau fichier conserve le lot précédent sans le modifier.</p></div>
      <details><summary className="min-h-control cursor-pointer py-3">Format et colonnes du CSV</summary><div className="grid min-w-0 gap-2"><p className="wrap-anywhere text-sm">En-tête exact : {csvHeaders}</p><p className="text-sm">UTF-8 (BOM accepté), séparateur virgule. Plusieurs valeurs : |. Entourez de guillemets les valeurs contenant une virgule ou un saut de ligne. Téléphones internationaux avec + et indicatif.</p><p className="text-sm">Rôles autorisés : buyer, seller, owner, tenant, developer. agent_email désigne un agent actif ; sinon choisissez un remplacement explicite. Les numéros existants ignorent la ligne entière, sans modifier le contact connu.</p><p className="text-sm">20 Mo maximum (20 971 520 octets), 50 000 lignes hors en-tête. Les numéros de ligne désignent les enregistrements CSV, même si une note occupe plusieurs lignes de texte.</p></div></details>
      <fieldset disabled={!hydrated || busy} className="relative grid min-w-0 gap-2"><Label htmlFor="import-csv">Fichier CSV</Label><Input id="import-csv" ref={input} type="file" accept=".csv,text/csv" tabIndex={-1} className="sr-only left-0 top-0 h-px w-px border-0 p-0" onChange={event => { setFile(event.target.files?.[0]); attempt.current = { key: "", batchId: "" }; setError(undefined); }} /><Button ref={chooser} type="button" variant="outline" className="justify-self-start" aria-describedby="import-selection" onClick={() => input.current?.click()}>Choisir un CSV</Button><p id="import-selection" className="wrap-anywhere text-sm" aria-live="polite">{file?.name ?? "Aucun fichier sélectionné"}</p></fieldset>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!file || busy}>{busy ? "Transfert et aperçu en cours…" : error ? "Réessayer le fichier" : "Envoyer et prévisualiser"}</Button>{busy ? <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>Interrompre le transfert</Button> : null}</div>
      {busy ? <p role="status">Transfert : {progress} %. Aucun contact n’est créé avant l’approbation.</p> : null}
      {error ? <RecordError error={error} /> : null}
    </form>
    {selected ? <BatchReview key={`${selected}:${previewVersion}`} id={selected} uploadBusy={busy} /> : <p>Aucun lot sélectionné. Envoyez le modèle de contacts pour examiner ses lignes avant toute création.</p>}
  </section>;
}
