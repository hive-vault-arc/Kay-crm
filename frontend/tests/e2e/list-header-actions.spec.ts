import type { Locator, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";

const artifacts = path.resolve("output/playwright/list-header-actions");
const header = (page: Page) => page.locator("main:has(.crm-directory-toolbar) .crm-directory-toolbar, main:not(:has(.crm-directory-toolbar)) header").first();

async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}

async function creationStyle(link: Locator) {
  await expect(link).toHaveAttribute("data-variant", "creation");
  await link.page().mouse.move(0, 0);
  await expect.poll(() => link.evaluate(element => {
    const style = getComputedStyle(element), canvas = document.createElement("canvas"), context = canvas.getContext("2d")!;
    const rgb = (value: string) => { context.fillStyle = value; context.fillRect(0, 0, 1, 1); return [...context.getImageData(0, 0, 1, 1).data]; };
    return JSON.stringify([rgb(style.backgroundColor), rgb(style.color)]) === JSON.stringify([rgb(style.getPropertyValue("--workspace-primary")), rgb(style.getPropertyValue("--workspace-on-primary"))]);
  })).toBe(true);
  await expect(link).toHaveCSS("font-weight", "600");
}

async function geometry(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const controls = header(page).locator('[data-slot="button"]');
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
    expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
}

async function utilities(page: Page) {
  const menu = page.getByRole("dialog", { name: "Actions de la liste", exact: true });
  const trigger = header(page).getByRole("button", { name: "Autres actions de la liste", exact: true });
  if (await trigger.getAttribute("aria-expanded") !== "true") {
    await expect(menu).toBeHidden();
    await trigger.click();
  }
  await expect(menu).toHaveAttribute("data-state", "open");
  await expect(menu).toBeVisible();
  for (const control of await menu.locator("button,a").all()) {
    if (!await control.isVisible()) continue;
    const bounds = (await control.boundingBox())!;
    expect(Math.round(bounds.width)).toBeGreaterThanOrEqual(44); expect(Math.round(bounds.height)).toBeGreaterThanOrEqual(44);
  }
  return menu;
}

test("list header actions: selected creation, grouped utilities, responsive states and working destinations", async ({ page, actor }) => {
  test.setTimeout(150_000);
  page.setDefaultTimeout(15_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, actor);
  const hold = Promise.withResolvers<void>();
  await page.route("**/api/v1/enquiries?**", async route => { await hold.promise; await route.abort("connectionfailed"); });
  try {
    await page.goto("/leads");
    await expect(page.getByText("Chargement des Leads…", { exact: true })).toBeVisible();
    await creationStyle(header(page).getByRole("link", { name: "Nouveau prospect", exact: true }));
    await capture(page, "leads-loading");
  } finally { hold.resolve(); }
  await expect(page.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
  await capture(page, "leads-error");
  await page.unroute("**/api/v1/enquiries?**");
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByText("0 demande", { exact: true }).and(page.getByRole("status"))).toBeVisible();
  for (const route of ["/leads", "/deals"]) {
    await page.goto(route);
    await expect(page.getByText(route === "/leads" ? "0 demande" : "0 affaire", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    const create = header(page).getByRole("link", { name: route === "/leads" ? "Nouveau prospect" : "Créer une affaire", exact: true });
    await creationStyle(create);
    for (const width of [320, 360, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await geometry(page);
      if (width === 360 || width === 1440) await capture(page, `${route.slice(1)}-${width}`);
    }
    await page.mouse.move(0, 0);
    const resting = await create.evaluate(element => getComputedStyle(element).backgroundColor);
    await create.hover();
    await expect.poll(() => create.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(resting);
    await create.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await create.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await create.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${route}/new$`));
    await expect(page.getByRole("heading", { level: 1, name: route === "/leads" ? "Nouveau prospect" : "Nouvelle affaire", exact: true })).toBeVisible();
    if (route === "/leads") await expect(page.getByRole("button", { name: "Créer le prospect", exact: true })).toHaveAttribute("data-variant", "creation");
  }
  await page.goto("/leads");
  let menu = await utilities(page);
  await expect(menu.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toBeVisible();
  await menu.getByRole("link", { name: "Contacts", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Contacts", exact: true })).toBeVisible();
  await creationStyle(header(page).getByRole("link", { name: "Nouveau prospect", exact: true }));
  await expect(page.getByRole("status").filter({ hasText: /^0 contact\(s\) accessible\(s\)/ })).toBeVisible();
  await geometry(page);
  await capture(page, "contacts-1440");
  await (await utilities(page)).getByRole("link", { name: "Prospects", exact: true }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.getByRole("heading", { level: 1, name: "Prospects", exact: true })).toBeVisible();
  await (await utilities(page)).getByRole("link", { name: "Importer des contacts", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\?view=import$/);
  await expect(page.getByRole("button", { name: "Parcourir", exact: true })).toBeVisible();
  await page.goto("/leads");
  menu = await utilities(page);
  const columns = menu.getByRole("button", { name: "Colonnes", exact: true });
  await columns.click();
  const drawer = page.getByRole("dialog", { name: "Colonnes des Leads", exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("checkbox", { name: "Budget", exact: true })).toBeChecked();
  await drawer.getByRole("checkbox", { name: "Budget", exact: true }).uncheck();
  await expect(drawer.getByRole("checkbox", { name: "Budget", exact: true })).not.toBeChecked();
  await drawer.getByRole("button", { name: "Rétablir les colonnes", exact: true }).click();
  for (const name of ["Budget", "Qualification", "Source"]) await expect(drawer.getByRole("checkbox", { name, exact: true })).toBeChecked();
  for (const name of ["Pays", "Langues"]) await expect(drawer.getByRole("checkbox", { name, exact: true })).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(columns).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await page.setViewportSize({ width: 360, height: 900 });
  await (await utilities(page)).getByRole("button", { name: "Exporter les résultats filtrés", exact: true }).click();
  await expect(page.getByRole("button", { name: "Créer l’export CSV", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Confirmer ce périmètre", exact: true }).check();
  await expect(page.getByRole("button", { name: "Créer l’export CSV", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, "export-confirmation-360");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("button", { name: "Créer l’export CSV", exact: true })).toHaveCount(0);
  await (await utilities(page)).getByRole("link", { name: "Mes exports", exact: true }).click();
  await expect(page).toHaveURL(/\/leads\?view=exports$/);
  await expect(page.getByRole("heading", { name: "Mes exports", exact: true, level: 1 })).toBeVisible();
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
      await expect(phone.getByText(route === "/leads" ? "0 demande" : "0 affaire", { exact: true }).and(phone.getByRole("status"))).toBeVisible();
      await expect(phone.getByRole("link", { name: "Importer des contacts", exact: true })).toHaveCount(0);
      await expect(phone.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toHaveCount(0);
      const create = header(phone).getByRole("link", { name: route === "/leads" ? "Nouveau prospect" : "Créer une affaire", exact: true });
      await creationStyle(create);
      await geometry(phone);
      const menu = await utilities(phone);
      await expect(menu.getByRole("link", { name: "Importer des contacts", exact: true })).toHaveCount(0);
      await expect(menu.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toHaveCount(0);
      await menu.getByRole("button", { name: "Colonnes", exact: true }).tap();
      await expect(phone.getByRole("dialog", { name: route === "/leads" ? "Colonnes des Leads" : "Colonnes des affaires", exact: true })).toBeVisible();
      await phone.keyboard.press("Escape");
      await phone.keyboard.press("Escape");
      await create.tap();
      await expect(phone).toHaveURL(new RegExp(`${route}/new$`));
    }
  } finally { await mobile.close(); await clearActorContext(page); await removeActor(actor); }
});
