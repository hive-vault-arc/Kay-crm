import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { contactSchema, enquirySchema, newContactSchema } from "@/features/contacts/contracts";
import { commandResultSchema, intentSchema, previewSchema } from "@/features/contacts/ownership-contracts";
import { newDealSchema } from "@/features/deals/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { dealBody } from "../helpers/deals";
import { directoryLeadDraft } from "../helpers/directory-fixtures";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

async function fixture(page: Page) {
  const created = await staffCommand(page, "enquiries", directoryLeadDraft(`SYN-CONTACT-EDIT-${randomUUID().slice(0, 8)}`, `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`));
  if (created.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_CREATION_FAILED");
  const enquiry = enquirySchema.parse(await created.json()), response = await page.request.get(`/api/v1/contacts/${enquiry.contact.id}`);
  if (response.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_READ_FAILED");
  return { enquiry, contact: contactSchema.parse(await response.json()) };
}

// Prepared/typechecked only. The synthetic fault is injected after the real
// isolated command, never a substitute write success or actual browser evidence.
test("Selected contact drawer recovers its confirmed edit after an interrupted receipt at 390px", async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("agent");
  try {
    await signIn(page, actor); const { contact } = await fixture(page), attempts: { key?: string; body: string | null }[] = [];
    await page.setViewportSize({ width: 390, height: 900 }); await page.goto(`/contacts/${contact.id}`);
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Coordonnées du contact", exact: true }), name = `Synthetic recovered ${randomUUID().slice(0, 8)}`;
    const input = drawer.getByLabel("Nom du contact", { exact: true }); await input.fill(name);
    await page.route(`**/api/v1/contacts/${contact.id}`, async route => {
      if (route.request().method() !== "PATCH") return route.continue();
      attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData() });
      const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_WRITE_FAILED");
      if (attempts.length === 1) return route.abort("failed");
      return route.fulfill({ response });
    });
    await drawer.getByRole("button", { name: "Enregistrer le contact", exact: true }).click();
    await expect.poll(() => input.isDisabled()).toBe(true);
    await drawer.getByRole("button", { name: "Réessayer la modification", exact: true }).click();
    await expect.poll(() => drawer.count()).toBe(0);
    expect(attempts.length === 2 && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const response = await page.request.get(`/api/v1/contacts/${contact.id}`); if (response.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_COMPLETION_FAILED");
    const current = contactSchema.parse(await response.json()); expect(current.name === name && current.version === contact.version + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});

test("Selected merged Contact URL displays a saved canonical edit while an older alias read is retained at 390px", async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("agent");
  try {
    await signIn(page, actor); const contacts = [];
    for (const label of ["source", "survivor"]) {
      const created = await staffCommand(page, "contacts", newContactSchema.parse({ name: `SYN-ALIAS-${label}-${randomUUID().slice(0, 8)}`, type: "person", roles: ["buyer"], phones: [{ number: `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`, label: "", is_primary: true }], emails: [], country: "MA", languages: ["french"] }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_CONTACT_ALIAS_CREATION_FAILED");
      contacts.push(contactSchema.parse(await created.json()));
    }
    const [source, survivor] = contacts, intent = intentSchema.parse({ operation: "merge", expected_version: source.version, survivor_id: survivor.id, survivor_expected_version: survivor.version, reason: "Synthetic canonical projection review" });
    const preview = await staffCommand(page, `contacts/${source.id}/preview`, intent); if (preview.status() !== 200) throw new Error("SYNTHETIC_CONTACT_ALIAS_PREVIEW_FAILED");
    const proof = previewSchema.parse(await preview.json()), merged = await staffCommand(page, `contacts/${source.id}/merge`, { ...intent, preview_token: proof.preview_token });
    if (merged.status() !== 200 || commandResultSchema.parse(await merged.json()).contact_id !== survivor.id) throw new Error("SYNTHETIC_CONTACT_ALIAS_MERGE_FAILED");
    const current = await page.request.get(`/api/v1/contacts/${source.id}`); if (current.status() !== 200) throw new Error("SYNTHETIC_CONTACT_ALIAS_READ_FAILED");
    const canonical = contactSchema.parse(await current.json()); if (canonical.id !== survivor.id) throw new Error("SYNTHETIC_CONTACT_ALIAS_RESOLUTION_FAILED");
    // Retain the first authorized alias projection to exercise immediate local
    // completion independently of later live invalidation/read timing.
    await page.route(`**/api/v1/contacts/${source.id}`, route => route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(canonical) }) : route.continue());
    await page.setViewportSize({ width: 390, height: 900 }); await page.goto(`/contacts/${source.id}`);
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Coordonnées du contact", exact: true }), name = `Synthetic canonical saved ${randomUUID().slice(0, 8)}`;
    await drawer.getByLabel("Nom du contact", { exact: true }).fill(name); await drawer.getByRole("button", { name: "Enregistrer le contact", exact: true }).click();
    await expect.poll(() => drawer.count()).toBe(0); await expect.poll(async () => (await page.getByRole("heading", { level: 1 }).innerText()) === name).toBe(true);
    const saved = await page.request.get(`/api/v1/contacts/${survivor.id}`); if (saved.status() !== 200) throw new Error("SYNTHETIC_CONTACT_ALIAS_COMPLETION_FAILED");
    const result = contactSchema.parse(await saved.json()); expect(result.id === survivor.id && result.name === name && result.version === canonical.version + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});

for (const [surface, width] of [["leads", 1440], ["deals", 390]] as const) test(`Selected ${surface} canonical inline edit retries its current read without a second write at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("agent");
  try {
    await signIn(page, actor); const { enquiry, contact } = await fixture(page); let id = enquiry.id;
    if (surface === "deals") {
      const created = await staffCommand(page, "deals", newDealSchema.parse(dealBody(contact.id)));
      if (created.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_DEAL_FAILED");
      id = (await created.json()).id;
    }
    await page.setViewportSize({ width, height: 900 }); await page.goto(`/${surface}/${id}`);
    await page.getByRole("button", { name: "Modifier nom", exact: true }).click();
    const form = page.getByRole("form", { name: "Modifier nom", exact: true }), name = `Synthetic inline ${randomUUID().slice(0, 8)}`;
    const input = form.getByLabel("Nom du contact", { exact: true }); await input.fill(name);
    let writes = 0, failRead = false;
    await page.route(`**/api/v1/contacts/${contact.id}`, async route => {
      if (route.request().method() === "PATCH") { writes++; const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_CONTACT_EDIT_WRITE_FAILED"); failRead = true; return route.fulfill({ response }); }
      if (route.request().method() === "GET" && failRead) { failRead = false; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) }); }
      return route.continue();
    });
    await form.getByRole("button", { name: "Enregistrer nom", exact: true }).click();
    await expect.poll(() => input.isDisabled()).toBe(true);
    await expect(form.getByText("La modification est enregistrée. Actualisez son résultat sans enregistrer une seconde fois.", { exact: true })).toBeVisible();
    await form.getByRole("button", { name: "Réessayer nom", exact: true }).click(); await expect.poll(() => form.count()).toBe(0);
    expect(writes).toBe(1);
    await expect.poll(async () => (await page.getByRole("button", { name: "Modifier nom", exact: true }).innerText()).includes(name)).toBe(true);
    if (surface === "leads") await expect.poll(async () => (await page.getByRole("heading", { level: 1 }).innerText()).includes(name)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
