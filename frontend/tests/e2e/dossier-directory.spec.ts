import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { directoryLeadDraft } from "../helpers/directory-fixtures";

test("selected prospect queue filter is an applied read criterion with matching scoped results", async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager"), owner = await createActor("agent");
  try {
    await signIn(page, manager);
    const name = `SYN-QUEUE-${randomUUID().slice(0, 8)}`;
    expect((await staffCommand(page, "enquiries", directoryLeadDraft(name, "+212600000098", { primaryAgentId: owner.id }))).status()).toBe(200);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/leads");
    const panel = page.locator('[data-filter-panel="desktop"]');
    await panel.getByText("Filtres avancés", { exact: true }).click();
    await panel.getByText("Agent attribué", { exact: true }).first().click();
    await expect(panel.getByLabel("Agent attribué", { exact: true })).toBeEnabled();
    await panel.getByLabel("Agent attribué", { exact: true }).selectOption("unassigned");
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
    const response = await page.request.get("/api/v1/enquiries?assigned_agent_id=unassigned");
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.items.some((item: { contact: { name: string }; assigned_agent: unknown }) => item.contact.name === name && item.assigned_agent === null)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally {
    await clearActorContext(page);
    await removeActor(manager);
    await removeActor(owner);
  }
});

test("phone affairs creation/modification filters remain separate and invalid drafts stay in the Sheet", async ({ page }) => {
  const account = await createActor("agent");
  try {
    await signIn(page, account);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deals");
    await page.getByRole("button", { name: /Afficher les filtres/ }).click();
    const panel = page.getByRole("dialog", { name: "Filtres des affaires", exact: true });
    await panel.getByText("Filtres avancés", { exact: true }).click();
    await panel.getByText("Date de création", { exact: true }).click();
    await panel.getByLabel("Créée à partir du", { exact: true }).fill("2026-01-02");
    await panel.getByLabel("Créée jusqu’au", { exact: true }).fill("2026-01-02");
    await panel.getByText("Dernière modification", { exact: true }).click();
    await panel.getByLabel("Modifiée à partir du", { exact: true }).fill("2026-01-04");
    await panel.getByLabel("Modifiée jusqu’au", { exact: true }).fill("2026-01-04");
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(panel).toHaveCount(0);
    await page.getByRole("button", { name: /Afficher les filtres/ }).click();
    await panel.getByText("Filtres avancés", { exact: true }).click();
    await panel.getByText("Date de création", { exact: true }).click();
    await panel.getByLabel("Créée à partir du", { exact: true }).fill("2026-02-01");
    await panel.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(panel.getByRole("alert")).toHaveText("La date de début doit précéder la date de fin.");
    await expect(panel.getByLabel("Créée à partir du", { exact: true })).toHaveValue("2026-02-01");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally {
    await clearActorContext(page);
    await removeActor(account);
  }
});
