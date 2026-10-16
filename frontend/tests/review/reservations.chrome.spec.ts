import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { reservationBody, reservationDialog, reservationFixture } from "../helpers/reservations";

async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  const session = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await session.send("Page.getLayoutMetrics") : undefined;
    const width = await page.evaluate(() => innerWidth);
    const shot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true, ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}) });
    await writeFile(path.resolve(`output/playwright/sp12-${name}.png`), Buffer.from(shot.data, "base64"));
    if (name === "reserve-desktop" || name === "reserve-mobile") await writeFile(path.resolve(`../.impeccable/review/${name === "reserve-desktop" ? "desktop" : "mobile"}.png`), Buffer.from(shot.data, "base64"));
  } finally { await session.detach(); }
}
async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('[role="alertdialog"]');
    function luminance(color: string) { const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722; }
    function background(element: Element): string { const value = getComputedStyle(element).backgroundColor; return value !== "rgba(0, 0, 0, 0)" && value !== "transparent" ? value : element.parentElement ? background(element.parentElement) : "rgb(255, 255, 255)"; }
    const contrasts = dialog ? [...dialog.querySelectorAll<HTMLElement>("p,h2,label,button")].filter(el => el.textContent?.trim() && el.getBoundingClientRect().height && !el.hasAttribute("disabled")).map(el => { const a = luminance(getComputedStyle(el).color), b = luminance(background(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }) : [21];
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, minimumContrast: Math.min(...contrasts),
    dialogOverflow: [...document.querySelectorAll('[role="alertdialog"]')].some(el => el.scrollWidth > el.clientWidth),
    controls: [...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
    padding: dialog ? getComputedStyle(dialog).padding : null }; });
  expect(result.overflow).toBe(false); expect(result.dialogOverflow).toBe(false);
  expect(result.controls.every(control => control.width >= 44 && control.height >= 44)).toBe(true);
  expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5);
  return result;
}

test("SP12 visible Chrome: scope, stock conflict, release reason, mobile touch, keyboard and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000); page.setDefaultTimeout(25_000); const actors: TestActor[] = [];
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await mobileContext.newPage(); let profile: string | undefined; let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  const errors: string[] = [];
  function monitor(target: Page) { target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); target.on("console", message => { if (message.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED|net::ERR_CONNECTION_REFUSED/.test(message.text())) errors.push("APPLICATION_CONSOLE_ERROR"); }); }
  monitor(page); monitor(mobile);
  await mkdir(path.resolve("output/playwright"), { recursive: true }); await mkdir(path.resolve("../.impeccable/review"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 }); const data = await reservationFixture(page, actors);
    await page.goto(`/deals/${data.unit}`); const region = page.getByRole("region", { name: "Réservation de l’affaire", exact: true });
    await expect(region.getByText("Aucune réservation active pour cette affaire.", { exact: true })).toBeVisible();
    await capture(page, "context-desktop", true);
    const trigger = region.getByRole("button", { name: "Réserver l’offre", exact: true }); await trigger.focus(); await page.keyboard.press("Enter");
    let dialog = page.getByRole("alertdialog", { name: "Réserver l’offre", exact: true }); await expect(dialog).toBeVisible(); await capture(page, "reserve-desktop"); const desktop = await geometry(page);
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    dialog = await reservationDialog(page);
    let releaseWrite = () => {}; const gate = new Promise<void>(resolve => { releaseWrite = resolve; });
    await page.route(`**/api/v1/deals/${data.unit}/reserve`, async route => { await gate; await route.continue(); });
    try { await dialog.getByRole("button", { name: "Réserver l’offre", exact: true }).click(); await expect(dialog.getByRole("button", { name: "Enregistrement…", exact: true })).toBeDisabled(); await capture(page, "loading-desktop"); }
    finally { releaseWrite(); }
    await expect(dialog).not.toBeVisible(); await page.unroute(`**/api/v1/deals/${data.unit}/reserve`);
    await region.scrollIntoViewIfNeeded(); await expect(region.getByText(/Aucune expiration automatique/)).toBeVisible(); await capture(page, "active-desktop");
    await page.goto(`/deals/${data.whole}`); await expect(page.getByText(/Une réservation du même type couvre déjà/)).toBeVisible();
    const conflict = await reservationDialog(page); await conflict.getByRole("button", { name: "Réserver l’offre", exact: true }).click(); await expect(conflict.getByRole("alert")).toBeVisible(); await capture(page, "overlap-desktop"); await conflict.getByRole("button", { name: "Retour", exact: true }).click();
    await page.goto(`/projects/properties/${data.inventory.pid}`); await page.getByRole("tab", { name: "Offres", exact: true }).click(); await expect(page.getByText("Réservée", { exact: true })).toBeVisible(); await expect(page.getByText(/Réservation active : une libération explicite/)).toBeVisible(); await capture(page, "inventory-desktop");
    await signIn(mobile, data.agent); await mobile.goto(`/deals/${data.unit}`); await expect(mobile.getByRole("heading", { name: "Réservation", exact: true })).toBeVisible(); await capture(mobile, "context-mobile", true); const release = await reservationDialog(mobile, true); await release.getByLabel("Motif de la libération", { exact: true }).fill("SP12 motif long synthétique conservé");
    const fail = (route: Route) => route.abort("failed"); await mobile.route(`**/api/v1/deals/${data.unit}/release-reservation`, fail); await release.getByRole("button", { name: "Libérer la réservation", exact: true }).tap(); await expect(release.getByRole("alert")).toBeVisible(); await expect(release.getByLabel("Motif de la libération", { exact: true })).toHaveValue("SP12 motif long synthétique conservé"); await capture(mobile, "release-error-mobile");
    await mobile.unroute(`**/api/v1/deals/${data.unit}/release-reservation`, fail); await release.getByRole("button", { name: "Libérer la réservation", exact: true }).tap(); await expect(release).not.toBeVisible();
    await mobile.getByRole("button", { name: "Réserver l’offre", exact: true }).tap(); const mobileDialog = mobile.getByRole("alertdialog", { name: "Réserver l’offre", exact: true }); await expect(mobileDialog).toBeVisible(); await capture(mobile, "reserve-mobile"); const touch = await geometry(mobile);
    for (const width of [320, 360, 768, 1024]) { await mobile.setViewportSize({ width, height: 900 }); await geometry(mobile); }
    await mobile.setViewportSize({ width: 320, height: 800 }); await capture(mobile, "reserve-320"); await mobileDialog.getByRole("button", { name: "Retour", exact: true }).tap();
    profile = await mkdtemp(path.resolve("test-results/sp12-zoom-")); const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await signIn(zoom, data.agent); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"); const prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(`${baseURL}/deals/${data.unit}`); await reservationDialog(zoom); const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); await geometry(zoom); await capture(zoom, "zoom-200");
    const outsider = await createActor("agent"); actors.push(outsider); await clearActorContext(mobile); await mobile.setViewportSize({ width: 390, height: 844 }); await signIn(mobile, outsider); await mobile.goto(`/deals/${data.unit}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await capture(mobile, "denied-mobile");
    expect((await staffCommand(page, `deals/${data.whole}/reserve`, await reservationBody(page, data.whole))).status()).toBe(200);
    expect(errors).toEqual([]); console.info("SP12 native observations", JSON.stringify({ desktop, touch, baseline, measurement, unexpectedConsoleErrors: errors.length }));
  } finally {
    await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp12-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await mobileContext.close(); await clearActorContext(page); for (const actor of actors) await removeActor(actor);
  }
});
