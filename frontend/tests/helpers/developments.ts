import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export async function createDevelopment(page: Page, category = "mixed") {
  await page.goto("/projects/new");
  const reference = `SP08-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.getByLabel("Référence du programme", { exact: true }).fill(reference);
  await page.getByLabel("Nom du programme", { exact: true }).fill("Programme mixte synthétique");
  await page.getByLabel("Catégorie du programme", { exact: true }).selectOption(category);
  await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
  const id = new URL(page.url()).pathname.split("/")[2];
  return { id, reference, path: `/projects/${id}` };
}
export async function openDevelopment(page: Page, id: string, tab = "Aperçu") {
  await page.goto(`/projects/${id}`);
  await expect(page.getByRole("tab", { name: tab, exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: tab, exact: true }).click();
}
export async function createBlock(page: Page, code = "B1") {
  await page.getByRole("tab", { name: "Blocs et étages", exact: true }).click();
  await page.getByRole("button", { name: "Créer un bloc", exact: true }).click();
  await page.getByLabel("Code du bloc", { exact: true }).fill(code);
  await page.getByLabel("Libellé du bloc", { exact: true }).fill(`Bloc synthétique ${code}`);
  await page.getByRole("button", { name: "Enregistrer le bloc", exact: true }).click();
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createFloor(page: Page, block = "B1", code = "F2") {
  await page.getByRole("tab", { name: "Blocs et étages", exact: true }).click();
  await page.getByRole("button", { name: `Explorer ${block}`, exact: true }).click();
  await page.getByRole("button", { name: "Créer un étage", exact: true }).click();
  await page.getByLabel("Code de l’étage", { exact: true }).fill(code);
  await page.getByLabel("Libellé de l’étage", { exact: true }).fill(`Étage synthétique ${code}`);
  await page.getByRole("button", { name: "Enregistrer l’étage", exact: true }).click();
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createType(page: Page, code = "T2", label = "T2 / 80 m²") {
  await page.getByRole("tab", { name: "Types réutilisables", exact: true }).click();
  await page.getByRole("button", { name: "Créer un type réutilisable", exact: true }).click();
  await page.getByLabel("Code du type réutilisable", { exact: true }).fill(code);
  await page.getByLabel("Libellé du type réutilisable", { exact: true }).fill(label);
  await page.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).fill("80,00");
  await page.getByRole("button", { name: "Enregistrer le type réutilisable", exact: true }).click();
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createUnit(page: Page, did: string, floor = "F2", category = "apartment", area = "80,00") {
  await openDevelopment(page, did, "Unités");
  await page.getByRole("button", { name: "Créer une unité physique", exact: true }).click();
  const reference = `SP08-U-${randomUUID().slice(0, 8)}`.toUpperCase();
  await page.getByLabel("Référence du bien", { exact: true }).fill(reference);
  await page.getByLabel("Catégorie", { exact: true }).selectOption(category);
  await page.getByLabel("Surface en m² (facultative)", { exact: true }).fill(area);
  if (category === "apartment") {
    await page.getByLabel("Bloc de l’unité", { exact: true }).selectOption({ label: "B1 · Bloc synthétique B1" });
    await page.getByLabel("Étage de l’unité", { exact: true }).selectOption({ label: `${floor} · Étage synthétique ${floor}` });
    await page.getByLabel("Type réutilisable de l’unité", { exact: true }).selectOption({ label: "T2 · T2 / 80 m²" });
  }
  await page.getByRole("button", { name: "Créer l’unité", exact: true }).click();
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
  return { id: new URL(page.url()).pathname.split("/")[3], reference };
}
