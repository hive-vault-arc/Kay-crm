import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, signedInTest as test, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

test("Dashboard header: welcome, utility actions and direct audit remain available", async ({ page, browser, actor, baseURL }) => {
  const failures: string[] = [];
  let healthRequests = 0;
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  page.on("console", message => {
    if (message.type() === "error") failures.push("CONSOLE_ERROR");
  });
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/v1/health/ready") healthRequests++; });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Répartition des affaires", exact: true })).toBeVisible();
  const header = page.getByRole("banner");
  const heading = page.getByRole("heading", { name: "Tableau de bord", exact: true, level: 1 });
  const welcome = page.getByRole("heading", { name: /^Bonjour / });
  await expect(heading).toBeVisible();
  await expect(welcome).toBeVisible();
  await expect(page.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Vérifier à nouveau", exact: true })).toHaveCount(0);
  await mkdir("output/playwright/dashboard-header", { recursive: true });
  for (const width of [1440, 1024, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(welcome).toBeVisible();
    await expect(header.getByRole("button", { name: "Ouvrir les notifications" })).toBeVisible();
    await expect(header.getByRole("button", { name: /^Compte de / })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouveau prospect", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1440, 768, 360].includes(width))
      await page.screenshot({ path: `output/playwright/dashboard-header/dashboard-${width}.png` });
  }
  await page.setViewportSize({ width: 1448, height: 1086 });
  await page.screenshot({ path: "output/playwright/dashboard-header/dashboard-reference-1448x1086.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  const notifications = header.getByRole("button", { name: "Ouvrir les notifications" });
  await notifications.click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(notifications).toBeFocused();
  const account = header.getByRole("button", { name: /^Compte de / });
  await account.click();
  await expect(page.getByRole("dialog", { name: "Compte utilisateur" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Compte utilisateur" }).getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  expect(healthRequests).toBe(0);
  await page.getByRole("link", { name: "Journal d’audit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Journal d’audit", exact: true })).toBeVisible();
  await expect(page.locator('main img[src*="dashboard-city"]')).toHaveCount(0);
  expect((await page.request.get("/api/v1/audit/events")).status()).toBe(200);
  const back = page.getByRole("main").getByRole("link", { name: "Tableau de bord", exact: true });
  await back.focus(); await expect(back).toBeFocused(); await page.keyboard.press("Enter");
  await expect(heading).toBeVisible();
  const touch = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true, locale: "fr-FR" });
  try {
    const mobile = await touch.newPage(); await signIn(mobile, actor);
    await expect(mobile.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    await expect(mobile.getByRole("link", { name: "Journal d’audit", exact: true })).toBeVisible();
    await expect(mobile.getByRole("button", { name: "Vérifier à nouveau", exact: true })).toHaveCount(0);
    await mobile.getByRole("link", { name: "Journal d’audit", exact: true }).tap();
    await expect(mobile.getByRole("heading", { name: "Journal d’audit", exact: true })).toBeVisible();
    await mobile.getByRole("main").getByRole("link", { name: "Tableau de bord", exact: true }).tap();
    await expect(mobile.getByRole("heading", { name: "Tableau de bord", exact: true })).toBeVisible();
  } finally { await touch.close(); }
  expect(failures).toEqual([]);
});

test("Dashboard header: agent keeps the scoped title and no audit action", async ({ page }) => {
  const agent = await createActor("agent");
  try {
    await clearActorContext(page); await signIn(page, agent);
    await expect(page.getByRole("heading", { name: /^Bonjour / })).toBeVisible();
    await expect(page.getByText(/^Dossiers attribués ou partagés/)).toBeAttached();
    await expect(page.getByRole("status").filter({ hasText: /Chargement du pipeline/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Journal d’audit", exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    const header = page.getByRole("banner");
    await expect(header.getByRole("button", { name: "Ouvrir les notifications" })).toBeVisible();
    await expect(header.getByRole("button", { name: /^Compte de / })).toBeVisible();
    expect(await header.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe("0px");
    await page.goto("/dashboard?view=audit");
    await expect(page.locator("main").getByRole("alert")).toContainText("Accès non autorisé");
    expect((await page.request.get("/api/v1/audit/events")).status()).toBe(403);
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("Dashboard header: workspace heading and account actions remain usable at actual 200% Chrome zoom", async ({ actor, baseURL }, testInfo) => {
  const profile = path.join(testInfo.project.outputDir, "dashboard-zoom", "dashboard-zoom-profile");
  const options = { channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, ignoreHTTPSErrors: true, args: ["--window-size=1440,1000"] };
  let context!: Awaited<ReturnType<typeof chromium.launchPersistentContext>>;
  try {
  context = await chromium.launchPersistentContext(profile, options);
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
    const page = context.pages()[0], failures: string[] = [];
    page.on("pageerror", () => failures.push("PAGE_ERROR"));
    page.on("console", message => { if (message.type() === "error") failures.push("CONSOLE_ERROR"); });
    await page.goto(`${baseURL}/dashboard`);
    await expect(page.getByRole("heading", { name: "Répartition des affaires", exact: true })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /Chargement du pipeline/ })).toHaveCount(0);
    const measurement = await page.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1);
    expect(measurement.width).toBeLessThan(baseline.width * 0.6);
    expect(measurement.overflow).toBe(false);
    const header = page.getByRole("banner");
    await expect(page.getByRole("heading", { name: /^Bonjour / })).toBeVisible();
    await expect(header.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Ouvrir les notifications" })).toBeVisible();
    await page.getByRole("button", { name: "Ouvrir la navigation" }).click();
    const navigation = page.getByRole("dialog", { name: "Navigation KAY" });
    await expect(navigation.getByRole("link", { name: "Tableau de bord", exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Escape");
    const account = header.getByRole("button", { name: /^Compte de / });
    await account.click();
    await expect(page.getByRole("dialog", { name: "Compte utilisateur", exact: true }).getByRole("button", { name: "Se déconnecter", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
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
  } finally {
    await context?.close();
    expect(path.basename(profile)).toBe("dashboard-zoom-profile");
    expect(path.dirname(path.dirname(path.resolve(profile)))).toBe(path.resolve(testInfo.project.outputDir));
    await rm(profile, { recursive: true, force: true });
  }
});
