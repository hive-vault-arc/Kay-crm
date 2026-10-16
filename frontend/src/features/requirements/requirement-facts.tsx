import { formatMAD } from "@/lib/format";
import { categoryLabels } from "@/features/inventory/contracts";
import { criterionLabels, importanceLabels, type RequirementSummary } from "./contracts";

export function RequirementFacts({ value }: { value: RequirementSummary }) {
  return <div className="grid min-w-0 gap-4"><p className="wrap-anywhere font-medium">{value.title} : {value.intent === "sale" ? "Achat" : "Location"}</p><p className="wrap-anywhere">Budget d’origine : de {formatMAD(value.budget_min_mad)} à {formatMAD(value.budget_max_mad)}{value.budget_period ? value.budget_period === "month" ? " par mois" : " par an" : ""}.</p>{value.intent === "rental" ? <p className="wrap-anywhere">Comparaison annuelle exacte : de {formatMAD(value.annual_budget_min_mad)} à {formatMAD(value.annual_budget_max_mad)}.</p> : null}<dl className="grid min-w-0 gap-4 sm:grid-cols-2">{value.criteria.map(c => <div key={c.key}><dt className="text-sm text-muted-foreground">{criterionLabels[c.key]} : {importanceLabels[c.importance]}</dt><dd className="wrap-anywhere">{c.value === null ? "Non renseigné" : typeof c.value === "boolean" ? c.value ? "Oui" : "Non" : c.key === "category" ? categoryLabels[c.value as keyof typeof categoryLabels] : String(c.value)}</dd></div>)}</dl></div>;
}
