import { kindLabels, stateLabels } from "./contracts";
import { type StockReview } from "./outcome-contracts";
import { targetLabels } from "@/features/requirements/offering-card";
import { frenchApiError } from "@/lib/api/errors";

export function StockReviewFacts({ review, affectsStock = true }: { review: StockReview; affectsStock?: boolean }) {
  return <section className="grid min-w-0 gap-4" aria-label="Effets sur le stock">
    <h3 className="font-medium">Effets sur le stock</h3>
    <p className="wrap-anywhere text-sm">Cible version {review.expected_target_version}, offre version {review.expected_offering_version}{review.expected_development_version ? `, programme version ${review.expected_development_version}` : ""}.</p>
    {affectsStock ? <><p>{review.effect_count} campagne(s) concernée(s). Les affaires concurrentes seront signalées, jamais clôturées automatiquement.</p><ul className="grid min-w-0 gap-4">{review.effects.map(effect => <li key={effect.offering_id} className="grid min-w-0 gap-1 border-b pb-2"><p className="wrap-anywhere font-medium">{effect.reference} : {targetLabels[effect.target_level]}</p>{effect.label ? <p className="wrap-anywhere">{effect.label}</p> : null}<p>{kindLabels[effect.kind]} : {stateLabels[effect.before]} vers {stateLabels[effect.after]}.</p>{effect.releases_reservation ? <p>La réservation de cette offre sera libérée avec historique.</p> : null}</li>)}</ul>{review.effect_count > review.effects.length ? <p>Les {review.effects.length} premières campagnes sont affichées. La vérification serveur couvre les {review.effect_count} campagnes du périmètre complet.</p> : null}{review.conflict ? <p role="alert" className="text-warning">{frenchApiError(review.conflict)} Aucun autre dossier privé n’est affiché. {review.conflict === "PARTIAL_DEVELOPMENT_REVIEW_REQUIRED" ? "Le périmètre ne peut pas être remplacé par les seules unités restantes." : ""}</p> : null}</> : <p>Aucune vente ni location n’est enregistrée. Seule l’éventuelle réservation de cette affaire sera libérée ; les autres engagements sont conservés.</p>}
  </section>;
}
