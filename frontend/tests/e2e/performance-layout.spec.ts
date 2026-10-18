import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test, expect, clearActorContext, removeActor, type TestActor } from "../helpers/auth";
import { comparePoints, openReports, reportFixture } from "../helpers/reports";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { writableStatusSchema } from "../../src/features/contacts/contracts";

test("Performance: neutral KPIs, truthful distribution funnels and stacked agent totals", async ({ page }) => {
  test.setTimeout(180_000);
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
    await openReports(page); await comparePoints(page);
    const summary = page.getByRole("group", { name: "Synthèse des indicateurs", exact: true });
    await expect(summary.locator(".kpi-card")).toHaveCount(5);
    await expect(summary.locator(".kpi-card").first()).toHaveCSS("background-color", "rgb(255, 253, 248)");
    await expect(summary.locator('[class*="bg-info-background"], [class*="bg-purple-background"], [class*="bg-success-background"], [class*="bg-warning-background"], [class*="bg-teal-background"]')).toHaveCount(0);
    await expect(summary.getByRole("heading", { name: "Situation actuelle", exact: true })).toBeVisible();
    await expect(summary.getByRole("heading", { name: /Période sélectionnée/ })).toBeVisible();
    const pipelines = page.getByRole("region", { name: "Répartition des pipelines", exact: true });
    const stages = await (await page.request.get("/api/v1/deals?page=1&page_size=1")).json();
    const leadCounts = await (await page.request.get("/api/v1/enquiries?page=1&page_size=1")).json();
    expect(leadCounts.status_counts).toEqual({ ...Object.fromEntries(writableStatusSchema.options.map(status => [status, 1])), converted: 0 });
    expect(leadCounts.total).toBe(writableStatusSchema.options.length);
    const terminalStatuses = new Set(["lost", "junk_lead", "closed"]);
    const activeLeadStatuses = writableStatusSchema.options.filter(status => !terminalStatuses.has(status));
    for (const [name, values] of [
      ["Pipeline des prospects", activeLeadStatuses.map(() => 1)],
      ["Pipeline des affaires", Object.values(stages.stage_counts) as number[]],
    ] as const) {
      const region = pipelines.getByRole("region", { name, exact: true });
      const bars = region.locator('svg rect[fill^="var(--"]');
      await expect(bars).toHaveCount(values.length);
      expect(await region.locator('[style*="clip-path"]').evaluate(element => getComputedStyle(element).clipPath)).toContain("polygon");
      const legend = region.locator("dl").first();
      const total = values.reduce((sum, value) => sum + value, 0);
      let end = 0, unit: number | undefined;
      for (const [index, value] of values.entries()) {
        const bar = bars.nth(index), width = Number(await bar.getAttribute("width")), x = Number(await bar.getAttribute("x"));
        expect(width).toBeGreaterThanOrEqual(0); expect(x).toBeCloseTo(end, 1);
        if (value === 0) expect(width).toBe(0);
        else { if (unit !== undefined) expect(width / value).toBeCloseTo(unit, 1); unit = width / value; }
        end += width;
        await expect(legend.locator("dd").nth(index)).toHaveText(`${value.toLocaleString("fr-MA")} dossier(s)`);
      }
      expect(end / total).toBeCloseTo(unit!, 1);
    }
    const leadPipeline = pipelines.getByRole("region", { name: "Pipeline des prospects", exact: true });
    const leadTerminalLegend = leadPipeline.locator("dl").last();
    await expect(leadTerminalLegend.getByText("Perdu", { exact: true })).toBeVisible();
    await expect(leadTerminalLegend.getByText("Indésirable", { exact: true })).toBeVisible();
    await expect(leadTerminalLegend.getByText("Clôturé", { exact: true })).toBeVisible();
    const team = page.getByRole("region", { name: "Activité de l’équipe", exact: true });
    expect((await pipelines.boundingBox())!.y).toBeLessThan((await team.boundingBox())!.y);
    await expect(team.getByText(/Pas de séries quotidiennes/)).toBeVisible();
    await mkdir("output/playwright/performance", { recursive: true });
    await page.screenshot({ path: "output/playwright/performance/desktop.png" });
    await pipelines.screenshot({ path: "output/playwright/performance/funnels.png" });
    await team.screenshot({ path: "output/playwright/performance/team.png" });
    await page.setViewportSize({ width: 360, height: 900 });
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: "output/playwright/performance/mobile.png" });
    await pipelines.getByRole("region", { name: "Pipeline des affaires", exact: true }).screenshot({ path: "output/playwright/performance/funnel-mobile.png" });
    await pipelines.getByRole("region", { name: "Pipeline des prospects", exact: true }).screenshot({ path: "output/playwright/performance/leads-funnel-mobile.png" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const report = await (await page.request.get("/api/v1/reports/dashboard")).json();
    const contacts = report.metrics.find((metric: { key: string }) => metric.key === "contacts");
    Object.assign(contacts, { total: 66, value: "66", series: Array.from({ length: 11 }, (_, index) => ({ id: randomUUID(), label: `SP17 contributeur de pagination synthétique ${index + 1}`, value: index + 1 })) });
    await page.route("**/api/v1/reports/dashboard**", route => route.fulfill({ json: report }));
    await page.getByRole("button", { name: "Appliquer la période", exact: true }).click();
    const portfolio = team.getByRole("region", { name: "Contacts actifs par responsable actuel", exact: true });
    const paging = portfolio.getByRole("navigation", { name: "Pages du graphique contacts", exact: true });
    await expect(portfolio.getByText("Barre empilée par contributeur. Total affiché : 55.", { exact: true })).toBeVisible();
    await paging.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(portfolio.getByRole("table").getByRole("button")).toHaveText("11. SP17 contributeur de pagination synthétique 11");
    await expect(portfolio.getByText("Barre empilée par contributeur. Total affiché : 11.", { exact: true })).toBeVisible();
    await expect(portfolio.locator('svg rect[fill^="var(--chart-series"]')).toHaveCount(1);
    await expect(portfolio.getByRole("button", { name: "Voir les dossiers : 66", exact: true })).toBeVisible();
    await paging.getByRole("button", { name: "Précédent", exact: true }).click();
    await expect(portfolio.getByRole("table").getByRole("button")).toHaveCount(10);
    await page.unroute("**/api/v1/reports/dashboard**");
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
