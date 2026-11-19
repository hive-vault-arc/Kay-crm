import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { resultSchema } from "@/features/inventory/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { unitProgrammeDraft } from "../helpers/unit-listing-fixtures";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ root: "properties", width: 390 }, { root: "developments", width: 1440 }] as const) {
  test(`Permanent ${scenario.root} deletion recovers a lost acknowledgement with current offers`, async ({ page }) => {
    test.setTimeout(180_000);
    const actor = await createActor("manager"), attempts: { body: string | null; key?: string }[] = [];
    try {
      await signIn(page, actor);
      const reference = `DEL-${randomUUID().slice(0, 8)}`.toUpperCase();
      const created = await staffCommand(page, scenario.root, scenario.root === "properties" ? { reference, category: "house", marketing_name: null, location: null, area_sqm: null } : unitProgrammeDraft(reference));
      if (created.status() !== 200) throw new Error("SYNTHETIC_DELETE_CREATE_FAILED");
      const receipt = resultSchema.parse(await created.json()), id = "property_id" in receipt ? receipt.property_id : receipt.development_id, path = `/api/v1/${scenario.root}/${id}`;
      const offer = await staffCommand(page, "offerings", { [scenario.root === "properties" ? "property_id" : "development_id"]: id, [scenario.root === "properties" ? "expected_property_version" : "expected_development_version"]: receipt.version, kind: "sale", price_mad: "100000.00", currency: "MAD", price_period: null, conditions: "" });
      if (offer.status() !== 200) throw new Error("SYNTHETIC_DELETE_OFFER_FAILED");
      await page.setViewportSize({ width: scenario.width, height: 900 });
      await page.goto(scenario.root === "properties" ? `/projects/properties/${id}` : `/projects/${id}`);
      await page.getByRole("button", { name: "Actions", exact: true }).click();
      const deleteTrigger = page.getByRole("button", { name: scenario.root === "properties" ? "Supprimer ce bien" : "Supprimer ce programme", exact: true });
      await deleteTrigger.click();
      const dialog = page.getByRole("alertdialog");
      await expect.poll(() => dialog.count()).toBe(1);
      await expect(dialog.getByRole("button", { name: "Annuler", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect.poll(() => dialog.count()).toBe(0);
      await expect(deleteTrigger).toBeFocused();
      await deleteTrigger.press("Enter");
      await expect.poll(() => dialog.count()).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      if (process.env.KAY_INVENTORY_DELETE_EVIDENCE === "1") await dialog.screenshot({ path: resolve(`../.local-data/inventory-delete-${scenario.width}.png`) });
      await page.route(`**${path}/delete`, async route => {
        if (route.request().method() !== "POST") return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_DELETE_COMMAND_FAILED");
        if (attempts.length === 1) return route.abort("failed");
        return route.fulfill({ response });
      });
      await dialog.getByRole("button", { name: "Supprimer définitivement", exact: true }).click();
      const retry = dialog.getByRole("button", { name: "Réessayer la suppression", exact: true });
      await expect.poll(() => retry.count()).toBe(1);
      await expect.poll(() => dialog.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
      await page.keyboard.press("Escape"); await expect.poll(() => dialog.count()).toBe(1);
      await retry.click(); await expect.poll(() => dialog.count()).toBe(0);
      await expect.poll(() => new URL(page.url()).pathname).toBe("/projects");
      expect(attempts.length === 2 && attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      expect(JSON.parse(attempts[0].body ?? "{}")).toEqual({ confirm: true });
      expect((await page.request.get(path)).status()).toBe(404);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(actor); }
  });
}
