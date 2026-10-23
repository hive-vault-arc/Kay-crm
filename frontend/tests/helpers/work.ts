import type { Page } from "@playwright/test";
import { createActor, expect, signIn, type TestActor } from "./auth";
import { testControl } from "./api-process";
import { createLead, staffCommand } from "./leads";

export async function workFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent", false, "SP06 SP15 agent synthétique"); actors.push(agent);
  await signIn(page, agent); await testControl("worker-stop");
  const lid = await createLead(page, "SP15 contact synthétique");
  const lead = await (await page.request.get(`/api/v1/enquiries/${lid}`)).json();
  const clock = await (await page.request.get("/api/v1/work/context")).json();
  const now = new Date(clock.now); now.setUTCSeconds(0, 0);
  return { agent, contactId: lead.contact.id as string, now };
}
export async function runReminders(clock: Date) {
  return await testControl("fixture", { action: "work-run", clock: clock.toISOString() }) as { processed: number };
}
export async function openTasks(page: Page, cid: string) {
  await page.goto(`/contacts/${cid}`); await page.getByRole("tab", { name: "Tâches", exact: true }).click();
  await expect(page.getByRole("button", { name: "Créer une tâche", exact: true })).toBeEnabled();
}
export async function selectFirstProspect(page: Page) {
  const select = page.getByLabel("Prospect concerné", { exact: true });
  await expect.poll(() => select.locator("option").count()).toBeGreaterThan(1);
  await select.selectOption({ index: 1 });
}
export async function setTaskDue(page: Page, local: string) {
  const response = page.waitForResponse(r => r.url().includes("/api/v1/calendar/local-time?") && r.request().method() === "GET" && r.status() === 200);
  await page.getByLabel("Échéance de la tâche (heure de Casablanca)", { exact: true }).fill(local);
  const result = await (await response).json();
  if (result.choices.length === 1) await expect(page.getByRole("form", { name: /^(Créer une tâche|Modifier la tâche)$/ }).getByText(new RegExp(`UTC\\${result.choices[0].local.slice(-6, -5)}`))).toBeVisible();
}
export async function createTaskUi(page: Page, cid: string, due: Date, title = "SP15 tâche synthétique") {
  await openTasks(page, cid); await page.getByRole("button", { name: "Créer une tâche", exact: true }).click();
  await selectFirstProspect(page);
  await page.getByLabel("Titre de la tâche", { exact: true }).fill(title);
  const localResponse = await page.request.get(`/api/v1/calendar/local-time?local=${encodeURIComponent(due.toISOString().slice(0, 16))}`);
  expect(localResponse.status()).toBe(200);
  // The backend projection, not the host's timezone database, supplies civil input.
  const context = await (await page.request.get("/api/v1/work/context")).json();
  const offsetResponse = await page.request.get(`/api/v1/calendar/local-time?local=${encodeURIComponent(`${context.today}T12:00`)}`);
  const noon = (await offsetResponse.json()).choices[0];
  const offsetMinutes = (Date.parse(noon.local.slice(0, 19) + "Z") - Date.parse(noon.instant)) / 60_000;
  const local = new Date(due.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 16);
  await setTaskDue(page, local);
  await page.getByLabel("Consignes de la tâche", { exact: true }).fill("SP15 consigne synthétique conservée");
  await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true })).toBeVisible();
  const tasks = await (await page.request.get(`/api/v1/tasks?contact_id=${cid}`)).json();
  const task = tasks.items.find((item: { title: string }) => item.title === title);
  if (!task) throw new Error("EXPECTED_SYNTHETIC_TASK");
  return task.id as string;
}
export async function createTaskApi(page: Page, uid: string, cid: string, due: Date, changes: object = {}) {
  const response = await staffCommand(page, "tasks", { contact_id: cid, title: "SP15 tâche API synthétique", notes: "", owner_user_id: uid, due_at: due.toISOString(), deal_id: null, property_id: null, ...changes });
  expect(response.status()).toBe(200); return (await response.json()).id as string;
}
