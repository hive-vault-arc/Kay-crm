import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { createProperty } from "../helpers/inventory";
import { syntheticFile } from "../helpers/files";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only. Metadata is committed by the actual isolated API
// before its response is interrupted; no canned write success or clean verdict.
for (const width of [390, 1440]) test(`Selected document uploader retains its original metadata operation at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("manager");
  try {
    await signIn(page, actor); const propertyId = await createProperty(page), file = await syntheticFile("clean-document");
    await page.setViewportSize({ width, height: 900 }); await page.getByRole("button", { name: "Documents", exact: true }).click();
    const list = page.getByRole("dialog", { name: "Documents", exact: true }); await list.getByRole("button", { name: "Ajouter un document", exact: true }).click();
    const uploader = page.getByRole("dialog", { name: "Ajouter un document", exact: true }), attempts: { key?: string; body: string | null }[] = [];
    await uploader.getByLabel("Fichier", { exact: true }).setInputFiles(file);
    await page.route("**/api/v1/documents", async route => {
      if (route.request().method() !== "POST") return route.continue();
      attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
      const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_DOCUMENT_METADATA_FAILED");
      if (attempts.length === 1) return route.abort("failed"); return route.fulfill({ response });
    });
    await uploader.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
    await expect(uploader.getByRole("button", { name: "Réessayer", exact: true })).toBeEnabled();
    await expect(uploader.getByLabel("Fichier", { exact: true })).toBeDisabled(); await expect(uploader.getByRole("button", { name: "Parcourir", exact: true })).toBeDisabled();
    await uploader.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(uploader).not.toBeVisible();
    expect(attempts.length === 2 && Boolean(attempts[0].key) && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const response = await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${propertyId}&purpose=attachment`); if (response.status() !== 200) throw new Error("SYNTHETIC_DOCUMENT_RECOVERY_READ_FAILED");
    const saved = await response.json(); expect(saved.total === 1 && saved.items[0].filename === file.name && saved.items[0].versions.length === 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
