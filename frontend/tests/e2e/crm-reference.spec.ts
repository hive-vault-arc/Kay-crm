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
  await page.evaluate(() => document.fonts.ready);
  await mkdir(output, { recursive: true });
  await page.screenshot({ path: path.join(output, `${name}.png`) });
}

test("CRM references: populated directories, real filters, row selection, lead follow-up and responsive records", async ({ page, actor }) => {
  test.setTimeout(240_000);
  const owner = await createActor("agent", false, "SP06 Agent démo A");
  const failures: string[] = [];
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await signIn(page, actor);
    const leads: string[] = [], deals: string[] = [];
    const statuses = ["new", "in_progress", "follow_up", "qualified", "analysis", "new", "in_progress", "follow_up", "closed", "not_qualified", "analysis", "qualified"];
    for (let index = 1; index <= 12; index++) {
      const name = `Client démo ${String(index).padStart(2, "0")}`;
      const result = await staffCommand(page, "enquiries", {
        new_contact: { name, type: "person", phones: [{ number: `+21260010${String(index).padStart(4, "0")}`, label: "Principal", is_primary: true }], emails: [{ email: `client-demo-${index}@example.com`, label: "Principal", is_primary: true }], roles: ["buyer"], primary_agent_id: owner.id, country: "MA", nationality: "MA", languages: ["french", "darija"] },
        message: "Données synthétiques : recherche d’un appartement à Tanger, avec terrasse et deux chambres. Visite à planifier après confirmation du budget.",
        source: "phone", assigned_agent_id: owner.id, initial_budget: "500.000 DH - 1.000.000 DH", campaign_source: index % 3 === 0 ? "mubawab" : index % 2 === 0 ? "web_form" : "facebook", rating: index % 3 === 0 ? "cold" : index % 2 === 0 ? "hot" : "warm", status: statuses[index - 1],
      });
      expect(result.status()).toBe(200);
      const lead = (await result.json()).id; leads.push(lead);
      const detail = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
      const dealResult = await staffCommand(page, "deals", { ...dealBody(detail.contact.id, `Résidence démo ${index}`), initial_budget: "500.000 DH - 1.000.000 DH", stage: index % 3 === 0 ? "negotiation" : index % 2 === 0 ? "visit" : "new" });
      expect(dealResult.status()).toBe(200); deals.push((await dealResult.json()).id);
    }
    for (const route of ["leads", "deals"]) {
      await page.goto(`/${route}`);
      await expect(page.locator("tbody tr")).toHaveCount(12);
      await expect(page.locator(".crm-directory-hero img")).toBeVisible();
      await expect(page.locator(".crm-directory-toolbar")).toBeVisible();
      await geometry(page);
      await capture(page, `${route}-1600`);
      const rows = page.locator("tbody tr");
      await rows.nth(0).getByRole("checkbox").check(); await rows.nth(1).getByRole("checkbox").check();
      await page.getByRole("button", { name: "Afficher la sélection", exact: true }).click();
      await expect(rows).toHaveCount(2);
      await page.getByRole("button", { name: "Effacer la sélection", exact: true }).click();
      await expect(rows).toHaveCount(12);
      const panel = page.locator('[data-filter-panel="desktop"]');
      await panel.getByRole("checkbox", { name: route === "leads" ? "À relancer" : "Visite", exact: true }).check();
      await expect(page.locator("tbody tr")).toHaveCount(route === "leads" ? 2 : 4);
      await panel.getByRole("button", { name: "Effacer", exact: true }).click();
      await expect(page.locator("tbody tr")).toHaveCount(12);
      await panel.getByLabel("Source", { exact: true }).selectOption("facebook");
      await expect(page.locator("tbody tr")).toHaveCount(route === "leads" ? 4 : 12);
      await panel.getByRole("button", { name: "Effacer", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 900 });
      await page.getByRole("button", { name: "Afficher les filtres", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await geometry(page); await capture(page, `${route}-filters-390`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
      await geometry(page); await capture(page, `${route}-390`);
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    for (const [name, route] of [["lead", `/leads/${leads[2]}`], ["deal", `/deals/${deals[2]}`]]) {
      await page.goto(route);
      await expect(page.locator(".crm-record-heading")).toBeVisible();
      await expect(page.locator(".crm-status-board")).toBeVisible();
      if (name === "lead") await expect(page.getByRole("form", { name: "Préparer une relance", exact: true })).toBeVisible();
      for (const width of [1600, 1440, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await geometry(page);
        if ([1600, 390].includes(width)) { await page.evaluate(() => scrollTo(0, 0)); await capture(page, `${name}-${width}`); }
      }
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`/leads/${leads[2]}`);
    const follow = page.getByRole("form", { name: "Préparer une relance", exact: true });
    await expect(follow).toBeVisible();
    await follow.getByLabel("Date de relance", { exact: true }).fill("2030-01-12T10:30");
    await follow.getByLabel("Objectif de la relance (optionnel)", { exact: true }).fill("Confirmer le budget synthétique avant la visite.");
    await follow.getByText("Responsable du rappel", { exact: true }).click();
    await follow.getByLabel("Responsable de la tâche", { exact: true }).selectOption(owner.id);
    await expect(follow.getByRole("button", { name: "Planifier", exact: true })).toBeEnabled();
    const created = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/v1/tasks");
    await follow.getByRole("button", { name: "Planifier", exact: true }).click();
    expect((await created).status()).toBe(200);
    await expect(page.getByRole("status").filter({ hasText: "Relance planifiée." })).toBeVisible();
    expect(failures).toEqual([]);
  } finally { await clearActorContext(page); await removeActor(owner); }
});
