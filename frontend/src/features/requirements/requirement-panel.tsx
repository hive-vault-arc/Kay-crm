"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contactSchema } from "@/features/contacts/contracts";
import { activityLabels, dealActivityLabels, timelineSchema } from "@/features/contacts/ownership-contracts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { formatInstant, formatMAD } from "@/lib/format";
import { detailSchema, requirementsSchema, type RequirementSummary } from "./contracts";
import { readRequirement, REQUIREMENT_PAGE_SIZE, requirementDenied, requirementPageValid, restoreRequirementReturn, validRequirement, type RequirementReturn, type RequirementSelection } from "./model";
import { OfferingFacts } from "./offering-card";
import { RequirementFacts } from "./requirement-facts";
import { RequirementForm } from "./requirement-form";
import { ShortlistForm } from "./shortlist-form";
import type { RequirementDenied, RequirementResult, RequirementSaved } from "./use-requirement-command";

export function RequirementPanel(props: { contactId: string; writable: boolean; compact?: boolean }) { return <RequirementBoundary key={props.contactId} {...props} />; }
function RequirementBoundary(props: { contactId: string; writable: boolean; compact?: boolean }) {
  const [denial, setDenial] = useState<ApiError>(), [generation, setGeneration] = useState(0);
  return denial ? <RecordError error={denial} retry={() => { setGeneration(value => value + 1); setDenial(undefined); }} /> : <RequirementContext key={generation} {...props} denied={setDenial} />;
}
function RequirementContext({ contactId, writable, compact, denied }: { contactId: string; writable: boolean; compact?: boolean; denied: RequirementDenied }) {
  const parent = useQuery(`/api/v1/contacts/${contactId}`, contactSchema);
  const authority = parent.error && requirementDenied(parent.error) ? parent.error : undefined;
  useEffect(() => { if (authority) denied(authority); }, [authority, denied]);
  return parent.error ? <RecordError error={parent.error} retry={parent.refresh} /> : !parent.value ? <p role="status">Chargement du contact et de ses recherches…</p> : <RequirementWorkspace key={parent.value.id} contactId={parent.value.id} writable={writable && !parent.value.archived_at} compact={compact} denied={denied} />;
}
export function RequirementWorkspace({ contactId, writable, compact = false, denied }: { contactId: string; writable: boolean; compact?: boolean; denied: RequirementDenied }) {
  const [page, setPage] = useState(1), [historyPage, setHistoryPage] = useState(1), [revision, setRevision] = useState(0), [selection, setSelection] = useState<RequirementSelection>(), [notice, setNotice] = useState("");
  const scope = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), restore = useRef<RequirementReturn | undefined>(undefined), hydrated = useHydrated();
  const query = useQuery(queryPath("requirements", { contact_id: contactId, page, page_size: REQUIREMENT_PAGE_SIZE }), requirementsSchema, revision);
  const invalid = query.value && (!requirementPageValid(query.value, page) || query.value.items.some(item => item.contact_id !== contactId));
  const authority = query.error && requirementDenied(query.error) ? query.error : undefined;
  useEffect(() => { if (authority) denied(authority); }, [authority, denied]);
  const restoreFocus = useCallback((readyId?: string) => { if (!selection && restore.current && restoreRequirementReturn(scope.current, heading.current, restore.current, readyId, Boolean(query.value))) restore.current = undefined; }, [selection, query.value]);
  useEffect(() => { restoreFocus(); }, [restoreFocus]);
  function open(value: RequirementSelection, action: string) { if (!hydrated || !writable) return; restore.current = { id: value.id, offeringId: value.offeringId, action, scroll: scope.current?.closest<HTMLElement>(".kay-drawer-body")?.scrollTop ?? 0 }; setSelection(value); setNotice(""); }
  function close() { setSelection(undefined); }
  async function saved(result: RequirementResult, signal: AbortSignal) {
    const current = await readRequirement(result.id, contactId, signal);
    if (current.version < result.version) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
    if (signal.aborted) return;
    close(); setNotice("Recherche, sélection ou avis enregistré."); setRevision(value => value + 1); query.refresh();
  }
  return <div ref={scope} className={compact ? "grid min-w-0 gap-4" : "grid min-w-0 gap-5"}>
    {authority ? <RecordError error={authority} /> : selection ? selection.id ? <RequirementEditor key={`${selection.id}:${selection.mode}:${selection.offeringId ?? "new"}`} selection={selection} contactId={contactId} writable={writable} denied={denied} saved={saved} cancel={close} /> : <RequirementForm contactId={contactId} writable={writable} denied={denied} saved={saved} cancel={close} /> : <>
      <RecordSection title="Recherches du contact" count={!query.error && !invalid ? query.value?.total : undefined} headingRef={heading} action={writable ? <Button action="create" type="button" disabled={!hydrated || !query.value || Boolean(query.error) || Boolean(invalid)} onClick={() => open({ mode: "edit" }, "create")}>Nouvelle recherche</Button> : undefined} description="Chaque recherche garde ses propres critères, offres sélectionnées et avis.">
        {!writable ? <p className="text-sm text-muted-foreground">Recherches conservées en lecture seule pour ce dossier.</p> : null}{notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
        {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des recherches…</p> : <>
          {query.value.items.length ? <ul className="grid min-w-0 gap-3">{query.value.items.map(item => <li key={item.id} data-requirement-id={item.id}><RecordEntry title={item.title} icon={SearchIcon} status={<Badge variant="neutral">{item.intent === "sale" ? "Achat" : "Location"}</Badge>} meta={[{ label: "Budget d’origine", value: <>De {formatMAD(item.budget_min_mad)} à {formatMAD(item.budget_max_mad)}{item.budget_period === "month" ? " / mois" : item.budget_period === "year" ? " / an" : ""}</> }, ...(item.intent === "rental" ? [{ label: "Comparaison annuelle", value: <>De {formatMAD(item.annual_budget_min_mad)} à {formatMAD(item.annual_budget_max_mad)}</> }] : [])]} actions={writable ? <><Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => open({ id: item.id, mode: "edit" }, "edit")}>Modifier</Button><Button action="select" type="button" variant="outline" disabled={!hydrated} onClick={() => open({ id: item.id, mode: "shortlist" }, "select")}>Sélectionner une offre</Button><Button action="create" variant="quiet" asChild><Link href={`/deals/new?contact_id=${contactId}&requirement_id=${item.id}`}>Créer une affaire</Link></Button></> : undefined} related={item.shortlist_count ? <RequirementShortlist key={item.id} value={item} contactId={contactId} writable={writable} denied={denied} revision={revision} ready={restoreFocus} edit={offeringId => open({ id: item.id, mode: "shortlist", offeringId }, "edit")} /> : undefined}>{item.criteria.some(criterion => criterion.value !== null) ? <RequirementFacts compact value={item} /> : null}</RecordEntry></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucune recherche sur cette page. Ajoutez un besoin d’achat ou de location pour commencer.</p>}
          {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={query.value.total} size={REQUIREMENT_PAGE_SIZE} change={setPage} label="Pages des recherches" /> : null}
        </>}
      </RecordSection><RequirementHistory contactId={contactId} page={historyPage} changePage={setHistoryPage} denied={denied} revision={revision} />
    </>}
  </div>;
}
export function RequirementEditor({ selection, contactId, writable, denied, saved, cancel }: { selection: RequirementSelection; contactId: string; writable: boolean; denied: RequirementDenied; saved: RequirementSaved; cancel: () => void }) {
  const query = useQuery(`/api/v1/requirements/${selection.id}`, detailSchema);
  const invalid = query.value && (!validRequirement(query.value, selection.id!, contactId) || Boolean(selection.offeringId && !query.value.shortlist.some(item => item.offering.id === selection.offeringId)));
  useEffect(() => { if (query.error && requirementDenied(query.error)) denied(query.error); }, [query.error, denied]);
  return query.error || invalid ? <div className="grid min-w-0 gap-4"><RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /><Button action="back" type="button" variant="quiet" onClick={cancel}>Retour aux recherches</Button></div> : !query.value ? <div className="grid min-w-0 gap-4"><p role="status">Chargement de la recherche actuelle…</p><Button action="back" type="button" variant="quiet" onClick={cancel}>Retour aux recherches</Button></div> : selection.mode === "edit" ? <RequirementForm contactId={contactId} value={query.value} writable={writable} saved={saved} denied={denied} cancel={cancel} /> : <ShortlistForm value={query.value} originalId={selection.offeringId} writable={writable} saved={saved} denied={denied} cancel={cancel} />;
}
export function RequirementShortlist({ value, contactId, writable, denied, edit, ready, revision }: { value: RequirementSummary; contactId: string; writable: boolean; denied: RequirementDenied; edit: (id: string) => void; ready: (id: string) => void; revision: number }) {
  const hydrated = useHydrated(), query = useQuery(`/api/v1/requirements/${value.id}`, detailSchema, revision);
  const invalid = query.value && (!validRequirement(query.value, value.id, contactId) || query.value.version < value.version);
  useEffect(() => { if (query.error && requirementDenied(query.error)) denied(query.error); }, [query.error, denied]);
  useEffect(() => { if (query.value || query.error) ready(value.id); }, [query.value, query.error, value.id, ready]);
  return <section className="grid min-w-0 gap-3" aria-label={`Offres sélectionnées · ${value.title}`}>
    {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de la sélection…</p> : <><h4 className="text-sm font-medium">Offres sélectionnées · {query.value.shortlist_count}</h4><ul className="grid min-w-0 gap-4">{query.value.shortlist.map(item => <li key={item.offering.id} data-shortlist-id={item.offering.id} className="border-t pt-4 first:border-0 first:pt-0"><RecordEntry variant="related" title={item.offering.target?.label || item.offering.target?.reference || "Offre sélectionnée"} status={<Badge variant="neutral">{item.offering.kind === "sale" ? "Vente" : item.offering.kind === "rental" ? "Location" : "Vacances"}</Badge>} meta={[{ label: "Référence", value: item.offering.target?.reference || "Non vérifiable" }]} actions={writable ? <><Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => { if (hydrated && writable) edit(item.offering.id); }}>Modifier l’avis / retirer</Button><Button action="create" variant="quiet" asChild><Link href={`/deals/new?contact_id=${contactId}&requirement_id=${value.id}&offering_id=${item.offering.id}`}>Créer une affaire avec cette offre</Link></Button></> : undefined}><p className="whitespace-pre-wrap wrap-anywhere">{item.feedback || "Sans avis enregistré."}</p><details className="kay-entry-note"><summary>Détails de l’offre exacte</summary><div className="pt-3"><OfferingFacts offering={item.offering} /></div></details></RecordEntry></li>)}</ul>{!query.value.shortlist.length ? <p className="text-sm text-muted-foreground">Aucune offre sélectionnée.</p> : null}</>}
  </section>;
}
export function RequirementHistory({ contactId, page, changePage, denied, revision }: { contactId: string; page: number; changePage: (page: number) => void; denied: RequirementDenied; revision: number }) {
  const query = useQuery(`/api/v1/contacts/${contactId}/timeline?page=${page}&page_size=${REQUIREMENT_PAGE_SIZE}`, timelineSchema, revision);
  const invalid = query.value && (!requirementPageValid(query.value, page) || query.value.items.some(item => item.contact_id !== contactId));
  useEffect(() => { if (query.error && requirementDenied(query.error)) denied(query.error); }, [query.error, denied]);
  if (!query.error && !invalid && query.value?.total === 0 && page === 1) return null;
  return <RecordSection title="Historique du dossier" label="Historique du contact" description="Modifications et activités de ce contact." count={!query.error && !invalid ? query.value?.total : undefined}>
    {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique du contact…</p> : <><ol className="grid min-w-0 gap-3">{query.value.items.map(item => <li key={item.id}><RecordEntry title={activityLabels[item.action] ?? dealActivityLabels[item.action as keyof typeof dealActivityLabels] ?? item.action} icon={SearchIcon} meta={[{ label: "Date", value: formatInstant(item.occurred_at) }, { label: "Auteur", value: item.actor.display_name }]}>{item.body ? <p className="whitespace-pre-wrap wrap-anywhere">{item.body}</p> : null}{item.reason ? <p className="whitespace-pre-wrap wrap-anywhere">{item.reason}</p> : null}</RecordEntry></li>)}</ol>{!query.value.items.length ? <p className="text-sm text-muted-foreground">Aucun événement sur cette page.</p> : null}{query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={query.value.total} size={REQUIREMENT_PAGE_SIZE} change={changePage} label="Pages de l’historique du contact" /> : null}</>}
  </RecordSection>;
}
