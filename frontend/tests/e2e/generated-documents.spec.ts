import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";

// Prepared for the isolated supervisor. Source/type checking is not native execution.
for (const width of [1440, 390]) test(`Selected private PDF preparation and exact recovery at ${width}px`, async ({ page }) => {
  test.setTimeout(240_000);
  const actor = await createActor("agent"), suffix = randomUUID().slice(0, 8), digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  try {
    await signIn(page, actor); await page.setViewportSize({ width, height: 900 });
    const created = await staffCommand(page, "enquiries", { new_contact: { name: `Client PDF synthétique ${suffix}`, type: "person", phones: [{ number: `+212613${digits}`, label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french"] }, initial_budget: "1000000", message: "Préparation synthétique", source: "manual" });
    expect(created.status()).toBe(200); const lead = (await created.json()).id;
    const leadDetail = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    const dealReply = await staffCommand(page, "deals", dealBody(leadDetail.contact.id, `Projet PDF synthétique ${suffix}`)); expect(dealReply.status()).toBe(200); const deal = (await dealReply.json()).id;
    for (const [parentKind, id, route] of [["enquiry", lead, "leads"], ["deal", deal, "deals"]] as const) {
      await page.goto(`/${route}/${id}/documents`);
      const tabs = page.getByRole("tablist", { name: "Documents du dossier", exact: true }); await expect(tabs.getByRole("tab")).toHaveCount(2);
      const context = await (await page.request.get(`/api/v1/generated-documents/context?parent_kind=${parentKind}&parent_id=${id}`)).json(); expect(context.templates).toHaveLength(10); expect(context.templates.some((item: { code: string }) => ["10", "11"].includes(item.code))).toBe(false);
      const choose = async (code: string) => { if (width === 390) await page.getByLabel("Modèle de document", { exact: true }).selectOption(code); else await page.getByRole("navigation", { name: "Choisir un modèle", exact: true }).getByRole("button", { name: new RegExp(`^${code} `) }).click(); };
      await expect(page.getByLabel("Nom du client / partie", { exact: true })).toHaveValue(`Client PDF synthétique ${suffix}`);
      await page.getByLabel("Observations et suite souhaitée", { exact: true }).fill("Visite synthétique à préparer.");
      await choose("02"); await page.getByLabel("Nom du client / partie", { exact: true }).fill("Brouillon synthétique indépendant"); await choose("01");
      await expect(page.getByLabel("Observations et suite souhaitée", { exact: true })).toHaveValue("Visite synthétique à préparer.");
      const keys: string[] = []; let loseAcknowledgement = true;
      await page.route("**/api/v1/generated-documents", async interception => {
        if (interception.request().method() !== "POST") { await interception.continue(); return; }
        keys.push(interception.request().headers()["idempotency-key"]);
        if (!loseAcknowledgement) { await interception.continue(); return; }
        loseAcknowledgement = false; const response = await interception.fetch(); expect(response.status()).toBe(200);
        await interception.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "DEPENDENCY_UNAVAILABLE", message: "Interruption synthétique", field_errors: {}, request_id: "synthetic" } }) });
      });
      await page.getByRole("button", { name: "Générer le PDF", exact: true }).click(); await expect(page.getByText(/La réponse a été interrompue/)).toBeVisible();
      await expect(page.getByLabel("Nom du client / partie", { exact: true })).toBeDisabled(); await page.getByRole("button", { name: "Récupérer le résultat", exact: true }).click();
      await expect(tabs.getByRole("tab", { name: /^Historique/ })).toHaveAttribute("aria-selected", "true"); expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]); await page.unroute("**/api/v1/generated-documents");
      const history = await (await page.request.get(`/api/v1/generated-documents?parent_kind=${parentKind}&parent_id=${id}&page=1&include_actor=true`)).json(); expect(history.total).toBe(1); expect(history.items[0].actor.id).toBe(actor.id); expect(history.items[0].template_code).toBe("01");
      const historyRegion = page.getByRole("region", { name: "Historique des PDF préparés", exact: true }); await expect(historyRegion.getByText(history.items[0].actor.display_name, { exact: true })).toBeVisible();
      if (width === 390) await expect(historyRegion.getByRole("table")).toHaveCount(0); else await expect(historyRegion.getByRole("columnheader", { name: "Auteur", exact: true })).toBeVisible();
      const download = page.waitForEvent("download"); await historyRegion.getByRole("button", { name: `Télécharger ${history.items[0].filename}`, exact: true }).click(); expect((await download).suggestedFilename()).toBe(history.items[0].filename);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Retour au dossier", exact: true }).click(); const guard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(guard).toBeVisible(); await guard.getByRole("button", { name: "Continuer la modification", exact: true }).click();
      await tabs.getByRole("tab", { name: "Préparer un PDF", exact: true }).click(); await choose("02"); await expect(page.getByLabel("Nom du client / partie", { exact: true })).toHaveValue("Brouillon synthétique indépendant");
      await page.getByRole("link", { name: "Retour au dossier", exact: true }).click(); await guard.getByRole("button", { name: "Quitter sans enregistrer", exact: true }).click(); await expect(page).toHaveURL(new RegExp(`/${route}/${id}\\?tab=documents$`));
    }
  } finally { await clearActorContext(page); await removeActor(actor); }
});
