import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { confirmFinance, fillCommission, fillReceipt, financeFixture, recognize, saveCommission } from "../helpers/finance";
import { staffCommand } from "../helpers/leads";
import { fillOutcome } from "../helpers/outcomes";

// Prepared for the isolated supervisor; no native/app execution is claimed.
for (const width of [undefined, 1440, 390]) test(width === undefined ? "SP16 AT-13/14/15/23: selected finance, immutable corrections, exact retry and agent denial" : `Selected finance cards, immutable corrections and exact retry at ${width}px`, async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    if (width !== undefined) await page.setViewportSize({ width, height: 900 }); const data = await financeFixture(page, actors);
    const drawer = page.getByRole("dialog", { name: "Commissions et encaissements", exact: true }); await expect(drawer.getByRole("table")).toHaveCount(0);
    let form = await fillCommission(page); await form.getByRole("button", { name: "Annuler", exact: true }).click();
    const guard = page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }); await expect(guard).toBeVisible(); await guard.getByRole("button", { name: "Continuer la modification", exact: true }).click(); await expect(form.getByLabel("Montant de commission (MAD)", { exact: true })).toHaveValue("10000");
    await saveCommission(page); await recognize(page); await fillReceipt(page, "2500"); await page.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).click(); await confirmFinance(page, "Confirmer l’encaissement");
    let record = drawer.getByRole("region", { name: "Commission sélectionnée", exact: true }); await expect(record.getByRole("region", { name: "Encaissements et corrections", exact: true })).toContainText("2\u202f500,00 MAD");
    form = await fillReceipt(page, "7500,01"); await form.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).click(); await confirmFinance(page, "Confirmer l’encaissement");
    await expect(form.getByRole("alert").filter({ hasText: "dépasse le solde" })).toBeVisible(); await expect(form.getByLabel("Montant encaissé (MAD)", { exact: true })).toHaveValue("7500,01");
    await form.getByRole("button", { name: "Annuler", exact: true }).click(); await page.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true }).getByRole("button", { name: "Quitter sans enregistrer", exact: true }).click();
    record = drawer.getByRole("region", { name: "Commission sélectionnée", exact: true });
    await record.getByRole("button", { name: "Corriger cet encaissement", exact: true }).click(); form = drawer.getByRole("form", { name: "Correction d’encaissement", exact: true });
    await form.getByLabel("Montant encaissé (MAD)", { exact: true }).fill("2000"); await form.getByLabel("Motif de correction", { exact: true }).fill("SP16 original synthétique conservé et versement rectifié"); await form.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction d’encaissement");
    let list = await (await page.request.get(`/api/v1/deals/${data.dealId}/commissions`)).json(); const cid = list.items[0].id;
    let current = await (await page.request.get(`/api/v1/commissions/${cid}`)).json(); expect(current).toMatchObject({ collected_mad: "2000.00", balance_mad: "8000.00" });
    let receipts = await (await page.request.get(`/api/v1/commissions/${cid}/receipts`)).json(); expect(receipts.total).toBe(2); expect(receipts.items.filter((row: { valid: boolean }) => row.valid)).toHaveLength(1); expect(receipts.items.some((row: { amount_mad: string; valid: boolean }) => row.amount_mad === "2500.00" && !row.valid)).toBe(true);
    record = drawer.getByRole("region", { name: "Commission sélectionnée", exact: true }); await record.getByRole("button", { name: "Corriger cet encaissement", exact: true }).click(); form = drawer.getByRole("form", { name: "Correction d’encaissement", exact: true });
    await form.getByLabel("Type de correction", { exact: true }).selectOption("void"); await form.getByLabel("Motif de correction", { exact: true }).fill("SP16 annulation synthétique motivée sans suppression"); await form.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction d’encaissement");
    await expect(drawer.getByRole("region", { name: "Commission sélectionnée", exact: true })).toBeVisible(); current = await (await page.request.get(`/api/v1/commissions/${cid}`)).json(); expect(current).toMatchObject({ collected_mad: "0.00", balance_mad: "10000.00" }); receipts = await (await page.request.get(`/api/v1/commissions/${cid}/receipts`)).json(); expect(receipts.total).toBe(3);
    await drawer.getByRole("button", { name: "Toutes les commissions", exact: true }).click(); form = await fillCommission(page, true); await expect(form.getByText("1,01 MAD", { exact: true })).toBeVisible();
    const keys: string[] = []; let lost = false;
    await page.route(`**/api/v1/deals/${data.dealId}/commissions`, async route => { if (route.request().method() !== "POST") { await route.continue(); return; } keys.push(route.request().headers()["idempotency-key"]); if (lost) { await route.continue(); return; } lost = true; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await form.getByRole("button", { name: "Enregistrer la commission prévue", exact: true }).click(); await expect(form).toHaveAttribute("data-write-recovery", "true"); await expect(form.getByLabel("Base explicite (MAD)", { exact: true })).toBeDisabled();
    await form.getByRole("button", { name: "Réessayer la même opération", exact: true }).click(); await expect(form).toHaveCount(0); await page.unroute(`**/api/v1/deals/${data.dealId}/commissions`); expect(keys).toHaveLength(2); expect(keys[1]).toBe(keys[0]);
    await expect(drawer.getByRole("button", { name: "Encaissements et historique", exact: true })).toHaveCount(2); list = await (await page.request.get(`/api/v1/deals/${data.dealId}/commissions`)).json(); expect(list.total).toBe(2); expect(list.items.some((row: { current: { amount_mad: string; state: string } }) => row.current.amount_mad === "1.01" && row.current.state === "expected")).toBe(true);
    const percentage = list.items.find((row: { current: { kind: string } }) => row.current.kind === "percentage");
    await drawer.locator(`[data-finance-id="${percentage.id}"]`).getByRole("button", { name: "Corriger la commission", exact: true }).click(); form = drawer.getByRole("form", { name: "Correction de commission", exact: true });
    await form.getByLabel("Base explicite (MAD)", { exact: true }).fill("20,05"); await form.getByLabel("Motif de correction", { exact: true }).fill("SP16 comparaison synthétique avec saisie conservée");
    expect((await staffCommand(page, `commissions/${percentage.id}/recognize`, { expected_version: percentage.version })).status()).toBe(200);
    await form.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction de commission"); await form.getByRole("button", { name: "Comparer la version financière actuelle", exact: true }).click();
    await expect(form.getByText("Version actuelle · 2", { exact: true })).toBeVisible(); await form.getByRole("button", { name: "Conserver ma saisie avec cette version", exact: true }).click(); await expect(form.getByLabel("Base explicite (MAD)", { exact: true })).toHaveValue("20,05");
    await form.getByRole("button", { name: "Vérifier la correction", exact: true }).click(); await confirmFinance(page, "Confirmer la correction de commission"); await expect(form).toHaveCount(0);
    current = await (await page.request.get(`/api/v1/commissions/${percentage.id}`)).json(); expect(current.current).toMatchObject({ amount_mad: "2.01", state: "recognized" });
    const deal = await (await page.request.get(`/api/v1/deals/${data.dealId}`)).json(); expect(deal.stage).toBe("new"); expect(deal.active_reservation).toBeNull(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await drawer.getByRole("button", { name: "Fermer : Commissions et encaissements", exact: true }).click();
    await page.getByRole("button", { name: /^Étape actuelle :/ }).click(); await page.getByRole("menuitem", { name: "Clôturer · perdue", exact: true }).click();
    let outcome = page.getByRole("alertdialog", { name: "Clôturer l’affaire", exact: true }); await fillOutcome(outcome, "lost", "SP16 clôture avec finance conservée"); await outcome.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(outcome).not.toBeVisible();
    await page.getByRole("button", { name: /^Étape actuelle :/ }).click(); await page.getByRole("menuitem", { name: "Rouvrir l’affaire", exact: true }).click();
    outcome = page.getByRole("alertdialog", { name: "Rouvrir l’affaire", exact: true }); await outcome.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP16 réouverture synthétique sans perte financière"); await outcome.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).click(); await expect(outcome).not.toBeVisible();
    await page.getByRole("button", { name: "Voir la finance", exact: true }).click(); await expect(drawer.locator(`[data-finance-id="${cid}"]`)).toContainText("Revue financière requise");
    current = await (await page.request.get(`/api/v1/commissions/${cid}`)).json(); expect(current).toMatchObject({ collected_mad: "0.00", balance_mad: "10000.00", current: { state: "recognized", review_required: true } });
    expect((await (await page.request.get(`/api/v1/commissions/${cid}/receipts`)).json()).total).toBe(3);
    await clearActorContext(page); await signIn(page, data.agent); await page.goto(`/deals/${data.dealId}?tab=finance`); await expect(page.getByRole("button", { name: "Voir la finance", exact: true })).toHaveCount(0); await expect(page.getByRole("dialog", { name: "Commissions et encaissements", exact: true })).toHaveCount(0);
    for (const route of [`deals/${data.dealId}/commissions`, `commissions/${cid}`, `commissions/${cid}/receipts`, `commissions/${cid}/revisions`]) expect((await page.request.get(`/api/v1/${route}`)).status()).toBe(403);
    expect((await staffCommand(page, `commissions/${cid}/recognize`, { expected_version: 1 })).status()).toBe(403);
    await page.getByRole("button", { name: /^Étape actuelle :/ }).click(); await page.getByRole("menuitem", { name: "Clôturer · perdue", exact: true }).click();
    outcome = page.getByRole("alertdialog", { name: "Clôturer l’affaire", exact: true }); await fillOutcome(outcome, "lost", "SP16 clôture agent sans finance requise"); await outcome.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(outcome).not.toBeVisible();
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
