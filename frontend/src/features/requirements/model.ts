import { apiGet, ApiError } from "@/lib/api/client";
import { contactSchema } from "@/features/contacts/contracts";
import { inventoryQuerySchema, offeringsSchema, type Offering } from "@/features/inventory/contracts";
import { blank, criterionKeys, detailSchema, type Requirement, type RequirementFields } from "./contracts";

export const REQUIREMENT_PAGE_SIZE = 20;
export const requirementDenied = (error: ApiError) => [401, 403, 404].includes(error.status) || error.code === "CONTACT_ARCHIVED";
export const requirementPageValid = (value: { page: number; page_size: number; items: { id: string }[] }, page: number) => value.page === page && value.page_size === REQUIREMENT_PAGE_SIZE && value.items.length <= REQUIREMENT_PAGE_SIZE && new Set(value.items.map(item => item.id)).size === value.items.length;
export function editableRequirement(value?: Requirement): RequirementFields {
  return value ? { title: value.title, intent: value.intent, currency: "MAD", budget_min_mad: value.budget_min_mad, budget_max_mad: value.budget_max_mad, budget_period: value.budget_period, criteria: criterionKeys.map(key => ({ ...(value.criteria.find(item => item.key === key) ?? { key, importance: "preferred" as const, value: null }) })) } : { ...blank, criteria: blank.criteria.map(item => ({ ...item })) };
}
export function validRequirement(value: Requirement, id: string, contactId: string) {
  return value.id === id && value.contact_id === contactId && value.shortlist_count === value.shortlist.length && new Set(value.shortlist.map(item => item.offering.id)).size === value.shortlist.length;
}
export async function readRequirement(id: string, contactId: string, signal?: AbortSignal) {
  const value = await apiGet(`/api/v1/requirements/${id}`, detailSchema, signal);
  if (!validRequirement(value, id, contactId)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  return value;
}
export type RequirementComparison = { value?: Requirement; offering?: Offering; blocked?: string };
export async function compareRequirement(contactId: string, id: string | undefined, signal: AbortSignal): Promise<RequirementComparison> {
  const contact = await apiGet(`/api/v1/contacts/${contactId}`, contactSchema, signal);
  if (contact.id !== contactId) return { blocked: "Le contact associé a changé. Fermez puis rouvrez les recherches pour utiliser le dossier actuel." };
  const value = id ? await readRequirement(id, contactId, signal) : undefined;
  return { value, blocked: contact.archived_at ? "Contact archivé : les recherches sont conservées en lecture seule." : undefined };
}
export function offeringTargetValid(value: Offering) {
  return Boolean(value.target && (value.target_level === "development" ? value.target.level === "development" && value.target.id === value.development_id : value.target.level !== "development" && value.target.id === value.property_id));
}
export type OfferingChoice = { offering: Offering; path?: `/api/v1/${string}` };
export type RequirementSelection = { id?: string; mode: "edit" | "shortlist"; offeringId?: string };
export type RequirementReturn = { id?: string; offeringId?: string; action: string; scroll: number; started?: boolean };
export function restoreRequirementReturn(root: HTMLElement | null, heading: HTMLElement | null, value: RequirementReturn, readyId?: string, collectionReady = true) {
  if (!root || !heading) return false;
  const active = root.ownerDocument?.activeElement;
  if (value.started && active && active !== heading) return true;
  const card = value.id ? root.querySelector<HTMLElement>(`[data-requirement-id="${value.id}"]`) : root;
  const entry = value.offeringId ? card?.querySelector<HTMLElement>(`[data-shortlist-id="${value.offeringId}"]`) : card;
  const target = entry?.querySelector<HTMLElement>(`[data-action="${value.action}"]`);
  if (!collectionReady || card && value.offeringId && !target && readyId !== value.id) {
    if (!value.started) { heading.focus({ preventScroll: true }); value.started = true; }
    return false;
  }
  (target ?? heading).focus({ preventScroll: true });
  const body = root.closest<HTMLElement>(".kay-drawer-body"); if (body) body.scrollTop = value.scroll;
  return true;
}
export async function readChosenOffering(choice: OfferingChoice, signal: AbortSignal) {
  if (!choice.path?.startsWith("/api/v1/offerings?")) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const params = new URLSearchParams(choice.path.split("?")[1]), fields = [...params], page = Number(params.get("page"));
  if (new Set(fields.map(([key]) => key)).size !== fields.length || !inventoryQuerySchema.safeParse(Object.fromEntries(fields)).success || params.get("page_size") !== String(REQUIREMENT_PAGE_SIZE)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const value = await apiGet(choice.path, offeringsSchema, signal);
  if (!requirementPageValid(value, page)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  const current = value.items.find(item => item.id === choice.offering.id);
  if (current && (!offeringTargetValid(current) || current.target?.id !== choice.offering.target?.id)) throw new ApiError("DEPENDENCY_UNAVAILABLE", 503);
  return current;
}

export async function compareShortlist(contactId: string, id: string, choice: OfferingChoice | undefined, originalId: string | undefined, removing: boolean, signal: AbortSignal): Promise<RequirementComparison> {
  const current = await compareRequirement(contactId, id, signal);
  if (current.blocked || !current.value) return current;
  const existing = originalId ? current.value.shortlist.find(item => item.offering.id === originalId) : undefined;
  if (originalId && !existing) return { ...current, blocked: "Cette offre a déjà été retirée de la sélection. Revenez aux recherches avant une autre action." };
  if (removing) return { ...current, offering: existing?.offering };
  const offering = existing?.offering ?? (choice ? await readChosenOffering(choice, signal) : undefined);
  const blocked = !offering ? "L’offre n’est plus sur la page sélectionnée. Revenez au choix des offres pour la sélectionner à nouveau." :
    offering.kind !== current.value.intent ? "Le type de recherche a changé. Sélectionnez une offre correspondant au besoin actuel." :
    !originalId && offering.target?.archived ? "La cible est archivée. Choisissez une offre actuelle." :
    !originalId && current.value.shortlist.some(item => item.offering.id === offering.id) ? "Cette offre est déjà sélectionnée. Revenez aux recherches pour modifier son avis." :
    !originalId && current.value.shortlist_count >= 100 ? "La sélection contient déjà cent offres. Retirez une offre avant d’en ajouter une autre." : undefined;
  return { ...current, offering, blocked };
}
