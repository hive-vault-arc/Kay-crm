"use client";
import { PageHeader } from "@/components/shared/page-header";
import { CrmRecordHeader, CrmStatusBadge, CrmStatusBoard } from "@/components/shared/crm-presentation";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { SectionHeading } from "@/components/shared/section-heading";
import { DealIcon, EnquiryIcon, FinanceIcon, InboxIcon, PropertyIcon, RadioIndicatorIcon, SearchIcon, TaskIcon } from "@/components/icons";
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
import { campaignLabels, purchaseReasonLabels, ratingLabels } from "@/features/contacts/qualification-contracts";
import { paymentLabels } from "./qualification-contracts";
import { ContactProfilePanel } from "@/features/contacts/contact-profile-panel";
import { ActivityHistory } from "@/features/activities/activity-history";

export function DealRecord({ id, initialTask, role = "agent", initialTab }: { id: string; initialTask?: string; role?: StaffRole; initialTab?: string }) {
  const query = useQuery(`/api/v1/deals/${id}`, dealSchema); const [fresh, setFresh] = useState<Deal>(); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<ApiError>(); const [comparison, setComparison] = useState<Deal>(); const [notice, setNotice] = useState("");
  const lock = useRef(false); const attempt = useRef({ fingerprint: "", key: "" }); const focusEdit = useRef(false); const hydrated = useHydrated(); const value = (fresh && (!query.value || fresh.version >= query.value.version) ? fresh : query.value);
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
  const returnLink = <Button action="back" asChild variant="quiet" size="compact" className="justify-self-start"><Link href="/deals">Retour aux affaires</Link></Button>;
  const heading = <div className="grid min-w-0 justify-items-start gap-2">{returnLink}<PageHeader title="Affaire" description="Pipeline, prochaine action, propositions client et historique." route={`/deals/${id}`} /></div>;
  if (query.error) return <>{heading}<RecordError error={query.error} retry={query.refresh} /></>;
  if (error && ["NOT_FOUND", "FORBIDDEN", "UNAUTHENTICATED", "CONTACT_ARCHIVED"].includes(error.code)) return <>{heading}<RecordError error={error} /></>;
  if (!value) return <>{heading}<p role="status">Chargement de l’affaire…</p></>;
  const writable = !value.contact.archived_at && (value.stage === "reserved" || ordinaryStages.includes(value.stage as typeof ordinaryStages[number]));
  if (editing && writable) return <div className="grid min-w-0 gap-4"><PageHeader icon={DealIcon} title="Modifier l’affaire" description={value.contact.name} route={`/deals/${id}`} /><DealForm key={`edit:${value.id}`} value={value} contact={value.contact} denied={setError} busyChanged={setBusy} cancel={endEdit} saved={async () => { await reload(); endEdit(); setNotice("Affaire enregistrée."); }} /></div>;
  return <div className="record-stack crm-record-view grid min-w-0 gap-4">{returnLink}<CrmRecordHeader contact={value.contact} title={value.title} route={`/deals/${id}`} badges={<><CrmStatusBadge state={value.stage}>{stageLabels[value.stage]}</CrmStatusBadge><CrmStatusBadge state={value.rating} dot={false}>{ratingLabels[value.rating]}</CrmStatusBadge></>} actions={<><Button action="file" asChild variant="outline"><Link href={`/deals/${id}/documents`}>Documents et PDF</Link></Button>{writable ? <Button action="edit" variant="outline" ref={restoreFocus} type="button" disabled={!hydrated || busy} onClick={() => { setEditing(true); setNotice(""); setError(undefined); }}>Modifier l’affaire et la prochaine action</Button> : null}</>} />
    <div className="crm-record-layout" role="region" aria-label="Contact et offre liée"><ContactProfilePanel contact={value.contact} /><div className="crm-record-primary"><CrmStatusBoard title="Étape de l’affaire" label="Étapes de l’affaire, lecture seule" current={value.stage} splitAt={4} items={Object.entries(stageLabels).map(([id, label]) => ({ id, label }))} />
    <section className="crm-panel crm-detail-facts" aria-label="Qualification et suivi"><SectionHeading compact icon={DealIcon}>Qualification et suivi</SectionHeading><RecordFacts columns={2}>
      <RecordFact icon={TaskIcon} label="Prochaine action">{value.next_action || "Non renseignée"}</RecordFact>
      <RecordFact icon={TaskIcon} label="Notes">{value.notes || "Non renseignées"}</RecordFact>
      <RecordFact icon={FinanceIcon} label="Budget">{value.initial_budget || "Non renseigné"}</RecordFact>
      <RecordFact icon={DealIcon} label="Motifs d’achat">{value.purchase_reasons.map(code => purchaseReasonLabels[code]).join(", ") || "Non renseignés"}</RecordFact>
      <RecordFact icon={PropertyIcon} label="Projets">{value.projects.map(project => project.name).join(" · ") || "Non renseignés"}</RecordFact>
      <RecordFact icon={InboxIcon} label="Source">{campaignLabels[value.campaign_source]}</RecordFact>
      <RecordFact icon={RadioIndicatorIcon} label="Qualification">{ratingLabels[value.rating]}</RecordFact>
      <RecordFact icon={FinanceIcon} label="Financement">{value.payment_method ? paymentLabels[value.payment_method as keyof typeof paymentLabels] ?? value.payment_method : "Non renseigné"}</RecordFact>
      <RecordFact icon={PropertyIcon} label="Nombre de pièces">{value.number_of_rooms ?? "Non renseigné"}</RecordFact>
      <RecordFact icon={DealIcon} label="Étape actuelle"><strong>{stageLabels[value.stage]}</strong> · version {value.version}</RecordFact>
      <RecordFact icon={EnquiryIcon} label="Demande d’origine">{value.enquiry_id ? <Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/leads/${value.enquiry_id}`}>Voir la demande d’origine conservée</Link> : "Sans demande d’origine liée."}</RecordFact>
      {value.requirement_id ? <RecordFact icon={SearchIcon} label="Recherche liée"><Link className="inline-flex min-h-control items-center wrap-anywhere text-link underline" href={`/contacts/${value.contact.id}`}>Voir les recherches du contact (recherche liée conservée)</Link></RecordFact> : null}
      {!value.offering ? <RecordFact icon={PropertyIcon} label="Offre d’inventaire">Aucune offre d’inventaire liée.</RecordFact> : null}
    </RecordFacts></section>
    {value.contact.archived_at ? <p role="status">Contact archivé : affaire et propositions conservées en lecture seule.</p> : null}
    {value.offering ? <section className="surface grid min-w-0 gap-4" aria-label="Cible actuelle de l’affaire"><SectionHeading compact as="h3" icon={PropertyIcon} tone="teal">Offre d’inventaire liée</SectionHeading><OfferingFacts offering={value.offering} /></section> : null}</div></div>
    <DealFinanceTabs role={role} deal={value} initialTab={initialTab}>
    <ActivityHistory key={`activities:${value.id}:${value.version}`} scope="deals" id={value.id} writable={!value.contact.archived_at} />
    {value.enquiry_id ? <ActivityHistory key={`origin:${value.id}`} scope="deals" id={value.id} origin /> : null}
    {notice && !editing ? <p role="status" className="text-success">{notice}</p> : null}
    {error ? <section className="grid gap-4" aria-label="Échec de la modification"><RecordError error={error} /><p>Votre saisie reste affichée. Une réponse interrompue peut avoir été enregistrée : réessayez la même action sans la modifier. En cas de conflit, comparez la version actuelle avant une nouvelle tentative.</p><Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={busy} onClick={() => void compare()}>Comparer la version actuelle</Button>{comparison ? <div className="grid gap-4 border-y py-4"><p className="wrap-anywhere">Version actuelle {comparison.version} : {comparison.title} · {stageLabels[comparison.stage]}</p><p className="whitespace-pre-wrap wrap-anywhere">Prochaine action actuelle : {comparison.next_action || "Non renseignée"}</p><p>Le chargement remplacera les formulaires affichés. Copiez votre brouillon si vous souhaitez le conserver.</p><Button action="refresh" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal" onClick={() => { setFresh(comparison); setComparison(undefined); setError(undefined); }}>Charger cette version et réinitialiser les formulaires</Button></div> : null}</section> : null}
    <div className="crm-record-grid"><ReservationPanel deal={value} writable={writable && !editing} busy={busy} busyChanged={setBusy} saved={reload} />
    <OutcomePanel deal={value} writable={!value.contact.archived_at && !editing} busy={busy} busyChanged={setBusy} saved={reload} /></div>
    <Pipeline key={`pipeline:${value.version}`} deal={value} writable={writable} busy={busy} mutate={mutate} /><CustomerOffers key={`offers:${value.version}`} deal={value} writable={writable} busy={busy} mutate={mutate} />
    <TaskPanel key={value.id} contactId={value.contact.id} dealId={value.id} writable={!value.contact.archived_at} initialTask={initialTask} />
    <OutcomeHistory key={`outcomes:${value.version}`} id={value.id} /><DealHistory key={`history:${value.version}`} id={value.id} /><FilePanel parentKind="deal" parentId={value.id} writable={writable && !busy} />
    </DealFinanceTabs>
    <Button action="back" asChild variant="outline" className="justify-self-start"><Link href="/deals">Toutes les affaires</Link></Button>
  </div>;
}
