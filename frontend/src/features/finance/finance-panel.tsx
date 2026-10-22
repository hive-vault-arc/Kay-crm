"use client";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { useQuery } from "@/features/contacts/use-query";
import type { StaffRole } from "@/features/contacts/contracts";
import type { Deal } from "@/features/deals/contracts";
import { ApiError } from "@/lib/api/client";
import { commissionsSchema, mad } from "./contracts";
import { CommissionRecord } from "./commission-record";
import { TermsForm } from "./terms-form";

export function DealFinanceTabs({ role, deal, initialTab, children, actions }: { role: StaffRole; deal: Deal; initialTab?: string; children: ReactNode; actions?: ReactNode }) {
  const [tab, setTab] = useState(initialTab === "finance" ? "finance" : "dossier");
  if (role === "agent") return <>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}{children}</>;
  return <Tabs value={tab} onValueChange={setTab} className="grid min-w-0 gap-4"><div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><TabsList aria-label="Rubriques de l’affaire"><TabsTrigger value="dossier">Dossier</TabsTrigger><TabsTrigger value="finance">Finance</TabsTrigger></TabsList>{tab === "dossier" ? actions : null}</div><TabsContent value="dossier" className="record-stack grid min-w-0 gap-8">{children}</TabsContent><TabsContent value="finance" className="record-stack"><FinancePanel key={deal.id} deal={deal} /></TabsContent></Tabs>;
}
function FinancePanel({ deal }: { deal: Deal }) {
  const [page, setPage] = useState(1), [selected, setSelected] = useState<string>(), [creating, setCreating] = useState(false), [denial, setDenial] = useState<ApiError>();
  const heading = useRef<HTMLHeadingElement>(null), deny = useCallback((error: ApiError) => setDenial(error), []);
  const query = useQuery(`/api/v1/deals/${deal.id}/commissions?page=${page}`, commissionsSchema);
  if (denial) return <RecordError error={denial} retry={() => { query.refresh(); setDenial(undefined); }} />;
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  function close() { setCreating(false); setSelected(undefined); heading.current?.focus(); }
  return <section className="grid min-w-0 gap-6" aria-label="Finance de l’affaire"><h2 ref={heading} tabIndex={-1} className="text-section font-medium">Commissions et encaissements</h2><p>Facultatif : une affaire se clôture sans commission. Reconnaissance et encaissement sont deux confirmations distinctes.</p>
    {creating ? <TermsForm dealId={deal.id} dealVersion={deal.version} saved={result => { setCreating(false); setSelected(result.id); query.refreshQuietly(); }} denied={deny} cancel={close} /> : <div className="flex flex-wrap gap-2">{!deal.contact.archived_at ? <Button action="create" type="button" disabled={Boolean(selected)} onClick={() => setCreating(true)}>Prévoir une commission</Button> : <p>Contact archivé : finance conservée en lecture seule.</p>}<Button liveRefresh action="refresh" type="button" variant="outline" disabled={Boolean(selected)} onClick={query.refresh}>Actualiser les commissions</Button></div>}
    {!query.value ? <p role="status">Chargement des commissions…</p> : <>{!query.value.items.length ? <p>Aucune commission pour cette affaire. Aucune saisie financière n’est requise pour la clôturer.</p> : <ul className="grid min-w-0 gap-4">{query.value.items.map((item, index) => <li key={item.id} className="grid min-w-0 gap-2 border-t pt-4"><Button action="finance" type="button" variant="outline" className="h-auto min-h-control justify-self-start whitespace-normal text-start" disabled={creating || Boolean(selected) && selected !== item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>Commission {index + 1 + (page - 1) * query.value!.page_size} : {mad(item.current.amount_mad)}</Button><p>{item.current.state === "recognized" ? "Reconnue" : "Prévue"} ; encaissé {mad(item.collected_mad)}{item.balance_mad === null ? " ; aucun solde reconnu" : ` ; reste ${mad(item.balance_mad)}`}</p>{item.current.review_required ? <p className="text-warning">Revue financière demandée après réouverture.</p> : null}</li>)}</ul>}<NumberedPages page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des commissions" /></>}
    {selected && !creating ? <CommissionRecord key={selected} id={selected} contactId={deal.contact.id} dealVersion={deal.version} writable={!deal.contact.archived_at} changed={query.refreshQuietly} denied={deny} close={close} /> : null}
  </section>;
}
