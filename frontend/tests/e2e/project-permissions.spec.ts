import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createProperty, openProperty } from "../helpers/inventory";
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
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await page.getByLabel("Localisation (facultatif)", { exact: true }).fill("Tanger synthétique");
    await page.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(page.getByText("Tanger synthétique", { exact: true })).toBeVisible();
    await openProperty(page, pid, "Offres");
    await expect(page.getByRole("button", { name: /Créer une campagne/ })).toHaveCount(0);
    await openProperty(page, pid, "Propriétaires");
    await expect(page.getByRole("button", { name: "Modifier les propriétaires", exact: true })).toHaveCount(0);
    const project = await createDevelopment(page);
    await createBlock(page); await createFloor(page); await createType(page);
    await createUnit(page, project.id);
    await openDevelopment(page, project.id);
    await page.getByRole("link", { name: "Modifier le programme", exact: true }).click();
    await page.getByLabel("Nom du programme", { exact: true }).fill("Programme modifié par agent");
    await page.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("Présentation synthétique révisée.");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByText("Programme modifié par agent", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Offres du programme", exact: true }).click();
    await expect(page.getByRole("button", { name: /Créer une campagne/ })).toHaveCount(0);
    expect((await staffCommand(page, `developments/${project.id}/archive`, { expected_version: 1, reason: "Test synthétique" })).status()).toBe(403);
    await page.getByRole("tab", { name: "Aperçu", exact: true }).click();
    await mkdir("output/playwright/project-permissions", { recursive: true });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("link", { name: "Modifier le programme", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `output/playwright/project-permissions/agent-${width}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  } finally { await removeActor(actor); }
});

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
