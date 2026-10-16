import { mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { test, expect, signIn, clearActorContext, createActor, removeActor } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { clearIntake, simulatorOrigin } from "../helpers/intake";

const iconUrl = "/favicon.svg?v=kay-gold-20261016";
const captures = "output/playwright/brand";

test("KAY branding: supplied originals, real favicon assets and server-rendered login", async ({ page, browser, baseURL }) => {
  await mkdir(captures, { recursive: true });
  for (const [name, hash] of [
    ["flat", "a4476635e72072a437b7642feba9215452e37dd4a3ddb94e12f0b59dc38e5966"],
    ["textured", "259606cb181020ad9784a382c79a3d5bf263d3971930692f7db91e13fed5bdba"],
  ]) expect(createHash("sha256").update(await readFile(`../branding/kay-logo-reference-${name}.png`)).digest("hex")).toBe(hash);
  for (const [url, type] of [
    [iconUrl, "image/svg+xml"], ["/favicon.ico", "image/x-icon"],
    ["/images/kay-apple-icon.png", "image/png"],
    ["/images/kay-luxury-gold.png", "image/png"],
    ["/images/kay-champagne-gold.png", "image/png"],
  ]) {
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain(type);
    expect((await response.body()).length).toBeGreaterThan(100);
  }
  expect((await page.request.get("/images/kay-logo.png")).status()).toBe(404);
  const ico = await readFile("public/favicon.ico");
  expect(ico.readUInt16LE(2)).toBe(1);
  expect(ico.readUInt16LE(4)).toBe(3);
  expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
  const svg = await readFile("public/favicon.svg", "utf8");
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).not.toContain("placeholder");

  const noScript = await browser.newContext({ baseURL, javaScriptEnabled: false, ignoreHTTPSErrors: true });
  try {
    const serverPage = await noScript.newPage();
    await serverPage.goto("/login");
    await expect(serverPage.getByRole("img", { name: "KAY Real Estate", exact: true })).toHaveAttribute("src", /kay-champagne-gold/);
    await expect(serverPage.locator('link[rel="icon"]')).toHaveAttribute("href", iconUrl);
    await expect(serverPage.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /^\/_next\/static\/media\/kay-apple-icon\.[\w-]+\.png$/);
  } finally { await noScript.close(); }

  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.name));
  page.on("console", message => { if (message.type() === "error") errors.push("console-error"); });
  await page.goto("/login");
  expect(await page.evaluate(async url => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 48;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0, 48, 48);
    const pixels = context.getImageData(0, 0, 48, 48).data;
    return [...pixels].some((value, index) => index % 4 === 0 && value > 150 && pixels[index + 1] > 100);
  }, iconUrl)).toBe(true);
  const logo = page.getByRole("img", { name: "KAY Real Estate", exact: true });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await logo.evaluate(image => getComputedStyle(image.parentElement!).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${captures}/login-${width}.png` });
  }
  expect(errors).toEqual([]);
});

test("KAY branding: separate website simulator serves every advertised icon", async ({ page }) => {
  const agent = await createActor("agent");
  try {
    await testControl("fixture", { action: "website-source", id: agent.id });
    await testControl("simulator-start");
    await expect.poll(async () => {
      try { return (await page.request.get(simulatorOrigin)).status(); } catch { return 0; }
    }, { timeout: 10000 }).toBe(200);
    await page.goto(simulatorOrigin);
    await expect(page.getByRole("heading", { name: "Formulaire web local", exact: true })).toBeVisible();
    const urls = await page.locator('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
    expect(urls.length).toBeGreaterThanOrEqual(3);
    for (const url of urls) {
      const response = await page.request.get(url);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toMatch(/image\/(svg\+xml|png)/);
      expect((await response.body()).length).toBeGreaterThan(100);
    }
  } finally { await clearIntake(); }
});

test("KAY branding: mandatory password-change screen reuses transparent artwork", async ({ page }) => {
  const actor = await createActor("administrator", true);
  try {
    await signIn(page, actor);
    await expect(page).toHaveURL(/\/change-password$/);
    const logo = page.getByRole("img", { name: "KAY Real Estate", exact: true });
    await expect(logo).toHaveAttribute("src", /kay-champagne-gold/);
    await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", iconUrl);
  } finally { await clearActorContext(page); await removeActor(actor); }
});

test("KAY branding: shared shell covers every navigation family and responsive drawer", async ({ page, actor }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.name));
  page.on("console", message => { if (message.type() === "error") errors.push("console-error"); });
  try {
    await signIn(page, actor);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/dashboard", "/leads", "/deals", "/visits", "/projects", "/settings", "/settings/users", "/settings/working-hours"]) {
      await page.goto(route);
      const logo = page.locator("aside[data-sidebar]").getByRole("img", { name: "KAY Real Estate", exact: true });
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute("src", /kay-luxury-gold/);
      await expect.poll(() => logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      expect(await logo.evaluate(image => getComputedStyle(image.parentElement!).backgroundColor)).toBe("rgb(0, 0, 0)");
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", iconUrl);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto("/leads");
    await expect(page.getByText("0 demande(s) accessible(s).", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${captures}/sidebar-desktop.png` });
    await page.setViewportSize({ width: 360, height: 800 });
    const trigger = page.getByRole("button", { name: "Ouvrir la navigation", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Navigation KAY", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `${captures}/navigation-mobile.png` });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); }
});
