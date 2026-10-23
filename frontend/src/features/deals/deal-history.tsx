"use client";

import { useState } from "react";
import type { z } from "zod";
import { ContactIcon, DealIcon, EnquiryIcon, PropertyIcon, TaskIcon, type KayIconComponent } from "@/components/icons";
import { RecordFact, RecordFacts } from "@/components/shared/record-facts";
import { NumberedPages } from "@/features/contacts/numbered-pages";
import { campaignLabels, languageLabels, purchaseReasonLabels, ratingLabels } from "@/features/contacts/qualification-contracts";
import { countryLabel } from "@/features/contacts/qualification-inputs";
import { RecordError } from "@/features/contacts/record-states";
import { queryPath, useQuery } from "@/features/contacts/use-query";
import { formatBusinessDate, formatInstant, formatMAD } from "@/lib/format";
import { actionLabels, historySchema, offerStatusLabels, stageLabels } from "./contracts";
import { paymentLabels, type qualificationSnapshotSchema } from "./qualification-contracts";

const factIcons: Record<string, KayIconComponent> = { Budget: DealIcon, Projets: PropertyIcon, "Motifs d’achat": DealIcon, Source: EnquiryIcon, Qualification: DealIcon, Financement: DealIcon, "Nombre de pièces": PropertyIcon, Notes: TaskIcon };

function QualificationHistory({ value }: { value: z.infer<typeof qualificationSnapshotSchema> }) {
  if (!("initial_budget" in value)) return null;
  const client = "name" in value.client_snapshot ? value.client_snapshot : null;
  const facts = [
    ["Client de cette version", client?.name ?? "Non renseigné"],
    ["Téléphones", client?.phones.map(phone => phone.number).join(", ") || "Non renseignés"],
    ["Indicatif téléphonique", client?.calling_code || "Non renseigné"],
    ["E-mails", client?.emails.map(email => email.email).join(", ") || "Non renseignés"],
    ["Pays de résidence", countryLabel(client?.country ?? "") || "Non renseigné"],
    ["Nationalité (pays)", countryLabel(client?.nationality ?? "") || "Non renseignée"],
    ["Langues", client?.languages.map(code => languageLabels[code] ?? code).join(", ") || "Non renseignées"],
    ["Budget", value.initial_budget || "Non renseigné"],
    ["Projets", value.projects.map(project => project.name).join(" · ") || "Non renseignés"],
    ["Motifs d’achat", value.purchase_reasons.map(code => purchaseReasonLabels[code]).join(", ") || "Non renseignés"],
    ["Source", campaignLabels[value.campaign_source]],
    ["Qualification", ratingLabels[value.rating]],
    ["Financement", value.payment_method ? paymentLabels[value.payment_method as keyof typeof paymentLabels] ?? value.payment_method : "Non renseigné"],
    ["Nombre de pièces", value.number_of_rooms ?? "Non renseigné"],
    ["Notes", value.notes || "Non renseignées"],
  ];
  return <details><summary className="flex min-h-control cursor-pointer items-center text-link underline">Qualification enregistrée avec cette version</summary><div className="py-3"><RecordFacts>{facts.map(([label, text]) => <RecordFact key={label} icon={factIcons[String(label)] ?? ContactIcon} label={String(label)}>{text}</RecordFact>)}</RecordFacts></div></details>;
}

export function DealHistory({ id, revision }: { id: string; revision?: number }) {
  const [page, setPage] = useState(1);
  const query = useQuery(queryPath(`deals/${id}/history`, { page, page_size: 20 }), historySchema, revision);
  return <section className="grid min-w-0 gap-4 border-t pt-6" aria-label="Historique de l’affaire"><h2 className="text-section font-medium">Historique de l’affaire</h2>
    {query.error ? <RecordError error={query.error} retry={query.refresh} /> : !query.value ? <p role="status">Chargement de l’historique…</p> : <>
      <p>{query.value.total} événement(s), auteurs et conditions d’origine conservés.</p>
      <ol className="grid min-w-0 gap-6">{query.value.items.map(row => <li key={row.id} className="grid min-w-0 gap-2 border-b pb-4">
        <h3 className="font-medium">{actionLabels[row.action]} · version {row.after_version}</h3>
        <p className="wrap-anywhere">Auteur : {row.actor.display_name}</p>
        <time dateTime={row.occurred_at} className="text-sm text-muted-foreground">{formatInstant(row.occurred_at)}</time>
        <p>{row.from_stage ? `${stageLabels[row.from_stage]} → ` : ""}{stageLabels[row.to_stage]}</p>
        <p className="wrap-anywhere">Affaire : {row.title}</p>
        <p className="whitespace-pre-wrap wrap-anywhere">Prochaine action : {row.next_action || "Non renseignée"}</p>
        <QualificationHistory value={row.qualification} />
        {row.target ? <p className="wrap-anywhere">Cible de cette version : {row.target.reference} · {row.target.level === "unit" ? "Unité physique" : row.target.level === "development" ? "Programme entier" : "Bien indépendant"}</p> : null}
        {row.amount_mad ? <>
          <p className="wrap-anywhere tabular-nums">Proposition : {formatMAD(row.amount_mad)}{row.price_period === "month" ? " / mois" : row.price_period === "year" ? " / an" : " · vente"}{row.offer_status ? `: ${offerStatusLabels[row.offer_status]}` : ""} · version {row.offer_version}</p>
          <p className="whitespace-pre-wrap wrap-anywhere">Conditions proposées : {row.conditions || "Non renseignées"}</p>
          <p>Échéance proposée : {row.expires_on ? formatBusinessDate(row.expires_on) : "Non renseignée"}</p>
        </> : null}
        {row.reason ? <p className="whitespace-pre-wrap wrap-anywhere">Motif : {row.reason}</p> : null}
      </li>)}</ol>
      <NumberedPages label="Pages de l’historique de l’affaire" page={page} total={query.value.total} size={20} change={setPage} />
    </>}
  </section>;
}
