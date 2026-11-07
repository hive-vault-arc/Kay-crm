import path from "node:path";
import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { testControl } from "../helpers/api-process";

// Prepared isolated journeys. They are not browser/transfer evidence until run.
for (const [kind, width] of [["property", 1440], ["development", 390]] as const) test(`Selected photo form: explicit upload and preserved retry for ${kind} at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent"), reference = `SYN-PHOTO-${randomUUID().slice(0, 8)}`;
  try {
    await signIn(page, actor); await page.setViewportSize({ width, height: 900 }); await testControl("worker-start");
    const response = await staffCommand(page, kind === "property" ? "properties" : "developments", kind === "property" ? { reference, category: "house", marketing_name: "Photo synthétique", location: null, area_sqm: null } : { reference, category: "mixed", name: "Programme photo synthétique", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
    expect(response.status()).toBe(200); const result = await response.json(); const id = kind === "property" ? result.property_id : result.development_id;
    await page.goto(kind === "property" ? `/projects/properties/${id}` : `/projects/${id}`);
    await page.getByRole("button", { name: "Galerie", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Photos du dossier", exact: true });
    const gallery = drawer.getByRole("form", { name: "Galerie du dossier", exact: true });
    await expect(gallery.getByText("0 / 10 photos", { exact: true })).toBeVisible(); await expect(drawer.locator('input[type="file"]')).toHaveCount(0);
    let creates = 0, transfers = 0;
    page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/documents") creates++; });
    await page.route("**/transfers/**", async route => {
      if (route.request().method() === "PUT" && transfers++ === 0) { await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"FILE_STORAGE_UNAVAILABLE"}}' }); return; }
      await route.continue();
    });
    await gallery.getByRole("button", { name: "Ajouter une photo", exact: true }).click();
    const form = drawer.getByRole("form", { name: "Ajouter une photo", exact: true });
    await form.getByLabel("Photo à ajouter", { exact: true }).setInputFiles(path.resolve("tests/fixtures/projects-reference/patio.png"));
    expect(creates).toBe(0);
    await form.getByRole("button", { name: "Ajouter la photo", exact: true }).click();
    await expect(form.getByRole("alert")).toBeVisible(); await expect(form.getByLabel("Photo à ajouter", { exact: true })).toBeDisabled(); expect(creates).toBe(1);
    await form.getByRole("button", { name: "Retour à la galerie", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(discard).toBeVisible();
    await discard.getByRole("button", { name: "Continuer la modification", exact: true }).click();
    await form.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(form).toHaveCount(0); expect(creates).toBe(1);
    await expect(gallery.getByText("1 / 10 photos", { exact: true })).toBeVisible();
    await expect(gallery.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(gallery.getByRole("button", { name: "Archiver", exact: true })).toHaveCount(0);
    await gallery.getByRole("button", { name: "Ouvrir la photo patio.webp", exact: true }).click();
    const viewer = page.getByRole("dialog", { name: "Photos du dossier", exact: true }); await expect(viewer.locator('img[src^="blob:"]')).toBeVisible();
    await viewer.getByRole("button", { name: "Fermer la photo", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
