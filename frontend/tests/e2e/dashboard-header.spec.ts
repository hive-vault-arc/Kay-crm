import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, signedInTest as test, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

test("Dashboard header: city strip has neither removed control and direct audit remains available", async ({ page, browser, actor, baseURL }) => {
  const failures: string[] = [];
  let healthRequests = 0;
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  page.on("console", message => {
    if (message.type() === "error") failures.push("CONSOLE_ERROR");
  });
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/health/ready") healthRequests++; });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pipeline des affaires", exact: true })).toBeVisible();
  const header = page.locator("main header").filter({ has: page.getByRole("heading", { name: "Tableau de bord", exact: true }) });
  await expect(header.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
  await expect(header.getByRole("button", { name: "Vérifier à nouveau", exact: true })).toHaveCount(0);
  await expect(header.getByRole("link", { name: "Journal d’audit", exact: true })).toHaveCount(0);
  await expect(header.locator("button, a")).toHaveCount(0);
  await expect(header.locator(":scope > div")).toHaveCount(2);
  await expect(header.getByText(/Service local|Vérification du service local/)).toHaveCount(0);
  await mkdir("output/playwright/dashboard-header", { recursive: true });
  for (const width of [1440, 1024, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await header.evaluate(element => {
      const style = getComputedStyle(element), box = element.getBoundingClientRect();
      const image = element.querySelector("img")!, photo = image.getBoundingClientRect();
      return {
        border: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
        radius: style.borderRadius, height: box.height,
        loaded: image.complete && image.naturalWidth > 0, decorative: image.alt,
        coverage: photo.top <= box.top && photo.bottom >= box.bottom && photo.left <= box.left && photo.right >= box.right,
        zoom: getComputedStyle(image).scale,
      };
    });
    expect(geometry.border).toEqual(["0px", "0px", "0px", "0px"]);
    expect(geometry.radius).toBe("0px");
    expect(geometry.height).toBeGreaterThanOrEqual(width >= 768 ? 128 : 112);
    expect(geometry.loaded).toBe(true); expect(geometry.decorative).toBe("");
    expect(geometry.coverage).toBe(true); expect(geometry.zoom).toBe("1.05");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1440, 768, 360].includes(width))
      await page.screenshot({ path: `output/playwright/dashboard-header/dashboard-${width}.png` });
  }
  expect(healthRequests).toBe(0);
  await page.goto("/dashboard?view=audit");
  await expect(page.getByRole("heading", { name: "Journal d’audit", exact: true })).toBeVisible();
  await expect(page.locator('main img[src*="dashboard-city"]')).toHaveCount(0);
  expect((await page.request.get("/api/v1/audit/events")).status()).toBe(200);
  const back = page.getByRole("link", { name: "Retour au tableau de bord", exact: true });
  await back.focus(); await expect(back).toBeFocused(); await page.keyboard.press("Enter");
  await expect(header).toBeVisible();
  const touch = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true, locale: "fr-FR" });
  try {
    const mobile = await touch.newPage(); await signIn(mobile, actor);
    await expect(mobile.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    await expect(mobile.getByRole("link", { name: "Journal d’audit", exact: true })).toHaveCount(0);
    await expect(mobile.getByRole("button", { name: "Vérifier à nouveau", exact: true })).toHaveCount(0);
    await mobile.goto("/dashboard?view=audit");
    await expect(mobile.getByRole("heading", { name: "Journal d’audit", exact: true })).toBeVisible();
    await mobile.getByRole("link", { name: "Retour au tableau de bord", exact: true }).tap();
    await expect(mobile.getByRole("heading", { name: "Tableau de bord", exact: true })).toBeVisible();
  } finally { await touch.close(); }
  expect(failures).toEqual([]);
});

test("Dashboard header: agent keeps the scoped title and no audit action", async ({ page }) => {
  const agent = await createActor("agent");
  try {
    await clearActorContext(page); await signIn(page, agent);
    await expect(page.getByText("Le travail affiché concerne uniquement vos dossiers attribués ou partagés.", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Journal d’audit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    const header = page.locator("main header").filter({ has: page.getByRole("heading", { name: "Tableau de bord", exact: true }) });
    await expect(header.locator("button, a")).toHaveCount(0);
    expect(await header.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.goto("/dashboard?view=audit");
    await expect(page.locator("main").getByRole("alert")).toContainText("Accès non autorisé");
    expect((await page.request.get("/api/v1/audit/events")).status()).toBe(403);
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("Dashboard header: actual 200% Chrome zoom retains the city without removed controls", async ({ actor, baseURL }, testInfo) => {
  const profile = testInfo.outputPath("dashboard-zoom-profile");
  const options = { channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, ignoreHTTPSErrors: true, args: ["--window-size=1440,1000"] };
  let context = await chromium.launchPersistentContext(profile, options);
  let baseline: { ratio: number; width: number };
  try {
    const page = context.pages()[0];
    await page.goto(`${baseURL}/dashboard`); await signIn(page, actor);
    baseline = await page.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
  } finally { await context.close(); }
  const preferencesPath = path.join(profile, "Default", "Preferences");
  const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
  preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
  await writeFile(preferencesPath, JSON.stringify(preferences));
  context = await chromium.launchPersistentContext(profile, options);
  try {
    const page = context.pages()[0], failures: string[] = [];
    page.on("pageerror", () => failures.push("PAGE_ERROR"));
    page.on("console", message => { if (message.type() === "error") failures.push("CONSOLE_ERROR"); });
    await page.goto(`${baseURL}/dashboard`);
    await expect(page.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
    const measurement = await page.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1);
    expect(measurement.width).toBeLessThan(baseline.width * 0.6);
    expect(measurement.overflow).toBe(false);
    const header = page.locator("main header").filter({ has: page.getByRole("heading", { name: "Tableau de bord", exact: true }) });
    const photo = header.locator("img");
    await expect(photo).toBeVisible();
    await expect(header).toHaveCSS("border-top-width", "0px");
    await expect(header.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    await expect(header.locator("button, a")).toHaveCount(0);
    await mkdir("output/playwright/dashboard-header", { recursive: true });
    await page.bringToFront();
    const session = await context.newCDPSession(page);
    const capture = await session.send("Page.captureScreenshot", { format: "png", fromSurface: false });
    await writeFile("output/playwright/dashboard-header/dashboard-zoom-200.png", Buffer.from(capture.data, "base64"));
    await session.detach();
    const search = page.getByRole("button", { name: "Rechercher", exact: true });
    await search.focus(); await expect(search).toBeFocused(); await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Recherche globale" })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(search).toBeFocused();
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});
