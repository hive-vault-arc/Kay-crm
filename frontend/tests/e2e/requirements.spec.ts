import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { beginRequirement, expectCurrentSearch, inventoryFixture, openRequirements, openShortlist, requirementCard, saveRequirement, saveShortlist } from "../helpers/requirements";

test.beforeEach(({ page }) => { page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000); });

test("SP10 AT-07/08/36: independent searches, exact rents and real unit/whole offerings", async ({ page }) => {
  test.setTimeout(240_000);
  const agent = await createActor("agent"), manager = await createActor("manager"), outsider = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP10 contact privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    await clearActorContext(page); await signIn(page, manager); const inventory = await inventoryFixture(page, contact);
    await clearActorContext(page); await signIn(page, agent); await openRequirements(page, contact);
    const form = await beginRequirement(page); await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("11999.99");
    await form.getByLabel("Importance : Surface minimale (m²)", { exact: true }).selectOption("required"); await form.getByLabel("Parking", { exact: true }).selectOption("false");
    const first = await saveRequirement(page), card = requirementCard(page, first);
    await expect(card).toContainText(/143.*999,88 MAD/); await expectCurrentSearch(page, "SP10 recherche locative synthétique");
    const detail = await (await page.request.get(`/api/v1/requirements/${first}`)).json();
    expect(detail.criteria.find((c: { key: string }) => c.key === "area_sqm").value).toBeNull(); expect(detail.criteria.find((c: { key: string }) => c.key === "parking").value).toBe(false);
    const unit = await openShortlist(page, first); await unit.getByLabel("Niveau de la cible", { exact: true }).selectOption("unit"); await unit.getByText("Filtres complémentaires", { exact: true }).click();
    await unit.getByLabel("Loyer annuel minimum (MAD)", { exact: true }).fill("143999.88"); await unit.getByLabel("Loyer annuel maximum (MAD)", { exact: true }).fill("143999.88");
    const matched = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === "/api/v1/offerings" && url.searchParams.get("target_level") === "unit" && url.searchParams.get("min_comparison_mad") === "143999.88"; });
    await unit.getByRole("button", { name: "Filtrer les offres", exact: true }).click();
    const matchedResponse = await matched; expect(matchedResponse.status()).toBe(200);
    expect((await matchedResponse.json()).items.map((item: { id: string }) => item.id)).toEqual([inventory.unitOffer]);
    await expect(unit.getByLabel("Offre d’inventaire", { exact: true }).locator("option[value]:not([value=''])")).toHaveCount(1);
    await unit.getByLabel("Offre d’inventaire", { exact: true }).selectOption(inventory.unitOffer); await unit.getByLabel("Avis sur cette offre", { exact: true }).fill("SP10 avis synthétique sur l’unité 201"); await saveShortlist(page, first);
    await expect(card.locator("[data-shortlist-id]")).toHaveCount(1); await expect(card).toContainText("SP10 avis synthétique sur l’unité 201");
    const opinion = await openShortlist(page, first, inventory.unitOffer); await opinion.getByLabel("Avis sur cette offre", { exact: true }).fill("SP10 avis synthétique actualisé"); await saveShortlist(page, first, true); await expect(card).toContainText("SP10 avis synthétique actualisé");
    const whole = await openShortlist(page, first); await whole.getByLabel("Niveau de la cible", { exact: true }).selectOption("development"); await whole.getByRole("button", { name: "Filtrer les offres", exact: true }).click(); await whole.getByLabel("Offre d’inventaire", { exact: true }).selectOption(inventory.wholeOffer); await saveShortlist(page, first);
    await expect(card.locator("[data-shortlist-id]")).toHaveCount(2);
    const after = await (await page.request.get(`/api/v1/requirements/${first}`)).json(); expect(after.shortlist.map((entry: { offering: { id: string } }) => entry.offering.id).sort()).toEqual([inventory.unitOffer, inventory.wholeOffer].sort()); expect(after.shortlist.map((entry: { offering: { annual_equivalent_mad: string } }) => entry.offering.annual_equivalent_mad)).toEqual(["143999.88", "143999.88"]);
    expect((await staffCommand(page, `requirements/${first}/shortlist`, { expected_version: after.version, offering_id: inventory.typeId, expected_offering_version: 1, feedback: null })).status()).toBe(404);
    const removal = await openShortlist(page, first, inventory.wholeOffer); await removal.getByLabel("Action sur cette sélection", { exact: true }).selectOption("remove"); await removal.getByRole("button", { name: "Retirer de la sélection", exact: true }).click(); await page.getByRole("alertdialog").getByRole("button", { name: "Confirmer le retrait", exact: true }).click(); await expect(card.locator("[data-shortlist-id]")).toHaveCount(1);
    await beginRequirement(page, "SP10 achat indépendant", "sale"); const second = await saveRequirement(page); await expectCurrentSearch(page, "SP10 achat indépendant"); await expect(requirementCard(page, second).locator("[data-shortlist-id]")).toHaveCount(0); expect((await (await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).json()).total).toBe(2);
    await page.getByRole("button", { name: "Fermer : Recherches", exact: true }).click(); await page.goto(`/leads/${lead}`); await page.getByRole("button", { name: "Recherches", exact: true }).click(); await expect(requirementCard(page, first)).toBeVisible();
    await clearActorContext(page); await signIn(page, outsider); expect((await page.request.get(`/api/v1/requirements/${first}`)).status()).toBe(404); expect((await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).status()).toBe(404); expect((await staffCommand(page, `requirements/${first}`, { title: "Refusé", intent: "rental", currency: "MAD", budget_min_mad: null, budget_max_mad: null, budget_period: "month", criteria: [], expected_version: 1 }, "PATCH")).status()).toBe(404);
    const shared = await (await page.request.get(`/api/v1/offerings?target_level=unit&development_id=${inventory.did}`)).json(); expect(shared.items.length).toBe(1); expect(JSON.stringify(shared).includes(contact)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(manager); await removeActor(outsider); }
});

test("SP10: zero rejection, interrupted committed response and explicit stale-version recovery", async ({ page }) => {
  test.setTimeout(150_000); const agent = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP10 interruption synthétique"), contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
    await openRequirements(page, contact); const form = await beginRequirement(page, "SP10 brouillon conservé"); await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("abc"); await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); await expect(form.getByLabel("Budget maximum (MAD)", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await form.getByLabel("Budget maximum (MAD)", { exact: true }).fill("11999,99"); await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("0"); await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); await expect(form.getByLabel("Surface minimale (m²)", { exact: true })).toHaveAttribute("aria-invalid", "true"); await form.getByLabel("Surface minimale (m²)", { exact: true }).fill("80.50");
    let interrupt = true; await page.route("**/api/v1/requirements", async route => { if (route.request().method() !== "POST" || !interrupt) return route.continue(); interrupt = false; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await form.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); await expect(form.getByRole("button", { name: "Réessayer la même opération", exact: true })).toBeVisible(); await expect(form.getByLabel("Surface minimale (m²)", { exact: true })).toHaveValue("80.50");
    const rid = await saveRequirement(page); await page.unroute("**/api/v1/requirements"); expect((await (await page.request.get(`/api/v1/requirements?contact_id=${contact}`)).json()).total).toBe(1); await requirementCard(page, rid).getByRole("button", { name: "Modifier", exact: true }).click();
    const edit = page.getByRole("form", { name: "Modifier la recherche", exact: true }); await edit.getByLabel("Nom de la recherche", { exact: true }).fill("SP10 ma saisie à conserver");
    const latest = await (await page.request.get(`/api/v1/requirements/${rid}`)).json(), current = await staffCommand(page, `requirements/${rid}`, { title: "SP10 autre modification", intent: latest.intent, currency: latest.currency, budget_min_mad: latest.budget_min_mad, budget_max_mad: latest.budget_max_mad, budget_period: latest.budget_period, criteria: latest.criteria, expected_version: latest.version }, "PATCH"); expect(current.status()).toBe(200);
    const conflict = page.waitForResponse(r => r.request().method() === "PATCH" && new URL(r.url()).pathname === `/api/v1/requirements/${rid}`); await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); expect((await conflict).status()).toBe(409); await edit.getByRole("button", { name: "Comparer la version actuelle", exact: true }).click(); await expect(edit.getByRole("region", { name: "Comparaison de la recherche", exact: true })).toBeVisible(); await expect(edit.getByLabel("Nom de la recherche", { exact: true })).toHaveValue("SP10 ma saisie à conserver"); await edit.getByRole("button", { name: "Conserver ma saisie avec cette version", exact: true }).click(); await edit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click(); await expect(requirementCard(page, rid).getByRole("heading", { name: "SP10 ma saisie à conserver", exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(agent); }
});
