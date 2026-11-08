import { randomUUID } from "node:crypto";
import { resultSchema } from "@/features/inventory/contracts";
import { developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ width: 390, failure: "acknowledgement" }, { width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. Actual isolated-stack/native execution is pending.
  test(`Selected programme creation recovers ${scenario.failure} before verified navigation`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let createdId: string | undefined, blockRead = false;
    try {
      const data = await reservationFixture(page, actors); await clearActorContext(page); await signIn(page, data.agent);
      const reference = `PCR-${randomUUID().slice(0, 8)}`.toUpperCase(); await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto("/projects/new");
      const form = page.getByRole("form", { name: "Créer un programme", exact: true }); await expect.poll(() => form.getByLabel("Référence du programme", { exact: true }).isEnabled()).toBe(true);
      await form.getByLabel("Référence du programme", { exact: true }).fill(reference); await form.getByLabel("Nom du programme", { exact: true }).fill("Synthetic retained new programme"); await form.getByRole("button", { name: "Suivant", exact: true }).click(); await form.getByLabel("Présentation partagée (facultative)", { exact: true }).fill("Synthetic retained shared creation context"); await form.getByRole("button", { name: "Suivant", exact: true }).click();
      await page.route("**/api/v1/developments/*", async route => { if (route.request().method() === "GET" && createdId && new URL(route.request().url()).pathname === `/api/v1/developments/${createdId}` && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route("**/api/v1/developments", async route => {
        if (route.request().method() !== "POST") return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_PROGRAMME_CREATE_FAILED"); const receipt = resultSchema.parse(await response.json()); if (!("development_id" in receipt)) throw new Error("SYNTHETIC_PROGRAMME_RECEIPT_MISMATCH"); createdId = receipt.development_id;
        if (attempts.length === 1) { if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; } return route.fulfill({ response });
      });
      await form.getByRole("button", { name: "Créer le programme", exact: true }).click(); const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => form.getByRole("link", { name: "Annuler", exact: true }).getAttribute("aria-disabled")).toBe("true"); await expect.poll(() => form.getByRole("button", { name: "Précédent", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => form.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => Boolean(createdId && page.url().endsWith(`/projects/${createdId}`))).toBe(true); expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1); if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(`/api/v1/developments/${createdId}`); if (response.status() !== 200) throw new Error("SYNTHETIC_PROGRAMME_CREATED_READ_FAILED"); const current = developmentSchema.parse(await response.json()); expect(current.id === createdId && current.version === 1 && current.reference === reference && current.name === "Synthetic retained new programme" && current.briefing_text === "Synthetic retained shared creation context").toBe(true); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
