import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { convertLead } from "../helpers/deals";

test("Lead and Deal generate editable, private PDF history", async ({ page }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(20_000);
  const agent = await createActor("agent");
  try {
    const loginStatuses: number[] = [];
    page.on("response", response => {
      if (new URL(response.url()).pathname === "/api/v1/auth/login") loginStatuses.push(response.status());
    });
    try { await signIn(page, agent); }
    catch {
      await page.locator('input[type="password"]').evaluateAll(fields => {
        for (const field of fields) (field as HTMLInputElement).value = "";
      });
      throw new Error(`SYNTHETIC_LOGIN_FAILED_${loginStatuses.join("_") || "NO_RESPONSE"}_${new URL(page.url()).pathname}`);
    }
    const lead = await createLead(page, "Client documentaire synthétique");
    await page.getByRole("link", { name: "Documents et PDF", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/leads/${lead}/documents$`));
    await expect(page.getByRole("heading", { name: "Documents du dossier" })).toBeVisible();
    await expect(page.getByLabel("Nom du client / partie")).toHaveValue("Client documentaire synthétique");
    await expect(page.getByRole("button", { name: "Brouillon de reçu de paiement", exact: true })).toHaveCount(0);
    await page.getByLabel("Observations et suite souhaitée").fill("Visite du bien synthétique.");
    await page.getByRole("button", { name: "Générer le PDF" }).click();
    await expect(page.getByText("PDF créé et conservé dans l’historique privé. Vous pouvez le télécharger ci-dessous.")).toBeVisible();
    const leadHistory = page.getByRole("region", { name: "Historique des PDF générés" });
    await expect(leadHistory.getByText("Bon de visite immobilière")).toBeVisible();
    const leadDownload = page.waitForEvent("download");
    await leadHistory.getByRole("button", { name: "Télécharger" }).click();
    expect((await leadDownload).suggestedFilename()).toMatch(/^KAY-01-[a-f0-9]{8}\.pdf$/);
    await mkdir("output/playwright/generated-documents", { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: "output/playwright/generated-documents/lead-desktop.png", fullPage: true });

    await page.getByRole("link", { name: "Retour à la demande" }).click();
    const deal = await convertLead(page);
    await page.getByRole("link", { name: "Documents et PDF", exact: true }).click();
    const descriptionTemplate = page.getByRole("button", { name: "Fiche descriptive du bien", exact: true });
    await descriptionTemplate.focus();
    await descriptionTemplate.press("Enter");
    await expect(page.getByLabel("Nom du client / partie")).toHaveCount(0);
    await page.getByLabel("Description du bien").fill("Appartement témoin synthétique.");
    await page.getByRole("button", { name: "Générer le PDF" }).click();
    const dealHistory = page.getByRole("region", { name: "Historique des PDF générés" });
    await expect(dealHistory.getByText("Fiche descriptive du bien")).toBeVisible();
    const history = await (await page.request.get(`/api/v1/generated-documents?parent_kind=deal&parent_id=${deal}&page=1`)).json();
    expect(history.total).toBe(1);
    expect(history.items[0].template_code).toBe("08");
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.getByRole("heading", { name: "Documents du dossier" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: "output/playwright/generated-documents/deal-mobile.png", fullPage: true });
  } finally {
    if (!page.isClosed()) await clearActorContext(page);
    await removeActor(agent);
  }
});
