import { readFile } from "node:fs/promises";
import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { discoveryFixture, lifecycle, searchFor } from "../helpers/discovery";
import { testControl } from "../helpers/api-process";

test("SP19 AT22/24/29: scoped cross-domain search, filtered export, archive/restore and privileged audit", async ({ page }) => {
  test.setTimeout(120000); const actors: TestActor[] = [];
  try {
    const data = await discoveryFixture(page, actors);
    await searchFor(page);
    await expect(page.getByRole("link", { name: "SP19 visible synthétique", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "SP19 privé synthétique", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "SP19-SHARED : SP19 bien synthétique", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/leads"); await page.getByLabel("Rechercher un nom, téléphone ou e-mail", { exact: true }).fill("SP19 visible");
    await page.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(page.getByText("1 demande(s) accessible(s).", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true }).click();
    await page.getByRole("button", { name: "Confirmer l’export CSV", exact: true }).click();
    await expect(page.getByText(/Export demandé/)).toBeVisible();
    await page.getByRole("link", { name: "Mes exports", exact: true }).click();
    await testControl("worker-start");
    await expect.poll(async () => { const state = (await (await page.request.get("/api/v1/exports")).json()).items[0]?.state; if (state !== "ready") console.info("SP19 worker probe", JSON.stringify(await testControl("worker-status"))); return state; }, { timeout: 15000 }).toBe("ready");
    await page.getByRole("button", { name: "Actualiser les exports", exact: true }).click();
    await expect(page.getByRole("button", { name: "Télécharger le CSV", exact: true })).toBeVisible();
    const downloaded = page.waitForEvent("download"); await page.getByRole("button", { name: "Télécharger le CSV", exact: true }).click();
    const file = await downloaded; const csv = await readFile((await file.path())!, "utf8");
    expect(csv).toContain("SP19 visible"); expect(csv).toContain("'+212600000001"); expect(csv).not.toContain("SP19 privé"); await file.delete();
    await testControl("worker-stop");
    await page.goto(`/projects/properties/${data.pid}`); await lifecycle(page); await page.reload(); await expect(page.getByRole("heading", { name: "État : Archivé", exact: true })).toBeVisible(); await lifecycle(page, true);
    await page.goto("/dashboard"); await page.getByRole("link", { name: "Journal d’audit", exact: true }).click();
    await expect(page.getByText("exports.downloaded", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, data.agent); await searchFor(page);
    await expect(page.getByRole("link", { name: "SP19 visible synthétique", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "SP19 privé synthétique", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "SP19-SHARED : SP19 bien synthétique", exact: true })).toBeVisible();
    await page.keyboard.press("Escape"); await page.goto("/leads"); await expect(page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true })).toHaveCount(0);
    expect((await page.request.get("/api/v1/exports")).status()).toBe(403); expect((await page.request.get("/api/v1/audit/events")).status()).toBe(403);
    await page.goto("/dashboard?view=audit"); await expect(page.getByRole("alert").filter({ hasText: "Accès non autorisé" })).toContainText("Accès non autorisé");
  } finally { await testControl("worker-stop"); await clearActorContext(page); for (const actor of [...actors].reverse()) await removeActor(actor); }
});

test("SP19: lost export acknowledgement reuses the original request key", async ({ page }) => {
  test.setTimeout(90000); const actors: TestActor[] = [];
  try {
    await discoveryFixture(page, actors); await page.goto("/leads");
    await page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true }).click();
    let key: string | undefined, replay: string | undefined;
    await page.route("**/api/v1/exports", async route => { if (route.request().method() !== "POST") return route.continue(); key = route.request().headers()["idempotency-key"]; expect((await route.fetch()).status()).toBe(200); await route.abort("connectionfailed"); });
    await page.getByRole("button", { name: "Confirmer l’export CSV", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await page.unroute("**/api/v1/exports");
    await page.route("**/api/v1/exports", async route => { replay = route.request().headers()["idempotency-key"]; await route.continue(); });
    await page.getByRole("button", { name: "Réessayer", exact: true }).click(); await expect(page.getByText(/Export demandé/)).toBeVisible(); expect(replay).toBe(key); await page.unroute("**/api/v1/exports");
    expect((await (await page.request.get("/api/v1/exports")).json()).total).toBe(1);
    await page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true }).click(); await page.getByRole("button", { name: "Confirmer l’export CSV", exact: true }).click(); await expect(page.getByText(/Export demandé/)).toBeVisible(); expect((await (await page.request.get("/api/v1/exports")).json()).total).toBe(2);
  } finally { await clearActorContext(page); for (const actor of [...actors].reverse()) await removeActor(actor); }
});
