"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { downloadExport } from "./client";
import { exportsSchema } from "./contracts";
const states = { queued: "En attente de génération", ready: "Prêt à télécharger", failed: "Génération échouée", denied: "Autorisation retirée" };
export function ExportsPanel({ role }: { role: StaffRole }) {
  return role === "agent" ? <p role="alert">Accès non autorisé : les exports sont réservés aux responsables et administrateurs.</p> : <ExportList />;
}
function ExportList() {
  const [page, setPage] = useState(1), result = useQuery(queryPath("exports", { page, page_size: 10 }), exportsSchema);
  const [lastId, setLastId] = useState("");
  const [pending, setPending] = useState(""), [error, setError] = useState<ApiError>(), [notice, setNotice] = useState("");
  async function download(id: string) { if (pending) return; setLastId(id); setPending(id); setError(undefined); setNotice(""); try { await downloadExport(id); setNotice("CSV téléchargé. Vérifiez son contenu avant de le partager."); } catch (e) { setError(e instanceof ApiError ? e : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); } finally { setPending(""); } }
  return <div className="record-stack grid min-w-0 gap-6"><div className="flex flex-wrap gap-2"><Button action="back" asChild variant="outline"><Link href="/leads">Retour aux Leads</Link></Button><Button action="refresh" variant="outline" onClick={result.refresh}>Actualiser les exports</Button></div><p className="max-w-reading text-sm text-muted-foreground">Vos propres demandes uniquement. Le worker local génère le CSV ; actualisez pour voir sa progression. Les droits sont revérifiés avant chaque téléchargement.</p>{error ? <RecordError error={error} retry={() => void download(lastId)} /> : null}{notice ? <p role="status">{notice}</p> : null}
    {result.error ? <RecordError error={result.error} retry={result.refresh} /> : !result.value ? <p role="status">Chargement des exports…</p> : <><p role="status">{result.value.total} export(s).</p>{result.value.items.length ? <ul className="grid gap-6">{result.value.items.map(row => <li className="grid min-w-0 gap-3 border-b pb-6" key={row.id}><h2 className="font-medium">{row.kind === "contacts" ? "Contacts" : "Demandes"} : {formatInstant(row.created_at)}</h2><p>{states[row.state]}{row.state === "ready" && row.row_count !== null ? ` : ${row.row_count} ligne(s)` : ""}</p>{row.state === "ready" ? <Button action="download" className="justify-self-start" disabled={!!pending} onClick={() => void download(row.id)}>{pending === row.id ? "Téléchargement en cours…" : "Télécharger le CSV"}</Button> : row.state === "queued" ? <p className="text-sm text-muted-foreground">Actualisez dans quelques instants. Ne recréez pas la demande après une interruption.</p> : <p className="text-sm text-danger">{row.error_code === "EXPORT_LIMIT_EXCEEDED" ? "Réduisez les résultats avec des filtres puis créez un nouvel export." : "Aucun fichier délivré. Vérifiez vos droits et le service local avant une nouvelle demande."}</p>}</li>)}</ul> : <p>Aucun export sur cette page. Lancez un export depuis les résultats filtrés des Leads ou des Contacts.</p>}<NumberedPages label="Pages des exports" page={page} size={10} total={result.value.total} change={setPage} /></>}</div>;
}
