import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { inventorySection, openInventoryHistory } from "./inventory";

export async function createDevelopment(page: Page, category = "mixed") {
  await page.goto("/projects/new");
  const reference = `SP08-${randomUUID().slice(0, 8)}`.toUpperCase();
  const name = "Programme mixte synthétique";
  await page.getByLabel("Référence du programme", { exact: true }).fill(reference);
  await page.getByLabel("Nom du programme", { exact: true }).fill(name);
  await page.getByLabel("Catégorie du programme", { exact: true }).selectOption(category);
  const form = page.getByRole("form", { name: "Créer un programme" });
  const navigation = form.getByRole("group", { name: "Navigation du formulaire" });
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(form.getByRole("navigation", { name: "Progression de la création", exact: true }).getByRole("button", { name: "Étape 2 sur 3 : Localisation et contexte", exact: true })).toHaveAttribute("aria-current", "step");
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(form.getByRole("navigation", { name: "Progression de la création", exact: true }).getByRole("button", { name: "Étape 3 sur 3 : Vérification", exact: true })).toHaveAttribute("aria-current", "step");
  await navigation.getByRole("button", { name: "Créer le programme", exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(reference);
  const id = new URL(page.url()).pathname.split("/")[2];
  return { id, reference, name, path: `/projects/${id}` };
}
export async function openDevelopment(page: Page, id: string, tab = "Aperçu") {
  await page.goto(`/projects/${id}`);
  const tabs = page.getByRole("tablist", { name: "Rubriques du programme", exact: true });
  await tabs.getByRole("tab", { name: tab === "Unités" ? /^Unités(?:\s*\d+)?$/ : "Aperçu", exact: true }).click();
  if (tab === "Historique") await openInventoryHistory(page);
  else if (tab === "Blocs et étages" || tab === "Types réutilisables") await openProgrammeStructure(page, tab === "Types réutilisables");
  else if (!["Aperçu", "Unités"].includes(tab)) await inventorySection(page, tab).scrollIntoViewIfNeeded();
}
export async function openProgrammeStructure(page: Page, types = false) {
  const drawer = page.getByRole("dialog", { name: "Structure du programme", exact: true });
  if (!await drawer.isVisible()) {
    await page.getByRole("tablist", { name: "Rubriques du programme", exact: true }).getByRole("tab", { name: /^Unités(?:\s*\d+)?$/ }).click();
    await page.getByRole("button", { name: "Structure du programme", exact: true }).click();
  }
  await drawer.getByRole("tablist", { name: "Structure du programme", exact: true }).getByRole("tab", { name: types ? "Types" : "Blocs et étages", exact: true }).click();
  return drawer;
}
export async function closeProgrammeStructure(page: Page) {
  const drawer = page.getByRole("dialog", { name: "Structure du programme", exact: true });
  await drawer.getByRole("button", { name: "Fermer : Structure du programme", exact: true }).click(); await expect(drawer).not.toBeVisible();
}
export async function createBlock(page: Page, code = "B1") {
  const drawer = await openProgrammeStructure(page); await drawer.getByRole("button", { name: "Créer un bloc", exact: true }).click();
  const form = drawer.getByRole("form", { name: "Créer un bloc", exact: true });
  await form.getByLabel("Code", { exact: true }).fill(code); await form.getByLabel("Libellé", { exact: true }).fill(`Bloc synthétique ${code}`);
  await form.getByRole("button", { name: "Enregistrer", exact: true }).click(); await expect(form).not.toBeVisible(); await closeProgrammeStructure(page);
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createFloor(page: Page, block = "B1", code = "F2") {
  const drawer = await openProgrammeStructure(page); await drawer.getByRole("button", { name: `Étages de ${block}`, exact: true }).click();
  await drawer.getByRole("button", { name: "Créer un étage", exact: true }).click(); const form = drawer.getByRole("form", { name: "Créer un étage", exact: true });
  await form.getByLabel("Code", { exact: true }).fill(code); await form.getByLabel("Libellé", { exact: true }).fill(`Étage synthétique ${code}`);
  await form.getByRole("button", { name: "Enregistrer", exact: true }).click(); await expect(form).not.toBeVisible(); await closeProgrammeStructure(page);
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createType(page: Page, code = "T2", label = "T2 / 80 m²") {
  const drawer = await openProgrammeStructure(page, true); await drawer.getByRole("button", { name: "Créer un type", exact: true }).click();
  const form = drawer.getByRole("form", { name: "Créer un type réutilisable", exact: true });
  await form.getByLabel("Code", { exact: true }).fill(code); await form.getByLabel("Libellé", { exact: true }).fill(label); await form.getByLabel("Surface par défaut (m²)", { exact: true }).fill("80,00");
  await form.getByRole("button", { name: "Enregistrer", exact: true }).click(); await expect(form).not.toBeVisible(); await closeProgrammeStructure(page);
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function createUnit(page: Page, did: string, floor = "F2", category = "apartment", area = "80,00", price = "900000,01") {
  await openDevelopment(page, did, "Unités");
  await page.getByRole("button", { name: "Créer une unité", exact: true }).click();
  const form = page.getByRole("form", { name: "Créer une unité", exact: true });
  const navigation = form.getByRole("group", { name: "Navigation du formulaire" });
  const reference = `SP08-U-${randomUUID().slice(0, 8)}`.toUpperCase();
  await form.locator("#property-reference").fill(reference);
  await form.locator("#property-category").selectOption(category);
  await form.locator("#property-price_mad").fill(price.replace(",", "."));
  if (category === "apartment") {
    await form.getByLabel("Bloc de l’unité", { exact: true }).selectOption({ label: "B1 · Bloc synthétique B1" });
    await form.getByLabel("Étage de l’unité", { exact: true }).selectOption({ label: `${floor} · Étage synthétique ${floor}` });
    await form.getByLabel("Type réutilisable de l’unité", { exact: true }).selectOption({ label: "T2 · T2 / 80 m²" });
  }
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await form.locator("#property-area_sqm").fill(area.replace(",", "."));
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await navigation.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(form.getByRole("button", { name: "Étape 5 sur 5 : Vérification", exact: true })).toHaveAttribute("aria-current", "step");
  await navigation.getByRole("button", { name: "Créer l’unité", exact: true }).click();
  await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
  return { id: new URL(page.url()).pathname.split("/")[3], reference };
}
