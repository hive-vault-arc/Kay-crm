import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { enquirySchema } from "@/features/contacts/contracts";
import { newDealSchema } from "@/features/deals/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { dealBody } from "../helpers/deals";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

async function dossier(page: Page, primaryAgentId: string) {
  const response = await staffCommand(page, "enquiries", directoryLeadDraft(`SYN-ENTRY-${randomUUID().slice(0, 8)}`, `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`, { primaryAgentId, assignedAgentId: primaryAgentId }));
  if (response.status() !== 200) throw new Error("SYNTHETIC_ENTRY_FIXTURE_FAILED");
  return enquirySchema.parse(await response.json());
}
async function loseFirstAcknowledgement(page: Page, path: string) {
  const attempts: { key?: string; body: string | null }[] = [];
  await page.route(`**${path}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
    const response = await route.fetch();
    if (response.status() !== 200) throw new Error("SYNTHETIC_ENTRY_WRITE_FAILED");
    if (attempts.length === 1) return route.abort("failed");
    return route.fulfill({ response });
  });
  return attempts;
}

// Prepared isolated real-stack cases. Request bodies are transient and never printed.
for (const surface of ["contacts", "leads", "deals"] as const) {
  test(`Selected ${surface} activity drawer recovers the original entry once`, async ({ page, actor }) => {
    const agent = await createActor("agent");
    try {
      await signIn(page, actor); const enquiry = await dossier(page, agent.id); let id = surface === "contacts" ? enquiry.contact.id : enquiry.id;
      if (surface === "deals") {
        const created = await staffCommand(page, "deals", newDealSchema.parse(dealBody(enquiry.contact.id)));
        if (created.status() !== 200) throw new Error("SYNTHETIC_ENTRY_DEAL_FAILED");
        id = (await created.json()).id;
      }
      await page.setViewportSize({ width: surface === "leads" ? 1440 : 390, height: 900 });
      await page.goto(`/${surface}/${id}`); await page.getByRole("tab", { name: /^Activités/ }).click();
      await page.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Ajouter une activité", exact: true }), text = `Synthetic entry ${randomUUID()}`;
      const input = drawer.getByLabel(surface === "contacts" ? "Texte de l’entrée" : "Notes de suivi *", { exact: true });
      try { await input.fill(text); }
      catch { throw new Error("SYNTHETIC_ENTRY_INPUT_FAILED"); }
      if (surface === "contacts") await drawer.getByLabel("Type d’entrée", { exact: true }).selectOption("call");
      else {
        await drawer.getByLabel("Type d’activité", { exact: true }).selectOption("call");
        await drawer.getByLabel("Durée (minutes, facultative)", { exact: true }).fill("15");
        await drawer.getByLabel("Sens de l’échange", { exact: true }).selectOption("outbound");
        await drawer.getByLabel("Projet 1 (facultatif)", { exact: true }).fill("Synthetic discussed project");
      }
      const scope = surface === "contacts" ? "contacts" : surface === "leads" ? "enquiries" : "deals", path = `/api/v1/${scope}/${id}/${surface === "contacts" ? "notes" : "activities"}`;
      const attempts = await loseFirstAcknowledgement(page, path);
      await drawer.getByRole("button", { name: surface === "contacts" ? "Enregistrer l’entrée" : "Enregistrer l’activité", exact: true }).click();
      const retry = drawer.getByRole("button", { name: "Réessayer la même opération", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true); await expect.poll(() => input.isDisabled()).toBe(true);
      await page.keyboard.press("Escape"); await expect.poll(() => drawer.isVisible()).toBe(true);
      await retry.click(); await expect.poll(() => drawer.count()).toBe(0);
      expect(attempts.length === 2 && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
      const history = await page.request.get(`/api/v1/${scope}/${id}/${surface === "contacts" ? "timeline" : "activities"}?page_size=100`);
      if (history.status() !== 200) throw new Error("SYNTHETIC_ENTRY_HISTORY_FAILED");
      const result = await history.json(); expect(result.items.filter((row: { body: string }) => row.body === text).length).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally { await clearActorContext(page); await removeActor(agent); }
  });
}

test("Selected prospect assignment drawer retains the original queue/version/reason through a lost response", async ({ page, actor }) => {
  const agent = await createActor("agent");
  try {
    await signIn(page, actor); const enquiry = await dossier(page, agent.id);
    await page.setViewportSize({ width: 390, height: 900 }); await page.goto(`/leads/${enquiry.id}`);
    await page.getByRole("button", { name: "Attribuer le prospect", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Attribuer le prospect", exact: true });
    await drawer.getByLabel("Attribuer à un agent du contact", { exact: true }).selectOption("");
    try { await drawer.getByLabel("Motif de l’attribution", { exact: true }).fill("Synthetic explicit queue assignment"); }
    catch { throw new Error("SYNTHETIC_ASSIGNMENT_INPUT_FAILED"); }
    const attempts = await loseFirstAcknowledgement(page, `/api/v1/enquiries/${enquiry.id}/assign`);
    await drawer.getByRole("button", { name: "Attribuer cette demande", exact: true }).click();
    const retry = drawer.getByRole("button", { name: "Réessayer la même opération", exact: true });
    await expect.poll(() => retry.isVisible()).toBe(true); await expect.poll(() => drawer.getByRole("button", { name: "Actualiser les versions", exact: true }).isDisabled()).toBe(true);
    await page.keyboard.press("Escape"); await expect.poll(() => drawer.isVisible()).toBe(true); await retry.click(); await expect.poll(() => drawer.count()).toBe(0);
    expect(attempts.length === 2 && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const current = await page.request.get(`/api/v1/enquiries/${enquiry.id}`); if (current.status() !== 200) throw new Error("SYNTHETIC_ASSIGNMENT_READ_FAILED");
    expect(enquirySchema.parse(await current.json()).assigned_agent).toBeNull();
    const history = await page.request.get(`/api/v1/contacts/${enquiry.contact.id}/timeline?page_size=100`); if (history.status() !== 200) throw new Error("SYNTHETIC_ASSIGNMENT_HISTORY_FAILED");
    const result = await history.json(); expect(result.items.filter((row: { action: string; enquiry_id: string }) => row.action === "enquiries.assign" && row.enquiry_id === enquiry.id).length).toBe(1);
  } finally { await clearActorContext(page); await removeActor(agent); }
});
