import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { confirmImport, csv, csvRow, importFixture, prepareCorrected, selectCsv } from "../helpers/imports";
import { staffCommand } from "../helpers/leads";

test("SP18 AT-20/23: mixed CSV, corrected file, row/fallback agents, atomic result and role denial", async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = [];
  try {
    const data = await importFixture(page, actors);
    await expect(page.getByRole("button", { name: "Envoyer et prévisualiser", exact: true })).toBeDisabled();
    await selectCsv(page, csv([csvRow("+212600000001", "", ""), csvRow("+212600111001", data.agent.email), csvRow("bad-phone", data.agent.email)]));
    await expect(page.getByText("1 à créer ; 1 ignorée(s) ; 1 à corriger ; 0 créée(s).", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approuver l’import", exact: true })).toBeDisabled();
    await prepareCorrected(page, data.agent, data.other); const bid = new URL(page.url()).searchParams.get("batch")!;
    await expect(page.getByText("2 à créer ; 1 ignorée(s) ; 0 à corriger ; 0 créée(s).", { exact: true })).toBeVisible();
    await confirmImport(page); await expect(page.getByText("Import approuvé : 2 contact(s) créé(s), 1 ligne(s) ignorée(s).", { exact: true })).toBeVisible();
    const report = await page.request.get(`/api/v1/imports/${bid}`); expect(report.status()).toBe(200); expect(report.headers()["cache-control"]).toBe("no-store");
    const rows = (await report.json()).items; expect(rows[1].agent_id).toBe(data.other.id); expect(rows[2].agent_id).toBe(data.agent.id);
    await page.reload(); await expect(page.getByText("Import approuvé : 2 contact(s) créé(s), 1 ligne(s) ignorée(s).", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Ouvrir le contact de la ligne 3", exact: true }).click(); await expect(page.getByRole("heading", { name: "SP18 contact été, démonstration synthétique", exact: true })).toBeVisible(); await expect(page.getByText("Import CSV", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, data.agent); await page.goto("/leads"); await expect(page.getByRole("link", { name: "Importer des contacts", exact: true })).toHaveCount(0);
    expect((await page.request.get(`/api/v1/imports/${bid}`)).status()).toBe(403);
    await page.goto(`/leads?view=import&batch=${bid}`); await expect(page.getByRole("alert").filter({ hasText: "opération n’est pas autorisée" })).toContainText("opération n’est pas autorisée"); await expect(page.getByText("SP18 second contact", { exact: false })).toHaveCount(0);
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});

test("SP18 AT-21: committed-response loss replays same key and a concurrent phone claim requires repreview", async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = [];
  try {
    const data = await importFixture(page, actors);
    const bid = await selectCsv(page, csv([csvRow("+212600111002", data.agent.email)]));
    let firstKey: string | undefined, retryKey: string | undefined;
    await page.route(`**/api/v1/imports/${bid}/approve`, async route => { firstKey = route.request().headers()["idempotency-key"]; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed"); });
    await confirmImport(page); await expect(page.getByRole("alert").filter({ hasText: "Résultat non confirmé" })).toBeVisible();
    await expect(page.getByText("Aperçu uniquement : aucun contact de ce lot n’a encore été créé.", { exact: true })).toHaveCount(0); await page.unroute(`**/api/v1/imports/${bid}/approve`);
    await page.route(`**/api/v1/imports/${bid}/approve`, async route => { retryKey = route.request().headers()["idempotency-key"]; await route.continue(); });
    await page.getByRole("button", { name: "Réessayer l’approbation", exact: true }).click(); await expect(page.getByText("Import approuvé : 1 contact(s) créé(s), 0 ligne(s) ignorée(s).", { exact: true })).toBeVisible(); expect(retryKey).toBe(firstKey); await page.unroute(`**/api/v1/imports/${bid}/approve`);
    const raceBatch = await selectCsv(page, csv([csvRow("+212600111003", data.agent.email)]), "concurrence-synthetique.csv");
    const claim = await staffCommand(page, "contacts", { name: "SP18 numéro revendiqué séparément synthétique", type: "person", phones: [{ number: "+212600111003", label: "", is_primary: true }], emails: [], roles: ["buyer"], primary_agent_id: data.agent.id }); expect(claim.status()).toBe(200);
    await confirmImport(page); await expect(page.getByText(/Import annulé intégralement/)).toBeVisible();
    const before = await (await page.request.get(`/api/v1/imports/${raceBatch}`)).json(); expect(before.items.every((row: { contact_id: string | null }) => row.contact_id === null)).toBe(true);
    await page.getByRole("button", { name: "Générer un nouvel aperçu", exact: true }).click(); await expect(page.getByText("0 à créer ; 1 ignorée(s) ; 0 à corriger ; 0 créée(s).", { exact: true })).toBeVisible();
    await confirmImport(page); await expect(page.getByText("Import approuvé : 0 contact(s) créé(s), 1 ligne(s) ignorée(s).", { exact: true })).toBeVisible();
  } finally { await clearActorContext(page); for (const actor of actors) await removeActor(actor); }
});
