import { randomUUID } from "node:crypto";
import { contactSchema } from "@/features/contacts/contracts";
import { dealSchema, newDealSchema, resultSchema } from "@/features/deals/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });
const cases = [{ mode: "create", failure: "acknowledgement", width: 390 }, { mode: "edit", failure: "acknowledgement", width: 1440 }, { mode: "edit", failure: "contact-read", width: 390 }] as const;
for (const scenario of cases) {
  // Prepared isolated cases, not an execution claim. No raw synthetic contact,
  // body, cookie or CSRF diagnostics; request comparisons remain transient.
  test(`Selected affair ${scenario.mode} recovers ${scenario.failure} with its original operation`, async ({ page }) => {
    const agent = await createActor("agent"), attempts: { body: string | null; key?: string }[] = [];
    let destination: string | undefined, failRead = false;
    try {
      await signIn(page, agent);
      const input = directoryLeadDraft(`SYN-AFFAIR-${randomUUID().slice(0, 8)}`, `+212614${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`).new_contact;
      if (!input) throw new Error("SYNTHETIC_AFFAIR_CONTACT_DRAFT_FAILED");
      const response = await staffCommand(page, "contacts", input);
      if (response.status() !== 200) throw new Error("SYNTHETIC_AFFAIR_CONTACT_FAILED");
      const contact = contactSchema.parse(await response.json()); let original: ReturnType<typeof dealSchema.parse> | undefined;
      if (scenario.mode === "edit") {
        const created = await staffCommand(page, "deals", newDealSchema.parse({ contact_id: contact.id, stage: "new", initial_budget: "1400000", campaign_source: "facebook", rating: "cold", purchase_reasons: ["residence"], projects: [{ external_name: "Synthetic initial project" }], payment_method: null, number_of_rooms: 0, notes: "Synthetic initial note", next_action: "Synthetic initial action", requirement_id: null, offering_id: null, expected_offering_version: null }));
        if (created.status() !== 200) throw new Error("SYNTHETIC_AFFAIR_FIXTURE_FAILED");
        destination = resultSchema.parse(await created.json()).id;
        const current = await page.request.get(`/api/v1/deals/${destination}`);
        if (current.status() !== 200) throw new Error("SYNTHETIC_AFFAIR_READ_FAILED");
        original = dealSchema.parse(await current.json());
      }
      await page.setViewportSize({ width: scenario.width, height: 900 });
      await page.goto(scenario.mode === "edit" ? `/deals/${destination}` : `/deals/new?contact_id=${contact.id}`);
      if (scenario.mode === "edit") await page.getByRole("button", { name: "Modifier", exact: true }).click();
      const form = page.getByRole("form", { name: scenario.mode === "edit" ? "Modifier l’affaire" : "Nouvelle affaire", exact: true });
      const name = `Synthetic normalized input ${randomUUID().slice(0, 8)}`, project = `Synthetic affair project ${randomUUID().slice(0, 8)}`;
      try {
        if (scenario.mode === "edit") await form.getByLabel("Nom du contact", { exact: true }).fill(name);
        await form.getByLabel("Type de projet", { exact: true }).first().selectOption("external");
        await form.getByLabel("Nom du projet externe *", { exact: true }).first().fill(project);
        await form.getByLabel("Budget *", { exact: true }).selectOption("custom");
        await form.getByLabel("Montant exact (MAD)", { exact: true }).fill("1500000");
        await form.getByRole("checkbox", { name: "Résidence principale", exact: true }).check();
        await form.getByLabel("Financement", { exact: true }).selectOption("mortgage");
        await form.getByLabel("Pièces", { exact: true }).fill("0");
        await form.getByLabel("Action prévue", { exact: true }).fill("Synthetic reviewed next action");
        await form.getByLabel("Notes", { exact: true }).fill("Synthetic reviewed affair notes");
        if (scenario.mode === "create") await form.getByLabel("Étape initiale", { exact: true }).selectOption("visit");
      } catch { throw new Error("SYNTHETIC_AFFAIR_INPUT_FAILED"); }
      if (scenario.failure === "contact-read") await page.route(`**/api/v1/contacts/${contact.id}`, async route => {
        if (!failRead || route.request().method() !== "GET") return route.continue();
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
      });
      await page.route(scenario.mode === "edit" ? `**/api/v1/deals/${destination}` : "**/api/v1/deals", async route => {
        if (route.request().method() !== (scenario.mode === "edit" ? "PATCH" : "POST")) return route.continue();
        attempts.push({ body: route.request().postData(), key: route.request().headers()["idempotency-key"] });
        const result = await route.fetch();
        if (result.status() !== 200) throw new Error("SYNTHETIC_AFFAIR_COMMAND_FAILED");
        destination = resultSchema.parse(await result.json()).id;
        if (scenario.failure === "acknowledgement" && attempts.length === 1) return route.abort("failed");
        failRead = scenario.failure === "contact-read"; return route.fulfill({ response: result });
      });
      await form.getByRole("button", { name: scenario.mode === "edit" ? "Enregistrer" : "Créer l’affaire", exact: true }).click();
      const retry = form.getByRole("button", { name: scenario.failure === "acknowledgement" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      await expect.poll(() => form.getByLabel("Type de projet", { exact: true }).first().isDisabled()).toBe(true);
      await expect.poll(() => form.getByRole("button", { name: "Annuler", exact: true }).isDisabled()).toBe(true);
      failRead = false; await retry.click();
      await expect.poll(() => form.count()).toBe(0);
      expect(Boolean(destination && new URL(page.url()).pathname === `/deals/${destination}`)).toBe(true);
      expect(attempts.length).toBe(scenario.failure === "acknowledgement" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].body === attempts[1].body && attempts[0].key === attempts[1].key).toBe(true);
      const dealResponse = await page.request.get(`/api/v1/deals/${destination}`), clientResponse = await page.request.get(`/api/v1/contacts/${contact.id}`);
      if (dealResponse.status() !== 200 || clientResponse.status() !== 200) throw new Error("SYNTHETIC_AFFAIR_RESULT_FAILED");
      const result = dealSchema.parse(await dealResponse.json()), client = contactSchema.parse(await clientResponse.json());
      expect(result.version === (original ? original.version + 1 : 1) && result.contact.id === contact.id && result.enquiry_id === null).toBe(true);
      expect(result.projects.length === 1 && result.projects[0].external_name === project && result.initial_budget === "1500000" && result.number_of_rooms === 0 && result.payment_method === "mortgage").toBe(true);
      expect(result.notes === "Synthetic reviewed affair notes" && result.next_action === "Synthetic reviewed next action" && result.offering === null && result.active_reservation === null).toBe(true);
      expect(client.version === contact.version + (scenario.mode === "edit" ? 1 : 0) && client.name === (scenario.mode === "edit" ? name : contact.name)).toBe(true);
      expect(JSON.stringify(client.phones) === JSON.stringify(contact.phones) && JSON.stringify(client.emails) === JSON.stringify(contact.emails)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
