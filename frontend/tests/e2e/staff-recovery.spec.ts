import { randomBytes } from "node:crypto";
import type { Page } from "@playwright/test";
import { clearActorContext, createActor, expect, removeActor, signIn, test } from "../helpers/auth";

test.use({ trace: "off", video: "off", screenshot: "off" });

async function privateFill(page: Page, label: string, value: string) {
  try { await page.getByLabel(label, { exact: true }).fill(value); }
  catch { throw new Error("PRIVATE_TEST_INPUT_FAILED"); }
}

// Prepared real-stack cases. The first write commits before its response is dropped.
// Request bodies remain transient in this synthetic test; never print them in a matcher.
for (const operation of ["profile", "reset"] as const) {
  test(`Staff original ${operation} operation recovers a lost acknowledgement without a second write`, async ({ page, actor }) => {
    const colleague = await createActor("agent");
    const attempts: { key?: string; body: string | null; method: string }[] = [];
    try {
      await signIn(page, actor);
      await page.goto(`/settings/users/${colleague.id}/edit`);
      await expect.poll(() => page.getByRole("button", { name: "Enregistrer", exact: true }).isEnabled()).toBe(true);
      const path = `/api/v1/users/${colleague.id}${operation === "reset" ? "/reset-password" : ""}`;
      await page.route(`**${path}`, async route => {
        if (route.request().method() !== (operation === "reset" ? "POST" : "PATCH")) return route.continue();
        attempts.push({ key: route.request().headers()["idempotency-key"], body: route.request().postData(), method: route.request().method() });
        const response = await route.fetch();
        if (response.status() !== 200) throw new Error("SYNTHETIC_STAFF_WRITE_FAILED");
        if (attempts.length === 1) return route.abort("failed");
        return route.fulfill({ response });
      });
      if (operation === "reset") {
        await page.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
        await privateFill(page, "Nouveau mot de passe initial", randomBytes(24).toString("base64url"));
        await privateFill(page, "Votre mot de passe administrateur", actor.password);
        await page.getByRole("alertdialog").getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).click();
      } else {
        await privateFill(page, "Nom complet *", "Collaborateur synthétique modifié");
        await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      }
      const retry = page.getByRole("button", { name: "Réessayer la même opération", exact: true });
      await expect.poll(() => retry.isVisible()).toBe(true);
      // A modal security dialog hides the profile from the accessibility tree.
      // Its native save control must still be disabled by the shared operation owner.
      await expect.poll(() => page.getByRole("button", { name: "Enregistrer", exact: true, includeHidden: true }).isDisabled()).toBe(true);
      if (operation === "reset") {
        await expect.poll(() => page.getByLabel("Votre mot de passe administrateur", { exact: true }).isDisabled()).toBe(true);
        await page.keyboard.press("Escape");
        await expect.poll(() => page.getByRole("alertdialog").isVisible()).toBe(true);
      } else {
        await expect.poll(() => page.getByRole("button", { name: "Réinitialiser le mot de passe", exact: true }).isDisabled()).toBe(true);
      }
      await retry.click();
      await expect.poll(() => page.getByRole("status").filter({ hasText: operation === "reset" ? "Mot de passe réinitialisé" : "Compte enregistré" }).count()).toBe(1);
      expect(attempts.length).toBe(2);
      expect(Boolean(attempts[0].key) && attempts[0].key === attempts[1].key && attempts[0].body === attempts[1].body && attempts[0].method === attempts[1].method).toBe(true);
      await expect.poll(() => page.locator("[data-private-credential]").count()).toBe(0);
    } finally {
      attempts.length = 0;
      await clearActorContext(page);
      await removeActor(colleague);
    }
  });
}
