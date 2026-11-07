import { commissionsSchema } from "@/features/finance/contracts";
import { clearActorContext, expect, removeActor, test, type TestActor } from "../helpers/auth";
import { fillCommission, financeFixture, openFinance } from "../helpers/finance";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only. The late response is simulated; real pruning is
// covered by separately prepared isolated PostgreSQL cases, not this UI case.
test("Unknown creation expiry keeps its original key and requires explicit departure without another fact", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let issued = 0;
  try {
    await page.setViewportSize({ width: 390, height: 900 }); const data = await financeFixture(page, actors);
    await page.route(`**/api/v1/deals/${data.dealId}/commission-creation-key`, async route => { issued++; await route.fallback(); });
    await page.route(`**/api/v1/deals/${data.dealId}/commissions`, async route => {
      if (route.request().method() !== "POST") return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
      if (attempts.length === 1) { const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_FINANCE_CREATION_FAILED"); return route.abort("failed"); }
      return route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: { code: "FINANCE_CREATION_KEY_EXPIRED" } }) });
    });
    const form = await fillCommission(page); await form.getByRole("button", { name: "Enregistrer la commission prévue", exact: true }).click(); const retry = form.getByRole("button", { name: "Réessayer la même opération", exact: true }); await expect.poll(() => retry.count()).toBe(1); await retry.click(); await expect.poll(() => attempts.length).toBe(2);
    await expect.poll(() => form.getAttribute("data-write-recovery")).toBe("true"); await expect.poll(() => form.getByLabel("Base explicite (MAD)", { exact: true }).isDisabled()).toBe(true); expect(issued === 1 && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    await form.getByRole("button", { name: "Annuler", exact: true }).click(); const leaving = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect.poll(() => leaving.count()).toBe(1); await leaving.getByRole("button", { name: "Quitter le formulaire", exact: true }).click(); await expect.poll(() => form.count()).toBe(0);
    await openFinance(page, data.dealId); const response = await page.request.get(`/api/v1/deals/${data.dealId}/commissions?page=1&page_size=20`); if (response.status() !== 200) throw new Error("SYNTHETIC_FINANCE_RESULT_FAILED"); expect(commissionsSchema.parse(await response.json()).total === 1).toBe(true); expect(issued).toBe(1); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); for (const actor of actors.reverse()) await removeActor(actor); }
});
