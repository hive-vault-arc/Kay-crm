import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { unitProgrammeDraft } from "../helpers/unit-listing-fixtures";

for (const [role, width] of [["agent", 1440], ["manager", 390]] as const) {
  test(`selected unit wizard saves known partial details for ${role} at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    const account = await createActor(role);
    try {
      await signIn(page, account);
      const programme = await staffCommand(page, "developments", unitProgrammeDraft(`SYN-U-${randomUUID().slice(0, 8)}`));
      expect(programme.status()).toBe(200);
      const { development_id: id } = await programme.json();
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/projects/${id}?tab=units`);
      await page.getByRole("button", { name: "Créer une unité", exact: true }).click();
      let panel = page.getByRole("dialog", { name: "Créer une unité", exact: true });
      await panel.getByRole("button", { name: "Annuler", exact: true }).click();
      await expect(panel).toHaveCount(0);
      await page.getByRole("button", { name: "Créer une unité", exact: true }).click();
      panel = page.getByRole("dialog", { name: "Créer une unité", exact: true });
      const form = panel.getByRole("form", { name: "Créer une unité", exact: true });
      const reference = `SYN-UNIT-${randomUUID().slice(0, 8)}`.toUpperCase();
      await form.locator("#property-category").selectOption("villa");
      await expect(form.locator('#property-category option[value="room"]')).toHaveCount(0);
      await form.locator("#property-reference").fill(reference);
      await form.locator("#property-price_mad").fill("500000.25");
      await form.getByRole("button", { name: "Suivant", exact: true }).click();
      await form.locator("#property-city").fill("Ville synthétique");
      await form.getByRole("button", { name: "Suivant", exact: true }).click();
      await form.locator("#property-bathrooms").fill("0");
      await form.getByRole("button", { name: "Suivant", exact: true }).click();
      await form.locator("#property-description").fill("Description synthétique\nDeuxième ligne");
      await form.getByRole("button", { name: "Suivant", exact: true }).click();
      await expect(form.getByText("Programme synthétique des unités", { exact: true })).toBeVisible();
      await expect(form.getByText("Ville synthétique", { exact: true })).toBeVisible();
      await form.getByRole("button", { name: "Créer l’unité", exact: true }).click();
      await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/projects\/properties\/[a-f0-9-]{36}$/);
      const pid = new URL(page.url()).pathname.split("/").at(-1);
      const read = await page.request.get(`/api/v1/properties/${pid}`);
      expect(read.status()).toBe(200);
      const unit = await read.json();
      expect(unit.reference).toBe(reference);
      expect(unit.development_id).toBe(id);
      expect(unit.area_sqm).toBeNull();
      expect(unit.listing_details.bathrooms).toBe(0);
      expect(unit.listing_details.description).toBe("Description synthétique\nDeuxième ligne");
      expect(unit.offerings[0].state).toBe("draft");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally {
      await clearActorContext(page);
      await removeActor(account);
    }
  });
}
