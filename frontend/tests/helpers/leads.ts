import { randomUUID } from "node:crypto";
import type { Locator, Page } from "@playwright/test";
import { expect } from "./auth";
import { creationKeySchema } from "@/features/finance/contracts";

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
  await expect(page.getByRole("button", { name: "Créer le prospect", exact: true })).toBeEnabled();
  await page.getByLabel("Nom du contact", { exact: true }).fill(name);
  await page.getByLabel("Téléphone 1 *", { exact: true }).fill(phone);
  await page.getByLabel("Langues parlées *", { exact: true }).selectOption("french");
  await page.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH");
  await page.getByLabel("Message", { exact: true }).fill("SP05 demande synthétique de contrôle");
  await page.getByRole("button", { name: "Créer le prospect", exact: true }).click();
  await expect.poll(() => /^\/leads\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
  await expect(page.getByRole("heading", { name, exact: true, level: 1 })).toBeVisible();
  return new URL(page.url()).pathname.split("/")[2];
}
export async function staffCommand(page: Page, route: string, body: object, method = "POST", key?: string) {
  const me = await page.request.get("/api/v1/auth/me");
  if (me.status() !== 200) throw new Error("SYNTHETIC_SESSION_UNAVAILABLE");
  const { csrf_token: csrf } = await me.json();
  let requestKey = key;
  if (!requestKey && method === "POST" && /^deals\/[a-f0-9-]{36}\/commissions$/.test(route)) {
    const issued = await page.request.get(`/api/v1/deals/${route.split("/")[1]}/commission-creation-key`);
    if (issued.status() !== 200) throw new Error("SYNTHETIC_FINANCE_CREATION_KEY_UNAVAILABLE");
    const result = creationKeySchema.parse(await issued.json());
    if (result.deal_id !== route.split("/")[1]) throw new Error("SYNTHETIC_FINANCE_CREATION_KEY_MISMATCH");
    requestKey = result.key;
  }
  return page.request.fetch(`/api/v1/${route}`, { method, headers: { Origin: new URL(page.url()).origin, "X-CSRF-Token": csrf, "Idempotency-Key": requestKey ?? randomUUID() }, data: body });
}
