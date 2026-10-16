import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { clearActorContext, test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { createProperty } from "../helpers/inventory";
import { downloadFile, syntheticFile, uploadFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";
import { manage, previewOperation, confirmOperation } from "../helpers/ownership";

async function capture(page: Page, name: string) {
  await expect(page.getByRole("button", { name: "Se déconnecter", exact: true, includeHidden: true })).toBeAttached();
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  const before = await page.evaluate(() => document.documentElement.clientWidth);
  const cdp = await page.context().newCDPSession(page);
  try {
    const result = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
    const pixels = Buffer.from(result.data, "base64");
    await writeFile(path.resolve(`output/playwright/sp09-${name}.png`), pixels);
    if (name === "clean-desktop" || name === "clean-mobile") {
      await mkdir(path.resolve("../.impeccable/review"), { recursive: true });
      const fullPage = await page.context().newPage();
      try {
        await fullPage.setViewportSize(page.viewportSize()!); await fullPage.goto(page.url());
        await expect(fullPage.getByText("Analyse réussie", { exact: true })).toBeVisible();
        await expect(fullPage.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
        await fullPage.evaluate(() => window.scrollTo(0, 0));
        const fullCdp = await page.context().newCDPSession(fullPage);
        try {
          const metrics = await fullCdp.send("Page.getLayoutMetrics");
          const width = await fullPage.evaluate(() => innerWidth);
          const full = await fullCdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
          const fullPixels = Buffer.from(full.data, "base64");
          const size = name === "clean-desktop" ? "desktop" : "mobile";
          await writeFile(path.resolve(`../.impeccable/review/${size}.png`), fullPixels);
          await writeFile(path.resolve(`output/playwright/sp09-full-${size}.png`), fullPixels);
        } finally { await fullCdp.detach(); }
      } finally { await fullPage.close(); await page.bringToFront(); }
    }
  } finally { await cdp.detach(); }
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(before);
}

test("SP09 visible Chrome: actual quarantine, clean/rejected files, private denial, touch, keyboard and 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(25_000);
  const manager = await createActor("manager"); const owner = await createActor("agent"); const outsider = await createActor("agent");
  const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 800 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await touch.newPage();
  const errors: string[] = [];
  const monitor = (target: Page) => {
    target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR"));
    target.on("console", message => { if (message.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED/.test(message.text())) errors.push("APPLICATION_CONSOLE_ERROR"); });
  };
  monitor(page); monitor(mobile);
  let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined; let profile: string | undefined;
  await mkdir(path.resolve("output/playwright"), { recursive: true });
  try {
    const clean = await syntheticFile("clean", `SP09 pièce synthétique ${"document".repeat(17)}.png`);
    const rejected = await syntheticFile("rejected");
    await signIn(page, owner);
    const lead = await createLead(page, "SP09 contact privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await page.goto(`/contacts/${contact.id}`); await page.getByRole("tab", { name: "Documents", exact: true }).click();
    const privateRow = await uploadFile(page, clean);
    await expect(privateRow.getByText("Analyse réussie", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, manager); await page.setViewportSize({ width: 1440, height: 900 });
    const property = await createProperty(page);
    const propertyPath = `/projects/properties/${property}`;
    const panel = page.getByRole("region", { name: "Pièces jointes", exact: true });
    await expect(panel.getByText(/Aucune pièce jointe sur cette page/)).toBeVisible();
    await panel.scrollIntoViewIfNeeded(); await capture(page, "empty-desktop");
    await testControl("worker-stop");
    let releasePermit = () => {}; const permitGate = new Promise<void>(resolve => { releasePermit = resolve; });
    const holdPermit = async (route: Route) => { await permitGate; await route.continue(); };
    await page.route("**/api/v1/files/permits", holdPermit);
    try {
      await page.getByLabel("Fichier à ajouter", { exact: true }).setInputFiles(clean);
      await page.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: /^Transfert :/ })).toBeVisible();
      await capture(page, "transfer-progress-desktop");
      await page.getByRole("button", { name: "Interrompre le transfert", exact: true }).click();
      releasePermit();
      await expect(page.getByRole("alert").filter({ hasText: "Transfert interrompu" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pièces jointes", exact: true })).toBeFocused();
    } finally { releasePermit(); await page.unroute("**/api/v1/files/permits", holdPermit); }
    await page.getByRole("button", { name: "Réessayer le transfert", exact: true }).click();
    await expect(page.getByText("Transfert terminé. Le fichier reste en quarantaine jusqu’au résultat de l’analyse.", { exact: true })).toBeVisible();
    const row = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: clean.name, exact: true }) });
    await expect(row.getByText("En quarantaine, analyse en attente", { exact: true })).toBeVisible();
    await expect(row.getByRole("button", { name: `Télécharger ${clean.name}`, exact: true })).toBeDisabled();
    await row.scrollIntoViewIfNeeded(); await capture(page, "pending-desktop");
    await testControl("worker-unavailable");
    await expect(row.getByText(/L’analyse est indisponible/)).toBeVisible(); await capture(page, "scanner-unavailable-desktop");
    await testControl("worker-start");
    await row.getByRole("button", { name: "Réessayer l’analyse", exact: true }).click();
    await expect(row.getByText("Analyse réussie", { exact: true })).toBeVisible();
    await downloadFile(page, clean.name, clean.buffer);
    await row.getByRole("button", { name: `Afficher ${clean.name}`, exact: true }).click();
    await expect(page.getByRole("img", { name: `Aperçu du fichier ${clean.name}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fermer l’aperçu", exact: true }).click();
    await expect(row.getByRole("button", { name: `Afficher ${clean.name}`, exact: true })).toBeFocused();
    const archive = row.getByRole("button", { name: `Archiver ${clean.name}`, exact: true });
    await archive.focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.keyboard.press("Escape"); await expect(archive).toBeFocused();
    await expect(page.locator('[data-slot="alert-dialog-content"]')).toHaveCount(0);
    const chooser = page.getByRole("button", { name: "Choisir un fichier", exact: true });
    await expect(chooser).toBeEnabled(); await chooser.focus(); await expect(chooser).toBeFocused();
    const picker = page.waitForEvent("filechooser"); await chooser.press("Enter"); await (await picker).setFiles([]);
    await panel.scrollIntoViewIfNeeded(); await capture(page, "clean-desktop");
    const badRow = await uploadFile(page, rejected);
    await expect(badRow.getByText("Fichier rejeté par l’antivirus", { exact: true })).toBeVisible();
    await expect(badRow.getByRole("button", { name: `Télécharger ${rejected.name}`, exact: true })).toBeDisabled();
    await badRow.scrollIntoViewIfNeeded(); await capture(page, "rejected-desktop");
    await signIn(mobile, manager); await mobile.goto(propertyPath);
    for (const width of [320, 360, 768, 1024, 1440]) {
      await mobile.setViewportSize({ width, height: 900 });
      await expect(mobile.getByText("Analyse réussie", { exact: true })).toBeVisible();
      expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const geometry = await mobile.getByRole("button", { name: "Choisir un fichier", exact: true }).evaluate(element => { const box = element.getBoundingClientRect(); return { left: box.left, right: box.right, width: innerWidth, height: box.height }; });
      expect(geometry.left).toBeGreaterThanOrEqual(0); expect(geometry.right).toBeLessThanOrEqual(width); expect(geometry.height).toBeGreaterThanOrEqual(44);
    }
    await mobile.setViewportSize({ width: 360, height: 800 });
    await mobile.getByRole("region", { name: "Pièces jointes", exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "clean-mobile");
    await mobile.getByRole("button", { name: `Archiver ${clean.name}`, exact: true }).tap();
    await expect(mobile.getByRole("alertdialog")).toBeVisible(); await capture(mobile, "archive-mobile");
    await mobile.getByRole("button", { name: "Annuler", exact: true }).tap();
    await clearActorContext(mobile); await signIn(mobile, outsider); await mobile.goto(propertyPath);
    await expect(mobile.getByText("Lecture seule : les pièces jointes d’inventaire sont gérées par les responsables.", { exact: true })).toBeVisible(); await downloadFile(mobile, clean.name, clean.buffer);
    await mobile.goto(`/contacts/${contact.id}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible();
    expect((await mobile.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).status()).toBe(404);
    await capture(mobile, "private-denied-mobile");
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    const loading = async (route: Route) => { await gate; await route.continue(); };
    await page.route("**/api/v1/documents?**", loading);
    await page.reload(); await expect(page.getByText("Chargement des pièces jointes…", { exact: true })).toBeVisible(); await page.getByText("Chargement des pièces jointes…", { exact: true }).scrollIntoViewIfNeeded(); await capture(page, "loading-desktop");
    release(); await expect(page.getByText("Analyse réussie", { exact: true })).toBeVisible(); await page.unroute("**/api/v1/documents?**", loading);
    const unavailable = (route: Route) => route.abort("failed");
    await page.route("**/api/v1/documents?**", unavailable); await page.reload();
    await expect(panel.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await capture(page, "error-desktop");
    await page.unroute("**/api/v1/documents?**", unavailable); await panel.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByText("Analyse réussie", { exact: true })).toBeVisible();
    profile = await mkdtemp(path.resolve("test-results/sp09-zoom-"));
    const launch = { ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let zoom = zoomContext.pages()[0]; await zoom.goto(`${baseURL}/login`); await signIn(zoom, manager);
    const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const preferencesPath = path.join(profile, "Default", "Preferences"); const preferences = JSON.parse(await readFile(preferencesPath, "utf8")); preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(preferencesPath, JSON.stringify(preferences));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom);
    await zoom.goto(`${baseURL}${propertyPath}`); await expect(zoom.getByText("Analyse réussie", { exact: true })).toBeVisible();
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); expect(measurement.overflow).toBe(false);
    await zoom.getByRole("region", { name: "Pièces jointes", exact: true }).scrollIntoViewIfNeeded(); await zoom.bringToFront();
    const cdp = await zoomContext.newCDPSession(zoom); const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
    await writeFile(path.resolve("output/playwright/sp09-zoom-200-viewport.png"), Buffer.from(shot.data, "base64")); await cdp.detach();
    console.info("SP09 actual browser zoom:", JSON.stringify({ baseline, measurement }));
    await page.goto(`/contacts/${contact.id}`); await manage(page, "archive"); await previewOperation(page); await confirmOperation(page);
    await page.getByRole("tab", { name: "Documents", exact: true }).click();
    await expect(page.getByText("Contact archivé : les documents ne peuvent pas être modifiés tant que le contact n’est pas restauré.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choisir un fichier", exact: true })).toHaveCount(0);
    await downloadFile(page, clean.name, clean.buffer);
    await page.getByRole("region", { name: "Pièces jointes", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "archived-contact-desktop");
    expect(errors).toEqual([]);
  } finally {
    await testControl("worker-start"); await zoomContext?.close();
    if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp09-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await touch.close(); await clearActorContext(page); await removeActor(manager); await removeActor(owner); await removeActor(outsider);
  }
});
