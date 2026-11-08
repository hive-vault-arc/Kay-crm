import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

const artifacts = path.resolve("output/playwright/account-footer");

async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await expect(page.getByText("0 demande", { exact: true }).and(page.getByRole("status", { includeHidden: true }))).toBeVisible();
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}

const account = (page: Page) => page.getByRole("dialog", { name: "Compte utilisateur", exact: true });
const accountButton = (page: Page) => page.getByRole("banner").getByRole("button", { name: /^Compte de / });

test("workspace account: one account location, real role, long name and responsive navigation", async ({ page }) => {
  test.setTimeout(120_000);
  const name = "SP06 responsable synthétique avec un nom très long pour vérifier le retour à la ligne et les informations du compte utilisateur".padEnd(160, "x");
  const actor = await createActor("manager", false, name);
  try {
    await signIn(page, actor);
    await page.goto("/leads");
    const header = page.getByRole("banner");
    await expect(accountButton(page)).toHaveAccessibleName(`Compte de ${name}`);
    await expect(header.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width === 360 ? 480 : 900 });
      const mobile = width < 831;
      if (mobile) await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
      const navigation = mobile ? page.getByRole("dialog", { name: "Navigation KAY", exact: true }) : page.locator("aside[data-sidebar]");
      await expect(navigation.getByRole("link", { name: "Prospects", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(navigation.getByRole("link", { name: "Paramètres", exact: true })).toHaveCount(0);
      await expect(navigation.getByRole("button", { name: "Se déconnecter", exact: true })).toHaveCount(0);
      expect(await navigation.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      if (mobile) await page.keyboard.press("Escape");

      await accountButton(page).click();
      const menu = account(page);
      await expect(menu.getByText(name, { exact: true })).toBeVisible();
      await expect(menu.getByText("Responsable", { exact: true })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Changer le mot de passe", exact: true })).toHaveCount(0);
      const logout = menu.getByRole("button", { name: "Se déconnecter", exact: true });
      await expect(logout).toBeEnabled();
      await expect(logout).toBeInViewport();
      const box = await logout.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 360 || width === 1440) await capture(page, `long-name-${width}`);
      await page.keyboard.press("Escape");
      await expect(menu).not.toBeVisible();
    }
  } finally { await clearActorContext(page); await removeActor(actor); }
});

test("workspace account: logout button retains pending, failure, keyboard retry and revocation", async ({ page, actor }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, actor);
  await page.goto("/leads");
  await accountButton(page).click();
  const footer = account(page);
  await expect(footer.getByText("Administrateur", { exact: true })).toBeVisible();
  await expect(footer.getByRole("button")).toHaveCount(1);
  await capture(page, "desktop");
  const hold = Promise.withResolvers<void>();
  await page.route("**/api/v1/auth/logout", async route => { await hold.promise; await route.abort("connectionfailed"); });
  try {
    await footer.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    const pending = footer.getByRole("button", { name: /^Déconnexion en cours(?:…)?$/ });
    await expect(pending).toBeDisabled();
    expect(await footer.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await capture(page, "pending");
  } finally { hold.resolve(); }
  const error = footer.getByRole("alert");
  await expect(error).toBeVisible();
  await expect(error).toContainText(/Réessayez|indisponible/i);
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

test("workspace account: mobile agent can sign out by touch from the account menu", async ({ page, browser, baseURL }) => {
  const actor = await createActor("agent", false, "SP06 agent synthétique de navigation");
  const mobile = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true });
  try {
    await signIn(page, actor);
    await mobile.addCookies(await page.context().cookies());
    const phone = await mobile.newPage();
    await phone.goto("/leads");
    await expect(phone.getByRole("banner").getByRole("button", { name: "Se déconnecter", exact: true })).toHaveCount(0);
    await accountButton(phone).tap();
    const footer = account(phone);
    await expect(footer.getByText("Agent", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Changer le mot de passe", exact: true })).toHaveCount(0);
    await capture(phone, "mobile");
    await footer.getByRole("button", { name: "Se déconnecter", exact: true }).tap();
    await expect(phone).toHaveURL(/\/login\?signed_out=1$/);
    expect((await phone.request.get("/api/v1/auth/me")).status()).toBe(401);
  } finally { await mobile.close(); await clearActorContext(page); await removeActor(actor); }
});
