import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";

test("selected programme phase is created, edited, filtered and retained as original history", async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await createActor("agent");
  try {
    await signIn(page, agent);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects/new");
    await page.getByLabel("Référence du programme", { exact: true }).fill(`SYN-PHASE-${randomUUID().slice(0, 8)}`);
    await page.getByLabel("Nom du programme", { exact: true }).fill("Programme synthétique avec état");
    await page.getByLabel("État du programme", { exact: true }).selectOption("marketing");
    await page.getByRole("button", { name: "Suivant", exact: true }).click();
    await page.getByRole("button", { name: "Suivant", exact: true }).click();
    await page.getByRole("button", { name: "Créer le programme", exact: true }).click();
    await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/);
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(page.getByLabel("État du programme : Commercialisation", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Modifier", exact: true }).click();
    await page.getByLabel("État du programme", { exact: true }).selectOption("preparation");
    await page.getByRole("button", { name: "Enregistrer le programme", exact: true }).click();
    await expect(page.getByLabel("État du programme : Préparation", { exact: true })).toBeVisible();
    await page.goto(`/projects/${id}?tab=history`);
    const history = page.getByRole("dialog").filter({ has: page.getByRole("heading", { name: "Historique", exact: true }) });
    await expect(history.getByText("État du programme lors de cet événement : Commercialisation", { exact: true })).toBeVisible();
    await expect(history.getByText("État du programme lors de cet événement : Préparation", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/projects?kind=programmes");
    await page.getByLabel("Statut du programme", { exact: true }).selectOption("marketing");
    await expect(page.getByRole("heading", { name: "Aucun programme correspondant", exact: true })).toBeVisible();
    await page.getByLabel("Statut du programme", { exact: true }).selectOption("preparation");
    await expect(page.locator(`article.kay-project-card a[href="/projects/${id}"]`)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /^Afficher les filtres/ }).click();
    await expect(page.getByRole("dialog").getByLabel("Statut du programme", { exact: true })).toHaveValue("preparation");
    await page.getByRole("dialog").getByLabel("Statut du programme", { exact: true }).selectOption("");
    await page.getByRole("button", { name: "Appliquer", exact: true }).click();
    await expect(page.locator(`article.kay-project-card a[href="/projects/${id}"]`)).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(agent); }
});
