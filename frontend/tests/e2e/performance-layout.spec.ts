import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test, expect, clearActorContext, removeActor, type TestActor } from "../helpers/auth";
import { comparePoints, openAttribution, openReports, reportFixture } from "../helpers/reports";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { writableStatusSchema } from "../../src/features/contacts/contracts";

test("Performance: neutral KPIs, truthful current pipeline and stacked agent totals", async ({ page }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(20_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const actors: TestActor[] = [], errors: string[] = [];
  try {
    const fixture = await reportFixture(page, actors);
    const enquiries = await (await page.request.get("/api/v1/enquiries?page=1&page_size=50")).json();
    for (const [index, status] of ["in_progress", "closed"].entries()) {
      const enquiry = await (await page.request.get(`/api/v1/enquiries/${enquiries.items[index].id}`)).json();
      expect((await staffCommand(page, `enquiries/${enquiry.id}`, { expected_version: enquiry.version, message: enquiry.message, status, initial_budget: enquiry.initial_budget, campaign_source: enquiry.campaign_source, rating: enquiry.rating }, "PATCH")).status()).toBe(200);
    }
    for (const status of writableStatusSchema.options.filter(status => !["in_progress", "closed"].includes(status))) {
      expect((await staffCommand(page, "enquiries", { contact_id: fixture.contact, initial_budget: "500000", message: "SP17 nouvelle demande synthétique", source: "phone", status })).status()).toBe(200);
    }
    for (const stage of ["new", "visit"]) expect((await staffCommand(page, "deals", { ...dealBody(fixture.contact, `SP17 affaire ${stage} synthétique`), stage })).status()).toBe(200);
    page.on("pageerror", () => errors.push("PAGE_ERROR"));
    page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/dashboard");
    const workspace = await (await page.request.get("/api/v1/reports/workspace")).json();
    const summary = page.locator(".kay-dash-kpis");
    await expect(summary.locator(".kay-dash-kpi")).toHaveCount(4);
    const backgrounds = await summary.locator(".kay-dash-kpi").evaluateAll(elements => elements.map(element => getComputedStyle(element).backgroundColor));
    expect(new Set(backgrounds).size).toBe(1);
    expect(backgrounds[0]).not.toBe("rgba(0, 0, 0, 0)");
    const labels = { enquiries: "Demandes reçues", active_deals: "Affaires actives", upcoming_visits: "Visites à venir", follow_ups: "Prospects à relancer" };
    for (const [key, label] of Object.entries(labels)) await expect(summary.getByRole("button", { name: `${label} : ${workspace.kpis[key].total}. Voir les dossiers.`, exact: true })).toBeVisible();
    const pipeline = page.getByRole("region", { name: "Pipeline commercial", exact: true });
    const stages = await (await page.request.get("/api/v1/deals?page=1&page_size=1")).json();
    const leadCounts = await (await page.request.get("/api/v1/enquiries?page=1&page_size=1")).json();
    expect(leadCounts.status_counts).toEqual({ ...Object.fromEntries(writableStatusSchema.options.map(status => [status, 1])), converted: 0 });
    expect(leadCounts.total).toBe(writableStatusSchema.options.length);
    const activeStages = ["new", "visit", "negotiation", "documents", "reserved"];
    const legend = pipeline.getByRole("list", { name: "Nombre exact par étape", exact: true });
    await expect(legend.getByRole("button")).toHaveCount(activeStages.length);
    for (const [index, key] of activeStages.entries()) {
      expect(workspace.pipeline[key]).toBe(stages.stage_counts[key]);
      await expect(legend.getByRole("button").nth(index).locator("strong")).toHaveText(String(stages.stage_counts[key]));
    }
    expect(workspace.kpis.active_deals.total).toBe(activeStages.reduce((sum, key) => sum + stages.stage_counts[key], 0));
    await expect(pipeline.locator(".kay-dash-arc-total strong")).toHaveText(String(workspace.kpis.active_deals.total));
    await expect(pipeline.locator('svg path[fill="transparent"]')).toHaveCount(activeStages.length);
    await expect(pipeline.getByText("Clôtures sur la période", { exact: true })).toBeVisible();
    await mkdir("output/playwright/performance", { recursive: true });
    await page.screenshot({ path: "output/playwright/performance/desktop.png" });
    await pipeline.screenshot({ path: "output/playwright/performance/pipeline.png" });
    await page.setViewportSize({ width: 360, height: 900 });
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/playwright/performance/mobile.png" });
    await pipeline.screenshot({ path: "output/playwright/performance/pipeline-mobile.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await openReports(page);
    const compared = await comparePoints(page);
    for (const metric of compared.metrics) {
      const card = page.locator(`[data-metric="${metric.key}"]`);
      await expect(card.locator("small")).toHaveText(metric.basis === "current" ? "Situation actuelle" : "Période sélectionnée");
      if (metric.unit === "count") await expect(card.locator(":scope > strong")).toHaveText(metric.value);
    }
    const report = await (await page.request.get("/api/v1/reports/dashboard")).json();
    const contacts = report.metrics.find((metric: { key: string }) => metric.key === "contacts");
    Object.assign(contacts, { total: 66, value: "66", series: Array.from({ length: 11 }, (_, index) => ({ id: randomUUID(), label: `SP17 contributeur de pagination synthétique ${index + 1}`, value: index + 1 })) });
    await page.route("**/api/v1/reports/dashboard**", route => route.fulfill({ json: report }));
    await page.getByRole("button", { name: "Appliquer la période", exact: true }).click();
    await openAttribution(page, "contacts");
    const portfolio = page.getByRole("region", { name: "Contacts actifs par responsable actuel", exact: true });
    const paging = portfolio.getByRole("navigation", { name: "Pages du graphique contacts", exact: true });
    await expect(portfolio.getByText("Barre empilée par contributeur. Total affiché : 55.", { exact: true })).toBeVisible();
    await paging.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(portfolio.getByRole("list", { name: "Valeurs : Contacts actifs par responsable actuel", exact: true }).getByRole("button")).toContainText("11. SP17 contributeur de pagination synthétique 11");
    await expect(portfolio.getByText("Barre empilée par contributeur. Total affiché : 11.", { exact: true })).toBeVisible();
    await expect(portfolio.locator('svg rect[fill^="var(--chart-series"]')).toHaveCount(1);
    await expect(portfolio.getByRole("button", { name: "Voir les dossiers : 66", exact: true })).toBeVisible();
    await paging.getByRole("button", { name: "Précédent", exact: true }).click();
    await expect(portfolio.getByRole("list", { name: "Valeurs : Contacts actifs par responsable actuel", exact: true }).getByRole("button")).toHaveCount(10);
    await page.unroute("**/api/v1/reports/dashboard**");
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
