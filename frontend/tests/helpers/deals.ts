import type { Page } from "@playwright/test";
import { stageLabels } from "@/features/deals/contracts";
import { expect } from "./auth";
export function dealBody(contact: string, projectName = "SP11 projet synthétique") { return { contact_id: contact, requirement_id: null, offering_id: null, expected_offering_version: null, initial_budget: "1000000", purchase_reasons: ["residence"], projects: [{ external_name: projectName }], campaign_source: "facebook", rating: "warm", payment_method: null, number_of_rooms: null, notes: "", next_action: "SP11 rappeler le contact", stage: "new" }; }
export async function fillDeal(page: Page, projectName = "SP11 projet synthétique") { const form = page.getByRole("form", { name: "Nouvelle affaire", exact: true }); await expect(form.getByLabel("Budget *", { exact: true })).toBeEnabled(); await form.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH"); await form.getByRole("checkbox", { name: "Résidence principale", exact: true }).check(); const project = form.getByRole("region", { name: "Projet 1", exact: true }); await project.getByLabel("Type de projet", { exact: true }).selectOption("external"); await project.getByLabel("Nom du projet externe *", { exact: true }).fill(projectName); await form.getByLabel("Action prévue", { exact: true }).fill("SP11 rappeler le contact"); return form; }
export async function saveDeal(page: Page, submit = "Créer l’affaire") { await page.getByRole("button", { name: submit, exact: true }).click(); await expect.poll(() => /^\/deals\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true); await expect(page.getByRole("button", { name: /^Étape actuelle/ })).toBeVisible(); return new URL(page.url()).pathname.split("/")[2]; }
export async function convertLead(page: Page, projectName = "Projet de conversion synthétique") { await page.getByRole("button", { name: "Actions", exact: true }).click(); await page.getByRole("button", { name: "Convertir en affaire", exact: true }).click(); const dialog = page.getByRole("alertdialog", { name: "Convertir le prospect en affaire", exact: true }); await dialog.getByLabel("Type de projet", { exact: true }).selectOption("external"); await dialog.getByLabel("Nom du projet externe *", { exact: true }).fill(projectName); await dialog.getByRole("checkbox", { name: "Résidence principale", exact: true }).check(); await dialog.getByRole("button", { name: "Confirmer la conversion", exact: true }).click(); await expect.poll(() => /^\/deals\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true); await expect(page.getByRole("button", { name: /^Étape actuelle/ })).toBeVisible(); return new URL(page.url()).pathname.split("/")[2]; }
export async function skipStage(page: Page, stage: "visit" | "negotiation" | "documents" = "documents") {
  const trigger = page.getByRole("button", { name: /^Étape actuelle/ });
  await trigger.click();
  await page.getByRole("menuitem", { name: stageLabels[stage], exact: true }).click();
  const review = page.getByRole("alertdialog", { name: "Changer l’étape de l’affaire", exact: true });
  await review.getByLabel("Motif", { exact: true }).fill("SP11 saut d’étape délibéré");
  await review.getByRole("button", { name: "Confirmer l’étape", exact: true }).click();
  await expect(review).not.toBeVisible();
  await expect(trigger).toHaveAccessibleName(new RegExp(stageLabels[stage]));
}
