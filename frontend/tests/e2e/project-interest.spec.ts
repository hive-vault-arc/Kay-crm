import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { saveDeal } from "../helpers/deals";

test("KAY catalogue interest: manual projects and lead conversion preserve exact parents without stock effects", async ({ page }) => {
  test.setTimeout(150_000);
  const actor = await createActor("agent");
  try {
    await signIn(page, actor);
    const eid = await createLead(page, "Client synthétique des projets du catalogue");
    const lead = await (await page.request.get(`/api/v1/enquiries/${eid}`)).json();
    const development = await staffCommand(page, "developments", {
      reference: "QA-INTEREST-DEV", name: "Programme synthétique d’intérêt", category: "mixed",
      location: "Localisation synthétique", briefing_text: null,
      developer_contact_id: null, developer_marketing_display: null,
    });
    expect(development.status()).toBe(200);
    const developmentId = (await development.json()).development_id;
    const property = await staffCommand(page, "properties", {
      reference: "QA-INTEREST-PROP", category: "villa", marketing_name: "Villa synthétique d’intérêt",
      location: "Localisation synthétique", area_sqm: null,
    });
    expect(property.status()).toBe(200);
    const propertyId = (await property.json()).property_id;
    await page.goto(`/deals/new?contact_id=${lead.contact.id}`);
    const form = page.getByRole("form", { name: "Nouvelle affaire", exact: true });
    await form.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH");
    await form.getByRole("checkbox", { name: "Résidence principale", exact: true }).check();
    const first = form.getByRole("region", { name: "Projet 1", exact: true });
    await expect(first.getByLabel("Programme *", { exact: true })).toBeEnabled();
    await first.getByLabel("Programme *", { exact: true }).selectOption(developmentId);
    await form.getByRole("button", { name: "Ajouter un projet (maximum 3)", exact: true }).click();
    const second = form.getByRole("region", { name: "Projet 2", exact: true });
    await second.getByLabel("Type de projet", { exact: true }).selectOption("property");
    await expect(second.getByLabel("Bien indépendant *", { exact: true })).toBeEnabled();
    await second.getByLabel("Bien indépendant *", { exact: true }).selectOption(propertyId);
    const manualId = await saveDeal(page);
    const manual = await (await page.request.get(`/api/v1/deals/${manualId}`)).json();
    expect(manual.projects.map((project: { development_id: string | null; property_id: string | null }) => [project.development_id, project.property_id]))
      .toEqual([[developmentId, null], [null, propertyId]]);
    expect(manual.active_reservation).toBeNull();
    expect(manual.offering).toBeNull();
    expect(manual.enquiry_id).toBeNull();
    expect((await (await page.request.get(`/api/v1/enquiries/${eid}`)).json()).status).toBe("new");

    await page.goto(`/leads/${eid}`);
    await page.getByRole("button", { name: "Convertir en affaire", exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: "Convertir le prospect en affaire", exact: true });
    await dialog.getByLabel("Type de projet", { exact: true }).selectOption("property");
    await expect(dialog.getByLabel("Bien indépendant *", { exact: true })).toBeEnabled();
    await dialog.getByLabel("Bien indépendant *", { exact: true }).selectOption(propertyId);
    await dialog.getByRole("checkbox", { name: "Investissement", exact: true }).check();
    await dialog.getByRole("button", { name: "Confirmer la conversion", exact: true }).click();
    await expect.poll(() => /^\/deals\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
    const convertedId = new URL(page.url()).pathname.split("/")[2];
    expect(convertedId).not.toBe(manualId);
    const converted = await (await page.request.get(`/api/v1/deals/${convertedId}`)).json();
    expect(converted.projects[0].property_id).toBe(propertyId);
    expect(converted.contact.id).toBe(lead.contact.id);
    expect(converted.enquiry_id).toBe(eid);
    expect(converted.active_reservation).toBeNull();
    expect(converted.offering).toBeNull();
    expect(converted.campaign_source).toBe(lead.campaign_source);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
