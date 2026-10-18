import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { test, expect, signIn, createActor, removeActor, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { convertLead } from "../helpers/deals";
import { geometry } from "../helpers/report-review";

test.use({ hasTouch: true });

async function createLead(page: Page) {
  const result = await staffCommand(page, "enquiries", {
    new_contact: { name: "Client synthétique activités", type: "person", phones: [{ number: "+212600090001", label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french"] },
    message: "Demande synthétique avant conversion", source: "phone", initial_budget: "500.000 DH - 1.000.000 DH", campaign_source: "facebook",
  });
  expect(result.status()).toBe(200);
  return (await result.json()).id as string;
}
async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await mkdir("output/playwright/scoped-activities", { recursive: true });
  await page.screenshot({ path: path.resolve(`output/playwright/scoped-activities/${name}.png`) });
}

test("activities: Lead notes survive conversion as a separate read-only origin; Deal notes stay separate", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("agent"), errors: string[] = [];
  const metrics: Awaited<ReturnType<typeof geometry>>[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await signIn(page, actor);
    const eid = await createLead(page);
    await page.goto(`/leads/${eid}`);
    const lead = page.getByRole("region", { name: "Historique du Lead", exact: true });
    await expect(lead.getByRole("table")).toBeVisible();
    await lead.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
    const form = lead.getByRole("form", { name: "Nouvelle activité" });
    await expect(form.getByLabel("Notes de suivi", { exact: true })).toBeFocused();
    await form.getByLabel("Type d’activité").selectOption("call");
    await form.getByLabel("Durée (minutes, facultative)").fill("5");
    await form.getByLabel("Sens de l’échange").selectOption("outbound");
    await form.getByLabel("Projet évoqué 1 (facultatif)").fill("Programme synthétique");
    await form.getByLabel("Notes de suivi", { exact: true }).fill("Note Lead synthétique, à conserver après conversion.");
    await form.getByRole("button", { name: "Enregistrer l’activité", exact: true }).click();
    await expect(lead.getByRole("status").filter({ hasText: "Activité enregistrée." })).toHaveText("Activité enregistrée.");
    await expect(lead.getByRole("cell", { name: "5 min", exact: true })).toBeVisible();
    await expect(lead.getByRole("cell", { name: "Sortant", exact: true })).toBeVisible();
    const original = await (await page.request.get(`/api/v1/enquiries/${eid}/activities?kind=call`)).json();
    await lead.scrollIntoViewIfNeeded(); await geometry(page); await capture(page, "lead-desktop");
    const did = await convertLead(page);
    const own = page.getByRole("region", { name: "Activités de l’affaire", exact: true });
    const origin = page.getByRole("region", { name: "Historique du Lead d’origine", exact: true });
    await expect(origin.getByText("Note Lead synthétique, à conserver après conversion.", { exact: true })).toBeVisible();
    await expect(origin.getByRole("button", { name: "Ajouter une activité", exact: true })).toHaveCount(0);
    await expect(own.getByText("Note Lead synthétique, à conserver après conversion.", { exact: true })).toHaveCount(0);
    const preserved = await (await page.request.get(`/api/v1/deals/${did}/origin-activities?kind=call`)).json();
    expect(preserved.items).toEqual(original.items);
    await own.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
    await own.getByLabel("Notes de suivi", { exact: true }).fill("Note Deal synthétique <script>sans exécution</script>");
    await own.getByRole("button", { name: "Enregistrer l’activité", exact: true }).click();
    await expect(own.getByText("Note Deal synthétique <script>sans exécution</script>", { exact: true })).toBeVisible();
    await expect(origin.getByText("Note Deal synthétique <script>sans exécution</script>", { exact: true })).toHaveCount(0);
    await own.scrollIntoViewIfNeeded(); await capture(page, "deal-desktop");
    await origin.scrollIntoViewIfNeeded(); await capture(page, "origin-desktop");
    for (const width of [320, 390, 768, 1024, 1440, 1600]) { await page.setViewportSize({ width, height: 1000 }); metrics.push(await geometry(page)); }
    await page.setViewportSize({ width: 390, height: 900 });
    await own.getByRole("button", { name: "Ajouter une activité", exact: true }).tap();
    await geometry(page); await capture(page, "activity-form-mobile");
    await own.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(own.getByRole("button", { name: "Ajouter une activité", exact: true })).toBeFocused();
    await own.getByLabel("Filtrer les activités", { exact: true }).selectOption("call");
    await expect(own.getByRole("cell", { name: "Aucune activité de ce type.", exact: true })).toBeVisible();
    await own.getByLabel("Filtrer les activités", { exact: true }).selectOption("note");
    await expect(own.getByText("Note Deal synthétique <script>sans exécution</script>", { exact: true })).toBeVisible();
    const scrollRegion = own.getByRole("region", { name: "Tableau : Activités de l’affaire", exact: true });
    await scrollRegion.focus(); await page.keyboard.press("ArrowRight");
    await expect.poll(() => scrollRegion.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
    await own.scrollIntoViewIfNeeded(); await capture(page, "deal-mobile");
    await writeFile("output/playwright/scoped-activities/geometry.json", JSON.stringify(metrics, null, 2));
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); await removeActor(actor); }
});

test("activities: pagination, validation, current-scope denial and interruption-safe retry", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("agent"), outsider = await createActor("agent");
  try {
    await signIn(page, actor); const eid = await createLead(page);
    for (let index = 0; index < 22; index++) expect((await staffCommand(page, `enquiries/${eid}/activities`, { body: `Note synthétique ${index}`, kind: "note" })).status()).toBe(200);
    await page.goto(`/leads/${eid}`);
    const region = page.getByRole("region", { name: "Historique du Lead", exact: true });
    await region.getByLabel("Filtrer les activités").selectOption("note");
    await expect(region.locator("tbody tr")).toHaveCount(20);
    await region.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(region.locator("tbody tr")).toHaveCount(2);
    await region.getByRole("button", { name: "Précédent", exact: true }).click();
    await expect(region.locator("tbody tr")).toHaveCount(20);
    await region.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
    const form = region.getByRole("form", { name: "Nouvelle activité" });
    await form.getByRole("button", { name: "Enregistrer l’activité", exact: true }).click();
    expect(await form.getByLabel("Notes de suivi", { exact: true }).evaluate((el: HTMLTextAreaElement) => el.validity.valueMissing)).toBe(true);
    await form.getByLabel("Notes de suivi", { exact: true }).fill("Note après interruption synthétique");
    let failed = false; const keys: string[] = [];
    await page.route(`**/api/v1/enquiries/${eid}/activities`, async route => {
      if (route.request().method() !== "POST") return route.continue();
      keys.push(route.request().headers()["idempotency-key"]);
      if (!failed) { failed = true; await route.fetch(); return route.abort(); }
      return route.continue();
    });
    await form.getByRole("button", { name: "Enregistrer l’activité", exact: true }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await expect(form.getByLabel("Notes de suivi", { exact: true })).toHaveValue("Note après interruption synthétique");
    await form.getByRole("button", { name: "Enregistrer l’activité", exact: true }).click();
    await expect(region.getByRole("status").filter({ hasText: "Activité enregistrée." })).toHaveText("Activité enregistrée.");
    expect(keys).toHaveLength(2); expect(keys[0]).toBe(keys[1]);
    const response = await page.request.get(`/api/v1/enquiries/${eid}/activities?kind=note`);
    const notes = await response.json(); expect(notes.total).toBe(23);
    expect(notes.items.filter((row: { body: string }) => row.body === "Note après interruption synthétique")).toHaveLength(1);
    expect((await staffCommand(page, `enquiries/${eid}/activities`, { body: "Interdit", actor: actor.id }, "POST", randomUUID())).status()).toBe(422);
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/enquiries/${eid}/activities`)).status()).toBe(404);
    expect((await staffCommand(page, `enquiries/${eid}/activities`, { body: "Interdit" })).status()).toBe(404);
  } finally { await clearActorContext(page); await removeActor(actor); await removeActor(outsider); }
});

test("activities: loading, unavailable retry and archived read-only history", async ({ page, actor }) => {
  test.setTimeout(120_000);
  const owner = await createActor("agent");
  try {
    await signIn(page, owner); const eid = await createLead(page);
    const leadDetail = await (await page.request.get(`/api/v1/enquiries/${eid}`)).json();
    const hold = Promise.withResolvers<void>(); let mode = "hold";
    await page.route(`**/api/v1/enquiries/${eid}/activities?*`, async route => {
      if (mode === "hold") await hold.promise;
      if (mode === "fail") return route.fulfill({ status: 503, json: { error: { code: "DEPENDENCY_UNAVAILABLE" } } });
      return route.continue();
    });
    await page.goto(`/leads/${eid}`);
    const region = page.getByRole("region", { name: "Historique du Lead", exact: true });
    await expect(region.getByRole("status")).toHaveText("Chargement de l’historique…");
    mode = "fail"; hold.resolve();
    await expect(region.getByRole("alert")).toBeVisible();
    mode = "pass";
    await region.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(region.getByRole("table")).toBeVisible();
    await region.getByRole("button", { name: "Actualiser l’historique", exact: true }).click();
    await expect(region.getByRole("table")).toBeVisible();
    await clearActorContext(page); await signIn(page, actor);
    const intent = { operation: "archive", expected_version: leadDetail.contact.version, reason: "Archivage synthétique de contrôle" };
    const preview = await staffCommand(page, `contacts/${leadDetail.contact.id}/preview`, intent);
    expect(preview.status()).toBe(200);
    const archive = await staffCommand(page, `contacts/${leadDetail.contact.id}/archive`, { ...intent, preview_token: (await preview.json()).preview_token });
    expect(archive.status()).toBe(200);
    await page.goto(`/leads/${eid}`);
    await expect(region.getByRole("table")).toBeVisible();
    await expect(region.getByRole("button", { name: "Ajouter une activité", exact: true })).toHaveCount(0);
    await region.scrollIntoViewIfNeeded(); await geometry(page); await capture(page, "archived-read-only");
  } finally { await clearActorContext(page); await removeActor(owner); }
});
