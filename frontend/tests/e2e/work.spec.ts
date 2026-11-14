import { randomInt } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, clearActorContext, createActor, removeActor, signIn, type TestActor } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { commandVisit, visitBody } from "../helpers/schedule";
import { createTaskApi, createTaskUi, openTasks, runReminders, selectFirstProspect, setTaskDue, workFixture } from "../helpers/work";

test.beforeEach(({ page }) => { page.setDefaultTimeout(25_000); page.setDefaultNavigationTimeout(30_000); });

async function openInbox(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("button", { name: "Ouvrir les notifications", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole("dialog", { name: "Notifications", exact: true }).getByRole("button", { name: /^Tout voir/ }).click();
  const inbox = page.getByRole("region", { name: "Notifications internes", exact: true });
  await expect(inbox).toBeVisible();
  return inbox;
}
async function openDashboardWork(page: import("@playwright/test").Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Suivi et rapports", exact: true }).click();
  await page.getByRole("menuitem", { name: "Travail à faire", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Travail à faire", exact: true })).toBeVisible();
}

test("Birthday reminders open the private contact at both stages", async ({ page }) => {
  const agent = await createActor("agent");
  const name = "Client synthétique anniversaire";
  const phone = `+2126${randomInt(10_000_000, 100_000_000)}`;
  try {
    await signIn(page, agent);
    await testControl("worker-stop");
    const response = await staffCommand(page, "contacts", {
      name, type: "person", phones: [{ number: phone, label: "Principal", is_primary: true }],
      emails: [], roles: ["buyer"], birth_date: "1996-01-16",
    });
    expect(response.status()).toBe(200);
    const { id } = await response.json();
    await page.goto(`/contacts/${id}`);
    await expect(page.getByText("16/01/1996", { exact: true })).toBeVisible();
    const realtime = page.locator("[data-realtime-status]");
    if (process.env.REALTIME_ENABLED === "true") await expect(realtime).toHaveAttribute("data-realtime-status", "connected");
    await page.getByRole("button", { name: "Modifier date de naissance", exact: true }).click();
    const edit = page.getByRole("form", { name: "Modifier date de naissance", exact: true });
    await edit.getByLabel("Date de naissance (facultatif)", { exact: true }).fill("1996-01-15");
    await edit.getByRole("button", { name: "Enregistrer date de naissance", exact: true }).click();
    await expect(page.getByText("15/01/1996", { exact: true })).toBeVisible();
    expect(await runReminders(new Date("2035-01-14T12:00:00Z"))).toEqual({ processed: 1 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    const inbox = await openInbox(page);
    await expect(inbox.getByText("Rappel d’anniversaire : J-1", { exact: true })).toBeVisible();
    await expect(inbox.getByText(name, { exact: true })).toBeVisible();
    await expect(inbox.getByText("Date de l’anniversaire", { exact: true })).toBeVisible();
    await expect(inbox.getByRole("link", { name: "Ouvrir le contact", exact: true })).toHaveAttribute("href", `/contacts/${id}`);
    await expect(inbox).not.toContainText("1996");
    await mkdir("output/playwright/contact-birthdays", { recursive: true });
    await page.screenshot({ path: "output/playwright/contact-birthdays/phone.png" });
    await inbox.getByRole("button", { name: "Marquer comme lue", exact: true }).click();
    await expect(inbox.getByText("Lue", { exact: true })).toBeVisible();
    await inbox.getByRole("link", { name: "Ouvrir le contact", exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByText("15/01/1996", { exact: true })).toBeVisible();
    expect(await runReminders(new Date("2035-01-15T12:00:00Z"))).toEqual({ processed: 1 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    const updatedInbox = await openInbox(page);
    await expect(updatedInbox.getByText("Anniversaire du jour", { exact: true })).toBeVisible();
    await expect(updatedInbox.getByText("Rappel d’anniversaire : J-1", { exact: true })).toBeVisible();
    await page.screenshot({ path: "output/playwright/contact-birthdays/desktop.png" });
  } finally {
    await clearActorContext(page);
    await testControl("worker-start");
    await removeActor(agent);
  }
});

test("SP15: deal task due edit, explicit cancellation, refresh and retained context", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const { contactId } = await workFixture(page, actors);
    const dealResponse = await staffCommand(page, "deals", dealBody(contactId, "SP15 affaire de suivi"));
    expect(dealResponse.status()).toBe(200); const did = (await dealResponse.json()).id;
    await page.goto(`/deals/${did}`);
    await page.getByRole("tab", { name: "Tâches", exact: true }).click();
    const panel = page.getByRole("tabpanel", { name: "Tâches", exact: true }).getByRole("region", { name: "Tâches de l’affaire", exact: true });
    await panel.getByRole("button", { name: "Créer une tâche", exact: true }).click();
    await page.getByLabel("Titre de la tâche", { exact: true }).fill("SP15 tâche du dossier affaire");
    const context = await (await page.request.get("/api/v1/work/context")).json();
    await setTaskDue(page, `${context.today}T12:00`); await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    const selected = panel.getByRole("region", { name: "Tâche sélectionnée", exact: true }); await expect(selected).toBeVisible();
    const initial = (await (await page.request.get(`/api/v1/tasks?deal_id=${did}`)).json()).items[0];
    expect(initial.contact_id).toBe(contactId); expect(initial.deal_id).toBe(did);
    await expect(selected.getByRole("heading", { name: "SP15 tâche du dossier affaire", exact: true })).toBeVisible();
    await selected.getByRole("button", { name: "Modifier la tâche", exact: true }).click();
    await setTaskDue(page, `${context.today}T15:00`); await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    await expect(selected.getByRole("button", { name: "Modifier la tâche", exact: true })).toBeVisible();
    const edited = await (await page.request.get(`/api/v1/tasks/${initial.id}`)).json();
    expect(edited.schedule_version).toBe(2); expect(edited.due_at).not.toBe(initial.due_at);
    await selected.getByRole("button", { name: "Annuler la tâche", exact: true }).click();
    const confirmation = page.getByRole("alertdialog", { name: "Annuler la tâche", exact: true });
    await expect(confirmation.getByRole("heading", { name: "Annuler la tâche", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(selected.getByRole("button", { name: "Annuler la tâche", exact: true })).toBeFocused();
    await selected.getByRole("button", { name: "Annuler la tâche", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Compte rendu (facultatif)", { exact: true }).fill("SP15 suivi annulé explicitement");
    await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la tâche", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible(); await expect(selected.getByText("Tâche annulée. Les rappels obsolètes sont invalidés.", { exact: true })).toBeVisible();
    const cancelled = await (await page.request.get(`/api/v1/tasks/${initial.id}`)).json();
    expect(cancelled.status).toBe("cancelled"); expect(cancelled.outcome).toBe("SP15 suivi annulé explicitement"); expect(cancelled.schedule_version).toBe(3);
    expect((await (await page.request.get(`/api/v1/tasks/${initial.id}/history`)).json()).total).toBe(3);
    await page.goto(`/deals/${did}?task=${initial.id}`);
    await expect(page.getByRole("tab", { name: "Tâches", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(selected.getByRole("heading", { name: "SP15 tâche du dossier affaire", exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("tab", { name: "Tâches", exact: true }).click();
    await panel.getByRole("button", { name: "SP15 tâche du dossier affaire", exact: true }).click();
    await expect(selected.getByText("Tâche conservée en lecture seule. Son historique reste disponible.", { exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("Tasks directory creates a dossier reminder, filters it and opens its record", async ({ page }) => {
  test.setTimeout(150_000);
  const actors: TestActor[] = [];
  try {
    await workFixture(page, actors);
    await page.getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Tâches", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tâches", exact: true, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Nouvelle tâche", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Nouvelle tâche", exact: true });
    await drawer.getByRole("button", { name: "Choisir SP15 contact synthétique", exact: true }).click();
    await selectFirstProspect(page);
    await drawer.getByLabel("Titre de la tâche", { exact: true }).fill("Rappel synthétique du répertoire");
    await drawer.getByLabel("Type", { exact: true }).selectOption("reminder");
    const context = (await (await page.request.get("/api/v1/work/context")).json());
    await setTaskDue(page, `${context.today}T12:00`);
    await drawer.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    await expect(drawer).toBeHidden();
    const task = page.getByRole("button", { name: "Rappel synthétique du répertoire", exact: true });
    await expect(task).toBeVisible();
    await page.getByLabel("État ou période", { exact: true }).selectOption("completed");
    await expect(task).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Aucune échéance pour ces filtres", exact: true })).toBeVisible();
    await page.getByLabel("État ou période", { exact: true }).selectOption("open");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(task).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await task.click();
    const detail = page.getByRole("dialog", { name: "Détail de la tâche", exact: true });
    await expect(detail.getByRole("heading", { name: "Rappel synthétique du répertoire", exact: true })).toBeFocused();
    await detail.getByRole("button", { name: "Fermer la tâche", exact: true }).click();
    await expect(task).toBeFocused();
    const { items } = await (await page.request.get("/api/v1/tasks?bucket=open")).json();
    const due = new Date(items[0].due_at);
    await runReminders(new Date(due.getTime() - 24 * 60 * 60_000));
    await runReminders(new Date(due.getTime() - 60 * 60_000));
    await runReminders(due);
    const inbox = await (await page.request.get("/api/v1/notifications")).json();
    expect(inbox.items.map((item: { title: string }) => item.title).sort()).toEqual([
      "Rappel prévu : H-1", "Rappel prévu : J-1", "Rappel à traiter",
    ]);
  } finally {
    await clearActorContext(page);
    await testControl("worker-start");
    for (const actor of actors) await removeActor(actor);
  }
});

test("SP15 AT-17/23: task creation, overdue delivery/read and completion in current scope", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { contactId, now } = await workFixture(page, actors);
    const due = new Date(now.getTime() - 60_000), tid = await createTaskUi(page, contactId, due);
    const before = await (await page.request.get("/api/v1/notifications")).json(); expect(before.total).toBe(0);
    expect((await runReminders(now)).processed).toBe(3); expect((await runReminders(now)).processed).toBe(0);
    await openDashboardWork(page); await page.getByLabel("Période des tâches", { exact: true }).selectOption("overdue");
    await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link", { name: "SP15 tâche synthétique", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fermer : Travail à faire", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Travail à faire", exact: true })).not.toBeVisible();
    await expect(page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true })).toHaveCount(0);
    const inbox = await openInbox(page);
    await expect(inbox.getByRole("heading", { name: "Échéance de tâche", exact: true })).toHaveCount(1);
    const [readResponse] = await Promise.all([
      page.waitForResponse(response => /\/api\/v1\/notifications\/[^/]+\/read$/.test(new URL(response.url()).pathname) && response.request().method() === "POST", { timeout: 5000 }),
      inbox.getByRole("button", { name: "Marquer comme lue", exact: true }).click(),
    ]);
    expect(readResponse.status()).toBe(200);
    await expect(inbox.getByText("Notification marquée comme lue.", { exact: true })).toBeVisible();
    await inbox.getByRole("button", { name: "Non lues", exact: true }).click(); await expect(inbox.getByRole("heading", { name: "Échéance de tâche", exact: true })).toHaveCount(0);
    await inbox.getByRole("button", { name: "Lues", exact: true }).click(); await inbox.getByRole("link", { name: "Ouvrir le dossier", exact: true }).click();
    await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true }).getByRole("heading", { name: "SP15 tâche synthétique", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Terminer la tâche", exact: true }).click(); await page.getByRole("alertdialog").getByRole("button", { name: "Terminer la tâche", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible(); await expect(page.getByText("Tâche terminée. Les rappels obsolètes sont invalidés.", { exact: true })).toBeVisible();
    const record = await (await page.request.get(`/api/v1/tasks/${tid}`)).json(); expect(record.status).toBe("completed"); expect(record.schedule_version).toBe(2);
    expect((await (await page.request.get("/api/v1/notifications")).json()).total).toBe(0);
    expect((await (await page.request.get("/api/v1/tasks?bucket=overdue")).json()).total).toBe(0);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("SP15 AT-17/16: actual visit reminders track reschedule, cancellation and unresolved follow-up", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { agent, contactId, now } = await workFixture(page, actors);
    const start = new Date(now.getTime() + 2 * 86400_000), end = new Date(start.getTime() + 3600_000);
    const vid = await commandVisit(page, agent.id, contactId, { type: "office", start_at: start.toISOString(), end_at: end.toISOString() });
    expect((await runReminders(new Date(start.getTime() - 86400_000))).processed).toBe(1);
    expect((await runReminders(new Date(start.getTime() - 3600_000))).processed).toBe(1);
    expect((await (await page.request.get("/api/v1/notifications")).json()).total).toBe(2);
    const nextStart = new Date(start.getTime() + 2 * 86400_000), nextEnd = new Date(end.getTime() + 2 * 86400_000);
    const fields = visitBody(agent.id, contactId, { type: "office", start_at: nextStart.toISOString(), end_at: nextEnd.toISOString(), expected_version: 1 });
    const edit = Object.fromEntries(Object.entries(fields).filter(([key]) => key !== "contact_id" && key !== "status"));
    expect((await staffCommand(page, `visits/${vid}/reschedule`, edit)).status()).toBe(200);
    expect((await (await page.request.get("/api/v1/notifications")).json()).total).toBe(0);
    expect((await runReminders(new Date(start.getTime() - 3600_000))).processed).toBe(0);
    expect((await runReminders(new Date(nextStart.getTime() - 86400_000))).processed).toBe(1);
    await page.goto("/dashboard"); await openInbox(page); await expect(page.getByRole("heading", { name: "Rappel de visite : J-1", exact: true })).toBeVisible();
    await page.getByRole("region", { name: "Notifications internes", exact: true }).getByRole("link", { name: "Ouvrir le dossier", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Annuler la visite", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Motif d’annulation (obligatoire)", { exact: true }).fill("SP15 annulation synthétique");
    await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la visite", exact: true }).click(); await expect(page.getByRole("alertdialog")).not.toBeVisible();
    expect((await runReminders(new Date(nextStart.getTime() - 3600_000))).processed).toBe(0);
    const past = await commandVisit(page, agent.id, contactId, { type: "office", start_at: new Date(now.getTime() - 7200_000).toISOString(), end_at: new Date(now.getTime() - 3600_000).toISOString() });
    await openDashboardWork(page); const followup = page.getByRole("region", { name: "Visites à renseigner", exact: true }); await expect(followup.getByRole("link")).toHaveCount(1);
    await followup.getByRole("link").click(); await expect(page).toHaveURL(new RegExp(`/visits/${past}$`));
    await page.getByRole("dialog").getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Terminer la visite", exact: true }).click(); await page.getByRole("alertdialog").getByLabel("Résultat de la visite (obligatoire)", { exact: true }).fill("SP15 résultat consigné sans deuxième visite"); await page.getByRole("alertdialog").getByRole("button", { name: "Terminer la visite", exact: true }).click(); await expect(page.getByRole("alertdialog")).not.toBeVisible();
    expect((await (await page.request.get("/api/v1/visits/follow-up")).json()).total).toBe(0);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("SP15 AT-23: committed response interruption retains task input and retry key", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { contactId, now } = await workFixture(page, actors); await openTasks(page, contactId); await page.getByRole("button", { name: "Créer une tâche", exact: true }).click(); await selectFirstProspect(page);
    await page.getByLabel("Titre de la tâche", { exact: true }).fill("SP15 tâche à réponse interrompue");
    const context = await (await page.request.get("/api/v1/work/context")).json(); await setTaskDue(page, `${context.today}T12:00`);
    let interrupted = false; await page.route("**/api/v1/tasks", async route => { if (route.request().method() !== "POST" || interrupted) return route.continue(); interrupted = true; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await expect(page.getByLabel("Titre de la tâche", { exact: true })).toHaveValue("SP15 tâche à réponse interrompue");
    await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click(); await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true })).toBeVisible(); await page.unroute("**/api/v1/tasks");
    const tasks = await (await page.request.get(`/api/v1/tasks?contact_id=${contactId}`)).json(); expect(tasks.total).toBe(1); expect((await (await page.request.get(`/api/v1/tasks/${tasks.items[0].id}/history`)).json()).total).toBe(1);
    await runReminders(now);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("Visit follow-up after two hours records a distinct missed outcome in the linked Lead", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const { agent, contactId, now } = await workFixture(page, actors);
    const start = new Date(now.getTime() - 4 * 3600_000);
    const end = new Date(now.getTime() - 3 * 3600_000);
    const vid = await commandVisit(page, agent.id, contactId, { type: "office", start_at: start.toISOString(), end_at: end.toISOString() });
    expect((await runReminders(now)).processed).toBe(3);
    const notifications = await (await page.request.get("/api/v1/notifications")).json();
    expect(notifications.total).toBe(1);
    expect(notifications.items[0].kind).toBe("visit.follow_up");
    await page.goto(`/visits/${vid}`);
    await page.getByRole("dialog").getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Marquer non réalisée", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Pourquoi la visite n’a pas eu lieu (obligatoire)", { exact: true }).fill("Le client était absent au rendez-vous synthétique.");
    await page.getByRole("alertdialog").getByRole("button", { name: "Marquer non réalisée", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    const missed = await (await page.request.get(`/api/v1/visits/${vid}`)).json();
    expect(missed.status).toBe("not_completed");
    expect((await (await page.request.get("/api/v1/notifications")).json()).total).toBe(0);
    const leads = await (await page.request.get(`/api/v1/enquiries?contact_id=${contactId}`)).json();
    const history = await (await page.request.get(`/api/v1/enquiries/${leads.items[0].id}/activities`)).json();
    expect(history.items.some((item: { action: string; reason: string }) => item.action === "visits.not_completed" && item.reason.includes("client était absent"))).toBe(true);
    await page.goto("/visits");
    await page.getByLabel("Aller à une date", { exact: true }).fill(missed.start_local.slice(0, 10));
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    const missedCard = page.locator(".calendar-agenda-visit").filter({ has: page.locator(`a[href="/visits/${vid}"]`) });
    await expect(missedCard).toBeVisible();
    await expect(missedCard.getByRole("button", { name: "Annuler la visite", exact: true })).toHaveCount(0);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("Lead context chooser stays usable by keyboard on narrow screens", async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = [];
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    const { contactId } = await workFixture(page, actors);
    await openTasks(page, contactId);
    await page.getByRole("button", { name: "Créer une tâche", exact: true }).click();
    const chooser = page.getByLabel("Prospect concerné", { exact: true });
    await expect.poll(() => chooser.locator("option").count()).toBeGreaterThan(1);
    await chooser.focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter");
    await expect(chooser).not.toHaveValue("");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("Lead task links from the dashboard open the exact selected task", async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = [];
  try {
    const { contactId, now } = await workFixture(page, actors);
    const title = "SP15 tâche liée au prospect synthétique";
    const tid = await createTaskUi(page, contactId, new Date(now.getTime() - 60_000), title);
    const task = await (await page.request.get(`/api/v1/tasks/${tid}`)).json();
    expect(task.enquiry_id).toBeTruthy();
    await openDashboardWork(page);
    await page.getByLabel("Période des tâches", { exact: true }).selectOption("overdue");
    const link = page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link", { name: title, exact: true });
    await expect(link).toHaveAttribute("href", `/leads/${task.enquiry_id}?task=${tid}`);
    await link.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/leads/${task.enquiry_id}\\?task=${tid}$`));
    await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true }).getByRole("heading", { name: title, exact: true })).toBeVisible();
    expect((await (await page.request.get(`/api/v1/tasks/${tid}`)).json()).version).toBe(task.version);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("SP15 AT-17/23: unrelated staff cannot open task or notification links", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const { agent, contactId, now } = await workFixture(page, actors); const tid = await createTaskApi(page, agent.id, contactId, now); await runReminders(now);
    const notification = (await (await page.request.get("/api/v1/notifications")).json()).items[0];
    const outsider = await createActor("agent", false, "SP06 SP15 tiers synthétique"); actors.push(outsider); await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/tasks/${tid}`)).status()).toBe(404); expect((await staffCommand(page, `notifications/${notification.id}/read`, {})).status()).toBe(404);
    await page.goto(`/contacts/${contactId}?task=${tid}`); await expect(page.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible();
    await page.goto("/dashboard"); const inbox = await openInbox(page); await expect(inbox.getByText("Aucune notification pour ce filtre. Les rappels apparaissent à leur échéance.", { exact: true })).toBeVisible();
    expect((await (await page.request.get("/api/v1/tasks")).json()).total).toBe(0);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});
