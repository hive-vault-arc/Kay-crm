"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AlertIcon, CheckIcon, FileIcon } from "@/components/icons";
import { PageHeader } from "@/components/shared/page-header";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { PreparedDocumentHistory, usePreparedDocuments } from "./prepared-documents";
import { usePreparation } from "./use-preparation";

type Parent = { parentKind: "enquiry" | "deal"; id: string };

// Changing the dossier discards the old controller's lifetime, never its response into a new parent.
export function DocumentWorkspace(props: Parent) { return <PreparationWorkspace key={`${props.parentKind}:${props.id}`} {...props} />; }

export function PreparationWorkspace({ parentKind, id }: Parent) {
  const documents = usePreparedDocuments({ parentKind, id }), preparation = usePreparation({ parentKind, id, documents });
  const fieldId = useId(), body = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const positions = useRef<Record<string, number>>({}), focusModel = useRef<string | undefined>(undefined);
  const [restartCode, setRestartCode] = useState<string>();
  const { template, context, selectedCode, busy, hydrated, uncertain, changedTemplate } = preparation;
  const back = `/${parentKind === "enquiry" ? "leads" : "deals"}/${id}`;
  const groups = template ? [...new Set(template.fields.map(field => field.group))] : [];
  const unavailable = !hydrated || busy || uncertain || !context?.can_generate;
  const historyCount = context && !documents.history.error ? documents.history.value?.total : undefined;
  useEffect(() => {
    if (!selectedCode || !body.current) return;
    body.current.scrollTop = positions.current[selectedCode] ?? 0;
    if (focusModel.current === selectedCode) { heading.current?.focus({ preventScroll: true }); focusModel.current = undefined; }
  }, [selectedCode]);
  function choose(code: string) {
    if (busy) return;
    if (selectedCode === code) heading.current?.focus({ preventScroll: true });
    else focusModel.current = code;
    preparation.choose(code);
  }
  const historyDocuments = preparation.contextError ? { ...documents, context: { ...documents.context, value: undefined, error: preparation.contextError } } : documents;
  return <div className="kay-document-page">
    <PageHeader title="Documents du dossier" description={context?.defaults.client_name || "Choisissez un modèle et vérifiez les informations du dossier."} route={`${back}/documents`} actions={<Button action="back" asChild variant="outline"><Link href={`${back}?tab=documents`} prefetch={false}>Retour au dossier</Link></Button>} />
    <Tabs value={preparation.tab} onValueChange={preparation.selectTab} className="kay-document-workspace kay-surface">
      <div className="kay-document-top"><TabsList aria-label="Documents du dossier"><TabsTrigger value="prepare" disabled={!hydrated || busy}>Préparer un PDF</TabsTrigger><TabsTrigger value="history" disabled={!hydrated || busy}>Historique{historyCount !== undefined ? <span className="kay-tab-count">{historyCount}</span> : null}</TabsTrigger></TabsList><span className="kay-document-private">PDF privés</span></div>
      {preparation.notice ? <p className="kay-document-feedback" role="status">{preparation.notice}</p> : null}
      <TabsContent value="prepare" forceMount hidden={preparation.tab !== "prepare"} className="kay-document-prepare">
        <form className="kay-document-layout" data-draft-managed data-live-dirty={preparation.dirty} aria-busy={busy} onSubmit={event => { event.preventDefault(); void preparation.generate(); }}>
          {preparation.contextError ? <div className="kay-document-state"><RecordError error={preparation.contextError} retry={preparation.retryContext} /></div> : !context ? <div className="kay-document-state grid gap-4" role="status" aria-label="Chargement des modèles"><Skeleton className="h-7 w-2/3" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : <>
            <aside className="kay-document-models" aria-label="Modèles disponibles">
              <header className="kay-document-model-heading"><h2>Modèles disponibles</h2><span>{context.templates.length}</span></header>
              <nav className="kay-document-model-list" aria-label="Choisir un modèle" tabIndex={0}>{context.templates.map(item => <Button key={item.code} type="button" variant="quiet" disabled={!hydrated || busy} className="kay-document-model" aria-current={selectedCode === item.code ? "true" : undefined} onClick={() => choose(item.code)}><span>{item.code}</span><strong>{item.title}</strong>{selectedCode === item.code ? <CheckIcon size={16} aria-hidden="true" /> : <span />}</Button>)}</nav>
              <div className="kay-document-mobile-picker"><Label htmlFor={`${fieldId}-model`}>Modèle de document</Label><NativeSelect id={`${fieldId}-model`} value={selectedCode ?? ""} disabled={!hydrated || busy} onChange={event => choose(event.target.value)}>{context.templates.map(item => <option key={item.code} value={item.code}>{item.code} · {item.title}</option>)}</NativeSelect></div>
            </aside>
            <div className="kay-document-form">
              <div className="kay-document-form-body" ref={body} tabIndex={0} role="region" aria-label="Informations de préparation" onScroll={event => { if (selectedCode) positions.current[selectedCode] = event.currentTarget.scrollTop; }}>
                {template ? <>
                  <h2 ref={heading} tabIndex={-1}>{template.title}</h2><p className="kay-document-intro">Vérifiez les informations préremplies. Les champs manquants peuvent rester vides.</p>
                  <p className="kay-document-warning" role="note"><AlertIcon size={20} aria-hidden="true" /><span>{template.warning}</span></p>
                  {uncertain ? <div className="kay-document-recovery" role="status"><p>{changedTemplate ? "Le modèle disponible a changé. Vérifiez l’historique avant de commencer une nouvelle préparation." : "La réponse a été interrompue. Le PDF peut déjà exister : réessayez la même préparation pour récupérer son résultat."}</p><div className="flex flex-wrap gap-2"><Button action="file" variant="outline" type="button" onClick={() => preparation.selectTab("history")}>Voir l’historique</Button><Button action="reset" variant="quiet" type="button" onClick={() => setRestartCode(selectedCode)}>Nouvelle préparation</Button></div></div> : null}
                  {preparation.attempt?.error ? <RecordError error={preparation.attempt.error} /> : null}
                  <fieldset disabled={unavailable} className="min-w-0 border-0 p-0"><legend className="sr-only">Champs du modèle {template.code}</legend>{groups.map(group => {
                    const fields = template.fields.filter(field => field.group === group);
                    return <fieldset key={`${template.code}:${group}`} className="kay-document-field-group" data-short-fields={fields.every(field => !field.multiline) ? fields.length : undefined}><legend>{group}</legend><div className="kay-document-fields">{fields.map(field => <div key={field.key} className="kay-document-field" data-wide={field.multiline}>
                      <Label htmlFor={`${fieldId}-${field.key}`}>{field.label}</Label>{field.multiline ? <Textarea id={`${fieldId}-${field.key}`} name={field.key} value={preparation.values[field.key] ?? ""} onChange={event => preparation.change(field.key, event.target.value)} maxLength={field.key === "guest_instructions" ? 1000 : 2000} placeholder={field.key === "guest_instructions" ? "Arrivée, accès au logement, règles du séjour…" : undefined} aria-invalid={preparation.validation?.fields.includes(field.key)} aria-describedby={preparation.validation ? `${fieldId}-validation` : undefined} /> : <Input id={`${fieldId}-${field.key}`} name={field.key} value={preparation.values[field.key] ?? ""} onChange={event => preparation.change(field.key, event.target.value)} maxLength={600} aria-invalid={preparation.validation?.fields.includes(field.key)} aria-describedby={preparation.validation ? `${fieldId}-validation` : undefined} />}
                    </div>)}</div></fieldset>;
                  })}</fieldset>
                  {preparation.validation ? <p id={`${fieldId}-validation`} role="alert" className="text-sm text-danger">{preparation.validation.message}</p> : null}
                  {!context.can_generate ? <p role="status" className="text-sm text-muted-foreground">Dossier archivé : l’historique reste consultable, la génération est désactivée.</p> : null}
                </> : null}
              </div>
              <footer className="kay-document-form-footer"><div><span><FileIcon size={16} aria-hidden="true" />Fiche de préparation + modèle vierge</span><small>PDF privé, conservé dans l’historique du dossier.</small></div><Button action={uncertain ? "retry" : "file"} variant="creation" type="submit" disabled={!hydrated || busy || !template || !context.can_generate || changedTemplate}>{busy ? "Préparation du PDF…" : uncertain ? "Récupérer le résultat" : "Générer le PDF"}</Button></footer>
            </div>
          </>}
        </form>
      </TabsContent>
      {preparation.historyVisited ? <TabsContent value="history" forceMount hidden={preparation.tab !== "history"} className="kay-document-history"><PreparedDocumentHistory documents={historyDocuments} presentation="table" /></TabsContent> : null}
    </Tabs>
    <AlertDialog open={Boolean(restartCode)} onOpenChange={open => { if (!open) setRestartCode(undefined); }}><AlertDialogContent><AlertDialogTitle>Commencer une nouvelle préparation ?</AlertDialogTitle><AlertDialogDescription>Le PDF précédent peut déjà être dans l’historique. Cette action abandonne sa récupération ; une prochaine génération pourra créer un autre PDF. Les champs saisis restent disponibles.</AlertDialogDescription><div className="flex flex-wrap justify-end gap-2"><AlertDialogCancel asChild><Button action="cancel" variant="outline">Annuler</Button></AlertDialogCancel><Button action="confirm" onClick={() => { if (restartCode === selectedCode) preparation.restart(); setRestartCode(undefined); }}>Commencer</Button></div></AlertDialogContent></AlertDialog>
  </div>;
}
