import { chromium, type Page, type Route } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, clearActorContext } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { geometry } from "../helpers/report-review";
import { clearIntake, fillWebsite, intakeFixture, simulatorOrigin, staffLogin } from "../helpers/intake";

test("SP20 visible Chrome: real signed form, scoped Lead, native states, touch, keyboard and zoom", async ({ page, browser, baseURL }) => {
  test.setTimeout(180000);
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, hasTouch: true, viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const mobile = await mobileContext.newPage(), errors: string[] = [], measurements: unknown[] = [];
  let injecting = false, profile: string | undefined, zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  function monitor(target: Page) { target.on("pageerror", () => errors.push("PAGE_ERROR")); target.on("console", message => { if (message.type() === "error") { const url = new URL(message.location().url || simulatorOrigin), code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED"; if (!(injecting && ["/submit", "/receipt", "/api/v1/enquiries"].some(p => url.pathname.startsWith(p)))) errors.push(code); } }); }
  async function capture(target: Page, name: string, canonical?: "desktop" | "mobile", deviceScale?: number) {
    await expect(target.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
    await target.evaluate(() => { scrollTo(0, 0); for (const a of document.getAnimations()) if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish(); });
    const cdp = await target.context().newCDPSession(target);
    try { const metrics = await cdp.send("Page.getLayoutMetrics"), dom = await target.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight })), coordinateScale = metrics.cssLayoutViewport.clientWidth / dom.width; const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: deviceScale ? metrics.layoutViewport.clientWidth / deviceScale : metrics.cssLayoutViewport.clientWidth, height: deviceScale ? metrics.contentSize.height / deviceScale : Math.ceil(dom.height * coordinateScale), scale: 1 } }); const bytes = Buffer.from(shot.data, "base64"); await writeFile(`output/playwright/sp20-${name}.png`, bytes); if (canonical) await writeFile(`../.impeccable/review/${canonical}.png`, bytes); } finally { await cdp.detach(); }
  }
  try {
    await mkdir("output/playwright", { recursive: true }); await mkdir("../.impeccable/review", { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const data = await intakeFixture(page); monitor(page); monitor(mobile);
    await fillWebsite(page); measurements.push(await geometry(page)); await capture(page, "form-desktop", "desktop");
    await page.getByLabel("Nom complet", { exact: true }).focus(); await page.keyboard.press("Tab"); await expect(page.getByLabel("Téléphone international", { exact: true })).toBeFocused();
    await mobile.goto(simulatorOrigin); await expect(mobile.getByRole("heading", { name: "Formulaire web local", exact: true })).toBeVisible();
    for (const width of [320, 360, 390, 768, 1024, 1440]) { await mobile.setViewportSize({ width, height: 900 }); measurements.push(await geometry(mobile)); }
    await mobile.setViewportSize({ width: 390, height: 844 }); await capture(mobile, "form-mobile", "mobile");
    await mobile.getByRole("button", { name: "Envoyer la demande", exact: true }).tap(); expect(await mobile.getByLabel("Nom complet", { exact: true }).evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
    await fillWebsite(mobile, "bad"); injecting = true; await mobile.getByRole("button", { name: "Envoyer la demande", exact: true }).tap();
    await expect(mobile.getByRole("alert").filter({ hasText: "Vérifiez le nom" })).toBeVisible(); await capture(mobile, "validation-mobile"); injecting = false;
    await mobile.getByLabel("Téléphone international", { exact: true }).fill("+212600000001");
    let pending: Route | undefined, signal = () => {}; const held = new Promise<void>(resolve => { signal = resolve; });
    await mobile.route(simulatorOrigin + "/submit", route => { pending = route; signal(); });
    await mobile.getByRole("button", { name: "Envoyer la demande", exact: true }).tap(); await held;
    await expect(mobile.getByRole("status")).toContainText("Envoi en cours"); await capture(mobile, "loading-mobile");
    const delivered = mobile.waitForResponse(simulatorOrigin + "/submit"); await pending!.continue(); await delivered; await mobile.unroute(simulatorOrigin + "/submit");
    await expect(mobile.getByRole("status")).toHaveText("En attente de traitement"); await capture(mobile, "queued-mobile");
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click(); await expect(page.getByRole("status")).toHaveText("En attente de traitement"); await capture(page, "queued-desktop");
    injecting = true; await mobile.route(simulatorOrigin + "/receipt", route => route.abort("connectionfailed")); await mobile.getByRole("button", { name: "Actualiser le suivi", exact: true }).tap();
    await expect(mobile.getByRole("alert").filter({ hasText: "suivi est indisponible" })).toBeVisible(); await capture(mobile, "follow-error-mobile"); await mobile.unroute(simulatorOrigin + "/receipt"); injecting = false;
    await testControl("worker-start"); await expect.poll(async () => { await mobile.getByRole("button", { name: "Actualiser le suivi", exact: true }).tap(); return mobile.getByRole("status").innerText(); }, { timeout: 15000 }).toBe("Demande traitée"); await expect(mobile.getByRole("button", { name: "Actualiser le suivi", exact: true })).toBeEnabled(); await capture(mobile, "processed-mobile");
    await mobile.getByRole("button", { name: "Nouvelle demande", exact: true }).tap(); await expect(mobile.getByLabel("Nom complet", { exact: true })).toHaveValue("");
    await testControl("worker-stop"); await fillWebsite(mobile, "+212600000002"); await mobile.getByRole("button", { name: "Envoyer la demande", exact: true }).tap(); await expect(mobile.getByRole("status")).toHaveText("En attente de traitement");
    await testControl("fixture", { action: "website-disable" }); await testControl("worker-start");
    await expect.poll(async () => { const status = await testControl("fixture", { action: "website-status" }) as { jobs: { kind: string; state: string }[] }; return status.jobs.some(row => row.kind === "website.process" && row.state === "invalidated"); }, { timeout: 15000 }).toBe(true);
    await testControl("fixture", { action: "website-source", id: data.other.id }); await mobile.getByRole("button", { name: "Actualiser le suivi", exact: true }).tap(); await expect(mobile.getByRole("status")).toHaveText("Traitement indisponible"); await capture(mobile, "failed-mobile");
    expect(await mobile.context().cookies(simulatorOrigin)).toEqual([]);
    await staffLogin(page, data.agent, baseURL!); await page.goto("/leads"); await page.getByText("Filtres avancés", { exact: true }).click(); await page.getByLabel("Provenance", { exact: true }).selectOption("website"); await page.getByRole("button", { name: "Appliquer", exact: true }).click(); await expect(page.getByText("2 demande(s) accessible(s).", { exact: true })).toBeVisible(); await geometry(page); await capture(page, "received-desktop");
    await mobile.setViewportSize({ width: 390, height: 844 }); await staffLogin(mobile, data.agent, baseURL!); await mobile.goto("/leads"); await mobile.getByText("Filtres avancés", { exact: true }).tap(); await mobile.getByLabel("Provenance", { exact: true }).selectOption("website"); await mobile.getByRole("button", { name: "Appliquer", exact: true }).tap(); await expect(mobile.getByText("2 demande(s) accessible(s).", { exact: true })).toBeVisible(); measurements.push(await geometry(mobile)); await capture(mobile, "received-mobile");
    const rows = (await (await page.request.get("/api/v1/enquiries?source=website")).json()).items;
    await page.goto(`/leads/${rows[0].id}`); await expect(page.getByText("SP20 nouvelle demande web synthétique", { exact: true })).toBeVisible(); await capture(page, "lead-desktop");
    await page.goto(`/contacts/${rows[0].contact.id}`); await page.getByRole("tab", { name: "Historique", exact: true }).click(); await expect(page.getByText("Auteur : Source web : Simulateur local", { exact: true }).first()).toBeVisible(); await capture(page, "history-desktop");
    await staffLogin(mobile, data.other, baseURL!); injecting = true; await mobile.goto(`/leads/${rows[0].id}`); await expect(mobile.getByRole("alert").filter({ hasText: /introuvable|accessible/ })).toBeVisible(); await capture(mobile, "denied-mobile"); injecting = false;
    profile = await mkdtemp(path.resolve("test-results/sp20-zoom-")); const launch = { ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await zoom.goto(simulatorOrigin); await expect(zoom.getByRole("heading", { name: "Formulaire web local", exact: true })).toBeVisible(); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(simulatorOrigin); await expect(zoom.getByRole("heading", { name: "Formulaire web local", exact: true })).toBeVisible(); const zoomed = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); expect(zoomed.ratio / baseline.ratio).toBeCloseTo(2, 1); measurements.push(await geometry(zoom)); await capture(zoom, "zoom-200", undefined, baseline.ratio);
    expect(errors).toEqual([]); console.info("SP20 native observations", JSON.stringify({ browserVersion: browser.version(), baseline, zoomed, measurements, unexpectedErrors: errors }));
  } finally { await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp20-zoom-/); await rm(profile, { recursive: true, force: true }); } await mobileContext.close(); await clearActorContext(page); await clearIntake(); }
});
