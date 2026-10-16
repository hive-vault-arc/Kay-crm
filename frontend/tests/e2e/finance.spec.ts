import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { confirmFinance, fillCommission, fillReceipt, financeFixture, openFinance, recognize, saveCommission } from "../helpers/finance";
import { fillOutcome, outcomeDialog } from "../helpers/outcomes";

test("SP16 AT-13/14/15/23: recognition, receipts, excess, retained correction/reopen and agent denial", async ({ page }) => {
  test.setTimeout(210_000); const actors: TestActor[] = [];
  try {
    const data = await financeFixture(page, actors);
    await expect(page.getByText("Aucune commission pour cette affaire. Aucune saisie financière n’est requise pour la clôturer.", { exact: true })).toBeVisible();
    await fillCommission(page); await saveCommission(page); await recognize(page);
    await fillReceipt(page); await page.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).click(); await confirmFinance(page, "Confirmer l’encaissement");
    const record = page.getByRole("region", { name: "Commission sélectionnée", exact: true });
    await expect(record.getByText("7\u202f500,00 MAD", { exact: true })).toBeVisible();
    await fillReceipt(page, "7500,01"); await page.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).click(); await confirmFinance(page, "Confirmer l’encaissement");
    await expect(page.getByRole("alert").filter({ hasText: "dépasse le solde" })).toBeVisible(); await expect(page.getByLabel("Montant encaissé (MAD)", { exact: true })).toHaveValue("7500,01");
    await page.getByRole("button", { name: "Fermer le formulaire", exact: true }).click();
    await page.getByRole("button", { name: "Corriger cet encaissement", exact: true }).click();
    const correction = page.getByRole("form", { name: "Correction d’encaissement", exact: true });
    await correction.getByLabel("Montant encaissé (MAD)", { exact: true }).fill("2000"); await correction.getByLabel("Motif de correction", { exact: true }).fill("SP16 original conservé et versement rectifié");
    await correction.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction d’encaissement");
    await expect(record.getByText("8\u202f000,00 MAD", { exact: true })).toBeVisible();
    const receiptHistory = record.getByRole("region", { name: "Encaissements et corrections", exact: true }); await expect(receiptHistory.getByRole("listitem")).toHaveCount(2); await expect(receiptHistory).toContainText("Original remplacé ou annulé");
    const commissions = await (await page.request.get(`/api/v1/deals/${data.dealId}/commissions`)).json(); const cid = commissions.items[0].id;
    await page.getByRole("tab", { name: "Dossier", exact: true }).click(); let dialog = await outcomeDialog(page); await fillOutcome(dialog, "lost"); await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(dialog).not.toBeVisible();
    dialog = await outcomeDialog(page, true); await dialog.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP16 réouverture avec finance conservée"); await dialog.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).click(); await expect(dialog).not.toBeVisible();
    await page.getByRole("tab", { name: "Finance", exact: true }).click(); await page.getByRole("button", { name: /^Commission 1 :/ }).click(); await expect(record.getByText(/L’affaire a été rouverte/)).toBeVisible(); await expect(record.getByText("8\u202f000,00 MAD", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, data.agent); await page.goto(`/deals/${data.dealId}?tab=finance`); await expect(page.getByRole("tab", { name: "Finance", exact: true })).toHaveCount(0); await expect(page.getByRole("heading", { name: "Pipeline", exact: true })).toBeVisible();
    for (const route of [`deals/${data.dealId}/commissions`, `commissions/${cid}`, `commissions/${cid}/receipts`, `commissions/${cid}/revisions`]) expect((await page.request.get(`/api/v1/${route}`)).status()).toBe(403);
    expect((await staffCommand(page, `commissions/${cid}/recognize`, { expected_version: 5 })).status()).toBe(403);
    dialog = await outcomeDialog(page); await fillOutcome(dialog, "lost", "SP16 clôture agent sans commission requise"); await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(dialog).not.toBeVisible();
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP16 AT-14/15/23: exact percentage, committed retry and draft-preserving version comparison", async ({ page }) => {
  test.setTimeout(150_000); const actors: TestActor[] = [];
  try {
    const data = await financeFixture(page, actors); const form = await fillCommission(page, true);
    await expect(form.getByRole("status")).toHaveText("Montant calculé : 1,01 MAD.");
    let lost = false; await page.route(`**/api/v1/deals/${data.dealId}/commissions`, async route => { if (route.request().method() !== "POST" || lost) return route.continue(); lost = true; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await page.getByRole("button", { name: "Enregistrer la commission prévue", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await expect(form.getByLabel("Base explicite (MAD)", { exact: true })).toHaveValue("10,05");
    await saveCommission(page); await page.unroute(`**/api/v1/deals/${data.dealId}/commissions`);
    const list = await (await page.request.get(`/api/v1/deals/${data.dealId}/commissions`)).json(); expect(list.total).toBe(1); const cid = list.items[0].id; expect(list.items[0].current.amount_mad).toBe("1.01");
    await page.getByRole("button", { name: "Corriger la commission", exact: true }).click(); const correction = page.getByRole("form", { name: "Correction de commission", exact: true }); await correction.getByLabel("Base explicite (MAD)", { exact: true }).fill("20,05"); await correction.getByLabel("Motif de correction", { exact: true }).fill("SP16 brouillon explicite conservé");
    expect((await staffCommand(page, `commissions/${cid}/recognize`, { expected_version: 1 })).status()).toBe(200);
    await correction.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction de commission"); await expect(page.getByRole("region", { name: "Reprise de l’action financière", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Comparer la version financière actuelle", exact: true }).click(); await expect(page.getByRole("region", { name: "Version financière actuelle", exact: true })).toContainText("Version actuelle : 2"); await page.getByRole("button", { name: "Conserver ma saisie avec cette version", exact: true }).click(); await expect(correction.getByLabel("Base explicite (MAD)", { exact: true })).toHaveValue("20,05");
    await correction.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction de commission");
    const current = await (await page.request.get(`/api/v1/commissions/${cid}`)).json(); expect(current.current.amount_mad).toBe("2.01"); expect(current.current.state).toBe("recognized");
    await openFinance(page, data.dealId); await expect(page.getByRole("button", { name: "Commission 1 : 2,01 MAD", exact: true })).toBeVisible();
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
