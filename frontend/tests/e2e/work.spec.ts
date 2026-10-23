import { test, expect, clearActorContext, createActor, removeActor, signIn, type TestActor } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { commandVisit, visitBody } from "../helpers/schedule";
import { createTaskApi, createTaskUi, openTasks, runReminders, selectFirstProspect, setTaskDue, workFixture } from "../helpers/work";

test.beforeEach(({ page }) => { page.setDefaultTimeout(25_000); page.setDefaultNavigationTimeout(30_000); });

test("SP15: deal task due edit, explicit cancellation, refresh and retained context", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const { contactId } = await workFixture(page, actors);
    const dealResponse = await staffCommand(page, "deals", dealBody(contactId, "SP15 affaire de suivi"));
    expect(dealResponse.status()).toBe(200); const did = (await dealResponse.json()).id;
    await page.goto(`/deals/${did}`); const panel = page.getByRole("region", { name: "Tâches du dossier", exact: true });
    await panel.getByRole("button", { name: "Créer une tâche", exact: true }).click();
    await page.getByLabel("Titre de la tâche", { exact: true }).fill("SP15 tâche du dossier affaire");
    const context = await (await page.request.get("/api/v1/work/context")).json();
    await setTaskDue(page, `${context.today}T12:00`); await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    const selected = panel.getByRole("region", { name: "Tâche sélectionnée", exact: true }); await expect(selected).toBeVisible();
    const initial = (await (await page.request.get(`/api/v1/tasks?deal_id=${did}`)).json()).items[0];
    expect(initial.contact_id).toBe(contactId); expect(initial.deal_id).toBe(did);
    await selected.getByRole("button", { name: "Actualiser la tâche", exact: true }).click();
    await selected.getByRole("button", { name: "Modifier la tâche", exact: true }).click();
    await setTaskDue(page, `${context.today}T15:00`); await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    await expect(selected.getByRole("button", { name: "Modifier la tâche", exact: true })).toBeVisible();
    const edited = await (await page.request.get(`/api/v1/tasks/${initial.id}`)).json();
    expect(edited.schedule_version).toBe(2); expect(edited.due_at).not.toBe(initial.due_at);
    await selected.getByRole("button", { name: "Annuler la tâche", exact: true }).click(); await page.keyboard.press("Escape");
    await expect(selected.getByRole("button", { name: "Annuler la tâche", exact: true })).toBeFocused();
    await selected.getByRole("button", { name: "Annuler la tâche", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Compte rendu (facultatif)", { exact: true }).fill("SP15 suivi annulé explicitement");
    await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la tâche", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible(); await expect(selected.getByText("Tâche annulée. Les rappels obsolètes sont invalidés.", { exact: true })).toBeVisible();
    const cancelled = await (await page.request.get(`/api/v1/tasks/${initial.id}`)).json();
    expect(cancelled.status).toBe("cancelled"); expect(cancelled.outcome).toBe("SP15 suivi annulé explicitement"); expect(cancelled.schedule_version).toBe(3);
    expect((await (await page.request.get(`/api/v1/tasks/${initial.id}/history`)).json()).total).toBe(3);
    await selected.getByRole("button", { name: "Fermer la tâche", exact: true }).click();
    await panel.getByRole("button", { name: "Actualiser les tâches", exact: true }).click();
    await panel.getByRole("button", { name: "SP15 tâche du dossier affaire", exact: true }).click();
    await expect(selected.getByText("Tâche conservée en lecture seule. Son historique reste disponible.", { exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

test("SP15 AT-17/23: task creation, overdue delivery/read and completion in current scope", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { contactId, now } = await workFixture(page, actors);
    const due = new Date(now.getTime() - 60_000), tid = await createTaskUi(page, contactId, due);
    const before = await (await page.request.get("/api/v1/notifications")).json(); expect(before.total).toBe(0);
    expect((await runReminders(now)).processed).toBe(3); expect((await runReminders(now)).processed).toBe(0);
    await page.goto("/dashboard"); await page.getByLabel("Période des tâches", { exact: true }).selectOption("overdue");
    await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link", { name: "SP15 tâche synthétique", exact: true })).toBeVisible();
    const inbox = page.getByRole("region", { name: "Notifications internes", exact: true });
    await expect(inbox.getByRole("heading", { name: "Échéance de tâche", exact: true })).toHaveCount(1);
    const [readResponse] = await Promise.all([
      page.waitForResponse(response => /\/api\/v1\/notifications\/[^/]+\/read$/.test(new URL(response.url()).pathname) && response.request().method() === "POST", { timeout: 5000 }),
      inbox.getByRole("button", { name: "Marquer comme lue", exact: true }).click(),
    ]);
    expect(readResponse.status()).toBe(200);
    await expect(inbox.getByText("Notification marquée comme lue.", { exact: true })).toBeVisible();
    await page.getByLabel("Notifications affichées", { exact: true }).selectOption("unread"); await expect(inbox.getByRole("heading", { name: "Échéance de tâche", exact: true })).toHaveCount(0);
    await page.getByLabel("Notifications affichées", { exact: true }).selectOption("read"); await inbox.getByRole("link", { name: "Ouvrir le dossier", exact: true }).click();
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
    await page.goto("/dashboard"); await expect(page.getByRole("heading", { name: "Rappel de visite : J-1", exact: true })).toBeVisible();
    await page.getByRole("region", { name: "Notifications internes", exact: true }).getByRole("link", { name: "Ouvrir le dossier", exact: true }).click();
    await page.getByRole("button", { name: "Annuler la visite", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Motif d’annulation (obligatoire)", { exact: true }).fill("SP15 annulation synthétique");
    await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la visite", exact: true }).click(); await expect(page.getByRole("alertdialog")).not.toBeVisible();
    expect((await runReminders(new Date(nextStart.getTime() - 3600_000))).processed).toBe(0);
    const past = await commandVisit(page, agent.id, contactId, { type: "office", start_at: new Date(now.getTime() - 7200_000).toISOString(), end_at: new Date(now.getTime() - 3600_000).toISOString() });
    await page.goto("/dashboard"); const followup = page.getByRole("region", { name: "Visites à renseigner", exact: true }); await expect(followup.getByRole("link")).toHaveCount(1);
    await followup.getByRole("link").click(); await expect(page).toHaveURL(new RegExp(`/visits/${past}$`));
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
    await page.getByRole("button", { name: "Marquer non réalisée", exact: true }).click();
    await page.getByRole("alertdialog").getByLabel("Pourquoi la visite n’a pas eu lieu (obligatoire)", { exact: true }).fill("Le client était absent au rendez-vous synthétique.");
    await page.getByRole("alertdialog").getByRole("button", { name: "Marquer non réalisée", exact: true }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    expect((await (await page.request.get(`/api/v1/visits/${vid}`)).json()).status).toBe("not_completed");
    expect((await (await page.request.get("/api/v1/notifications")).json()).total).toBe(0);
    const leads = await (await page.request.get(`/api/v1/enquiries?contact_id=${contactId}`)).json();
    const history = await (await page.request.get(`/api/v1/enquiries/${leads.items[0].id}/activities`)).json();
    expect(history.items.some((item: { action: string; reason: string }) => item.action === "visits.not_completed" && item.reason.includes("client était absent"))).toBe(true);
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

test("SP15 AT-17/23: unrelated staff cannot open task or notification links", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const { agent, contactId, now } = await workFixture(page, actors); const tid = await createTaskApi(page, agent.id, contactId, now); await runReminders(now);
    const notification = (await (await page.request.get("/api/v1/notifications")).json()).items[0];
    const outsider = await createActor("agent", false, "SP06 SP15 tiers synthétique"); actors.push(outsider); await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/tasks/${tid}`)).status()).toBe(404); expect((await staffCommand(page, `notifications/${notification.id}/read`, {})).status()).toBe(404);
    await page.goto(`/contacts/${contactId}?task=${tid}`); await expect(page.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible();
    await page.goto("/dashboard"); await expect(page.getByText("0 notification(s) actuelle(s) non lue(s).", { exact: true })).toBeVisible();
    expect((await (await page.request.get("/api/v1/tasks")).json()).total).toBe(0);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});
