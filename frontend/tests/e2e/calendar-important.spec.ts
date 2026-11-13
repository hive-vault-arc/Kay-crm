import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { createTaskApi, openTasks, selectFirstProspect, setTaskDue } from "../helpers/work";
import { fillVisit, saveVisit } from "../helpers/schedule";

test("Calendar shows meetings and only marked tasks and reminders", async ({ page }, info) => {
  test.setTimeout(150_000);
  const agent = await createActor("agent");
  const day = "2030-01-07";
  try {
    await signIn(page, agent);
    const lead = await createLead(page, "Prospect calendrier prioritaire synthétique");
    const { contact } = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    await openTasks(page, contact.id);
    await page.getByRole("button", { name: "Créer une tâche", exact: true }).click();
    await selectFirstProspect(page);
    await page.getByLabel("Titre de la tâche", { exact: true }).fill("Relance importante synthétique");
    await page.getByLabel("Type", { exact: true }).selectOption("reminder");
    await page.getByRole("checkbox", { name: "Important", exact: true }).check();
    await setTaskDue(page, day + "T12:00");
    await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true })).toContainText("Rappel important");

    const taskDue = new Date(day + "T12:30:00Z");
    await createTaskApi(page, agent.id, contact.id, taskDue, { title: "Tâche importante synthétique", important: true });
    await createTaskApi(page, agent.id, contact.id, taskDue, { title: "Tâche ordinaire synthétique" });
    await fillVisit(page, contact.id, "meeting", day + "T15:00", day + "T16:00", "Réunion synthétique");
    await saveVisit(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/visits");
    await page.getByLabel("Aller à une date", { exact: true }).fill(day);
    const week = page.getByRole("region", { name: "Visites de la semaine, défilement horizontal", exact: true });
    await expect(week.getByRole("link", { name: /Rappel important · Relance importante synthétique/ })).toBeVisible();
    await expect(week.getByRole("link", { name: /Tâche importante · Tâche importante synthétique/ })).toBeVisible();
    await expect(week.getByRole("link", { name: /Réunion synthétique/ })).toBeVisible();
    await expect(week.getByText("Tâche ordinaire synthétique", { exact: true })).toHaveCount(0);
    await week.screenshot({ path: info.outputPath("week.png") });

    await page.setViewportSize({ width: 390, height: 850 });
    const agenda = page.getByRole("region", { name: "Agenda des visites", exact: true }).filter({ visible: true });
    await expect(agenda.getByRole("link", { name: /Réunion synthétique/ })).toBeVisible();
    await expect(agenda.getByRole("link", { name: /Tâche importante · Tâche importante synthétique/ })).toBeVisible();
    await expect(agenda.getByText("Tâche ordinaire synthétique", { exact: true })).toHaveCount(0);
    await agenda.screenshot({ path: info.outputPath("agenda.png") });
    await agenda.getByRole("link", { name: /Rappel important · Relance importante synthétique/ }).click();
    await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true })).toContainText("Rappel important");
    await expect(page).toHaveURL(new RegExp(`/leads/${lead}\\?task=`));
  } finally {
    await clearActorContext(page);
    await removeActor(agent);
  }
});
