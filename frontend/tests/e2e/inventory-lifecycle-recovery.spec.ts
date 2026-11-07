import { randomUUID } from "node:crypto";
import { propertySchema, resultSchema } from "@/features/inventory/contracts";
import { developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { unitProgrammeDraft } from "../helpers/unit-listing-fixtures";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ root: "properties", operation: "archive", width: 390, failure: "acknowledgement" }, { root: "developments", operation: "restore", width: 1440, failure: "result-read" }] as const) {
  // Prepared/typechecked only. Actual isolated-stack/native execution is pending.
  test(`Selected inventory ${scenario.operation} recovers ${scenario.failure} under its original scope`, async ({ page }) => {
    test.setTimeout(180_000); const actor = await createActor("manager"), attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      await signIn(page, actor); const reference = `ILR-${randomUUID().slice(0, 8)}`.toUpperCase();
      const created = await staffCommand(page, scenario.root, scenario.root === "properties" ? { reference, category: "house", marketing_name: null, location: null, area_sqm: null } : unitProgrammeDraft(reference));
      if (created.status() !== 200) throw new Error("SYNTHETIC_LIFECYCLE_CREATE_FAILED"); const receipt = resultSchema.parse(await created.json()), id = "property_id" in receipt ? receipt.property_id : receipt.development_id, path = `/api/v1/${scenario.root}/${id}`;
      if (scenario.operation === "restore") { const archived = await staffCommand(page, `${scenario.root}/${id}/archive`, { expected_version: receipt.version, reason: "Synthetic initial programme archive" }); if (archived.status() !== 200) throw new Error("SYNTHETIC_LIFECYCLE_SETUP_FAILED"); }
      const opening = await page.request.get(path); if (opening.status() !== 200) throw new Error("SYNTHETIC_LIFECYCLE_OPENING_FAILED"); const initial = scenario.root === "properties" ? propertySchema.parse(await opening.json()) : developmentSchema.parse(await opening.json());
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(scenario.root === "properties" ? `/projects/properties/${id}` : `/projects/${id}`);
      await page.getByRole("button", { name: "Actions", exact: true }).click(); await page.getByRole("button", { name: "Gérer le dossier", exact: true }).click(); const panel = page.getByRole("dialog", { name: "Gérer le dossier", exact: true });
      await panel.getByRole("button", { name: scenario.operation === "archive" ? "Archiver ce dossier" : "Restaurer ce dossier", exact: true }).click(); const form = panel.getByRole("form", { name: scenario.operation === "archive" ? "Archiver le dossier" : "Restaurer le dossier", exact: true }); await form.getByLabel("Motif obligatoire", { exact: true }).fill("Synthetic retained lifecycle explanation");
      await page.route(`**${path}`, async route => { if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); return route.fallback(); });
      await page.route(`**${path}/${scenario.operation}`, async route => {
        if (route.request().method() !== "POST") return route.fallback(); attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] }); const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_LIFECYCLE_COMMAND_FAILED"); if (attempts.length === 1) { if (scenario.failure === "acknowledgement") return route.abort("failed"); blockRead = true; } return route.fulfill({ response });
      });
      await form.getByRole("button", { name: scenario.operation === "archive" ? "Confirmer l’archivage" : "Confirmer la restauration", exact: true }).click(); const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true }); await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => form.getByLabel("Motif obligatoire", { exact: true }).isDisabled()).toBe(true); await expect.poll(() => form.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true); await page.keyboard.press("Escape"); await expect.poll(() => form.count()).toBe(1); blockRead = false; await retry.click(); await expect.poll(() => form.count()).toBe(0);
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1); if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_LIFECYCLE_RESULT_FAILED"); const current = scenario.root === "properties" ? propertySchema.parse(await response.json()) : developmentSchema.parse(await response.json()); expect(current.id === id && current.version === initial.version + 1 && Boolean(current.archived_at) === (scenario.operation === "archive") && current.offerings.length === 0).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(actor); }
  });
}
