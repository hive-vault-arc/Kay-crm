import { randomUUID } from "node:crypto";
import { contactSchema, newContactSchema } from "@/features/contacts/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only. Each injected fault follows an actual isolated
// command; no synthetic write success stands in for backend/native acceptance.
for (const scenario of [
  { kind: "create", fault: "receipt", width: 390 },
  { kind: "edit", fault: "read", width: 1440 },
  { kind: "add-role", fault: "receipt", width: 390 },
] as const) test(`Selected owner ${scenario.kind} recovers its ${scenario.fault} at ${scenario.width}px`, async ({ page }) => {
  test.setTimeout(120_000); const actor = await createActor("agent");
  try {
    await signIn(page, actor);
    const name = `SYN-OWNER-RECOVERY-${randomUUID().slice(0, 8)}`, phone = `+212611${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
    let original: ReturnType<typeof contactSchema.parse> | undefined;
    if (scenario.kind !== "create") {
      const created = await staffCommand(page, "contacts", newContactSchema.parse({ name, type: "person", roles: scenario.kind === "edit" ? ["owner", "buyer"] : ["buyer"], phones: [{ number: phone, label: "Synthetic retained phone", is_primary: true }], emails: [], country: "MA", languages: ["french"] }));
      if (created.status() !== 200) throw new Error("SYNTHETIC_OWNER_RECOVERY_CREATION_FAILED");
      original = contactSchema.parse(await created.json());
    }
    await page.setViewportSize({ width: scenario.width, height: 900 }); await page.goto(scenario.kind === "edit" ? `/owners/${original!.id}/edit` : "/owners/new");
    const form = page.getByRole("form", { name: scenario.kind === "edit" ? "Modifier le propriétaire" : "Ajouter un propriétaire", exact: true });
    const savedName = scenario.kind === "edit" ? `${name} revised` : name;
    if (scenario.kind === "add-role") {
      await form.getByLabel("Contact", { exact: true }).selectOption("existing"); await form.getByLabel("Rechercher un contact accessible", { exact: true }).fill(name);
      await form.getByRole("button", { name: "Rechercher", exact: true }).click(); await form.getByRole("button", { name: `Choisir ${name}`, exact: true }).click();
      await expect(form.getByText("Rôle Propriétaire à ajouter", { exact: true })).toBeVisible();
    } else {
      await form.getByLabel("Nom complet", { exact: true }).fill(savedName);
      if (scenario.kind === "create") await form.getByLabel("Téléphone 1 *", { exact: true }).fill(phone);
    }
    const path = scenario.kind === "create" ? "/api/v1/contacts" : `/api/v1/contacts/${original!.id}`, attempts: { key?: string; body: string | null }[] = [];
    let contactId = original?.id, failRead = false;
    await page.route("**/api/v1/contacts**", async route => {
      const request = route.request(), pathname = new URL(request.url()).pathname;
      if (pathname === path && request.method() === (scenario.kind === "create" ? "POST" : "PATCH")) {
        attempts.push({ key: request.headers()["idempotency-key"], body: request.postData() });
        const response = await route.fetch(); if (response.status() !== 200) throw new Error("SYNTHETIC_OWNER_RECOVERY_WRITE_FAILED");
        contactId = contactSchema.parse(await response.json()).id;
        if (scenario.fault === "receipt" && attempts.length === 1) return route.abort("failed");
        failRead = scenario.fault === "read"; return route.fulfill({ response });
      }
      if (failRead && request.method() === "GET" && pathname === `/api/v1/contacts/${contactId}`) {
        failRead = false; return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE" } }) });
      }
      return route.continue();
    });
    await form.getByRole("button", { name: scenario.kind === "create" ? "Créer le propriétaire" : scenario.kind === "edit" ? "Enregistrer les modifications" : "Ajouter le rôle Propriétaire", exact: true }).click();
    const retry = form.getByRole("button", { name: scenario.fault === "receipt" ? "Réessayer la même opération" : "Actualiser le résultat", exact: true });
    await expect(retry).toBeEnabled();
    if (scenario.kind === "add-role") await expect(form.getByLabel("Contact", { exact: true })).toBeDisabled();
    else await expect(form.getByLabel("Nom complet", { exact: true })).toBeDisabled();
    await retry.click(); await expect.poll(() => new URL(page.url()).pathname === `/owners/${contactId}`).toBe(true);
    expect(attempts.length === (scenario.fault === "receipt" ? 2 : 1)).toBe(true);
    if (attempts.length === 2) expect(Boolean(attempts[0].key) && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body).toBe(true);
    const response = await page.request.get(`/api/v1/contacts/${contactId}`); if (response.status() !== 200) throw new Error("SYNTHETIC_OWNER_RECOVERY_COMPLETION_FAILED");
    const saved = contactSchema.parse(await response.json()); expect(saved.name === savedName && saved.version === (original ? original.version + 1 : 1) && saved.roles.includes("owner")).toBe(true);
    if (original) for (const field of ["phones", "emails", "country", "nationality", "languages", "primary_agent", "source", "source_submission_id", "created_by_user_id"] as const) expect(JSON.stringify(saved[field]) === JSON.stringify(original[field])).toBe(true);
    const portfolio = await page.request.get(`/api/v1/contacts/${contactId}/portfolio`); if (portfolio.status() !== 200) throw new Error("SYNTHETIC_OWNER_RECOVERY_PORTFOLIO_FAILED"); expect((await portfolio.json()).total === 0).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
