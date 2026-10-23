import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { createDevelopment } from "../helpers/developments";
import { commandVisit, scheduleFixture } from "../helpers/schedule";

test("D44: owner archives and restores a Lead and a deal from their pages", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const agent = await createActor("agent");
  try {
    await signIn(page, agent);
    const leadId = await createLead(page, "D44 prospect synthétique");
    const lead = await (await page.request.get(`/api/v1/enquiries/${leadId}`)).json();
    const archiveLead = page.getByRole("button", { name: "Archiver le prospect" });
    await archiveLead.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alertdialog", { name: "Archiver le prospect" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(archiveLead).toBeFocused();
    await archiveLead.click();
    const leadDialog = page.getByRole("alertdialog", { name: "Archiver le prospect" });
    await leadDialog.getByLabel("Motif obligatoire").fill("Contrôle synthétique du retrait");
    await leadDialog.getByRole("button", { name: "Confirmer : archiver le prospect" }).click();
    await expect(page.getByText(/Prospect archivé\. Restauration possible/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("d44-lead-detail-desktop.png") });
    await page.goto("/leads");
    expect((await (await page.request.get("/api/v1/enquiries")).json()).total).toBe(0);
    await expect(page.getByRole("button", { name: "Archives des prospects" })).toBeVisible();
    await page.getByRole("button", { name: "Archives des prospects" }).click();
    await expect(page.getByText("Archives · 1 demande")).toBeVisible();
    await page.setViewportSize({ width: 360, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("d44-leads-mobile.png") });
    await page.getByRole("checkbox", { name: "Sélectionner D44 prospect synthétique" }).check();
    await page.getByRole("button", { name: "Restaurer le prospect" }).click();
    const restoreLead = page.getByRole("alertdialog", { name: "Restaurer le prospect" });
    await restoreLead.getByLabel("Motif obligatoire").fill("Reprise synthétique");
    await restoreLead.getByRole("button", { name: "Confirmer : restaurer le prospect" }).click();
    await expect(page.getByText("Archives · 0 demande")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });

    const created = await staffCommand(page, "deals", dealBody(lead.contact.id, "D44 projet synthétique"));
    expect(created.status()).toBe(200);
    const dealId = (await created.json()).id;
    await page.goto(`/deals/${dealId}`);
    await page.getByRole("button", { name: "Archiver l’affaire" }).click();
    const dealDialog = page.getByRole("alertdialog", { name: "Archiver l’affaire" });
    await dealDialog.getByLabel("Motif obligatoire").fill("Contrôle synthétique de l’affaire");
    await dealDialog.getByRole("button", { name: "Confirmer : archiver l’affaire" }).click();
    await expect(page.getByText(/Affaire archivée\. Restauration possible/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("d44-deal-detail-desktop.png") });
    await page.goto("/deals");
    await page.getByRole("button", { name: "Archives des affaires" }).click();
    await expect(page.getByText("Archives · 1 affaire")).toBeVisible();
    await page.getByRole("checkbox", { name: "Sélectionner D44 prospect synthétique" }).check();
    await page.getByRole("button", { name: "Restaurer l’affaire" }).click();
    const restoreDeal = page.getByRole("alertdialog", { name: "Restaurer l’affaire" });
    await restoreDeal.getByLabel("Motif obligatoire").fill("Reprise synthétique");
    await restoreDeal.getByRole("button", { name: "Confirmer : restaurer l’affaire" }).click();
    await expect(page.getByText("Archives · 0 affaire")).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("D44: a manager finds the project archive from its header", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager);
    const project = await createDevelopment(page);
    await page.getByRole("link", { name: "Archiver le projet" }).click();
    await expect(page.getByRole("region", { name: "Cycle de vie de l’inventaire" })).toBeInViewport();
    await page.getByRole("button", { name: "Archiver ce dossier" }).click();
    await page.getByLabel("Motif obligatoire").fill("Retrait synthétique du projet");
    await page.getByRole("button", { name: "Confirmer l’archivage" }).click();
    await expect(page.getByText("État : Archivé")).toBeVisible();
    await page.setViewportSize({ width: 360, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("d44-project-mobile.png") });
    expect((await (await page.request.get(`/api/v1/developments/${project.id}`)).json()).archived_at).not.toBeNull();
  } finally { await clearActorContext(page); await removeActor(manager); }
});

test("D44: a calendar visit can be cancelled with a reason", async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const actors: TestActor[] = [];
  try {
    const { agent, contactId } = await scheduleFixture(page, actors);
    const visitId = await commandVisit(page, agent.id, contactId, { type: "office" });
    await page.goto("/visits");
    await page.getByLabel("Semaine contenant le").fill("2030-01-07");
    await page.getByRole("tab", { name: "Agenda" }).click();
    await page.getByRole("button", { name: "Annuler la visite" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Annuler la visite" });
    await dialog.getByLabel("Motif d’annulation (obligatoire)").fill("Rendez-vous synthétique annulé");
    await dialog.getByRole("button", { name: "Annuler la visite" }).click();
    await expect(page.getByText("0 visite(s) accessible(s) cette semaine.")).toBeVisible();
    expect((await (await page.request.get(`/api/v1/visits/${visitId}`)).json()).status).toBe("cancelled");
    await page.getByRole("checkbox", { name: "Annulée" }).check();
    await expect(page.getByText("1 visite(s) accessible(s) cette semaine.")).toBeVisible();
    await page.setViewportSize({ width: 360, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("d44-calendar-mobile.png") });
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
