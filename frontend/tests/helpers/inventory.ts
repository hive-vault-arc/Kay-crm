import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "./auth";

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
export async function openProperty(page: Page, id: string, tab = "Aperçu") {
  await page.goto(`/projects/properties/${id}`);
  await expect(page.getByRole("tab", { name: tab, exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: tab, exact: true }).click();
}
export async function addOwners(page: Page, names: string[], offersTab = "Offres") {
  await page.getByRole("tab", { name: "Propriétaires", exact: true }).click();
  await page.getByRole("button", { name: "Modifier les propriétaires", exact: true }).click();
  for (const [index, name] of names.entries()) {
    await page.getByLabel("Rechercher un contact accessible", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Rechercher le contact", exact: true }).click();
    await page.getByRole("button", { name: `Choisir ${name}`, exact: true }).click();
    await page.getByLabel(`Libellé commercial partagé ${index + 1} (facultatif)`, { exact: true }).fill(`SP07 vendeur autorisé ${index + 1}`);
  }
  await page.getByRole("button", { name: "Enregistrer les propriétaires", exact: true }).click();
  await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: offersTab, exact: true })).toBeEnabled();
}
export async function createCampaign(page: Page, kind: "sale" | "rental", price = "1234,56", period = "month") {
  await page.getByRole("tab", { name: "Offres", exact: true }).click();
  const label = kind === "sale" ? "vente" : "location";
  await page.getByRole("button", { name: `Créer une campagne ${label}`, exact: true }).click();
  await page.getByLabel(`Prix ${kind === "sale" ? "de vente" : "de location"} en MAD (facultatif)`, { exact: true }).fill(price);
  if (kind === "rental") await page.getByLabel("Période du loyer d’origine", { exact: true }).selectOption(period);
  await page.getByLabel("Conditions d’origine (facultatives)", { exact: true }).fill(`SP07 conditions initiales ${label}`);
  await page.getByRole("button", { name: "Créer la campagne", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "Offres", exact: true })).toBeEnabled();
}
export async function confirmCampaign(page: Page, kind: "sale" | "rental") {
  await page.getByRole("tab", { name: "Offres", exact: true }).click();
  const section = page.getByRole("region", { name: kind === "sale" ? "Vente" : "Location", exact: true });
  await section.getByLabel("Motif de la confirmation de disponibilité", { exact: true }).fill("SP07 vérification synthétique de disponibilité");
  await section.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
}
