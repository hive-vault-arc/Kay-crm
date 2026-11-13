import path from "node:path";
import { test, expect, clearActorContext, createActor, removeActor, signIn } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { createDevelopment } from "../helpers/developments";
import { closePhotos, openPhotos, uploadPhoto } from "../helpers/photos";

test("manager shares a prefilled programme with selected photos, agent creates another link, and a signed-out client loses revoked access", async ({ page, browser }, testInfo) => {
  test.skip(process.env.INVENTORY_SHARES_ENABLED !== "true", "Requires the opt-in listing share feature");
  test.setTimeout(240_000);
  const manager = await createActor("manager");
  const agent = await createActor("agent");
  const anonymous = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const title = "Programme mixte synthétique";
  try {
    await signIn(page, manager);
    await testControl("worker-start");
    const record = await createDevelopment(page);
    const origin = new URL(page.url()).origin;
    const gallery = await openPhotos(page);
    for (const file of ["patio", "sable"]) {
      await uploadPhoto(page, path.resolve(`tests/fixtures/projects-reference/${file}.png`));
      await expect(gallery.getByRole("button", { name: `Ouvrir la photo ${file}.webp`, exact: true })).toBeVisible({ timeout: 60_000 });
    }
    await closePhotos(page);
    await page.getByRole("button", { name: "Partager", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Partager la fiche", exact: true });
    await expect(drawer.getByLabel("Titre public", { exact: true })).toHaveValue(title);
    await expect(drawer.getByLabel("Description publique (facultative)", { exact: true })).toHaveValue("Programme immobilier.");
    await expect(drawer.getByLabel("Montant en MAD", { exact: true })).toHaveValue("");
    await expect(drawer.getByRole("checkbox", { name: "patio.webp", exact: true })).toBeChecked();
    await expect(drawer.getByRole("checkbox", { name: "sable.webp", exact: true })).toBeChecked();
    await drawer.getByRole("checkbox", { name: "sable.webp", exact: true }).uncheck();
    await expect(drawer.getByText("1 / 2 photos sélectionnées", { exact: true })).toBeVisible();
    await drawer.screenshot({ path: testInfo.outputPath("sharing-draft-desktop.png"), animations: "disabled" });
    await drawer.getByLabel("Montant en MAD", { exact: true }).fill("12000");
    await drawer.getByLabel("Type de prix", { exact: true }).selectOption("month");
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await drawer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await drawer.screenshot({ path: testInfo.outputPath("sharing-draft-mobile.png"), animations: "disabled" });
    await drawer.getByRole("button", { name: "Créer le lien", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(drawer.getByText("Lien créé. Copiez-le pour l’envoyer au client.", { exact: true })).toBeVisible();

    await clearActorContext(page);
    await signIn(page, agent);
    await page.goto(record.path);
    await page.getByRole("button", { name: "Partager", exact: true }).click();
    await expect(drawer.getByRole("button", { name: "Modifier la fiche client" })).toHaveCount(0);
    await drawer.getByRole("button", { name: "Créer un lien client", exact: true }).click();
    const field = drawer.getByRole("textbox", { name: "Lien client", exact: true });
    await expect.poll(async () => (await field.inputValue()).startsWith(`${origin}/partage#`)).toBe(true);

    const guest = await anonymous.newPage();
    // Never expose the test capability in browser matcher diagnostics.
    await guest.goto(await field.inputValue()).catch(() => { throw new Error("SYNTHETIC_LISTING_NAVIGATION_FAILED"); });
    await expect(guest.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(guest.getByText("Programme immobilier.", { exact: true })).toBeVisible();
    await expect(guest.getByText("Par mois", { exact: true })).toBeVisible();
    await expect(guest.getByRole("img", { name: `${title} — photo 1`, exact: true })).toBeVisible();
    await expect(guest.getByRole("button", { name: "Suivante", exact: true })).toHaveCount(0);
    await expect(guest.getByRole("main")).not.toContainText(record.reference);
    expect(await anonymous.cookies()).toEqual([]);
    expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await drawer.getByRole("button", { name: "Désactiver le lien 1", exact: true }).click();
    await drawer.getByRole("button", { name: "Confirmer la désactivation", exact: true }).click();
    await expect(drawer.getByText("Partage désactivé.", { exact: true })).toBeVisible();
    await guest.reload().catch(() => { throw new Error("SYNTHETIC_LISTING_RELOAD_FAILED"); });
    await expect(guest.getByRole("heading", { name: "Cette fiche n’est plus disponible", exact: true })).toBeVisible();
  } finally {
    await anonymous.close();
    await removeActor(agent);
    await removeActor(manager);
  }
});
