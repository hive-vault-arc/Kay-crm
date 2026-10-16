import { chromium } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { simulatorOrigin } from "../helpers/intake";
import { geometry } from "../helpers/report-review";

test("SP20 settled full-page zoom evidence repair", async ({ page }) => {
  test.setTimeout(60000);
  let profile: string | undefined, context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  try {
    await testControl("simulator-start");
    await expect.poll(async () => { try { return (await page.request.get(simulatorOrigin)).status(); } catch { return 0; } }).toBe(200);
    await mkdir("output/playwright", { recursive: true }); profile = await mkdtemp(path.resolve("test-results/sp20-zoom-repair-"));
    const launch = { channel: "chrome", headless: false, ignoreHTTPSErrors: true, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    context = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = context.pages()[0]; await zoom.goto(simulatorOrigin); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await context.close(); context = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    context = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = context.pages()[0]; await zoom.goto(simulatorOrigin); await expect(zoom.getByRole("button", { name: "Envoyer la demande", exact: true })).toBeEnabled();
    const actual = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, height: document.documentElement.scrollHeight })); expect(actual.ratio / baseline.ratio).toBeCloseTo(2, 1); await geometry(zoom); await zoom.evaluate(() => scrollTo(0, 0));
    const cdp = await context.newCDPSession(zoom);
    try { const metrics = await cdp.send("Page.getLayoutMetrics"); console.info("SP20 zoom capture coordinates", JSON.stringify({ baseline, actual, layout: metrics.layoutViewport, cssLayout: metrics.cssLayoutViewport, content: metrics.contentSize, cssContent: metrics.cssContentSize })); const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true, clip: { x: 0, y: 0, width: metrics.layoutViewport.clientWidth / baseline.ratio, height: metrics.contentSize.height / baseline.ratio, scale: 1 } }); await writeFile("output/playwright/sp20-zoom-200.png", Buffer.from(shot.data, "base64")); } finally { await cdp.detach(); }
  } finally { await context?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp20-zoom-repair-/); await rm(profile, { recursive: true, force: true }); } await testControl("simulator-stop"); }
});
