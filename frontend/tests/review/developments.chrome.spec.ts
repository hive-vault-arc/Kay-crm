import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { clearActorContext, test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { createDevelopment, createBlock, createFloor, createType, createUnit, openDevelopment } from "../helpers/developments";

async function capture(page: Page, name: string) {
  await expect(page.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
  const before = await page.evaluate(() => document.documentElement.clientWidth);
  const cdp = await page.context().newCDPSession(page);
  try { const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true }); await writeFile(path.resolve(`output/playwright/sp08-${name}.png`), Buffer.from(result.data, "base64")); }
  finally { await cdp.detach(); }
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(before);
}

test("SP08 visible Chrome: development explorer, reusable types, responsive states, touch, keyboard and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000);
  const manager = await createActor("manager"); const agent = await createActor("agent");
  const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 800 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await touch.newPage();
  const errors: string[] = [];
  const monitor = (target: Page) => { target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); target.on("console", message => { if (message.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED/.test(message.text())) errors.push("APPLICATION_CONSOLE_ERROR"); }); };
  monitor(page); monitor(mobile);
  let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined; let profile: string | undefined;
  await mkdir(path.resolve("output/playwright"), { recursive: true });
  try {
    await signIn(page, manager); await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects"); await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
    await expect(page.getByText("0 programme(s) correspondant(s).", { exact: true })).toBeVisible();
    await capture(page, "programmes-empty-desktop");
    const development = await createDevelopment(page);
    await createBlock(page); await createFloor(page); await createFloor(page, "B1", "F3"); await createType(page);
    await createUnit(page, development.id); await createUnit(page, development.id, "F3", "apartment", "81,50"); await createUnit(page, development.id, "", "land", "250,00");
    await openDevelopment(page, development.id, "Blocs et étages"); await page.getByRole("button", { name: "Explorer B1", exact: true }).click();
    await expect(page.getByRole("link", { name: "Voir les unités de F2", exact: true })).toBeVisible(); await capture(page, "hierarchy-desktop");
    await page.getByRole("region", { name: "Étages du bloc B1", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "floors-desktop");
    await page.getByRole("link", { name: "Voir les unités de F2", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Unités", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByLabel("Disponibilité des unités", { exact: true }).selectOption("all"); await page.getByRole("button", { name: "Filtrer les unités", exact: true }).click();
    await expect(page.getByText("1 unité(s) correspondante(s).", { exact: true })).toBeVisible(); await capture(page, "floor-units-desktop");
    await page.getByRole("region", { name: "Tableau des unités, défilement horizontal", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "unit-rows-desktop");
    await page.getByRole("tab", { name: "Types réutilisables", exact: true }).click(); await page.getByRole("button", { name: "Modifier T2", exact: true }).click();
    await page.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).fill("95,00"); await capture(page, "type-editor-desktop");
    await page.getByRole("button", { name: "Enregistrer le type réutilisable", exact: true }).click(); await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
    await page.goto("/projects"); await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click(); await expect(page.getByText("1 programme(s) correspondant(s).", { exact: true })).toBeVisible(); await capture(page, "programmes-desktop");
    await signIn(mobile, manager); await mobile.goto(`${development.path}/edit`);
    await mobile.getByLabel("Nom du programme", { exact: true }).fill(`SP08 ${"Programme immobilier".repeat(7)}`);
    for (const width of [320, 360, 768, 1024, 1440]) {
      await mobile.setViewportSize({ width, height: 900 });
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const geometry = await mobile.getByLabel("Nom du programme", { exact: true }).evaluate(element => { const box = element.getBoundingClientRect(); const main = document.querySelector("main")!; const bounds = main.getBoundingClientRect(); const style = getComputedStyle(main); return { clientWidth: document.documentElement.clientWidth, x: box.x, right: box.right, safeLeft: bounds.left + parseFloat(style.paddingLeft), safeRight: bounds.right - parseFloat(style.paddingRight), height: box.height }; });
      expect(geometry.x).toBeGreaterThanOrEqual(geometry.safeLeft - 1); expect(geometry.right).toBeLessThanOrEqual(Math.min(geometry.clientWidth, geometry.safeRight) + 1); expect(geometry.height).toBeGreaterThanOrEqual(44);
      console.info("SP08 form geometry:", JSON.stringify({ width, ...geometry }));
    }
    await mobile.setViewportSize({ width: 360, height: 800 }); await mobile.getByLabel("Nom du programme", { exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "programme-editor-mobile");
    await mobile.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("Présentation synthétique sûre.\nUnités et programme sont distincts.");
    await mobile.getByRole("button", { name: "Enregistrer le programme", exact: true }).tap(); await expect(mobile.getByRole("heading", { name: development.reference, exact: true })).toBeVisible();
    await mobile.getByRole("tab", { name: "Unités", exact: true }).tap();
    await mobile.getByLabel("Disponibilité des unités", { exact: true }).selectOption("all"); await mobile.getByRole("button", { name: "Filtrer les unités", exact: true }).tap();
    await expect(mobile.getByText("3 unité(s) correspondante(s).", { exact: true })).toBeVisible();
    for (const width of [320, 360, 768, 1024, 1440]) { await mobile.setViewportSize({ width, height: 900 }); expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }
    await mobile.setViewportSize({ width: 360, height: 800 }); await capture(mobile, "unit-filters-mobile");
    await mobile.getByRole("region", { name: "Tableau des unités, défilement horizontal", exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "units-mobile");
    await mobile.getByRole("tab", { name: "Types réutilisables", exact: true }).tap(); await mobile.getByRole("button", { name: "Modifier T2", exact: true }).tap(); await mobile.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "type-editor-mobile");
    await mobile.getByRole("button", { name: "Annuler", exact: true }).tap();
    await clearActorContext(mobile); await signIn(mobile, agent); await openDevelopment(mobile, development.id, "Présentation");
    await expect(mobile.getByText("Présentation synthétique sûre.\nUnités et programme sont distincts.", { exact: true })).toBeVisible(); await mobile.getByText("Présentation synthétique sûre.\nUnités et programme sont distincts.", { exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "agent-briefing-mobile");
    await mobile.goto(`${development.path}/edit`); await expect(mobile.getByRole("form", { name: "Modifier le programme", exact: true })).toBeVisible(); await capture(mobile, "agent-edit-mobile");
    await openDevelopment(page, development.id);
    await page.getByRole("tab", { name: "Aperçu", exact: true }).focus(); await page.keyboard.press("ArrowRight"); await expect(page.getByRole("tab", { name: "Unités", exact: true })).toBeFocused();
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    const loading = async (route: Route) => { await gate; await route.continue(); };
    await page.route(`**/api/v1/developments/${development.id}`, loading);
    const opening = page.goto(development.path); await expect(page.getByText("Chargement du programme…", { exact: true })).toBeVisible(); await capture(page, "loading-desktop"); release(); await opening; await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled(); await page.unroute(`**/api/v1/developments/${development.id}`, loading);
    const unavailable = (route: Route) => route.abort("failed"); await page.route(`**/api/v1/developments/${development.id}`, unavailable); await page.reload(); await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await capture(page, "error-desktop"); await page.unroute(`**/api/v1/developments/${development.id}`, unavailable); await page.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled();
    profile = await mkdtemp(path.resolve("test-results/sp08-zoom-"));
    const launch = { ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let zoom = zoomContext.pages()[0]; await zoom.goto(`${baseURL}/login`); await signIn(zoom, manager);
    const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const preferencesPath = path.join(profile, "Default", "Preferences"); const preferences = JSON.parse(await readFile(preferencesPath, "utf8")); preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(preferencesPath, JSON.stringify(preferences));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom);
    await zoom.goto(`${baseURL}${development.path}/edit`); await zoom.getByLabel("Nom du programme", { exact: true }).fill("SP08 modification à 200 pour cent"); await zoom.getByRole("button", { name: "Enregistrer le programme", exact: true }).click(); await expect(zoom.getByText("SP08 modification à 200 pour cent", { exact: true })).toBeVisible();
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); expect(measurement.overflow).toBe(false); await zoom.bringToFront();
    const cdp = await zoomContext.newCDPSession(zoom); const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false }); const pixels = Buffer.from(shot.data, "base64"); await writeFile(path.resolve("output/playwright/sp08-zoom-200-viewport.png"), pixels); await cdp.detach(); console.info("SP08 actual browser zoom:", JSON.stringify({ baseline, measurement, pixelWidth: pixels.readUInt32BE(16), pixelHeight: pixels.readUInt32BE(20) }));
    expect(errors).toEqual([]);
  } finally {
    await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp08-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await touch.close(); await removeActor(manager); await removeActor(agent);
  }
});
