import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createDevelopment, createBlock, createFloor, createType, createUnit, openDevelopment } from "../helpers/developments";
import { createLead, staffCommand } from "../helpers/leads";
import { addOwners, createCampaign, confirmCampaign } from "../helpers/inventory";
import { apiProcess } from "../helpers/api-process";

test.beforeEach(({ page }) => { page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000); });

// Defined before implementation: AT-31/32/35/36/41 on the real isolated stack.
test("SP08: mixed hierarchy, reused template, independent units and safe optional briefing", async ({ page }) => {
  test.setTimeout(240_000);
  const manager = await createActor("manager");
  const agent = await createActor("agent");
  try {
    await signIn(page, manager);
    await page.goto("/projects/new");
    const reference = `SP08-${randomUUID().slice(0, 8)}`.toUpperCase();
    await page.getByLabel("Référence du programme", { exact: true }).fill(reference);
    await page.getByLabel("Nom du programme", { exact: true }).fill("Programme mixte synthétique");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
    const path = new URL(page.url()).pathname;
    await page.getByRole("tab", { name: "Unités", exact: true }).click();
    await expect(page.getByLabel("Disponibilité des unités", { exact: true })).toHaveValue("available");
    await expect(page.getByText("0 unité(s) correspondante(s).", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, agent); await page.goto(path);
    await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier le programme", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Présentation", exact: true }).click();
    await expect(page.getByText("Aucune présentation renseignée.", { exact: true })).toBeVisible();
    await page.goto(`${path}/edit`);
    await expect(page.getByRole("form", { name: "Modifier le programme", exact: true })).toBeVisible();
  } finally { await removeActor(manager); await removeActor(agent); }
});

test("SP08 AT-31/32/35/36/41: actual mixed units, template edit, filters, whole offering and protected identities", async ({ page }) => {
  test.setTimeout(300_000);
  const manager = await createActor("administrator"); const unrelated = await createActor("agent"); const owner = await createActor("agent");
  try {
    await signIn(page, owner);
    const lead = await createLead(page, "SP08 propriétaire privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await clearActorContext(page); await signIn(page, manager);
    const development = await createDevelopment(page);
    await createBlock(page); await createFloor(page); await createFloor(page, "B1", "F3"); await createBlock(page, "B2"); await createType(page);
    const first = await createUnit(page, development.id);
    await addOwners(page, ["SP08 propriétaire privé synthétique"]); await createCampaign(page, "sale", "900000,01"); await confirmCampaign(page, "sale");
    const second = await createUnit(page, development.id, "F3", "apartment", "81,50");
    await createCampaign(page, "sale", "950000,02");
    const land = await createUnit(page, development.id, "", "land", "250,00");
    await openDevelopment(page, development.id, "Unités");
    await expect(page.getByText("1 unité(s) correspondante(s).", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: first.reference, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: second.reference, exact: true })).toHaveCount(0);
    await page.getByLabel("Disponibilité des unités", { exact: true }).selectOption("all");
    await page.getByRole("button", { name: "Filtrer les unités", exact: true }).click();
    await expect(page.getByText("3 unité(s) correspondante(s).", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: land.reference, exact: true })).toBeVisible();
    await page.getByText("Structure et archivage", { exact: true }).click();
    await page.getByLabel("Bloc des unités", { exact: true }).selectOption({ label: "B1 · Bloc synthétique B1" });
    await page.getByLabel("Étage des unités", { exact: true }).selectOption({ label: "F3 · Étage synthétique F3" });
    await page.getByLabel("Type réutilisable des unités", { exact: true }).selectOption({ label: "T2 · T2 / 80 m²" });
    await page.getByRole("button", { name: "Filtrer les unités", exact: true }).click();
    await expect(page.getByText("1 unité(s) correspondante(s).", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: second.reference, exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Types réutilisables", exact: true }).click();
    await page.getByRole("button", { name: "Modifier T2", exact: true }).click();
    await page.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).fill("95,00");
    await page.getByRole("button", { name: "Enregistrer le type réutilisable", exact: true }).click();
    await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
    const one = await (await page.request.get(`/api/v1/properties/${first.id}`)).json(); const two = await (await page.request.get(`/api/v1/properties/${second.id}`)).json();
    expect(one.area_sqm).toBe("80.00"); expect(two.area_sqm).toBe("81.50"); expect(one.offerings[0].state).toBe("available"); expect(two.offerings[0].state).toBe("draft"); expect(one.offerings[0].price_mad).toBe("900000.01"); expect(two.offerings[0].price_mad).toBe("950000.02");
    await page.getByRole("link", { name: "Modifier le programme", exact: true }).click();
    await page.getByLabel("Rechercher un contact accessible", { exact: true }).fill("SP08 propriétaire privé synthétique");
    await page.getByRole("button", { name: "Rechercher le contact", exact: true }).click();
    await page.getByRole("button", { name: "Choisir SP08 propriétaire privé synthétique", exact: true }).click();
    await page.getByLabel("Libellé commercial du promoteur (facultatif)", { exact: true }).fill("SP08 promoteur autorisé");
    await page.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("<script>window.sp08Unsafe = true</script>\nPrésentation synthétique partagée");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("heading", { name: development.reference, exact: true })).toBeVisible();
    await addOwners(page, ["SP08 propriétaire privé synthétique"], "Offres du programme");
    await page.getByRole("tab", { name: "Offres du programme", exact: true }).click();
    await page.getByRole("button", { name: "Créer une campagne vente", exact: true }).click();
    await page.getByLabel("Prix de vente en MAD (facultatif)", { exact: true }).fill("25000000,01");
    await page.getByRole("button", { name: "Créer la campagne", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Offres du programme", exact: true }).click();
    await page.getByLabel("Motif de la confirmation de disponibilité", { exact: true }).fill("SP08 disponibilité confirmée synthétiquement");
    await page.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click();
    await expect(page.getByText("Inventaire enregistré.", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, unrelated); await openDevelopment(page, development.id, "Présentation");
    await expect(page.getByText("<script>window.sp08Unsafe = true</script>\nPrésentation synthétique partagée", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => "sp08Unsafe" in window)).toBe(false);
    await clearActorContext(page); await signIn(page, manager); await openDevelopment(page, development.id);
    await page.getByRole("link", { name: "Modifier le programme", exact: true }).click();
    await page.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("heading", { name: development.reference, exact: true })).toBeVisible();
    const current = await (await page.request.get(`/api/v1/developments/${development.id}`)).json();
    expect(current.briefing_text).toBeNull(); expect(current.offerings[0].state).toBe("available");
    await clearActorContext(page); await signIn(page, unrelated); await openDevelopment(page, development.id);
    await expect(page.getByText("SP08 promoteur autorisé", { exact: true })).toBeVisible();
    const safe = await (await page.request.get(`/api/v1/developments/${development.id}`)).json();
    expect(safe.developer.contact).toBeNull(); expect(safe.owners[0].contact).toBeNull(); expect(JSON.stringify(safe).includes(contact.id)).toBe(false);
    expect((await page.request.get(`/api/v1/contacts/${contact.id}`)).status()).toBe(404);
    expect((await staffCommand(page, `developments/${development.id}/blocks`, { expected_version: safe.version, code: "SP08-AGENT", label: "Bloc synthétique ajouté par l’agent", display_order: 0 })).status()).toBe(200);
    const afterBlock = await (await page.request.get(`/api/v1/developments/${development.id}`)).json();
    expect(afterBlock.developer.contact).toBeNull(); expect(afterBlock.owners[0].contact).toBeNull(); expect(JSON.stringify(afterBlock).includes(contact.id)).toBe(false);
    expect((await staffCommand(page, `developments/${development.id}/owners`, { expected_version: afterBlock.version, owners: [] }, "PUT")).status()).toBe(403);
    await openDevelopment(page, development.id, "Unités"); await expect(page.getByRole("link", { name: first.reference, exact: true })).toBeVisible();
    await page.getByRole("link", { name: first.reference, exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Fil d’Ariane de l’unité", exact: true })).toContainText(development.reference);
  } finally { await removeActor(manager); await removeActor(owner); await removeActor(unrelated); }
});

test("SP08 AT-23: development draft survives lost acknowledgement, outage and explicit version comparison", async ({ page }) => {
  test.setTimeout(180_000);
  const manager = await createActor("manager"); let stopped = false;
  try {
    await signIn(page, manager); const development = await createDevelopment(page);
    await page.getByRole("link", { name: "Modifier le programme", exact: true }).click();
    await page.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("SP08 accusé interrompu");
    await page.route(`**/api/v1/developments/${development.id}`, async route => { if (route.request().method() === "PATCH") { await route.fetch(); await route.abort("failed"); } else await route.continue(); }, { times: 1 });
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await expect(page.getByLabel("Présentation partagée (facultative)", { exact: true })).toHaveValue("SP08 accusé interrompu");
    await apiProcess("stop"); stopped = true;
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await apiProcess("start"); stopped = false;
    await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("heading", { name: development.reference, exact: true })).toBeVisible();
    const result = await (await page.request.get(`/api/v1/developments/${development.id}`)).json(); expect(result.version).toBe(2);
    await page.getByRole("link", { name: "Modifier le programme", exact: true }).click();
    await page.getByLabel("Nom du programme", { exact: true }).fill("SP08 saisie conservée");
    expect((await staffCommand(page, `developments/${development.id}`, { reference: result.reference, name: "SP08 changement concurrent", category: result.category, location: result.location, briefing_text: result.briefing_text, developer_contact_id: null, developer_marketing_display: null, expected_version: result.version }, "PATCH")).status()).toBe(200);
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByRole("region", { name: "Version actuelle du programme", exact: true })).toContainText("SP08 changement concurrent");
    await expect(page.getByLabel("Nom du programme", { exact: true })).toHaveValue("SP08 saisie conservée");
    await page.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click();
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByText("SP08 saisie conservée", { exact: true })).toBeVisible();
  } finally { if (stopped) await apiProcess("start"); await removeActor(manager); }
});

test("SP08 AT-23/31: incomplete apartment input is retained and invalid template input is focused", async ({ page }) => {
  const manager = await createActor("manager");
  try {
    await signIn(page, manager); const development = await createDevelopment(page, "apartment");
    await page.getByRole("tab", { name: "Unités", exact: true }).click();
    await page.getByRole("button", { name: "Créer une unité physique", exact: true }).click();
    await page.getByLabel("Référence du bien", { exact: true }).fill("SP08-APARTMENT-INCOMPLETE");
    await expect(page.getByLabel("Catégorie", { exact: true })).toHaveValue("apartment");
    const rejectedUnit = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/properties" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Créer l’unité", exact: true }).click();
    expect((await rejectedUnit).status()).toBe(422);
    await expect(page.getByRole("alert").filter({ hasText: "Un appartement exige les deux" })).toBeVisible();
    await expect(page.getByLabel("Référence du bien", { exact: true })).toHaveValue("SP08-APARTMENT-INCOMPLETE");
    await page.getByRole("tab", { name: "Types réutilisables", exact: true }).click();
    await page.getByRole("button", { name: "Créer un type réutilisable", exact: true }).click();
    await page.getByLabel("Code du type réutilisable", { exact: true }).fill("T2");
    await page.getByLabel("Libellé du type réutilisable", { exact: true }).fill("T2 synthétique");
    await page.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Enregistrer le type réutilisable", exact: true }).click();
    await expect(page.getByLabel("Surface par défaut en m² (facultative)", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Surface par défaut en m² (facultative)", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect((await (await page.request.get(`/api/v1/developments/${development.id}/inventory?state=all`)).json()).total).toBe(0);
    const physicalOffers = await page.request.get("/api/v1/offerings?target_level=unit");
    expect(physicalOffers.status()).toBe(200);
    expect((await physicalOffers.json()).items.every((o: { target: { level: string } }) => o.target.level === "unit")).toBe(true);
    expect((await page.request.get("/api/v1/offerings?target_level=unit_type")).status()).toBe(422);
  } finally { await removeActor(manager); }
});

test("SP08 AT-23/32: editor identity follows the selected block, floor and type", async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager); await createDevelopment(page);
    await createBlock(page); await createBlock(page, "B2"); await createFloor(page); await createFloor(page, "B1", "F3"); await createType(page); await createType(page, "T3", "T3 synthétique");
    await page.getByRole("tab", { name: "Blocs et étages", exact: true }).click();
    await page.getByRole("button", { name: "Modifier B1", exact: true }).click();
    await page.getByLabel("Libellé du bloc", { exact: true }).fill("SP08 brouillon B1 non enregistré");
    await page.getByRole("button", { name: "Modifier B2", exact: true }).click();
    await expect(page.getByLabel("Code du bloc", { exact: true })).toHaveValue("B2");
    await expect(page.getByLabel("Libellé du bloc", { exact: true })).toHaveValue("Bloc synthétique B2");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await page.getByRole("button", { name: "Explorer B1", exact: true }).click();
    await page.getByRole("button", { name: "Modifier F2", exact: true }).click();
    await page.getByLabel("Libellé de l’étage", { exact: true }).fill("SP08 brouillon F2 non enregistré");
    await page.getByRole("button", { name: "Modifier F3", exact: true }).click();
    await expect(page.getByLabel("Code de l’étage", { exact: true })).toHaveValue("F3");
    await expect(page.getByLabel("Libellé de l’étage", { exact: true })).toHaveValue("Étage synthétique F3");
    await page.getByRole("tab", { name: "Types réutilisables", exact: true }).click();
    await page.getByRole("button", { name: "Modifier T2", exact: true }).click();
    await page.getByLabel("Surface par défaut en m² (facultative)", { exact: true }).fill("999");
    await page.getByRole("button", { name: "Modifier T3", exact: true }).click();
    await expect(page.getByLabel("Code du type réutilisable", { exact: true })).toHaveValue("T3");
    await expect(page.getByLabel("Surface par défaut en m² (facultative)", { exact: true })).toHaveValue("80.00");
    await page.getByRole("button", { name: "Créer un type réutilisable", exact: true }).click();
    await expect(page.getByLabel("Code du type réutilisable", { exact: true })).toHaveValue("");
  } finally { await removeActor(manager); }
});
