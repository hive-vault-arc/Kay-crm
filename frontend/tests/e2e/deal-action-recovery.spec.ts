import { randomUUID } from "node:crypto";
import { contactSchema } from "@/features/contacts/contracts";
import { dealSchema, newDealSchema, resultSchema } from "@/features/deals/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });
for (const scenario of [{ action: "stage", failure: "acknowledgement", width: 390 }, { action: "inline", failure: "result-read", width: 1440 }] as const) {
  // Prepared/typechecked only. Actual isolated-stack execution remains pending.
  test(`Selected affair ${scenario.action} recovers ${scenario.failure} without replacing the reviewed command`, async ({ page }) => {
    const actor = await createActor("agent"), attempts: { body: string | null; key?: string }[] = []; let blockRead = false;
    try {
      await signIn(page, actor);
      const input = directoryLeadDraft(`SYN-ACTION-${randomUUID().slice(0, 8)}`, `+212615${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`).new_contact;
      if (!input) throw new Error("SYNTHETIC_ACTION_CONTACT_DRAFT_FAILED");
      const contactResponse = await staffCommand(page, "contacts", input);
      if (contactResponse.status() !== 200) throw new Error("SYNTHETIC_ACTION_CONTACT_FAILED");
      const contact = contactSchema.parse(await contactResponse.json());
      const created = await staffCommand(page, "deals", newDealSchema.parse({ contact_id: contact.id, stage: "new", initial_budget: "1400000", campaign_source: "facebook", rating: "cold", purchase_reasons: ["residence"], projects: [{ external_name: "Synthetic reviewed project" }], payment_method: null, number_of_rooms: 0, notes: "Synthetic note", next_action: "Synthetic action", requirement_id: null, offering_id: null, expected_offering_version: null }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_ACTION_AFFAIR_FAILED");
      const id = resultSchema.parse(await created.json()).id;
      await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(`/deals/${id}`);
      const path = `/api/v1/deals/${id}`, mutation = scenario.action === "stage" ? `${path}/transition` : path;
      await page.route(`**${path}`, async route => {
        if (route.request().method() === "GET" && blockRead) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
        return route.fallback();
      });
      await page.route(`**${mutation}`, async route => {
        if (route.request().method() !== (scenario.action === "stage" ? "POST" : "PATCH")) return route.fallback();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const response = await route.fetch();
        if (attempts.length === 1) {
          if (response.status() !== 200) throw new Error("SYNTHETIC_ACTION_COMMAND_FAILED");
          if (scenario.failure === "acknowledgement") return route.abort("failed");
          blockRead = true;
        }
        return route.fulfill({ response });
      });
      if (scenario.action === "stage") {
        await page.getByRole("button", { name: /^Étape actuelle/ }).click(); await page.getByRole("menuitem", { name: "Visite", exact: true }).click();
        const dialog = page.getByRole("alertdialog"); await dialog.getByLabel("Motif", { exact: true }).fill("Synthetic stage review"); await dialog.getByRole("button", { name: "Confirmer l’étape", exact: true }).click();
        const retry = dialog.getByRole("button", { name: "Réessayer la même opération", exact: true }); await expect.poll(() => retry.count()).toBe(1); await expect.poll(() => dialog.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
        await page.keyboard.press("Escape"); await expect.poll(() => dialog.count()).toBe(1); await retry.click(); await expect.poll(() => dialog.count()).toBe(0);
      } else {
        await page.getByRole("button", { name: "Modifier action prévue", exact: true }).click();
        const form = page.getByRole("form", { name: "Modifier action prévue", exact: true }); await form.getByRole("textbox").fill("Synthetic recovered next action"); await form.getByRole("button", { name: "Enregistrer action prévue", exact: true }).click();
        const retry = form.getByRole("button", { name: "Réessayer action prévue", exact: true }); await expect.poll(() => retry.count()).toBe(1); await expect.poll(() => form.getByRole("button", { name: "Annuler action prévue", exact: true }).isDisabled()).toBe(true);
        blockRead = false; await retry.click(); await expect.poll(() => form.count()).toBe(0);
      }
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const response = await page.request.get(path); if (response.status() !== 200) throw new Error("SYNTHETIC_ACTION_READ_FAILED");
      const current = dealSchema.parse(await response.json()); expect(current.version === 2 && current.contact.id === contact.id).toBe(true);
      expect(scenario.action === "stage" ? current.stage === "visit" : current.next_action === "Synthetic recovered next action").toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(actor); }
  });
}
