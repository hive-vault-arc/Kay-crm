import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { test, expect, createActor, removeActor, signIn, clearActorContext, changeActor } from "../helpers/auth";
import { geometry } from "../helpers/report-review";

test("help: agents search guides, read steps and cannot open privileged articles", async ({ page }) => {
  test.setTimeout(150_000);
  const actor = await createActor("agent");
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  try {
    await page.goto("/help/creer-prospect");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    expect(new URL(page.url()).searchParams.get("return_to")).toBe("/help/creer-prospect");
    await signIn(page, actor);
    await page.setViewportSize({ width: 1440, height: 960 });
    const aid = page.locator("aside[data-sidebar]").getByRole("link", { name: "Aide", exact: true });
    await aid.focus(); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Aide KAY", exact: true })).toBeVisible();
    await expect(aid).toHaveAttribute("aria-current", "page");
    const placement = await page.locator("aside[data-sidebar] [data-sidebar-footer]").evaluate(el => ({ aid: el.querySelector("a")!.getBoundingClientRect().bottom, user: el.querySelector(":scope > div")!.getBoundingClientRect().top }));
    expect(placement.aid).toBeLessThanOrEqual(placement.user);
    await expect(page.getByRole("link", { name: /Créer un compte et gérer/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Gestion de l’équipe", exact: true })).toHaveCount(0);
    await page.getByLabel("Que souhaitez-vous faire ?", { exact: true }).fill("PROPRIETAIRE");
    await expect(page.locator("[data-live-dirty]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Gérer les propriétaires et leurs biens/ })).toBeVisible();
    await page.getByLabel("Que souhaitez-vous faire ?", { exact: true }).fill("xyz-no-result-987");
    await expect(page.getByRole("heading", { name: "Aucun guide ne correspond", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Voir tous les guides", exact: true }).click();
    await page.getByRole("navigation", { name: "Rubriques de l’aide" }).getByRole("button", { name: /^Biens et propriétaires/ }).click();
    await expect(page.getByRole("link", { name: /Ajouter un prospect/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Ajouter un bien indépendant/ })).toBeVisible();
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
    await geometry(page);
    await mkdir("output/playwright/help", { recursive: true });
    await page.screenshot({ path: "output/playwright/help/desktop-index.png", fullPage: true });
    const guides = await page.locator('main a[href^="/help/"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
    expect(guides.length).toBeGreaterThanOrEqual(25);
    for (const href of guides) expect((await page.request.get(href)).status(), href).toBe(200);
    await page.getByRole("link", { name: /^Ajouter un prospect/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Ajouter un prospect", exact: true })).toBeVisible();
    await expect(page.getByRole("article")).toContainText("Nouveau prospect");
    await expect(page.getByRole("article")).toContainText("indicatif");
    await expect(page.getByRole("link", { name: "Ajouter un prospect", exact: true })).toHaveAttribute("href", "/leads/new");
    await page.getByRole("navigation", { name: "Sommaire du guide" }).getByRole("link", { name: "Si le contact existe déjà", exact: true }).click();
    await expect(page.locator("#section-2")).toBeFocused();
    await geometry(page);
    await page.screenshot({ path: "output/playwright/help/desktop-guide.png", fullPage: true });
    await page.getByRole("link", { name: "Tous les guides", exact: true }).click();
    for (const href of ["/help/comptes-utilisateurs", "/help/not-a-guide"]) {
      await page.goto(href);
      await expect(page.getByRole("heading", { name: "Page introuvable", exact: true })).toBeVisible();
      await expect(page.getByRole("article")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Gérer les utilisateurs", exact: true })).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    }
    expect(errors).toEqual([]);
  } finally { await removeActor(actor); }
});

test("help: managers see their guides and revoked sessions lose access", async ({ page }) => {
  const actor = await createActor("manager");
  try {
    await signIn(page, actor);
    await page.goto("/help");
    await expect(page.getByRole("link", { name: /^Importer et exporter des contacts/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Créer un compte et gérer/ })).toHaveCount(0);
    await page.getByRole("link", { name: /^Importer et exporter des contacts/ }).click();
    await expect(page.getByRole("article")).toContainText("Mes exports");
    await changeActor(actor, "revoke");
    await page.goto("/help/imports-exports");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    await expect(page.getByRole("article")).toHaveCount(0);
  } finally { await removeActor(actor); }
});

test("help: guides remain usable at native 200 percent browser zoom", async ({ page, baseURL }, info) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent");
  const profile = info.outputPath("help-zoom-profile");
  const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
  let zoom: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  try {
    await signIn(page, actor);
    zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let current = zoom.pages()[0];
    await signIn(current, actor);
    const baseline = await current.evaluate(() => devicePixelRatio);
    await zoom.close();
    const preferencesPath = path.join(profile, "Default", "Preferences");
    const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
    preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(preferencesPath, JSON.stringify(preferences));
    zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    current = zoom.pages()[0];
    await current.goto("/help/ajouter-bien");
    await expect(current.getByRole("article")).toBeVisible();
    expect(await current.evaluate(() => devicePixelRatio) / baseline).toBeCloseTo(2, 1);
    await geometry(current);
    await current.getByRole("link", { name: "Tous les guides", exact: true }).focus();
    await current.keyboard.press("Enter");
    await expect(current.getByLabel("Que souhaitez-vous faire ?", { exact: true })).toBeVisible();
    await geometry(current);
    await mkdir("output/playwright/help", { recursive: true });
    const cdp = await zoom.newCDPSession(current);
    try {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile("output/playwright/help/native-zoom-200.png", Buffer.from(shot.data, "base64"));
    } finally { await cdp.detach(); }
  } finally {
    await zoom?.close();
    expect(path.resolve(profile).startsWith(path.resolve("test-results") + path.sep)).toBe(true);
    expect(path.basename(profile)).toBe("help-zoom-profile");
    await rm(profile, { recursive: true, force: true });
    await removeActor(actor);
  }
});

test("help: the footer stays reachable in expanded, collapsed and short-height navigation", async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("administrator", false, "SP06 Administrateur synthétique de l’aide");
  try {
    await signIn(page, actor);
    await page.goto("/help");
    await expect(page.getByRole("link", { name: /Créer un compte et gérer/ })).toBeVisible();
    for (const height of [960, 832, 800, 768, 720, 680, 600]) {
      await page.setViewportSize({ width: 1440, height });
      const sidebar = page.locator("aside[data-sidebar]");
      if (await sidebar.isVisible()) {
        const fit = await sidebar.locator(".sidebar-scroll").evaluate(el => ({ height: el.clientHeight, content: el.scrollHeight, logout: el.querySelector('[data-action="logout"]')?.getBoundingClientRect().bottom ?? el.querySelector("section button")!.getBoundingClientRect().bottom, bottom: el.getBoundingClientRect().bottom }));
        expect(fit.content, `sidebar at ${height}px`).toBeLessThanOrEqual(fit.height + 1);
        expect(fit.logout).toBeLessThanOrEqual(fit.bottom);
        await expect(sidebar.getByRole("link", { name: "Aide", exact: true })).toBeInViewport();
        await expect(sidebar.getByRole("button", { name: "Se déconnecter", exact: true })).toBeInViewport();
      } else {
        await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
        const sheet = page.getByRole("dialog", { name: "Navigation KAY", exact: true });
        await sheet.getByRole("link", { name: "Aide", exact: true }).click();
        await expect(sheet).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1, name: "Aide KAY", exact: true })).toBeFocused();
      }
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.getByRole("button", { name: "Réduire la navigation", exact: true }).click();
    const compact = page.locator("aside[data-sidebar]").getByRole("link", { name: "Aide", exact: true });
    await expect(compact).toHaveAttribute("title", "Aide");
    await compact.focus(); await page.keyboard.press("Enter");
    await expect(compact).toHaveAttribute("aria-current", "page");
    await page.getByRole("link", { name: /Créer un compte et gérer/ }).click();
    await expect(page.getByRole("article")).toContainText("mot de passe initial");
    await expect(page.getByRole("link", { name: "Gérer les utilisateurs", exact: true })).toHaveAttribute("href", "/settings/users");
    await clearActorContext(page);
  } finally { await removeActor(actor); }
});

test("help: mobile touch, search and long articles work without page overflow", async ({ browser, baseURL }) => {
  const actor = await createActor("agent");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await signIn(page, actor);
    await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).tap();
    await page.getByRole("dialog", { name: "Navigation KAY", exact: true }).getByRole("link", { name: "Aide", exact: true }).tap();
    await expect(page.getByRole("heading", { level: 1, name: "Aide KAY", exact: true })).toBeFocused();
    await page.getByLabel("Rubrique", { exact: true }).selectOption("work");
    await page.getByLabel("Que souhaitez-vous faire ?", { exact: true }).fill("notifications 24");
    await page.getByRole("link", { name: /^Lire les notifications et les rappels/ }).tap();
    await expect(page.getByRole("article")).toContainText("Aucun e-mail, SMS");
    for (const width of [320, 360, 390, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await geometry(page);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await mkdir("output/playwright/help", { recursive: true });
    await page.screenshot({ path: "output/playwright/help/mobile-guide.png", fullPage: true });
    await page.getByRole("link", { name: "Tous les guides", exact: true }).tap();
    await expect(page.getByRole("heading", { level: 1, name: "Aide KAY", exact: true })).toBeVisible();
    await expect(page.getByLabel("Que souhaitez-vous faire ?", { exact: true })).toBeVisible();
    await geometry(page);
    await page.screenshot({ path: "output/playwright/help/mobile-index.png" });
  } finally { await context.close(); await removeActor(actor); }
});
