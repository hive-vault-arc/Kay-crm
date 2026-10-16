import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { clearActorContext, test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { addOwners, confirmCampaign, createCampaign, createProperty, openProperty } from "../helpers/inventory";

async function capture(page: Page, destination: string) {
  await expect(page.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
  const client = await page.evaluate(() => document.documentElement.clientWidth);
  const cdp = await page.context().newCDPSession(page);
  try {
    const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(destination, Buffer.from(result.data, "base64"));
  } finally { await cdp.detach(); }
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(client);
}

test("SP07 visible Chrome: inventory, owner privacy, keyboard, touch, responsive states and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000);
  const manager = await createActor("manager");
  const owner = await createActor("agent");
  const unrelated = await createActor("agent");
  const root = path.resolve("output/playwright"); await mkdir(root, { recursive: true });
  const errors: string[] = [];
  const monitor = (target: typeof page) => {
    target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR"));
    target.on("console", message => { if (message.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED/.test(message.text())) errors.push("APPLICATION_CONSOLE_ERROR"); });
  };
  monitor(page);
  const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 800 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await touch.newPage(); monitor(mobile);
  let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  let profile: string | undefined;
  try {
    await signIn(mobile, owner);
    await createLead(mobile, `SP07 ${"Propriétaire".repeat(11)}`);
    await signIn(page, manager); await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects");
    await expect(page.getByText("0 bien(s) correspondant(s).", { exact: true })).toBeVisible();
    await capture(page, path.join(root, "sp07-empty-desktop.png"));
    await page.getByRole("tab", { name: "Biens indépendants", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Programmes immobiliers", exact: true })).toBeFocused();
    await expect(page.getByText("0 programme(s) correspondant(s).", { exact: true })).toBeVisible();
    const id = await createProperty(page);
    await addOwners(page, [`SP07 ${"Propriétaire".repeat(11)}`]);
    await createCampaign(page, "sale", "900000,01"); await createCampaign(page, "rental");
    await confirmCampaign(page, "sale"); await confirmCampaign(page, "rental");
    await capture(page, path.join(root, "sp07-detail-desktop.png"));
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await capture(page, path.join(root, "sp07-campaigns-desktop.png"));
    await clearActorContext(mobile); await signIn(mobile, manager); await openProperty(mobile, id, "Propriétaires");
    await mobile.getByRole("button", { name: "Modifier les propriétaires", exact: true }).tap();
    for (const width of [320, 360, 768, 1024, 1440]) {
      await mobile.setViewportSize({ width, height: 900 });
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const remove = await mobile.getByRole("button", { name: /^Retirer SP07/ }).boundingBox();
      expect(remove !== null && remove.width <= width && remove.height >= 44).toBe(true);
      const geometry = await mobile.getByLabel("Libellé commercial partagé 1 (facultatif)", { exact: true }).evaluate(element => {
        const box = element.getBoundingClientRect();
        const main = document.querySelector("main")!; const bounds = main.getBoundingClientRect(); const style = getComputedStyle(main);
        return { clientWidth: document.documentElement.clientWidth, innerWidth, x: box.x, right: box.right, safeLeft: bounds.left + parseFloat(style.paddingLeft), safeRight: bounds.right - parseFloat(style.paddingRight) };
      });
      console.info("SP07 owner control geometry:", JSON.stringify(geometry));
      expect(geometry.right).toBeLessThanOrEqual(Math.min(geometry.clientWidth, geometry.safeRight) + 1);
      expect(geometry.x).toBeGreaterThanOrEqual(geometry.safeLeft - 1);
    }
    await mobile.setViewportSize({ width: 360, height: 800 });
    await mobile.getByLabel("Libellé commercial partagé 1 (facultatif)", { exact: true }).scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-owner-editor-mobile.png"));
    await mobile.getByRole("button", { name: "Enregistrer les propriétaires", exact: true }).scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-owner-actions-mobile.png"));
    await mobile.getByRole("button", { name: "Annuler les propriétaires", exact: true }).tap();
    await mobile.getByRole("tab", { name: "Offres", exact: true }).tap();
    await mobile.getByRole("button", { name: "Modifier la campagne location", exact: true }).tap();
    await mobile.getByLabel("Prix de location en MAD (facultatif)", { exact: true }).scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-offering-editor-mobile.png"));
    await mobile.getByRole("button", { name: "Enregistrer la campagne", exact: true }).scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-offering-actions-mobile.png"));
    await mobile.getByRole("button", { name: "Annuler la campagne", exact: true }).tap();
    await mobile.getByRole("tab", { name: "Historique", exact: true }).tap();
    await expect(mobile.getByRole("heading", { name: "Disponibilité confirmée", exact: true }).first()).toBeVisible();
    await mobile.getByRole("heading", { name: "Disponibilité confirmée", exact: true }).first().scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-history-mobile.png"));
    await mobile.goto("/projects");
    const mobileCard = mobile.getByRole("article").filter({ has: mobile.locator(`a[href="/projects/properties/${id}"]`) });
    await expect(mobileCard).toBeVisible();
    await mobileCard.scrollIntoViewIfNeeded();
    await capture(mobile, path.join(root, "sp07-list-mobile.png"));
    await page.goto("/projects");
    await expect(page.getByRole("article").filter({ has: page.locator(`a[href="/projects/properties/${id}"]`) })).toBeVisible();
    await capture(page, path.join(root, "sp07-list-desktop.png"));
    await clearActorContext(mobile); await signIn(mobile, unrelated); await openProperty(mobile, id, "Propriétaires");
    await expect(mobile.getByText("Identité privée protégée par les droits Contacts.", { exact: true })).toBeVisible();
    await capture(mobile, path.join(root, "sp07-private-owner-mobile.png"));
    await mobile.goto(`/projects/properties/${id}/edit`);
    await expect(mobile.getByRole("alert").filter({ hasText: "Accès non autorisé" })).toBeVisible();
    await capture(mobile, path.join(root, "sp07-agent-denied-mobile.png"));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const loading = async (route: Route) => { await gate; await route.continue(); };
    await page.route(`**/api/v1/properties/${id}`, loading);
    const opening = page.goto(`/projects/properties/${id}`);
    await expect(page.getByText("Chargement du bien…", { exact: true })).toBeVisible();
    await capture(page, path.join(root, "sp07-loading-desktop.png"));
    release(); await opening;
    await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled();
    await page.unroute(`**/api/v1/properties/${id}`, loading);
    const unavailable = (route: Route) => route.abort("failed");
    await page.route(`**/api/v1/properties/${id}`, unavailable);
    await page.reload(); await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await capture(page, path.join(root, "sp07-error-desktop.png"));
    await page.unroute(`**/api/v1/properties/${id}`, unavailable);
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled();

    profile = await mkdtemp(path.resolve("test-results/sp07-zoom-"));
    const launch = { ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let zoom = zoomContext.pages()[0];
    await zoom.goto(`${baseURL}/login`); await signIn(zoom, manager);
    const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
    await zoomContext.close(); zoomContext = undefined;
    const preferencesPath = path.join(profile, "Default", "Preferences");
    const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
    preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(preferencesPath, JSON.stringify(preferences));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    zoom = zoomContext.pages()[0]; monitor(zoom);
    await zoom.goto(`${baseURL}/projects/properties/${id}`);
    await expect(zoom.getByText("Comparaison annuelle : 14 814,72 MAD / an", { exact: true })).toBeVisible();
    await zoom.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await zoom.getByLabel("Nom commercial (facultatif)", { exact: true }).fill("SP07 modification à 200 pour cent");
    await zoom.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(zoom.getByRole("heading", { name: /SP07 modification à 200 pour cent/ })).toBeVisible();
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); expect(measurement.overflow).toBe(false);
    await zoom.getByText("Comparaison annuelle : 14 814,72 MAD / an", { exact: true }).scrollIntoViewIfNeeded();
    await zoom.bringToFront();
    const cdp = await zoomContext.newCDPSession(zoom);
    const zoomCapture = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
    const pixels = Buffer.from(zoomCapture.data, "base64");
    await writeFile(path.join(root, "sp07-zoom-200-viewport.png"), pixels);
    console.info("SP07 actual browser zoom:", JSON.stringify({ baseline, measurement, pixelWidth: pixels.readUInt32BE(16), pixelHeight: pixels.readUInt32BE(20) }));
    await cdp.detach();
    expect(errors).toEqual([]);
  } finally {
    await zoomContext?.close(); if (profile) {
      expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results"));
      expect(path.basename(profile)).toMatch(/^sp07-zoom-/);
      await rm(profile, { recursive: true, force: true });
    }
    await touch.close(); await removeActor(manager); await removeActor(owner); await removeActor(unrelated);
  }
});
