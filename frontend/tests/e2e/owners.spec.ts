import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createProperty, addOwners } from "../helpers/inventory";
import { staffCommand } from "../helpers/leads";

test("propriétaire: create, private scope, inventory history and former link", async ({ page }) => {
  test.setTimeout(180_000);
  const agent = await createActor("agent");
  const manager = await createActor("manager");
  const outsider = await createActor("agent");
  const name = `Propriétaire synthétique ${randomUUID().slice(0, 8)}`;
  const phone = `+2126${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`;
  try {
    await signIn(page, agent);
    await page.goto("/owners/new");
    await page.getByLabel("Nom du contact", { exact: true }).fill(name);
    await page.getByLabel("Téléphone 1 *", { exact: true }).fill(phone);
    await page.getByRole("button", { name: "Créer le propriétaire", exact: true }).click();
    await expect.poll(() => /^\/owners\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
    const ownerId = new URL(page.url()).pathname.split("/")[2];
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: phone, exact: true })).toBeVisible();
    await page.goto("/owners");
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^[0-9]+ propriétaires?$/ })).toBeVisible();
    await expect(page.getByRole("table", { name: "Une ligne par propriétaire accessible." })).toBeVisible();
    await mkdir("output/playwright", { recursive: true });
    await page.screenshot({ path: "output/playwright/owners-directory-desktop.png" });
    await page.getByRole("search").getByLabel("Rechercher", { exact: true }).fill("aucun propriétaire correspondant");
    await expect(page.getByText("Aucun propriétaire ne correspond à cette recherche.")).toBeVisible();
    await page.getByRole("search").getByLabel("Rechercher", { exact: true }).fill(name);
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: "output/playwright/owners-directory-mobile.png" });
    await page.getByRole("button", { name: "Afficher les filtres" }).click();
    await expect(page.getByRole("dialog").getByLabel("Rechercher", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1280, height: 720 });

    await clearActorContext(page); await signIn(page, manager);
    const propertyId = await createProperty(page);
    await addOwners(page, [name]);
    await clearActorContext(page); await signIn(page, agent);
    await page.goto(`/owners/${ownerId}`);
    await expect(page.getByText("1 lien(s) de propriété actuel(s).")).toBeVisible();
    await page.getByRole("link", { name: "Voir l’historique du bien" }).click();
    await expect(page.getByRole("tab", { name: "Historique", exact: true })).toHaveAttribute("aria-selected", "true");

    await page.goto(`/owners/${ownerId}/edit`);
    await page.getByLabel("Nom du contact", { exact: true }).fill(`${name} révisé`);
    await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
    await expect(page.getByRole("heading", { name: `${name} révisé`, exact: true })).toBeVisible();

    await clearActorContext(page); await signIn(page, outsider);
    await page.goto("/owners");
    await expect(page.getByRole("heading", { name: "0 propriétaire", exact: true })).toBeVisible();
    await page.goto(`/owners/${ownerId}`);
    await expect(page.getByText("Cette fiche est introuvable ou vous n’y avez plus accès.")).toBeVisible();

    await clearActorContext(page); await signIn(page, manager);
    const property = await (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
    const removed = await staffCommand(page, `properties/${propertyId}/owners`, { expected_version: property.version, owners: [] }, "PUT");
    expect(removed.status()).toBe(200);
    await clearActorContext(page); await signIn(page, agent);
    await page.goto(`/owners/${ownerId}`);
    await page.getByRole("tab", { name: "Anciens biens" }).click();
    await expect(page.getByText("1 ancien(s) lien(s) de propriété.")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByText("1 ancien(s) lien(s) de propriété.").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/playwright/owner-history-mobile.png" });
  } finally {
    await clearActorContext(page).catch(() => {});
    await removeActor(manager);
    await removeActor(agent);
    await removeActor(outsider);
  }
});
