import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

const artifacts = path.resolve("output/playwright/account-footer");

async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await expect(page.getByText("0 demande(s) accessible(s).", { exact: true })).toBeVisible();
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}

test("account footer: one account location, real role, long name and responsive navigation", async ({ page }) => {
  test.setTimeout(120_000);
  const name = "SP06 responsable synthétique avec un nom très long pour vérifier le retour à la ligne et les informations du compte utilisateur".padEnd(160, "x");
  const actor = await createActor("manager", false, name);
  try {
    await signIn(page, actor);
    await page.goto("/leads");
    const header = page.getByRole("banner");
    await expect(header.getByText(name, { exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Se déconnecter", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Changer le mot de passe", exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const mobile = width < 1024;
      if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
      const sidebar = mobile ? page.getByRole("dialog", { name: "Navigation KAY", exact: true }) : page.locator("aside[data-sidebar]");
      await expect(sidebar).toHaveCSS("background-color", "rgb(0, 0, 0)");
      await expect(sidebar.getByRole("link", { name: "Prospects", exact: true })).toHaveCSS("background-color", "rgb(65, 58, 45)");
      const footer = sidebar.getByRole("region", { name: "Compte utilisateur", exact: true });
      await expect(footer.getByText(name, { exact: true })).toBeVisible();
      await expect(footer.getByText("Responsable", { exact: true })).toBeVisible();
      await expect(sidebar.getByRole("link", { name: "Paramètres", exact: true })).toHaveCount(0);
      const logout = footer.getByRole("button", { name: "Se déconnecter", exact: true });
      await expect(logout).toBeEnabled();
      await logout.scrollIntoViewIfNeeded();
      await expect(logout).toBeInViewport();
      const box = await logout.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(await sidebar.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 360 || width === 1440) await capture(page, `long-name-${width}`);
      if (mobile) await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 360, height: 480 });
    await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation KAY", exact: true });
    const logout = drawer.getByRole("button", { name: "Se déconnecter", exact: true });
    await logout.scrollIntoViewIfNeeded();
    await expect(logout).toBeInViewport();
    await capture(page, "short-drawer");
    await page.keyboard.press("Escape");
  } finally { await clearActorContext(page); await removeActor(actor); }
});

test("account footer: plain logout button retains pending, failure, keyboard retry and revocation", async ({ page, actor }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, actor);
  await page.goto("/leads");
  const footer = page.locator("aside[data-sidebar]").getByRole("region", { name: "Compte utilisateur", exact: true });
  await expect(footer.getByText("Administrateur", { exact: true })).toBeVisible();
  await expect(footer.getByRole("button")).toHaveCount(1);
  await capture(page, "desktop");
  const hold = Promise.withResolvers<void>();
  await page.route("**/api/v1/auth/logout", async route => { await hold.promise; await route.abort("connectionfailed"); });
  try {
    await footer.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    const pending = footer.getByRole("button", { name: "Déconnexion en cours…", exact: true });
    await expect(pending).toBeDisabled();
    expect(await footer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await capture(page, "pending");
  } finally { hold.resolve(); }
  const error = footer.getByRole("alert");
  await expect(error).toBeVisible();
  await expect(error).toHaveCSS("background-color", "rgb(253, 235, 236)");
  await expect(error).toHaveCSS("color", "rgb(161, 29, 34)");
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(200);
  await capture(page, "logout-error");
  await page.unroute("**/api/v1/auth/logout");
  const logout = footer.getByRole("button", { name: "Se déconnecter", exact: true });
  await expect(logout).toBeEnabled();
  await logout.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login\?signed_out=1$/);
  expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
});

test("account footer: mobile agent can sign out by touch from the navigation drawer", async ({ page, browser, baseURL }) => {
  const actor = await createActor("agent", false, "SP06 agent synthétique de navigation");
  const mobile = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true });
  try {
    await signIn(page, actor);
    await mobile.addCookies(await page.context().cookies());
    const phone = await mobile.newPage();
    await phone.goto("/leads");
    await expect(phone.getByRole("banner").getByRole("button", { name: "Se déconnecter", exact: true })).toHaveCount(0);
    await phone.getByRole("button", { name: "Ouvrir la navigation", exact: true }).tap();
    const drawer = phone.getByRole("dialog", { name: "Navigation KAY", exact: true });
    await expect(drawer).toHaveCSS("background-color", "rgb(0, 0, 0)");
    const footer = drawer.getByRole("region", { name: "Compte utilisateur", exact: true });
    await expect(footer.getByText("Agent", { exact: true })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Changer le mot de passe", exact: true })).toHaveCount(0);
    await capture(phone, "mobile");
    await footer.getByRole("button", { name: "Se déconnecter", exact: true }).tap();
    await expect(phone).toHaveURL(/\/login\?signed_out=1$/);
    expect((await phone.request.get("/api/v1/auth/me")).status()).toBe(401);
  } finally { await mobile.close(); await clearActorContext(page); await removeActor(actor); }
});
