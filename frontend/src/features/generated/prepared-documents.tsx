"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileIcon } from "@/components/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { RecordSection } from "@/components/shared/record-workspace";
import { fileSizeLabel } from "@/components/shared/file-picker";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { downloadBytes, requestFilePermit } from "@/features/files/transfers";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { generatedContextSchema, generatedHistoryWithActorsSchema, type GeneratedHistoryItem, type GeneratedItem } from "./contracts";

type Parent = { parentKind: "enquiry" | "deal"; id: string };

export function usePreparedDocuments({ parentKind, id }: Parent) {
  const [page, setPage] = useState(1), [downloading, setDownloading] = useState("");
  const [error, setError] = useState<ApiError>();
  const lock = useRef(false), mounted = useRef(false), transfer = useRef<AbortController | null>(null);
  const parent = `parent_kind=${parentKind}&parent_id=${id}`;
  const context = useQuery(`/api/v1/generated-documents/context?${parent}`, generatedContextSchema);
  const history = useQuery(`/api/v1/generated-documents?${parent}&page=${page}&include_actor=true`, generatedHistoryWithActorsSchema);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; transfer.current?.abort(); }; }, []);
  useEffect(() => { if ([context.error, history.error].some(error => error && [401, 403, 404].includes(error.status))) transfer.current?.abort(); }, [context.error, history.error]);

  async function download(item: GeneratedItem) {
    if (lock.current || !mounted.current || context.error || history.error || !context.value || !history.value?.items.some(row => row.id === item.id && row.version === item.version && row.version_id === item.version_id)) return;
    lock.current = true; setDownloading(item.id); setError(undefined);
    const abort = new AbortController(); transfer.current = abort;
    try {
      const permit = await requestFilePermit({ action: "download", document_id: item.id, expected_version: item.version, version_id: item.version_id }, abort.signal);
      if (!mounted.current || abort.signal.aborted) return;
      const blob = await downloadBytes(permit, abort.signal);
      if (!mounted.current || abort.signal.aborted) return;
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = item.filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      if (!mounted.current || abort.signal.aborted) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      setError(failure);
      if ([401, 403, 404].includes(failure.status)) { context.refresh(); history.refresh(); }
      else if (failure.status === 409) history.refresh();
    } finally { lock.current = false; if (mounted.current) setDownloading(""); }
  }
  function refresh() { setPage(1); history.refreshQuietly(); }
  return { context, history, page, setPage, downloading, error, download, refresh };
}

export function PreparedDocumentHistory({ documents, prepareHref, presentation = "cards" }: { documents: ReturnType<typeof usePreparedDocuments>; prepareHref?: string; presentation?: "cards" | "table" }) {
  const { context, history, page, setPage, downloading, error, download } = documents;
  const hydrated = useHydrated();
  const title = (item: GeneratedHistoryItem) => context.value?.templates.find(model => model.code === item.template_code)?.title ?? `Modèle ${item.template_code}`;
  const action = (item: GeneratedHistoryItem) => <Button action="download" type="button" variant="quiet" size="icon" aria-label={`Télécharger ${item.filename}`} disabled={!hydrated || Boolean(downloading)} onClick={() => void download(item)}><span className="sr-only">{downloading === item.id ? "Téléchargement…" : "Télécharger"}</span></Button>;
  const columns: ColumnDef<GeneratedHistoryItem>[] = [
    { id: "document", header: "Document", cell: ({ row }) => <div className="kay-file-entry-head"><span className="kay-file-entry-symbol"><FileIcon size={20} aria-hidden="true" /></span><div><h3>{title(row.original)}</h3><p className="text-xs text-muted-foreground wrap-anywhere">{row.original.filename}</p></div></div> },
    { id: "created", header: "Créé le", cell: ({ row }) => <time dateTime={row.original.created_at}>{formatInstant(row.original.created_at)}</time> },
    { id: "actor", header: "Auteur", cell: ({ row }) => row.original.actor.display_name },
    { id: "file", header: "Fichier", cell: ({ row }) => <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{fileSizeLabel(row.original.size_bytes)}</span>{action(row.original)}</div> },
  ];
  return <RecordSection title="PDF préparés" count={context.value && !context.error && !history.error ? history.value?.total : undefined} action={context.value?.can_generate && !context.error && prepareHref ? <Button action="file" variant="outline" asChild><Link href={prepareHref} prefetch={false}>Préparer un PDF</Link></Button> : undefined}>
    {context.error ? <RecordError error={context.error} retry={context.refresh} /> : history.error ? <RecordError error={history.error} retry={history.refresh} /> : !context.value || !history.value ? <p role="status">Chargement des PDF préparés…</p> : <>
      {presentation === "table" ? <div className="kay-document-history-scroll" role="region" aria-label="Historique des PDF préparés" tabIndex={0}><DataTable columns={columns} rows={history.value.items} caption="PDF préparés dans ce dossier" emptyLabel="Aucun PDF préparé dans ce dossier." getRowId={item => item.id} /></div> : history.value.items.length ? <ul className="kay-prepared-list">{history.value.items.map(item => <li key={item.id} className="kay-prepared-entry">
        <div className="kay-file-entry-head"><span className="kay-file-entry-symbol"><FileIcon size={20} aria-hidden="true" /></span><div><h3>{context.value?.templates.find(model => model.code === item.template_code)?.title ?? `Modèle ${item.template_code}`}</h3><p className="text-xs text-muted-foreground wrap-anywhere">{item.filename}</p></div></div>
        <div className="text-xs text-muted-foreground"><time dateTime={item.created_at}>{formatInstant(item.created_at)}</time><p>{item.actor.display_name}</p></div><p className="kay-file-size">{fileSizeLabel(item.size_bytes)}</p>
        {action(item)}
      </li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun PDF préparé dans ce dossier.</p>}
      {history.value.has_previous || history.value.has_next || page > 1 ? <NumberedPages compact label="Pages des PDF préparés" page={page} total={history.value.total} size={20} change={setPage} /> : null}
    </>}
    {downloading ? <p role="status" className="text-sm text-muted-foreground">Téléchargement du PDF…</p> : null}{error ? <RecordError error={error} /> : null}
  </RecordSection>;
}

export function PreparedDocuments({ parentKind, id }: Parent) {
  return <PreparedRecord key={`${parentKind}:${id}`} parentKind={parentKind} id={id} />;
}
function PreparedRecord({ parentKind, id }: Parent) {
  const documents = usePreparedDocuments({ parentKind, id });
  return <PreparedDocumentHistory documents={documents} prepareHref={`/${parentKind === "enquiry" ? "leads" : "deals"}/${id}/documents`} />;
}
