"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CalendarIcon, ContactIcon, ContactsIcon, FinanceIcon, InboxIcon, RadioIndicatorIcon } from "@/components/icons";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { RecordSection, RecordWorkspace } from "@/components/shared/record-workspace";
import { useDossierDraft } from "@/components/shared/dossier-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RecordError } from "@/features/contacts/record-states";
import { statusLabels } from "@/features/contacts/contracts";
import { ratingLabels } from "@/features/contacts/qualification-contracts";
import { stageLabels } from "@/features/deals/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { formatInstant } from "@/lib/format";
import { coverageProof, coverageView, noteBody, noteReceipt, type CoverageKind } from "./contracts";
import { HandoffSection } from "./coverage-notes";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}
const getProof = () => window.location.hash.slice(1);
const initialProof = () => "";
const failure = (cause: unknown) => cause instanceof ApiError ? cause : new ApiError("DEPENDENCY_UNAVAILABLE", 503);

export function CoverageRecord({ kind, id }: { kind: CoverageKind; id: string }) {
  const proof = useSyncExternalStore(subscribe, getProof, initialProof);
  const hydrated = useHydrated();
  const parsed = coverageProof.safeParse(proof);
  if (!hydrated) return <p role="status">Chargement du dossier…</p>;
  if (!parsed.success) return <CoverageUnavailable />;
  return <CoverageRecordLifetime key={`${id}:${parsed.data}`} kind={kind} id={id} proof={parsed.data} />;
}

function CoverageUnavailable() {
  return <div className="grid min-w-0 gap-3">
    <PageHeader title="Dossier indisponible" description="Recherchez de nouveau le numéro complet du contact depuis la recherche globale." />
    <Button action="search" asChild variant="outline" className="justify-self-start"><Link href="/search">Ouvrir la recherche</Link></Button>
  </div>;
}

function CoverageRecordLifetime({ kind, id, proof }: { kind: CoverageKind; id: string; proof: string }) {
  const path = `/api/v1/coverage/${kind}/${id}` as const;
  const [data, setData] = useState<typeof coverageView._output>();
  const [readError, setReadError] = useState<ApiError>();
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void apiCommand(`${path}/view`, { proof }, coverageView, crypto.randomUUID(), "POST", undefined, controller.signal).then(value => {
      if (!controller.signal.aborted) { setData(value); setReadError(undefined); }
    }, cause => {
      if (!controller.signal.aborted) { setData(undefined); setReadError(failure(cause)); }
    });
    return () => controller.abort();
  }, [path, proof, revision]);
  if (readError && [401, 403, 404].includes(readError.status)) return <CoverageUnavailable />;
  if (readError) return <RecordError error={readError} retry={() => setRevision(current => current + 1)} />;
  if (!data) return <p role="status">Chargement du dossier…</p>;
  const isDeal = kind === "deals";
  const state = isDeal ? stageLabels[data.status as keyof typeof stageLabels] : statusLabels[data.status as keyof typeof statusLabels];
  return <div className="kay-record-page kay-sales-record kay-handoff-record">
    <PageHeader title={data.title} description={isDeal ? "Affaire · Lecture seule" : "Prospect · Lecture seule"} />
    <RecordWorkspace hideSingleTab label="Dossier en lecture seule" tabs={[{ id: "overview", label: "Aperçu", content: <>
      <RecordSection title="Contexte du dossier">
        <RecordFacts>
          {isDeal ? <RecordFact icon={ContactIcon} label="Contact">{data.contact}</RecordFact> : null}
          <RecordFact icon={ContactsIcon} label="Agent responsable">{data.responsible}</RecordFact>
          <RecordFact icon={RadioIndicatorIcon} label={isDeal ? "Étape" : "Statut"}>{state ?? data.status}</RecordFact>
          <RecordFact icon={RadioIndicatorIcon} label="Qualification">{ratingLabels[data.rating]}</RecordFact>
          <RecordFact icon={FinanceIcon} label="Budget">{data.budget ?? "Non renseigné"}</RecordFact>
          <RecordFact icon={CalendarIcon} label="Mis à jour">{formatInstant(data.updated_at)}</RecordFact>
        </RecordFacts>
        {data.context ? <RecordFacts columns={1}><RecordFact icon={InboxIcon} label={isDeal ? "Action prévue" : "Message"}><span className="whitespace-pre-wrap wrap-anywhere">{data.context}</span></RecordFact></RecordFacts> : null}
        {data.detail ? <RecordFacts columns={1}><RecordFact icon={InboxIcon} label="Notes du dossier"><span className="whitespace-pre-wrap wrap-anywhere">{data.detail}</span></RecordFact></RecordFacts> : null}
      </RecordSection>
      {data.activities.length ? <RecordSection title="Derniers échanges"><ul className="grid min-w-0 gap-3">{data.activities.map(item => <li key={item.id} className="border-b pb-3">
        <p className="flex flex-wrap gap-x-2 text-sm"><strong>{item.author_name}</strong><time dateTime={item.created_at} className="text-muted-foreground">{formatInstant(item.created_at)}</time></p>
        <p className="whitespace-pre-wrap wrap-anywhere">{item.body}</p>
      </li>)}</ul></RecordSection> : null}
      <HandoffSection items={data.items}><NewNote path={path} proof={proof} onSaved={() => setRevision(value => value + 1)} /></HandoffSection>
    </> }]} />
  </div>;
}

function NewNote({ path, proof, onSaved }: { path: `/api/v1/${string}`; proof: string; onSaved: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<ApiError>();
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [saved, setSaved] = useState(false);
  const draft = useDossierDraft(text, busy || retrying);
  const attempt = useRef<{ key: string; body: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (request.current) return;
    const valid = noteBody.safeParse(text);
    if (!valid.success) { setError(new ApiError("VALIDATION_ERROR", 422)); return; }
    const command = attempt.current ?? { key: crypto.randomUUID(), body: valid.data };
    attempt.current = command;
    const controller = new AbortController();
    request.current = controller;
    setError(undefined); setBusy(true); setSaved(false);
    try {
      await apiCommand(`${path}/notes`, { proof, body: command.body }, noteReceipt, command.key, "POST", undefined, controller.signal);
      if (controller.signal.aborted) return;
      attempt.current = null;
      setRetrying(false); setSaved(true); draft.accept(""); setText(""); onSaved();
    } catch (cause) {
      if (controller.signal.aborted) return;
      const problem = failure(cause);
      const uncertain = problem.status >= 500 || problem.code === "INVALID_RESPONSE";
      setRetrying(uncertain);
      if (!uncertain) attempt.current = null;
      setError(problem);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <form className="grid min-w-0 gap-2" data-draft-managed data-live-dirty={draft.dirty || retrying || undefined} aria-busy={busy} onSubmit={event => void submit(event)}>
    <Label htmlFor={id}>Ajouter une note pour l’agent responsable</Label>
    <Textarea id={id} rows={4} required maxLength={4000} value={text} readOnly={busy || retrying} onChange={event => { setText(event.target.value); setSaved(false); }} />
    {error ? <RecordError error={error} /> : null}
    {saved ? <p role="status" className="text-success">Note enregistrée.</p> : null}
    <Button action={retrying ? "retry" : "add"} type="submit" className="justify-self-start" disabled={busy || !text.trim()}>{busy ? "Enregistrement…" : retrying ? "Réessayer l’envoi" : "Ajouter la note"}</Button>
  </form>;
}
