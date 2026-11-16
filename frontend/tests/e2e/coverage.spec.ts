import { mkdir } from "node:fs/promises";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { dealBody } from "../helpers/deals";
import { createLead, staffCommand } from "../helpers/leads";
import { runReminders } from "../helpers/work";

test("Agent handoff from exact search, owner reminder and collaboration", async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  page.setDefaultTimeout(15_000);
  const owner = await createActor("agent", false, "SP06 Responsable synthétique");
  const backup = await createActor("agent", false, "SP06 Agent de permanence synthétique");
  const admin = await createActor("administrator", false, "SP06 Administration synthétique");
  const colleague = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true });
  const phone = "+212600000001";
  const name = "Prospect de permanence synthétique";
  const note = "Le client a confirmé son intérêt pendant la permanence.";
  const target = await colleague.newPage();
  target.setDefaultTimeout(15_000);
  try {
    await testControl("worker-stop");
    await signIn(page, admin);
    const policy = {
      expected_version: (await (await page.request.get("/api/v1/visit-schedule/policy")).json()).version,
      company_car_capacity_per_hour: 2,
      working_windows: Array.from({ length: 7 }, (_, day) => ({ weekday: day + 1, start_local: "09:00", end_local: "19:00" })),
      lunch_breaks: [],
    };
    const preview = await staffCommand(page, "visit-schedule/policy/preview", policy);
    expect(preview.status()).toBe(200);
    expect((await staffCommand(page, "visit-schedule/policy", { ...policy, preview_hash: (await preview.json()).preview_hash }, "PUT")).status()).toBe(200);
    await clearActorContext(page);
    await signIn(page, owner);
    const lead = await createLead(page, name, phone);
    const dossier = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    const deal = await staffCommand(page, "deals", dealBody(dossier.contact.id, "Projet de permanence synthétique"));
    expect(deal.status()).toBe(200);
    const { id: dealId } = await deal.json();
    await expect(page.getByRole("button", { name: "Collaborateurs", exact: true })).toBeVisible();
    await page.goto(`/deals/${dealId}`);
    await expect(page.getByRole("button", { name: "Collaborateurs", exact: true })).toBeVisible();

    await signIn(target, backup);
    expect((await target.request.get(`/api/v1/enquiries/${lead}`)).status()).toBe(404);
    expect((await target.request.get(`/api/v1/deals/${dealId}`)).status()).toBe(404);
    await target.getByRole("button", { name: "Rechercher", exact: true }).tap();
    const search = target.getByRole("dialog", { name: "Recherche globale", exact: true });
    const phoneField = search.getByLabel("Nom, téléphone ou référence");
    await phoneField.fill("060000000");
    await search.getByRole("button", { name: "Rechercher", exact: true }).tap();
    await expect(search.getByText("Aucun résultat accessible", { exact: true })).toBeVisible();
    await phoneField.fill("06 00 00 00 01");
    await search.getByRole("button", { name: "Rechercher", exact: true }).tap();
    await search.getByRole("link", { name: new RegExp(name + " Prospect") }).tap();
    await expect(target.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(target.getByText("Prospect · Lecture seule", { exact: true })).toBeVisible();
    await expect(target.getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    const handoff = target.getByRole("region", { name: "Notes d’autres agents", exact: true });
    await handoff.getByLabel("Ajouter une note pour l’agent responsable").fill(note);
    await target.route(`**/api/v1/coverage/enquiries/${lead}/notes`, async route => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
    await handoff.getByRole("button", { name: "Ajouter la note", exact: true }).tap();
    await expect(handoff.getByLabel("Ajouter une note pour l’agent responsable")).toHaveValue(note);
    await handoff.getByRole("button", { name: "Réessayer l’envoi", exact: true }).tap();
    await expect(handoff.getByText(note, { exact: true })).toHaveCount(1);
    await expect(handoff.getByText("SP06 Agent de permanence synthétique", { exact: true })).toBeVisible();
    await expect(handoff.locator("time")).toHaveCount(1);
    await mkdir("output/playwright/agent-handoff", { recursive: true });
    await handoff.getByLabel("Ajouter une note pour l’agent responsable").scrollIntoViewIfNeeded();
    expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await target.screenshot({ path: "output/playwright/agent-handoff/reader-phone.png" });

    expect(await runReminders(new Date("2035-01-08T10:00:00Z"))).toEqual({ processed: 1 });
    await page.goto("/dashboard");
    const bell = page.getByRole("button", { name: "Ouvrir les notifications", exact: true });
    await expect(bell.getByRole("status", { name: "1 notification non lue", exact: true })).toHaveText("1");
    await bell.click();
    const inbox = page.getByRole("dialog", { name: "Notifications", exact: true });
    await inbox.getByRole("link", { name: /Note d’un autre agent/ }).click();
    const received = page.getByRole("region", { name: "Notes d’autres agents", exact: true });
    await expect(received.getByText(note, { exact: true })).toBeVisible();
    await received.getByText(note, { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/playwright/agent-handoff/owner-desktop.png" });
    await received.getByRole("button", { name: "Marquer comme vue", exact: true }).click();
    await expect(received.getByText(/Vue le/)).toBeVisible();
    expect(await runReminders(new Date("2035-01-08T14:00:00Z"))).toEqual({ processed: 0 });

    await page.getByRole("button", { name: "Collaborateurs", exact: true }).click();
    const grant = page.getByRole("dialog", { name: "Collaborateurs", exact: true });
    await grant.getByLabel("Collaborateur à ajouter", { exact: true }).selectOption(backup.id);
    await grant.getByRole("button", { name: "Ajouter le collaborateur", exact: true }).click();
    await grant.getByLabel("Motif de l’opération", { exact: true }).fill("Collaboration synthétique");
    await grant.getByRole("button", { name: "Vérifier l’impact", exact: true }).click();
    const confirmation = page.getByRole("alertdialog");
    await expect(confirmation.getByText("SP06 Agent de permanence synthétique", { exact: true }).first()).toBeVisible();
    const result = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith("/collaborators"));
    await confirmation.getByRole("button", { name: "Confirmer l’opération", exact: true }).click();
    expect((await result).status()).toBe(200);
    await expect(confirmation).toHaveCount(0);
    await expect(grant).toHaveCount(0);
    expect((await target.request.get(`/api/v1/enquiries/${lead}`)).status()).toBe(200);
    await target.goto(`/leads/${lead}`);
    await target.getByRole("button", { name: "Actions", exact: true }).tap();
    await expect(target.getByRole("link", { name: "Modifier", exact: true })).toBeVisible();
  } finally {
    await colleague.close();
    await clearActorContext(page);
    await testControl("worker-start");
    await removeActor(backup);
    await removeActor(owner);
    await removeActor(admin);
  }
});
