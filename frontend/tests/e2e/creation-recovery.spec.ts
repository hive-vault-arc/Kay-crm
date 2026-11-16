import { randomUUID } from "node:crypto";
import { enquirySchema, newEnquirySchema, type Enquiry } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared isolated cases, not an actual-stack acceptance claim. Synthetic
// request bodies remain transient; assertions do not print contact/CSRF values.
for (const width of [1440, 390]) {
  test(`Selected prospect creation recovers a lost acknowledgement at ${width}px`, async ({ page }) => {
    const agent = await createActor("agent"), attempts: { body: string | null; key?: string }[] = [];
    let accepted: Enquiry | undefined;
    const name = `SYN-CREATE-${randomUUID().slice(0, 8)}`, phone = `+212612${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
    try {
      await signIn(page, agent);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/leads/new");
      try {
        await page.getByLabel("Nom du contact", { exact: true }).fill(name);
        await page.getByLabel("Indicatif Téléphone 1 *", { exact: true }).selectOption("MA");
        await page.getByLabel("Téléphone 1 *", { exact: true }).fill(phone.slice(4));
        await page.getByLabel("Langues parlées *", { exact: true }).selectOption("french");
        await page.getByLabel("Budget *", { exact: true }).selectOption("custom");
        await page.getByLabel("Montant exact (MAD)", { exact: true }).fill("1400000");
        await page.getByLabel("Message", { exact: true }).fill("Synthetic reviewed creation message");
      } catch { throw new Error("SYNTHETIC_CREATION_INPUT_FAILED"); }
      await page.route("**/api/v1/enquiries", async route => {
        if (route.request().method() !== "POST") return route.continue();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_CREATION_COMMAND_FAILED");
        accepted = enquirySchema.parse(await response.json());
        if (attempts.length === 1) return route.abort("failed");
        return route.fulfill({ response });
      });
      await page.getByRole("button", { name: "Créer le prospect", exact: true }).click();
      const retry = page.getByRole("button", { name: "Réessayer la même opération", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      await expect.poll(() => page.getByLabel("Nom du contact", { exact: true }).isDisabled()).toBe(true);
      await expect.poll(() => page.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
      await retry.click();
      await expect.poll(() => /^\/leads\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
      expect(attempts.length === 2 && attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const body = newEnquirySchema.parse(JSON.parse(attempts[0].body ?? "null"));
      expect(Boolean(accepted && accepted.source_submission_id === body.source_submission_id && accepted.created_by_user_id === agent.id && accepted.assigned_agent?.id === agent.id)).toBe(true);
      expect(Boolean(accepted && new URL(page.url()).pathname === `/leads/${accepted.id}`)).toBe(true);
      expect(Boolean(body.new_contact && accepted?.contact.name === name && accepted.contact.primary_phone === phone)).toBe(true);
      expect(body.new_contact?.roles).toEqual(["buyer"]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
