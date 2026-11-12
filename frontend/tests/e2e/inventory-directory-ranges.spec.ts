import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test("selected inventory ranges: exact same-offer filtering, invalid draft recovery and phone image cards", async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager");
  const created: { id: string; name: string }[] = [];
  try {
    await signIn(page, manager);
    for (const name of ["SYN range valid", "SYN range split"]) {
      const response = await staffCommand(page, "properties", { reference: `SYN-RANGE-${randomUUID().slice(0, 8)}`, category: "apartment", marketing_name: name, location: null, area_sqm: "100", rooms: 3 });
      expect(response.status()).toBe(200); created.push({ id: (await response.json()).property_id, name });
    }
    for (const [index, kind, amount, period] of [[0, "sale", "5000.00", null], [0, "rental", "100.01", "month"], [1, "sale", "3000.00", null], [1, "rental", "1000.00", "month"]] as const) {
      const detail = await (await page.request.get(`/api/v1/properties/${created[index].id}`)).json();
      const result = await staffCommand(page, "offerings", { property_id: detail.id, expected_property_version: detail.version, kind, price_mad: amount, price_period: period, currency: "MAD", conditions: "Synthetic directory range" });
      expect(result.status()).toBe(200);
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/projects?kind=biens");
    const valid = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === "/api/v1/properties" && url.searchParams.get("min_comparison_mad") === "4000" && url.searchParams.get("max_comparison_mad") === "10000" && url.searchParams.get("min_area_sqm") === "90.00" && url.searchParams.get("min_rooms") === "2"; }, { timeout: 15_000 });
    const filters = page.locator('[data-filter-panel="desktop"]:visible');
    await filters.getByLabel("Prix ou loyer annuel minimum (MAD)", { exact: true }).fill("4000");
    await filters.getByLabel("Prix ou loyer annuel maximum (MAD)", { exact: true }).fill("10000");
    await filters.getByLabel("Surface minimale (m²)", { exact: true }).fill("90.00"); await filters.getByLabel("Pièces minimales", { exact: true }).fill("2");
    const response = await valid; expect(response.status()).toBe(200); const body = await response.json(); expect(body.items.map((item: { id: string }) => item.id)).toEqual([created[0].id]); expect(body.category_counts.apartment).toBe(1);
    const resultLink = (index: number) => page.locator(`main a[href="/projects/properties/${created[index].id}"]:visible`);
    await expect(resultLink(0)).toBeVisible();
    await filters.getByLabel("Prix ou loyer annuel minimum (MAD)", { exact: true }).fill("10001");
    await expect(page.getByRole("alert").filter({ hasText: "Le maximum doit être supérieur ou égal au minimum." })).toBeVisible();
    await expect(resultLink(0)).toBeVisible();
    await page.getByRole("button", { name: "Liste", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /Afficher les filtres/ }).click();
    const dialog = page.getByRole("dialog", { name: "Filtres des biens", exact: true });
    await expect(dialog.getByLabel("Prix ou loyer annuel minimum (MAD)", { exact: true })).toHaveValue("10001");
    await dialog.getByLabel("Prix ou loyer annuel maximum (MAD)", { exact: true }).fill("12000");
    await dialog.getByRole("button", { name: "Appliquer", exact: true }).click(); await expect(dialog).toHaveCount(0);
    await expect(resultLink(1)).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 }); await expect(page.getByRole("button", { name: "Liste", exact: true })).toHaveAttribute("aria-pressed", "true");
  } finally { await clearActorContext(page); await removeActor(manager); }
});
