export const emptyWebsiteDraft = { name: "", phone: "", email: "", property_reference: "", message: "" };
export type WebsiteDraft = typeof emptyWebsiteDraft;
const referencePrefix = "\nRéférence du bien : ";
const characters = (value: string) => Array.from(value).length;

export function websiteMessageLimit(reference: string) {
  const normalized = reference.trim();
  return Math.max(0, 4000 - (normalized ? characters(referencePrefix + normalized) : 0));
}

/** Local bounds only; the signed intake remains authoritative for names/phones/source and validation. */
export function websiteSubmission(draft: WebsiteDraft, submissionId: string, submittedAt: string): { ok: true; body: string } | { ok: false; error: string } {
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(draft.name + draft.message + draft.property_reference)) return { ok: false, error: "Supprimez les caractères de contrôle du nom, de la demande ou de la référence. Votre saisie est conservée." };
  if (characters(draft.property_reference.trim()) > 100) return { ok: false, error: "La référence du bien est limitée à 100 caractères. Votre saisie est conservée." };
  if (characters(draft.message.trim()) > websiteMessageLimit(draft.property_reference)) return { ok: false, error: "La demande et sa référence dépassent ensemble 4 000 caractères. Raccourcissez le texte ou la référence ; votre saisie est conservée." };
  // Explicit public fields: no source key, staff role, assignee or inventory ID can enter this form's payload.
  const body = JSON.stringify({ name: draft.name, phone: draft.phone, email: draft.email || null, property_reference: draft.property_reference || null, message: draft.message, submission_id: submissionId, submitted_at: submittedAt });
  if (new TextEncoder().encode(body).byteLength > 8192) return { ok: false, error: "La demande est trop volumineuse. Raccourcissez le texte avant l’envoi ; votre saisie est conservée." };
  return { ok: true, body };
}
