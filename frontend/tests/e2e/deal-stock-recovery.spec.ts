import { dealSchema } from "@/features/deals/contracts";
import { clearActorContext, expect, removeActor, test, type TestActor } from "../helpers/auth";
import { reservationDialog, reservationFixture } from "../helpers/reservations";
import { fillOutcome, outcomeDialog } from "../helpers/outcomes";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ kind: "reserve", failure: "acknowledgement", width: 390 }, { kind: "close", failure: "result-read", width: 1440 }] as const) {
  // Prepared isolated stock workflow; not an actual execution claim.
  test(`Selected ${scenario.kind} retains its exact reviewed operation after ${scenario.failure}`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      const data = await reservationFixture(page, actors), path = `/api/v1/deals/${data.unit}`;
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(`/deals/${data.unit}`);
      const dialog = scenario.kind === "reserve" ? await reservationDialog(page) : await outcomeDialog(page);
      if (scenario.kind === "close") await fillOutcome(dialog);
      await page.route(`**${path}`, async route => {
        if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
        return route.fallback();
      });
      await page.route(`**${path}/${scenario.kind}`, async route => {
        if (route.request().method() !== "POST") return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const result = await route.fetch();
        if (attempts.length === 1) {
          if (result.status() !== 200) throw new Error("SYNTHETIC_STOCK_COMMAND_FAILED");
          if (scenario.failure === "acknowledgement") return route.abort("failed");
          blockRead = true;
        }
        return route.fulfill({ response: result });
      });
      await dialog.getByRole("button", { name: scenario.kind === "reserve" ? "Réserver l’offre" : "Clôturer l’affaire", exact: true }).click();
      const retry = dialog.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => dialog.getByRole("button", { name: "Retour", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => dialog.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => dialog.count()).toBe(0);
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_STOCK_READ_FAILED");
      const current = dealSchema.parse(await response.json()); expect(current.version === 2 && current.offering?.id === data.inventory.unitOffer).toBe(true);
      expect(scenario.kind === "reserve" ? current.stage === "reserved" && current.offering?.state === "reserved" && current.active_reservation?.created_by_user_id === data.agent.id : current.stage === "won" && current.offering?.state === "rented").toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
