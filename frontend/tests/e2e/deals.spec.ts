import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext, changeActor } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { inventoryFixture, openRequirements } from "../helpers/requirements";
import { convertLead, dealBody, fillDeal, saveDeal, skipStage } from "../helpers/deals";

test.beforeEach(({ page }) => { page.setDefaultTimeout(25_000); page.setDefaultNavigationTimeout(30_000); });
test("Qualified conversion from Lead, accepted proposal and stage skipping", async ({ page }) => {
  test.setTimeout(150_000); const agent = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP11 contact de création explicite"); const before = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    const id = await convertLead(page);
    const converted = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    expect(converted.status).toBe("converted"); expect(converted.contact.id).toBe(before.contact.id); expect(converted.converted_deal_id).toBe(id);
    const proposal = page.getByRole("form", { name: "Nouvelle proposition client", exact: true });
    await proposal.getByLabel("Montant proposé (MAD)", { exact: true }).fill("11999,99"); await proposal.getByLabel("Période du prix proposé", { exact: true }).selectOption("month"); await proposal.getByLabel("Statut de la proposition", { exact: true }).selectOption("accepted"); await proposal.getByLabel("Conditions proposées", { exact: true }).fill("SP11 proposition acceptée sans clôture");
    await proposal.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click();
    await expect(page.getByRole("region", { name: "Propositions client", exact: true }).getByText(/Comparaison annuelle exacte.*143.*999,88 MAD/)).toBeVisible();
    expect((await (await page.request.get(`/api/v1/deals/${id}`)).json()).stage).toBe("new");
    await skipStage(page); await expect(page.getByRole("listitem").filter({ hasText: "Documents: étape actuelle" })).toHaveAttribute("aria-current", "step");
    const history = await (await page.request.get(`/api/v1/deals/${id}/history`)).json(); expect(history.items.map((r: { action: string }) => r.action)).toEqual(["transition", "customer_offer.created", "created"]); expect(history.items.every((r: { actor: { id: string } }) => r.actor.id === agent.id)).toBe(true);
    for (const stage of ["reserved", "won", "lost", "cancelled", "imaginary"]) expect((await staffCommand(page, `deals/${id}/transition`, { stage, expected_version: 3, reason: "SP11 interdit" })).status()).toBe(422);
    expect((await staffCommand(page, `deals/${id}`, { ...dealBody(before.contact.id), expected_version: 3, stage: "won" }, "PATCH")).status()).toBe(422);
    await page.goto(`/contacts/${before.contact.id}`); await page.getByRole("tab", { name: "Historique", exact: true }).click(); await expect(page.getByRole("link", { name: "Voir l’affaire liée", exact: true })).toHaveCount(4);
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("SP11: list creation, numbered pages, scoped counts, filters and ID-only columns", async ({ page }) => {
  test.setTimeout(180_000); const agent = await createActor("agent"); const outsider = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP11 contact du tableau"); const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
    await page.goto("/deals"); await expect(page.getByText(/Aucune affaire sur cette page/)).toBeVisible(); await page.getByRole("link", { name: "Créer une affaire", exact: true }).click(); await page.getByLabel("Client de l’affaire", { exact: true }).selectOption("existing"); await page.getByRole("button", { name: "Choisir SP11 contact du tableau", exact: true }).click(); await fillDeal(page, "SP11 tableau 00"); const first = await saveDeal(page);
    const derivedTitle = "SP11 contact du tableau · SP11 tableau 00";
    await expect(page.getByRole("heading", { name: derivedTitle, exact: true })).toBeVisible();
    for (let i = 1; i <= 10; i++) expect((await staffCommand(page, "deals", dealBody(contact, `SP11 tableau ${String(i).padStart(2, "0")}`))).status()).toBe(200);
    await page.goto("/deals"); await page.getByText("Filtres avancés", { exact: true }).click(); await page.getByText("Affichage et archivage", { exact: true }).click(); await page.getByLabel("Lignes par page", { exact: true }).selectOption("10"); await page.getByLabel("Trier par", { exact: true }).selectOption("title");
    await expect(page.getByText("11 affaires", { exact: true }).and(page.getByRole("status"))).toBeVisible(); await expect(page.getByRole("row")).toHaveCount(11); await page.getByRole("button", { name: "Suivant", exact: true }).click(); await expect(page.getByRole("row")).toHaveCount(2);
    await page.getByRole("button", { name: "Colonnes", exact: true }).click(); await page.getByRole("checkbox", { name: "Qualification", exact: true }).uncheck(); await page.keyboard.press("Escape"); await expect(page.getByRole("columnheader", { name: "Qualification", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("kay:deals:columns:v1")!))).toEqual({ version: 1, list: "deals", visibleColumns: ["name", "status", "projects", "budget", "responsibleAgent", "updatedAt"] });
    await page.getByLabel("Rechercher une affaire, un contact ou une action", { exact: true }).fill("SP11 tableau 00"); await expect(page.getByText("1 affaire", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    await page.getByRole("checkbox", { name: "Documents", exact: true }).check(); await expect(page.getByText("0 affaire", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    await clearActorContext(page); await signIn(page, outsider); expect((await page.request.get(`/api/v1/deals/${first}`)).status()).toBe(404); const list = await (await page.request.get("/api/v1/deals")).json(); expect(list.total).toBe(0); expect(Object.values(list.stage_counts).every(n => n === 0)).toBe(true); await page.goto(`/deals/${first}`); await expect(page.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await expect(page.getByText(derivedTitle, { exact: true })).toHaveCount(0);
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(outsider); }
});

test("SP11: committed-response retry, preserved draft and explicit stale-version recovery", async ({ page }) => {
  test.setTimeout(180_000); const agent = await createActor("agent");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP11 contact de reprise"); const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
    await page.goto(`/deals/new?contact_id=${contact}`); const form = await fillDeal(page, "SP11 brouillon conservé"); let interrupt = true;
    await page.route("**/api/v1/deals", async route => { if (route.request().method() !== "POST" || !interrupt) return route.continue(); interrupt = false; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await form.getByRole("button", { name: "Créer l’affaire", exact: true }).click(); await expect(form.getByText(/Le service local est indisponible/)).toBeVisible(); await expect(form.getByLabel("Nom du projet externe *", { exact: true })).toHaveValue("SP11 brouillon conservé"); const id = await saveDeal(page); await page.unroute("**/api/v1/deals"); expect((await (await page.request.get(`/api/v1/deals?contact_id=${contact}`)).json()).total).toBe(1);
    await page.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true }).click(); const edit = page.getByRole("form", { name: "Modifier l’affaire", exact: true }); await edit.getByLabel("Prochaine action", { exact: true }).fill("SP11 saisie locale conservée");
    expect((await staffCommand(page, `deals/${id}/transition`, { expected_version: 1, stage: "negotiation", reason: "SP11 autre session" })).status()).toBe(200);
    await edit.getByRole("button", { name: "Enregistrer l’affaire", exact: true }).click(); await expect(edit.getByText(/Cette affaire ou cette proposition a changé/)).toBeVisible(); await expect(edit.getByLabel("Prochaine action", { exact: true })).toHaveValue("SP11 saisie locale conservée"); await edit.getByRole("button", { name: "Charger la version actuelle", exact: true }).click(); await expect(edit.getByLabel("Prochaine action", { exact: true })).toHaveValue("SP11 rappeler le contact"); await edit.getByLabel("Prochaine action", { exact: true }).fill("SP11 saisie locale conservée"); await edit.getByRole("button", { name: "Enregistrer l’affaire", exact: true }).click(); await expect(page.getByText("Affaire enregistrée.", { exact: true })).toBeVisible(); expect((await (await page.request.get(`/api/v1/deals/${id}`)).json()).next_action).toBe("SP11 saisie locale conservée");
    await changeActor(agent, "role"); expect((await page.request.get(`/api/v1/deals/${id}`)).status()).toBe(401);
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("SP11: permitted requirement/exact offering prefill, stale target and proposal versions", async ({ page }) => {
  test.setTimeout(240_000); const agent = await createActor("agent"); const manager = await createActor("manager");
  try {
    await signIn(page, agent); const lead = await createLead(page, "SP11 contact de contexte"); const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
    const requirement = await staffCommand(page, "requirements", { contact_id: contact, title: "SP11 recherche à lier", intent: "rental", currency: "MAD", budget_min_mad: null, budget_max_mad: null, budget_period: "month", criteria: [] }); expect(requirement.status()).toBe(200); const rid = (await requirement.json()).id;
    await clearActorContext(page); await signIn(page, manager); const inventory = await inventoryFixture(page, contact); await clearActorContext(page); await signIn(page, agent);
    const original = await (await page.request.get(`/api/v1/offerings?offering_id=${inventory.unitOffer}&state=all`)).json(); expect(original.total).toBe(1);
    await page.goto(`/deals/new?contact_id=${contact}&requirement_id=${rid}&offering_id=${inventory.unitOffer}`); const form = await fillDeal(page, "SP11 cible physique précise"); await form.getByText("Recherche et offre d’inventaire liées (facultatif)", { exact: true }).click(); await expect(page.getByRole("heading", { name: `${inventory.reference}-U201 : Unité physique`, exact: true })).toBeVisible(); const id = await saveDeal(page); const deal = await (await page.request.get(`/api/v1/deals/${id}`)).json(); expect(deal.requirement_id).toBe(rid); expect(deal.offering.id).toBe(inventory.unitOffer);
    const proposal = page.getByRole("form", { name: "Nouvelle proposition client", exact: true }); await proposal.getByLabel("Montant proposé (MAD)", { exact: true }).fill("0"); await proposal.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await expect(proposal.getByText(/Saisissez un montant positif/)).toBeVisible();
    await proposal.getByLabel("Montant proposé (MAD)", { exact: true }).fill("143999.88"); await proposal.getByLabel("Période du prix proposé", { exact: true }).selectOption("year"); await proposal.getByRole("button", { name: "Enregistrer la proposition", exact: true }).click(); await expect(page.getByRole("region", { name: "Propositions client", exact: true }).getByText(/143.*999,88 MAD \/ an/)).toBeVisible();
    await page.getByRole("button", { name: /^Modifier la proposition du/ }).click(); const edit = page.getByRole("form", { name: "Modifier une proposition client", exact: true }); await edit.getByLabel("Statut de la proposition", { exact: true }).selectOption("accepted"); await edit.getByRole("button", { name: "Enregistrer la proposition modifiée", exact: true }).click(); await expect(page.getByRole("region", { name: "Propositions client", exact: true }).getByText(/: Acceptée/)).toBeVisible();
    expect(await (await page.request.get(`/api/v1/offerings?offering_id=${inventory.unitOffer}&state=all`)).json()).toEqual(original); expect((await (await page.request.get(`/api/v1/deals/${id}`)).json()).stage).toBe("new");
    expect((await page.request.get("/api/v1/deals?stage=new&stage=documents")).status()).toBe(422); expect((await page.request.get("/api/v1/deals?unexpected=1")).status()).toBe(422); expect((await staffCommand(page, `deals/${id}/unimplemented-future-command`, { expected_version: 3 })).status()).toBe(404); expect((await staffCommand(page, "deals", { ...dealBody(contact), offering_id: randomUUID(), expected_offering_version: 1 })).status()).toBe(404);
    await openRequirements(page, contact);
    await page.getByRole("button", { name: "SP11 recherche à lier (location, 0 offre(s))", exact: true }).click();
    await page.getByRole("button", { name: "Modifier la recherche", exact: true }).click();
    const researchEdit = page.getByRole("form", { name: "Modifier la recherche", exact: true });
    await researchEdit.getByLabel("Type de recherche", { exact: true }).selectOption("sale");
    const researchResponse = page.waitForResponse(r => r.request().method() === "PATCH" && new URL(r.url()).pathname === `/api/v1/requirements/${rid}`);
    await researchEdit.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
    const conflict = await researchResponse; expect(conflict.status()).toBe(409); expect((await conflict.json()).error.code).toBe("REQUIREMENT_INTENT_IN_USE");
    await expect(researchEdit.getByText(/Une sélection ou une affaire liée nécessite le type actuel/)).toBeVisible();
    await expect(researchEdit.getByLabel("Type de recherche", { exact: true })).toHaveValue("sale");
    const unchangedResearch = await (await page.request.get(`/api/v1/requirements/${rid}`)).json();
    expect(unchangedResearch.version).toBe(1); expect(unchangedResearch.intent).toBe("rental");
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(manager); }
});
