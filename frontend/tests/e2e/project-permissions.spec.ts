import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createCampaign, createProperty, inventorySection, openProperty, propertyEditStep, savePropertyEdit } from "../helpers/inventory";
import { createDevelopment, createBlock, createFloor, createType, createUnit, openDevelopment } from "../helpers/developments";
import { createLead, staffCommand } from "../helpers/leads";

test("Project permissions: agent creates and edits projects, structure, units and standalone facts", async ({ page }) => {
  test.setTimeout(240_000);
  const actor = await createActor("agent");
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  try {
    await signIn(page, actor);
    const pid = await createProperty(page, "land");
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await propertyEditStep(page, 1);
    await page.getByLabel("Repère ou localisation courte (facultatif)", { exact: true }).fill("Tanger synthétique");
    await savePropertyEdit(page);
    await expect(page.getByText("Tanger synthétique", { exact: true })).toBeVisible();
    await openProperty(page, pid, "Offres");
    await expect(inventorySection(page, "Offres").getByRole("button", { name: "Créer une offre de vente", exact: true })).toBeEnabled();
    await openProperty(page, pid, "Propriétaires");
    await expect(inventorySection(page, "Propriétaires").getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    const project = await createDevelopment(page);
    await createBlock(page); await createFloor(page); await createType(page);
    const unit = await createUnit(page, project.id);
    const unitBefore = await (await page.request.get(`/api/v1/properties/${unit.id}`)).json();
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    const placement = page.getByRole("group", { name: "Rattachement de l’unité", exact: true });
    await expect(placement).toHaveAttribute("disabled", "");
    await expect(placement.getByRole("combobox")).toHaveCount(3);
    for (const select of await placement.getByRole("combobox").all()) await expect(select).toBeDisabled();
    await propertyEditStep(page, 2);
    await page.locator("#property-area_sqm").fill("82");
    await savePropertyEdit(page);
    await expect(page.getByRole("link", { name: "Modifier", exact: true })).toBeVisible();
    const unitAfter = await (await page.request.get(`/api/v1/properties/${unit.id}`)).json();
    expect(unitAfter.area_sqm).toBe("82.00");
    expect(unitAfter.development_id).toBe(unitBefore.development_id);
    expect(unitAfter.floor_id).toBe(unitBefore.floor_id);
    expect(unitAfter.unit_type_id).toBe(unitBefore.unit_type_id);
    expect(unitAfter.offerings.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== "target")))).toEqual(unitBefore.offerings.map((item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).filter(([key]) => key !== "target"))));
    expect(unitAfter.offerings.every((item: { target: { version: number } }) => item.target.version === unitAfter.version)).toBe(true);
    await openDevelopment(page, project.id);
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await page.getByLabel("Nom du programme", { exact: true }).fill("Programme modifié par agent");
    await page.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("Présentation synthétique révisée.");
    const [saveResponse] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/developments/${project.id}` && response.request().method() === "PATCH", { timeout: 5000 }),
      page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click(),
    ]);
    expect(saveResponse.status()).toBe(200);
    await expect(page.getByText("Programme modifié par agent", { exact: true })).toBeVisible();
    const saved = await (await page.request.get(`/api/v1/developments/${project.id}`)).json();
    expect(saved.name).toBe("Programme modifié par agent");
    expect(saved.briefing_text).toBe("Présentation synthétique révisée.");
    await inventorySection(page, "Offres du programme").scrollIntoViewIfNeeded();
    await expect(inventorySection(page, "Offres du programme").getByRole("button", { name: "Créer une offre de vente", exact: true })).toBeEnabled();
    expect((await staffCommand(page, `developments/${project.id}/archive`, { expected_version: 1, reason: "Test synthétique" })).status()).toBe(403);
    await page.getByRole("tab", { name: "Aperçu", exact: true }).click();
    await mkdir("output/playwright/project-permissions", { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("link", { name: "Modifier", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `output/playwright/project-permissions/agent-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  } finally { await removeActor(actor); }
});

for (const [root, width] of [["properties", 390], ["developments", 1440]] as const) {
  test(`Project permissions: a different agent edits the shared ${root} offer at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    const creator = await createActor("agent"), editor = await createActor("agent");
    try {
      await page.setViewportSize({ width, height: 900 });
      await signIn(page, creator);
      const id = root === "properties" ? await createProperty(page, "house") : (await createDevelopment(page)).id;
      await createCampaign(page, "rental", "16000");
      const path = new URL(page.url()).pathname;
      await clearActorContext(page);
      await signIn(page, editor);
      await page.goto(path);
      await expect(page.getByRole("link", { name: "Modifier", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Modifier la campagne location", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Modifier l’offre", exact: true });
      const price = dialog.getByLabel("Prix (MAD, facultatif)", { exact: true });
      await expect(price).toBeFocused();
      await price.fill("16002");
      await dialog.getByLabel("Période du tarif d’origine", { exact: true }).selectOption("year");
      await dialog.getByLabel("Conditions de location (facultatives)", { exact: true }).fill("Conditions révisées par le second agent");
      await dialog.getByLabel("Motif de modification", { exact: true }).fill("Tarif mis à jour");
      await dialog.getByRole("button", { name: "Enregistrer la campagne", exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByText("Conditions révisées par le second agent", { exact: true })).toBeVisible();

      await createCampaign(page, "sale", "900000");
      const target = await (await page.request.get(`/api/v1/${root}/${id}`)).json();
      const rental = target.offerings.find((offer: { kind: string }) => offer.kind === "rental");
      expect(rental).toMatchObject({ price_mad: "16002.00", price_period: "year", state: "draft" });
      const history = await (await page.request.get(`/api/v1/${root}/${id}/history`)).json();
      expect(history.items).toEqual(expect.arrayContaining([
        expect.objectContaining({ offering_id: rental.id, action: "offerings.created", actor: expect.objectContaining({ id: creator.id }) }),
        expect.objectContaining({ offering_id: rental.id, action: "offerings.updated", actor: expect.objectContaining({ id: editor.id }) }),
      ]));
      await expect(page.getByRole("button", { name: "Confirmer la disponibilité location", exact: true })).toHaveCount(0);
      expect((await staffCommand(page, `${root}/${id}/confirm-availability`, {
        expected_version: target.version, offering_id: rental.id, expected_offering_version: rental.version, reason: "Vérification synthétique",
      })).status()).toBe(403);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    } finally { await clearActorContext(page); await removeActor(editor); await removeActor(creator); }
  });
}

test("Project permissions: agent edits shared facts without clearing a protected developer", async ({ page }) => {
  test.setTimeout(180_000);
  const manager = await createActor("manager"); const owner = await createActor("agent"); const agent = await createActor("agent");
  try {
    await signIn(page, owner);
    const lead = await createLead(page, "SP-PERM promoteur privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await clearActorContext(page); await signIn(page, manager);
    const project = await createDevelopment(page);
    const assigned = await staffCommand(page, `developments/${project.id}`, { reference: project.reference, name: "Programme synthétique", category: "mixed", location: null, briefing_text: null, developer_marketing_display: null, expected_version: 1, developer_contact_id: contact.id }, "PATCH");
    expect(assigned.status()).toBe(200);
    await clearActorContext(page); await signIn(page, agent);
    await page.goto(`${project.path}/edit`);
    await expect(page.getByLabel("Nom du programme", { exact: true })).toHaveValue("Programme synthétique");
    await expect(page.getByText("SP-PERM promoteur privé synthétique", { exact: true })).toHaveCount(0);
    await page.getByLabel("Nom du programme", { exact: true }).fill("Programme partagé révisé");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByText("Programme partagé révisé", { exact: true })).toBeVisible();
    const shared = await (await page.request.get(`/api/v1/developments/${project.id}`)).json();
    expect(shared.developer.contact).toBeNull();
    expect((await page.request.get(`/api/v1/contacts/${contact.id}`)).status()).toBe(404);
    await clearActorContext(page); await signIn(page, manager);
    const preserved = await (await page.request.get(`/api/v1/developments/${project.id}`)).json();
    expect(preserved.developer.contact.id).toBe(contact.id);
    expect(preserved.name).toBe("Programme partagé révisé");
  } finally { await removeActor(manager); await removeActor(owner); await removeActor(agent); }
});
