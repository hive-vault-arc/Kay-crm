import { propertySchema } from "@/features/inventory/contracts";
import { developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ root: "properties", failure: "result-read", width: 390 }, { root: "developments", failure: "acknowledgement", width: 1440 }] as const) {
  // Prepared/typechecked only; actual isolated-stack execution remains pending.
  test(`Selected external ${scenario.root} result recovers ${scenario.failure} with the original stock review`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      const data = await reservationFixture(page, actors); await clearActorContext(page); await signIn(page, data.manager);
      const id = scenario.root === "properties" ? data.inventory.sid : data.inventory.did, offeringId = scenario.root === "properties" ? data.inventory.standaloneOffer : data.inventory.wholeOffer, path = `/api/v1/${scenario.root}/${id}`;
      const before = await page.request.get(path); if (before.status() !== 200) throw new Error("SYNTHETIC_EXTERNAL_OPENING_READ_FAILED");
      const initial = scenario.root === "properties" ? propertySchema.parse(await before.json()) : developmentSchema.parse(await before.json());
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(scenario.root === "properties" ? `/projects/properties/${id}` : `/projects/${id}`);
      await page.getByRole("button", { name: "Marquer louée ailleurs", exact: true }).click(); const dialog = page.getByRole("alertdialog", { name: "Marquer louée ailleurs", exact: true });
      await expect.poll(() => dialog.getByRole("button", { name: "Marquer louée ailleurs", exact: true }).isEnabled()).toBe(true);
      await dialog.getByLabel("Date du résultat externe (obligatoire)", { exact: true }).fill("2026-10-29"); await dialog.getByLabel("Motif partagé, sans donnée privée (obligatoire)", { exact: true }).fill("Synthetic shared external result");
      await page.route(`**${path}`, async route => {
        if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
        return route.fallback();
      });
      await page.route(`**${path}/external-outcome`, async route => {
        if (route.request().method() !== "POST") return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const result = await route.fetch();
        if (attempts.length === 1) {
          if (result.status() !== 200) throw new Error("SYNTHETIC_EXTERNAL_COMMAND_FAILED");
          if (scenario.failure === "acknowledgement") return route.abort("failed");
          blockRead = true;
        }
        return route.fulfill({ response: result });
      });
      await dialog.getByRole("button", { name: "Marquer louée ailleurs", exact: true }).click(); const retry = dialog.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
      await expect.poll(() => retry.count()).toBe(1); await expect.poll(() => dialog.getByRole("button", { name: "Retour", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => dialog.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => dialog.count()).toBe(0); expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_EXTERNAL_RESULT_READ_FAILED");
      const current = scenario.root === "properties" ? propertySchema.parse(await response.json()) : developmentSchema.parse(await response.json());
      expect(current.id === id && current.version === initial.version + 1 && current.offerings.some(value => value.id === offeringId && value.state === "rented")).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
