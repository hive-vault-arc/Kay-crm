import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { Button } from "../../src/components/ui/button";
import { buttonActions, type ButtonAction } from "../../src/components/ui/button-actions";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { inventoryFixture } from "../helpers/requirements";
import { geometry } from "../helpers/report-review";
import { inspectIcons } from "../helpers/icons";

const artifacts = path.resolve("output/playwright/action-buttons");
async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}
async function inspectActions(page: Page) {
  for (const control of await page.locator('[data-slot="button"][data-action]').all()) {
    if (!await control.isVisible()) continue;
    await expect(control.locator("[data-action-icon]")).toHaveCount(1);
    await expect(control.locator("[data-action-icon]")).toHaveAttribute("aria-hidden", "true");
    const iconSize = await control.evaluate(element => element.classList.contains("crm-sort-heading")) ? "12px" : "16px";
    await expect(control.locator("[data-action-icon]")).toHaveCSS("width", iconSize);
    await expect(control.locator("[data-action-icon]")).toHaveCSS("height", iconSize);
    const box = (await control.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(await control.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (await control.getAttribute("data-action") === "create") {
      await expect(control).toHaveAttribute("data-variant", "creation");
      const gold = await control.isDisabled() ? "rgb(232, 228, 220)"
        : await control.evaluate(element => element.matches(":hover")) ? "rgb(228, 188, 98)" : "rgb(216, 170, 69)";
      await expect(control).toHaveCSS("background-color", gold);
    }
  }
  const headerSearch = page.locator("header").getByRole("button", { name: "Rechercher", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 1024 && await headerSearch.count()) await expect(headerSearch).toHaveCSS("max-width", "512px");
  await inspectIcons(page);
  return geometry(page);
}

test("Action buttons: every semantic action renders on the server with correct colors and accessible states", async ({ page }) => {
  await page.goto("/login");
  const styles = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => (link as HTMLLinkElement).href));
  const theme = await page.locator("html").getAttribute("style");
  expect(styles.length).toBeGreaterThan(0);
  const keys = Object.keys(buttonActions) as ButtonAction[];
  const plainLink = renderToStaticMarkup(createElement(Button, { asChild: true, variant: "outline" }, createElement("a", { href: "#destination" }, "Retour synthétique")));
  expect(plainLink).toMatch(/^<a /); expect(plainLink).toContain('data-slot="button"');
  expect(plainLink).not.toContain("data-action-icon");
  const content = renderToStaticMarkup(createElement("main", null,
    createElement("h1", null, "Actions KAY : vérification synthétique"),
    createElement("section", { className: "gallery", "aria-label": "Actions sémantiques" },
      keys.map(action => createElement(Button, { key: action, action, type: "button" }, `Action ${action} synthétique`))),
    createElement("section", { className: "gallery", "aria-label": "États des boutons" },
      createElement(Button, { action: "create", disabled: true }, "Création indisponible"),
      createElement(Button, { action: "save", disabled: true }, "Enregistrement en cours…"),
      createElement(Button, { action: "create", asChild: true }, createElement("a", { href: "#destination" }, "Créer un dossier synthétique")),
      createElement(Button, { action: "back", asChild: true }, createElement("a", { href: "#destination" }, "Retour aux dossiers")),
      createElement(Button, { action: "export", variant: "quiet", size: "compact" }, "Exporter les résultats filtrés")),
    createElement("h2", { id: "destination", tabIndex: -1 }, "Destination synthétique")));
  expect(content.match(/data-action-icon=/g)).toHaveLength(keys.length + 5);
  expect(content).not.toMatch(/<script|<use|<image|foreignObject|suppressHydrationWarning/);
  await page.setContent(`<html lang="fr"><head>${styles.map(href => `<link rel="stylesheet" href="${href}">`).join("")}<style>body{background:white;margin:0}main{padding:16px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:16px;margin:24px 0}</style></head><body>${content}</body></html>`);
  await page.locator("html").evaluate((element, style) => element.setAttribute("style", style ?? ""), theme);
  const creationLink = page.getByRole("link", { name: "Créer un dossier synthétique", exact: true });
  await expect(creationLink).toHaveAttribute("data-action", "create");
  await expect(creationLink).toHaveCSS("background-color", "rgb(216, 170, 69)");
  await expect(creationLink.locator("[data-action-icon]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Action create synthétique", exact: true })).toHaveCSS("background-color", "rgb(216, 170, 69)");
  const metrics = [];
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    metrics.push({ surface: "semantic-gallery", ...(await inspectActions(page)) });
    if (width === 360 || width === 1440) await capture(page, `gallery-${width}`);
  }
  const create = page.getByRole("button", { name: "Action create synthétique", exact: true });
  await create.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  expect(await create.evaluate(element => element.matches(":focus-visible"))).toBe(true);
  await expect(page.getByRole("button", { name: "Création indisponible", exact: true })).toBeDisabled();
  const save = page.getByRole("button", { name: "Action save synthétique", exact: true });
  await save.hover(); await geometry(page);
  await page.mouse.down(); await geometry(page);
  await page.mouse.up();
  const back = page.getByRole("link", { name: "Retour aux dossiers", exact: true });
  await back.focus(); await page.keyboard.press("Enter");
  expect(new URL(page.url()).hash).toBe("#destination");
  await writeFile(path.join(artifacts, "gallery-geometry.json"), JSON.stringify(metrics, null, 2));
});

test("Action buttons: real CRM route families, responsive forms, dialogs and preserved destinations", async ({ page, actor }) => {
  test.setTimeout(300_000);
  const owner = await createActor("agent");
  const failures: string[] = [];
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") failures.push("CONSOLE_ERROR"); });
  try {
    await signIn(page, owner);
    const lead = await createLead(page, "SP05 contact synthétique des actions");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
    await clearActorContext(page); await signIn(page, actor);
    const stock = await inventoryFixture(page, contact);
    const created = await staffCommand(page, "deals", dealBody(contact, "SP11 affaire synthétique des actions"));
    expect(created.status()).toBe(200); const deal = (await created.json()).id;
    const routes = [
      ["dashboard", "/dashboard"], ["leads", "/leads"], ["contacts", "/leads?view=contacts"],
      ["lead", `/leads/${lead}`], ["lead-edit", `/leads/${lead}/edit`], ["lead-new", "/leads/new"],
      ["contact", `/contacts/${contact}`], ["imports", "/leads?view=import"], ["exports", "/leads?view=exports"],
      ["deals", "/deals"], ["deal", `/deals/${deal}`], ["deal-new", `/deals/new?contact_id=${contact}`],
      ["projects", "/projects"], ["development", `/projects/${stock.did}`],
      ["development-edit", `/projects/${stock.did}/edit`], ["property", `/projects/properties/${stock.sid}`],
      ["property-edit", `/projects/properties/${stock.sid}/edit`], ["project-new", "/projects/new"],
      ["visits", "/visits"], ["visit-new", "/visits/new"], ["settings", "/settings"],
      ["users", "/settings/users"], ["user-new", "/settings/users/new"],
      ["working-hours", "/settings/working-hours"], ["audit", "/dashboard?view=audit"],
      ["simulator", "/website-simulator"],
    ];
    const metrics = [];
    await page.setViewportSize({ width: 360, height: 1000 });
    await page.goto("/leads/new");
    await page.getByRole("button", { name: "Ajouter un téléphone", exact: true }).click();
    const remove = page.getByRole("button", { name: "Retirer le téléphone 2", exact: true });
    await expect(remove).toHaveAttribute("data-action", "remove");
    await expect(remove.locator("svg")).toHaveCSS("color", "rgb(153, 74, 64)");
    await capture(page, "contact-fields-remove-360");
    await remove.click(); await expect(page.getByLabel("Téléphone 2", { exact: true })).toHaveCount(0);
    await page.goto(`/deals/${deal}`);
    await page.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click();
    const dialog = page.getByRole("alertdialog"); await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-action="cancelRecord"]')).toBeEnabled();
    await expect(dialog.locator('[data-action="cancelRecord"]')).toHaveAttribute("data-variant", "destructive");
    await inspectActions(page); await capture(page, "outcome-confirmation-360");
    await dialog.getByRole("button", { name: "Retour", exact: true }).click();
    await expect(page.getByRole("button", { name: "Clôturer l’affaire", exact: true })).toBeFocused();
    await page.getByRole("tab", { name: "Finance", exact: true }).click();
    await page.getByRole("button", { name: "Prévoir une commission", exact: true }).click();
    await expect(page.getByRole("button", { name: "Fermer le formulaire", exact: true })).toBeVisible();
    await inspectActions(page); await capture(page, "finance-form-360");
    await page.getByRole("button", { name: "Fermer le formulaire", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prévoir une commission", exact: true })).toBeVisible();
    await page.goto(`/leads/${lead}`);
    const contactLink = page.getByRole("link", { name: "Ouvrir le contact et son historique", exact: true });
    await contactLink.click(); await expect(page.getByRole("heading", { name: "Contact : SP05 contact synthétique des actions", exact: true })).toBeVisible();
    for (const [name, route] of routes) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      const response = await page.goto(route); expect(response?.status()).toBe(200);
      await expect(page.locator("main").getByRole("heading").first()).toBeVisible();
      await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
      for (const width of [1440, 360]) {
        await page.setViewportSize({ width, height: 1000 });
        metrics.push({ route: name, ...(await inspectActions(page)) });
        if (["leads", "lead-new", "development", "working-hours"].includes(name)) await capture(page, `${name}-${width}`);
      }
    }
    await writeFile(path.join(artifacts, "routes-geometry.json"), JSON.stringify(metrics, null, 2));
    expect(failures).toEqual([]);
  } finally { await clearActorContext(page); await removeActor(owner); }
});
