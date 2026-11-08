import { expect, type Page } from "@playwright/test";

export async function openContact(page: Page, id: string) {
  await page.goto(`/contacts/${id}`);
  await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled();
  await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
}
export async function manage(page: Page, operation: string) {
  await page.getByRole("tab", { name: "Aperçu", exact: true }).click();
  await page.getByRole("button", { name: "Gérer le contact", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Gérer le contact", exact: true });
  await drawer.getByLabel("Opération", { exact: true }).selectOption(operation);
  await drawer.getByLabel("Motif de l’opération", { exact: true }).fill("SP06 décision synthétique de contrôle");
}
export async function previewOperation(page: Page) {
  await page.getByRole("dialog", { name: "Gérer le contact", exact: true }).getByRole("button", { name: "Vérifier l’impact", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Revoir ma saisie", exact: true })).toBeFocused();
}
export async function confirmOperation(page: Page) {
  await page.getByRole("alertdialog").getByRole("button", { name: "Confirmer l’opération", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Gérer le contact", exact: true })).toHaveCount(0);
  await expect(page.getByText(/: opération enregistrée\.$/)).toBeVisible();
}
export async function contactActivity(page: Page) {
  await page.getByRole("tab", { name: "Activités", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Activités", exact: true });
  await expect(panel).toBeVisible(); return panel;
}
export async function contactAssignments(page: Page) {
  const panel = await contactActivity(page), summary = panel.locator("summary").filter({ hasText: "Historique des attributions" });
  if (await summary.locator("..").getAttribute("open") === null) await summary.click();
  await expect(panel.getByRole("heading", { name: "Historique d’attribution", exact: true })).toBeVisible(); return panel;
}
export async function contribute(page: Page, body = "SP06 contribution synthétique de B", kind = "note") {
  const panel = await contactActivity(page);
  await panel.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Ajouter une activité", exact: true });
  await expect(drawer.getByLabel("Texte de l’entrée", { exact: true })).toBeEnabled();
  await drawer.getByLabel("Type d’entrée", { exact: true }).selectOption(kind);
  await drawer.getByLabel("Texte de l’entrée", { exact: true }).fill(body);
  await drawer.getByRole("button", { name: "Enregistrer l’entrée", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByText("Entrée enregistrée, avec son auteur.", { exact: true })).toBeVisible();
  await expect(panel.getByText(body, { exact: true }).filter({ visible: true })).toHaveCount(1);
}
