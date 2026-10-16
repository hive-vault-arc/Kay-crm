import type { Page, Locator } from "@playwright/test";
import { expect, signIn, clearActorContext } from "./auth";
import { staffCommand } from "./leads";
import { dealBody } from "./deals";
import { reservationFixture } from "./reservations";

export async function outcomeDialog(page: Page, reopen = false) {
  const name = reopen ? "Rouvrir l’affaire" : "Clôturer l’affaire";
  await page.getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name, exact: true })).toBeEnabled();
  return dialog;
}
export async function fillOutcome(dialog: Locator, outcome = "won", explanation = "SP13 accord synthétique confirmé") {
  await dialog.getByLabel("Résultat", { exact: true }).selectOption(outcome);
  if (outcome === "won") await dialog.getByLabel(/Montant convenu en MAD/).fill("11999,99");
  await dialog.getByLabel("Date du résultat (obligatoire)", { exact: true }).fill("2026-10-15");
  await dialog.getByLabel("Explication du résultat (obligatoire)", { exact: true }).fill(explanation);
}
export async function outcomeBody(page: Page, did: string, outcome = "won") {
  const response = await page.request.get(`/api/v1/deals/${did}/stock-review`); expect(response.status()).toBe(200);
  const data = await response.json(); const stock = data.stock;
  return { expected_version: data.expected_version, offering_id: stock?.offering_id ?? null, expected_offering_version: stock?.expected_offering_version ?? null, expected_target_version: stock?.expected_target_version ?? null, expected_development_version: stock?.expected_development_version ?? null, expected_stock_fingerprint: stock?.expected_stock_fingerprint ?? null, outcome, agreed_amount_mad: outcome === "won" ? "11999.99" : null, completed_on: "2026-10-15", explanation: "SP13 résultat synthétique API" };
}
export async function salePair(page: Page, data: Awaited<ReturnType<typeof reservationFixture>>, unit = false) {
  await clearActorContext(page); await signIn(page, data.manager);
  const pid = unit ? data.inventory.pid : data.inventory.sid;
  const current = await (await page.request.get(`/api/v1/properties/${pid}`)).json();
  const created = await staffCommand(page, "offerings", { property_id: pid, expected_property_version: current.version, kind: "sale", price_mad: "1250000.00", currency: "MAD", price_period: null, conditions: "SP13 vente synthétique distincte" }); expect(created.status()).toBe(200);
  const offer = await created.json();
  expect((await staffCommand(page, `properties/${pid}/confirm-availability`, { expected_version: offer.version, offering_id: offer.offering_id, expected_offering_version: 1, reason: "SP13 disponibilité vérifiée" })).status()).toBe(200);
  await clearActorContext(page); await signIn(page, data.agent);
  const deals: string[] = [];
  for (const oid of [offer.offering_id, unit ? data.inventory.unitOffer : data.inventory.standaloneOffer]) {
    const created = await staffCommand(page, "deals", { ...dealBody(data.contact, "SP13 affaire synthétique de résultat"), offering_id: oid, expected_offering_version: 2 }); expect(created.status()).toBe(200); deals.push((await created.json()).id);
  }
  return { pid, saleOffer: offer.offering_id as string, sale: deals[0], rental: deals[1] };
}
