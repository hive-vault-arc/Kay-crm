"use client";
import { useState } from "react";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { outcomesSchema } from "@/features/inventory/outcome-contracts";
import { formatBusinessDate, formatInstant, formatMAD } from "@/lib/format";
import { stageLabels } from "./contracts";

export function OutcomeHistory({ id, revision }: { id: string; revision?: number }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`deals/${id}/outcomes`, { page, page_size: 10 }), outcomesSchema, revision);
  return <section className="grid min-w-0 gap-4" aria-label="Résultats et réouvertures"><h2 className="text-section font-medium">Résultats et réouvertures</h2>{query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement des résultats…</p> : <>{!query.value.items.length ? <p>Aucun résultat enregistré. Une proposition acceptée ne clôture pas l’affaire.</p> : <ol className="grid min-w-0 gap-6">{query.value.items.map(item => <li key={item.id} className="grid min-w-0 gap-2 border-b pb-4"><h3 className="font-medium">{stageLabels[item.outcome]} le {formatBusinessDate(item.completed_on)}</h3>{item.agreed_amount_mad ? <p className="tabular-nums">Montant convenu : {formatMAD(item.agreed_amount_mad)}{item.price_period === "month" ? " / mois" : item.price_period === "year" ? " / an" : ""}</p> : null}<p className="whitespace-pre-wrap wrap-anywhere">Explication : {item.explanation}</p><p className="wrap-anywhere">Auteur : {item.actor.display_name}, {formatInstant(item.created_at)}.</p><p className="wrap-anywhere text-sm">Responsable à la clôture conservé : {item.primary_agent_at_close_name}.</p>{item.reopening ? <><p className="wrap-anywhere">Réouverture par {item.reopening.actor.display_name}, {formatInstant(item.reopening.created_at)}.</p><p className="whitespace-pre-wrap wrap-anywhere">Motif : {item.reopening.reason}</p><p>Le résultat d’origine est conservé.</p></> : <p>Résultat non rouvert.</p>}</li>)}</ol>}<NumberedPages label="Pages des résultats" page={page} total={query.value.total} size={10} change={setPage} /></>}</section>;
}
