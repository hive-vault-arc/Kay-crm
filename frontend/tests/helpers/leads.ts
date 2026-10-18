import { randomUUID } from "node:crypto";
import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth";

export async function changeLeadFilters(page: Page, change: (panel: Locator) => Promise<void>) {
  const trigger = page.getByRole("button", { name: "Afficher les filtres", exact: true });
  const desktop = page.locator('[data-filter-panel="desktop"]');
  const mobile = await page.evaluate(() => !matchMedia("(min-width: 80rem)").matches);
  if (mobile) { await expect(trigger).toBeVisible(); await trigger.click(); }
  const panel = mobile ? page.getByRole("dialog", { name: "Filtres des Leads", exact: true }) : desktop;
  await expect(panel).toBeVisible();
  await change(panel);
  if (mobile) {
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(panel).toHaveCount(0);
  }
}

export async function createLead(page: Page, name = "SP05 contact synthétique", phone = "+212600000001") {
  await page.goto("/leads/new");
  await expect(page.getByRole("button", { name: "Créer le Lead", exact: true })).toBeEnabled();
  await page.getByLabel("Nom du contact", { exact: true }).fill(name);
  await page.getByLabel("Téléphone 1 *", { exact: true }).fill(phone);
  await page.getByLabel("Langues parlées *", { exact: true }).selectOption("french");
  await page.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH");
  await page.getByLabel("Message de la demande (facultatif)", { exact: true }).fill("SP05 demande synthétique de contrôle");
  await page.getByRole("button", { name: "Créer le Lead", exact: true }).click();
  await expect.poll(() => /^\/leads\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  return new URL(page.url()).pathname.split("/")[2];
}
export async function staffCommand(page: Page, route: string, body: object, method = "POST", key = randomUUID()) {
  const me = await page.request.get("/api/v1/auth/me");
  if (me.status() !== 200) throw new Error("SYNTHETIC_SESSION_UNAVAILABLE");
  const { csrf_token: csrf } = await me.json();
  return page.request.fetch(`/api/v1/${route}`, { method, headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrf, "Idempotency-Key": key }, data: body });
}
