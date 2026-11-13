import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createProperty, addOwners } from "../helpers/inventory";
import { staffCommand } from "../helpers/leads";

test("propriétaire: create, private scope, inventory history and former link", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const agent = await createActor("agent");
  const manager = await createActor("manager");
  const outsider = await createActor("agent");
  const name = `Propriétaire synthétique ${randomUUID().slice(0, 8)}`;
  const phone = `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
  try {
    await signIn(page, agent);
    await page.goto("/owners/new");
    await page.getByLabel("Nom complet", { exact: true }).fill(name);
    await page.getByLabel("Téléphone 1 *", { exact: true }).fill(phone);
    const created = page.waitForResponse(response => response.url().endsWith("/api/v1/contacts") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Créer le propriétaire", exact: true }).click();
    expect((await created).status()).toBe(200);
    await expect.poll(() => /^\/owners\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
    const ownerId = new URL(page.url()).pathname.split("/")[2];
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `Appeler ${phone}`, exact: true })).toHaveAttribute("href", `tel:${phone}`);
    await page.goto("/owners");
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(page.locator('header [aria-live="polite"]').filter({ hasText: /^1 propriétaire$/ })).toBeVisible();
    await expect(page.getByRole("table", { name: "Une ligne par propriétaire accessible." })).toBeVisible();
    await mkdir("output/playwright", { recursive: true });
    await page.screenshot({ path: "output/playwright/owners-directory-desktop.png" });
    const filters = page.getByRole("search", { name: "Recherche et filtres des propriétaires", exact: true });
    await filters.getByLabel("Rechercher", { exact: true }).fill("aucun propriétaire correspondant");
    await expect(page.getByRole("heading", { name: "Aucun propriétaire correspondant", exact: true })).toBeVisible();
    await filters.getByLabel("Rechercher", { exact: true }).fill(name);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: "output/playwright/owners-directory-mobile.png" });
    await page.getByRole("button", { name: /^Afficher les filtres/ }).click();
    await expect(page.getByRole("dialog").getByLabel("Rechercher", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 720 });

    await clearActorContext(page); await signIn(page, manager);
    const propertyId = await createProperty(page);
    await addOwners(page, [name]);
    await clearActorContext(page); await signIn(page, agent);
    await page.goto(`/owners/${ownerId}`);
    const portfolio = page.getByRole("complementary", { name: "Suivi et outils", exact: true });
    await expect(portfolio.getByRole("status")).toHaveText("1 lien de propriété actuel");
    await portfolio.getByRole("list", { name: "Biens actuels", exact: true }).getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/projects/properties/${propertyId}$`));
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Historique", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Historique", exact: true })).toBeVisible();

    await page.goto(`/owners/${ownerId}/edit`);
    await page.getByLabel("Nom complet", { exact: true }).fill(`${name} révisé`);
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByRole("heading", { name: `${name} révisé`, exact: true })).toBeVisible();

    await clearActorContext(page); await signIn(page, outsider);
    await page.goto("/owners");
    await expect(page.getByRole("heading", { name: "Aucun propriétaire enregistré", exact: true })).toBeVisible();
    await page.goto(`/owners/${ownerId}`);
    await expect(page.getByText("Cette fiche est introuvable ou vous n’y avez plus accès.")).toBeVisible();

    await clearActorContext(page); await signIn(page, manager);
    const property = await (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
    const removed = await staffCommand(page, `properties/${propertyId}/owners`, { expected_version: property.version, owners: [] }, "PUT");
    expect(removed.status()).toBe(200);
    await clearActorContext(page); await signIn(page, agent);
    await page.goto(`/owners/${ownerId}`);
    await portfolio.getByRole("tab", { name: "Anciens biens", exact: true }).click();
    await expect(portfolio.getByRole("status")).toHaveText("1 lien de propriété ancien");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await portfolio.getByRole("status").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/playwright/owner-history-mobile.png" });
  } finally {
    await clearActorContext(page).catch(() => {});
    await removeActor(manager);
    await removeActor(agent);
    await removeActor(outsider);
  }
});
