import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test("selected project presentation follows kind history, retains filters and keeps phones on image cards", async ({ page }) => {
  test.setTimeout(120_000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager);
    const response = await staffCommand(page, "developments", { reference: `SYN-VIEW-${randomUUID().slice(0, 8)}`, name: "Programme synthétique de présentation", category: "mixed", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
    expect(response.status()).toBe(200); const id = (await response.json()).development_id;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects?kind=biens");
    await page.getByRole("tablist", { name: "Présentation des biens" }).getByRole("tab", { name: "Liste" }).click();
    await page.getByRole("textbox", { name: "Rechercher un nom, une référence ou un lieu", exact: true }).fill("SYN retained property query");
    await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\?kind=programmes$/);
    const programmeViews = page.getByRole("tablist", { name: "Présentation des programmes" });
    await expect(programmeViews.getByRole("tab", { name: "Liste" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("table", { name: "Programmes immobiliers", exact: true }).getByRole("link", { name: "Programme synthétique de présentation", exact: true })).toBeVisible();
    await programmeViews.getByRole("tab", { name: "Cartes" }).click();
    await expect(page.locator(`article.kay-project-card a[href="/projects/${id}"]`)).toBeVisible();
    await programmeViews.getByRole("tab", { name: "Liste" }).click();
    await page.goBack();
    await expect(page.getByRole("tab", { name: "Biens indépendants", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("textbox", { name: "Rechercher un nom, une référence ou un lieu", exact: true })).toHaveValue("SYN retained property query");
    await expect(page.getByRole("tablist", { name: "Présentation des biens" }).getByRole("tab", { name: "Liste" })).toHaveAttribute("aria-selected", "true");
    await page.goForward();
    await expect(page.getByRole("tab", { name: "Programmes immobiliers", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(`article.kay-project-card a[href="/projects/${id}"]`)).toBeVisible();
    await expect(programmeViews).toBeHidden();
    await expect(page.getByRole("table", { name: "Programmes immobiliers", exact: true })).toHaveCount(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(programmeViews.getByRole("tab", { name: "Liste" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("table", { name: "Programmes immobiliers", exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(manager); }
});
