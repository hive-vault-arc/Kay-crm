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
  await expect(page.getByText("Chargement des indicateurs…", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Chargement du graphique…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toBeVisible();
}

export async function comparePoints(page: Page) {
  const response = await page.request.get("/api/v1/reports/dashboard");
  expect(response.status()).toBe(200); expect(response.headers()["cache-control"]).toBe("no-store");
  const report = await response.json();
  for (const metric of report.metrics.filter((m: { key: string }) => ["contacts", "won", "activities"].includes(m.key))) {
    const section = page.getByRole("region", { name: metric.label, exact: true });
    if (!metric.series.length) { await expect(section.getByText(/Aucune donnée pour ce graphique/)).toBeVisible(); continue; }
    const table = section.getByRole("table", { name: `Valeurs : ${metric.label}`, exact: true });
    const colors: Record<string, string> = { contacts: "var(--chart-series3)", won: "var(--chart-series5)", activities: "var(--chart-series4)" };
    const bars = section.locator(`svg rect[fill="${colors[metric.key]}"]`);
    await expect(bars).toHaveCount(metric.series.length);
    let ratio: number | undefined;
    for (const [index, point] of metric.series.entries()) {
      const row = table.getByRole("row").nth(index + 1); await expect(row.getByRole("button")).toHaveText(`${index + 1}. ${point.label}`); await expect(row.getByRole("cell").last()).toHaveText(String(point.value));
      const height = Number(await bars.nth(index).getAttribute("height"));
      expect(height).toBeGreaterThan(0); if (ratio !== undefined) expect(height / point.value).toBeCloseTo(ratio, 1); else ratio = height / point.value;
      const detail = await (await page.request.get(`/api/v1/reports/drill-down?metric=${metric.key}&attribution_id=${point.id}&start_on=${report.start_on}&end_on=${report.end_on}`)).json();
      expect(detail.total).toBe(point.value);
    }
  }
  return report;
}
