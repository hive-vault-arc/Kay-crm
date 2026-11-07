import { generateBodySchema, type GeneratedContext, type GeneratedTemplate, type GenerateBody } from "./contracts";
import type { ApiError } from "@/lib/api/client";

export type PreparationFields = Record<string, string>;
export type PreparationDraft = { values: PreparationFields; baseline: PreparationFields };
export type PreparationDrafts = Record<string, PreparationDraft>;
export type PreparationAttempt = { body: GenerateBody; fingerprint: string; key: string; templateSignature: string; uncertain: boolean; error?: ApiError };
export type PreparationAttempts = Record<string, PreparationAttempt>;

export function preparationValues(template: GeneratedTemplate, defaults: PreparationFields, draft?: PreparationFields): PreparationFields {
  return Object.fromEntries(template.fields.map(field => [field.key, draft?.[field.key] ?? defaults[field.key] ?? ""]));
}
export function preparationSignature(template: GeneratedTemplate) {
  return JSON.stringify([template.code, template.fields.map(field => [field.key, field.multiline])]);
}
export function preparationBody(parentKind: GenerateBody["parent_kind"], parentId: string, template: GeneratedTemplate, values: PreparationFields) {
  const selected = preparationValues(template, {}, values);
  const fields = template.fields.filter(field => Array.from(selected[field.key]).length > (field.multiline ? 1000 : 300) || !field.multiline && selected[field.key].includes("\n") || Array.from(selected[field.key]).some(char => /\p{C}/u.test(char) && char !== "\n" && char !== "\t")).map(field => field.key);
  if (fields.length) return { success: false as const, fields, message: "Vérifiez les champs : 300 caractères par ligne, 1 000 pour un texte long, sans caractère de contrôle." };
  const parsed = generateBodySchema.safeParse({ parent_kind: parentKind, parent_id: parentId, template_code: template.code, values: selected });
  if (!parsed.success || new TextEncoder().encode(JSON.stringify(parsed.data)).length > 32 * 1024) return { success: false as const, fields: [], message: "Cette préparation dépasse les limites du document. Réduisez les textes avant de réessayer." };
  return { success: true as const, body: parsed.data, fingerprint: JSON.stringify(parsed.data) };
}
const same = (left: PreparationFields, right: PreparationFields) => JSON.stringify(left) === JSON.stringify(right);
export function pendingPreparations(drafts: PreparationDrafts, attempts: PreparationAttempts) {
  const pending: Record<string, { values: PreparationFields; uncertain: boolean }> = {};
  for (const [code, draft] of Object.entries(drafts)) if (!same(draft.values, draft.baseline)) pending[code] = { values: draft.values, uncertain: false };
  for (const [code, attempt] of Object.entries(attempts)) if (attempt.uncertain) pending[code] = { values: attempt.body.values, uncertain: true };
  return pending;
}
export function visiblePreparations<T>(values: Record<string, T>, context: GeneratedContext): Record<string, T> {
  const codes = new Set(context.templates.map(template => template.code));
  return Object.fromEntries(Object.entries(values).filter(([code]) => codes.has(code)));
}
