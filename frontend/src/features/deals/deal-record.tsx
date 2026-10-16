"use client";
import { PageHeader } from "@/components/shared/page-header";
import { RecordStatusStrip } from "@/components/shared/record-status-strip";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactIcon, ContactsIcon, DealIcon, EnquiryIcon, PropertyIcon, SearchIcon, TaskIcon } from "@/components/icons";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { FilePanel } from "@/features/files/file-panel";
import { OfferingFacts } from "@/features/requirements/offering-card";
import { useHydrated } from "@/hooks/use-hydrated";
import { apiGet, ApiError } from "@/lib/api/client";
import { apiCommand } from "@/lib/api/command";
import { dealSchema, ordinaryStages, resultSchema, stageLabels, type Deal } from "./contracts";
import { CustomerOffers } from "./customer-offers";
import { DealForm } from "./deal-form";
import { DealHistory } from "./deal-history";
import { Pipeline } from "./pipeline";
import { ReservationPanel } from "./reservation-panel";
import { OutcomePanel } from "./outcome-panel";
import { OutcomeHistory } from "./outcome-history";
import { TaskPanel } from "@/features/work/task-panel";
import type { StaffRole } from "@/features/contacts/contracts";
import { DealFinanceTabs } from "@/features/finance/finance-panel";

export function DealRecord({ id, initialTask, role = "agent", initialTab }: { id: string; initialTask?: string; role?: StaffRole; initialTab?: string }) {
  const query = useQuery(`/api/v1/deals/${id}`, dealSchema); const [fresh, setFresh] = useState<Deal>(); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<ApiError>(); const [comparison, setComparison] = useState<Deal>(); const [notice, setNotice] = useState("");
  const lock = useRef(false); const attempt = useRef({ fingerprint: "", key: "" }); const focusEdit = useRef(false); const hydrated = useHydrated(); const value = fresh ?? query.value;
  const restoreFocus = useCallback((node: HTMLButtonElement | null) => { if (node && focusEdit.current) { focusEdit.current = false; node.focus(); } }, []);
  function endEdit() { focusEdit.current = true; setEditing(false); }
  async function reload() { const current = await apiGet(`/api/v1/deals/${id}`, dealSchema); setFresh(current); return current; }
  async function mutate(path: `/api/v1/${string}`, body: unknown, method: "POST" | "PATCH" = "POST") {
    if (lock.current) return false; lock.current = true; setBusy(true); setError(undefined); setNotice(""); setComparison(undefined);
    const fingerprint = JSON.stringify({ path, body, method }); if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try { await apiCommand(path, body, resultSchema, attempt.current.key, method); await reload(); setNotice("Modification enregistrée. L’historique conserve son auteur."); return true; }
    catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  async function compare() { setBusy(true); try { setComparison(await apiGet(`/api/v1/deals/${id}`, dealSchema)); } catch (reason) { setError(reason instanceof ApiError ? reason : new ApiError("DEPENDENCY_UNAVAILABLE", 503)); } finally { setBusy(false); } }
  const heading = <PageHeader title="Affaire" description="Pipeline, prochaine action, propositions client et historique." route={`/deals/${id}`} />;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(error.code)) return <>{heading}<RecordError error={error} /></>;
  if (!value) return <>{heading}<p role="status">Chargement de l’affaire…</p></>;
  const writable = !value.contact.archived_at && (value.stage === "reserved" || ordinaryStages.includes(value.stage as typeof ordinaryStages[number]));
  return <div className="record-stack grid min-w-0 gap-5"><PageHeader title={value.title} description="Affaire · Pipeline, propositions client et historique." route={`/deals/${id}`} /><RecordStatusStrip label="Étapes de l’affaire, lecture seule" current={value.stage} items={Object.entries(stageLabels).map(([id, label]) => ({ id, label }))} />
    <section className="grid min-w-0 gap-5" aria-label="Contact et offre liée"><SectionHeading icon={DealIcon} tone="warning">Contact et offre liée</SectionHeading><RecordFacts>
      <RecordFact icon={ContactIcon} label="Nom du contact"><Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/contacts/${value.contact.id}`}>{value.contact.name}</Link></RecordFact>
      <RecordFact icon={ContactsIcon} label="Responsable actuel">{value.contact.primary_agent.display_name}</RecordFact>
      <RecordFact icon={DealIcon} label="Étape actuelle"><strong>{stageLabels[value.stage]}</strong> · version {value.version}</RecordFact>
      <RecordFact icon={EnquiryIcon} label="Demande d’origine">{value.enquiry_id ? <Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/leads/${value.enquiry_id}`}>Voir la demande d’origine conservée</Link> : "Sans demande d’origine liée."}</RecordFact>
      <RecordFact icon={TaskIcon} label="Prochaine action">{value.next_action || "Non renseignée"}</RecordFact>
      {value.requirement_id ? <RecordFact icon={SearchIcon} label="Recherche liée"><Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/contacts/${value.contact.id}`}>Voir les recherches du contact (recherche liée conservée)</Link></RecordFact> : null}
      {!value.offering ? <RecordFact icon={PropertyIcon} label="Offre d’inventaire">Aucune offre d’inventaire liée.</RecordFact> : null}
    </RecordFacts>
    {value.contact.archived_at ? <p role="status">Contact archivé : affaire et propositions conservées en lecture seule.</p> : null}
    {value.offering ? <section className="grid min-w-0 gap-4" aria-label="Cible actuelle de l’affaire"><SectionHeading as="h3" icon={PropertyIcon} tone="teal">Offre d’inventaire liée</SectionHeading><OfferingFacts offering={value.offering} /></section> : null}</section>
    <DealFinanceTabs role={role} deal={value} initialTab={initialTab} actions={!editing && writable ? <Button action="edit" ref={restoreFocus} type="button" disabled={!hydrated || busy} onClick={() => { setEditing(true); setNotice(""); setError(undefined); }}>Modifier l’affaire et la prochaine action</Button> : undefined}>
    {notice && !editing ? <p role="status" className="text-success">{notice}</p> : null}
    {error ? <section className="grid gap-4" aria-label="Échec de la modification"><RecordError error={error} /><p>Votre saisie reste affichée. Une réponse interrompue peut avoir été enregistrée : réessayez la même action sans la modifier. En cas de conflit, comparez la version actuelle avant une nouvelle tentative.</p><Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void compare()}>Comparer la version actuelle</Button>{comparison ? <div className="grid gap-4 border-y py-4"><p className="wrap-anywhere">Version actuelle {comparison.version} : {comparison.title} · {stageLabels[comparison.stage]}</p><p className="whitespace-pre-wrap wrap-anywhere">Prochaine action actuelle : {comparison.next_action || "Non renseignée"}</p><p>Le chargement remplacera les formulaires affichés. Copiez votre brouillon si vous souhaitez le conserver.</p><Button action="refresh" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setFresh(comparison); setComparison(undefined); setError(undefined); }}>Charger cette version et réinitialiser les formulaires</Button></div> : null}</section> : null}
    <ReservationPanel deal={value} writable={writable && !editing} busy={busy} busyChanged={setBusy} saved={reload} />
    <OutcomePanel deal={value} writable={!value.contact.archived_at && !editing} busy={busy} busyChanged={setBusy} saved={reload} />
    {editing && writable ? <DealForm key={`edit:${value.id}`} value={value} contact={value.contact} busyChanged={setBusy} cancel={endEdit} saved={async () => { await reload(); endEdit(); setNotice("Affaire enregistrée."); }} /> : <><Pipeline key={`pipeline:${value.version}`} deal={value} writable={writable} busy={busy} mutate={mutate} /><CustomerOffers key={`offers:${value.version}`} deal={value} writable={writable} busy={busy} mutate={mutate} /></>}
    <TaskPanel key={value.id} contactId={value.contact.id} dealId={value.id} writable={!value.contact.archived_at} initialTask={initialTask} />
    <OutcomeHistory key={`outcomes:${value.version}`} id={value.id} /><DealHistory key={`history:${value.version}`} id={value.id} /><FilePanel parentKind="deal" parentId={value.id} writable={writable && !busy} />
    </DealFinanceTabs>
    <Button action="back" asChild variant="outline" className="justify-self-start"><Link href="/deals">Toutes les affaires</Link></Button>
  </div>;
}
