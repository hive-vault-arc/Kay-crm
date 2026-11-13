import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

// Prepared for the isolated supervisor; not executed as native evidence here.
for (const [width, level] of [[1440, "development"], [390, "property"]] as const) test(`Focused ${level} offer commands and current-version comparison at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager"), agent = await createActor("agent"), suffix = randomUUID().slice(0, 8);
  const root = level === "property" ? "properties" : "developments";
  try {
    await signIn(page, manager); await page.setViewportSize({ width, height: 900 });
    const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
    const ownerReply = await staffCommand(page, "contacts", { name: `Propriétaire offre synthétique ${suffix}`, type: "person", phones: [{ number: `+212612${digits}`, label: "Principal", is_primary: true }], emails: [], roles: ["owner"], country: "MA", nationality: "", languages: [], primary_agent_id: agent.id });
    expect(ownerReply.status()).toBe(200); const owner = await ownerReply.json();
    const response = await staffCommand(page, root, level === "property" ? { reference: `SYN-OFFER-${suffix}`, category: "house", marketing_name: "Bien synthétique d’offre", location: null, area_sqm: null } : { reference: `SYN-OFFER-${suffix}`, name: "Programme synthétique d’offre", category: "mixed", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
    expect(response.status()).toBe(200); const created = await response.json(), id = level === "property" ? created.property_id : created.development_id;
    const initial = await (await page.request.get(`/api/v1/${root}/${id}`)).json();
    const linked = await staffCommand(page, `${root}/${id}/owners`, { expected_version: initial.version, owners: [{ contact_id: owner.id, marketing_display: "Vendeur synthétique" }] }, "PUT"); expect(linked.status()).toBe(200);
    const route = level === "property" ? `/projects/properties/${id}` : `/projects/${id}`;
    await page.goto(route); await page.getByRole("button", { name: "Créer une offre de vente", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Créer une offre de vente", exact: true }), form = create.getByRole("form", { name: "Créer la campagne vente", exact: true });
    await expect(create.getByRole("form")).toHaveCount(1); await expect(create.getByRole("table")).toHaveCount(0);
    await form.getByLabel("Prix (MAD, facultatif)", { exact: true }).fill("1000000,50"); await form.getByLabel("Conditions de vente (facultatives)", { exact: true }).fill("Conditions synthétiques");
    await form.getByRole("button", { name: "Annuler", exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(discard).toBeVisible(); await discard.getByRole("button", { name: "Continuer la modification", exact: true }).click();
    await expect(form.getByLabel("Prix (MAD, facultatif)", { exact: true })).toHaveValue("1000000,50"); await form.getByRole("button", { name: "Créer la campagne", exact: true }).click(); await expect(create).toHaveCount(0);
    await page.getByRole("button", { name: "Confirmer la disponibilité vente", exact: true }).click();
    const availability = page.getByRole("dialog", { name: "Confirmer la disponibilité", exact: true }); await expect(availability.getByRole("form")).toHaveCount(1); await expect(availability.getByLabel("Prix (MAD, facultatif)", { exact: true })).toHaveCount(0);
    await availability.getByLabel("Motif de confirmation", { exact: true }).fill("Prix et propriétaire synthétiques vérifiés"); await availability.getByRole("button", { name: "Confirmer la disponibilité", exact: true }).click(); await expect(availability).toHaveCount(0);
    await page.getByRole("button", { name: "Modifier la campagne vente", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Modifier l’offre", exact: true }); await edit.getByLabel("Prix (MAD, facultatif)", { exact: true }).fill("1100000.75"); await edit.getByLabel("Motif de modification", { exact: true }).fill("Modification synthétique revue");
    const before = await (await page.request.get(`/api/v1/${root}/${id}`)).json(), offer = before.offerings.find((item: { kind: string }) => item.kind === "sale");
    const competing = await staffCommand(page, `offerings/${offer.id}`, { [level === "property" ? "expected_property_version" : "expected_development_version"]: before.version, expected_version: offer.version, price_mad: "1050000.25", currency: "MAD", price_period: null, conditions: "Autres conditions synthétiques", state: "available", reason: "Modification concurrente synthétique" }, "PATCH"); expect(competing.status()).toBe(200);
    await edit.getByRole("button", { name: "Enregistrer la campagne", exact: true }).click(); await edit.getByRole("button", { name: "Comparer l’offre actuelle", exact: true }).click();
    await expect(edit.getByLabel("Prix (MAD, facultatif)", { exact: true })).toHaveValue("1100000.75"); await edit.getByRole("button", { name: "Conserver ma saisie sur cette version", exact: true }).click(); await edit.getByRole("button", { name: "Enregistrer la campagne", exact: true }).click(); await expect(edit).toHaveCount(0);
    const after = await (await page.request.get(`/api/v1/${root}/${id}`)).json(); expect(after.offerings.find((item: { id: string }) => item.id === offer.id).price_mad).toBe("1100000.75");
    if (level === "property") {
      await page.getByRole("button", { name: "Créer une offre de location", exact: true }).click();
      const rental = page.getByRole("form", { name: "Créer la campagne location", exact: true });
      await rental.getByLabel("Conditions de location (facultatives)", { exact: true }).fill("Animaux acceptés sur accord.");
      await rental.getByRole("button", { name: "Créer la campagne", exact: true }).click();
      await expect(rental).toBeHidden();
      await expect(page.getByText("Conditions de location", { exact: true })).toBeVisible();
      await expect(page.getByText("Animaux acceptés sur accord.", { exact: true })).toBeVisible();
    }
    await clearActorContext(page); await signIn(page, agent); await page.goto(route); await expect(page.getByRole("button", { name: "Modifier la campagne vente", exact: true })).toHaveCount(0); await expect(page.getByRole("button", { name: "Confirmer la disponibilité vente", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(manager); }
});
