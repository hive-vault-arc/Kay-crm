import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { comparePoints, openReports, reportFixture } from "../helpers/reports";

test("SP17 AT-18/36/39: real Bklit/API/table parity, scoped drill-downs, dates and private counts", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const fixture = await reportFixture(page, actors); await openReports(page); const manager = await comparePoints(page);
    expect(manager.scope).toBe("agency"); expect(manager.metrics.find((m: { key: string }) => m.key === "contacts").total).toBe(2);
    const won = page.getByRole("region", { name: "Affaires gagnées non rouvertes", exact: true }); await won.getByRole("button", { name: "Voir les dossiers : 1", exact: true }).click();
    const drill = page.getByRole("region", { name: "Dossiers de l’indicateur", exact: true }); await expect(drill.getByRole("link", { name: "SP17 affaire gagnée synthétique", exact: true })).toHaveAttribute("href", `/deals/${fixture.deal}`); await drill.getByRole("button", { name: "Fermer les dossiers", exact: true }).click();
    await page.getByLabel("Du (inclus)", { exact: true }).fill("2020-01-01"); await page.getByLabel("Au (inclus)", { exact: true }).fill("2020-01-31"); await page.getByRole("button", { name: "Appliquer la période", exact: true }).click();
    await expect(won.getByText(/Le total est 0/)).toBeVisible(); await expect(page.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toHaveText("2");
    await clearActorContext(page); await signIn(page, fixture.agent); await openReports(page); const agent = await comparePoints(page);
    expect(agent.scope).toBe("assigned_or_shared"); expect(agent.metrics.some((m: { key: string }) => m.key === "collections")).toBe(false); expect(agent.metrics.find((m: { key: string }) => m.key === "contacts").total).toBe(1);
    expect((await page.request.get("/api/v1/reports/drill-down?metric=collections")).status()).toBe(403);
    await expect(page.getByText("SP17 contact privé synthétique", { exact: true })).toHaveCount(0);
    await clearActorContext(page); await signIn(page, fixture.other); await openReports(page);
    const copied = await (await page.request.get(`/api/v1/reports/drill-down?metric=contacts&attribution_id=${fixture.agent.id}`)).json(); expect(copied.total).toBe(0);
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP17 AT-23: retained dates, loading, denied and interrupted read retry", async ({ page, actor }) => {
  await signIn(page, actor); await openReports(page);
  await page.getByLabel("Du (inclus)", { exact: true }).fill("2026-02-01"); await page.getByLabel("Au (inclus)", { exact: true }).fill("2026-01-01"); await page.getByRole("button", { name: "Appliquer la période", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Choisissez deux dates" })).toBeVisible();
  await page.route("**/api/v1/reports/dashboard?**", route => route.abort("connectionfailed"));
  await page.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await expect(page.getByLabel("Du (inclus)", { exact: true })).toHaveValue("2026-02-01"); await expect(page.getByRole("heading", { name: "Travail à faire", exact: true })).toBeVisible();
  await page.unroute("**/api/v1/reports/dashboard?**"); await page.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByRole("button", { name: "Dossiers : Contacts actifs par responsable actuel", exact: true })).toBeVisible();
  await page.route("**/api/v1/reports/dashboard?**", route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN" } }) }));
  await page.getByRole("button", { name: "Actualiser les indicateurs", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Cette opération n’est pas autorisée" })).toBeVisible(); await expect(page.getByRole("heading", { name: "Travail à faire", exact: true })).toBeVisible(); await page.unroute("**/api/v1/reports/dashboard?**");
});
