import type { Page } from "@playwright/test";
import { createActor, clearActorContext, expect, signIn, type TestActor } from "./auth";
import { createLead } from "./leads";

export const header = "name,primary_phone,other_phones,primary_email,other_emails,roles,agent_email,notes";
export function csv(rows: string[][]) { return Buffer.from(header + "\r\n" + rows.map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n"), "utf8"); }
export function csvRow(phone: string, email = "", name = "SP18 contact été, démonstration synthétique") { return [name, phone, "", "", "", "buyer", email, "Notes de contrôle synthétiques, sans donnée réelle"]; }
export async function importFixture(page: Page, actors: TestActor[]) {
  const agent = await createActor("agent", false, "SP06 SP18 agent responsable synthétique"), other = await createActor("agent", false, "SP06 SP18 autre agent au nom particulièrement long pour le contrôle mobile synthétique"), manager = await createActor("manager", false, "SP06 SP18 responsable import synthétique"); actors.push(agent, other, manager);
  await signIn(page, agent); await createLead(page, "SP18 contact existant synthétique"); await clearActorContext(page); await signIn(page, manager);
  await page.goto("/leads"); await page.getByRole("link", { name: "Importer des contacts", exact: true }).click();
  try { await expect(page.getByRole("heading", { name: "Importer des contacts", exact: true })).toBeVisible(); }
  catch (failure) {
    const diagnostic = await page.evaluate(() => ({ path: location.pathname, view: new URLSearchParams(location.search).get("view"), width: innerWidth, scrollWidth: document.documentElement.scrollWidth, desktopFilters: matchMedia("(min-width: 80rem)").matches, ready: document.readyState, dialogs: document.querySelectorAll('[role="dialog"]').length, headings: document.querySelectorAll("h1").length })).catch(() => ({ closed: true }));
    console.info("SP18_IMPORT_NAVIGATION_DIAGNOSTIC", JSON.stringify(diagnostic));
    throw failure;
  }
  return { agent, other, manager };
}
export async function selectCsv(page: Page, data: Buffer, name = "contacts-synthetiques.csv") {
  const previous = new URL(page.url()).searchParams.get("batch");
  const choice = page.waitForEvent("filechooser"); await page.getByRole("button", { name: "Choisir un CSV", exact: true }).click();
  await (await choice).setFiles({ name, mimeType: "text/csv", buffer: data });
  const preview = page.waitForResponse(response => /\/api\/v1\/imports\/[a-f0-9-]+\/preview$/.test(new URL(response.url()).pathname) && response.request().method() === "POST");
  await page.getByRole("button", { name: /^(Envoyer et prévisualiser|Réessayer le fichier)$/ }).click();
  expect((await preview).status()).toBe(200);
  await expect.poll(() => { const id = new URL(page.url()).searchParams.get("batch"); return Boolean(id && id !== previous); }).toBe(true);
  await expect(page.getByText("Transfert et aperçu en cours…", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Chargement du lot…", { exact: true })).toHaveCount(0);
  return new URL(page.url()).searchParams.get("batch")!;
}
export async function prepareCorrected(page: Page, agent: TestActor, other: TestActor) {
  await selectCsv(page, csv([csvRow("+212600000001", "", "SP18 contact déjà connu synthétique"), csvRow("+212600111001", agent.email), csvRow("+33612345678", "", "SP18 second contact\n synthétique")]), "contacts-corriges-synthetiques.csv");
  await expect(page.getByRole("button", { name: "Approuver l’import", exact: true })).toBeDisabled();
  await page.getByLabel("Agent de remplacement des lignes sans agent_email", { exact: true }).selectOption(agent.id);
  await page.getByRole("button", { name: "Modifier l’agent de la ligne 3", exact: true }).click();
  await page.getByLabel("Agent de la ligne 3", { exact: true }).selectOption(other.id);
  await page.getByLabel("Agent de la ligne 3", { exact: true }).selectOption("");
  await expect(page.getByLabel("Agent de la ligne 3", { exact: true })).toHaveValue("");
  await page.getByLabel("Agent de la ligne 3", { exact: true }).selectOption(other.id);
  await page.getByRole("button", { name: "Fermer le choix d’agent", exact: true }).click();
  await page.getByRole("button", { name: "Générer un nouvel aperçu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approuver l’import", exact: true })).toBeEnabled();
}
export async function confirmImport(page: Page) {
  await page.getByRole("button", { name: "Approuver l’import", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmer l’import", exact: true }).click();
}
