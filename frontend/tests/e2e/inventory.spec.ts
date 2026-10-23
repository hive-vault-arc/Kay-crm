import { randomUUID } from "node:crypto";
import { clearActorContext, test, expect, createActor, removeActor, signIn, changeActor } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { addOwners, confirmCampaign, createCampaign, createProperty, openProperty } from "../helpers/inventory";
import { apiProcess } from "../helpers/api-process";

test.beforeEach(({ page }) => { page.setDefaultNavigationTimeout(30_000); page.setDefaultTimeout(20_000); });

test("SP07 AT-23/39: a late inventory denial cannot replace intentional logout", async ({ page }) => {
  test.setTimeout(70_000);
  const actor = await createActor("agent");
  let releaseRead = () => {}; let releaseLogout = () => {};
  const readGate = new Promise<void>(resolve => { releaseRead = resolve; });
  const logoutGate = new Promise<void>(resolve => { releaseLogout = resolve; });
  let observedRead = () => {}; let committedLogout: (status: number) => void = () => {};
  const readStarted = new Promise<void>(resolve => { observedRead = resolve; });
  const logoutStatus = new Promise<number>(resolve => { committedLogout = resolve; });
  try {
    await signIn(page, actor);
    await page.route("**/api/v1/properties?**", async route => {
      observedRead(); await readGate;
      const response = await route.fetch();
      await route.fulfill({ response }).catch(() => {});
    });
    await page.route("**/api/v1/auth/logout", async route => {
      const response = await route.fetch(); committedLogout(response.status());
      await logoutGate; await route.fulfill({ response }).catch(() => {});
    });
    await page.goto("/projects"); await readStarted;
    await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    expect(await logoutStatus).toBe(200);
    releaseRead();
    await expect(page.getByRole("alert").filter({ hasText: "Votre session a expiré. Reconnectez-vous." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Déconnexion en cours", exact: true })).toBeDisabled();
    expect(new URL(page.url()).pathname).toBe("/projects");
    releaseLogout();
    await expect(page).toHaveURL(/\/login\?signed_out=1$/);
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
    expect((await page.context().cookies()).some(cookie => cookie.name === "__Host-kay_session")).toBe(false);
  } finally { releaseRead(); releaseLogout(); await removeActor(actor); }
});

test("SP07 AT-23/39: failed logout restores normal session-expiry handling", async ({ page }) => {
  const actor = await createActor("agent");
  try {
    await signIn(page, actor); await page.goto("/projects");
    await expect(page.getByText("0 bien correspondant", { exact: true })).toBeVisible();
    await page.route("**/api/v1/auth/logout", route => route.abort("failed"), { times: 1 });
    await page.getByRole("button", { name: "Se déconnecter", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Le service local est indisponible." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Se déconnecter", exact: true })).toBeEnabled();
    await changeActor(actor, "revoke");
    await page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true }).fill("SP07 session révoquée");
    await expect(page).toHaveURL(/\/login\?return_to=%2Fprojects$/);
    expect((await page.request.get("/api/v1/auth/me")).status()).toBe(401);
  } finally { await removeActor(actor); }
});

test("SP07 AT-23: held owner acknowledgement locks tabs and clears the prior success", async ({ page }) => {
  test.setTimeout(80_000);
  const manager = await createActor("manager");
  let release = () => {};
  try {
    await signIn(page, manager); const id = await createProperty(page);
    await expect(page.getByLabel("Prix demandés")).toContainText("900 000,01 MAD");
    await createCampaign(page, "rental");
    await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Propriétaires", exact: true }).click();
    await page.getByRole("button", { name: "Modifier les propriétaires", exact: true }).click();
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/api/v1/properties/${id}/owners`, async route => { const response = await route.fetch(); await gate; await route.fulfill({ response }); }, { times: 1 });
    await page.getByRole("button", { name: "Enregistrer les propriétaires", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Offres", exact: true })).toBeDisabled();
    await expect(page.getByText("Inventaire enregistré.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Enregistrement en cours, veuillez patienter…", { exact: true })).toBeVisible();
    release();
    await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await expect(page.getByText("Comparaison annuelle : 14 814,72 MAD / an", { exact: true })).toBeVisible();
  } finally { release(); await removeActor(manager); }
});

test("SP07 AT-06/08/27/31: manager standalone inventory, separate prices and unrelated agent privacy", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const owner = await createActor("agent");
  const unrelated = await createActor("agent");
  const manager = await createActor("manager");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const agent = await context.newPage();
  agent.setDefaultNavigationTimeout(30_000); agent.setDefaultTimeout(20_000);
  try {
    await signIn(agent, owner);
    const lead = await createLead(agent, "SP07 propriétaire privé synthétique");
    const contact = (await (await agent.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await createLead(agent, "SP07 second propriétaire privé synthétique", "+212600000002");
    await signIn(page, manager);
    const id = await createProperty(page);
    await expect(page.getByLabel("Prix demandés")).toContainText("900 000,01 MAD");
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    const sale = page.getByRole("region", { name: "Vente", exact: true });
    await sale.getByLabel("Motif de la confirmation de disponibilité", { exact: true }).fill("SP07 vérification sans propriétaire");
    await sale.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click();
    await expect(sale.getByRole("alert")).toContainText("au moins un propriétaire légal");
    await addOwners(page, ["SP07 propriétaire privé synthétique", "SP07 second propriétaire privé synthétique"]);
    await createCampaign(page, "rental");
    await confirmCampaign(page, "sale"); await confirmCampaign(page, "rental");
    await expect(page.getByRole("tabpanel", { name: "Aperçu" }).getByText("1 234,56 MAD / mois", { exact: true })).toBeVisible();
    await expect(page.getByText("Comparaison annuelle : 14 814,72 MAD / an", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Prix demandés").getByText("900 000,01 MAD", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Pièces jointes", exact: true }).getByText("Aucune pièce jointe sur cette page. Ajoutez un fichier pour commencer.", { exact: true })).toBeVisible();
    await clearActorContext(agent); await signIn(agent, unrelated); await openProperty(agent, id, "Propriétaires");
    await expect(agent.getByText("SP07 vendeur autorisé 1", { exact: true })).toBeVisible();
    await expect(agent.getByRole("link", { name: "SP07 propriétaire privé synthétique", exact: true })).toHaveCount(0);
    const facts = await (await agent.request.get(`/api/v1/properties/${id}`)).json();
    expect(facts.owners.every((value: { contact: unknown }) => value.contact === null)).toBe(true);
    expect(JSON.stringify(facts).includes(contact.id)).toBe(false);
    expect((await agent.request.get(`/api/v1/contacts/${contact.id}`)).status()).toBe(404);
    await agent.getByRole("tab", { name: "Offres", exact: true }).click();
    await expect(agent.getByRole("button", { name: /Modifier la campagne/ })).toHaveCount(0);
    expect((await staffCommand(agent, `properties/${id}/owners`, { owners: [], expected_version: facts.version }, "PUT")).status()).toBe(403);
    await agent.goto(`/projects/properties/${id}/edit`);
    await expect(agent.getByRole("form", { name: "Modifier le bien", exact: true })).toBeVisible();
    await agent.goto("/projects/properties/new");
    await expect(agent.getByRole("button", { name: "Suivant", exact: true })).toBeEnabled();
    await clearActorContext(agent); await signIn(agent, owner); await openProperty(agent, id, "Propriétaires");
    await expect(agent.getByRole("link", { name: "SP07 propriétaire privé synthétique", exact: true })).toBeVisible();
    await openProperty(page, id, "Offres");
    await page.getByRole("button", { name: "Modifier la campagne location", exact: true }).click();
    await page.getByLabel("Statut de la campagne", { exact: true }).selectOption("withdrawn");
    await page.getByLabel("Motif de la modification de l’offre", { exact: true }).fill("SP07 retrait synthétique");
    await page.getByRole("button", { name: "Enregistrer la campagne", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
    await createCampaign(page, "rental", "15000,01", "year");
    await page.getByRole("tab", { name: "Historique", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Campagne retirée", exact: true })).toBeVisible();
    await expect(page.getByText("SP07 conditions initiales location", { exact: true }).first()).toBeVisible();
    const campaigns = await (await page.request.get(`/api/v1/offerings?property_id=${id}`)).json();
    expect(campaigns.total).toBe(3);
    expect(campaigns.items.filter((offer: { is_current: boolean }) => offer.is_current)).toHaveLength(2);
  } finally { await context.close(); await removeActor(manager); await removeActor(owner); await removeActor(unrelated); }
});

test("SP07 AT-27/31: all standalone categories, incomplete drafts and availability price check", async ({ page }) => {
  test.setTimeout(180_000);
  const manager = await createActor("administrator");
  try {
    await signIn(page, manager);
    for (const category of ["villa", "house", "apartment", "land", "commercial"]) {
      const id = await createProperty(page, category);
      const facts = await (await page.request.get(`/api/v1/properties/${id}`)).json();
      expect(facts.category).toBe(category); expect(facts.area_sqm).toBeNull(); expect(facts.owners).toEqual([]);
    }
    const landPath = new URL(page.url()).pathname;
    await page.goto("/projects");
    await expect(page.getByRole("checkbox", { name: "Local commercial" })).toBeVisible();
    for (const label of ["Villa", "Appartement", "Terrain", "Maison"]) {
      await page.getByRole("checkbox", { name: label, exact: true }).uncheck();
    }
    await expect(page.getByText("1 bien correspondant", { exact: true })).toBeVisible();
    await expect(page.getByText("Local commercial", { exact: true }).last()).toBeVisible();
    const literalSearch = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === "/api/v1/properties" && url.searchParams.get("q") === ".."; });
    await page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true }).fill("..");
    await expect(page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true })).toHaveValue("..");
    const literalResult = await literalSearch;
    expect(literalResult.status()).toBe(200);
    expect((await literalResult.json()).total).toBe(0);
    await expect(page.getByText("0 bien correspondant", { exact: true })).toBeVisible();
    await page.goto(landPath);
    await expect(page.getByRole("tab", { name: "Offres", exact: true })).toBeEnabled();
    await createCampaign(page, "rental", "");
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    const rental = page.getByRole("region", { name: "Location", exact: true });
    await rental.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click();
    await expect(rental.getByRole("alert")).toContainText("Saisissez le motif");
    await rental.getByLabel("Motif de la confirmation de disponibilité", { exact: true }).fill("SP07 prix encore inconnu");
    await rental.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click();
    await expect(rental.getByRole("alert")).toContainText("prix strictement positif");
    await page.getByRole("button", { name: "Modifier la campagne location", exact: true }).click();
    await page.getByLabel("Prix de location en MAD (facultatif)", { exact: true }).fill("0");
    await page.getByLabel("Motif de la modification de l’offre", { exact: true }).fill("SP07 invalide");
    await page.getByRole("button", { name: "Enregistrer la campagne", exact: true }).click();
    await expect(page.getByRole("form", { name: "Modifier la campagne location", exact: true }).getByRole("alert")).toContainText("Prix positif");
    await expect(page.getByLabel("Prix de location en MAD (facultatif)", { exact: true })).toHaveValue("0");
  } finally { await removeActor(manager); }
});

test("SP07 AT-23: lost acknowledgement and real outage preserve draft, retry is exactly once", async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager"); let stopped = false;
  try {
    await signIn(page, manager); const id = await createProperty(page);
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await page.getByLabel("Nom commercial (facultatif)", { exact: true }).fill("SP07 accusé interrompu");
    await page.route(`**/api/v1/properties/${id}`, async route => { if (route.request().method() === "PATCH") { await route.fetch(); await route.abort("failed"); } else await route.continue(); }, { times: 1 });
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await expect(page.getByLabel("Nom commercial (facultatif)", { exact: true })).toHaveValue("SP07 accusé interrompu");
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByRole("link", { name: "Modifier le bien", exact: true })).toBeVisible();
    const history = await (await page.request.get(`/api/v1/properties/${id}/history`)).json();
    expect(history.items.filter((event: { action: string }) => event.action === "properties.updated")).toHaveLength(1);
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await page.getByLabel("Localisation (facultatif)", { exact: true }).fill("SP07 saisie pendant panne");
    await apiProcess("stop"); stopped = true;
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await expect(page.getByLabel("Localisation (facultatif)", { exact: true })).toHaveValue("SP07 saisie pendant panne");
    await apiProcess("start"); stopped = false;
    await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByText("SP07 saisie pendant panne", { exact: true })).toBeVisible();
  } finally { if (stopped) await apiProcess("start"); await removeActor(manager); }
});

test("SP07 AT-23: current version comparison preserves edits and revoked role cannot write", async ({ page }) => {
  test.setTimeout(90_000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager); const id = await createProperty(page);
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await expect(page.getByRole("button", { name: "Enregistrer le bien", exact: true })).toBeEnabled();
    await page.getByLabel("Nom commercial (facultatif)", { exact: true }).fill("SP07 saisie conservée");
    const current = await (await page.request.get(`/api/v1/properties/${id}`)).json();
    expect((await staffCommand(page, `properties/${id}`, { reference: current.reference, category: current.category, marketing_name: "SP07 version concurrente", location: current.location, area_sqm: current.area_sqm, expected_version: current.version }, "PATCH")).status()).toBe(200);
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByRole("region", { name: "Version actuelle du bien", exact: true })).toContainText("SP07 version concurrente");
    await expect(page.getByLabel("Nom commercial (facultatif)", { exact: true })).toHaveValue("SP07 saisie conservée");
    await page.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByRole("heading", { name: /SP07 saisie conservée/ })).toBeVisible();
    await changeActor(manager, "role");
    const denied = await staffCommand(page, "properties", { reference: `SP07-${randomUUID()}`, category: "land" }).catch(() => null);
    expect(denied === null || denied.status() === 401).toBe(true);
    await page.reload(); await expect(page).toHaveURL(/\/login/);
  } finally { await removeActor(manager); }
});
