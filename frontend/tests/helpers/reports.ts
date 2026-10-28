import type { Page } from "@playwright/test";
import { createActor, clearActorContext, expect, signIn, type TestActor } from "./auth";
import { createLead, staffCommand } from "./leads";
import { dealBody } from "./deals";
import { inventoryFixture } from "./requirements";
import { outcomeBody } from "./outcomes";

export async function reportFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent", false, "SP06 SP17 agent responsable synthétique"); actors.push(agent);
  const other = await createActor("agent", false, "SP06 SP17 collaborateur au nom particulièrement long pour vérifier le retour à la ligne sur téléphone synthétique"); actors.push(other);
  const manager = await createActor("manager", false, "SP06 SP17 responsable synthétique"); actors.push(manager);
  await signIn(page, agent); const lead = await createLead(page, "SP17 contact attribué synthétique"), contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact.id as string;
  await clearActorContext(page); await signIn(page, manager); const stock = await inventoryFixture(page, contact);
  await clearActorContext(page); await signIn(page, agent);
  const created = await staffCommand(page, "deals", { ...dealBody(contact, "SP17 affaire gagnée synthétique"), offering_id: stock.unitOffer, expected_offering_version: 2 }); expect(created.status()).toBe(200); const deal = (await created.json()).id as string;
  expect((await staffCommand(page, `deals/${deal}/close`, await outcomeBody(page, deal))).status()).toBe(200);
  await clearActorContext(page); await signIn(page, other); await createLead(page, "SP17 contact privé synthétique", "+212600000002");
  await clearActorContext(page); await signIn(page, manager);
  expect((await staffCommand(page, `contacts/${contact}/notes`, { kind: "call", body: "SP17 action synthétique du responsable réel" })).status()).toBe(200);
  return { agent, other, manager, contact, deal, stock };
}

export async function openReports(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Rapports", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Rapports détaillés", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toBeVisible();
}

export async function openAttribution(page: Page, metric: "contacts" | "won" | "activities") {
  const labels = { contacts: "Contacts · responsable actuel", won: "Gagnées · responsable à la clôture", activities: "Activités · auteur" };
  await page.getByRole("button", { name: labels[metric], exact: true }).click();
  await expect(page.getByText("Chargement du graphique…", { exact: true })).toHaveCount(0);
}

export async function comparePoints(page: Page) {
  const start = await page.getByLabel("Du (inclus)", { exact: true }).inputValue(), end = await page.getByLabel("Au (inclus)", { exact: true }).inputValue();
  const response = await page.request.get(`/api/v1/reports/dashboard?start_on=${start}&end_on=${end}`);
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("no-store");
  const report = await response.json();
  for (const metric of report.metrics.filter((m: { key: string }) => ["contacts", "won", "activities"].includes(m.key))) {
    await openAttribution(page, metric.key);
    const section = page.getByRole("region", { name: metric.label, exact: true });
    if (!metric.series.length) {
      await expect(section.getByText(/Aucune donnée pour ce graphique/)).toBeVisible();
      await page.getByRole("button", { name: "Tous les rapports", exact: true }).click(); continue;
    }
    const list = section.getByRole("list", { name: `Valeurs : ${metric.label}`, exact: true });
    const colors = ["var(--chart-series3)", "var(--chart-series4)", "var(--chart-series5)", "var(--chart-series2)", "var(--chart-series1)"];
    const bars = section.getByRole("group", { name: `Graphique : ${metric.label}`, exact: true }).locator('svg rect[fill^="var(--chart-series"]');
    for (let offset = 0; offset < metric.series.length; offset += 10) {
      const points = metric.series.slice(offset, offset + 10); await expect(bars).toHaveCount(points.length); let ratio: number | undefined;
      for (const [index, point] of points.entries()) {
        const button = list.getByRole("button").nth(index); await expect(button).toContainText(`${offset + index + 1}. ${point.label}`); await expect(button.locator("strong")).toHaveText(String(point.value));
        await expect(bars.nth(index)).toHaveAttribute("fill", colors[(offset + index) % colors.length]);
        const width = Number(await bars.nth(index).getAttribute("width"));
        expect(width).toBeGreaterThan(0); if (ratio !== undefined) expect(width / point.value).toBeCloseTo(ratio, 1); else ratio = width / point.value;
        const x = Number(await bars.nth(index).getAttribute("x"));
        if (index === 0) expect(x).toBeCloseTo(0, 1);
        else expect(x).toBeCloseTo(Number(await bars.nth(index - 1).getAttribute("x")) + Number(await bars.nth(index - 1).getAttribute("width")), 1);
        const detail = await (await page.request.get(`/api/v1/reports/drill-down?metric=${metric.key}&attribution_id=${point.id}&start_on=${report.start_on}&end_on=${report.end_on}`)).json();
        expect(detail.total).toBe(point.value);
      }
      if (offset + 10 < metric.series.length) await section.getByRole("button", { name: "Suivant", exact: true }).click();
    }
    await page.getByRole("button", { name: "Tous les rapports", exact: true }).click();
  }
  return report;
}
