import { expect, type Page } from "@playwright/test";

export async function openContact(page: Page, id: string) {
  await page.goto(`/contacts/${id}`);
  await expect(page.getByRole("tab", { name: "Identité", exact: true })).toBeEnabled();
}
export async function manage(page: Page, operation: string) {
  await page.getByRole("tab", { name: "Identité", exact: true }).click();
  await page.getByRole("button", { name: "Gérer le contact", exact: true }).click();
  await page.getByLabel("Opération", { exact: true }).selectOption(operation);
  await page.getByLabel("Motif de l’opération", { exact: true }).fill("SP06 décision synthétique de contrôle");
}
export async function previewOperation(page: Page) {
  await page.getByRole("button", { name: "Vérifier l’impact", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoir ma saisie", exact: true })).toBeFocused();
}
export async function confirmOperation(page: Page) {
  await page.getByRole("button", { name: "Confirmer l’opération", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByText(/: opération enregistrée\.$/)).toBeVisible();
}
export async function contribute(page: Page, body = "SP06 contribution synthétique de B", kind = "note") {
  await page.getByRole("tab", { name: "Historique", exact: true }).click();
  await expect(page.getByLabel("Texte de l’entrée", { exact: true })).toBeEnabled();
  await page.getByLabel("Type d’entrée", { exact: true }).selectOption(kind);
  await page.getByLabel("Texte de l’entrée", { exact: true }).fill(body);
  await page.getByRole("button", { name: "Enregistrer l’entrée", exact: true }).click();
  await expect(page.getByText("Entrée enregistrée, avec son auteur.", { exact: true })).toBeVisible();
  await expect(page.getByText(body, { exact: true })).toBeVisible();
}
