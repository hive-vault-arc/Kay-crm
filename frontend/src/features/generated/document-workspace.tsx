"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { EnquiryIcon, EmptyFolderIcon } from "@/components/icons";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { downloadBytes, requestFilePermit } from "@/features/files/transfers";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiCommand } from "@/lib/api/command";
import { ApiError } from "@/lib/api/client";
import { formatInstant } from "@/lib/format";
import { generateBodySchema, generatedContextSchema, generatedHistorySchema, generatedItemSchema, type GeneratedItem } from "./contracts";

type ParentKind = "enquiry" | "deal";

export function DocumentWorkspace({ parentKind, id }: { parentKind: ParentKind; id: string }) {
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState("01");
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string>();
  const [error, setError] = useState<ApiError>();
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const attempt = useRef({ fingerprint: "", key: "" });
  const hydrated = useHydrated();
  const parent = `parent_kind=${parentKind}&parent_id=${id}`;
  const context = useQuery(`/api/v1/generated-documents/context?${parent}`, generatedContextSchema);
  const history = useQuery(`/api/v1/generated-documents?${parent}&page=${page}`, generatedHistorySchema);
  const back = parentKind === "enquiry" ? `/leads/${id}` : `/deals/${id}`;
  const template = context.value?.templates.find(item => item.code === selectedCode) ?? context.value?.templates[0];
  const values = template ? (drafts[template.code] ?? context.value?.defaults ?? {}) : {};
  const groups = template ? [...new Set(template.fields.map(field => field.group))] : [];

  function changeField(key: string, value: string) {
    if (!template) return;
    setDrafts(previous => ({ ...previous, [template.code]: { ...values, [key]: value } }));
    setError(undefined);
    setNotice("");
  }

  async function generate() {
    if (!template || !context.value?.can_generate || lock.current) return;
    const body = {
      parent_kind: parentKind, parent_id: id, template_code: template.code,
      values: Object.fromEntries(template.fields.map(field => [field.key, values[field.key] ?? ""])),
    };
    if (!generateBodySchema.safeParse(body).success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const fingerprint = JSON.stringify(body);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setError(undefined); setNotice("");
    try {
      await apiCommand("/api/v1/generated-documents", body, generatedItemSchema, attempt.current.key, "POST", 40_000);
      attempt.current = { fingerprint: "", key: "" };
      setNotice("PDF créé et conservé dans l’historique privé. Vous pouvez le télécharger ci-dessous.");
      setPage(1);
      history.refreshQuietly();
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function download(item: GeneratedItem) {
    if (downloading) return;
    setDownloading(item.id); setError(undefined);
    try {
      const permit = await requestFilePermit({ action: "download", document_id: item.id, expected_version: item.version, version_id: item.version_id });
      const blob = await downloadBytes(permit);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("FILE_TRANSFER_INTERRUPTED", 503)); }
    finally { setDownloading(undefined); }
  }

  return <main className="record-stack grid min-w-0 gap-5">
    <Button action="back" asChild variant="quiet" size="compact" className="justify-self-start"><Link href={back}>Retour à {parentKind === "enquiry" ? "la demande" : "l’affaire"}</Link></Button>
    <PageHeader icon={EnquiryIcon} title="Documents du dossier" description="Choisissez un modèle, vérifiez les informations préremplies et conservez chaque PDF généré." route={`${back}/documents`} />
    {context.error ? <RecordError error={context.error} retry={context.refresh} /> : !context.value ? <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(15rem,0.32fr)_minmax(0,1fr)]" role="status" aria-label="Chargement des modèles"><div className="crm-panel grid content-start gap-3"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div><div className="crm-panel grid content-start gap-4"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-16 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div></div> : <>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(15rem,0.32fr)_minmax(0,1fr)]">
        <nav aria-label="Modèles de documents" className="crm-panel grid min-w-0 content-start gap-2">
          <SectionHeading compact icon={EmptyFolderIcon}>Modèles disponibles</SectionHeading>
          <p className="mb-2 text-sm text-muted-foreground">12 modèles de travail fournis par KAY. Les documents financiers sont réservés aux responsables.</p>
          {context.value.templates.map(item => <Button key={item.code} action="file" type="button" variant="outline" aria-current={template?.code === item.code ? "true" : undefined} onClick={() => { setSelectedCode(item.code); setError(undefined); setNotice(""); }} className={`min-h-control w-full items-start justify-start gap-3 px-3 py-3 text-left ${template?.code === item.code ? "border-primary bg-primary/15" : ""}`}><span aria-hidden="true" className="shrink-0 tabular-nums text-muted-foreground">{item.code}</span><span>{item.title}</span></Button>)}
        </nav>
        {template ? <section className="crm-panel min-w-0" aria-labelledby="template-heading">
          <div className="mb-5 grid gap-2 border-b pb-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modèle {template.code} / 12</p><h2 id="template-heading" className="text-section font-medium">{template.title}</h2><p className="max-w-reading text-sm text-muted-foreground">Les champs proposés proviennent du dossier actuel. Corrigez-les avant de créer le PDF.</p></div>
          <p className="mb-5 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground" role="note">{template.warning}</p>
          {groups.map(group => <fieldset key={group} className="mb-6 min-w-0 border-0 p-0"><legend className="mb-3 text-base font-semibold">{group}</legend><div className="grid min-w-0 gap-4 md:grid-cols-2">{template.fields.filter(field => field.group === group).map(field => <div key={field.key} className={`grid min-w-0 gap-1.5 ${field.multiline ? "md:col-span-2" : ""}`}><Label htmlFor={`generated-${field.key}`}>{field.label}</Label>{field.multiline ? <Textarea id={`generated-${field.key}`} value={values[field.key] ?? ""} onChange={event => changeField(field.key, event.target.value)} maxLength={1000} disabled={!hydrated || busy || !context.value?.can_generate} /> : <Input id={`generated-${field.key}`} value={values[field.key] ?? ""} onChange={event => changeField(field.key, event.target.value)} maxLength={300} disabled={!hydrated || busy || !context.value?.can_generate} />}</div>)}</div></fieldset>)}
          {!context.value.can_generate ? <p role="status" className="mb-3 text-sm text-muted-foreground">Dossier archivé : l’historique reste consultable, mais la génération est désactivée.</p> : null}
          <div className="flex flex-wrap items-center gap-3 border-t pt-5"><Button action="create" type="button" disabled={!hydrated || busy || !context.value.can_generate} onClick={() => void generate()}>{busy ? "Création du PDF…" : "Générer le PDF"}</Button><p className="text-xs text-muted-foreground">Le PDF reste privé et peut être téléchargé depuis l’historique.</p></div>
        </section> : null}
      </div>
    </>}
    {notice ? <p role="status" className="text-success">{notice}</p> : null}
    {error ? <RecordError error={error} retry={() => setError(undefined)} /> : null}
    {context.value ? <section aria-label="Historique des PDF générés" className="crm-panel grid min-w-0 gap-4"><SectionHeading compact icon={EmptyFolderIcon}>Historique des PDF</SectionHeading>
      {history.error ? <RecordError error={history.error} retry={history.refresh} /> : !history.value ? <div role="status" aria-label="Chargement de l’historique" className="grid gap-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : history.value.items.length ? <><ul className="grid min-w-0 divide-y border-y">{history.value.items.map(item => <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium">{context.value?.templates.find(model => model.code === item.template_code)?.title ?? `Modèle ${item.template_code}`}</p><p className="wrap-anywhere text-xs text-muted-foreground">{formatInstant(item.created_at)} · {item.filename}</p></div><Button action="download" type="button" variant="outline" disabled={!hydrated || Boolean(downloading)} onClick={() => void download(item)}>{downloading === item.id ? "Téléchargement…" : "Télécharger"}</Button></li>)}</ul><NumberedPages label="Pages des PDF générés" page={page} total={history.value.total} size={20} change={setPage} /></> : <p>Aucun PDF généré pour ce dossier.</p>}
    </section> : null}
  </main>;
}
