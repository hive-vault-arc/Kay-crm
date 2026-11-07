import { policySchema } from "@/features/schedule/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only; these fault injections follow actual isolated
// policy writes and do not substitute a synthetic write acknowledgement.
for (const [fault, width] of [["receipt", 390], ["completion", 1440]] as const) test(`Selected working-hours drawer recovers ${fault} failure without replacing its reviewed proposal at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("administrator");
  try {
    await signIn(page, actor); const first = await page.request.get("/api/v1/visit-schedule/policy");
    if (first.status() !== 200) throw new Error("SYNTHETIC_POLICY_READ_FAILED");
    const initial = policySchema.parse(await first.json()), capacity = initial.company_car_capacity_per_hour === 1000 ? 999 : initial.company_car_capacity_per_hour + 1;
    await page.setViewportSize({ width, height: 900 }); await page.goto("/settings/working-hours");
    await page.getByRole("button", { name: "Plages et pauses par jour", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Plages de travail et pauses", exact: true }), input = drawer.getByLabel("Visites avec véhicule par heure pour l’agence", { exact: true });
    await input.fill(String(capacity)); await drawer.getByRole("button", { name: "Prévisualiser l’impact", exact: true }).click();
    await expect(drawer.getByRole("heading", { name: /visite\(s\) future\(s\) à revoir/ })).toBeVisible();
    const attempts: { key?: string; body: string | null }[] = []; let failRead = false;
    await page.route("**/api/v1/visit-schedule/policy", async route => {
      if (route.request().method() === "PUT") {
        attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
        const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_POLICY_SAVE_FAILED");
        if (fault === "receipt" && attempts.length === 1) return route.abort("failed");
        if (fault === "completion") failRead = true;
        return route.fulfill({ response });
      }
      if (route.request().method() === "GET" && failRead) { failRead = false; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); }
      return route.continue();
    });
    await drawer.getByRole("button", { name: "Enregistrer les horaires", exact: true }).click();
    await expect.poll(() => input.isDisabled()).toBe(true); await expect.poll(() => drawer.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
    await drawer.getByRole("button", { name: fault === "receipt" ? "Réessayer les mêmes horaires" : "Actualiser le résultat", exact: true }).click(); await expect.poll(() => drawer.count()).toBe(0);
    expect(attempts.length === (fault === "receipt" ? 2 : 1)).toBe(true);
    if (attempts.length === 2) expect(attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const response = await page.request.get("/api/v1/visit-schedule/policy"); if (response.status() !== 200) throw new Error("SYNTHETIC_POLICY_COMPLETION_FAILED");
    const current = policySchema.parse(await response.json()); expect(current.version === initial.version + 1 && current.company_car_capacity_per_hour === capacity).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
