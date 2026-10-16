import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { reservationBody, reservationDialog, reservationFixture } from "../helpers/reservations";

test.beforeEach(({ page }) => { page.setDefaultTimeout(25_000); page.setDefaultNavigationTimeout(30_000); });

test("SP12 AT-09/33: unit hold, committed-response retry and explicit release", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { unit, inventory, agent } = await reservationFixture(page, actors);
    await page.goto(`/deals/${unit}`);
    const body = await reservationBody(page, unit);
    const dialog = await reservationDialog(page);
    await expect(dialog.getByText(`${inventory.reference}-U201 : Unité physique`, { exact: true })).toBeVisible();
    await expect(dialog.getByText("Location : Disponible", { exact: true })).toBeVisible();
    let interrupted = false;
    await page.route(`**/api/v1/deals/${unit}/reserve`, async route => {
      if (interrupted) return route.continue(); interrupted = true;
      const result = await route.fetch(); expect(result.status()).toBe(200); await route.abort("connectionfailed");
    });
    await dialog.getByRole("button", { name: "Réserver l’offre", exact: true }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
    await dialog.getByRole("button", { name: "Réserver l’offre", exact: true }).click();
    await expect(dialog).not.toBeVisible(); await page.unroute(`**/api/v1/deals/${unit}/reserve`);
    await expect(page.getByRole("region", { name: "Réservation de l’affaire", exact: true }).getByText(/Aucune expiration automatique/)).toBeVisible();
    const held = await (await page.request.get(`/api/v1/deals/${unit}`)).json();
    expect(held.version).toBe(2); expect(held.stage).toBe("reserved"); expect(held.offering.state).toBe("reserved");
    expect(held.active_reservation.created_by_user_id).toBe(agent.id);
    const inventoryState = await (await page.request.get(`/api/v1/properties/${inventory.pid}`)).json(); expect(inventoryState.offerings[0].state).toBe("reserved");
    expect((await staffCommand(page, `deals/${unit}/reserve`, body)).status()).toBe(409);
    const release = await reservationDialog(page, true);
    await release.getByRole("button", { name: "Libérer la réservation", exact: true }).click();
    await expect(release.getByText(/Indiquez un motif de libération/)).toBeVisible();
    await release.getByLabel("Motif de la libération", { exact: true }).fill("SP12 libération explicite synthétique");
    await release.getByRole("button", { name: "Libérer la réservation", exact: true }).click();
    await expect(release).not.toBeVisible();
    const fresh = await (await page.request.get(`/api/v1/deals/${unit}`)).json();
    expect(fresh.stage).toBe("new"); expect(fresh.active_reservation).toBeNull(); expect(fresh.offering.state).toBe("available");
    const history = await (await page.request.get(`/api/v1/deals/${unit}/history`)).json();
    expect(history.items.map((e: { action: string }) => e.action)).toEqual(["reservation.released", "reservation.created", "created"]);
    expect(history.items[0].reason).toBe("SP12 libération explicite synthétique");
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP12 AT-33: same offering and whole/unit conflicts stay private, whole target can reserve after release", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { unit, whole, competitor, inventory } = await reservationFixture(page, actors);
    const staleWhole = await reservationBody(page, whole);
    expect((await staffCommand(page, `deals/${unit}/reserve`, await reservationBody(page, unit))).status()).toBe(200);
    for (const [did, code] of [[competitor, "RESERVATION_CONFLICT"], [whole, "DEVELOPMENT_OVERLAP"]]) {
      const result = await staffCommand(page, `deals/${did}/reserve`, await reservationBody(page, did)); expect(result.status()).toBe(409);
      expect((await result.json()).error.code).toBe(code);
      const detail = await (await page.request.get(`/api/v1/deals/${did}`)).json(); expect(detail.reservation_conflict).toBe(code);
      expect(detail.active_reservation).toBeNull();
    }
    const publicStock = await (await page.request.get(`/api/v1/developments/${inventory.did}`)).json();
    expect(publicStock.offerings[0].reservation_conflict).toBe("DEVELOPMENT_OVERLAP");
    expect(JSON.stringify(publicStock)).not.toContain(unit);
    await page.goto(`/deals/${whole}`); await expect(page.getByText(/Une réservation du même type couvre déjà/)).toBeVisible();
    const blocked = await reservationDialog(page); await expect(blocked.getByText(`${inventory.reference} : Programme entier`, { exact: true })).toBeVisible();
    await blocked.getByRole("button", { name: "Réserver l’offre", exact: true }).click(); await expect(blocked.getByRole("alert").filter({ hasText: "Un responsable doit vérifier" })).toBeVisible();
    await expect(blocked.getByText(/Votre motif reste saisi/)).toHaveCount(0);
    await blocked.getByRole("button", { name: "Retour", exact: true }).click();
    expect((await staffCommand(page, `deals/${unit}/release-reservation`, { ...await reservationBody(page, unit), reason: "SP12 libérer pour le programme" })).status()).toBe(200);
    expect((await staffCommand(page, `deals/${whole}/reserve`, staleWhole)).status()).toBe(200);
    await page.reload(); const region = page.getByRole("region", { name: "Réservation de l’affaire", exact: true }); await expect(region.getByRole("button", { name: "Libérer la réservation", exact: true })).toBeVisible();
    expect((await staffCommand(page, `deals/${unit}/reserve`, await reservationBody(page, unit))).status()).toBe(409);
    const held = await (await page.request.get(`/api/v1/developments/${inventory.did}`)).json(); expect(held.offerings[0].state).toBe("reserved");
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP12: stale release preserves reason, fresh review succeeds, outsiders and hostile fields fail", async ({ page }) => {
  test.setTimeout(180_000); const actors: TestActor[] = [];
  try {
    const { unit, agent } = await reservationFixture(page, actors);
    const outsider = await createActor("agent"); actors.push(outsider);
    const body = await reservationBody(page, unit);
    expect((await staffCommand(page, `deals/${unit}/reserve`, { ...body, expires_at: "2040-01-01" })).status()).toBe(422);
    expect((await staffCommand(page, `deals/${unit}/reserve`, { ...body, actor_id: randomUUID() })).status()).toBe(422);
    expect((await staffCommand(page, `deals/${unit}/reserve`, body)).status()).toBe(200);
    await page.goto(`/deals/${unit}`); const release = await reservationDialog(page, true);
    await release.getByLabel("Motif de la libération", { exact: true }).fill("SP12 motif conservé sur conflit");
    expect((await staffCommand(page, `deals/${unit}/transition`, { expected_version: 2, stage: "documents", reason: "SP12 autre session" })).status()).toBe(200);
    await release.getByRole("button", { name: "Libérer la réservation", exact: true }).click();
    await expect(release.getByRole("alert").filter({ hasText: "Cette affaire ou cette proposition a changé" })).toBeVisible();
    await expect(release.getByLabel("Motif de la libération", { exact: true })).toHaveValue("SP12 motif conservé sur conflit");
    await release.getByRole("button", { name: "Actualiser la disponibilité", exact: true }).click();
    await expect(release.getByText(/Affaire version 3/)).toBeVisible();
    await release.getByRole("button", { name: "Libérer la réservation", exact: true }).click(); await expect(release).not.toBeVisible();
    expect((await (await page.request.get(`/api/v1/deals/${unit}`)).json()).stage).toBe("documents");
    await clearActorContext(page); await signIn(page, outsider);
    expect((await staffCommand(page, `deals/${unit}/reserve`, body)).status()).toBe(404);
    expect((await page.request.get(`/api/v1/deals/${unit}`)).status()).toBe(404);
    await page.goto(`/deals/${unit}`); await expect(page.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réserver l’offre", exact: true })).toHaveCount(0);
    await clearActorContext(page); await signIn(page, agent);
    expect((await staffCommand(page, `deals/${unit}/reserve`, { ...await reservationBody(page, unit), expected_version: 2 })).status()).toBe(409);
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
