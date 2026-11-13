import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { downloadFile, syntheticFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";

test.use({ trace: "off", video: "off", screenshot: "off" });

test("An agent can create and edit owner identity and upload a private card copy", async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await createActor("agent"), outsider = await createActor("agent");
  const suffix = randomUUID().slice(0, 8);
  try {
    await testControl("worker-start");
    await signIn(page, agent);
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto("/owners");
    await page.getByRole("link", { name: "Ajouter un propriétaire", exact: true }).click();
    const create = page.getByRole("form", { name: "Ajouter un propriétaire", exact: true });
    const email = "E-mail principal du propriétaire (facultatif)", cin = "Numéro de carte nationale (CIN) · facultatif";
    await create.getByLabel("Nom complet", { exact: true }).fill(`Propriétaire synthétique ${suffix}`);
    await create.getByLabel("Téléphone 1 *", { exact: true }).fill(`+212615${String(parseInt(suffix, 16) % 1_000_000).padStart(6, "0")}`);
    await create.getByLabel(email, { exact: true }).fill("owner@example.com");
    await create.getByLabel(cin, { exact: true }).fill("qa-4012");
    const remarks = "Remarques importantes (facultatif)";
    await create.getByLabel(remarks, { exact: true }).fill("Contacter après 15 h (contrôle synthétique).");
    await create.getByRole("button", { name: "Créer le propriétaire", exact: true }).click();
    await expect(page).toHaveURL(/\/owners\/[a-f0-9-]{36}$/);
    const id = new URL(page.url()).pathname.split("/").at(-1);
    await expect(page.getByText("•••• 12", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Remarques importantes", exact: true })).toContainText("Contacter après 15 h");
    await page.getByRole("button", { name: "Modifier", exact: true }).click();
    const edit = page.getByRole("form", { name: "Modifier le propriétaire", exact: true });
    await expect(edit.getByLabel(cin, { exact: true })).toHaveValue("QA-4012");
    await expect(edit.getByLabel(email, { exact: true })).toHaveValue("owner@example.com");
    await edit.getByLabel(email, { exact: true }).fill("updated-owner@example.com");
    await edit.getByLabel(cin, { exact: true }).fill("");
    await expect(edit.getByLabel(remarks, { exact: true })).toHaveValue("Contacter après 15 h (contrôle synthétique).");
    await edit.getByLabel(remarks, { exact: true }).clear();
    await edit.getByRole("button", { name: "Enregistrer les modifications", exact: true }).click();
    await expect(edit).toHaveCount(0);
    await expect(page.getByText("updated-owner@example.com", { exact: true })).toBeVisible();
    await expect(page.getByText("•••• 12", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Remarques importantes", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Voir les documents", exact: true }).click();
    const docs = page.getByRole("dialog", { name: "Documents du propriétaire", exact: true });
    const cards = docs.getByRole("region", { name: "Carte nationale d’identité", exact: true });
    const copy = await syntheticFile("clean", "Copie synthétique.png");
    await cards.getByRole("button", { name: "Ajouter une copie", exact: true }).click();
    const upload = page.getByRole("dialog", { name: "Ajouter une copie", exact: true });
    await upload.getByLabel("Fichier", { exact: true }).setInputFiles(copy);
    await upload.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
    await expect(upload).toHaveCount(0);
    await expect(cards.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(docs.getByRole("region", { name: "Pièces jointes", exact: true }).getByText(copy.name)).toHaveCount(0);
    await downloadFile(page, copy.name, copy.buffer);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/contacts/${id}?owner_identity=true`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${id}&purpose=identity_card`)).status()).toBe(404);
  } finally {
    await clearActorContext(page); await removeActor(agent); await removeActor(outsider);
  }
});
