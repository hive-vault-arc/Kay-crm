import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { reservationBody, reservationFixture } from "../helpers/reservations";
import { fillOutcome, outcomeBody, outcomeDialog, salePair } from "../helpers/outcomes";

test.beforeEach(({ page }) => { page.setDefaultTimeout(25_000); page.setDefaultNavigationTimeout(30_000); });

test("SP13 AT-12/13/14/34: required close fields, committed retry, child review and retained reopen", async ({ page }) => {
  test.setTimeout(240_000); const actors: TestActor[] = [];
  try {
    const data = await reservationFixture(page, actors);
    await page.goto(`/deals/${data.unit}`); const dialog = await outcomeDialog(page);
    await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Indiquez la date et l’explication" })).toBeVisible();
    await fillOutcome(dialog);
    let interrupted = false;
    await page.route(`**/api/v1/deals/${data.unit}/close`, async route => { if (interrupted) return route.continue(); interrupted = true; const result = await route.fetch(); expect(result.status()).toBe(200); await route.abort("connectionfailed"); });
    await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
    await expect(dialog.getByLabel("Explication du résultat (obligatoire)", { exact: true })).toHaveValue("SP13 accord synthétique confirmé");
    await dialog.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(dialog).not.toBeVisible(); await page.unroute(`**/api/v1/deals/${data.unit}/close`);
    const detail = await (await page.request.get(`/api/v1/deals/${data.unit}`)).json(); expect(detail.stage).toBe("won"); expect(detail.offering.state).toBe("rented"); await expect(page.getByText("Pièces jointes en lecture seule pour l’état actuel de l’affaire ou du contact.", { exact: true })).toBeVisible(); await expect(page.getByText(/Contact archivé/)).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Résultats et réouvertures", exact: true }).getByText(/SP13 accord synthétique confirmé/)).toBeVisible();
    await page.goto(`/deals/${data.whole}`); const whole = await outcomeDialog(page); await fillOutcome(whole);
    await expect(whole.getByRole("alert").filter({ hasText: "Une unité a déjà été vendue ou louée" })).toBeVisible();
    await whole.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click();
    await expect(whole.getByRole("alert").filter({ hasText: "La clôture du programme entier reste bloquée" }).first()).toBeVisible();
    expect((await (await page.request.get(`/api/v1/deals/${data.whole}`)).json()).stage).not.toBe("won");
    await whole.getByRole("button", { name: "Retour", exact: true }).click();
    await page.goto(`/deals/${data.unit}`); const reopen = await outcomeDialog(page, true);
    await reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP13 réouverture synthétique vérifiée");
    await reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).click(); await expect(reopen).not.toBeVisible();
    expect((await (await page.request.get(`/api/v1/deals/${data.unit}`)).json()).stage).toBe("negotiation");
    const history = await (await page.request.get(`/api/v1/deals/${data.unit}/outcomes`)).json(); expect(history.total).toBe(1); expect(history.items[0].agreed_amount_mad).toBe("11999.99"); expect(history.items[0].reopening.reason).toBe("SP13 réouverture synthétique vérifiée");
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP13 AT-10: sale releases unfinished rent, flags without closing; lost and cancelled require no amount", async ({ page }) => {
  test.setTimeout(240_000); const actors: TestActor[] = [];
  try {
    const data = await reservationFixture(page, actors); const pair = await salePair(page, data);
    expect((await staffCommand(page, `deals/${pair.rental}/reserve`, await reservationBody(page, pair.rental))).status()).toBe(200);
    await page.goto(`/deals/${pair.sale}`); const sale = await outcomeDialog(page); await fillOutcome(sale);
    await expect(sale.getByText("La réservation de cette offre sera libérée avec historique.", { exact: true })).toBeVisible();
    await sale.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(sale).not.toBeVisible();
    const rental = await (await page.request.get(`/api/v1/deals/${pair.rental}`)).json(); expect(rental.stage).toBe("new"); expect(rental.stock_review_required).toBe(true); expect(rental.active_reservation).toBeNull(); expect(rental.offering.state).toBe("withdrawn");
    await page.goto(`/deals/${pair.rental}`); await expect(page.getByText(/Le stock lié a changé. Faites vérifier cette affaire/)).toBeVisible();
    for (const outcome of ["lost", "cancelled"]) {
      const close = await outcomeDialog(page); await fillOutcome(close, outcome); await expect(close.getByLabel(/Montant convenu en MAD/)).toHaveCount(0);
      await close.getByRole("button", { name: "Clôturer l’affaire", exact: true }).click(); await expect(close).not.toBeVisible();
      expect((await (await page.request.get(`/api/v1/deals/${pair.rental}`)).json()).stage).toBe(outcome);
      const reopen = await outcomeDialog(page, true); await reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP13 reprise sans engagement de stock"); await reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).click(); await expect(reopen).not.toBeVisible();
    }
    expect((await (await page.request.get(`/api/v1/deals/${pair.sale}`)).json()).stage).toBe("won");
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP13 AT-11/13: manager external sale creates no KAY win and intervening stock blocks reopen", async ({ page }) => {
  test.setTimeout(240_000); const actors: TestActor[] = [];
  try {
    const data = await reservationFixture(page, actors); const pair = await salePair(page, data, true);
    expect((await staffCommand(page, `deals/${pair.rental}/close`, await outcomeBody(page, pair.rental))).status()).toBe(200);
    const outsider = await createActor("agent"); actors.push(outsider);
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/deals/${pair.rental}/outcomes`)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/properties/${pair.pid}/stock-review?offering_id=${pair.saleOffer}`)).status()).toBe(403);
    await page.goto(`/projects/properties/${pair.pid}`); await expect(page.getByRole("button", { name: "Marquer vendue ailleurs", exact: true })).toHaveCount(0);
    await clearActorContext(page); await signIn(page, data.manager);
    await page.goto(`/projects/properties/${pair.pid}`); await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await page.getByRole("button", { name: "Marquer vendue ailleurs", exact: true }).click(); const external = page.getByRole("alertdialog", { name: "Marquer vendue ailleurs", exact: true });
    await expect(external.getByRole("button", { name: "Marquer vendue ailleurs", exact: true })).toBeEnabled();
    await external.getByLabel("Date du résultat externe (obligatoire)", { exact: true }).fill("2026-10-15");
    await external.getByLabel("Motif partagé, sans donnée privée (obligatoire)", { exact: true }).fill("SP13 vente externe synthétique confirmée");
    await external.getByRole("button", { name: "Marquer vendue ailleurs", exact: true }).click(); await expect(external).not.toBeVisible();
    expect((await (await page.request.get(`/api/v1/deals/${pair.sale}`)).json()).stage).toBe("new");
    expect((await (await page.request.get(`/api/v1/deals/${pair.sale}/outcomes`)).json()).total).toBe(0);
    await clearActorContext(page); await signIn(page, data.agent); await page.goto(`/deals/${pair.rental}`);
    const reopen = await outcomeDialog(page, true); await reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true }).fill("SP13 motif conservé malgré conflit");
    await reopen.getByRole("button", { name: "Rouvrir l’affaire", exact: true }).click(); await expect(reopen.getByRole("alert").filter({ hasText: /Cette modification nécessite une revue de stock/ }).last()).toBeVisible();
    await expect(reopen.getByLabel("Motif de réouverture (obligatoire)", { exact: true })).toHaveValue("SP13 motif conservé malgré conflit");
    expect((await (await page.request.get(`/api/v1/deals/${pair.rental}`)).json()).stage).toBe("won");
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
