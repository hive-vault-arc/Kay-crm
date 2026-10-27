"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { FinanceIcon } from "@/components/icons";
import { DataTable } from "@/components/shared/data-table";
import { RecordDrawer } from "@/components/shared/record-drawer";
import { RecordEntry } from "@/components/shared/record-entry";
import { RecordSection } from "@/components/shared/record-workspace";
import { Button } from "@/components/ui/button";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { useHydrated } from "@/hooks/use-hydrated";
import type { ApiError } from "@/lib/api/client";
import { formatBusinessDate } from "@/lib/format";
import type { CustomerOffer, Deal } from "./contracts";
import { ProposalAmount, ProposalDetails, ProposalStatus } from "./customer-offer-facts";
import { proposalPageSchema, type ProposalComparison } from "./customer-offer-model";
import { CustomerOfferForm } from "./customer-offer-form";
import type { MutateDeal } from "./pipeline";

export function CustomerOffers({ deal, writable, busy, busyChanged, mutate, error, denied }: { deal: Deal; writable: boolean; busy: boolean; busyChanged?: (busy: boolean) => void; mutate: MutateDeal; error?: ApiError; denied?: (error: ApiError) => void }) {
  const [page, setPage] = useState(1), [panel, setPanel] = useState<ProposalComparison>();
  const heading = useRef<HTMLHeadingElement>(null), returnFocus = useRef<HTMLElement | null>(null), hydrated = useHydrated();
  const schema = useMemo(() => proposalPageSchema(deal.id, page, 20), [deal.id, page]);
  const query = useQuery(queryPath(`deals/${deal.id}/customer-offers`, { page, page_size: 20 }), schema, deal.version);
  const lost = query.error && [401, 403, 404].includes(query.error.status);
  useEffect(() => { if (query.error && [401, 403, 404].includes(query.error.status)) denied?.(query.error); }, [query.error, denied]);
  const open = (target: HTMLElement, proposal?: CustomerOffer) => { if (!hydrated || busy || !writable || proposal && proposal.deal_id !== deal.id) return; returnFocus.current = target; setPanel({ deal, proposal }); };
  const action = (proposal: CustomerOffer) => writable ? <Button action="edit" type="button" variant="quiet" disabled={!hydrated || busy} aria-label={`Modifier la proposition du ${formatBusinessDate(proposal.created_at.slice(0, 10))}`} onClick={event => open(event.currentTarget, proposal)}>Modifier</Button> : <span className="text-xs text-muted-foreground">Lecture seule</span>;
  const columns: ColumnDef<CustomerOffer>[] = [
    { id: "amount", header: "Montant", cell: ({ row }) => <ProposalAmount value={row.original} /> },
    { id: "status", header: "Statut", cell: ({ row }) => <ProposalStatus status={row.original.status} /> },
    { id: "deadline", header: "Échéance", cell: ({ row }) => row.original.expires_on ? formatBusinessDate(row.original.expires_on) : "Non renseignée" },
    { id: "conditions", header: "Conditions", cell: ({ row }) => <ProposalDetails value={row.original} /> },
    { id: "actions", header: "Actions", cell: ({ row }) => action(row.original) },
  ];
  return <>
    <RecordSection title="Propositions client" headingRef={heading} count={!query.error ? query.value?.total : undefined} description="Distinctes des offres d’inventaire : une acceptation ne clôture pas l’affaire, ne réserve aucun bien et ne change pas le stock." action={writable ? <Button action="create" type="button" variant="outline" disabled={!hydrated || busy} onClick={event => open(event.currentTarget)}>Nouvelle proposition</Button> : undefined}>
      {query.error ? <RecordError error={query.error} retry={() => { if (lost) setPanel(undefined); query.refresh(); }} /> : !query.value ? <p role="status" className="text-sm text-muted-foreground">Chargement des propositions…</p> : <>
        <DataTable columns={columns} rows={query.value.items} getRowId={value => value.id} caption="Propositions client" footerCaption scrollLabel="Tableau des propositions client" emptyLabel="Aucune proposition enregistrée." mobileCard={value => <RecordEntry icon={FinanceIcon} title={<ProposalAmount value={value} />} status={<ProposalStatus status={value.status} />} meta={[{ label: "Échéance", value: value.expires_on ? formatBusinessDate(value.expires_on) : "Non renseignée" }]} actions={action(value)}><ProposalDetails value={value} /></RecordEntry>} />
        {query.value.has_previous || query.value.has_next || page > 1 ? <NumberedPages compact label="Pages des propositions client" page={page} total={query.value.total} size={query.value.page_size} change={setPage} /> : null}
      </>}
    </RecordSection>
    {!lost && panel ? <RecordDrawer key={panel.proposal?.id ?? "new"} label="Proposition client" title={panel.proposal ? "Modifier la proposition" : "Nouvelle proposition"} description="Montant et conditions proposés par le client, sans effet automatique sur le stock." initialOpen hideTrigger busy={busy} returnFocus={returnFocus} fallbackFocus={heading} onClosed={() => setPanel(undefined)}>{(close, done) => <CustomerOfferForm initial={panel} writable={writable} busy={busy} busyChanged={busyChanged} mutate={mutate} error={error} denied={denied} cancel={close} saved={() => { query.refreshQuietly(); done(); }} />}</RecordDrawer> : null}
  </>;
}
