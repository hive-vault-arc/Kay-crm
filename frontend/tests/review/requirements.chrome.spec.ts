import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { beginRequirement, expectCurrentSearch, inventoryFixture, openRequirements, saveRequirement } from "../helpers/requirements";
import { apiProcess } from "../helpers/api-process";
import { manage, previewOperation, confirmOperation } from "../helpers/ownership";

async function capture(page: Page, name: string) {
  await expect(page.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  try { const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true }); await writeFile(path.resolve(`output/playwright/sp10-${name}.png`), Buffer.from(shot.data, "base64")); }
  finally { await cdp.detach(); }
}

async function full(page: Page, contact: string, title: string, size: "desktop" | "mobile") {
  const copy = await page.context().newPage();
  try {
    await copy.setViewportSize(page.viewportSize()!); await openRequirements(copy, contact);
    await copy.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).click();
    await expect(copy.getByRole("region", { name: "Sélection de la recherche", exact: true }).getByRole("listitem")).toHaveCount(2);
    await expect(copy.getByRole("region", { name: "Choisir une offre exacte", exact: true }).getByText("3 offre(s) correspondante(s).", { exact: true })).toBeVisible();
    await expect(copy.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
    await copy.evaluate(() => window.scrollTo(0, 0));
    const cdp = await copy.context().newCDPSession(copy);
    try {
      const metrics = await cdp.send("Page.getLayoutMetrics"); const width = await copy.evaluate(() => innerWidth);
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
      const pixels = Buffer.from(shot.data, "base64"); await writeFile(path.resolve(`../.impeccable/review/${size}.png`), pixels); await writeFile(path.resolve(`output/playwright/sp10-full-${size}.png`), pixels);
    } finally { await cdp.detach(); }
  } finally { await copy.close(); await page.bringToFront(); }
}

test("SP10 visible Chrome: qualification, exact targets, states, native touch and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000); page.setDefaultTimeout(25_000);
  const owner = await createActor("agent"); const manager = await createActor("manager"); const outsider = await createActor("agent");
  const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await touch.newPage(); const errors: string[] = [];
  function monitor(target: Page) { target.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); target.on("console", message => { if (message.type() === "error" && !/Failed to load resource:.*(401|403|404|409|422|503)|net::ERR_FAILED|net::ERR_CONNECTION_REFUSED/.test(message.text())) errors.push("APPLICATION_CONSOLE_ERROR"); }); }
  monitor(page); monitor(mobile);
  let zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined; let profile: string | undefined;
  await mkdir(path.resolve("output/playwright"), { recursive: true }); await mkdir(path.resolve("../.impeccable/review"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await signIn(page, owner); const lead = await createLead(page, "SP10 contact synthétique pour revue");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    await clearActorContext(page); await signIn(page, manager); const inventory = await inventoryFixture(page, contact);
    await clearActorContext(page); await signIn(page, owner); await openRequirements(page, contact);
    await expect(page.getByText(/Aucune recherche enregistrée/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouvelle recherche", exact: true })).toBeEnabled();
    await capture(page, "empty-desktop");
    const trigger = page.getByRole("button", { name: "Nouvelle recherche", exact: true }); await trigger.focus(); await expect(trigger).toBeFocused(); await page.keyboard.press("Enter");
    const title = `SP10 recherche synthétique ${"localisationetpréférences".repeat(4)}`;
    const form = page.getByRole("form", { name: "Nouvelle recherche", exact: true });
    await form.getByLabel("Nom de la recherche", { exact: true }).fill(title);
    await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("11999,99");
    await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("0");
    await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(form.getByText(/Valeur invalide/)).toBeVisible(); await form.getByLabel("Surface minimale (m²)", { exact: true }).scrollIntoViewIfNeeded(); await capture(page, "invalid-desktop");
    await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("80,50");
    await form.getByLabel("Importance : Surface minimale (m²)", { exact: true }).selectOption("required");
    await form.getByLabel("Parking", { exact: true }).selectOption("false");
    await apiProcess("stop"); await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(form.getByText(/La réponse n’a pas été confirmée/)).toBeVisible(); await expect(form.getByLabel("Nom de la recherche", { exact: true })).toHaveValue(title);
    await form.getByRole("alert").scrollIntoViewIfNeeded(); await capture(page, "error-draft-desktop");
    await apiProcess("start");
    await expect.poll(async () => (await page.request.get("/api/v1/auth/me")).status()).toBe(200);
    const rid = await saveRequirement(page);
    const selector = page.getByRole("region", { name: "Choisir une offre exacte", exact: true });
    await selector.getByLabel("Niveau de la cible", { exact: true }).selectOption("unit"); await selector.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    await expect(selector.getByText("1 offre(s) correspondante(s).", { exact: true })).toBeVisible();
    await selector.getByRole("button", { name: "Ajouter à la sélection", exact: true }).click();
    const selected = page.getByRole("region", { name: "Sélection de la recherche", exact: true }); await expect(selected.getByRole("listitem")).toHaveCount(1);
    await selected.getByLabel("Avis sur cette offre", { exact: true }).fill("SP10 avis synthétique : unité précise, conditions d’origine préservées.");
    await selected.getByRole("button", { name: "Enregistrer l’avis", exact: true }).click(); await expect(selected.getByRole("button", { name: "Enregistrer l’avis", exact: true })).toBeEnabled();
    await selector.getByLabel("Niveau de la cible", { exact: true }).selectOption("development"); await selector.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    await expect(selector.getByRole("heading", { name: `${inventory.reference} : Programme entier`, exact: true })).toBeVisible();
    await selector.getByRole("button", { name: "Ajouter à la sélection", exact: true }).click(); await expect(selected.getByRole("listitem")).toHaveCount(2);
    await selected.getByRole("listitem").filter({ hasText: "Unité physique" }).getByRole("link", { name: "Ouvrir la cible exacte", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/properties/${inventory.pid}$`));
    await expect(page.getByRole("heading", { name: `${inventory.reference}-U201 · SP10 unité physique`, exact: true })).toBeVisible();
    await openRequirements(page, contact);
    await beginRequirement(page, "SP10 achat indépendant", "sale"); await saveRequirement(page);
    await expect(page.getByText("Aucune offre sélectionnée pour cette recherche.", { exact: true })).toBeVisible();
    await expectCurrentSearch(page, "SP10 achat indépendant (achat, 0 offre(s))");
    await page.getByRole("button", { name: "Fermer la recherche", exact: true }).click();
    await expect(page.getByText("2 recherche(s) accessible(s).", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).click();
    await expectCurrentSearch(page, `${title} (location, 2 offre(s))`);
    await expect(selected.getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: "Modifier la recherche", exact: true }).click();
    const edit = page.getByRole("form", { name: "Modifier la recherche", exact: true });
    await edit.getByLabel("Budget minimum (MAD)", { exact: true }).fill("100,00");
    const latest = await (await page.request.get(`/api/v1/requirements/${rid}`)).json();
    const changed = await staffCommand(page, `requirements/${rid}`, { title: "SP10 autre version synthétique", intent: latest.intent, currency: latest.currency, budget_min_mad: latest.budget_min_mad, budget_max_mad: latest.budget_max_mad, budget_period: latest.budget_period, criteria: latest.criteria, expected_version: latest.version }, "PATCH"); expect(changed.status()).toBe(200);
    const conflict = page.waitForResponse(r => r.request().method() === "PATCH" && new URL(r.url()).pathname === `/api/v1/requirements/${rid}`);
    await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); expect((await conflict).status()).toBe(409);
    await edit.getByRole("region", { name: "Comparaison de la recherche", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "conflict-desktop");
    await expect(edit.getByLabel("Budget minimum (MAD)", { exact: true })).toHaveValue("100.00");
    await edit.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click(); await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(page.getByRole("button", { name: "Modifier la recherche", exact: true })).toBeFocused();
    await full(page, contact, title, "desktop"); await selected.scrollIntoViewIfNeeded(); await capture(page, "selected-desktop");
    const removeWhole = selected.getByRole("listitem").filter({ hasText: "Programme entier" }).getByRole("button", { name: "Retirer de la sélection", exact: true });
    await removeWhole.focus(); await page.keyboard.press("Enter");
    await expect(selected.getByRole("listitem")).toHaveCount(1);
    await expect(page.getByText("Offre retirée de cette sélection.", { exact: true })).toBeVisible();
    await expect(selected.getByRole("button", { name: "Enregistrer l’avis", exact: true })).toBeEnabled();
    const selectionHeading = selected.getByRole("heading", { name: "Offres sélectionnées", exact: true });
    await expect(selectionHeading).toBeFocused();
    await selectionHeading.evaluate(node => { node.scrollIntoView({ block: "start" }); window.scrollBy(0, -180); });
    await capture(page, "removal-focus-desktop");
    const whole = selector.getByRole("listitem").filter({ has: page.getByRole("heading", { name: `${inventory.reference} : Programme entier`, exact: true }) });
    await expect(whole.getByRole("button", { name: "Ajouter à la sélection", exact: true })).toBeEnabled(); await whole.getByRole("button", { name: "Ajouter à la sélection", exact: true }).click(); await expect(selected.getByRole("listitem")).toHaveCount(2);
    await selector.getByLabel("Loyer annuel maximum (MAD)", { exact: true }).fill("1.00"); await selector.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    await expect(selector.getByText(/Aucune offre ne correspond/)).toBeVisible(); await selector.scrollIntoViewIfNeeded(); await capture(page, "filtered-empty-desktop");
    await selector.getByRole("button", { name: "Réinitialiser les offres", exact: true }).click();
    for (const width of [320, 360, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 1000 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false); }
    await signIn(mobile, owner); await openRequirements(mobile, contact); await mobile.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).tap();
    await expectCurrentSearch(mobile, `${title} (location, 2 offre(s))`);
    await mobile.getByRole("button", { name: "SP10 achat indépendant (achat, 0 offre(s))", exact: true }).tap();
    await expectCurrentSearch(mobile, "SP10 achat indépendant (achat, 0 offre(s))");
    await mobile.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).tap();
    await expectCurrentSearch(mobile, `${title} (location, 2 offre(s))`);
    await expect(mobile.getByRole("region", { name: "Sélection de la recherche", exact: true }).getByRole("listitem")).toHaveCount(2);
    await full(mobile, contact, title, "mobile");
    await mobile.getByRole("heading", { name: "Offres sélectionnées", exact: true }).scrollIntoViewIfNeeded();
    await capture(mobile, "selected-mobile");
    await mobile.setViewportSize({ width: 360, height: 800 }); await mobile.getByRole("button", { name: "Modifier la recherche", exact: true }).tap();
    await mobile.getByLabel("Nom de la recherche", { exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "form-mobile");
    await mobile.getByRole("button", { name: "Annuler", exact: true }).tap(); await expect(mobile.getByRole("button", { name: "Modifier la recherche", exact: true })).toBeFocused();
    let release = () => {}; const gate = new Promise<void>(resolve => { release = resolve; });
    const hold = async (route: Route) => { await gate; await route.continue(); };
    await page.route("**/api/v1/requirements?**", hold); await openRequirements(page, contact);
    await expect(page.getByText("Chargement des recherches…", { exact: true })).toBeVisible(); await page.getByText("Chargement des recherches…", { exact: true }).scrollIntoViewIfNeeded(); await capture(page, "loading-desktop");
    release(); await expect(page.getByText("2 recherche(s) accessible(s).", { exact: true })).toBeVisible(); await page.unroute("**/api/v1/requirements?**", hold);
    const fail = (route: Route) => route.abort("failed"); await page.route("**/api/v1/requirements?**", fail); await openRequirements(page, contact);
    await expect(page.getByRole("region", { name: "Recherches du contact", exact: true }).getByRole("alert")).toBeVisible(); await page.getByRole("region", { name: "Recherches du contact", exact: true }).scrollIntoViewIfNeeded(); await capture(page, "error-list-desktop");
    await page.unroute("**/api/v1/requirements?**", fail); await page.getByRole("region", { name: "Recherches du contact", exact: true }).getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByText("2 recherche(s) accessible(s).", { exact: true })).toBeVisible();
    profile = await mkdtemp(path.resolve("test-results/sp10-zoom-"));
    const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await zoom.goto(`${baseURL}/login`); await signIn(zoom, owner);
    const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"); const prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(baseURL!); await openRequirements(zoom, contact); await zoom.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).click();
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * 0.6); expect(measurement.overflow).toBe(false);
    await zoom.getByRole("region", { name: "Recherche sélectionnée", exact: true }).scrollIntoViewIfNeeded(); await capture(zoom, "zoom-200-viewport"); console.info("SP10 actual browser zoom:", JSON.stringify({ baseline, measurement }));
    await clearActorContext(mobile); await signIn(mobile, outsider); await mobile.goto(`/contacts/${contact}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await capture(mobile, "denied-mobile");
    await clearActorContext(page); await signIn(page, manager); await page.goto(`/contacts/${contact}`); await manage(page, "archive"); await previewOperation(page); await confirmOperation(page);
    await page.getByRole("tab", { name: "Recherches", exact: true }).click(); await expect(page.getByText(/Contact archivé : recherches conservées/)).toBeVisible();
    await page.getByRole("button", { name: `${title} (location, 2 offre(s))`, exact: true }).click(); await expect(page.getByRole("region", { name: "Sélection de la recherche", exact: true }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Modifier la recherche", exact: true })).toHaveCount(0);
    await page.getByText(/Contact archivé : recherches conservées/).scrollIntoViewIfNeeded();
    await capture(page, "archived-desktop");
    expect(errors).toEqual([]);
  } finally {
    await apiProcess("start"); await zoomContext?.close();
    if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp10-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await touch.close(); await clearActorContext(page); await removeActor(owner); await removeActor(manager); await removeActor(outsider);
  }
});
