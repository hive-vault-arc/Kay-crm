import { randomUUID } from "node:crypto";
import { propertySchema, resultSchema } from "@/features/inventory/contracts";
import { clearActorContext, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ kind: "standalone-create", width: 390, failure: "acknowledgement" }, { kind: "unit-create", width: 390, failure: "acknowledgement" }, { kind: "edit", width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. Actual isolated-stack/native execution is pending.
  test(`Selected property listing ${scenario.kind} recovers ${scenario.failure} with the original operation`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let id: string | undefined, initialVersion = 0, blockRead = false;
    try {
      const data = await reservationFixture(page, actors); await clearActorContext(page); await signIn(page, data.agent); await page.setViewportSize({ width: scenario.width, height: 900 });
      if (scenario.kind === "edit") { id = data.inventory.sid; const opening = await page.request.get(`/api/v1/properties/${id}`); if (opening.status() !== 200) throw new Error("SYNTHETIC_LISTING_OPENING_FAILED"); initialVersion = propertySchema.parse(await opening.json()).version; await page.goto(`/projects/properties/${id}/edit`); }
      else if (scenario.kind === "unit-create") { await page.goto(`/projects/${data.inventory.did}?tab=units`); await page.getByRole("button", { name: "Créer une unité", exact: true }).click(); }
      else await page.goto("/projects/properties/new");
      const name = scenario.kind === "edit" ? "Modifier le bien" : scenario.kind === "unit-create" ? "Créer une unité" : "Créer un bien indépendant", form = page.getByRole("form", { name, exact: true }), reference = `PLR-${randomUUID().slice(0, 8)}`.toUpperCase();
      if (scenario.kind === "edit") { await form.locator("#property-marketing_name").fill("Synthetic retained edited listing"); await form.getByRole("button", { name: "Étape 5 sur 5 : Vérification", exact: true }).click(); }
      else {
        await form.locator("#property-category").selectOption("villa"); await form.locator("#property-reference").fill(reference); await form.locator("#property-price_mad").fill("9007199254740993.01"); await form.getByRole("button", { name: "Suivant", exact: true }).click();
        await form.locator("#property-city").fill("Synthetic listing city"); if (scenario.kind === "standalone-create") await form.locator("#property-region").fill("Synthetic listing region"); await form.getByRole("button", { name: "Suivant", exact: true }).click();
        if (scenario.kind === "standalone-create") { await form.locator("#property-area_sqm").fill("108.50"); await form.locator("#property-rooms").fill("3"); await form.locator("#property-bedrooms").fill("2"); } await form.locator("#property-bathrooms").fill("0"); await form.getByRole("button", { name: "Suivant", exact: true }).click();
        await form.locator("#property-description").fill("Synthetic retained listing description"); await form.getByRole("button", { name: "Suivant", exact: true }).click();
      }
      await page.route("**/api/v1/properties/*", async route => { if (route.request().method() === "GET" && id && new URL(route.request().url()).pathname === `/api/v1/properties/${id}` && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route(scenario.kind === "edit" ? `**/api/v1/properties/${id}` : "**/api/v1/properties", async route => {
        if (route.request().method() !== (scenario.kind === "edit" ? "PATCH" : "POST")) return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_LISTING_COMMAND_FAILED"); const receipt = resultSchema.parse(await response.json()); if (!("property_id" in receipt) || id && receipt.property_id !== id) throw new Error("SYNTHETIC_LISTING_RECEIPT_MISMATCH"); id = receipt.property_id;
        if (attempts.length === 1) { if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; } return route.fulfill({ response });
      });
      await form.getByRole("button", { name: scenario.kind === "edit" ? "Enregistrer le bien" : scenario.kind === "unit-create" ? "Créer l’unité" : "Créer le bien", exact: true }).click(); const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      if (scenario.kind === "unit-create") await expect.poll(() => form.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true); else await expect.poll(() => form.getByRole("link", { name: "Annuler", exact: true }).getAttribute("aria-disabled")).toBe("true");
      await expect.poll(() => form.getByRole("button", { name: "Précédent", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => form.count()).toBe(1); blockRead = false; await retry.click(); await expect.poll(() => Boolean(id && page.url().endsWith(`/projects/properties/${id}`))).toBe(true);
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1); if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(`/api/v1/properties/${id}`); if (response.status() !== 200) throw new Error("SYNTHETIC_LISTING_RESULT_FAILED"); const current = propertySchema.parse(await response.json()); expect(current.id === id && current.version === (scenario.kind === "edit" ? initialVersion + 1 : 2)).toBe(true);
      if (scenario.kind === "edit") expect(current.marketing_name === "Synthetic retained edited listing").toBe(true); else expect(current.reference === reference && current.listing_details.bathrooms === 0 && current.listing_details.description === "Synthetic retained listing description" && current.offerings.some(value => value.price_mad === "9007199254740993.01" && value.state === "draft" && value.version === 1) && (current.development_id ?? null) === (scenario.kind === "unit-create" ? data.inventory.did : null)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
