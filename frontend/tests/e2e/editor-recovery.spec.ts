import { randomUUID } from "node:crypto";
import { contactSchema, enquirySchema } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated real-stack cases. Private synthetic requests stay transient
// and use boolean comparisons rather than raw assertion diagnostics.
for (const failure of ["acknowledgement", "contact-read"] as const) {
  test(`Selected full prospect editor recovers ${failure} without another operation`, async ({ page, actor }) => {
    const agent = await createActor("agent"), attempts: { body: string | null; key?: string }[] = []; let failRead = false;
    try {
      await signIn(page, actor);
      const created = await staffCommand(page, "enquiries", directoryLeadDraft(`SYN-EDITOR-${randomUUID().slice(0, 8)}`, `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`, { primaryAgentId: agent.id, assignedAgentId: agent.id }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_EDITOR_FIXTURE_FAILED");
      const original = enquirySchema.parse(await created.json()), initialContact = await page.request.get(`/api/v1/contacts/${original.contact.id}`);
      if (initialContact.status() !== 200) throw new Error("SYNTHETIC_EDITOR_CONTACT_FAILED");
      const before = contactSchema.parse(await initialContact.json());
      await page.setViewportSize({ width: failure === "acknowledgement" ? 1440 : 390, height: 900 });
      await page.goto(`/leads/${original.id}/edit`);
      const name = `Synthetic edited name ${randomUUID().slice(0, 8)}`, message = `Synthetic edited request ${randomUUID()}`;
      try { await page.getByLabel("Nom du contact", { exact: true }).fill(name); await page.getByLabel("Message", { exact: true }).fill(message); }
      catch { throw new Error("SYNTHETIC_EDITOR_INPUT_FAILED"); }
      if (failure === "contact-read") await page.route(`**/api/v1/contacts/${original.contact.id}`, async route => {
        if (!failRead || route.request().method() !== "GET") return route.continue();
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
      });
      await page.route(`**/api/v1/enquiries/${original.id}`, async route => {
        if (route.request().method() !== "PATCH") return route.continue();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_EDITOR_PATCH_FAILED");
        if (failure === "acknowledgement" && attempts.length === 1) return route.abort("failed");
        if (failure === "contact-read") failRead = true;
        return route.fulfill({ response });
      });
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      const retry = page.getByRole("button", { name: failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      await expect.poll(() => page.getByLabel("Nom du contact", { exact: true }).isDisabled()).toBe(true);
      failRead = false; await retry.click();
      await expect.poll(() => page.getByText("Prospect enregistré.", { exact: true }).isVisible()).toBe(true);
      expect(attempts.length).toBe(failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const current = await page.request.get(`/api/v1/enquiries/${original.id}`), contact = await page.request.get(`/api/v1/contacts/${original.contact.id}`);
      if (current.status() !== 200 || contact.status() !== 200) throw new Error("SYNTHETIC_EDITOR_RESULT_FAILED");
      const result = enquirySchema.parse(await current.json()), client = contactSchema.parse(await contact.json());
      expect(result.version === original.version + 1 && client.version === before.version + 1).toBe(true);
      expect(result.message === message && client.name === name).toBe(true);
      expect(JSON.stringify(client.phones) === JSON.stringify(before.phones) && JSON.stringify(client.emails) === JSON.stringify(before.emails)).toBe(true);
      expect(result.source === original.source && result.assigned_agent?.id === original.assigned_agent?.id && result.campaign_source === original.campaign_source).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
