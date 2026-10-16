import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";
import { fillOutcome, outcomeDialog, salePair } from "../helpers/outcomes";

async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  if (full) await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  const session = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await session.send("Page.getLayoutMetrics") : undefined;
    const width = await page.evaluate(() => innerWidth);
    const shot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true, ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}) });
    await writeFile(path.resolve(`output/playwright/sp13-${name}.png`), Buffer.from(shot.data, "base64"));
    if (name === "close-desktop" || name === "reopen-mobile") await writeFile(path.resolve(`../.impeccable/review/${name === "close-desktop" ? "desktop" : "mobile"}.png`), Buffer.from(shot.data, "base64"));
  } finally { await session.detach(); }
}
async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('[role="alertdialog"]');
    function luminance(color: string) { const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => { const v = value / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722; }
    function background(element: Element): string { const value = getComputedStyle(element).backgroundColor; return value !== "rgba(0, 0, 0, 0)" && value !== "transparent" ? value : element.parentElement ? background(element.parentElement) : "rgb(255, 255, 255)"; }
    const contrasts = dialog ? [...dialog.querySelectorAll<HTMLElement>("p,h2,label,button,input,textarea,select")].filter(el => el.textContent?.trim() && el.getBoundingClientRect().height && !el.hasAttribute("disabled")).map(el => { const a = luminance(getComputedStyle(el).color), b = luminance(background(el)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }) : [21];
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, minimumContrast: Math.min(...contrasts), dialogOverflow: [...document.querySelectorAll('[role="alertdialog"]')].some(el => el.scrollWidth > el.clientWidth), controls: [...document.querySelectorAll<HTMLElement>('[role="alertdialog"] button, [role="alertdialog"] input, [role="alertdialog"] textarea, [role="alertdialog"] select')].map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })), padding: dialog ? getComputedStyle(dialog).padding : null };
  });
  expect(result.overflow).toBe(false); expect(result.dialogOverflow).toBe(false);
  expect(result.controls.every(control => control.width >= 44 && control.height >= 44)).toBe(true);
  expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5);
  return result;
}

test("SP13 visible Chrome: close, partial programme, reopen, external results, keyboard/touch and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(360_000); page.setDefaultTimeout(25_000); const actors: TestActor[] = [];
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await mobileContext.newPage(); const context = await page.context().newPage();
  let profile: string | undefined; let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  const errors: string[] = []; const expectedNetworkErrors: string[] = []; let intentionalMobileInterruption = false;
  function monitor(target: Page) { target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); target.on("console", message => { if (message.type() !== "error" || /Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED|net::ERR_CONNECTION_REFUSED/.test(message.text())) return; const code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED"; if (target === mobile && intentionalMobileInterruption && /\/api\/v1\/deals\/[^/]+\/reopen$/.test(message.location().url) && /^net::ERR_(CONNECTION_FAILED|ABORTED|CONNECTION_CLOSED)$/.test(code)) expectedNetworkErrors.push(code); else errors.push(`APPLICATION_CONSOLE_ERROR:${code}`); }); }
  monitor(page); monitor(mobile); monitor(context);
  await mkdir(path.resolve("output/playwright"), { recursive: true }); await mkdir(path.resolve("../.impeccable/review"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 }); const data = await reservationFixture(page, actors); const pair = await salePair(page, data);
    await context.setViewportSize({ width: 1440, height: 1000 }); await context.goto(`/deals/${data.unit}`);
    await expect(context.getByText("Aucun résultat enregistré. Une proposition acceptée ne clôture pas l’affaire.", { exact: true })).toBeVisible();
    await capture(context, "context-desktop", true);
    await page.goto(`/deals/${data.unit}`); const trigger = page.getByRole("button", { name: "Clôturer l’affaire", exact: true });
    await expect(trigger).toBeEnabled(); await trigger.focus(); await page.keyboard.press("Enter");
    let dialog = page.getByRole("alertdialog", { name: "Clôturer l’affaire", exact: true });
    await expect(dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("heading", { name: "Clôturer l’affaire", exact: true })).toBeFocused();
    await capture(page, "close-desktop"); const desktop = await geometry(page);
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    dialog = await outcomeDialog(page); await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Indiquez la date et l’explication" })).toBeVisible(); await capture(page, "invalid-desktop");
    await fillOutcome(dialog); await dialog.getByLabel("Résultat", { exact: true }).focus(); await page.keyboard.press("Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    let releaseWrite = () => {}; const gate = new Promise<void>(resolve => { releaseWrite = resolve; });
    await page.route(`**/api/v1/deals/${data.unit}/close`, async route => { await gate; await route.continue(); });
    try { await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); const pending = dialog.getByRole("button", { name: "Enregistrement…", exact: true }); await expect(pending).toBeDisabled(); await pending.scrollIntoViewIfNeeded(); await capture(page, "loading-desktop"); }
    finally { releaseWrite(); }
    await expect(dialog).not.toBeVisible(); await page.unroute(`**/api/v1/deals/${data.unit}/close`);
    await expect(page.getByRole("region", { name: "Résultats et réouvertures", exact: true }).getByText(/SP13 accord synthétique confirmé/)).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0)); await capture(page, "closed-desktop");
    await page.goto(`/deals/${data.whole}`); const partial = await outcomeDialog(page); await fillOutcome(partial);
    await partial.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); const conflict = partial.getByRole("alert").filter({ hasText: "La clôture du programme entier reste bloquée" }).last();
    await expect(conflict).toBeVisible(); await conflict.scrollIntoViewIfNeeded(); await capture(page, "partial-desktop"); await partial.getByRole("button", { name: "Retour", exact: true }).click();
    await page.goto(`/projects/properties/${data.inventory.pid}`); await expect(page.getByText(/Occupation locative enregistrée/).first()).toBeVisible(); await capture(page, "occupied-inventory-desktop");
    await signIn(mobile, data.agent); await mobile.goto(`/deals/${data.unit}`); await expect(mobile.getByText("Pièces jointes en lecture seule pour l’état actuel de l’affaire ou du contact.", { exact: true })).toBeVisible(); await expect(mobile.getByText(/Contact archivé/)).toHaveCount(0); await expect(mobile.getByRole("region", { name: "Résultats et réouvertures", exact: true }).getByText(/SP13 accord synthétique confirmé/)).toBeVisible(); await capture(mobile, "context-mobile", true);
    await mobile.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).tap(); const reopen = mobile.getByRole("alertdialog", { name: "Rouvrir l’affaire", exact: true });
    await expect(reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true })).toBeEnabled(); await capture(mobile, "reopen-mobile"); const touch = await geometry(mobile);
    await reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP13 motif synthétique conservé après interruption");
    const fail = (route: Route) => { intentionalMobileInterruption = true; return route.abort("connectionfailed"); }; await mobile.route(`**/api/v1/deals/${data.unit}/reopen`, fail);
    await reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).tap(); const failed = reopen.getByRole("alert").filter({ hasText: "Le service local est indisponible" }); await expect(failed).toBeVisible(); await failed.scrollIntoViewIfNeeded();
    await expect(reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true })).toHaveValue("SP13 motif synthétique conservé après interruption"); await capture(mobile, "error-mobile");
    intentionalMobileInterruption = false; await mobile.unroute(`**/api/v1/deals/${data.unit}/reopen`, fail); await reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).tap(); await expect(reopen).not.toBeVisible();
    const history = mobile.getByRole("region", { name: "Résultats et réouvertures", exact: true }); await expect(history.getByText("Le résultat d’origine est conservé.", { exact: true })).toBeVisible(); await history.scrollIntoViewIfNeeded(); await capture(mobile, "history-mobile");
    const narrow = await outcomeDialog(mobile); await fillOutcome(narrow);
    for (const width of [320, 360, 390, 768, 1024, 1440]) { await mobile.setViewportSize({ width, height: 900 }); await geometry(mobile); }
    await mobile.setViewportSize({ width: 320, height: 800 }); await narrow.evaluate(el => { el.scrollTop = 0; }); await capture(mobile, "narrow-320"); await narrow.getByRole("button", { name: "Retour", exact: true }).tap();
    profile = await mkdtemp(path.resolve("test-results/sp13-zoom-")); const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await signIn(zoom, data.agent); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"); const prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(`${baseURL}/deals/${data.unit}`); const zoomDialog = await outcomeDialog(zoom); await zoomDialog.getByLabel("Date du résultat (obligatoire)", { exact: true }).fill("2026-10-15"); await zoomDialog.evaluate(el => { el.scrollTop = 0; });
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); await geometry(zoom); await capture(zoom, "zoom-200");
    await clearActorContext(page); await signIn(page, data.manager); await page.goto(`/projects/properties/${pair.pid}`); await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await page.getByRole("button", { name: "Marquer vendue ailleurs", exact: true }).click(); const external = page.getByRole("alertdialog", { name: "Marquer vendue ailleurs", exact: true }); await expect(external.getByRole("button", { name: "Marquer vendue ailleurs", exact: true })).toBeEnabled();
    await external.getByLabel("Date du résultat externe (obligatoire)", { exact: true }).fill("2026-10-15"); await external.getByLabel("Motif partagé, sans donnée privée (obligatoire)", { exact: true }).fill("SP13 vente externe synthétique partagée"); await external.evaluate(el => { el.scrollTop = 0; }); await capture(page, "external-desktop");
    await external.getByRole("button", { name: "Marquer vendue ailleurs", exact: true }).click(); await expect(external).not.toBeVisible(); await page.getByRole("tab", { name: "Historique", exact: true }).click(); await expect(page.getByText(/Résultat externe du/).first()).toBeVisible();
    const outsider = await createActor("agent"); actors.push(outsider); await clearActorContext(mobile); await mobile.setViewportSize({ width: 390, height: 844 }); await signIn(mobile, outsider); await mobile.goto(`/deals/${data.unit}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await capture(mobile, "denied-mobile");
    await mobile.goto(`/projects/properties/${pair.pid}`); await expect(mobile.getByText(/Lecture seule : les modifications d’inventaire/)).toBeVisible(); await expect(mobile.getByRole("button", { name: "Marquer vendue ailleurs", exact: true })).toHaveCount(0); await capture(mobile, "external-denied-mobile");
    console.info("SP13 native observations", JSON.stringify({ desktop, touch, baseline, measurement, expectedNetworkErrors, unexpectedConsoleErrors: errors })); expect(errors).toEqual([]);
  } finally {
    await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp13-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await mobileContext.close(); await context.close(); await clearActorContext(page); for (const actor of actors) await removeActor(actor);
  }
});

test("SP13 settled desktop context evidence", async ({ page }) => {
  test.setTimeout(120_000);
  const actors: TestActor[] = [];
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const data = await reservationFixture(page, actors);
    await page.goto(`/deals/${data.unit}`);
    await expect(page.getByText("Aucun résultat enregistré. Une proposition acceptée ne clôture pas l’affaire.", { exact: true })).toBeVisible();
    await expect(page.getByText("Aucune proposition client sur cette page.", { exact: true })).toBeVisible();
    await expect(page.getByText("Aucune pièce jointe sur cette page. Ajoutez un fichier pour commencer.", { exact: true })).toBeVisible();
    await expect(page.getByText("Affaire créée · version 1", { exact: true })).toBeVisible();
    await capture(page, "context-desktop", true);
    const close = await outcomeDialog(page);
    await fillOutcome(close);
    await close.getByRole("button", { name: "Actualiser les effets", exact: true }).click();
    await expect(close.getByRole("button", { name: "Clôturer l’affaire", exact: true })).toBeEnabled();
    await expect(close.getByLabel("Explication du résultat (obligatoire)", { exact: true })).toHaveValue("SP13 accord synthétique confirmé");
    await expect(close.getByLabel(/Montant convenu en MAD/)).toHaveValue("11999,99");
    await close.getByRole("button", { name: "Retour", exact: true }).click();
    await clearActorContext(page);
    await signIn(page, data.manager);
    await page.goto(`/projects/properties/${data.inventory.pid}`);
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await page.getByRole("button", { name: "Marquer louée ailleurs", exact: true }).click();
    const external = page.getByRole("alertdialog", { name: "Marquer louée ailleurs", exact: true });
    await expect(external.getByRole("button", { name: "Marquer louée ailleurs", exact: true })).toBeEnabled();
    await external.getByLabel("Date du résultat externe (obligatoire)", { exact: true }).fill("2026-10-15");
    await external.getByLabel("Motif partagé, sans donnée privée (obligatoire)", { exact: true }).fill("SP13 motif partagé retenu après actualisation");
    await external.getByRole("button", { name: "Actualiser les effets", exact: true }).click();
    await expect(external.getByRole("button", { name: "Marquer louée ailleurs", exact: true })).toBeEnabled();
    await expect(external.getByLabel("Motif partagé, sans donnée privée (obligatoire)", { exact: true })).toHaveValue("SP13 motif partagé retenu après actualisation");
    await expect(external.getByLabel("Date du résultat externe (obligatoire)", { exact: true })).toHaveValue("2026-10-15");
    await external.getByRole("button", { name: "Retour", exact: true }).click();
  } finally {
    await clearActorContext(page);
    for (const actor of actors) await removeActor(actor);
  }
});
