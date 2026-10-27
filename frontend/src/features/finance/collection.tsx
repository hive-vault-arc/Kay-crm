"use client";
import { useEffect } from "react";
import { FinanceIcon } from "@/components/icons";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { localLabel } from "@/features/schedule/time";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { financeHistorySchema, mad, receiptsSchema, revisionLabels, type Commission, type Receipt } from "./contracts";
import { FINANCE_PAGE_SIZE, financeDenied, financePageValid } from "./model";
import type { Denied } from "./mutation";

export function CommissionReceipts({ value, page, changePage, writable, denied, edit, ready }: { value: Commission; page: number; changePage: (page: number) => void; writable: boolean; denied: Denied; edit: (original: Receipt, page: number) => void; ready: (commissionId: string) => void }) {
  const hydrated = useHydrated(), query = useQuery(`/api/v1/commissions/${value.id}/receipts?page=${page}&page_size=${FINANCE_PAGE_SIZE}`, receiptsSchema);
  const invalid = query.value && (!financePageValid(query.value, page) || query.value.items.some(item => item.commission_id !== value.id));
  useEffect(() => { if (query.error && financeDenied(query.error)) denied(query.error); }, [query.error, denied]);
  useEffect(() => { if (query.value || query.error) ready(value.id); }, [query.value, query.error, value.id, ready]);
  return <section className="grid min-w-0 gap-3" aria-label="Encaissements et corrections">
    {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des encaissements…</p> : <>
      {query.value.items.length ? <ul className="grid min-w-0 gap-4">{query.value.items.map(item => <li key={item.id} data-finance-receipt-id={item.id} className="border-t pt-4 first:border-0 first:pt-0"><RecordEntry variant="related" title={item.amount_mad ? mad(item.amount_mad) : "Versement annulé"} status={<Badge variant="neutral">{!item.valid ? "Remplacé ou annulé" : "Valide"}</Badge>} meta={[{ label: "Reçu le", value: item.received_on }, { label: "Auteur", value: item.actor.display_name }, { label: "Origine", value: item.supersedes_id ? "Remplacement lié à l’original" : "Versement d’origine" }, { label: "Justificatif", value: item.evidence_document_id ? "Version protégée conservée" : "Sans justificatif" }]} actions={writable && item.valid ? <Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => { if (hydrated && writable && item.valid) edit(item, page); }}>Corriger cet encaissement</Button> : undefined}><p className="whitespace-pre-wrap wrap-anywhere">{item.reason}</p></RecordEntry></li>)}</ul> : <p className="text-sm text-muted-foreground">Aucun versement enregistré.</p>}
      {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={query.value.total} size={FINANCE_PAGE_SIZE} change={changePage} label="Pages des encaissements" /> : null}
    </>}
  </section>;
}

export function FinanceHistory({ dealId, page, changePage, denied }: { dealId: string; page: number; changePage: (page: number) => void; denied: Denied }) {
  const query = useQuery(`/api/v1/deals/${dealId}/finance-history?page=${page}&page_size=${FINANCE_PAGE_SIZE}`, financeHistorySchema);
  const invalid = query.value && (!financePageValid(query.value, page) || query.value.items.some(item => item.deal_id !== dealId));
  useEffect(() => { if (query.error && financeDenied(query.error)) denied(query.error); }, [query.error, denied]);
  if (!query.error && !invalid && query.value?.total === 0 && page === 1) return null;
  return <RecordSection title="Historique du dossier" label="Historique financier" count={!query.error && !invalid ? query.value?.total : undefined} description="Commissions, encaissements et revues de cette affaire.">
    {query.error || invalid ? <RecordError error={query.error ?? new ApiError("DEPENDENCY_UNAVAILABLE", 503)} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique financier…</p> : <>
      <ol className="grid min-w-0 gap-3">{query.value.items.map(item => <li key={item.id}><RecordEntry title={revisionLabels[item.action]} icon={FinanceIcon} meta={[{ label: "Montant", value: mad(item.amount_mad) }, { label: "Auteur", value: item.actor.display_name }, { label: "Date", value: localLabel(item.created_local) }, { label: "Version", value: item.version }]}><p className="whitespace-pre-wrap wrap-anywhere">{item.reason || "Sans motif complémentaire."}</p><details className="kay-entry-note"><summary>Détails conservés</summary><dl className="kay-entry-meta"><div><dt>Base</dt><dd>{mad(item.base_mad)}</dd></div><div><dt>Calcul</dt><dd>{item.kind === "fixed" ? "Commission fixe" : `${item.rate_percent} %`}</dd></div><div><dt>État</dt><dd>{item.state === "recognized" ? "Reconnue" : "Prévue"}</dd></div><div><dt>Échéance</dt><dd>{item.due_on ?? "Non renseignée"}</dd></div><div><dt>Identifiant commission</dt><dd>{item.commission_id}</dd></div></dl>{item.review_required ? <p>Revue demandée après réouverture de l’affaire.</p> : null}</details></RecordEntry></li>)}</ol>
      {!query.value.items.length ? <p className="text-sm text-muted-foreground">Aucun événement sur cette page.</p> : null}
      {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={query.value.total} size={FINANCE_PAGE_SIZE} change={changePage} label="Pages de l’historique financier" /> : null}
    </>}
  </RecordSection>;
}
