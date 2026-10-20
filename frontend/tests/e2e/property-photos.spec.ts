import path from "node:path";
import { mkdir } from "node:fs/promises";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { testControl } from "../helpers/api-process";

test("property photos: browser WebP conversion, ten slots, archive and agent read-only", async ({ page }) => {
  test.setTimeout(180_000);
  const manager = await createActor("manager", false, "SP06 Photos synthétiques");
  const agent = await createActor("agent", false, "SP06 Photos lecture seule");
  try {
    await signIn(page, manager);
    await page.setViewportSize({ width: 1440, height: 900 });
    await testControl("worker-start");
    const created = await staffCommand(page, "properties", { reference: `PHOTO-${Date.now()}`, category: "house", marketing_name: "Bien photo synthétique", location: null, area_sqm: null });
    expect(created.status()).toBe(200);
    const id = (await created.json()).property_id as string;
    await page.goto(`/projects/properties/${id}`);
    const gallery = page.getByRole("region", { name: "Photos du bien" });
    await expect(gallery.getByText("0 / 10 photos")).toBeVisible();
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/patio.png"));
    await gallery.getByRole("button", { name: "Envoyer la photo" }).click();
    await expect(gallery.getByText("1 / 10 photos")).toBeVisible();
    await expect(gallery.getByText("Analyse réussie")).toBeVisible({ timeout: 60_000 });
    await expect(gallery.locator('img[src^="blob:"]')).toBeVisible();
    await expect(page.locator('header img[src^="blob:"]').first()).toBeVisible();
    await mkdir("output/playwright/property-photos", { recursive: true });
    await page.screenshot({ path: "output/playwright/property-photos/desktop.png", fullPage: true });
    const photos = await (await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${id}&purpose=photo&page=1&page_size=10`)).json();
    expect(photos.total).toBe(1);
    expect(photos.items[0].filename).toBe("patio.webp");
    expect(photos.items[0].mime_type).toBe("image/webp");
    expect(photos.items[0].size_bytes).toBeGreaterThan(0);
    const invalid = await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, filename: "direct.png", mime_type: "image/png", size_bytes: 100 });
    expect(invalid.status()).toBe(415);
    for (let index = 0; index < 9; index++) {
      const result = await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, purpose: "photo", filename: `attente-${index}.webp`, mime_type: "image/webp", size_bytes: 100 });
      expect(result.status()).toBe(200);
    }
    await page.reload();
    await expect(gallery.getByText("10 / 10 photos")).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Choisir une image" })).toHaveCount(0);
    const overflow = await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, purpose: "photo", filename: "onze.webp", mime_type: "image/webp", size_bytes: 100 });
    expect(overflow.status()).toBe(409);
    await gallery.getByRole("button", { name: "Archiver" }).first().click();
    await page.getByRole("button", { name: "Confirmer l’archivage" }).click();
    await expect(gallery.getByText("9 / 10 photos")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(gallery.getByRole("button", { name: "Choisir une image" })).toBeVisible();
    const geometry = await page.evaluate(() => ({
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll("body *")).filter(element => element.getBoundingClientRect().right > window.innerWidth + 2).slice(0, 8).map(element => ({ tag: element.tagName, className: typeof element.className === "string" ? element.className.slice(0, 100) : "" })),
    }));
    expect(geometry.documentWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width + 1);
    await page.screenshot({ path: "output/playwright/property-photos/mobile.png", fullPage: true });
    await clearActorContext(page); await signIn(page, agent); await page.goto(`/projects/properties/${id}`);
    await expect(page.getByRole("region", { name: "Photos du bien" }).getByText("9 / 10 photos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choisir une image" })).toHaveCount(0);
    expect((await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, purpose: "photo", filename: "agent.webp", mime_type: "image/webp", size_bytes: 100 })).status()).toBe(403);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(agent); await removeActor(manager); }
});
