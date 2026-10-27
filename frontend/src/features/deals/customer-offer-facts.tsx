"use client";
import { FinanceIcon } from "@/components/icons";
import { RecordEntry } from "@/components/shared/record-entry";
import { Badge } from "@/components/ui/badge";
import { formatBusinessDate, formatInstant, formatMAD } from "@/lib/format";
import { offerStatusLabels, type CustomerOffer } from "./contracts";

export function ProposalStatus({ status }: { status: CustomerOffer["status"] }) {
  return <Badge variant="neutral">{offerStatusLabels[status]}</Badge>;
}
export function ProposalAmount({ value }: { value: CustomerOffer }) {
  return <span className="tabular-nums wrap-anywhere">{formatMAD(value.amount_mad)}{value.price_period === "month" ? " / mois" : value.price_period === "year" ? " / an" : ""}</span>;
}
export function OfferFacts({ value }: { value: CustomerOffer }) {
  return <RecordEntry icon={FinanceIcon} title={<ProposalAmount value={value} />} status={<ProposalStatus status={value.status} />} meta={[{ label: "Échéance", value: value.expires_on ? formatBusinessDate(value.expires_on) : "Non renseignée" }, { label: "Version", value: value.version }]}>
    {value.annual_amount_mad !== null ? <p className="text-sm tabular-nums">Comparaison annuelle exacte : {formatMAD(value.annual_amount_mad)}</p> : null}
    <p className="text-sm whitespace-pre-wrap wrap-anywhere">{value.conditions || "Aucune condition renseignée."}</p><p className="text-xs text-muted-foreground">Modifiée le {formatInstant(value.updated_at)}. Sans expiration automatique ; auteurs conservés dans l’historique.</p>
  </RecordEntry>;
}
export function ProposalDetails({ value }: { value: CustomerOffer }) {
  const long = value.conditions.length > 180;
  return <div className="min-w-0">{!long ? <p className="text-sm whitespace-pre-wrap wrap-anywhere">{value.conditions || "Aucune condition renseignée."}</p> : null}<details className="kay-directory-card-details"><summary>{long ? "Conditions et détails" : "Détails"}</summary><div className="grid min-w-0 gap-2 py-2">{long ? <p className="text-sm whitespace-pre-wrap wrap-anywhere">{value.conditions}</p> : null}{value.annual_amount_mad !== null ? <p className="text-sm tabular-nums">Comparaison annuelle exacte : {formatMAD(value.annual_amount_mad)}</p> : null}<p className="text-xs text-muted-foreground">Version {value.version} · modifiée le {formatInstant(value.updated_at)}. Sans expiration automatique ; auteurs conservés dans l’historique.</p></div></details></div>;
}
