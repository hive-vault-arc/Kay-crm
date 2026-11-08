import { randomUUID } from "node:crypto";
import { propertySchema } from "@/features/inventory/contracts";
import { blocksSchema, developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { reservationFixture } from "../helpers/reservations";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ kind: "owners", width: 390, failure: "acknowledgement" }, { kind: "offering", width: 1440, failure: "result-read" }, { kind: "structure", width: 390, failure: "acknowledgement" }] as const) {
  // Prepared/typechecked only. Actual isolated-stack/native execution is pending.
  test(`Selected inventory ${scenario.kind} recovers ${scenario.failure} with the original reviewed command`, async ({ page }) => {
    test.setTimeout(180_000); const actors: TestActor[] = [], attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      const data = await reservationFixture(page, actors); await clearActorContext(page); await signIn(page, scenario.kind === "structure" ? data.agent : data.manager);
      const root = scenario.kind === "structure" ? "developments" : "properties", id = root === "developments" ? data.inventory.did : data.inventory.sid, path = `/api/v1/${root}/${id}`;
      const opening = await page.request.get(path); if (opening.status() !== 200) throw new Error("SYNTHETIC_RECORD_OPENING_READ_FAILED");
      const initial = root === "properties" ? propertySchema.parse(await opening.json()) : developmentSchema.parse(await opening.json()); const code = `RC-${randomUUID().slice(0, 8)}`.toUpperCase();
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(root === "developments" ? `/projects/${id}?tab=hierarchy` : `/projects/properties/${id}${scenario.kind === "owners" ? "?tab=owners" : ""}`);
      if (scenario.kind === "offering") await page.getByRole("button", { name: "Modifier la campagne location", exact: true }).click();
      if (scenario.kind === "structure") await page.getByRole("dialog", { name: "Structure du programme", exact: true }).getByRole("button", { name: "Créer un bloc", exact: true }).click();
      const form = page.getByRole("form", { name: scenario.kind === "owners" ? "Propriétaires légaux" : scenario.kind === "offering" ? "Modifier la campagne location" : "Créer un bloc", exact: true });
      if (scenario.kind === "owners") await form.getByLabel("Libellé commercial partagé (facultatif)", { exact: true }).fill("Synthetic retained shared owner label");
      else if (scenario.kind === "offering") { await form.getByLabel("Prix (MAD, facultatif)", { exact: true }).fill("12500,25"); await form.getByLabel("Motif de modification", { exact: true }).fill("Synthetic retained campaign change"); }
      else { await form.getByLabel("Code", { exact: true }).fill(code); await form.getByLabel("Libellé", { exact: true }).fill("Synthetic retained block"); }
      const mutation = scenario.kind === "owners" ? `${path}/owners` : scenario.kind === "structure" ? `${path}/blocks` : `/api/v1/offerings/${data.inventory.standaloneOffer}`, method = scenario.kind === "owners" ? "PUT" : scenario.kind === "structure" ? "POST" : "PATCH";
      await page.route(`**${path}`, async route => { if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route(`**${mutation}`, async route => {
        if (route.request().method() !== method) return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch();
        if (attempts.length === 1) { if (response.status() !== 200) throw new Error("SYNTHETIC_RECORD_COMMAND_FAILED"); if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; }
        return route.fulfill({ response });
      });
      await form.getByRole("button", { name: scenario.kind === "offering" ? "Enregistrer la campagne" : "Enregistrer", exact: true }).click();
      const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => form.getByRole("button", { name: scenario.kind === "structure" ? "Retour" : "Annuler", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => form.count()).toBe(1);
      blockRead = false; await retry.click(); await expect.poll(() => form.count()).toBe(0); expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_RECORD_RESULT_READ_FAILED"); const current = root === "properties" ? propertySchema.parse(await response.json()) : developmentSchema.parse(await response.json()); expect(current.id === id && current.version === initial.version + 1).toBe(true);
      if (scenario.kind === "owners") expect(current.owners.some(owner => owner.marketing_display === "Synthetic retained shared owner label")).toBe(true);
      if (scenario.kind === "offering") expect(current.offerings.some(value => value.id === data.inventory.standaloneOffer && value.price_mad === "12500.25" && value.price_period === "month")).toBe(true);
      if (scenario.kind === "structure") { const blocks = await page.request.get(`${path}/blocks`); if (blocks.status() !== 200) throw new Error("SYNTHETIC_RECORD_BLOCK_READ_FAILED"); expect(blocksSchema.parse(await blocks.json()).items.some(value => value.code === code && value.development_id === id)).toBe(true); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
  });
}
