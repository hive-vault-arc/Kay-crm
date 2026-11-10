import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated real-stack cases; captured requests stay transient and are
// compared with booleans instead of exposing bodies in assertion diagnostics.
for (const operation of ["status", "message"] as const) {
  test(`Selected prospect ${operation} preserves one original PATCH after lost acknowledgement`, async ({ page, actor }) => {
    const agent = await createActor("agent"), attempts: { key?: string; body: string | null }[] = [];
    try {
      await signIn(page, actor);
      const created = await staffCommand(page, "enquiries", directoryLeadDraft(`SYN-PROSPECT-${randomUUID().slice(0, 8)}`, `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`, { primaryAgentId: agent.id, assignedAgentId: agent.id }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_ENQUIRY_FIXTURE_FAILED");
      const original = enquirySchema.parse(await created.json());
      await page.setViewportSize({ width: operation === "status" ? 390 : 1440, height: 900 });
      await page.goto(`/leads/${original.id}`);
      await page.route(`**/api/v1/enquiries/${original.id}`, async route => {
        if (route.request().method() !== "PATCH") return route.continue();
        attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_ENQUIRY_PATCH_FAILED");
        if (attempts.length === 1) return route.abort("failed");
        return route.fulfill({ response });
      });
      const text = `Synthetic edited message ${randomUUID()}`;
      if (operation === "status") {
        await page.getByRole("button", { name: /^Statut actuel/ }).click();
        await page.getByRole("menuitem", { name: "Qualifié", exact: true }).click();
        const dialog = page.getByRole("alertdialog", { name: "Changer le statut du prospect", exact: true });
        await dialog.getByRole("button", { name: "Confirmer le statut", exact: true }).click();
        const retry = dialog.getByRole("button", { name: "Réessayer la même opération", exact: true });
        await expect.poll(() => retry.isVisible()).toBe(true);
        await expect.poll(() => dialog.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
        await page.keyboard.press("Escape"); await expect.poll(() => dialog.isVisible()).toBe(true);
        await retry.click(); await expect.poll(() => dialog.count()).toBe(0);
      } else {
        await page.getByRole("button", { name: "Modifier message", exact: true }).click();
        const form = page.getByRole("form", { name: "Modifier message", exact: true });
        try { await form.getByLabel("Message", { exact: true }).fill(text); }
        catch { throw new Error("SYNTHETIC_ENQUIRY_INPUT_FAILED"); }
        await form.getByRole("button", { name: "Enregistrer message", exact: true }).click();
        const retry = form.getByRole("button", { name: "Réessayer message", exact: true });
        await expect.poll(() => retry.isVisible()).toBe(true);
        await expect.poll(() => form.getByLabel("Message", { exact: true }).isDisabled()).toBe(true);
        await expect.poll(() => form.getByRole("button", { name: "Annuler message", exact: true }).isDisabled()).toBe(true);
        await page.keyboard.press("Escape"); await expect.poll(() => form.isVisible()).toBe(true);
        await retry.click(); await expect.poll(() => form.count()).toBe(0);
      }
      expect(attempts.length === 2 && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
      const response = await page.request.get(`/api/v1/enquiries/${original.id}`);
      if (response.status() !== 200) throw new Error("SYNTHETIC_ENQUIRY_RESULT_FAILED");
      const result = enquirySchema.parse(await response.json());
      expect(result.version).toBe(original.version + 1);
      expect(result.status === (operation === "status" ? "qualified" : original.status)).toBe(true);
      expect(result.message === (operation === "message" ? text : original.message)).toBe(true);
      expect(result.initial_budget === original.initial_budget && result.campaign_source === original.campaign_source && result.rating === original.rating).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
