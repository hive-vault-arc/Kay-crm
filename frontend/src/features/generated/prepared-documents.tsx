"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileIcon } from "@/components/icons";
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
import { generatedContextSchema, generatedHistorySchema, type GeneratedItem } from "./contracts";

type Parent = { parentKind: "enquiry" | "deal"; id: string };

export function usePreparedDocuments({ parentKind, id }: Parent) {
  const [page, setPage] = useState(1), [downloading, setDownloading] = useState("");
  const [error, setError] = useState<ApiError>();
  const lock = useRef(false), mounted = useRef(false);
  const parent = `parent_kind=${parentKind}&parent_id=${id}`;
  const context = useQuery(`/api/v1/generated-documents/context?${parent}`, generatedContextSchema);
  const history = useQuery(`/api/v1/generated-documents?${parent}&page=${page}`, generatedHistorySchema);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function download(item: GeneratedItem) {
    if (lock.current) return;
    lock.current = true; setDownloading(item.id); setError(undefined);
    try {
      const permit = await requestFilePermit({ action: "download", document_id: item.id, expected_version: item.version, version_id: item.version_id });
      if (!mounted.current) return;
      const blob = await downloadBytes(permit);
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = item.filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      if (!mounted.current) return;
      const failure = reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503);
      setError(failure);
      if ([401, 403, 404].includes(failure.status)) { context.refresh(); history.refresh(); }
      else if (failure.status === 409) history.refresh();
    } finally { lock.current = false; if (mounted.current) setDownloading(""); }
  }
  function refresh() { setPage(1); history.refreshQuietly(); }
  return { context, history, page, setPage, downloading, error, download, refresh };
}

export function PreparedDocumentHistory({ documents, prepareHref }: { documents: ReturnType<typeof usePreparedDocuments>; prepareHref?: string }) {
  const { context, history, page, setPage, downloading, error, download } = documents;
  const hydrated = useHydrated();
  return <RecordSection title="PDF préparés" count={context.value && !context.error && !history.error ? history.value?.total : undefined} action={context.value?.can_generate && !context.error && prepareHref ? <Button action="file" variant="outline" asChild><Link href={prepareHref} prefetch={false}>Préparer un PDF</Link></Button> : undefined}>
    {context.error ? <RecordError error={context.error} retry={context.refresh} /> : history.error ? <RecordError error={history.error} retry={history.refresh} /> : !context.value || !history.value ? <p role="status">Chargement des PDF préparés…</p> : <>
      {history.value.items.length ? <ul className="kay-prepared-list">{history.value.items.map(item => <li key={item.id} className="kay-prepared-entry">
        <div className="kay-file-entry-head"><span className="kay-file-entry-symbol"><FileIcon size={20} aria-hidden="true" /></span><div><h3>{context.value?.templates.find(model => model.code === item.template_code)?.title ?? `Modèle ${item.template_code}`}</h3><p className="text-xs text-muted-foreground wrap-anywhere">{item.filename}</p></div></div>
        <time dateTime={item.created_at}>{formatInstant(item.created_at)}</time><p className="kay-file-size">{fileSizeLabel(item.size_bytes)}</p>
        <Button action="download" type="button" variant="quiet" size="icon" aria-label={`Télécharger ${item.filename}`} disabled={!hydrated || Boolean(downloading)} onClick={() => void download(item)}><span className="sr-only">{downloading === item.id ? "Téléchargement…" : "Télécharger"}</span></Button>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun PDF préparé dans ce dossier.</p>}
      {history.value.has_previous || history.value.has_next ? <NumberedPages compact label="Pages des PDF préparés" page={page} total={history.value.total} size={20} change={setPage} /> : null}
    </>}
    {downloading ? <p role="status" className="text-sm text-muted-foreground">Téléchargement du PDF…</p> : null}{error ? <RecordError error={error} /> : null}
  </RecordSection>;
}

export function PreparedDocuments({ parentKind, id }: Parent) {
  const documents = usePreparedDocuments({ parentKind, id });
  return <PreparedDocumentHistory documents={documents} prepareHref={`/${parentKind === "enquiry" ? "leads" : "deals"}/${id}/documents`} />;
}
