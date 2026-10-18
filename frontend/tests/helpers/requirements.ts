import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect } from "./auth";
import { staffCommand } from "./leads";

export async function openRequirements(page: Page, contact: string) {
  await page.goto(`/contacts/${contact}`);
  await expect(page.getByRole("tab", { name: "Recherches", exact: true })).toBeEnabled();
  await page.getByRole("tab", { name: "Recherches", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recherches du contact", exact: true })).toBeVisible();
}
export async function expectCurrentSearch(page: Page, name: string) {
  const region = page.getByRole("region", { name: "Recherches du contact", exact: true });
  const active = region.getByRole("button", { name, exact: true });
  await page.mouse.move(0, 0);
  await expect(region.locator('button[aria-pressed="true"]')).toHaveCount(1);
  await expect(active).toHaveAttribute("aria-pressed", "true");
  await expect(active).toHaveAttribute("data-action", "select");
  await expect(active.locator('svg[data-action-icon][data-kay-icon="completed"][data-icon-family="iconsax"]')).toBeVisible();
  await expect(region.locator('button[aria-pressed="false"] svg[data-kay-icon="completed"]')).toHaveCount(0);
  await expect(active).toHaveCSS("background-color", "rgb(238, 219, 168)");
  await expect(active).toHaveCSS("border-top-color", "rgb(133, 135, 121)");
}
export async function beginRequirement(page: Page, title = "SP10 recherche locative synthétique", intent = "rental") {
  await page.getByRole("button", { name: "Nouvelle recherche", exact: true }).click();
  const form = page.getByRole("form", { name: "Nouvelle recherche", exact: true });
  await form.getByLabel("Nom de la recherche", { exact: true }).fill(title);
  await form.getByLabel("Type de recherche", { exact: true }).selectOption(intent);
  return form;
}
export async function saveRequirement(page: Page) {
  const response = page.waitForResponse(r => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/v1/requirements");
  await page.getByRole("button", { name: "Enregistrer la recherche", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  await expect(page.getByRole("region", { name: "Recherche sélectionnée", exact: true })).toBeVisible();
  return (await result.json()).id as string;
}
export async function inventoryFixture(page: Page, contact: string) {
  const reference = `SP10-${randomUUID().slice(0, 8)}`.toUpperCase();
  const created = await staffCommand(page, "developments", { reference, name: "SP10 programme synthétique", category: "mixed", location: "SP10 quartier synthétique", briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
  expect(created.status()).toBe(200);
  const did = (await created.json()).development_id as string;
  const block = await staffCommand(page, `developments/${did}/blocks`, { expected_version: 1, code: "B1", label: "Bloc SP10", display_order: 0 });
  expect(block.status()).toBe(200);
  const b = await (await page.request.get(`/api/v1/developments/${did}/blocks`)).json();
  const blockId = b.items[0].id;
  const dev = await (await page.request.get(`/api/v1/developments/${did}`)).json();
  const floor = await staffCommand(page, `blocks/${blockId}/floors`, { expected_version: dev.version, code: "F2", label: "Étage SP10", display_order: 0 });
  expect(floor.status()).toBe(200);
  const floorId = (await (await page.request.get(`/api/v1/blocks/${blockId}/floors`)).json()).items[0].id;
  const dv = await (await page.request.get(`/api/v1/developments/${did}`)).json();
  const template = await staffCommand(page, `developments/${did}/unit-types`, { expected_version: dv.version, development_id: did, code: "T2", label: "SP10 type réutilisable", category: "apartment", default_area_sqm: "80.00", default_rooms: 2 });
  expect(template.status()).toBe(200);
  const typeId = (await (await page.request.get(`/api/v1/developments/${did}/unit-types`)).json()).items[0].id;
  const unit = await staffCommand(page, "properties", { reference: `${reference}-U201`, category: "apartment", marketing_name: "SP10 unité physique", location: "SP10 quartier synthétique", area_sqm: "80.00", rooms: 2, development_id: did, floor_id: floorId, unit_type_id: typeId });
  expect(unit.status()).toBe(200);
  const pid = (await unit.json()).property_id as string;
  const standalone = await staffCommand(page, "properties", { reference: `${reference}-VILLA`, category: "villa", marketing_name: "SP10 villa indépendante", location: null, area_sqm: null });
  expect(standalone.status()).toBe(200);
  const sid = (await standalone.json()).property_id as string;
  const ids: string[] = [];
  for (const [kind, target, price, period] of [["properties", pid, "11999.99", "month"], ["developments", did, "143999.88", "year"], ["properties", sid, "12000.00", "month"]] as const) {
    const current = await (await page.request.get(`/api/v1/${kind}/${target}`)).json();
    const owner = await staffCommand(page, `${kind}/${target}/owners`, { expected_version: current.version, owners: [{ contact_id: contact, marketing_display: "SP10 vendeur synthétique autorisé" }] }, "PUT");
    expect(owner.status()).toBe(200);
    const version = (await owner.json()).version;
    const offer = await staffCommand(page, "offerings", { ...(kind === "properties" ? { property_id: target, expected_property_version: version } : { development_id: target, expected_development_version: version }), kind: "rental", price_mad: price, currency: "MAD", price_period: period, conditions: `SP10 conditions d’origine ${period}` });
    expect(offer.status()).toBe(200);
    const result = await offer.json();
    const available = await staffCommand(page, `${kind}/${target}/confirm-availability`, { expected_version: result.version, offering_id: result.offering_id, expected_offering_version: 1, reason: "SP10 confirmation synthétique" });
    expect(available.status()).toBe(200); ids.push(result.offering_id);
  }
  return { did, pid, sid, typeId, blockId, floorId, unitOffer: ids[0], wholeOffer: ids[1], standaloneOffer: ids[2], reference };
}
