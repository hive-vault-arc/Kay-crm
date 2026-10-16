import type { Page } from "@playwright/test";
import { expect, createActor, signIn, clearActorContext, type TestActor } from "./auth";
import { createLead, staffCommand } from "./leads";
import { dealBody } from "./deals";
import { inventoryFixture } from "./requirements";

export async function reservationFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent"); actors.push(agent);
  const manager = await createActor("manager"); actors.push(manager);
  await signIn(page, agent);
  const lead = await createLead(page, "SP12 contact synthétique de réservation");
  const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id;
  await clearActorContext(page); await signIn(page, manager);
  const inventory = await inventoryFixture(page, contact);
  const stock = await (await page.request.get(`/api/v1/properties/${inventory.pid}`)).json();
  const extended = await staffCommand(page, `properties/${inventory.pid}`, { expected_version: stock.version, reference: stock.reference, category: stock.category, marketing_name: `SP12 unité physique ${"conditionsetlocalisation".repeat(5)}`, location: stock.location, area_sqm: stock.area_sqm, rooms: stock.rooms, development_id: stock.development_id, floor_id: stock.floor_id, unit_type_id: stock.unit_type_id }, "PATCH");
  expect(extended.status()).toBe(200);
  await clearActorContext(page); await signIn(page, agent);
  const deals: string[] = [];
  for (const [offering, title] of [[inventory.unitOffer, "SP12 unité"], [inventory.wholeOffer, "SP12 programme entier"], [inventory.unitOffer, "SP12 affaire concurrente"]]) {
    const response = await staffCommand(page, "deals", { ...dealBody(contact, title), offering_id: offering, expected_offering_version: 2 });
    expect(response.status()).toBe(200); deals.push((await response.json()).id);
  }
  return { agent, manager, contact, inventory, unit: deals[0], whole: deals[1], competitor: deals[2] };
}

export async function reservationBody(page: Page, did: string) {
  const response = await page.request.get(`/api/v1/deals/${did}`); expect(response.status()).toBe(200);
  const deal = await response.json(); const offering = deal.offering;
  return { expected_version: deal.version, offering_id: offering.id, expected_offering_version: offering.version, expected_target_version: offering.target.version, expected_development_version: offering.target.development_version };
}

export async function reservationDialog(page: Page, release = false) {
  const name = release ? "Libérer la réservation" : "Réserver l’offre";
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
