import "server-only";
import type { StaffRole } from "@/features/contacts/contracts";
import { crmGuides } from "./guides-crm";
import { inventoryGuides } from "./guides-inventory";
import { workGuides } from "./guides-work";
import type { HelpArticle, HelpCategory } from "./types";

export const helpCategories: { id: HelpCategory; title: string; description: string }[] = [
  { id: "start", title: "Bien démarrer", description: "Repères, journée de travail et confidentialité." },
  { id: "crm", title: "Prospects et affaires", description: "Qualification, notes, projets et suivi commercial." },
  { id: "inventory", title: "Biens et propriétaires", description: "Formulaires, prix, programmes, photos et localisation." },
  { id: "work", title: "Visites et suivi", description: "Rendez-vous, tâches, rappels, notifications et documents." },
  { id: "manage", title: "Gestion de l’équipe", description: "Attributions, traitements en volume et comptes, selon vos droits." },
  { id: "trouble", title: "Résoudre un problème", description: "Recherche, fichiers, connexion et enregistrements." },
];

export const helpArticles: HelpArticle[] = [...crmGuides, ...inventoryGuides, ...workGuides];
export function articlesForRole(role: StaffRole) {
  return helpArticles.filter(article => !article.roles || article.roles.includes(role));
}
export function helpArticleForRole(slug: string, role: StaffRole) {
  return articlesForRole(role).find(article => article.slug === slug);
}
