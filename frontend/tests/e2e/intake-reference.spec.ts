import type { Page } from "@playwright/test";
import { clearActorContext, createActor, expect, test } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { clearIntake, simulatorOrigin } from "../helpers/intake";
import { receiptSchema } from "../../src/features/intake/website-client";

test.use({ trace: "off", video: "off", screenshot: "off" });

async function publicForm(page: Page) {
  const agent = await createActor("agent");
  await testControl("worker-stop");
  await testControl("fixture", { action: "website-source", id: agent.id });
  await testControl("simulator-start");
  await expect.poll(async () => { try { return (await page.request.get(simulatorOrigin)).status(); } catch { return 0; } }).toBe(200);
  await page.goto(simulatorOrigin);
  await expect.poll(() => page.getByLabel("Nom complet", { exact: true }).isEnabled()).toBe(true);
  await page.getByLabel("Nom complet", { exact: true }).fill("Synthetic public visitor");
  await page.getByLabel("Téléphone international", { exact: true }).fill("+212600000001");
}

// Prepared isolated simulator cases: the worker stays stopped; no contact processing.
test("Optional property reference survives exact public retry and disappears behind the receipt", async ({ page }) => {
  const attempts: { body: string | null; id: string }[] = [];
  try {
    await publicForm(page);
    await page.getByLabel("Référence du bien (facultative)", { exact: true }).fill("SYN-RÉF-42");
    await page.getByLabel("Votre demande (facultative)", { exact: true }).fill("Synthetic first line\nSecond line");
    await page.route(simulatorOrigin + "/submit", async route => {
      const response = await route.fetch();
      const parsed = receiptSchema.safeParse(await response.json());
      if (response.status() !== 202 || !parsed.success) throw new Error("SYNTHETIC_PUBLIC_RECEIPT_INVALID");
      attempts.push({ body: route.request().postData(), id: parsed.data.receipt_id });
      if (attempts.length === 1) return route.abort("failed");
      return route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
    const retry = page.getByRole("button", { name: "Réessayer le même envoi", exact: true });
    await expect.poll(() => retry.isVisible()).toBe(true);
    await expect.poll(() => page.getByLabel("Référence du bien (facultative)", { exact: true }).isDisabled()).toBe(true);
    await retry.click();
    await expect.poll(() => page.getByRole("heading", { name: "Reçu de la demande", exact: true }).count()).toBe(1);
    expect(attempts.length).toBe(2);
    expect(attempts[0].body === attempts[1].body && attempts[0].id === attempts[1].id).toBe(true);
    const payload: unknown = JSON.parse(attempts[0].body ?? "null");
    expect(Boolean(payload && typeof payload === "object" && "property_reference" in payload && payload.property_reference === "SYN-RÉF-42")).toBe(true);
    await expect.poll(() => page.locator("input,textarea,select").count()).toBe(0);
    expect((await page.context().cookies(simulatorOrigin)).length).toBe(0);
    expect((await page.locator("body").innerText()).includes("SYN-RÉF-42")).toBe(false);
    await page.getByRole("button", { name: "Actualiser le suivi", exact: true }).click();
    expect(attempts.length).toBe(2);
  } finally { attempts.length = 0; await clearActorContext(page); await clearIntake(); }
});

for (const limit of ["combined", "utf8"] as const) {
  test(`Public ${limit} limit keeps the draft editable and sends only its corrected request`, async ({ page }) => {
    const sent: string[] = [];
    try {
      await publicForm(page);
      page.on("request", request => { if (request.method() === "POST" && request.url() === simulatorOrigin + "/submit") sent.push("public-submit"); });
      const message = page.getByLabel("Votre demande (facultative)", { exact: true });
      await message.fill(limit === "combined" ? "x".repeat(4000) : "漢".repeat(3000));
      if (limit === "combined") await page.getByLabel("Référence du bien (facultative)", { exact: true }).fill("SYN-REF-42");
      await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
      // Next also renders its route announcer with role=alert.
      const validation = page.getByRole("alert").filter({ hasText: limit === "combined" ? "dépassent ensemble" : "trop volumineuse" });
      await expect(validation).toBeVisible();
      expect(sent.length).toBe(0);
      await expect.poll(() => message.isEnabled()).toBe(true);
      expect(await message.inputValue() === (limit === "combined" ? "x".repeat(4000) : "漢".repeat(3000))).toBe(true);
      await message.fill("Corrected synthetic request");
      await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
      await expect.poll(() => page.getByRole("heading", { name: "Reçu de la demande", exact: true }).count()).toBe(1);
      expect(sent.length).toBe(1);
    } finally { await clearActorContext(page); await clearIntake(); }
  });
}
