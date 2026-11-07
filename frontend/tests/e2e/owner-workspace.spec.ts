import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

// Prepared for the isolated supervisor, not executed as native evidence here.
for (const width of [1440, 390]) test(`Selected owner directory and quick drawer preserve canonical membership at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await createActor("agent"), manager = await createActor("manager"), suffix = randomUUID().slice(0, 8);
  const name = `Propriétaire lié synthétique ${suffix}`, changedName = `${name} modifié`, digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  try {
    await signIn(page, manager); await page.setViewportSize({ width, height: 900 });
    const response = await staffCommand(page, "contacts", { name, type: "person", phones: [{ number: `+212612${digits}`, label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", nationality: "", languages: [], primary_agent_id: agent.id });
    expect(response.status()).toBe(200); const contact = await response.json();
    const created = await staffCommand(page, "properties", { reference: `SYN-OWNER-${suffix}`, category: "house", marketing_name: "Bien lié synthétique", location: null, area_sqm: null }); expect(created.status()).toBe(200);
    const { property_id: propertyId } = await created.json(), property = await (await page.request.get(`/api/v1/properties/${propertyId}`)).json();
    const linked = await staffCommand(page, `properties/${propertyId}/owners`, { expected_version: property.version, owners: [{ contact_id: contact.id, marketing_display: "Vendeur synthétique partagé" }] }, "PUT"); expect(linked.status()).toBe(200);
    await signIn(page, agent);
    let detailReads = 0;
    page.on("request", request => { if (request.method() === "GET" && new URL(request.url()).pathname === `/api/v1/contacts/${contact.id}`) detailReads++; });
    await page.goto("/owners");
    const row = page.getByRole("link", { name, exact: true }); await expect(row).toBeVisible(); expect(detailReads).toBe(0);
    await row.click();
    const preview = page.locator('.kay-record-drawer[role="dialog"]'); await expect(preview.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(preview.getByText("Bien lié synthétique", { exact: true })).toBeVisible(); await expect(preview.getByRole("table")).toHaveCount(0);
    await preview.getByRole("button", { name: "Modifier nom complet", exact: true }).click();
    const field = preview.getByRole("form", { name: "Modifier nom complet", exact: true }); await field.getByLabel("Nom du contact", { exact: true }).fill(changedName);
    await preview.getByRole("button", { name: `Fermer : ${name}`, exact: true }).click();
    const discard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(discard).toBeVisible(); await discard.getByRole("button", { name: "Continuer la modification", exact: true }).click();
    await expect(field.getByLabel("Nom du contact", { exact: true })).toHaveValue(changedName); await field.getByRole("button", { name: "Enregistrer nom complet", exact: true }).click();
    await expect(field).toHaveCount(0); await expect(preview.getByRole("heading", { name: changedName, exact: true })).toBeVisible();
    const canonical = await (await page.request.get(`/api/v1/contacts/${contact.id}`)).json(); expect(canonical.roles).toEqual(["buyer"]); expect(canonical.phones).toEqual(contact.phones); expect(canonical.primary_agent.id).toBe(agent.id);
    await preview.getByRole("button", { name: `Fermer : ${changedName}`, exact: true }).click(); await expect(preview).toHaveCount(0);
    await page.goto(`/owners/${contact.id}?tab=activity&status=past`);
    const tabs = page.getByRole("tablist", { name: "Rubriques du propriétaire", exact: true }); await expect(tabs.getByRole("tab")).toHaveCount(2); await expect(tabs.getByRole("tab", { name: "Activités", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Patrimoine", exact: true })).toHaveCount(1); await expect(page.getByRole("tab", { name: "Anciens biens", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.goto("/owners"); await page.getByRole("link", { name: "Ajouter un propriétaire", exact: true }).click();
    const create = page.getByRole("dialog", { name: "Ajouter un propriétaire", exact: true }); await expect(create.getByRole("heading", { name: "Ajouter un propriétaire", exact: true })).toHaveCount(1);
    const form = create.getByRole("form", { name: "Ajouter un propriétaire", exact: true }); await form.getByLabel("Nom complet", { exact: true }).fill(`Nouveau propriétaire synthétique ${suffix}`); await form.getByLabel("Téléphone 1 *", { exact: true }).fill(`+212613${digits}`);
    await form.getByRole("button", { name: "Créer le propriétaire", exact: true }).click(); await expect(page).toHaveURL(/\/owners\/[a-f0-9-]{36}$/);
    const id = new URL(page.url()).pathname.split("/").at(-1), portfolio = await (await page.request.get(`/api/v1/contacts/${id}/portfolio`)).json(); expect(portfolio.total).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await clearActorContext(page); await removeActor(manager); await removeActor(agent); }
});
