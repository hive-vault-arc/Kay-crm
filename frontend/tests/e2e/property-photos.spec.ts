import path from "node:path";
import { mkdir } from "node:fs/promises";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { testControl } from "../helpers/api-process";
import { createBlock, createDevelopment, createFloor, createType, createUnit } from "../helpers/developments";
import { geometry } from "../helpers/report-review";

test("property photos: private viewer, browser WebP conversion, ten slots, archive and agent upload", async ({ page }) => {
  test.setTimeout(240_000);
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
    await expect(gallery.getByRole("button", { name: "Choisir une image" })).toBeInViewport();
    let interrupted = false;
    await page.route("**/transfers/**", route => {
      if (route.request().method() === "PUT" && !interrupted) {
        interrupted = true;
        return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"FILE_STORAGE_UNAVAILABLE"}}' });
      }
      return route.continue();
    });
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/patio.png"));
    await expect(gallery.getByRole("button", { name: "Envoyer la photo" })).toHaveCount(0);
    await expect(gallery.getByRole("alert")).toBeVisible();
    await gallery.getByRole("button", { name: "Réessayer l’envoi" }).click();
    await page.unroute("**/transfers/**");
    await expect(gallery.getByText("1 / 10 photos")).toBeVisible();
    await expect(gallery.getByText("Analyse réussie")).toBeVisible({ timeout: 60_000 });
    await expect(gallery.locator('img[src^="blob:"]')).toBeVisible();
    const firstPhoto = gallery.getByRole("button", { name: "Ouvrir la photo patio.webp" });
    await firstPhoto.click();
    const viewer = page.getByRole("dialog", { name: "Photos du bien" });
    await expect(viewer.getByRole("img", { name: "Photo du bien : patio.webp" })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Précédente" })).toBeDisabled();
    await expect(viewer.getByRole("button", { name: "Suivante" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(firstPhoto).toBeFocused();
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/sable.png"));
    await expect(gallery.getByText("2 / 10 photos")).toBeVisible();
    const secondPhoto = gallery.getByRole("button", { name: "Ouvrir la photo sable.webp" });
    await expect(secondPhoto).toBeVisible({ timeout: 60_000 });
    await secondPhoto.click();
    await mkdir("output/playwright/property-photos", { recursive: true });
    await expect(viewer.getByRole("img", { name: "Photo du bien : sable.webp" })).toBeVisible();
    await page.screenshot({ path: "output/playwright/property-photos/viewer-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(viewer.getByRole("button", { name: "Suivante" })).toBeVisible();
    const viewerGeometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    expect(viewerGeometry.documentWidth).toBeLessThanOrEqual(viewerGeometry.width + 1);
    await page.screenshot({ path: "output/playwright/property-photos/viewer-mobile.png" });
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(viewer.getByRole("button", { name: "Précédente" })).toBeVisible();
    await expect(viewer.getByRole("button", { name: "Suivante" })).toBeVisible();
    const narrowGeometry = await viewer.evaluate(element => ({ viewerWidth: element.getBoundingClientRect().width, controls: Array.from(element.querySelectorAll("button")).map(button => ({ name: button.getAttribute("aria-label"), left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })) }));
    expect(narrowGeometry.controls.filter(control => control.name === "Précédente" || control.name === "Suivante").every(control => control.left >= 0 && control.right <= 320), JSON.stringify(narrowGeometry)).toBe(true);
    await page.screenshot({ path: "output/playwright/property-photos/viewer-narrow.png" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await viewer.getByRole("button", { name: "Suivante" }).click();
    await expect(viewer.getByRole("img", { name: "Photo du bien : patio.webp" })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(viewer.getByRole("img", { name: "Photo du bien : sable.webp" })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByRole("img", { name: "Photo du bien : patio.webp" })).toBeVisible();
    await page.route("**/transfers/**", route => route.request().method() === "GET"
      ? route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"FILE_STORAGE_UNAVAILABLE"}}' })
      : route.continue());
    await viewer.getByRole("button", { name: "Précédente" }).click();
    await expect(viewer.getByRole("alert")).toHaveText("Impossible d’ouvrir cette photo.");
    await page.unroute("**/transfers/**");
    await viewer.getByRole("button", { name: "Réessayer" }).click();
    await expect(viewer.getByRole("img", { name: "Photo du bien : sable.webp" })).toBeVisible();
    await viewer.getByRole("button", { name: "Fermer la photo" }).click();
    await expect(viewer).toHaveCount(0);
    await expect(page.locator('header img[src^="blob:"]').first()).toBeVisible();
    await page.screenshot({ path: "output/playwright/property-photos/desktop.png", fullPage: true });
    const photos = await (await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${id}&purpose=photo&page=1&page_size=10`)).json();
    expect(photos.total).toBe(2);
    expect(photos.items.map((item: { filename: string }) => item.filename)).toEqual(expect.arrayContaining(["patio.webp", "sable.webp"]));
    expect(photos.items[0].mime_type).toBe("image/webp");
    expect(photos.items[0].size_bytes).toBeGreaterThan(0);
    const invalid = await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, filename: "direct.png", mime_type: "image/png", size_bytes: 100 });
    expect(invalid.status()).toBe(415);
    for (let index = 0; index < 8; index++) {
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
    await page.getByRole("region", { name: "Photos du bien" }).getByRole("button", { name: "Ouvrir la photo sable.webp" }).click();
    await expect(page.getByRole("dialog", { name: "Photos du bien" }).getByRole("img", { name: "Photo du bien : sable.webp" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(gallery.getByRole("button", { name: "Choisir une image" })).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Archiver", exact: true })).toHaveCount(0);
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/patio.png"));
    await expect(gallery.getByText("10 / 10 photos")).toBeVisible();
    await expect(gallery.getByText("Analyse réussie")).toHaveCount(3, { timeout: 60_000 });
    expect((await staffCommand(page, "documents", { parent_kind: "property", parent_id: id, filename: "private.pdf", mime_type: "application/pdf", size_bytes: 100 })).status()).toBe(403);
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(agent); await removeActor(manager); }
});

test("agent automatically uploads project and physical apartment photos without document privileges", async ({ page }) => {
  test.setTimeout(180_000);
  const agent = await createActor("agent", false, "SP06 Photos agent");
  try {
    await signIn(page, agent);
    await page.setViewportSize({ width: 1440, height: 900 });
    await testControl("worker-start");
    const project = await createDevelopment(page);
    const gallery = page.getByRole("region", { name: "Photos du bien" });
    await expect(gallery.getByText("0 / 10 photos")).toBeVisible();
    const galleryWidth = await gallery.evaluate(element => element.getBoundingClientRect().width);
    const headerWidth = await page.getByRole("heading", { name: project.reference, exact: true }).evaluate(element => element.closest("header")!.getBoundingClientRect().width);
    expect(headerWidth).toBeGreaterThanOrEqual(galleryWidth - 2);
    await geometry(page);
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/patio.png"));
    await expect(gallery.getByText("1 / 10 photos")).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Ouvrir la photo patio.webp" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Envoyer le fichier", exact: true })).toHaveCount(0);
    await expect(gallery.getByRole("button", { name: "Archiver", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 360, height: 1000 });
    await geometry(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await mkdir("output/playwright/property-photos", { recursive: true });
    await page.screenshot({ path: "output/playwright/property-photos/agent-project-desktop.png", fullPage: true });
    await createBlock(page); await createFloor(page); await createType(page);
    const unit = await createUnit(page, project.id);
    await expect(gallery.getByText("0 / 10 photos")).toBeVisible();
    await gallery.locator('input[type="file"]').setInputFiles(path.resolve("tests/fixtures/projects-reference/sable.png"));
    await expect(gallery.getByText("1 / 10 photos")).toBeVisible();
    await expect(gallery.getByRole("button", { name: "Ouvrir la photo sable.webp" })).toBeVisible({ timeout: 60_000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await gallery.getByRole("button", { name: "Ouvrir la photo sable.webp" }).click();
    await expect(page.getByRole("dialog", { name: "Photos du bien" }).getByRole("img", { name: "Photo du bien : sable.webp" })).toBeVisible();
    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await mkdir("output/playwright/property-photos", { recursive: true });
    await page.screenshot({ path: "output/playwright/property-photos/agent-unit-mobile.png", fullPage: true });
    for (const [kind, id] of [["development", project.id], ["property", unit.id]]) {
      const result = await page.request.get(`/api/v1/documents?parent_kind=${kind}&parent_id=${id}&purpose=photo`);
      expect(result.ok()).toBe(true);
      const photos = await result.json();
      expect(photos.total).toBe(1);
      expect(photos.items[0].mime_type).toBe("image/webp");
      expect((await staffCommand(page, "documents", { parent_kind: kind, parent_id: id, filename: "private.pdf", mime_type: "application/pdf", size_bytes: 100 })).status()).toBe(403);
    }
  } finally { await testControl("worker-stop"); await clearActorContext(page); await removeActor(agent); }
});
