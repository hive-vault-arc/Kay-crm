import type { Page } from "@playwright/test";
import { clearActorContext, createActor, expect, signIn, type TestActor } from "./auth";
import { testControl } from "./api-process";
import { createLead } from "./leads";

export const simulatorOrigin = "https://127.0.0.1:8102";
export async function intakeFixture(page: Page) {
  const agent = await createActor("agent", false, "SP06 agent réception synthétique");
  const other = await createActor("agent", false, "SP06 autre agent synthétique");
  const manager = await createActor("manager", false, "SP06 responsable réception synthétique");
  await testControl("worker-stop");
  await testControl("fixture", { action: "website-source", id: other.id });
  await signIn(page, agent);
  const eid = await createLead(page, "SP20 identité privée synthétique");
  await testControl("simulator-start");
  await expect.poll(async () => {
    try { return (await page.request.get(simulatorOrigin)).status(); } catch { return 0; }
  }, { timeout: 10000 }).toBe(200);
  return { agent, other, manager, eid };
}
export async function fillWebsite(page: Page, phone = "+212600000001") {
  await page.goto(simulatorOrigin, { timeout: 20000 });
  await expect(page.getByRole("heading", { name: "Formulaire web local", exact: true })).toBeVisible();
  await expect(page.getByLabel("Nom complet", { exact: true })).toBeEnabled({ timeout: 10000 });
  await page.getByLabel("Nom complet", { exact: true }).fill("SP20 nom envoyé synthétique");
  await page.getByLabel("Téléphone international", { exact: true }).fill(phone);
  await page.getByLabel("Message (facultatif)", { exact: true }).fill("SP20 nouvelle demande web synthétique");
  expect(await page.getByLabel("Nom complet", { exact: true }).inputValue() === "SP20 nom envoyé synthétique").toBe(true);
  expect(await page.getByLabel("Téléphone international", { exact: true }).inputValue() === phone).toBe(true);
  expect(await page.getByLabel("Message (facultatif)", { exact: true }).inputValue() === "SP20 nouvelle demande web synthétique").toBe(true);
}
export async function staffLogin(page: Page, actor: TestActor, baseURL: string) {
  await clearActorContext(page);
  await page.goto(baseURL + "/login");
  await signIn(page, actor);
}
export async function clearIntake() {
  await testControl("worker-stop"); await testControl("simulator-stop");
  await testControl("fixture", { action: "clear" });
}
