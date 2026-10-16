import path from "node:path";
import { mkdir } from "node:fs/promises";
import { signedInTest as test, createActor, removeActor, expect, signIn } from "../helpers/auth";

test("SP04 visible Chrome: users, long French form, mobile touch, confirmation and safe captures", async ({ page, actor, browser, baseURL }) => {
  test.setTimeout(120_000);
  const target = await createActor("agent");
  const directory = path.resolve("output/playwright");
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("link", { name: "Paramètres", exact: true }).click();
    await page.getByRole("link", { name: "Tous les utilisateurs", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await page.screenshot({ path: path.join(directory, "sp04-users-desktop.png"), fullPage: true });
    await page.goto(`/settings/users/${target.id}/edit`);
    await expect(page.getByLabel("Nom complet", { exact: true })).toBeEnabled();
    await page.getByLabel("Nom complet", { exact: true }).fill("Personnel synthétique, responsable des contrôles et de la coordination immobilière de Casablanca");
    await page.getByRole("button", { name: "Enregistrer", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: "Compte enregistré" })).toBeVisible();
    await page.screenshot({ path: path.join(directory, "sp04-edit-desktop.png"), fullPage: true });
    const trigger = page.getByRole("button", { name: "Désactiver le compte", exact: true });
    await trigger.click();
    await expect(page.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true })).toBeFocused();
    await page.screenshot({ path: path.join(directory, "sp04-disable-desktop.png"), fullPage: true });
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const name of ["Nom complet", "Adresse e-mail", "Rôle"]) {
        const bounds = await page.getByLabel(name, { exact: true }).boundingBox();
        expect(bounds?.height).toBeGreaterThanOrEqual(44);
      }
      await trigger.click();
      const bounds = await page.getByRole("alertdialog").boundingBox();
      expect(Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 900)).toBe(true);
      await page.keyboard.press("Escape");
    }
    const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 800 }, hasTouch: true, locale: "fr-FR" });
    try {
      const mobile = await touch.newPage();
      await signIn(mobile, actor);
      await mobile.getByRole("button", { name: "Ouvrir la navigation", exact: true }).tap();
      await mobile.getByRole("dialog").getByRole("link", { name: "Paramètres", exact: true }).tap();
      await expect(mobile.getByRole("heading", { level: 1 })).toHaveText("Paramètres");
      await mobile.getByRole("link", { name: "Tous les utilisateurs", exact: true }).tap();
      await expect(mobile.getByRole("table")).toBeVisible();
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await mobile.screenshot({ path: path.join(directory, "sp04-users-mobile.png"), fullPage: true });
      await mobile.goto(`${baseURL}/settings/users/${target.id}/edit`);
      await expect(mobile.getByRole("button", { name: "Désactiver le compte", exact: true })).toBeEnabled();
      await mobile.screenshot({ path: path.join(directory, "sp04-edit-mobile.png"), fullPage: true });
      await mobile.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).tap();
      await expect(mobile.getByRole("alertdialog")).toBeVisible();
      expect(await mobile.getByLabel("Votre mot de passe administrateur", { exact: true }).inputValue() === "").toBe(true);
      await mobile.screenshot({ path: path.join(directory, "sp04-reset-mobile-empty.png"), fullPage: true });
      await mobile.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true }).tap();
      await mobile.getByRole("button", { name: "Désactiver le compte", exact: true }).tap();
      await mobile.getByRole("alertdialog").getByRole("button", { name: "Désactiver le compte", exact: true }).tap();
      await expect(mobile.getByRole("status").filter({ hasText: "Compte désactivé" })).toBeVisible();
      await mobile.screenshot({ path: path.join(directory, "sp04-disabled-mobile.png"), fullPage: true });
    } finally { await touch.close(); }
    expect(errors).toEqual([]);
  } finally { await removeActor(target); }
});
