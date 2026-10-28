import { randomUUID } from "node:crypto";
import { enquirySchema } from "@/features/contacts/contracts";
import { dealSchema, resultSchema } from "@/features/deals/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated real-stack cases; synthetic bodies stay transient and
// comparisons deliberately do not print private fields or request protection.
for (const failure of ["acknowledgement", "destination-read"] as const) {
  test(`Selected prospect conversion recovers ${failure} without a new operation`, async ({ page }) => {
    const agent = await createActor("agent"), attempts: { body: string | null; key?: string }[] = [];
    let failRead = false, destination: string | undefined;
    try {
      await signIn(page, agent);
      const response = await staffCommand(page, "enquiries", directoryLeadDraft(`SYN-CONVERT-${randomUUID().slice(0, 8)}`, `+212613${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`));
      if (response.status() !== 200) throw new Error("SYNTHETIC_CONVERSION_FIXTURE_FAILED");
      const enquiry = enquirySchema.parse(await response.json());
      await page.setViewportSize({ width: failure === "acknowledgement" ? 1440 : 390, height: 900 });
      await page.goto(`/leads/${enquiry.id}`);
      await page.getByRole("button", { name: "Actions", exact: true }).click();
      await page.getByRole("button", { name: "Convertir en affaire", exact: true }).click();
      const dialog = page.getByRole("alertdialog", { name: "Convertir le prospect en affaire", exact: true });
      const project = `Synthetic conversion project ${randomUUID().slice(0, 8)}`;
      try {
        await dialog.getByLabel("Type de projet", { exact: true }).selectOption("external");
        await dialog.getByLabel("Nom du projet externe *", { exact: true }).fill(project);
        await dialog.getByLabel("Budget *", { exact: true }).selectOption("custom");
        await dialog.getByLabel("Montant exact (MAD)", { exact: true }).fill("1400000");
        await dialog.getByRole("checkbox", { name: "Résidence principale", exact: true }).check();
      } catch { throw new Error("SYNTHETIC_CONVERSION_INPUT_FAILED"); }
      if (failure === "destination-read") await page.route(/\/api\/v1\/deals\/[a-f0-9-]{36}$/, async route => {
        if (!failRead || route.request().method() !== "GET") return route.continue();
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
      });
      await page.route(`**/api/v1/enquiries/${enquiry.id}/convert`, async route => {
        if (route.request().method() !== "POST") return route.continue();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const result = await route.fetch();
        if (result.status() !== 200) throw new Error("SYNTHETIC_CONVERSION_COMMAND_FAILED");
        destination = resultSchema.parse(await result.json()).id;
        if (failure === "acknowledgement" && attempts.length === 1) return route.abort("failed");
        failRead = failure === "destination-read";
        return route.fulfill({ response: result });
      });
      await dialog.getByRole("button", { name: "Confirmer la conversion", exact: true }).click();
      const retry = dialog.getByRole("button", { name: failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      await expect.poll(() => dialog.getByLabel("Type de projet", { exact: true }).isDisabled()).toBe(true);
      await expect.poll(() => dialog.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
      await page.keyboard.press("Escape"); await expect.poll(() => dialog.isVisible()).toBe(true);
      failRead = false; await retry.click();
      await expect.poll(() => Boolean(destination && new URL(page.url()).pathname === `/deals/${destination}`)).toBe(true);
      expect(attempts.length).toBe(failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const leadResponse = await page.request.get(`/api/v1/enquiries/${enquiry.id}`), dealResponse = await page.request.get(`/api/v1/deals/${destination}`);
      if (leadResponse.status() !== 200 || dealResponse.status() !== 200) throw new Error("SYNTHETIC_CONVERSION_RESULT_FAILED");
      const source = enquirySchema.parse(await leadResponse.json()), result = dealSchema.parse(await dealResponse.json());
      expect(source.version === enquiry.version + 1 && source.status === "converted" && source.converted_deal_id === result.id).toBe(true);
      expect(result.enquiry_id === enquiry.id && result.contact.id === enquiry.contact.id && result.created_by_user_id === agent.id && result.version === 1 && result.stage === "new").toBe(true);
      expect(result.projects.length === 1 && result.projects[0].external_name === project && result.initial_budget === "1400000" && result.purchase_reasons.length === 1 && result.purchase_reasons[0] === "residence").toBe(true);
      expect(result.campaign_source === enquiry.campaign_source && result.rating === enquiry.rating && result.notes === enquiry.message && result.offering === null && result.active_reservation === null).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
