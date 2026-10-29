"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClockIcon, CompletedIcon, CloseIcon, FileIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { CrmStatusBadge } from "@/components/shared/crm-presentation";
import { RecordEntry } from "@/components/shared/record-entry";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { downloadExport } from "./client";
import { exportsSchema, type ExportJob } from "./contracts";

const states = { queued: "En attente", ready: "Prêt", failed: "Échec", denied: "Autorisation retirée" };
const title = (row: ExportJob) => row.kind === "contacts" ? "Contacts filtrés" : "Prospects filtrés";
export function ExportStatus({ state }: { state: ExportJob["state"] }) {
  const Icon = state === "queued" ? ClockIcon : state === "ready" ? CompletedIcon : CloseIcon;
  const tone = state === "ready" ? "completed" : state === "failed" ? "lost" : state === "queued" ? "reserved" : "cancelled";
  return <CrmStatusBadge state={tone} dot={false}><Icon size={12} aria-hidden="true" />{states[state]}</CrmStatusBadge>;
}
function exportHint(row: ExportJob) {
  if (row.state === "ready") return row.row_count === null ? "Fichier prêt à télécharger." : `${row.row_count} ligne(s)${row.size_bytes === null ? "" : ` · ${fileSizeLabel(row.size_bytes)}`}`;
  if (row.state === "queued") return "Le fichier est en préparation. Ne recréez pas la demande après une interruption.";
  if (row.error_code === "EXPORT_LIMIT_EXCEEDED") return "Réduisez les résultats avec des filtres, puis demandez un nouvel export.";
  return "Aucun fichier délivré. Vérifiez vos droits et le service local avant une nouvelle demande.";
}
export function ExportsPanel({ role, actorId }: { role: StaffRole; actorId?: string }) {
  return role === "agent" ? <p role="alert">Accès non autorisé : les exports sont réservés aux responsables et administrateurs.</p> : <ExportList key={`${actorId ?? ""}:${role}`} role={role} actorId={actorId} />;
}
export function ExportList({ role = "manager", actorId }: { role?: StaffRole; actorId?: string } = {}) {
  const [page, setPage] = useState(1), result = useQuery(queryPath("exports", { page, page_size: 10 }), exportsSchema);
  const [pending, setPending] = useState(""), [error, setError] = useState<ApiError>(), [notice, setNotice] = useState("");
  const lastId = useRef(""), abort = useRef<AbortController | null>(null), lock = useRef(false), alive = useRef(true);
  const hydrated = useHydrated();
  const key = `${actorId ?? ""}:${role}`, opening = useRef(key), current = useRef({ key, denied: false, available: false, ready: new Set<string>(), blocked: new Set<string>() });
  useLayoutEffect(() => {
    current.current = { key, denied: role === "agent" || Boolean(result.error && [401, 403, 404].includes(result.error.status)), available: hydrated && Boolean(result.value && !result.error), ready: new Set(result.value?.items.filter(row => row.state === "ready").map(row => row.id)), blocked: new Set(result.value?.items.filter(row => row.state !== "ready").map(row => row.id)) };
    if (current.current.denied || opening.current !== key || current.current.blocked.has(lastId.current)) abort.current?.abort();
  }, [key, role, result.value, result.error, hydrated]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
  const active = () => alive.current && opening.current === current.current.key && !current.current.denied;
  function refreshCurrent() { if (!alive.current || opening.current !== current.current.key || lock.current) return; current.current.available = false; setError(undefined); setNotice(""); result.refresh(); }
  const queued = Boolean(!result.error && result.value?.items.some(row => row.state === "queued")), refresh = result.refreshQuietly;
  useEffect(() => { if (!queued) return; const timer = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 5000); return () => clearInterval(timer); }, [queued, refresh]);
  async function download(id: string) {
    if (!active() || !current.current.available || !current.current.ready.has(id) || lock.current) return;
    lock.current = true; lastId.current = id;
    const controller = new AbortController(); abort.current = controller;
    setPending(id); setError(undefined); setNotice("");
    try { await downloadExport(id, controller.signal, { actorId, role, canDeliver: () => active() && !current.current.blocked.has(id) }); if (!controller.signal.aborted && active()) setNotice("CSV téléchargé. Vérifiez son contenu avant de le partager."); }
    catch (reason) {
      if (controller.signal.aborted || !active()) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503);
      setError(failure);
      if ([401, 403, 404, 409].includes(failure.status)) { current.current.available = false; result.refresh(); }
    } finally { if (abort.current === controller) { lock.current = false; if (alive.current && opening.current === current.current.key) setPending(""); abort.current = null; } }
  }
  function fileAction(row: ExportJob) {
    return row.state === "ready" ? <Button action="download" type="button" variant="outline" size="compact" aria-label={`Télécharger le CSV ${title(row)} du ${formatInstant(row.created_at)}`} disabled={!hydrated || Boolean(pending)} onClick={() => void download(row.id)}>{pending === row.id ? "Téléchargement…" : "Télécharger le CSV"}</Button> : <span className="text-sm text-muted-foreground">{row.state === "queued" ? "En préparation" : "Indisponible"}</span>;
  }
  const columns: ColumnDef<ExportJob>[] = [
    { id: "date", header: "Date", cell: ({ row }) => <time dateTime={row.original.created_at}>{formatInstant(row.original.created_at)}</time> },
    { id: "content", header: "Contenu", cell: ({ row }) => <div className="grid min-w-0 gap-1"><strong className="font-medium">{title(row.original)}</strong><p className="text-xs text-muted-foreground">{exportHint(row.original)}</p></div> },
    { id: "state", header: "État", cell: ({ row }) => <ExportStatus state={row.original.state} /> },
    { id: "file", header: "Fichier", cell: ({ row }) => fileAction(row.original) },
  ];
  return <section className="kay-surface grid min-w-0 content-start gap-5 p-5" aria-label="Historique de mes exports"><header className="kay-section-head"><h2>Mes exports{result.value && !result.error ? <span className="kay-section-count">{result.value.total}</span> : null}</h2><div className="kay-section-actions"><Button action="back" asChild variant="outline"><Link href="/leads">Prospects</Link></Button><Button liveRefresh action="refresh" type="button" variant="outline" disabled={!hydrated || Boolean(pending)} onClick={refreshCurrent}>Actualiser</Button></div></header>
    <p className="text-sm text-muted-foreground">Vos demandes uniquement. Les demandes en attente s’actualisent automatiquement. Vos droits sont revérifiés avant chaque téléchargement.</p>
    {error ? <RecordError error={error} retry={() => { if ([401, 403, 404, 409].includes(error.status)) refreshCurrent(); else void download(lastId.current); }} /> : null}{notice && !result.error ? <p role="status" className="text-sm text-success">{notice}</p> : null}
    {result.error ? <RecordError error={result.error} retry={refreshCurrent} /> : !result.value ? <p role="status">Chargement des exports…</p> : <><DataTable columns={columns} rows={result.value.items} getRowId={row => row.id} className="crm-directory-table" caption="Vos exports CSV" emptyLabel="Aucun export sur cette page. Préparez un export depuis les résultats filtrés des prospects ou des contacts." footerCaption mobileCard={row => <RecordEntry title={title(row)} icon={FileIcon} status={<ExportStatus state={row.state} />} meta={[{ label: "Demandé le", value: <time dateTime={row.created_at}>{formatInstant(row.created_at)}</time> }, { label: "Terminé le", value: row.completed_at ? <time dateTime={row.completed_at}>{formatInstant(row.completed_at)}</time> : row.state === "queued" ? "En attente" : "Non renseigné" }]} actions={fileAction(row)}><p className="text-xs text-muted-foreground">{exportHint(row)}</p></RecordEntry>} /><NumberedPages compact label="Pages des exports" page={page} size={10} total={result.value.total} change={setPage} /></>}
  </section>;
}
