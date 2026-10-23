import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { beginRequirement, expectCurrentSearch, inventoryFixture, openRequirements, saveRequirement } from "../helpers/requirements";

test.beforeEach(({ page }) => { page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000); });

test("SP10 AT-07/08/36: independent searches, exact rents and real unit/whole offerings", async ({ page }) => {
  test.setTimeout(240_000);
  const agent = await createActor("agent"); const manager = await createActor("manager"); const outsider = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP10 contact privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    await clearActorContext(page); await signIn(page, manager);
    const inventory = await inventoryFixture(page, contact);
    await clearActorContext(page); await signIn(page, agent); await openRequirements(page, contact);
    const form = await beginRequirement(page);
    await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("11999.99");
    await form.getByLabel("Importance : Surface minimale (m²)", { exact: true }).selectOption("required");
    await form.getByLabel("Parking", { exact: true }).selectOption("false");
    const first = await saveRequirement(page);
    const selected = page.getByRole("region", { name: "Recherche sélectionnée", exact: true });
    await expect(selected.getByText(/Comparaison annuelle exacte.*143.*999,88 MAD/)).toBeVisible();
    const detail = await (await page.request.get(`/api/v1/requirements/${first}`)).json();
    expect(detail.criteria.find((c: { key: string }) => c.key === "area_sqm").value).toBeNull();
    expect(detail.criteria.find((c: { key: string }) => c.key === "parking").value).toBe(false);
    await page.getByLabel("Niveau de la cible", { exact: true }).selectOption("unit");
    await page.getByLabel("Loyer annuel minimum (MAD)", { exact: true }).fill("143999.88");
    await page.getByLabel("Loyer annuel maximum (MAD)", { exact: true }).fill("143999.88");
    await page.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    await expect(page.getByText("1 offre(s) correspondante(s).", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${inventory.reference}-U201 : Unité physique`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ajouter à la sélection", exact: true }).click();
    await expect(selected.getByText("Sélection et avis enregistrés.", { exact: true })).toBeVisible();
    const shortlist = page.getByRole("region", { name: "Sélection de la recherche", exact: true });
    await shortlist.getByLabel("Avis sur cette offre", { exact: true }).fill("SP10 avis synthétique sur l’unité 201");
    await shortlist.getByRole("button", { name: "Enregistrer l’avis", exact: true }).click();
    await expect(shortlist.getByRole("button", { name: "Enregistrer l’avis", exact: true })).toBeEnabled();
    await page.getByLabel("Niveau de la cible", { exact: true }).selectOption("development");
    await page.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    await expect(page.getByRole("heading", { name: `${inventory.reference} : Programme entier`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Ajouter à la sélection", exact: true }).click();
    await expect(shortlist.getByRole("heading")).toHaveCount(3);
    const after = await (await page.request.get(`/api/v1/requirements/${first}`)).json();
    expect(after.shortlist.map((e: { offering: { id: string } }) => e.offering.id).sort()).toEqual([inventory.unitOffer, inventory.wholeOffer].sort());
    expect(after.shortlist.map((e: { offering: { annual_equivalent_mad: string } }) => e.offering.annual_equivalent_mad)).toEqual(["143999.88", "143999.88"]);
    expect((await staffCommand(page, `requirements/${first}/shortlist`, { expected_version: after.version, offering_id: inventory.typeId, expected_offering_version: 1, feedback: null })).status()).toBe(404);
    await shortlist.getByRole("listitem").filter({ hasText: "Programme entier" }).getByRole("button", { name: "Retirer de la sélection", exact: true }).click();
    await expect(shortlist.getByRole("heading")).toHaveCount(2);
    await page.getByRole("button", { name: "Fermer la recherche", exact: true }).click();
    await beginRequirement(page, "SP10 achat indépendant", "sale"); await saveRequirement(page);
    await expect(page.getByText("Aucune offre sélectionnée pour cette recherche.", { exact: true })).toBeVisible();
    expect((await (await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).json()).total).toBe(2);
    await expectCurrentSearch(page, "SP10 achat indépendant (achat, 0 offre(s))");
    await page.getByRole("button", { name: "SP10 recherche locative synthétique (location, 1 offre(s))", exact: true }).click();
    await expectCurrentSearch(page, "SP10 recherche locative synthétique (location, 1 offre(s))");
    await page.goto(`/leads/${lead}`); await page.getByText("Gérer les recherches du contact", { exact: true }).click(); await expect(page.getByRole("heading", { name: "Recherches du contact", exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/requirements/${first}`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).status()).toBe(404);
    expect((await staffCommand(page, `requirements/${first}`, { title: "Refusé", intent: "rental", currency: "MAD", budget_min_mad: null, budget_max_mad: null, budget_period: "month", criteria: [], expected_version: 1 }, "PATCH")).status()).toBe(404);
    const shared = await (await page.request.get(`/api/v1/offerings?target_level=unit&development_id=${inventory.did}`)).json();
    expect(shared.items.length).toBe(1); expect(JSON.stringify(shared).includes(contact)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(manager); await removeActor(outsider); }
});

test("SP10: zero rejection, interrupted committed response and explicit stale-version recovery", async ({ page }) => {
  test.setTimeout(150_000); const agent = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP10 interruption synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    await openRequirements(page, contact); const form = await beginRequirement(page, "SP10 brouillon conservé");
    await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("abc");
    await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(form.getByText("Saisissez un montant positif au format 1234.56.", { exact: true })).toBeVisible();
    await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("11999,99");
    await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("0");
    await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(form.getByText(/Valeur invalide/)).toBeVisible();
    await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("80.50");
    let interrupt = true;
    await page.route("**/api/v1/requirements", async route => {
      if (route.request().method() !== "POST" || !interrupt) return route.continue();
      interrupt = false; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed");
    });
    await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(form.getByText(/La réponse n’a pas été confirmée/)).toBeVisible();
    await expect(form.getByLabel("Surface minimale (m²)", { exact: true })).toHaveValue("80.50");
    const rid = await saveRequirement(page); await page.unroute("**/api/v1/requirements");
    expect((await (await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).json()).total).toBe(1);
    await page.getByRole("button", { name: "Modifier la recherche", exact: true }).click();
    const edit = page.getByRole("form", { name: "Modifier la recherche", exact: true });
    await edit.getByLabel("Nom de la recherche", { exact: true }).fill("SP10 ma saisie à conserver");
    const latest = await (await page.request.get(`/api/v1/requirements/${rid}`)).json();
    const current = await staffCommand(page, `requirements/${rid}`, { title: "SP10 autre modification", intent: latest.intent, currency: latest.currency, budget_min_mad: latest.budget_min_mad, budget_max_mad: latest.budget_max_mad, budget_period: latest.budget_period, criteria: latest.criteria, expected_version: latest.version }, "PATCH");
    expect(current.status()).toBe(200);
    const conflict = page.waitForResponse(r => r.request().method() === "PATCH" && new URL(r.url()).pathname === `/api/v1/requirements/${rid}`);
    await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); expect((await conflict).status()).toBe(409);
    await expect(edit.getByRole("region", { name: "Comparaison de la recherche", exact: true })).toBeVisible();
    await expect(edit.getByLabel("Nom de la recherche", { exact: true })).toHaveValue("SP10 ma saisie à conserver");
    await edit.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click();
    await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    await expect(page.getByRole("region", { name: "Recherche sélectionnée", exact: true }).getByText("SP10 ma saisie à conserver : Location", { exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(agent); }
});
