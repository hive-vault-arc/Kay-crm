import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { createProperty } from "../helpers/inventory";
import { createDevelopment } from "../helpers/developments";
import { chooseDocument, downloadFile, expectInvalidDocument, openDocuments, syntheticFile, uploadFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";
import { manage, previewOperation, confirmOperation } from "../helpers/ownership";
import { testPorts } from "../../scripts/test-ports.mjs";

test.beforeEach(({ page }) => { page.setDefaultTimeout(20000); });
test.use({ trace: "off", video: "off", screenshot: "off" });

// SP-09 focus: real bytes, actual separate worker, scoped grants, clean/rejected/recovery.
test("SP09 AT-06/26/35: private contact versus shared property/programme and invalid format rejection", async ({ page }) => {
  test.setTimeout(180000);
  const owner = await createActor("agent"); const manager = await createActor("manager"); const outsider = await createActor("agent");
  try {
    const clean = await syntheticFile(); const cleanDocument = await syntheticFile("clean-document"); const invalid = await syntheticFile("invalid-document");
    await signIn(page, owner);
    const lead = await createLead(page, "SP09 contact privé synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await page.goto(`/contacts/${contact.id}`); await openDocuments(page, "contact");
    await testControl("worker-stop");
    const privateRow = await uploadFile(page, clean);
    await expect(privateRow.getByText("Vérification en attente", { exact: true })).toBeVisible();
    await expect(privateRow.getByRole("button", { name: `Télécharger ${clean.name}`, exact: true })).toBeDisabled();
    await testControl("worker-start");
    await expect(privateRow.getByText("Fichier disponible", { exact: true })).toBeVisible({ timeout: 20_000 });
    await downloadFile(page, clean.name, clean.buffer);
    await privateRow.getByRole("button", { name: `Afficher ${clean.name}`, exact: true }).click();
    await expect(page.getByRole("img", { name: `Aperçu du fichier ${clean.name}`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Fermer l’aperçu", exact: true }).click();
    const privateDocuments = await (await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).json();
    const privateDocument = privateDocuments.items[0];
    const copiedPermit = await (await staffCommand(page, "files/permits", { action: "download", document_id: privateDocument.id, expected_version: privateDocument.version, version_id: privateDocument.versions[0].id })).json();
    await clearActorContext(page); await signIn(page, manager);
    const property = await createProperty(page);
    await openDocuments(page, "inventory");
    const sharedRow = await uploadFile(page, cleanDocument);
    await expect(sharedRow.getByText("Fichier disponible", { exact: true })).toBeVisible({ timeout: 20_000 });
    const development = await createDevelopment(page);
    await openDocuments(page, "inventory");
    const invalidUpload = await expectInvalidDocument(page, invalid);
    await invalidUpload.getByRole("button", { name: "Annuler", exact: true }).click();
    await clearActorContext(page); await signIn(page, outsider);
    expect((await page.request.get(`/api/v1/documents?parent_kind=contact&parent_id=${contact.id}`)).status()).toBe(404);
    const outsiderSession = await (await page.request.get("/api/v1/auth/me")).json();
    const copiedResponse = await page.request.get(copiedPermit.transfer_url, { headers: { Origin: new URL(page.url()).origin, "X-File-Permit": copiedPermit.token, "X-File-Session": outsiderSession.csrf_token } });
    expect(copiedResponse.status()).toBe(403);
    expect((await copiedResponse.json()).error.code).toBe("FILE_PERMIT_INVALID");
    await page.goto(`/projects/properties/${property}`);
    const sharedDocuments = await openDocuments(page, "inventory");
    await expect(sharedDocuments.getByRole("button", { name: "Ajouter un document", exact: true })).toHaveCount(0);
    await expect(sharedDocuments.getByText("Les pièces jointes sont gérées par les responsables.", { exact: true })).toBeVisible();
    await downloadFile(page, cleanDocument.name, cleanDocument.buffer);
    const documents = await (await page.request.get(`/api/v1/documents?parent_kind=property&parent_id=${property}`)).json();
    expect(JSON.stringify(documents).includes(contact.id)).toBe(false);
    expect((await staffCommand(page, "files/permits", { action: "upload", document_id: documents.items[0].id, expected_version: documents.items[0].version })).status()).toBe(403);
    await page.goto(`/projects/${development.id}`);
    await openDocuments(page, "inventory");
    await expect(page.getByText("Transfert à reprendre", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Télécharger ${invalid.name}`, exact: true })).toBeDisabled();
    await clearActorContext(page); await signIn(page, manager); await page.goto(`/contacts/${contact.id}`);
    await manage(page, "archive"); await previewOperation(page); await confirmOperation(page);
    const archivedDocuments = await openDocuments(page, "contact");
    await expect(archivedDocuments.getByText("Documents en lecture seule dans l’état actuel du dossier.", { exact: true })).toBeVisible();
    await expect(archivedDocuments.getByRole("button", { name: "Ajouter un document", exact: true })).toHaveCount(0);
    await downloadFile(page, clean.name, clean.buffer);
  } finally { await testControl("worker-start"); await clearActorContext(page); await removeActor(manager); await removeActor(owner); await removeActor(outsider); }
});

test("SP09: interrupted network transfer and stopped worker recover without false success", async ({ page }) => {
  test.setTimeout(240000);
  const manager = await createActor("manager");
  try {
    await signIn(page, manager); await createProperty(page);
    const documents = await openDocuments(page, "inventory");
    const file = await syntheticFile("clean-document");
    const transferRoute = `https://localhost:${testPorts().api}/api/v1/transfers/**`;
    await page.route(transferRoute, route => route.abort("connectionfailed"));
    const uploader = await chooseDocument(page, file);
    await uploader.getByRole("button", { name: "Envoyer le fichier", exact: true }).click();
    await expect(uploader.getByRole("alert").filter({ hasText: "Transfert interrompu" })).toBeVisible();
    await page.unroute(transferRoute);
    await testControl("worker-stop");
    const publication = page.waitForResponse(response => response.request().method() === "PUT" && new URL(response.url()).pathname.startsWith("/api/v1/transfers/"));
    await uploader.getByRole("button", { name: "Réessayer", exact: true }).click();
    expect((await publication).status()).toBe(200);
    await expect(uploader).not.toBeVisible();
    const row = documents.getByRole("listitem").filter({ has: page.getByRole("heading", { name: file.name, exact: true }) });
    await expect(row.getByText("Vérification en attente", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(row.getByRole("button", { name: `Télécharger ${file.name}`, exact: true })).toBeDisabled();
    await testControl("worker-start");
    await expect(row.getByText("Fichier disponible", { exact: true })).toBeVisible({ timeout: 120_000 });
    await downloadFile(page, file.name, file.buffer);
    await row.getByRole("button", { name: `Archiver ${file.name}`, exact: true }).click();
    const confirmation = page.getByRole("alertdialog", { name: "Archiver cette pièce jointe ?", exact: true }); await expect(confirmation).toBeVisible();
    await confirmation.getByRole("button", { name: "Confirmer l’archivage", exact: true }).click();
    await expect(confirmation).not.toBeVisible(); await expect(row).not.toBeVisible();
    await expect(documents.getByText(/Aucune pièce jointe sur cette page/)).toBeVisible();
  } finally { await testControl("worker-start"); await clearActorContext(page); await removeActor(manager); }
});
