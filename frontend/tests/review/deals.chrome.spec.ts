import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { fillDeal, saveDeal, skipStage } from "../helpers/deals";
import { apiProcess, testControl } from "../helpers/api-process";
import { manage, previewOperation, confirmOperation } from "../helpers/ownership";
import { syntheticFile, uploadFile, downloadFile } from "../helpers/files";

async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
  const cdp = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await cdp.send("Page.getLayoutMetrics") : undefined; const width = await page.evaluate(() => innerWidth);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}) });
    await writeFile(path.resolve(`output/playwright/sp11-${name}.png`), Buffer.from(shot.data, "base64"));
  } finally { await cdp.detach(); }
}
async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const control = document.querySelector<HTMLButtonElement>('button[type="submit"]'); const h1 = document.querySelector("h1");
    const main = document.querySelector("main"); const style = main ? getComputedStyle(main) : undefined;
    const overflowElements = [...document.body.querySelectorAll<HTMLElement>("*")].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).slice(0, 8).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "svg", width: el.getBoundingClientRect().width }));
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, overflowElements, controlHeight: control?.getBoundingClientRect().height, headingSize: h1 ? getComputedStyle(h1).fontSize : null, padding: style?.paddingLeft, gap: style?.gap };
  });
  expect(result.overflow, JSON.stringify({ width: result.width, elements: result.overflowElements })).toBe(false); if (result.controlHeight) expect(result.controlHeight).toBeGreaterThanOrEqual(44);
  return result;
}

test("SP11 visible Chrome: explicit deals, proposals, skip, private files, states, touch and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(360_000); page.setDefaultTimeout(25_000);
  const agent = await createActor("agent"); const manager = await createActor("manager"); const outsider = await createActor("agent");
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" }); const mobile = await mobileContext.newPage();
  let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined; let profile: string | undefined; const errors: string[] = [];
  function monitor(target: Page) { target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); target.on("console", m => { if (m.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED|net::ERR_CONNECTION_REFUSED/.test(m.text())) errors.push("APPLICATION_CONSOLE_ERROR"); }); }
  monitor(page); monitor(mobile); await mkdir(path.resolve("output/playwright"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 }); await signIn(page, agent); const lead = await createLead(page, "SP11 contact synthétique de revue"); const before = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json(); const contact = before.contact.id;
    await page.goto("/deals"); await expect(page.getByText(/Aucune affaire sur cette page/)).toBeVisible(); await capture(page, "empty-desktop");
    await page.goto(`/deals/new?contact_id=${contact}`);
    const projectName = `SP11 projet synthétique ${"localisationetconditions".repeat(4)}`;
    const form = await fillDeal(page, projectName);
    await expect(form.getByLabel("Titre de l’affaire", { exact: true })).toHaveCount(0);
    await form.getByLabel("Budget *", { exact: true }).selectOption("");
    await form.getByRole("button", { name: "Créer l’affaire", exact: true }).click();
    await expect(form.getByText("Complétez la qualification avant d’enregistrer.", { exact: true })).toBeVisible();
    await capture(page, "invalid-desktop");
    await form.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH");
    await capture(page, "create-desktop", true);
    await apiProcess("stop"); await form.getByRole("button", { name: "Créer l’affaire", exact: true }).click(); await expect(form.getByText(/Le service local est indisponible/)).toBeVisible(); await expect(form.getByLabel("Nom du projet externe *", { exact: true })).toHaveValue(projectName); await form.getByRole("alert").scrollIntoViewIfNeeded(); await capture(page, "error-draft-desktop"); await apiProcess("start"); await expect.poll(async () => (await page.request.get("/api/v1/auth/me")).status()).toBe(200); const id = await saveDeal(page);
    const offer = page.getByRole("form", { name: "Nouvelle proposition client", exact: true }); await offer.getByLabel("Montant proposé (MAD)", { exact: true }).fill("11999,99"); await offer.getByLabel("Période du prix proposé", { exact: true }).selectOption("month"); await offer.getByLabel("Statut de la proposition", { exact: true }).selectOption("accepted"); await offer.getByLabel("Conditions proposées", { exact: true }).fill("SP11 conditions synthétiques conservées avec le véritable auteur"); await offer.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await expect(page.getByRole("region", { name: "Propositions client", exact: true }).getByText(/Comparaison annuelle exacte.*143.*999,88 MAD/)).toBeVisible(); expect((await (await page.request.get(`/api/v1/deals/${id}`)).json()).stage).toBe("new");
    await skipStage(page); expect(await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).toEqual(before);
    await page.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true }).click(); const edit = page.getByRole("form", { name: "Modifier l’affaire", exact: true }); await edit.getByLabel("Prochaine action", { exact: true }).fill("SP11 brouillon de conflit conservé"); expect((await staffCommand(page, `deals/${id}/transition`, { expected_version: 3, stage: "negotiation", reason: "SP11 autre session synthétique" })).status()).toBe(200); await edit.getByRole("button", { name: "Enregistrer l’affaire", exact: true }).click(); await expect(edit.getByText(/Cette affaire ou cette proposition a changé/)).toBeVisible(); await expect(edit.getByLabel("Prochaine action", { exact: true })).toHaveValue("SP11 brouillon de conflit conservé"); await edit.getByRole("region", { name: "Version actuelle de l’affaire", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "conflict-desktop"); await edit.getByRole("button", { name: "Charger la version actuelle", exact: true }).click(); await expect(edit.getByLabel("Prochaine action", { exact: true })).toHaveValue("SP11 rappeler le contact"); await edit.getByLabel("Prochaine action", { exact: true }).fill("SP11 brouillon de conflit conservé"); await edit.getByRole("button", { name: "Enregistrer l’affaire", exact: true }).click(); await expect(page.getByText("Affaire enregistrée.", { exact: true })).toBeVisible();
    const trigger = page.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true }); await trigger.click(); await page.getByRole("button", { name: "Annuler les modifications", exact: true }).click(); await expect(trigger).toBeFocused();
    await testControl("worker-start");
    const file = await syntheticFile("clean", "SP11 pièce synthétique.png"); const row = await uploadFile(page, file); await expect(row.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 30_000 }); await downloadFile(page, file.name, file.buffer);
    await expect(page.getByRole("region", { name: "Historique de l’affaire", exact: true }).getByRole("listitem")).toHaveCount(5); await capture(page, "detail-desktop", true); const desktopGeometry = await geometry(page);
    const clientName = before.contact.name;
    await page.goto("/deals"); await expect(page.getByRole("link", { name: clientName, exact: true })).toBeVisible(); await capture(page, "list-desktop", true); await page.getByRole("button", { name: "Colonnes", exact: true }).click(); await expect(page.getByRole("dialog", { name: "Colonnes des affaires", exact: true })).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Colonnes", exact: true })).toBeFocused();
    await page.getByLabel("Rechercher une affaire, un contact ou une action", { exact: true }).fill("SP11 aucun résultat synthétique"); await page.getByRole("button", { name: "Appliquer", exact: true }).click(); await expect(page.getByText("0 affaire(s) accessible(s) dans ces filtres.", { exact: true })).toBeVisible(); await capture(page, "filtered-empty-desktop");
    let release = () => {}; const gate = new Promise<void>(r => { release = r; }); const hold = async (route: Route) => { await gate; await route.continue(); }; await page.route("**/api/v1/deals?**", hold); await page.goto("/deals"); await expect(page.getByText("Chargement des affaires…", { exact: true })).toBeVisible(); await capture(page, "loading-desktop"); release(); await expect(page.getByRole("link", { name: clientName, exact: true })).toBeVisible(); await page.unroute("**/api/v1/deals?**", hold);
    const fail = (route: Route) => route.abort("failed"); await page.route("**/api/v1/deals?**", fail); await page.goto("/deals"); await expect(page.getByRole("heading", { name: "Affaires", exact: true })).toBeVisible(); await expect(page.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible(); await expect(page.getByRole("button", { name: "Réessayer", exact: true })).toBeVisible(); await capture(page, "list-error-desktop"); await page.unroute("**/api/v1/deals?**", fail); await page.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByRole("link", { name: clientName, exact: true })).toBeVisible();
    await signIn(mobile, agent); await mobile.goto("/deals"); await expect(mobile.getByRole("link", { name: clientName, exact: true })).toBeVisible(); await capture(mobile, "list-mobile", true); const mobileGeometry = await geometry(mobile); const region = mobile.getByRole("region", { name: "Tableau des affaires, défilement horizontal", exact: true }); await region.evaluate(el => { el.scrollLeft = el.scrollWidth; }); await expect.poll(() => region.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await mobile.goto(`/deals/${id}`); await expect(mobile.getByRole("heading", { name: "Pipeline", exact: true })).toBeVisible(); await expect(mobile.getByRole("region", { name: "Propositions client", exact: true }).getByText("1 proposition(s) enregistrée(s).", { exact: true })).toBeVisible(); await expect(mobile.getByRole("region", { name: "Historique de l’affaire", exact: true }).getByRole("listitem")).toHaveCount(5); await expect(mobile.getByRole("heading", { name: file.name, exact: true })).toBeVisible(); await capture(mobile, "detail-mobile", true); await mobile.setViewportSize({ width: 360, height: 800 }); await mobile.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true }).tap(); await mobile.getByLabel("Budget *", { exact: true }).scrollIntoViewIfNeeded(); await mobile.getByText("Recherche et offre d’inventaire liées (facultatif)", { exact: true }).tap(); await expect(mobile.getByText("Aucune recherche pour ce contact.", { exact: true })).toBeVisible(); await mobile.getByLabel("Budget *", { exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "form-mobile"); await geometry(mobile); await mobile.getByRole("button", { name: "Annuler les modifications", exact: true }).tap(); await expect(mobile.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true })).toBeFocused();
    for (const width of [320, 768, 1024]) { await mobile.setViewportSize({ width, height: 900 }); await geometry(mobile); }
    profile = await mkdtemp(path.resolve("test-results/sp11-zoom-")); const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await zoom.goto(`${baseURL}/login`); await signIn(zoom, agent); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"); const prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(`${baseURL}/deals/${id}`); await expect(zoom.getByRole("heading", { name: "Pipeline", exact: true })).toBeVisible(); const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); expect(measurement.overflow).toBe(false); await zoom.getByRole("heading", { name: "Pipeline", exact: true }).scrollIntoViewIfNeeded(); await capture(zoom, "zoom-200-viewport");
    await mobile.setViewportSize({ width: 390, height: 844 }); await clearActorContext(mobile); await signIn(mobile, outsider); await mobile.goto(`/deals/${id}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await capture(mobile, "denied-mobile");
    await clearActorContext(page); await signIn(page, manager); await page.goto(`/contacts/${contact}`); await manage(page, "archive"); await previewOperation(page); await expect(page.getByText("Affaires indépendantes conservées", { exact: true })).toBeVisible(); await confirmOperation(page); await page.goto(`/deals/${id}`); await expect(page.getByText(/Contact archivé : affaire et propositions/)).toBeVisible(); await expect(page.getByRole("form", { name: "Nouvelle proposition client", exact: true })).toHaveCount(0); await capture(page, "archived-desktop");
    expect(errors).toEqual([]); console.info("SP11 native layout/zoom observations", JSON.stringify({ desktopGeometry, mobileGeometry, baseline, measurement, unexpectedConsoleErrors: errors.length }));
  } finally {
    await apiProcess("start"); await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp11-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await mobileContext.close(); await clearActorContext(page); await removeActor(agent); await removeActor(manager); await removeActor(outsider);
  }
});
