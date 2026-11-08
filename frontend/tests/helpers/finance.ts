import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { createActor, clearActorContext, expect, signIn, type TestActor } from "./auth";
import { staffCommand } from "./leads";
import { dealBody } from "./deals";

export async function financeFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent", false, "SP06 SP16 agent synthétique"); actors.push(agent);
  await signIn(page, agent);
  const suffix = randomUUID().slice(0, 8), digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const created = await staffCommand(page, "enquiries", { new_contact: { name: `SP16 contact synthétique ${suffix}`, type: "person", phones: [{ number: `+212615${digits}`, label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french"] }, initial_budget: "1000000", message: "SP16 demande synthétique", source: "manual" });
  expect(created.status()).toBe(200); const leadId = (await created.json()).id as string;
  const lead = await (await page.request.get(`/api/v1/enquiries/${leadId}`)).json();
  const response = await staffCommand(page, "deals", dealBody(lead.contact.id, "SP16 affaire synthétique")); expect(response.status()).toBe(200);
  const dealId = (await response.json()).id as string;
  const manager = await createActor("manager", false, "SP06 SP16 responsable synthétique"); actors.push(manager);
  await clearActorContext(page); await signIn(page, manager); await openFinance(page, dealId);
  return { agent, manager, dealId, contactId: lead.contact.id as string };
}
export async function openFinance(page: Page, did: string) {
  await page.goto(`/deals/${did}?tab=finance`);
  const drawer = page.getByRole("dialog", { name: "Commissions et encaissements", exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText("Chargement des commissions…", { exact: true })).toHaveCount(0);
  await expect(drawer.getByRole("heading", { name: /^Commissions(?:\s*\d+)?$/ })).toBeVisible();
}
export async function fillCommission(page: Page, percentage = false) {
  await page.getByRole("button", { name: "Prévoir une commission", exact: true }).click();
  const form = page.getByRole("form", { name: "Nouvelle commission", exact: true });
  await form.getByLabel("Mode de commission", { exact: true }).selectOption(percentage ? "percentage" : "fixed");
  await form.getByLabel("Base explicite (MAD)", { exact: true }).fill(percentage ? "10,05" : "1000000");
  await form.getByLabel(percentage ? "Taux de commission (%)" : "Montant de commission (MAD)", { exact: true }).fill(percentage ? "10" : "10000");
  return form;
}
export async function saveCommission(page: Page) {
  await page.getByRole("button", { name: "Enregistrer la commission prévue", exact: true }).click();
  await expect(page.getByRole("form", { name: "Nouvelle commission", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reconnaître la commission", exact: true })).toBeVisible();
}
export async function confirmFinance(page: Page, title: string) {
  const dialog = page.getByRole("alertdialog", { name: title, exact: true });
  await dialog.getByRole("button", { name: title, exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
export async function recognize(page: Page) {
  await page.getByRole("button", { name: "Reconnaître la commission", exact: true }).click();
  await confirmFinance(page, "Reconnaître la commission");
  await expect(page.getByRole("button", { name: "Ajouter un encaissement", exact: true })).toBeVisible();
}
export async function fillReceipt(page: Page, amount = "2500") {
  await page.getByRole("button", { name: "Ajouter un encaissement", exact: true }).click();
  const form = page.getByRole("form", { name: "Nouvel encaissement", exact: true });
  await form.getByLabel("Montant encaissé (MAD)", { exact: true }).fill(amount);
  await form.getByLabel("Date de réception", { exact: true }).fill("2026-10-15");
  await form.getByLabel("Justification du versement", { exact: true }).fill("SP16 versement synthétique confirmé");
  await expect(form.getByText("Chargement des justificatifs…", { exact: true })).toHaveCount(0);
  return form;
}
