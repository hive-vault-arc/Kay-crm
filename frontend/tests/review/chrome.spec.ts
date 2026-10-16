import { chromium } from "@playwright/test";
import { expect, signedInTest as test, test as publicTest, signIn, createActor, removeActor } from "../helpers/auth";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiProcess } from "../helpers/api-process";

test("AT-23: visible Chrome, touch, screenshots and actual 200% browser zoom", async ({
  page,
  browser,
  baseURL, actor,
}, testInfo) => {
  const artifactRoot = path.resolve("output/playwright");
  await mkdir(artifactRoot, { recursive: true });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Connexion au service" })).toHaveCount(0);
  await page.screenshot({ path: path.join(artifactRoot, "sp03-desktop-ready.png"), fullPage: true });
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Projets", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projets");
  await expect(
    page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Projets", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.screenshot({
    path: path.join(artifactRoot, "sp03-desktop-projects.png"),
    fullPage: true,
  });

  const touch = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 800 },
    hasTouch: true,
    locale: "fr-FR",
  });
  const mobile = await touch.newPage();
  await mobile.goto(`${baseURL}/login`);
  await signIn(mobile, actor);
  mobile.on("pageerror", (error) => failures.push(error.message));
  await mobile.goto(`${baseURL}/dashboard`);
  const mobileReports = mobile.getByRole("region", { name: "Indicateurs CRM", exact: true });
  await expect(mobileReports.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
  await mobile.screenshot({ path: path.join(artifactRoot, "sp03-mobile-ready.png"), fullPage: true });
  try {
    await apiProcess("stop");
    await mobileReports.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).tap();
    await expect(mobileReports.getByRole("alert")).toHaveText("Le service local est indisponible. Vérifiez son démarrage, puis réessayez.");
    await mobile.screenshot({ path: path.join(artifactRoot, "sp03-mobile-unavailable.png"), fullPage: true });
  } finally { await apiProcess("start"); }
  await expect.poll(async () => {
    const response = await page.request.get(`${baseURL}/api/v1/health/ready`);
    return response.status();
  }).toBe(200);
  await mobileReports.getByRole("button", { name: "Réessayer", exact: true }).tap();
  await expect(mobileReports.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
  await mobile.getByRole("button", { name: "Ouvrir la navigation" }).tap();
  await expect(
    mobile.getByRole("dialog", { name: "Navigation KAY" }),
  ).toBeVisible();
  await mobile.screenshot({
    path: path.join(artifactRoot, "sp03-mobile-sheet.png"),
    fullPage: true,
  });
  await mobile
    .getByRole("dialog")
    .getByRole("link", { name: "Calendrier des visites" })
    .tap();
  await expect(mobile.getByRole("heading", { level: 1 })).toHaveText(
    "Calendrier des visites",
  );
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mobile.screenshot({
    path: path.join(artifactRoot, "sp03-mobile-visits.png"),
    fullPage: true,
  });
  await mobile.goto(`${baseURL}/change-password`);
  await expect(mobile.getByRole("heading", { level: 1 })).toHaveText("Changer le mot de passe");
  await mobile.getByRole("button", { name: "Se déconnecter", exact: true }).tap();
  await expect.poll(() => mobile.url().includes("/login?signed_out=1")).toBe(true);
  await touch.close();

  // This is a generated disposable Chrome profile, never the user's browser profile.
  const profile = path.resolve("test-results/zoom-profile");
  let zoomContext = await chromium.launchPersistentContext(profile, {
    ignoreHTTPSErrors: true,
    channel: "chrome",
    headless: false,
    viewport: null,
    deviceScaleFactor: undefined,
    args: ["--window-size=1440,1000"],
  });
  let zoomPage = zoomContext.pages()[0];
  await zoomPage.goto(`${baseURL}/dashboard`);
  await signIn(zoomPage, actor);
  const baselineRatio = await zoomPage.evaluate(() => devicePixelRatio);
  const baselineWidth = await zoomPage.evaluate(() => innerWidth);
  await zoomContext.close();

  const preferencesPath = path.join(profile, "Default", "Preferences");
  const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
  preferences.partition = {
    ...preferences.partition,
    default_zoom_level: { x: Math.log(2) / Math.log(1.2) },
  };
  await writeFile(preferencesPath, JSON.stringify(preferences));
  zoomContext = await chromium.launchPersistentContext(profile, {
    ignoreHTTPSErrors: true,
    channel: "chrome",
    headless: false,
    viewport: null,
    deviceScaleFactor: undefined,
    args: ["--window-size=1440,1000"],
  });
  try {
    zoomPage = zoomContext.pages()[0];
    await zoomPage.goto(`${baseURL}/dashboard`);
    await expect(zoomPage.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
    await zoomPage.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).focus();
    await zoomPage.keyboard.press("Enter");
    await expect(zoomPage.getByRole("heading", { name: "Pipeline des prospects", exact: true })).toBeVisible();
    const measurement = await zoomPage.evaluate(() => ({
      ratio: devicePixelRatio,
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(measurement.ratio / baselineRatio).toBeCloseTo(2, 1);
    expect(measurement.width).toBeLessThan(baselineWidth * 0.6);
    expect(measurement.overflow).toBe(false);
    async function verifyFilterZoom(name: string, search: string, submit: string) {
      const trigger = zoomPage.getByRole("button", { name: "Afficher les filtres", exact: true });
      await trigger.click();
      const drawer = zoomPage.getByRole("dialog", { name, exact: true });
      await expect(drawer).toBeVisible();
      const query = drawer.getByLabel(search, { exact: true });
      await query.fill("SP06 contrôle synthétique du zoom");
      expect(await drawer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await drawer.getByRole("button", { name: submit, exact: true }).click();
      await expect(drawer).toHaveCount(0);
      await trigger.click();
      await expect(drawer.getByLabel(search, { exact: true })).toHaveValue("SP06 contrôle synthétique du zoom");
      await expect(zoomPage.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
      const session = await zoomContext.newCDPSession(zoomPage);
      await zoomPage.bringToFront();
      await zoomPage.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const capture = await session.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile(path.join(artifactRoot, `filter-rail-${name.replaceAll(" ", "-")}-zoom-200.png`), Buffer.from(capture.data, "base64"));
      await session.detach();
      await zoomPage.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await zoomPage
      .getByRole("button", { name: "Ouvrir la navigation" })
      .click();
    await expect(
      zoomPage.getByRole("dialog", { name: "Navigation KAY" }),
    ).toBeVisible();
    await zoomPage.keyboard.press("Escape");
    await expect(
      zoomPage.getByRole("button", { name: "Ouvrir la navigation" }),
    ).toBeFocused();
    await zoomPage.screenshot({
      path: path.join(artifactRoot, "sp03-zoom-200-dashboard.png"),
      scale: "css",
    });
    for (const [route, label, status] of [
      ["/leads", "Créer un Lead", "0 demande(s) accessible(s)."],
      ["/deals", "Créer une affaire", "0 affaire(s) accessible(s) dans ces filtres."],
    ] as const) {
      await zoomPage.goto(`${baseURL}${route}`);
      await expect(zoomPage.getByText(status, { exact: true })).toBeVisible();
      const create = zoomPage.getByRole("link", { name: label, exact: true });
      await expect(create).toHaveCSS("background-color", "rgb(201, 167, 92)");
      expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await zoomPage.screenshot({ path: path.join(artifactRoot, `list-header-${route.slice(1)}-zoom-200.png`), scale: "device" });
      await verifyFilterZoom(route === "/leads" ? "Filtres des Leads" : "Filtres des affaires", route === "/leads" ? "Rechercher un nom, téléphone ou e-mail" : "Rechercher une affaire, un contact ou une action", "Appliquer");
      await create.focus();
      await zoomPage.keyboard.press("Enter");
      await expect(zoomPage).toHaveURL(new RegExp(`${route}/new$`));
      await expect(zoomPage.getByRole("heading", { level: 1, name: label, exact: true })).toBeVisible();
    }
    await zoomPage.goto(`${baseURL}/projects`);
    await verifyFilterZoom("Filtres des biens", "Référence, nom ou localisation", "Appliquer les filtres");
    await zoomPage.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
    await verifyFilterZoom("Filtres des programmes", "Rechercher un programme", "Filtrer les programmes");
    await zoomPage.goto(`${baseURL}/leads?view=contacts`);
    await verifyFilterZoom("Filtres des contacts", "Rechercher un nom, téléphone ou e-mail", "Rechercher");
    await zoomPage.goto(`${baseURL}/settings/users/new`);
    await expect(zoomPage.getByRole("button", { name: "Créer le compte", exact: true })).toBeEnabled();
    await zoomPage.getByRole("button", { name: "Créer le compte", exact: true }).click();
    await expect(zoomPage.getByText("Saisissez le nom complet.", { exact: true })).toBeVisible();
    await expect(zoomPage.getByLabel("Nom complet", { exact: true })).toBeFocused();
    expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await zoomPage.screenshot({ path: path.join(artifactRoot, "sp04-zoom-200-form.png"), scale: "css" });
    await zoomPage.goto(`${baseURL}/leads/new`);
    await expect(zoomPage.getByRole("button", { name: "Créer le Lead", exact: true })).toBeEnabled();
    await zoomPage.getByRole("button", { name: "Créer le Lead", exact: true }).click();
    await expect(zoomPage.getByText("Saisissez le nom du contact.", { exact: true })).toBeVisible();
    await expect(zoomPage.getByLabel("Nom du contact", { exact: true })).toBeFocused();
    expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await zoomPage.screenshot({ path: path.join(artifactRoot, "sp05-zoom-200-form.png"), scale: "css" });
    const cdp = await zoomContext.newCDPSession(zoomPage);
    const viewport = await zoomPage.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    await zoomPage.bringToFront();
    await zoomPage.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const capture = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
    const pixels = Buffer.from(capture.data, "base64");
    await writeFile(path.join(artifactRoot, "sp05-zoom-200-viewport.png"), pixels);
    console.info("Zoom viewport capture:", JSON.stringify({ ...viewport, pixelWidth: pixels.readUInt32BE(16), pixelHeight: pixels.readUInt32BE(20) }));
    await cdp.detach();
    const navigationTrigger = zoomPage.getByRole("button", { name: "Ouvrir la navigation", exact: true });
    if (await navigationTrigger.isVisible()) await navigationTrigger.click();
    await zoomPage.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    await expect.poll(() => zoomPage.url().includes("/login?signed_out=1")).toBe(true);
    await expect(zoomPage.getByLabel("Adresse e-mail", { exact: true })).toBeVisible();
    expect(await zoomPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await zoomPage.screenshot({ path: path.join(artifactRoot, "sp03-zoom-200-login.png"), scale: "css" });
    console.info(
      "Actual browser zoom:",
      JSON.stringify({ baselineRatio, baselineWidth, ...measurement }),
    );
    await testInfo.attach("browser-zoom-measurement", {
      body: JSON.stringify({ baselineRatio, baselineWidth, ...measurement }),
      contentType: "application/json",
    });
  } finally {
    await zoomContext.close();
  }
  expect(failures).toEqual([]);
});

publicTest("SP-03: visible login, empty-field captures, invalid feedback and mobile geometry", async ({ page, actor }) => {
  const artifactRoot = path.resolve("output/playwright");
  await mkdir(artifactRoot, { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
  await page.screenshot({ path: path.join(artifactRoot, "sp03-login-desktop.png"), fullPage: true });
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ["Adresse e-mail", "Mot de passe"]) {
      const box = await page.getByLabel(label, { exact: true }).boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
    }
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByLabel("Adresse e-mail", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Mot de passe", { exact: true })).toBeFocused();
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(actor.email);
  try { await page.getByLabel("Mot de passe", { exact: true }).fill(randomBytes(24).toString("base64url")); }
  catch { throw new Error("SYNTHETIC_INPUT_FAILED"); }
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByText("Adresse e-mail ou mot de passe incorrect.", { exact: true })).toBeVisible();
  expect(await page.getByLabel("Mot de passe", { exact: true }).inputValue() === "").toBe(true);
  await page.screenshot({ path: path.join(artifactRoot, "sp03-login-mobile-invalid.png"), fullPage: true });
  await signIn(page, actor);
  await page.screenshot({ path: path.join(artifactRoot, "sp03-dashboard-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/change-password");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Changer le mot de passe");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tableau de bord");
  await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await expect.poll(() => page.url().includes("/login?signed_out=1")).toBe(true);
  await page.goto("/dashboard");
  await expect.poll(() => page.url().includes("/login?return_to=")).toBe(true);
  const restricted = await createActor("agent", true);
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page, restricted);
    expect(await page.locator('input[type="password"]').evaluateAll((fields) => fields.every((field) => (field as HTMLInputElement).value === ""))).toBe(true);
    await page.screenshot({ path: path.join(artifactRoot, "sp03-change-password-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(artifactRoot, "sp03-change-password-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    await expect.poll(() => page.url().includes("/login?signed_out=1")).toBe(true);
  } finally { await removeActor(restricted); }
  expect(errors).toEqual([]);
});
