import type { Locator, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

const artifacts = path.resolve("output/playwright/list-header-actions");
const header = (page: Page) => page.locator("main header").first();

async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}

async function creationStyle(link: Locator) {
  await expect(link).toHaveAttribute("data-variant", "creation");
  await expect(link).toHaveCSS("background-color", "rgb(201, 167, 92)");
  await expect(link).toHaveCSS("color", "rgb(39, 39, 39)");
  await expect(link).toHaveCSS("font-weight", "600");
}

async function geometry(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const controls = header(page).locator('[data-slot="button"]');
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  for (const control of await header(page).getByRole("group", { name: "Actions secondaires", exact: true }).locator('[data-slot="button"]').all()) {
    await expect(control).toHaveAttribute("data-variant", "quiet");
    await expect(control).toHaveAttribute("data-size", "compact");
    await expect(control).toHaveCSS("font-size", "14px");
    await expect(control).toHaveCSS("font-weight", "400");
    await expect(control).toHaveCSS("padding-left", "8px");
    await expect(control).toHaveCSS("border-top-width", "0px");
  }
}

test("list header actions: gold creation, quiet utilities, responsive states and working destinations", async ({ page, actor }) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, actor);
  const hold = Promise.withResolvers<void>();
  await page.route("**/api/v1/enquiries?**", async route => { await hold.promise; await route.abort("connectionfailed"); });
  try {
    await page.goto("/leads");
    await expect(page.getByText("Chargement des Leads…", { exact: true })).toBeVisible();
    await creationStyle(header(page).getByRole("link", { name: "Créer un Lead", exact: true }));
    await capture(page, "leads-loading");
  } finally { hold.resolve(); }
  await expect(page.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
  await capture(page, "leads-error");
  await page.unroute("**/api/v1/enquiries?**");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByText("0 demande(s) accessible(s).", { exact: true })).toBeVisible();
  for (const route of ["/leads", "/deals"]) {
    await page.goto(route);
    await expect(page.getByText(route === "/leads" ? "0 demande(s) accessible(s)." : "0 affaire(s) accessible(s) dans ces filtres.", { exact: true })).toBeVisible();
    const create = header(page).getByRole("link", { name: route === "/leads" ? "Créer un Lead" : "Créer une affaire", exact: true });
    await creationStyle(create);
    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await geometry(page);
      if (width === 360 || width === 1440) await capture(page, `${route.slice(1)}-${width}`);
    }
    await create.hover();
    await expect(create).toHaveCSS("background-color", "rgb(185, 154, 84)");
    await create.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await create.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await create.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${route}/new$`));
    await expect(page.getByRole("heading", { level: 1, name: route === "/leads" ? "Créer un Lead" : "Créer une affaire", exact: true })).toBeVisible();
    if (route === "/leads") await expect(page.getByRole("button", { name: "Créer le Lead", exact: true })).toHaveAttribute("data-variant", "creation");
  }
  await page.goto("/leads");
  await expect(page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toBeVisible();
  await header(page).getByRole("link", { name: "Contacts", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Contacts", exact: true })).toBeVisible();
  await creationStyle(header(page).getByRole("link", { name: "Créer un Lead et son contact", exact: true }));
  await expect(page.getByText("0 contact(s) accessible(s).", { exact: true })).toBeVisible();
  await geometry(page);
  await capture(page, "contacts-1440");
  await header(page).getByRole("link", { name: "Demandes", exact: true }).click();
  await header(page).getByRole("link", { name: "Importer des contacts", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\?view=import$/);
  await expect(page.getByRole("button", { name: "Choisir un CSV", exact: true })).toBeVisible();
  await page.goto("/leads");
  const columns = header(page).getByRole("button", { name: "Colonnes", exact: true });
  await columns.click();
  const drawer = page.getByRole("dialog", { name: "Colonnes des Leads", exact: true });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("checkbox", { name: "Réception", exact: true }).uncheck();
  await drawer.getByRole("button", { name: "Rétablir les colonnes", exact: true }).click();
  await expect(drawer.getByRole("checkbox", { name: "Réception", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(columns).toBeFocused();
  await page.setViewportSize({ width: 360, height: 900 });
  await header(page).getByRole("button", { name: "Exporter les résultats filtrés", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmer l’export CSV", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "export-confirmation-360");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirmer l’export CSV", exact: true })).toHaveCount(0);
  await header(page).getByRole("link", { name: "Mes exports", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\?view=exports$/);
  await expect(page.getByRole("button", { name: "Actualiser les exports", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("list header actions: agent permissions and real touch controls on Leads and Deals", async ({ page, browser, baseURL }) => {
  const actor = await createActor("agent");
  const mobile = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true });
  try {
    await signIn(page, actor);
    await mobile.addCookies(await page.context().cookies());
    const phone = await mobile.newPage();
    for (const route of ["/leads", "/deals"]) {
      await phone.goto(route);
      await expect(phone.getByText(route === "/leads" ? "0 demande(s) accessible(s)." : "0 affaire(s) accessible(s) dans ces filtres.", { exact: true })).toBeVisible();
      await expect(phone.getByRole("link", { name: "Importer des contacts", exact: true })).toHaveCount(0);
      await expect(phone.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toHaveCount(0);
      const create = header(phone).getByRole("link", { name: route === "/leads" ? "Créer un Lead" : "Créer une affaire", exact: true });
      await creationStyle(create);
      await geometry(phone);
      await header(phone).getByRole("button", { name: "Colonnes", exact: true }).tap();
      await expect(phone.getByRole("dialog", { name: route === "/leads" ? "Colonnes des Leads" : "Colonnes des affaires", exact: true })).toBeVisible();
      await phone.keyboard.press("Escape");
      await create.tap();
      await expect(phone).toHaveURL(new RegExp(`${route}/new$`));
    }
  } finally { await mobile.close(); await clearActorContext(page); await removeActor(actor); }
});
