import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { comparePoints, openReports, reportFixture } from "../helpers/reports";
import { capture, geometry } from "../helpers/report-review";

test("SP17 visible Chrome: Bklit keyboard/touch, scopes, states, widths and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000); const actors: TestActor[] = [], errors: string[] = [], expectedErrors: string[] = [];
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await mobileContext.newPage(); let expectedReportFailure = false, profile: string | undefined, zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  function monitor(target: typeof page) {
    target.on("pageerror", () => errors.push("PAGE_ERROR"));
    target.on("console", message => {
      if (message.type() !== "error") return;
      const endpoint = new URL(message.location().url || "https://localhost").pathname;
      const code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED";
      if (expectedReportFailure && endpoint === "/api/v1/reports/dashboard" && /status of 403|net::ERR_CONNECTION_FAILED/.test(code)) expectedErrors.push(code); else errors.push(code);
    });
  }
  try {
    await mkdir("output/playwright", { recursive: true }); await mkdir("../.impeccable/review", { recursive: true });
    const data = await reportFixture(page, actors); monitor(page); await openReports(page); await comparePoints(page);
    const defaultStart = await page.getByLabel("Du (inclus)", { exact: true }).inputValue(), defaultEnd = await page.getByLabel("Au (inclus)", { exact: true }).inputValue();
    expect(defaultStart).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(defaultEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const desktopGeometry = await geometry(page);
    const summaryButtons = page.getByRole("button", { name: /^Dossiers : / });
    for (let i = 0; i < await summaryButtons.count(); i++) {
      const button = summaryButtons.nth(i), label = (await button.getAttribute("aria-label"))!.replace("Dossiers : ", "");
      await button.click(); const records = page.getByRole("region", { name: "Dossiers de l’indicateur", exact: true });
      await expect(records.getByText("Chargement des dossiers…", { exact: true })).toHaveCount(0); await expect(records).toContainText(label);
      await records.getByRole("button", { name: "Fermer les dossiers", exact: true }).click();
    }
    await page.getByLabel("Type d’alerte", { exact: true }).selectOption("inactive_deals"); await expect(page.getByText("Chargement des alertes…", { exact: true })).toHaveCount(0);
    await page.getByLabel("Type d’alerte", { exact: true }).selectOption("stale_inventory"); await expect(page.getByText("Chargement des alertes…", { exact: true })).toHaveCount(0); await capture(page, "reports-desktop", true);
    const portfolio = page.getByRole("region", { name: "Contacts actifs par responsable actuel", exact: true });
    const first = portfolio.getByRole("table").getByRole("button").first(); await first.focus(); await expect(page.getByRole("tooltip")).toBeVisible(); await capture(page, "tooltip-desktop");
    await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0); await page.keyboard.press("Enter");
    const drill = page.getByRole("region", { name: "Dossiers de l’indicateur", exact: true }); await expect(drill.getByRole("link")).toBeVisible(); await drill.scrollIntoViewIfNeeded(); await capture(page, "drill-desktop"); await drill.getByRole("button", { name: "Fermer les dossiers", exact: true }).click(); await expect(first).toBeFocused();
    await signIn(mobile, data.manager); monitor(mobile); await openReports(mobile); await capture(mobile, "reports-mobile", true);
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      await mobile.setViewportSize({ width, height: 900 });
      await mobile.waitForFunction(() => [...document.querySelectorAll("main svg")].every(svg => svg.getBoundingClientRect().width <= (svg.parentElement?.getBoundingClientRect().width ?? 0) + 1));
      await geometry(mobile);
    }
    await mobile.setViewportSize({ width: 320, height: 844 }); await capture(mobile, "narrow-320", true); await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.getByRole("region", { name: "Affaires gagnées non rouvertes", exact: true }).getByRole("table").getByRole("button").tap(); await expect(mobile.getByRole("region", { name: "Dossiers de l’indicateur", exact: true }).getByRole("link")).toBeVisible(); await mobile.getByRole("button", { name: "Fermer les dossiers", exact: true }).tap();
    let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/v1/reports/dashboard?**", async route => { await held; await route.continue(); }); await page.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).click(); await expect(page.getByText("Chargement des indicateurs…", { exact: true })).toBeVisible(); await expect(page.getByLabel("Du (inclus)", { exact: true })).toHaveValue(defaultStart); await expect(page.getByLabel("Au (inclus)", { exact: true })).toHaveValue(defaultEnd); await capture(page, "loading-desktop", true); release(); await expect(page.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toBeVisible(); await page.unroute("**/api/v1/reports/dashboard?**");
    expectedReportFailure = true; await mobile.route("**/api/v1/reports/dashboard?**", route => route.abort("connectionfailed")); await mobile.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).tap(); const error = mobile.getByRole("alert").filter({ hasText: "service local est indisponible" }); await expect(error).toBeVisible(); await expect(mobile.getByLabel("Du (inclus)", { exact: true })).toHaveValue(defaultStart); await expect(mobile.getByLabel("Au (inclus)", { exact: true })).toHaveValue(defaultEnd); await error.scrollIntoViewIfNeeded(); await capture(mobile, "error-mobile"); await mobile.unroute("**/api/v1/reports/dashboard?**");
    await mobile.route("**/api/v1/reports/dashboard?**", route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN" } }) })); await mobile.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).tap(); const denied = mobile.getByRole("alert").filter({ hasText: "Cette opération n’est pas autorisée" }); await expect(denied).toBeVisible(); await expect(mobile.getByLabel("Du (inclus)", { exact: true })).toHaveValue(defaultStart); await expect(mobile.getByLabel("Au (inclus)", { exact: true })).toHaveValue(defaultEnd); await denied.scrollIntoViewIfNeeded(); await capture(mobile, "denied-mobile"); await mobile.unroute("**/api/v1/reports/dashboard?**"); expectedReportFailure = false;
    await mobile.getByRole("button", { name: "Réessayer", exact: true }).tap(); await expect(mobile.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toBeVisible(); await expect(mobile.getByLabel("Du (inclus)", { exact: true })).toHaveValue(defaultStart); await expect(mobile.getByLabel("Au (inclus)", { exact: true })).toHaveValue(defaultEnd);
    await clearActorContext(mobile); await signIn(mobile, data.agent); await openReports(mobile); await comparePoints(mobile); await capture(mobile, "agent-mobile", true);
    await page.getByLabel("Du (inclus)", { exact: true }).fill("2020-01-01"); await page.getByLabel("Au (inclus)", { exact: true }).fill("2020-01-31"); await page.getByRole("button", { name: "Appliquer la période", exact: true }).click(); await expect(page.getByRole("region", { name: "Affaires gagnées non rouvertes", exact: true }).getByText(/Le total est 0/)).toBeVisible(); await capture(page, "empty-period-desktop", true);
    profile = await mkdtemp(path.resolve("test-results/sp17-zoom-"));
    const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await signIn(zoom, data.manager); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await openReports(zoom);
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * .6); const zoomGeometry = await geometry(zoom); await zoom.getByRole("region", { name: "Affaires gagnées non rouvertes", exact: true }).scrollIntoViewIfNeeded(); await capture(zoom, "zoom-200");
    console.info("SP17 native observations", JSON.stringify({ browserVersion: browser.version(), desktopGeometry, zoomGeometry, baseline, measurement, expectedErrors, unexpectedErrors: errors })); expect(errors).toEqual([]);
  } finally {
    await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp17-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await mobileContext.close(); await clearActorContext(page); for (const actor of actors) await removeActor(actor);
  }
});
