import type { Page } from "@playwright/test";
import { createActor, expect, signIn, type TestActor } from "./auth";
import { staffCommand } from "./leads";
export async function discoveryFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent", false, "SP06 agent recherche synthétique"); actors.push(agent);
  const other = await createActor("agent", false, "SP06 autre recherche synthétique"); actors.push(other);
  const manager = await createActor("manager", false, "SP06 responsable recherche synthétique"); actors.push(manager);
  await signIn(page, manager);
  async function contact(name: string, phone: string, owner: string) {
    const response = await staffCommand(page, "enquiries", { new_contact: { name, type: "person", phones: [{ number: phone, label: "", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french", "darija"], primary_agent_id: owner }, initial_budget: "1000000", campaign_source: "facebook", rating: "warm", message: "SP19 demande synthétique", source: "manual", assigned_agent_id: owner });
    expect(response.status()).toBe(200); const result = await response.json(); return result;
  }
  const visible = await contact("SP19 visible synthétique", "+212600000001", agent.id);
  const hidden = await contact("SP19 privé synthétique", "+212600000002", other.id);
  const property = await staffCommand(page, "properties", { reference: "SP19-SHARED", category: "apartment", marketing_name: "SP19 bien synthétique", location: "Lieu synthétique", area_sqm: "90" });
  expect(property.status()).toBe(200); const pid = (await property.json()).property_id as string;
  return { agent, other, manager, visible, hidden, pid };
}
export async function searchFor(page: Page, text = "SP19") {
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await page.getByLabel("Nom, téléphone, référence ou document", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Lancer la recherche", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: /résultat\(s\) accessible/ })).toBeVisible();
}
export async function lifecycle(page: Page, restore = false) {
  await page.getByRole("button", { name: restore ? "Restaurer ce dossier" : "Archiver ce dossier", exact: true }).click();
  await page.getByLabel("Motif obligatoire", { exact: true }).fill("SP19 contrôle synthétique");
  await page.getByRole("button", { name: restore ? "Confirmer la restauration" : "Confirmer l’archivage", exact: true }).click();
  await expect(page.getByRole("heading", { name: restore ? "État : Actif" : "État : Archivé", exact: true })).toBeVisible();
}
