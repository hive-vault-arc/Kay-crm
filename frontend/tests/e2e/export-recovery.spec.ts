import { clearActorContext, expect, signIn, test } from "../helpers/auth";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated real-stack cases; no worker, CSV byte download or real data.
for (const [routePath, kind] of [["/contacts", "contacts"], ["/leads", "enquiries"]] as const) {
  test(`Selected ${kind} export recovers one committed job after its acknowledgement is lost`, async ({ page, actor }) => {
    const attempts: { key?: string; body: string | null; job: string }[] = [];
    try {
    await signIn(page, actor);
    await page.goto(routePath);
    await page.getByRole("button", { name: "Autres actions de la liste", exact: true }).click();
    const open = page.getByRole("button", { name: "Exporter les résultats filtrés", exact: true });
    await expect.poll(() => open.isEnabled()).toBe(true);
    await open.click();
    const panel = page.getByRole("dialog", { name: "Exporter les résultats filtrés", exact: true });
    await expect.poll(() => panel.isVisible()).toBe(true);
    await panel.getByRole("checkbox", { name: "Confirmer ce périmètre", exact: true }).check();
    await page.route("**/api/v1/exports", async route => {
      if (route.request().method() !== "POST") return route.continue();
      const result = await route.fetch();
      if (result.status() !== 200) throw new Error("SYNTHETIC_EXPORT_JOB_FAILED");
      const body: unknown = await result.json();
      if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") throw new Error("SYNTHETIC_EXPORT_JOB_INVALID");
      attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData(), job: body.id });
      if (attempts.length === 1) return route.abort("failed");
      return route.fulfill({ response: result });
    });
    await panel.getByRole("button", { name: "Créer l’export CSV", exact: true }).click();
    const retry = panel.getByRole("button", { name: "Réessayer la même demande", exact: true });
    await expect.poll(() => retry.isVisible()).toBe(true);
    await expect.poll(() => panel.getByRole("checkbox", { name: "Confirmer ce périmètre", exact: true }).isDisabled()).toBe(true);
    await expect.poll(() => panel.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
    await page.keyboard.press("Escape");
    await expect.poll(() => panel.isVisible()).toBe(true);
    await retry.click();
    await expect.poll(() => panel.count()).toBe(0);
    await expect.poll(() => page.getByRole("status").filter({ hasText: "Export demandé" }).count()).toBe(1);
    expect(attempts.length).toBe(2);
    expect(Boolean(attempts[0].key) && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body && attempts[0].job === attempts[1].job).toBe(true);
    const history = await page.request.get("/api/v1/exports");
    if (history.status() !== 200) throw new Error("SYNTHETIC_EXPORT_HISTORY_FAILED");
    const result: unknown = await history.json();
    expect(Boolean(result && typeof result === "object" && "total" in result && result.total === 1)).toBe(true);
    } finally { attempts.length = 0; await clearActorContext(page); }
  });
}
