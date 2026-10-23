"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { enquiriesSchema } from "@/features/contacts/contracts";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { dealsSchema } from "@/features/deals/contracts";

export type WorkContext = { enquiry_id: string | null; deal_id: string | null };

export function WorkContextSelect({ contactId, value, change }: { contactId: string; value: WorkContext; change: (next: WorkContext) => void }) {
  const id = useId();
  const [kind, setKind] = useState<"enquiry" | "deal">("enquiry");
  const [leadPage, setLeadPage] = useState(1), [dealPage, setDealPage] = useState(1);
  return <section className="grid min-w-0 gap-3" aria-label="Dossier de l’action">
    <div className="grid gap-2"><Label htmlFor={`${id}-kind`}>Lier l’action à</Label><NativeSelect id={`${id}-kind`} value={kind} onChange={event => { setKind(event.target.value as typeof kind); change({ enquiry_id: null, deal_id: null }); }}><option value="enquiry">Un prospect</option><option value="deal">Une affaire</option></NativeSelect></div>
    {kind === "enquiry" ? <LeadOptions contactId={contactId} page={leadPage} setPage={page => { setLeadPage(page); change({ enquiry_id: null, deal_id: null }); }} selected={value.enquiry_id} choose={enquiry_id => change({ enquiry_id, deal_id: null })} id={id} /> : <DealOptions contactId={contactId} page={dealPage} setPage={page => { setDealPage(page); change({ enquiry_id: null, deal_id: null }); }} selected={value.deal_id} choose={deal_id => change({ enquiry_id: null, deal_id })} id={id} />}
    <p className="text-sm text-muted-foreground">Le résultat et les notes automatiques apparaîtront dans l’historique de ce dossier.</p>
  </section>;
}

function LeadOptions({ contactId, page, setPage, selected, choose, id }: { contactId: string; page: number; setPage: (page: number) => void; selected: string | null; choose: (id: string | null) => void; id: string }) {
  const query = useQuery(queryPath("enquiries", { contact_id: contactId, page, page_size: 50 }), enquiriesSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement des prospects…</p>;
  return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-target`}>Prospect concerné</Label><NativeSelect id={`${id}-target`} value={selected ?? ""} onChange={event => choose(event.target.value || null)}><option value="">Choisir un prospect</option>{query.value.items.map(item => <option key={item.id} value={item.id}>{item.status} · {new Date(item.received_at).toLocaleDateString("fr-MA")} · {item.message_preview || item.id.slice(0, 8)}</option>)}</NativeSelect>{query.value.total ? <NumberedPages compact page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des prospects de ce contact" /> : <p>Aucun prospect actif. Créez un prospect pour enregistrer cette action.</p>}</div>;
}

function DealOptions({ contactId, page, setPage, selected, choose, id }: { contactId: string; page: number; setPage: (page: number) => void; selected: string | null; choose: (id: string | null) => void; id: string }) {
  const query = useQuery(queryPath("deals", { contact_id: contactId, page, page_size: 50 }), dealsSchema);
  if (query.error) return <RecordError error={query.error} retry={query.refresh} />;
  if (!query.value) return <p role="status">Chargement des affaires…</p>;
  return <div className="grid min-w-0 gap-2"><Label htmlFor={`${id}-target`}>Affaire concernée</Label><NativeSelect id={`${id}-target`} value={selected ?? ""} onChange={event => choose(event.target.value || null)}><option value="">Choisir une affaire</option>{query.value.items.map(item => <option key={item.id} value={item.id}>{item.title} · {item.stage}</option>)}</NativeSelect>{query.value.total ? <NumberedPages compact page={page} total={query.value.total} size={query.value.page_size} change={setPage} label="Pages des affaires de ce contact" /> : <p>Aucune affaire active. Choisissez un prospect ou créez une affaire.</p>}</div>;
}
