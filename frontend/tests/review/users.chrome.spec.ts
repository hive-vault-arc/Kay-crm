import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { signedInTest as test, createActor, removeActor, expect, signIn } from "../helpers/auth";
import { geometry } from "../helpers/report-review";

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
    const trigger = page.getByRole("button", { name: "Supprimer l’utilisateur", exact: true });
    await trigger.click();
    await expect(page.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true })).toBeFocused();
    await page.screenshot({ path: path.join(directory, "staff-delete-desktop.png"), fullPage: true });
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
    await page.goto("/settings/users/new");
    await expect(page.getByLabel("Mot de passe initial", { exact: true })).toBeEnabled();
    for (const width of [320, 360, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await geometry(page);
    }
    const reveal = page.getByRole("button", { name: "Afficher le mot de passe", exact: true });
    await reveal.focus(); await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Masquer le mot de passe", exact: true })).toBeFocused();
    await page.keyboard.press("Space");
    await page.screenshot({ path: path.join(directory, "staff-create-empty-desktop.png"), fullPage: true });
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
      await expect(mobile.getByRole("button", { name: "Supprimer l’utilisateur", exact: true })).toBeEnabled();
      await mobile.screenshot({ path: path.join(directory, "sp04-edit-mobile.png"), fullPage: true });
      await mobile.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).tap();
      await expect(mobile.getByRole("alertdialog")).toBeVisible();
      expect(await mobile.getByLabel("Votre mot de passe administrateur", { exact: true }).inputValue() === "").toBe(true);
      expect(await mobile.getByLabel("Nouveau mot de passe initial", { exact: true }).inputValue() === "").toBe(true);
      await geometry(mobile);
      await mobile.screenshot({ path: path.join(directory, "sp04-reset-mobile-empty.png"), fullPage: true });
      await mobile.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true }).tap();
      await mobile.getByRole("button", { name: "Supprimer l’utilisateur", exact: true }).tap();
      await mobile.getByRole("alertdialog").getByRole("button", { name: "Supprimer l’utilisateur", exact: true }).tap();
      await expect.poll(() => new URL(mobile.url()).pathname).toBe("/settings/users");
      await expect(mobile.getByRole("table")).toBeVisible();
      await mobile.screenshot({ path: path.join(directory, "staff-deleted-mobile.png"), fullPage: true });
    } finally { await touch.close(); }
    expect(errors).toEqual([]);
  } finally { await removeActor(target); }
});

test("Staff: native 200% Chrome zoom keeps creation and reset keyboard-accessible", async ({ actor, baseURL }, info) => {
  test.setTimeout(120_000);
  const profile = info.outputPath("staff-zoom-profile");
  const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
  let context = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
  const target = await createActor("agent");
  try {
    let page = context.pages()[0]; await signIn(page, actor);
    const baseline = await page.evaluate(() => devicePixelRatio);
    await context.close();
    const prefsPath = path.join(profile, "Default", "Preferences");
    const prefs = JSON.parse(await readFile(prefsPath, "utf8"));
    prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(prefsPath, JSON.stringify(prefs));
    context = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    page = context.pages()[0];
    await page.goto("/settings/users/new");
    await expect(page.getByLabel("Mot de passe initial", { exact: true })).toBeEnabled();
    expect(await page.evaluate(() => devicePixelRatio) / baseline).toBeCloseTo(2, 1);
    await geometry(page);
    await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).focus(); await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Masquer le mot de passe", exact: true })).toBeFocused();
    await page.goto(`/settings/users/${target.id}/edit`);
    await page.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible(); await geometry(page);
    await expect(page.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true })).toBeFocused();
    await mkdir("output/playwright", { recursive: true });
    expect(await page.locator('input[type="password"], [data-private-credential]').evaluateAll(fields => fields.every(field => !(field as HTMLInputElement).value))).toBe(true);
    await page.bringToFront();
    const session = await context.newCDPSession(page);
    try {
      const shot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile("output/playwright/staff-reset-empty-zoom-200.png", Buffer.from(shot.data, "base64"));
    } finally { await session.detach(); }
  } finally {
    await context.close(); await removeActor(target);
    expect(path.resolve(profile).startsWith(path.resolve("test-results") + path.sep)).toBe(true);
    expect(path.basename(profile)).toBe("staff-zoom-profile");
    await rm(profile, { recursive: true, force: true });
  }
});
