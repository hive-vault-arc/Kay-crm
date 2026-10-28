import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { directoryLeadDraft } from "../helpers/directory-fixtures";

for (const [role, width] of [["agent", 1440], ["manager", 390]] as const) {
  test(`selected Contacts filters and dossier counts stay scoped for ${role} at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    const account = await createActor(role), owner = await createActor("agent");
    try {
      await signIn(page, account);
      const name = `SYN-DIRECTORY-${randomUUID().slice(0, 8)}`;
      const response = await staffCommand(page, "enquiries", directoryLeadDraft(name, "+212600000099", role === "manager" ? { primaryAgentId: owner.id, assignedAgentId: owner.id } : {}));
      expect(response.status()).toBe(200);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/contacts");
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
      const openFilters = async () => {
        if (width < 831) await page.getByRole("button", { name: /Afficher les filtres/ }).click();
        return width < 831 ? page.getByRole("dialog", { name: "Filtres des contacts", exact: true }) : page.locator('[data-filter-panel="desktop"]');
      };
      let panel = await openFilters();
      await expect(panel.getByLabel("Dossiers liés", { exact: true })).toBeEnabled();
      if (role === "agent") await expect(panel.getByLabel("Archivage", { exact: true })).toHaveCount(0);
      await panel.getByLabel("Dossiers liés", { exact: true }).selectOption("none");
      await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
      await expect(page.getByText("Aucun contact ne correspond à vos filtres.", { exact: true })).toBeVisible();
      panel = await openFilters();
      await panel.getByLabel("Dossiers liés", { exact: true }).selectOption("enquiries");
      await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
      await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
      const current = await page.request.get("/api/v1/contacts?linked=enquiries");
      expect(current.status()).toBe(200);
      const list = await current.json();
      expect(list.directory_supported).toBe(true);
      expect(list.items.find((item: { name: string }) => item.name === name).dossier_counts).toEqual({ enquiries: 1, deals: 0 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    } finally {
      await clearActorContext(page);
      await removeActor(account);
      await removeActor(owner);
    }
  });
}
