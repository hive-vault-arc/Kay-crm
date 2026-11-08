import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { clearActorContext, test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { confirmOperation, contactActivity, contactAssignments, contribute, manage, openContact, previewOperation } from "../helpers/ownership";
import { apiProcess } from "../helpers/api-process";

test("SP06 AT-05: collaborator contributes, transfer denies former session, queue recovered", async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000);
  const a = await createActor("agent", false, "SP06 Agent A synthétique");
  const b = await createActor("agent", false, "SP06 Agent B synthétique");
  const manager = await createActor("manager", false, "SP06 Responsable synthétique");
  const other = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const managerContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const bPage = await other.newPage();
  const managerPage = await managerContext.newPage();
  try {
    await signIn(page, a);
    const enquiryId = await createLead(page, "SP06 identité partagée synthétique");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${enquiryId}`)).json()).contact;
    await openContact(page, contact.id);
    await signIn(managerPage, manager);
    await openContact(managerPage, contact.id);
    await manage(managerPage, "collaborators");
    await managerPage.getByLabel("Collaborateur à ajouter", { exact: true }).selectOption(b.id);
    await managerPage.getByRole("button", { name: "Ajouter le collaborateur", exact: true }).click();
    await previewOperation(managerPage); await confirmOperation(managerPage);
    await signIn(bPage, b); await openContact(bPage, contact.id);
    await contribute(bPage); await contribute(bPage, "SP06 appel synthétique de B", "call");
    await manage(managerPage, "assign");
    await managerPage.getByLabel("Nouveau responsable", { exact: true }).selectOption(b.id);
    await previewOperation(managerPage);
    await expect(managerPage.getByRole("alertdialog").getByText(/^Responsable : SP06 Agent A synthétique · Version \d+$/)).toBeVisible();
    await expect(managerPage.getByRole("alertdialog").locator("dt").filter({ hasText: "Responsable après l’opération" }).locator("..").locator("dd")).toHaveText("SP06 Agent B synthétique");
    await confirmOperation(managerPage);
    await page.reload();
    await expect(page.getByText("Cette fiche est introuvable ou vous n’y avez plus accès.", { exact: true })).toBeVisible();
    for (const route of [`contacts/${contact.id}`, `contacts/${contact.id}/timeline`, `enquiries/${enquiryId}`]) expect((await page.request.get(`/api/v1/${route}`)).status()).toBe(404);
    await bPage.reload();
    const activity = await contactActivity(bPage);
    await expect(activity.getByText("SP06 contribution synthétique de B", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(activity.getByRole("cell", { name: "SP06 Agent A synthétique", exact: true }).first()).toBeVisible();
    await expect(activity.getByRole("cell", { name: "SP06 Agent B synthétique", exact: true }).first()).toBeVisible();
    await contactAssignments(bPage);
    await expect(bPage.getByText("Avant : SP06 Agent A synthétique · Après : SP06 Agent B synthétique", { exact: true })).toBeVisible();
    expect((await bPage.request.get(`/api/v1/enquiries/${enquiryId}`)).status()).toBe(404);
    await managerPage.goto(`/leads/${enquiryId}`);
    await managerPage.getByRole("button", { name: "Attribuer le prospect", exact: true }).click();
    const assignment = managerPage.getByRole("dialog", { name: "Attribuer le prospect", exact: true });
    await expect(assignment.getByLabel("Attribuer à un agent du contact", { exact: true })).toBeEnabled();
    await assignment.getByLabel("Attribuer à un agent du contact", { exact: true }).selectOption(b.id);
    await assignment.getByLabel("Motif de l’attribution", { exact: true }).fill("SP06 reprise synthétique par le nouveau responsable");
    await assignment.getByRole("button", { name: "Attribuer cette demande", exact: true }).click();
    await expect(managerPage.getByText("Attribution enregistrée.", { exact: true })).toBeVisible();
    expect((await bPage.request.get(`/api/v1/enquiries/${enquiryId}`)).status()).toBe(200);
  } finally {
    await other.close(); await managerContext.close();
    await removeActor(a); await removeActor(b); await removeActor(manager);
  }
});

test("SP06 AT-23: note lost acknowledgement retries once, history outage recovers draft", async ({ page }) => {
  test.setTimeout(100_000);
  const a = await createActor("agent");
  let stopped = false;
  try {
    await signIn(page, a); const lead = await createLead(page);
    const contact = (await (await page.request.get(`/api/v1/enquiries/${lead}`)).json()).contact;
    await openContact(page, contact.id);
    const activity = await contactAssignments(page);
    await expect(page.getByText("Aucun changement d’attribution enregistré.", { exact: true })).toBeVisible();
    await activity.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Ajouter une activité", exact: true });
    await drawer.getByLabel("Texte de l’entrée", { exact: true }).fill("SP06 entrée à accusé interrompu");
    await page.route(`**/api/v1/contacts/${contact.id}/notes`, async route => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
    await drawer.getByRole("button", { name: "Enregistrer l’entrée", exact: true }).click();
    await expect(drawer.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
    await expect(drawer.getByLabel("Texte de l’entrée", { exact: true })).toHaveValue("SP06 entrée à accusé interrompu");
    await expect(drawer.getByLabel("Texte de l’entrée", { exact: true })).toBeDisabled();
    await drawer.getByRole("button", { name: "Réessayer la même opération", exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByText("Entrée enregistrée, avec son auteur.", { exact: true })).toBeVisible();
    const timeline = await (await page.request.get(`/api/v1/contacts/${contact.id}/timeline`)).json();
    expect(timeline.items.filter((value: { body: string }) => value.body === "SP06 entrée à accusé interrompu")).toHaveLength(1);
    await activity.getByRole("button", { name: "Ajouter une activité", exact: true }).click();
    await drawer.getByLabel("Texte de l’entrée", { exact: true }).fill("SP06 brouillon conservé pendant la panne");
    await apiProcess("stop"); stopped = true;
    await drawer.getByRole("button", { name: "Enregistrer l’entrée", exact: true }).click();
    await expect(drawer.getByRole("alert").filter({ hasText: "Le service local est indisponible" })).toBeVisible();
    await expect(drawer.getByLabel("Texte de l’entrée", { exact: true })).toHaveValue("SP06 brouillon conservé pendant la panne");
    await apiProcess("start"); stopped = false;
    await expect.poll(async () => (await page.request.get("/api/v1/health/ready")).status()).toBe(200);
    await drawer.getByRole("button", { name: "Enregistrer l’entrée", exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.getByText("Entrée enregistrée, avec son auteur.", { exact: true })).toBeVisible();
  } finally { if (stopped) await apiProcess("start"); await removeActor(a); }
});

test("SP06 AT-24: archive/restore keeps relationships and historical authors", async ({ page, browser, baseURL }) => {
  test.setTimeout(100_000);
  const a = await createActor("agent", false, "SP06 Auteur synthétique");
  const manager = await createActor("manager", false, "SP06 Responsable synthétique");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const managerPage = await context.newPage();
  try {
    await signIn(page, a);
    const enquiryId = await createLead(page, "SP06 contact à conserver");
    const contact = (await (await page.request.get(`/api/v1/enquiries/${enquiryId}`)).json()).contact;
    await openContact(page, contact.id); await contribute(page, "SP06 note antérieure à l’archivage");
    await signIn(managerPage, manager); await openContact(managerPage, contact.id);
    await manage(managerPage, "archive"); await previewOperation(managerPage); await confirmOperation(managerPage);
    await expect(managerPage.getByText("Contact archivé. Restaurez-le pour reprendre les modifications.", { exact: true })).toBeVisible();
    await page.reload(); await expect(page.getByText("Cette fiche est introuvable ou vous n’y avez plus accès.", { exact: true })).toBeVisible();
    await managerPage.goto("/leads?view=contacts");
    const filters = managerPage.locator('[data-filter-panel="desktop"]');
    await filters.getByLabel("Archivage", { exact: true }).selectOption("archived");
    await filters.getByRole("button", { name: "Appliquer", exact: true }).click();
    await managerPage.getByRole("link", { name: "SP06 contact à conserver", exact: true }).click();
    await expect(managerPage.getByRole("tab", { name: "Aperçu", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(managerPage.getByRole("heading", { name: "Prospects · 1", exact: true })).toBeVisible();
    const history = await contactActivity(managerPage);
    await expect(history.getByText("SP06 note antérieure à l’archivage", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(history.getByRole("cell", { name: "SP06 Auteur synthétique", exact: true }).first()).toBeVisible();
    await manage(managerPage, "restore"); await previewOperation(managerPage); await confirmOperation(managerPage);
    await page.reload(); await expect(page.getByRole("button", { name: "Modifier", exact: true })).toBeVisible();
    expect((await page.request.get(`/api/v1/enquiries/${enquiryId}`)).status()).toBe(200);
  } finally { await context.close(); await removeActor(a); await removeActor(manager); }
});

test("SP06 AT-04: same-scope merge confirmation, private denial and stable source links", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const a = await createActor("agent");
  const b = await createActor("agent");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const privatePage = await context.newPage();
  try {
    await signIn(page, a);
    const first = await createLead(page, "SP06 source synthétique");
    const second = await createLead(page, "SP06 fiche conservée synthétique", "+33600000002");
    const source = (await (await page.request.get(`/api/v1/enquiries/${first}`)).json()).contact;
    const survivor = (await (await page.request.get(`/api/v1/enquiries/${second}`)).json()).contact;
    await signIn(privatePage, b);
    const denied = await staffCommand(privatePage, `contacts/${source.id}/preview`, { operation: "merge", expected_version: 1, survivor_id: survivor.id, survivor_expected_version: 1, reason: "SP06 refus synthétique" });
    expect(denied.status()).toBe(404);
    await openContact(page, source.id); await contribute(page, "SP06 note avec origine conservée");
    await manage(page, "merge");
    await page.getByRole("button", { name: "Choisir SP06 fiche conservée synthétique", exact: true }).click();
    await page.getByLabel("Motif de l’opération", { exact: true }).fill("SP06 doublon synthétique confirmé");
    await previewOperation(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Vérifier l’impact", exact: true })).toBeFocused();
    expect((await (await page.request.get(`/api/v1/contacts/${source.id}`)).json()).id).toBe(source.id);
    await previewOperation(page); await confirmOperation(page);
    await expect(page.getByText(/Cette fiche a été fusionnée/)).toBeVisible();
    const history = await contactActivity(page);
    await expect(history.getByText("SP06 note avec origine conservée", { exact: true }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByText(`Contact d’origine : ${source.id}`, { exact: true }).first()).toBeVisible();
    const moved = await (await page.request.get(`/api/v1/enquiries/${first}`)).json();
    expect(moved.contact.id).toBe(survivor.id); expect(moved.origin_contact_id).toBe(source.id);
    const rejected = await staffCommand(page, `contacts/${survivor.id}/notes`, { body: "SP06 injection synthétique", actor_user_id: b.id });
    expect(rejected.status()).toBe(422);
  } finally { await context.close(); await removeActor(a); await removeActor(b); }
});

test("SP06 AT-04/05: manager cross-portfolio merge, stale preview recovery and removal", async ({ page, browser, baseURL }, testInfo) => {
  test.setTimeout(150_000);
  const longName = `SP06 ${"Collaborateur".repeat(10)}`;
  const a = await createActor("agent", false, longName);
  const b = await createActor("agent");
  const manager = await createActor("manager");
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  const other = await context.newPage();
  try {
    await signIn(page, a); const first = await createLead(page, "SP06 portefeuille source");
    const source = (await (await page.request.get(`/api/v1/enquiries/${first}`)).json()).contact;
    await signIn(other, b); const second = await createLead(other, "SP06 portefeuille conservé", "+33600000002");
    const survivor = (await (await other.request.get(`/api/v1/enquiries/${second}`)).json()).contact;
    const denied = await staffCommand(page, `contacts/${source.id}/preview`, { operation: "merge", expected_version: 1, survivor_id: survivor.id, survivor_expected_version: 1, reason: "SP06 refus inter-portefeuilles" });
    expect(denied.status()).toBe(404);
    await clearActorContext(page); await signIn(page, manager); await openContact(page, source.id);
    await manage(page, "merge");
    await page.getByRole("button", { name: "Choisir SP06 portefeuille conservé", exact: true }).click();
    await previewOperation(page);
    // Add a real linked enquiry while confirmation is open: no mock success.
    const newLink = await staffCommand(other, "enquiries", { contact_id: survivor.id, initial_budget: "500000", message: "SP06 lien ajouté après aperçu", source: "manual" }, "POST", randomUUID());
    expect(newLink.status()).toBe(200);
    await page.getByRole("button", { name: "Confirmer l’opération", exact: true }).click();
    await expect(page.getByText(/Les liens ou les droits ont changé depuis l’aperçu/)).toBeVisible();
    await page.getByRole("button", { name: "Revoir ma saisie", exact: true }).click();
    await expect(page.getByLabel("Motif de l’opération", { exact: true })).toHaveValue("SP06 décision synthétique de contrôle");
    await previewOperation(page); await confirmOperation(page);
    expect((await (await page.request.get(`/api/v1/contacts/${source.id}`)).json()).id).toBe(survivor.id);
    await manage(page, "collaborators");
    await page.getByLabel("Collaborateur à ajouter", { exact: true }).selectOption(a.id);
    await page.getByRole("button", { name: "Ajouter le collaborateur", exact: true }).click();
    const desktop = page.viewportSize();
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const remove = await page.getByRole("button", { name: `Retirer ${longName}`, exact: true }).boundingBox();
      expect(remove !== null && remove.x >= 16 && remove.x + remove.width <= width - 16).toBe(true);
      expect(remove?.height).toBeGreaterThanOrEqual(44);
    }
    if (testInfo.project.use.headless === false) {
      await mkdir("output/playwright", { recursive: true });
      await page.screenshot({ path: "output/playwright/sp06-collaborator-long-mobile.png", fullPage: true });
    }
    if (desktop) await page.setViewportSize(desktop);
    await previewOperation(page); await confirmOperation(page);
    await manage(page, "collaborators");
    await page.getByRole("button", { name: `Retirer ${longName}`, exact: true }).click();
    await previewOperation(page); await confirmOperation(page);
    await clearActorContext(other); await signIn(other, a); await other.goto(`/contacts/${survivor.id}`);
    await expect(other.getByText("Cette fiche est introuvable ou vous n’y avez plus accès.", { exact: true })).toBeVisible();
  } finally { await context.close(); await removeActor(a); await removeActor(b); await removeActor(manager); }
});
