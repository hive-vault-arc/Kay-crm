import { developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ width: 390, failure: "acknowledgement" }, { width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. Actual isolated-stack/native execution is pending.
  test(`Selected programme edit recovers ${scenario.failure} before navigating to its verified record`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      const data = await reservationFixture(page, actors); await clearActorContext(page); await signIn(page, data.agent);
      const id = data.inventory.did, path = `/api/v1/developments/${id}`, opening = await page.request.get(path); if (opening.status() !== 200) throw new Error("SYNTHETIC_PROGRAMME_OPENING_FAILED");
      const initial = developmentSchema.parse(await opening.json());
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(`/projects/${id}/edit`);
      const form = page.getByRole("form", { name: "Modifier le programme", exact: true }); await form.getByLabel("Nom du programme", { exact: true }).fill("Synthetic retained edited programme"); await form.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("Synthetic retained shared programme presentation");
      await page.route(`**${path}`, async route => {
        if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
        if (route.request().method() !== "PATCH") return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch();
        if (attempts.length === 1) { if (response.status() !== 200) throw new Error("SYNTHETIC_PROGRAMME_EDIT_FAILED"); if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; }
        return route.fulfill({ response });
      });
      await form.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
      const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => form.getByRole("link", { name: "Annuler", exact: true }).getAttribute("aria-disabled")).toBe("true");
      await expect.poll(() => form.getByLabel("Nom du programme", { exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => form.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => page.url().endsWith(`/projects/${id}`)).toBe(true); expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_PROGRAMME_RESULT_FAILED"); const current = developmentSchema.parse(await response.json());
      expect(current.id === id && current.version === initial.version + 1 && current.name === "Synthetic retained edited programme" && current.briefing_text === "Synthetic retained shared programme presentation").toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
