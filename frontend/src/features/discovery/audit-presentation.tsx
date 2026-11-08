import Link from "next/link";
import type { StaffRole } from "@/features/contacts/contracts";
import { activityLabels, dealActivityLabels } from "@/features/contacts/ownership-contracts";
import { inventoryActionLabels } from "@/features/inventory/history-labels";
import type { AuditRow } from "./contracts";

const actions: Record<string, string> = {
  ...activityLabels, ...dealActivityLabels, ...inventoryActionLabels,
  "contacts.note": "Note ajoutée", "contacts.call": "Appel consigné", "contacts.email": "E-mail consigné", "contacts.meeting": "Rendez-vous consigné", "contacts.other": "Interaction consignée", "contacts.message": "Message consigné", "contacts.visit": "Visite consignée",
  "identity.bootstrap_completed": "Premier administrateur configuré", "identity.login": "Connexion", "identity.logout": "Déconnexion", "identity.password_changed": "Mot de passe modifié",
  "users.create": "Compte créé", "users.edit": "Compte modifié", "users.disable": "Compte désactivé", "users.delete": "Compte supprimé", "users.reset-password": "Mot de passe réinitialisé", "users.confirm-handoff": "Remise des accès confirmée",
  "contacts.created": "Contact créé", "contacts.updated": "Contact modifié", "contacts.archived": "Contact archivé", "contacts.restored": "Contact restauré", "contacts.merged": "Contacts fusionnés", "contacts.imported": "Contact importé",
  "enquiries.created": "Prospect créé", "enquiries.updated": "Prospect modifié", "enquiries.archived": "Prospect archivé", "enquiries.restored": "Prospect restauré", "enquiries.converted": "Prospect converti",
  "deals.created": "Affaire créée", "deals.updated": "Affaire modifiée", "deals.transition": "Étape modifiée", "deals.closed": "Affaire clôturée", "deals.reopened": "Affaire rouverte", "deals.archived": "Affaire archivée", "deals.restored": "Affaire restaurée",
  "visits.policy.updated": "Horaires de visite modifiés", "exports.requested": "Export demandé", "exports.generated": "Export préparé", "exports.downloaded": "Export téléchargé",
  "imports.created": "Import reçu", "imports.previewed": "Aperçu d’import préparé", "imports.approved": "Import approuvé",
};
export function auditActionLabel(action: string) { return actions[action] ?? action; }
export function AuditAction({ action }: { action: string }) {
  const label = auditActionLabel(action);
  return <div className="grid min-w-0 gap-1 wrap-anywhere"><strong className="font-medium">{label}</strong>{label !== action ? <small className="text-xs text-muted-foreground">{action}</small> : null}</div>;
}
const targets = {
  contact: { label: "Contact", path: "/contacts/" }, enquiry: { label: "Prospect", path: "/leads/" }, deal: { label: "Affaire", path: "/deals/" },
  property: { label: "Bien ou unité", path: "/projects/properties/" }, development: { label: "Programme", path: "/projects/" }, offering: { label: "Offre", path: "" },
};
export function AuditTargets({ row, role }: { row: AuditRow; role: StaffRole }) {
  const items = Object.entries(row.targets).map(([kind, id]) => ({ ...targets[kind as keyof typeof targets], id }));
  if (row.target_user_id) items.push({ label: "Compte", path: role === "administrator" ? "/settings/users/" : "", id: row.target_user_id });
  return items.length ? <ul className="flex min-w-0 flex-wrap gap-2">{items.map(item => <li key={`${item.label}:${item.id}`} className="min-w-0">{item.path ? <Link href={`${item.path}${item.id}${item.label === "Compte" ? "/edit" : ""}`} prefetch={false} aria-label={`Ouvrir ${item.label.toLowerCase()} ${item.id}`} title={`${item.label} · ${item.id}`} className="inline-flex min-h-control items-center gap-1 text-sm text-link hover:underline">{item.label} · {item.id.slice(0, 8)}</Link> : <span className="inline-flex min-h-control items-center text-sm text-muted-foreground" title={`${item.label} · ${item.id}`}>{item.label} · {item.id.slice(0, 8)}</span>}</li>)}</ul> : <span className="text-sm text-muted-foreground">—</span>;
}
