import { documentSchema, documentsSchema } from "@/features/files/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { createProperty } from "../helpers/inventory";
import { syntheticFile } from "../helpers/files";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only. Actual isolated metadata, upload, AV and archive
// flows are required; the fault interrupts the real archive acknowledgement.
for (const width of [390, 1440]) test(`Selected file row recovers an archive after leaving the current page at ${width}px`, async ({ page }) => {
  test.setTimeout(150_000); const actor = await createActor("manager");
  try {
    await signIn(page, actor); const propertyId = await createProperty(page), file = await syntheticFile("clean-document");
    await page.setViewportSize({ width, height: 900 }); await page.getByRole("button", { name: "Documents", exact: true }).click();
    const list = page.getByRole("dialog", { name: "Documents", exact: true }); await list.getByRole("button", { name: "Ajouter un document", exact: true }).click();
    const uploader = page.getByRole("dialog", { name: "Ajouter un document", exact: true }); await uploader.getByLabel("Fichier", { exact: true }).setInputFiles(file); await uploader.getByRole("button", { name: "Envoyer le fichier", exact: true }).click(); await expect(uploader).not.toBeVisible();
    const row = list.getByRole("listitem").filter({ has: page.getByRole("heading", { name: file.name, exact: true }) }); await expect(row.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 30_000 });
    const response = await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${propertyId}&purpose=attachment`); if (response.status() !== 200) throw new Error("SYNTHETIC_FILE_ROW_READ_FAILED");
    const original = documentsSchema.parse(await response.json()).items[0], attempts: { key?: string; body: string | null }[] = [];
    await page.route(`**/api/v1/documents/${original.id}/archive`, async route => {
      if (route.request().method() !== "POST") return route.continue(); attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
      const saved = await route.fetch(); if (saved.status() !== 200) throw new Error("SYNTHETIC_FILE_ROW_ARCHIVE_FAILED"); if (attempts.length === 1) return route.abort("failed"); return route.fulfill({ response: saved });
    });
    await row.getByRole("button", { name: `Archiver ${file.name}`, exact: true }).click();
    const confirmation = page.getByRole("alertdialog", { name: "Archiver cette pièce jointe ?", exact: true }); await confirmation.getByRole("button", { name: "Confirmer l’archivage", exact: true }).click(); await expect(confirmation.getByRole("button", { name: "Réessayer la même opération", exact: true })).toBeEnabled();
    const refreshed = page.waitForResponse(value => { const url = new URL(value.url()); return url.pathname === "/api/v1/documents" && url.searchParams.get("parent_id") === propertyId && value.request().method() === "GET"; });
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("kay:live-invalidate", { detail: ["files"] })));
    const current = await refreshed; if (current.status() !== 200) throw new Error("SYNTHETIC_FILE_ROW_REFRESH_FAILED"); expect(documentsSchema.parse(await current.json()).total === 0).toBe(true);
    // The confirmation hides its background drawer from accessibility, not the DOM.
    const retainedRow = page.getByRole("dialog", { name: "Documents", exact: true, includeHidden: true }).getByRole("listitem", { includeHidden: true }).filter({ has: page.getByRole("heading", { name: file.name, exact: true, includeHidden: true }) });
    await expect(retainedRow).toBeVisible();
    await confirmation.getByRole("button", { name: "Réessayer la même opération", exact: true }).click(); await expect(confirmation).not.toBeVisible(); await expect(row).not.toBeVisible();
    expect(attempts.length === 2 && Boolean(attempts[0].key) && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const result = await page.request.get(`/api/v1/documents/${original.id}`); if (result.status() !== 200) throw new Error("SYNTHETIC_FILE_ROW_COMPLETION_FAILED"); const archived = documentSchema.parse(await result.json()); expect(archived.archived && archived.version === original.version + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
