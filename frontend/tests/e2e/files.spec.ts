import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { createProperty } from "../helpers/inventory";
import { createDevelopment } from "../helpers/developments";
import { downloadFile, syntheticFile, uploadFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";
import { manage, previewOperation, confirmOperation } from "../helpers/ownership";

test.beforeEach(({ page }) => { page.setDefaultTimeout(20000); });

// SP-09 focus: real bytes, actual separate worker, scoped grants, clean/rejected/recovery.
test("SP09 AT-06/26/35: private contact versus shared property/programme and actual clean/rejected bytes", async ({ page }) => {
  test.setTimeout(180000);
  const owner = await createActor("agent"); const manager = await createActor("manager"); const outsider = await createActor("agent");
  try {
    const clean = await syntheticFile(); const rejected = await syntheticFile("rejected");
    await signIn(page, owner);
    const lead = await createLead(page, "SP09 contact privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await page.goto(`/contacts/${contact.id}`); await page.getByRole("tab", { name: "Documents", exact: true }).click();
    await testControl("worker-stop");
    const privateRow = await uploadFile(page, clean);
    await expect(privateRow.getByText("En quarantaine, analyse en attente", { exact: true })).toBeVisible();
    await expect(privateRow.getByRole("button", { name: `Télécharger ${clean.name}`, exact: true })).toBeDisabled();
    await testControl("worker-start");
    await expect(privateRow.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 20_000 });
    await downloadFile(page, clean.name, clean.buffer);
    await privateRow.getByRole("button", { name: `Afficher ${clean.name}`, exact: true }).click();
    await expect(page.getByRole("img", { name: `Aperçu du fichier ${clean.name}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fermer l’aperçu", exact: true }).click();
    const privateDocuments = await (await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).json();
    const privateDocument = privateDocuments.items[0];
    const copiedPermit = await (await staffCommand(page, "files/permits", { action: "download", document_id: privateDocument.id, expected_version: privateDocument.version, version_id: privateDocument.versions[0].id })).json();
    await clearActorContext(page); await signIn(page, manager);
    const property = await createProperty(page);
    const sharedRow = await uploadFile(page, clean);
    await expect(sharedRow.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 20_000 });
    const development = await createDevelopment(page);
    const rejectedRow = await uploadFile(page, rejected);
    await expect(rejectedRow.getByText("Fichier rejeté par l’antivirus", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(rejectedRow.getByRole("button", { name: `Télécharger ${rejected.name}`, exact: true })).toBeDisabled();
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).status()).toBe(404);
    const outsiderSession = await (await page.request.get("/api/v1/auth/me")).json();
    const copiedResponse = await page.request.get(copiedPermit.transfer_url, { headers: { Origin: new URL(page.url()).origin, "X-File-Permit": copiedPermit.token, "X-File-Session": outsiderSession.csrf_token } });
    expect(copiedResponse.status()).toBe(403);
    expect((await copiedResponse.json()).error.code).toBe("FILE_PERMIT_INVALID");
    await page.goto(`/projects/properties/${property}`);
    await expect(page.getByRole("button", { name: "Envoyer le fichier", exact: true })).toHaveCount(0);
    await downloadFile(page, clean.name, clean.buffer);
    const documents = await (await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${property}`)).json();
    expect(JSON.stringify(documents).includes(contact.id)).toBe(false);
    expect((await staffCommand(page, "files/permits", { action: "upload", document_id: documents.items[0].id, expected_version: documents.items[0].version })).status()).toBe(403);
    await page.goto(`/projects/${development.id}`);
    await expect(page.getByText("Fichier rejeté par l’antivirus", { exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, manager); await page.goto(`/contacts/${contact.id}`);
    await manage(page, "archive"); await previewOperation(page); await confirmOperation(page);
    await page.getByRole("tab", { name: "Documents", exact: true }).click();
    await expect(page.getByText("Contact archivé : les documents ne peuvent pas être modifiés tant que le contact n’est pas restauré.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choisir un fichier", exact: true })).toHaveCount(0);
    await downloadFile(page, clean.name, clean.buffer);
  } finally { await testControl("worker-start"); await clearActorContext(page); await removeActor(manager); await removeActor(owner); await removeActor(outsider); }
});

test("SP09: interrupted network transfer and unavailable scanner recover without false success", async ({ page }) => {
  test.setTimeout(240000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager); await createProperty(page);
    const file = await syntheticFile();
    await page.route("https://localhost:8100/api/v1/transfers/**", route => route.abort("connectionfailed"));
    await page.getByLabel("Fichier à ajouter", { exact: true }).setInputFiles(file);
    await page.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Transfert interrompu" })).toBeVisible();
    await page.unroute("https://localhost:8100/api/v1/transfers/**");
    await testControl("worker-unavailable");
    const publication = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.startsWith("/api/v1/transfers/"));
    await page.getByRole("button", { name: "Réessayer le transfert", exact: true }).click();
    expect((await publication).status()).toBe(200);
    await expect(page.getByText(/L’analyse est indisponible/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: `Télécharger ${file.name}`, exact: true })).toBeDisabled();
    await testControl("worker-stop");
    const scanRetry = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith("/retry-scan"));
    await page.getByRole("button", { name: "Réessayer l’analyse", exact: true }).click();
    const scanResponse = await scanRetry;
    const scanPayload = await scanResponse.json();
    expect([200, 409]).toContain(scanResponse.status());
    if (scanResponse.status() === 409) expect(scanPayload.error.code).toBe("FILE_SCAN_IN_PROGRESS");
    await testControl("worker-start");
    // Forced worker termination can leave its fenced 90-second lease until recovery.
    await expect(page.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 120_000 });
    await downloadFile(page, file.name, file.buffer);
    await page.getByRole("button", { name: `Archiver ${file.name}`, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirmer l’archivage", exact: true }).click();
    await expect(page.getByText(/Aucune pièce jointe sur cette page/)).toBeVisible();
  } finally { await testControl("worker-start"); await clearActorContext(page); await removeActor(manager); }
});
