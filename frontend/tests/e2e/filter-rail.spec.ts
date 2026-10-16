import type { Locator, Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";

const artifacts = path.resolve("output/playwright/filter-rail");
test.use({ actionTimeout: 15_000 });
async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}
async function openFilters(page: Page, width: number) {
  if (width < 1280) {
    const trigger = page.getByRole("button", { name: "Afficher les filtres", exact: true });
    await expect(trigger).toBeVisible();
    if (!await page.locator('[data-filter-panel="mobile"]').isVisible()) await trigger.click();
  }
  const panel = page.locator(`[data-filter-panel="${width >= 1280 ? "desktop" : "mobile"}"]`);
  await expect(panel).toBeVisible();
  return panel;
}
async function geometry(page: Page, panel: Locator, desktop: boolean) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const panelBox = (await panel.boundingBox())!;
  for (const control of await panel.locator("input, select, button, summary").all()) {
    if (!await control.isVisible()) continue;
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(panelBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
  }
  const ids = await page.locator("[id]").evaluateAll(elements => elements.map(element => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  if (desktop) {
    const results = (await page.locator("[data-list-results]").boundingBox())!;
    expect(results.x).toBeGreaterThanOrEqual(panelBox.x + panelBox.width + 23);
    expect(Math.abs(results.y - panelBox.y)).toBeLessThanOrEqual(1);
  }
}

async function exerciseFilters(page: Page, panel: Locator, endpoint: string, submit: string, search: string) {
  for (const details of await panel.locator("details").all()) {
    if (await details.getAttribute("open") === null) await details.locator(":scope > summary").click();
  }
  await panel.getByLabel(search, { exact: true }).fill("");
  const parameterByLabel: Record<string, string> = {
    "Statut": "status", "Source": "source", "Trier par": "sort", "Lignes par page": "page_size",
    "Agent attribué": "assigned_agent_id", "Agent responsable": "assigned_agent_id", "Étape": "stage",
    "Type d’offre liée": "offering_kind", "Contacts": "archive", "Catégorie": "category",
    "Type d’offre": "offering_kind", "Statut de l’offre": "state", "État du dossier": "archive",
    "Catégorie du programme": "category", "Offre du programme entier": "offering_kind",
  };
  const expected: Record<string, string> = { q: "", page: "1" };
  for (const select of await panel.locator("select").all()) {
    await expect(select).toBeEnabled();
    const label = await select.evaluate(element => Array.from((element as HTMLSelectElement).labels ?? []).map(label => label.textContent?.trim()).join(" "));
    const parameter = parameterByLabel[label];
    expect(parameter).toBeTruthy();
    const value = await select.locator("option").last().evaluate(option => (option as HTMLOptionElement).value);
    await select.selectOption(value);
    await expect(select).toHaveValue(value);
    expected[parameter] = value;
  }
  for (const input of await panel.locator('input[type="date"]').all()) {
    const from = (await input.getAttribute("id"))!.endsWith("-from");
    const value = from ? "2026-10-01" : "2026-10-31";
    await input.fill(value);
    expected[`${endpoint === "enquiries" ? "received" : "updated"}_${from ? "from" : "to"}`] = value;
  }
  for (const label of ["Agents précédents", "Agents suivants"]) {
    const pager = panel.getByRole("button", { name: label, exact: true });
    if (await pager.count()) await expect(pager).toBeDisabled();
  }
  const response = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === "GET" && url.pathname === `/api/v1/${endpoint}` && Object.entries(expected).every(([key, value]) => (url.searchParams.get(key) ?? "") === value);
  }, { timeout: 15_000 });
  await panel.getByRole("button", { name: submit, exact: true }).click();
  expect((await response).status()).toBe(200);
}

test("filter rail: populated directories, left geometry, responsive drafts and real filter requests", async ({ page, actor }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const owner = await createActor("agent", false, "SP06 responsable synthétique des filtres");
  try {
  await signIn(page, owner);
  const lead = await createLead(page, "SP06 contact synthétique des filtres");
  const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
  await clearActorContext(page);
  await signIn(page, actor);
  expect((await staffCommand(page, "deals", dealBody(contact, "SP11 affaire synthétique des filtres"))).status()).toBe(200);
  expect((await staffCommand(page, "properties", { reference: "SP07-RAIL", category: "villa", marketing_name: "SP07 bien synthétique des filtres", location: "Quartier synthétique", area_sqm: null })).status()).toBe(200);
  expect((await staffCommand(page, "developments", { reference: "SP08-RAIL", name: "SP08 programme synthétique des filtres", category: "mixed", location: "Quartier synthétique", briefing_text: null, developer_contact_id: null, developer_marketing_display: null })).status()).toBe(200);
  const screens = [
    { name: "leads", path: "/leads", endpoint: "enquiries", search: "Rechercher un nom, téléphone ou e-mail", submit: "Appliquer", status: "1 demande(s) accessible(s).", empty: "0 demande(s) accessible(s)." },
    { name: "deals", path: "/deals", endpoint: "deals", search: "Rechercher une affaire, un contact ou une action", submit: "Appliquer", status: "1 affaire(s) accessible(s) dans ces filtres.", empty: "0 affaire(s) accessible(s) dans ces filtres." },
    { name: "properties", path: "/projects", endpoint: "properties", search: "Référence, nom ou localisation", submit: "Appliquer les filtres", status: "1 bien(s) correspondant(s).", empty: "0 bien(s) correspondant(s)." },
    { name: "programmes", path: "/projects", endpoint: "developments", search: "Rechercher un programme", submit: "Filtrer les programmes", status: "1 programme(s) correspondant(s).", empty: "0 programme(s) correspondant(s)." },
    { name: "contacts", path: "/leads?view=contacts", endpoint: "contacts", search: "Rechercher un nom, téléphone ou e-mail", submit: "Rechercher", status: "1 contact(s) accessible(s).", empty: "0 contact(s) accessible(s)." },
  ];
  for (const screen of screens) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(screen.path);
    if (screen.name === "programmes") await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
    await expect(page.getByText(screen.status, { exact: true })).toBeVisible();
    for (const width of [320, 360, 768, 1024, 1279, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const panel = await openFilters(page, width);
      await expect(panel.getByLabel(screen.search, { exact: true })).toBeVisible();
      if (screen.name === "leads" || screen.name === "deals") await panel.getByText("Filtres avancés", { exact: true }).click();
      if (screen.name === "properties") await panel.getByText("Filtres avancés des biens", { exact: true }).click();
      if (screen.name === "programmes") await panel.getByText("Archivage des programmes", { exact: true }).click();
      await geometry(page, panel, width >= 1280);
      if (width === 1440 || (width === 360 && ["leads", "properties"].includes(screen.name))) await capture(page, `${screen.name}-${width}`);
      const query = panel.getByLabel(screen.search, { exact: true });
      await query.fill("SP06 brouillon conservé");
      if (width < 1280) {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
        const reopened = await openFilters(page, width);
        await expect(reopened.getByLabel(screen.search, { exact: true })).toHaveValue("SP06 brouillon conservé");
        await page.keyboard.press("Escape");
      }
    }
    const panel = await openFilters(page, 1440);
    await panel.getByLabel(screen.search, { exact: true }).fill("SP06 aucun résultat de contrôle");
    const sent = page.waitForRequest(request => new URL(request.url()).pathname === `/api/v1/${screen.endpoint}` && new URL(request.url()).searchParams.get("q") === "SP06 aucun résultat de contrôle");
    await panel.getByRole("button", { name: screen.submit, exact: true }).click();
    expect(new URL((await sent).url()).searchParams.get("page")).toBe("1");
    await expect(page.getByText(screen.empty, { exact: true })).toBeVisible();
    await capture(page, `${screen.name}-empty`);
    if (screen.name === "contacts") {
      await panel.getByLabel(screen.search, { exact: true }).fill("");
      await panel.getByRole("button", { name: screen.submit, exact: true }).click();
      await expect(page.getByText(screen.status, { exact: true })).toBeVisible();
      await panel.getByLabel("État des contacts", { exact: true }).selectOption("archived");
      await expect(page.getByText(screen.empty, { exact: true })).toBeVisible();
    } else if (screen.name === "programmes") {
      await panel.getByLabel(screen.search, { exact: true }).fill("");
      await panel.getByRole("button", { name: screen.submit, exact: true }).click();
      await expect(page.getByText(screen.status, { exact: true })).toBeVisible();
    } else {
      await panel.getByRole("button", { name: "Réinitialiser", exact: true }).click();
      await expect(page.getByText(screen.status, { exact: true })).toBeVisible();
    }
    if (screen.name === "leads" || screen.name === "deals") {
      const scroller = page.getByRole("region", { name: screen.name === "leads" ? "Tableau des Leads, défilement horizontal" : "Tableau des affaires, défilement horizontal", exact: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(page.getByText("Faites défiler le tableau horizontalement pour lire les colonnes choisies.", { exact: true })).toBeVisible();
      await scroller.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => scroller.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    }
    if (screen.name !== "contacts") await exerciseFilters(page, panel, screen.endpoint, screen.submit, screen.search);
  }
  await page.goto(`/contacts/${contact}`);
  await page.getByRole("tab", { name: "Demandes", exact: true }).click();
  await expect(page.getByRole("form", { name: "Recherche et filtres des Leads", exact: true })).toBeVisible();
  await expect(page.locator("[data-filter-panel]")).toHaveCount(0);
  expect(errors).toEqual([]);
  } finally { await clearActorContext(page); await removeActor(owner); }
});

test("filter rail: mobile validation, selected-agent persistence, breakpoint focus and agent permissions", async ({ page, actor, browser, baseURL }) => {
  test.setTimeout(150_000);
  const agent = await createActor("agent", false, "SP06 agent synthétique choisi dans les filtres");
  try {
    await signIn(page, actor);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/leads");
    let panel = await openFilters(page, 360);
    await panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(panel.getByRole("button", { name: "Fermer les filtres", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true })).toBeFocused();
    await panel.getByText("Filtres avancés", { exact: true }).click();
    await panel.getByText("Filtrer par agent attribué", { exact: true }).click();
    await panel.getByLabel("Rechercher un agent (agent attribué)", { exact: true }).fill("SP06 agent synthétique choisi");
    await expect(panel.getByRole("option", { name: "SP06 agent synthétique choisi dans les filtres", exact: true })).toHaveCount(1);
    await panel.getByLabel("Agent attribué", { exact: true }).selectOption(agent.id);
    await panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true }).fill("SP06 brouillon conservé");
    await panel.getByLabel("Reçue à partir du", { exact: true }).fill("2026-11-01");
    await panel.getByLabel("Reçue jusqu’au", { exact: true }).fill("2026-10-01");
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(panel.getByRole("alert")).toHaveText("La date de début doit précéder la date de fin.");
    await expect(panel.getByRole("alert")).toBeInViewport();
    await capture(page, "leads-mobile-invalid");
    await page.keyboard.press("Escape");
    const hold = Promise.withResolvers<void>();
    await page.route("**/api/v1/contacts/assignment-options?**", async route => { await hold.promise; await route.continue(); });
    try {
      panel = await openFilters(page, 360);
      await panel.getByText("Filtres avancés", { exact: true }).click();
      await panel.getByText("Filtrer par agent attribué", { exact: true }).click();
      await expect(panel.getByLabel("Agent attribué", { exact: true })).toHaveValue(agent.id);
      await expect(panel.getByRole("option", { name: "SP06 agent synthétique choisi dans les filtres", exact: true })).toHaveCount(1);
      await expect(panel.getByLabel("Reçue à partir du", { exact: true })).toHaveValue("2026-11-01");
    } finally { hold.resolve(); await page.unrouteAll({ behavior: "wait" }); }
    await panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true }).focus();
    await page.setViewportSize({ width: 1440, height: 900 });
    panel = await openFilters(page, 1440);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true })).toBeFocused();
    await expect(panel.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true })).toHaveValue("SP06 brouillon conservé");
    await page.setViewportSize({ width: 1024, height: 900 });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
    panel = await openFilters(page, 1024);
    await panel.getByText("Filtres avancés", { exact: true }).click();
    await panel.getByLabel("Reçue à partir du", { exact: true }).fill("");
    await panel.getByLabel("Reçue jusqu’au", { exact: true }).fill("");
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Afficher les filtres", exact: true })).toHaveText("Filtres appliqués");
    const touch = await browser.newContext({ baseURL, viewport: { width: 360, height: 800 }, hasTouch: true, ignoreHTTPSErrors: true });
    try {
      await clearActorContext(page); await signIn(page, agent);
      await touch.addCookies(await page.context().cookies());
      const phone = await touch.newPage();
      await phone.goto("/leads");
      await phone.getByRole("button", { name: "Afficher les filtres", exact: true }).tap();
      const drawer = phone.getByRole("dialog", { name: "Filtres des Leads", exact: true });
      await drawer.getByText("Filtres avancés", { exact: true }).tap();
      await expect(drawer.getByText("Filtrer par agent attribué", { exact: true })).toHaveCount(0);
      await drawer.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true }).fill("SP06 tactile");
      await drawer.getByRole("button", { name: "Appliquer", exact: true }).tap();
      await expect(phone.getByRole("dialog")).toHaveCount(0);
      await expect(phone.getByRole("link", { name: "Importer des contacts", exact: true })).toHaveCount(0);
      await phone.goto("/projects");
      await expect(phone.getByRole("link", { name: "Créer un bien indépendant", exact: true })).toHaveCount(0);
      await phone.getByRole("button", { name: "Afficher les filtres", exact: true }).tap();
      await phone.getByRole("button", { name: "Fermer les filtres", exact: true }).tap();
      await expect(phone.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
    } finally { await touch.close(); }
  } finally { await clearActorContext(page); await removeActor(agent); }
});
