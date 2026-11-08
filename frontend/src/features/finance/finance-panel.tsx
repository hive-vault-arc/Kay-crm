"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FinanceIcon } from "@/components/icons";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { useUnsavedGuard } from "@/components/shared/unsaved-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import { dealSchema, type Deal } from "@/features/deals/contracts";
import { useHydrated } from "@/hooks/use-hydrated";
import { ApiError } from "@/lib/api/client";
import { commissionsSchema, mad } from "./contracts";
import { CommissionRecord } from "./commission-record";
import { CommissionReceipts, FinanceHistory } from "./collection";
import { FINANCE_PAGE_SIZE, financeDenied, financePageValid, restoreFinanceReturn, type FinanceReturn, type FinanceSelection } from "./model";
import { TermsForm } from "./terms-form";
import type { Denied, FinanceBinding } from "./mutation";

export function FinancePanel({ deal, actorId, role }: { deal: Deal } & FinanceBinding) { return <FinanceBoundary key={`${deal.id}:${actorId ?? ""}:${role ?? ""}`} deal={deal} binding={{ actorId, role }} />; }
function FinanceBoundary({ deal, binding }: { deal: Deal; binding?: FinanceBinding }) {
  const [denial, setDenial] = useState<{ error: ApiError; acknowledged?: boolean }>(), [generation, setGeneration] = useState(0);
  function retry() { setGeneration(value => value + 1); setDenial(undefined); }
  return denial ? <>{denial.acknowledged ? <p role="status">L’opération est enregistrée. Les droits d’accès ont changé.</p> : null}<RecordError error={denial.error} retry={retry} /></> : <FinanceWorkspace key={generation} deal={deal} binding={binding} onDenied={(error, acknowledged) => setDenial({ error, acknowledged })} />;
}
export function FinanceWorkspace({ deal, onDenied, binding }: { deal: Deal; onDenied: Denied; binding?: FinanceBinding }) {
  const [page, setPage] = useState(1), [selection, setSelection] = useState<FinanceSelection>(), [creating, setCreating] = useState<Deal>(), [denial, setDenial] = useState<ApiError>(), [notice, setNotice] = useState("");
  const [receiptPages, setReceiptPages] = useState<Record<string, number>>({}), [historyPage, setHistoryPage] = useState(1);
  const scope = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null), restore = useRef<FinanceReturn | undefined>(undefined);
  const guard = useUnsavedGuard(), hydrated = useHydrated();
  const parent = useQuery(`/api/v1/deals/${deal.id}`, dealSchema);
  const query = useQuery(`/api/v1/deals/${deal.id}/commissions?page=${page}&page_size=${FINANCE_PAGE_SIZE}`, commissionsSchema);
  const deny = useCallback((error: ApiError, acknowledged?: boolean) => { setDenial(error); setSelection(undefined); setCreating(undefined); setReceiptPages({}); setHistoryPage(1); setNotice(""); restore.current = undefined; onDenied(error, acknowledged); }, [onDenied]);
  const authority = [parent.error, query.error].find(error => error && financeDenied(error));
  // Hide immediately below, then unmount the complete private controller. A retry
  // must start fresh queries rather than remounting an earlier financial draft.
  useEffect(() => { if (!authority) return; let cancelled = false; queueMicrotask(() => { if (!cancelled) deny(authority); }); return () => { cancelled = true; }; }, [authority, deny]);
  const invalid = parent.value && parent.value.id !== deal.id || query.value && (!financePageValid(query.value, page) || query.value.items.some(item => item.deal_id !== deal.id || item.version !== item.current.version));
  const problem = denial ?? authority ?? (invalid ? new ApiError("DEPENDENCY_UNAVAILABLE", 503) : undefined);
  const current = !parent.error && parent.value?.id === deal.id ? parent.value : selection || creating ? creating ?? deal : undefined;
  const writable = Boolean(current && !current.contact.archived_at && !current.archived_at);
  const restoreFocus = useCallback((readyCommissionId?: string) => {
    if (selection || creating || !restore.current) return;
    if (restoreFinanceReturn(scope.current, heading.current, restore.current, readyCommissionId, Boolean(query.value))) restore.current = undefined;
  }, [selection, creating, query.value]);
  useEffect(() => { restoreFocus(); }, [restoreFocus]);
  function remember(id: string | undefined, action: string, receiptId?: string) { restore.current = { id, action, receiptId, scroll: scope.current?.closest<HTMLElement>(".kay-drawer-body")?.scrollTop ?? 0 }; setNotice(""); }
  function close() { setCreating(undefined); setSelection(undefined); }
  function retry() { close(); setNotice(""); restore.current = undefined; parent.refresh(); query.refresh(); setDenial(undefined); }
  function updated() { setNotice("Opération financière enregistrée. Les originaux restent conservés."); query.refresh(); }
  function saved() { updated(); close(); }
  return <div ref={scope} className="grid min-w-0 gap-5">
    {problem ? <RecordError error={problem} retry={retry} /> : !current && !selection && !creating ? parent.error ? <RecordError error={parent.error} retry={parent.refresh} /> : <p role="status">Chargement du contexte financier…</p> : <>
      {selection || creating ? <Button action="back" type="button" variant="quiet" className="justify-self-start" onClick={() => guard.request(close, scope.current ?? undefined)}>Commissions et encaissements</Button> : null}
      {creating ? <TermsForm binding={binding} dealId={creating.id} dealVersion={creating.version} writable={writable} saved={saved} denied={deny} cancel={close} /> : selection ? <CommissionRecord binding={binding} key={`${selection.commission.id}:${selection.mode}:${selection.original?.id ?? "new"}`} initial={selection} dealId={deal.id} contactId={current?.contact.id ?? deal.contact.id} dealVersion={current?.version ?? deal.version} writable={writable} changed={updated} denied={deny} close={close} /> : <><RecordSection title="Commissions" count={!query.error ? query.value?.total : undefined} headingRef={heading} action={writable ? <Button action="create" type="button" disabled={!hydrated} onClick={() => { if (!current) return; remember(undefined, "create"); setCreating(current); }}>Prévoir une commission</Button> : undefined} description="Facultatif : reconnaissance et encaissement sont deux confirmations distinctes.">
        {notice ? <p role="status" className="text-sm text-success">{notice}</p> : null}
        {!writable ? <p className="text-sm text-muted-foreground">Dossier ou contact archivé : la finance est conservée en lecture seule.</p> : null}
        {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des commissions…</p> : <>
          {!query.value.items.length ? <p className="text-sm text-muted-foreground">Aucune commission prévue. Une affaire peut se clôturer sans saisie financière.</p> : <ul className="grid min-w-0 gap-3">{query.value.items.map(item => <li key={item.id} data-finance-id={item.id}><RecordEntry title={mad(item.current.amount_mad)} icon={FinanceIcon} status={<Badge variant="neutral">{item.current.state === "recognized" ? "Reconnue" : "Prévue"}</Badge>} meta={[{ label: "Calcul", value: item.current.kind === "fixed" ? "Commission fixe" : `${item.current.rate_percent} % de ${mad(item.current.base_mad)}` }, { label: "Échéance", value: item.current.due_on ?? "Non renseignée" }, { label: "Encaissé", value: mad(item.collected_mad) }, { label: "Solde reconnu", value: item.balance_mad === null ? "Non reconnu" : mad(item.balance_mad) }]} actions={writable ? <><Button action="edit" type="button" variant="quiet" disabled={!hydrated} onClick={() => { remember(item.id, "edit"); setSelection({ commission: item, mode: "commission" }); }}>Corriger la commission</Button><Button action={item.current.state === "expected" ? "confirm" : "add"} type="button" variant="outline" disabled={!hydrated} onClick={() => { remember(item.id, item.current.state === "expected" ? "confirm" : "add"); setSelection({ commission: item, mode: item.current.state === "expected" ? "recognize" : "receipt" }); }}>{item.current.state === "expected" ? "Reconnaître la commission" : "Ajouter un encaissement"}</Button></> : undefined} related={item.current.state === "recognized" ? <CommissionReceipts value={item} page={receiptPages[item.id] ?? 1} changePage={next => setReceiptPages(pages => ({ ...pages, [item.id]: next }))} writable={writable} denied={deny} ready={restoreFocus} edit={(original, receiptPage) => { remember(item.id, "edit", original.id); setSelection({ commission: item, mode: "receipt", original, receiptPage }); }} /> : undefined}>{item.current.review_required ? <p className="text-sm text-warning">Revue financière requise après réouverture de l’affaire.</p> : null}</RecordEntry></li>)}</ul>}
          {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact page={page} total={query.value.total} size={FINANCE_PAGE_SIZE} change={setPage} label="Pages des commissions" /> : null}
        </>}
      </RecordSection><FinanceHistory dealId={deal.id} page={historyPage} changePage={setHistoryPage} denied={deny} /></>}
    </>}
    {guard.dialog}
  </div>;
}
