"use client";
import { RecordEntry } from "@/components/shared/record-entry";
import { Button } from "@/components/ui/button";
import { RecordError } from "@/features/contacts/record-states";
import { stageLabels } from "@/features/deals/contracts";
import { mad, type Commission } from "./contracts";
import { useFinanceMutation } from "./use-finance-command";
export { useFinanceMutation } from "./use-finance-command";
export type { Denied, Saved, FinanceBinding } from "./use-finance-command";

export function FinanceFailure({ mutation, acceptVersion }: { mutation: ReturnType<typeof useFinanceMutation>; acceptVersion: (version: number, commission?: Commission) => void }) {
  if (!mutation.error) return null;
  const current = mutation.comparison;
  return <section className="grid min-w-0 gap-4" aria-label="Reprise de l’action financière"><RecordError error={mutation.error} />
    {mutation.uncertain ? <><p className="text-sm text-muted-foreground">{mutation.acknowledged ? "L’opération est enregistrée. Actualisez son résultat sans enregistrer une seconde fois." : "La réponse a été interrompue. Réessayez exactement l’opération confirmée pour retrouver son résultat."}</p><Button action="retry" type="button" variant="outline" disabled={mutation.busy || !mutation.writable && !mutation.acknowledged} onClick={() => void mutation.retry()}>{mutation.acknowledged ? "Actualiser l’opération enregistrée" : "Réessayer la même opération"}</Button></> : <><p className="text-sm text-muted-foreground">Votre saisie est conservée. Comparez la version actuelle avant de reprendre un conflit.</p>{mutation.error.status === 409 ? <Button action="compare" type="button" variant="outline" className="justify-self-start" disabled={mutation.busy} onClick={() => void mutation.compare()}>Comparer la version financière actuelle</Button> : null}</>}
    {current ? <RecordEntry title={`Version actuelle · ${current.version}`} meta={current.commission ? [{ label: "Montant", value: mad(current.commission.current.amount_mad) }, { label: "Calcul", value: current.commission.current.kind === "fixed" ? "Montant fixe" : `${current.commission.current.rate_percent} %` }, { label: "Base", value: mad(current.commission.current.base_mad) }, { label: "Échéance", value: current.commission.current.due_on ?? "Non renseignée" }, { label: "État", value: current.commission.current.state === "recognized" ? "Reconnue" : "Prévue" }, { label: "Encaissé", value: mad(current.commission.collected_mad) }, { label: "Solde", value: current.commission.balance_mad === null ? "Non reconnu" : mad(current.commission.balance_mad) }] : current.deal ? [{ label: "Contact", value: current.deal.contact.name }, { label: "Affaire", value: current.deal.title }, { label: "Étape", value: stageLabels[current.deal.stage] }] : []} actions={!current.blocked ? <Button action="compare" type="button" variant="outline" disabled={mutation.busy || mutation.uncertain || !mutation.writable} onClick={() => { if (mutation.accept(current)) acceptVersion(current.version, current.commission); }}>Conserver ma saisie avec cette version</Button> : undefined}>{current.blocked ? <p role="status">{current.blocked}</p> : current.commission?.current.review_required ? <p className="text-warning">Revue financière requise après réouverture.</p> : null}</RecordEntry> : null}
  </section>;
}
