import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "./auth";

export async function propertyEditStep(page: Page, target: number) {
  const form = page.getByRole("form", { name: /^(Modifier le bien|Modifier l’unité)$/ });
  const progress = form.getByRole("navigation", { name: "Progression de la modification", exact: true });
  const step = progress.getByRole("button", { name: new RegExp(`^Étape ${target + 1} sur 5 : `) });
  if (await step.getAttribute("aria-current") !== "step") await step.click();
  await expect(step).toHaveAttribute("aria-current", "step");
}

export async function savePropertyEdit(page: Page) {
  const form = page.getByRole("form", { name: /^(Modifier le bien|Modifier l’unité)$/ });
  if (await form.getAttribute("data-write-recovery") === "true") {
    await form.getByRole("button", { name: /^(Réessayer la même opération|Actualiser le résultat)$/ }).click(); return;
  }
  await propertyEditStep(page, 4);
  await form.getByRole("button", { name: /^(Enregistrer le bien|Enregistrer l’unité)$/ }).click();
}

export async function createProperty(page: Page, category = "apartment", reference = `SP07-${randomUUID()}`) {
  // Existing campaign-lifecycle tests need an empty property with no initial offer.
  // The standalone UI now creates a priced draft; its own flow has dedicated coverage.
  await page.goto("/projects");
  const id = await page.evaluate(async ({ category, reference }) => {
    const identity = await fetch("/api/v1/auth/me", { credentials: "same-origin" });
    if (!identity.ok) throw new Error(`TEST_IDENTITY_${identity.status}`);
    const { csrf_token } = await identity.json() as { csrf_token: string };
    const response = await fetch("/api/v1/properties", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf_token, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ reference, category, marketing_name: null, location: null, area_sqm: null, rooms: null }),
    });
    if (!response.ok) throw new Error(`TEST_PROPERTY_CREATE_${response.status}`);
    return (await response.json() as { property_id: string }).property_id;
  }, { category, reference });
  await page.goto(`/projects/properties/${id}`);
  await expect(page.getByRole("heading", { name: reference.toUpperCase(), exact: true })).toBeVisible();
  return id;
}
export function inventorySection(page: Page, name: string | RegExp) {
  return page.getByRole("heading", { name, exact: true }).locator("..").locator("..");
}
export async function openInventoryHistory(page: Page) {
  await page.getByRole("button", { name: "Actions", exact: true }).click();
  await page.getByRole("button", { name: "Historique", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Historique", exact: true }); await expect(drawer).toBeVisible(); return drawer;
}
export async function openProperty(page: Page, id: string, section = "Aperçu") {
  await page.goto(`/projects/properties/${id}`);
  await expect(page.getByRole("region", { name: "Informations du bien", exact: true })).toBeVisible();
  if (section === "Historique") await openInventoryHistory(page);
  else if (section !== "Aperçu") await inventorySection(page, section).scrollIntoViewIfNeeded();
}
export async function openOwnerEditor(page: Page) {
  await inventorySection(page, "Propriétaires").getByRole("button", { name: "Modifier", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Propriétaires légaux", exact: true }); await expect(drawer).toBeVisible(); return drawer;
}
export async function addOwners(page: Page, names: string[]) {
  const drawer = await openOwnerEditor(page);
  for (const [index, name] of names.entries()) {
    await drawer.getByLabel("Rechercher un contact accessible", { exact: true }).fill(name);
    await drawer.getByRole("button", { name: "Rechercher", exact: true }).click();
    await drawer.getByRole("button", { name: `Choisir ${name}`, exact: true }).click();
    const entry = drawer.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await entry.getByLabel("Libellé commercial partagé (facultatif)", { exact: true }).fill(`SP07 vendeur autorisé ${index + 1}`);
  }
  await drawer.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
  await expect(inventorySection(page, "Propriétaires").getByRole("button", { name: "Modifier", exact: true })).toBeEnabled();
}
export async function createCampaign(page: Page, kind: "sale" | "rental", price = "1234,56", period = "month") {
  const label = kind === "sale" ? "vente" : "location";
  await page.getByRole("button", { name: `Créer une offre de ${label}`, exact: true }).click();
  const drawer = page.getByRole("dialog", { name: `Créer une offre de ${label}`, exact: true });
  await drawer.getByLabel("Prix (MAD, facultatif)", { exact: true }).fill(price);
  if (kind === "rental") await drawer.getByLabel("Période du tarif d’origine", { exact: true }).selectOption(period);
  await drawer.getByLabel("Conditions d’origine (facultatives)", { exact: true }).fill(`SP07 conditions initiales ${label}`);
  await drawer.getByRole("button", { name: "Créer la campagne", exact: true }).click();
  await expect(drawer).not.toBeVisible(); await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
export async function openAvailability(page: Page, kind: "sale" | "rental") {
  await page.getByRole("button", { name: `Confirmer la disponibilité ${kind === "sale" ? "vente" : "location"}`, exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Confirmer la disponibilité", exact: true }); await expect(drawer).toBeVisible(); return drawer;
}
export async function confirmCampaign(page: Page, kind: "sale" | "rental") {
  const drawer = await openAvailability(page, kind);
  await drawer.getByLabel("Motif de confirmation", { exact: true }).fill("SP07 vérification synthétique de disponibilité");
  await drawer.getByRole("button", { name: /^(Reconfirmer|Confirmer) la disponibilité$/ }).click();
  await expect(drawer).not.toBeVisible(); await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
}
