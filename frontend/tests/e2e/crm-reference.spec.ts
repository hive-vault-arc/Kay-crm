import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, signIn, createActor, removeActor, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { geometry } from "../helpers/report-review";

const output = path.resolve("output/playwright/crm-reference");
async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe("loaded");
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, `${name}.png`), timeout: 15_000 });
}

test("CRM references: populated directories, real filters, row selection, lead follow-up and responsive records", async ({ page, actor }) => {
  test.setTimeout(240_000);
  page.setDefaultTimeout(15_000);
  const owner = await createActor("agent", false, "SP06 Agent démo A");
  const failures: string[] = [];
  let initialFailure = false;
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await signIn(page, actor);
    const leads: string[] = [], deals: string[] = [];
    const runLabel = `Client démo ${owner.id.slice(0, 8)}`;
    const statuses = ["new", "in_progress", "follow_up", "qualified", "analysis", "new", "in_progress", "follow_up", "closed", "not_qualified", "analysis", "qualified"];
    for (let index = 1; index <= 12; index++) {
      const name = `${runLabel} ${String(index).padStart(2, "0")}`;
      const result = await staffCommand(page, "enquiries", {
        new_contact: { name, type: "person", phones: [{ number: `+21260010${String(index).padStart(4, "0")}`, label: "Principal", is_primary: true }], emails: [{ email: `client-demo-${index}@example.com`, label: "Principal", is_primary: true }], roles: ["buyer"], primary_agent_id: owner.id, country: "MA", nationality: "MA", languages: ["french", "darija"] },
        message: "Données synthétiques : recherche d’un appartement à Tanger, avec terrasse et deux chambres. Visite à planifier après confirmation du budget.",
        source: "phone", assigned_agent_id: owner.id, initial_budget: "500.000 DH - 1.000.000 DH", campaign_source: index % 3 === 0 ? "mubawab" : index % 2 === 0 ? "web_form" : "facebook", rating: index % 3 === 0 ? "cold" : index % 2 === 0 ? "hot" : "warm", status: statuses[index - 1],
      });
      expect(result.status()).toBe(200);
      const lead = (await result.json()).id; leads.push(lead);
      const detail = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
      const dealResult = await staffCommand(page, "deals", { ...dealBody(detail.contact.id, `Résidence démo ${index}`), campaign_source: index % 3 === 0 ? "mubawab" : index % 2 === 0 ? "web_form" : "facebook", initial_budget: "500.000 DH - 1.000.000 DH", stage: index % 3 === 0 ? "negotiation" : index % 2 === 0 ? "visit" : "new" });
      expect(dealResult.status()).toBe(200); deals.push((await dealResult.json()).id);
    }
    for (const route of ["leads", "deals"]) {
      await page.goto(`/${route}`);
      const panel = page.locator('[data-filter-panel="desktop"]');
      const search = panel.getByRole("textbox", { name: /^Rechercher/ });
      const filtered = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === `/api/v1/${route === "leads" ? "enquiries" : "deals"}` && url.searchParams.get("q") === runLabel && response.request().method() === "GET"; });
      await search.fill(runLabel);
      const filteredResponse = await filtered; expect(filteredResponse.status()).toBe(200); expect((await filteredResponse.json()).total).toBe(12);
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(12);
      await expect(page.getByRole("heading", { name: route === "leads" ? "Prospects" : "Affaires", level: 1 })).toBeVisible();
      await geometry(page);
      await capture(page, `${route}-1600`);
      await rows.nth(0).getByRole("checkbox").check(); await rows.nth(1).getByRole("checkbox").check();
      await page.getByRole("button", { name: "Afficher la sélection", exact: true }).click();
      await expect(rows).toHaveCount(2);
      await page.getByRole("button", { name: "Effacer la sélection", exact: true }).click();
      await expect(rows).toHaveCount(12);
      const status = panel.getByRole("checkbox", { name: route === "leads" ? "À relancer" : "Visite", exact: true });
      await status.check();
      await expect(rows).toHaveCount(route === "leads" ? 2 : 4);
      await status.uncheck();
      await expect(rows).toHaveCount(12);
      const source = panel.getByLabel("Source", { exact: true });
      await source.selectOption("facebook");
      await expect(rows).toHaveCount(4);
      await source.selectOption("");
      await expect(rows).toHaveCount(12);
      await page.setViewportSize({ width: 390, height: 900 });
      await page.getByRole("button", { name: /^Afficher les filtres/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await geometry(page); await capture(page, `${route}-filters-390`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: /^Afficher les filtres/ })).toBeFocused();
      await geometry(page); await capture(page, `${route}-390`);
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    for (const [name, route] of [["lead", `/leads/${leads[2]}`], ["deal", `/deals/${deals[2]}`]]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: name === "lead" ? `${runLabel} 03` : "Résidence démo 3", level: 1 })).toBeVisible();
      await expect(page.getByRole("button", { name: name === "lead" ? /^Statut actuel/ : /^Étape actuelle/ })).toBeVisible();
      if (name === "lead") await expect(page.getByRole("button", { name: "Planifier une relance", exact: true })).toBeVisible();
      for (const width of [1600, 1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await geometry(page);
        if ([1600, 390].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await capture(page, `${name}-${width}`); }
      }
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/leads/${leads[2]}`);
    await page.getByRole("button", { name: "Planifier une relance", exact: true }).click();
    const follow = page.getByRole("dialog", { name: "Planifier une relance", exact: true }).getByRole("form", { name: "Créer une tâche", exact: true });
    await expect(follow).toBeVisible();
    await follow.getByLabel("Titre de la tâche", { exact: true }).fill("Relance CRM synthétique");
    await follow.getByLabel("Échéance de la tâche (heure de Casablanca)", { exact: true }).fill("2030-01-12T10:30");
    await follow.getByLabel("Consignes de la tâche", { exact: true }).fill("Confirmer le budget synthétique avant la visite.");
    await follow.getByLabel("Responsable de la tâche", { exact: true }).selectOption(owner.id);
    await expect(follow.getByRole("button", { name: "Enregistrer la tâche", exact: true })).toBeEnabled();
    const created = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/tasks");
    await follow.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click();
    expect((await created).status()).toBe(200);
    await expect(page.getByRole("status").filter({ hasText: "Relance planifiée." })).toBeVisible();
    expect(failures).toEqual([]);
  } catch (failure) { initialFailure = true; throw failure; }
  finally {
    try {
      try { await clearActorContext(page); }
      finally { await removeActor(owner); }
    } catch (failure) { if (!initialFailure) throw failure; console.warn("CRM_REFERENCE_CLEANUP_FAILED"); }
  }
});
