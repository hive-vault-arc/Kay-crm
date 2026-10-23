import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { convertLead } from "../helpers/deals";
import { geometry } from "../helpers/report-review";

test("Lead and Deal keep separate discussed and visited catalogue links above compact contact searches", async ({ page }) => {
  test.setTimeout(150_000);
  const actor = await createActor("agent");
  const reference = `LINK-${randomUUID().slice(0, 8)}`.toUpperCase();
  const name = "Programme synthétique lié";
  try {
    await signIn(page, actor);
    const response = await staffCommand(page, "developments", {
      reference, name, category: "mixed", location: "Localisation synthétique",
      briefing_text: null, developer_contact_id: null, developer_marketing_display: null,
    });
    expect(response.status()).toBe(200);
    const projectId = (await response.json()).development_id as string;
    const leadId = await createLead(page, "Client synthétique liens catalogue");
    const panel = page.getByRole("region", { name: "Projets liés au dossier" });
    const discussed = panel.getByRole("region", { name: "Projets discutés" });
    const visited = panel.getByRole("region", { name: "Projets visités" });
    await expect(discussed.getByText("Aucun projet discuté enregistré.")).toBeVisible();
    await discussed.getByRole("button", { name: "Ajouter un projet" }).click();
    await discussed.getByLabel("Rechercher dans le catalogue").fill(reference);
    await expect(discussed.getByLabel("Projet", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await discussed.getByLabel("Projet", { exact: true }).selectOption(projectId);
    await discussed.getByRole("button", { name: "Ajouter à cette liste" }).click();
    await expect(discussed.getByRole("link", { name })).toHaveAttribute("href", `/projects/${projectId}`);
    await expect(visited.getByText("Aucun projet visité enregistré.")).toBeVisible();
    await visited.getByRole("button", { name: "Ajouter un projet" }).click();
    await visited.getByLabel("Rechercher dans le catalogue").fill(reference);
    await expect(visited.getByLabel("Projet", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await visited.getByLabel("Projet", { exact: true }).selectOption(projectId);
    await visited.getByRole("button", { name: "Ajouter à cette liste" }).click();
    await expect(visited.getByRole("link", { name })).toBeVisible();
    const links = await (await page.request.get(`/api/v1/enquiries/${leadId}/project-links?kind=visited&page=1&page_size=25`)).json();
    expect(links.total).toBe(1);
    const history = page.getByRole("region", { name: "Historique du prospect", exact: true });
    await expect(history.getByText("Projet lié à la demande").first()).toBeVisible();
    mkdirSync("output/playwright/project-links", { recursive: true });
    await page.screenshot({ path: "output/playwright/project-links/lead-desktop.png", fullPage: true });
    const searches = page.getByText("Gérer les recherches du contact", { exact: true });
    await expect(searches).toBeVisible();
    expect(await page.evaluate(() => {
      const history = document.querySelector('[aria-label="Historique du prospect"]');
      const searches = [...document.querySelectorAll("summary")].find(item => item.textContent?.includes("Gérer les recherches du contact"));
      return Boolean(history && searches && history.compareDocumentPosition(searches) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    await searches.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Recherches du contact" })).toBeVisible();
    await expect(page.getByText("Aucune recherche enregistrée. Ajoutez un besoin d’achat ou de location pour commencer.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pages des recherches" })).toHaveCount(0);
    await page.getByRole("region", { name: "Recherches du contact" }).screenshot({ path: "output/playwright/project-links/lead-search-empty.png" });
    const dealId = await convertLead(page);
    const dealPanel = page.getByRole("region", { name: "Projets liés au dossier" });
    const dealVisited = dealPanel.getByRole("region", { name: "Projets visités" });
    await expect(dealVisited.getByText("Aucun projet visité enregistré.")).toBeVisible();
    await dealVisited.getByRole("button", { name: "Ajouter un projet" }).click();
    await dealVisited.getByLabel("Rechercher dans le catalogue").fill(reference);
    await expect(dealVisited.getByLabel("Projet", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await dealVisited.getByLabel("Projet", { exact: true }).selectOption(projectId);
    await dealVisited.getByRole("button", { name: "Ajouter à cette liste" }).click();
    await expect(dealVisited.getByRole("link", { name })).toBeVisible();
    const dealSearches = page.getByText("Gérer les recherches du contact", { exact: true });
    await expect(dealSearches).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recherches du contact" })).toHaveCount(0);
    expect(await dealSearches.evaluate(element => element.closest(".crm-record-view")?.lastElementChild === element.closest("details"))).toBe(true);
    expect((await (await page.request.get(`/api/v1/deals/${dealId}/project-links?kind=visited`)).json()).total).toBe(1);
    await dealVisited.getByRole("button", { name: "Retirer" }).click();
    await dealVisited.getByRole("button", { name: "Confirmer le retrait" }).click();
    await expect(dealVisited.getByText("Aucun projet visité enregistré.")).toBeVisible();
    await dealVisited.getByRole("button", { name: "Ajouter un projet" }).click();
    await dealVisited.getByLabel("Rechercher dans le catalogue").fill(reference);
    await expect(dealVisited.getByLabel("Projet", { exact: true }).locator(`option[value="${projectId}"]`)).toHaveCount(1);
    await dealVisited.getByLabel("Projet", { exact: true }).selectOption(projectId);
    await dealVisited.getByRole("button", { name: "Ajouter à cette liste" }).click();
    await expect(dealVisited.getByRole("link", { name })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await geometry(page);
    await page.screenshot({ path: "output/playwright/project-links/deal-mobile.png", fullPage: true });
    await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  } finally { await clearActorContext(page); await removeActor(actor); }
});
