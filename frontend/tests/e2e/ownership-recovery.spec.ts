import { randomUUID } from "node:crypto";
import { contactSchema, newContactSchema } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared for the isolated real-stack gate; fixtures never target development data.
for (const surface of ["contacts", "owners"] as const) {
  test(`Selected ${surface} management recovers its original archive operation`, async ({ page, actor }) => {
    const agent = await createActor("agent"), attempts: { key?: string; body: string | null }[] = [];
    let failRead = false;
    try {
      await signIn(page, actor);
      const created = await staffCommand(page, "contacts", newContactSchema.parse({
        name: `SYN-OWNERSHIP-${randomUUID().slice(0, 8)}`, type: "person", roles: ["owner"],
        phones: [{ number: `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`, label: "", is_primary: true }],
        emails: [], country: "MA", languages: ["french"], primary_agent_id: agent.id,
      }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_OWNERSHIP_FIXTURE_FAILED");
      const contact = contactSchema.parse(await created.json());
      await page.setViewportSize({ width: surface === "contacts" ? 1440 : 390, height: 900 });
      await page.goto(`/${surface}/${contact.id}`);
      await page.getByRole("button", { name: "Gérer le contact", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Gérer le contact", exact: true });
      await drawer.getByLabel("Opération", { exact: true }).selectOption("archive");
      try { await drawer.getByLabel("Motif de l’opération", { exact: true }).fill("Décision synthétique de récupération"); }
      catch { throw new Error("SYNTHETIC_OWNERSHIP_INPUT_FAILED"); }
      await drawer.getByRole("button", { name: "Vérifier l’impact", exact: true }).click();
      const confirmation = page.getByRole("alertdialog");
      await expect.poll(() => confirmation.isVisible()).toBe(true);
      if (surface === "owners") await page.route(url => url.pathname === `/api/v1/contacts/${contact.id}`, async route => {
        if (route.request().method() !== "GET" || !failRead) return route.continue();
        return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
      });
      await page.route(`**/api/v1/contacts/${contact.id}/archive`, async route => {
        attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_OWNERSHIP_ARCHIVE_FAILED");
        if (surface === "contacts" && attempts.length === 1) return route.abort("failed");
        if (surface === "owners") failRead = true;
        return route.fulfill({ response });
      });
      await confirmation.getByRole("button", { name: "Confirmer l’opération", exact: true }).click();
      const retry = confirmation.getByRole("button", { name: surface === "contacts" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      await expect.poll(() => confirmation.getByRole("button", { name: "Revoir ma saisie", exact: true }).isDisabled()).toBe(true);
      await page.keyboard.press("Escape"); await expect.poll(() => confirmation.isVisible()).toBe(true);
      failRead = false; await retry.click();
      await expect.poll(() => confirmation.count()).toBe(0);
      expect(attempts.length).toBe(surface === "contacts" ? 2 : 1);
      if (attempts.length === 2) expect(attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
      const history = await page.request.get(`/api/v1/contacts/${contact.id}/timeline?page_size=50`);
      if (history.status() !== 200) throw new Error("SYNTHETIC_OWNERSHIP_HISTORY_FAILED");
      const result = await history.json();
      expect(result.items.filter((row: { action: string }) => row.action === "contacts.archive").length).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}
