import { newExportSchema } from "./contracts";
import { receivedSourceLabels, roleLabels, statusLabels } from "@/features/contacts/contracts";
import { campaignLabels, languageLabels, ratingLabels } from "@/features/contacts/qualification-contracts";

export function exportReview(kind: "contacts" | "enquiries", filters: Record<string, string | number | undefined>, total: number) {
  if (!Number.isSafeInteger(total) || total < 0) return undefined;
  const clean = Object.fromEntries(Object.entries(filters).filter(([key, value]) => !["page", "page_size"].includes(key) && value !== "" && value !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  const result = newExportSchema.safeParse({ kind, filters: clean });
  if (!result.success) return undefined;
  const body = result.data, labels: string[] = [], f = body.filters;
  if (f.q) labels.push(`Recherche : ${f.q}`);
  if (f.status) labels.push(`Statut : ${statusLabels[f.status]}`);
  if (f.source) labels.push(`Provenance : ${receivedSourceLabels[f.source]}`);
  if (f.campaign_source) labels.push(`Source : ${campaignLabels[f.campaign_source]}`);
  if (f.rating) labels.push(`Qualification : ${ratingLabels[f.rating]}`);
  if (f.received_from) labels.push(`Reçus à partir du ${f.received_from}`);
  if (f.received_to) labels.push(`Reçus jusqu’au ${f.received_to}`);
  if (f.country) labels.push(`Pays : ${new Intl.DisplayNames("fr", { type: "region" }).of(f.country) ?? f.country}`);
  if (f.language) labels.push(`Langue : ${languageLabels[f.language] ?? f.language}`);
  if (f.assigned_agent_id) labels.push("Agent choisi dans la liste");
  if (f.primary_agent_id) labels.push("Agent responsable choisi dans la liste");
  if (f.linked) labels.push(`Dossiers non archivés : ${{ enquiries: "avec prospects hors convertis", deals: "avec affaires", none: "sans prospect ni affaire" }[f.linked]}`);
  if (f.role) labels.push(`Rôle : ${roleLabels[f.role]}`);
  if (f.created_from) labels.push(`Contacts créés à partir du ${f.created_from}`);
  if (f.created_to) labels.push(`Contacts créés jusqu’au ${f.created_to}`);
  if (f.sort) labels.push(`Tri : ${{ "-updated_at": "modification récente", "-received_at": "réception récente", "-created_at": "création récente", name: "nom du contact" }[f.sort]}`);
  if (f.contact_id) labels.push("Contact de ce dossier");
  if (f.owner_directory) labels.push("Propriétaires uniquement");
  const archive = { active: "Actifs", archived: "Archivés", all: "Actifs et archivés" };
  labels.push(`Contacts : ${archive[f.archive ?? "active"]}`);
  if (kind === "enquiries") labels.push(`Prospects : ${archive[f.record_archive ?? "active"]}`);
  return { body, total, labels, fingerprint: JSON.stringify(body) };
}
export type ExportReview = NonNullable<ReturnType<typeof exportReview>>;
