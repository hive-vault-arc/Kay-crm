import { test, expect, signIn, createActor, removeActor } from "../helpers/auth";
import { captureQualificationPair } from "../helpers/qualification-captures";

test("KAY lead qualification: selected calling code, profile edit and real project conversion", async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent");
  const name = "Client synthétique qualification";
  const errors: string[] = [];
  const failedRequests: { path: string; resource: string; cancelled: boolean }[] = [];
  page.on("requestfailed", request => {
    const address = new URL(request.url());
    const path = ["http:", "https:"].includes(address.protocol) ? address.pathname.replace(/[a-f0-9-]{36}/g, ":id") : "non-http";
    failedRequests.push({ path, resource: request.resourceType(), cancelled: /cancel|abort/i.test(request.failure()?.errorText ?? "") });
  });
  page.on("pageerror", error => {
    const react = error.message.match(/Minified React error #(\d+)/);
    const route = new URL(page.url()).pathname.replace(/[a-f0-9-]{36}/g, ":id");
    const text = `${error.name}:${error.message.startsWith("/") ? "/" : ""}${error.message}`;
    const fetchError = text.startsWith("Fetch API cannot load");
    let target = "unknown";
    const address = text.match(/https?:\/\/[^\s]+/)?.[0];
    if (address) {
      try { target = new URL(address).pathname.replace(/[a-f0-9-]{36}/g, ":id"); } catch { target = "unparseable"; }
    }
    const kind = fetchError ? "FETCH_TRANSPORT_ERROR" : ["Error", "TypeError", "ReferenceError", "SyntaxError", "RangeError", "AbortError"].includes(error.name) ? error.name : "OTHER_ERROR";
    errors.push(`APPLICATION_PAGE_ERROR:${kind}:${react?.[1] ?? "unclassified"}:${route}:${target}`);
  });
  try {
    await signIn(page, actor);
    await page.goto("/leads/new");
    await expect(page.getByRole("button", { name: "Créer le Lead", exact: true })).toBeEnabled();
    await page.getByLabel("Nom du contact", { exact: true }).fill(name);
    await page.getByLabel("Indicatif Téléphone 1 *", { exact: true }).selectOption("FR");
    await page.getByLabel("Téléphone 1 *", { exact: true }).fill("0600000002");
    await page.getByLabel("Pays de résidence", { exact: true }).selectOption("FR");
    await page.getByLabel("Nationalité (pays)", { exact: true }).selectOption("MA");
    await page.getByLabel("Langues parlées *", { exact: true }).selectOption("french");
    await page.getByLabel("Langues parlées *", { exact: true }).selectOption("english");
    await page.getByLabel("Budget *", { exact: true }).selectOption("500.000 DH - 1.000.000 DH");
    await page.getByLabel("Source du prospect", { exact: true }).selectOption("instagram_ads");
    await page.getByLabel("Qualification", { exact: true }).selectOption("warm");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await captureQualificationPair(page, "lead-create");
    await page.getByRole("button", { name: "Créer le Lead", exact: true }).click();
    await expect.poll(() => /^\/leads\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
    const eid = new URL(page.url()).pathname.split("/")[2];
    const first = await (await page.request.get(`/api/v1/enquiries/${eid}`)).json();
    expect(first.contact.primary_phone).toBe("+33600000002");
    expect(first.contact.country).toBe("FR"); expect(first.contact.nationality).toBe("MA");
    expect(first.contact.languages).toEqual(["french", "english"]);
    expect(first.campaign_source).toBe("instagram_ads");
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    await captureQualificationPair(page, "lead-detail");
    await page.goto("/leads");
    await expect(page.getByText("1 demande", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    await captureQualificationPair(page, "lead-list");
    await page.goto(`/leads/${eid}/edit`);
    await expect(page.getByLabel("Nom du contact", { exact: true })).toBeEnabled();
    await page.getByLabel("Nom du contact", { exact: true }).fill(`${name} modifié`);
    const phone = page.getByLabel("Téléphone 1 *", { exact: true });
    await phone.clear();
    await expect(page.getByLabel("Indicatif Téléphone 1 *", { exact: true })).toHaveValue("FR");
    await phone.fill("0600000004");
    await page.getByLabel("Qualification", { exact: true }).selectOption("hot");
    await captureQualificationPair(page, "lead-edit");
    await page.getByRole("button", { name: "Enregistrer le prospect", exact: true }).click();
    await expect(page.getByText("Prospect enregistré.", { exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    const edited = await (await page.request.get(`/api/v1/enquiries/${eid}`)).json();
    expect(edited.contact.name).toBe(`${name} modifié`);
    expect(edited.contact.primary_phone).toBe("+33600000004");
    expect(edited.version).toBe(2); expect(edited.contact.version).toBe(2);
    await page.goto(`/leads/${eid}`);
    const trigger = page.getByRole("button", { name: "Convertir en affaire", exact: true });
    await trigger.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("alertdialog", { name: "Convertir le prospect en affaire", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Programme *", { exact: true })).toBeEnabled();
    await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByLabel("Programme *", { exact: true })).toBeEnabled();
    await dialog.getByLabel("Type de projet", { exact: true }).selectOption("external");
    await dialog.getByLabel("Nom du projet externe *", { exact: true }).fill("Projet synthétique qualifié");
    await dialog.getByRole("button", { name: "Confirmer la conversion", exact: true }).click();
    await expect(dialog.getByText("Choisissez un projet, un budget et au moins un motif d’achat.", { exact: true })).toBeVisible();
    await dialog.getByRole("checkbox", { name: "Résidence principale", exact: true }).check();
    await expect(dialog.getByText("Choisissez un projet, un budget et au moins un motif d’achat.", { exact: true })).toHaveCount(0);
    await captureQualificationPair(page, "lead-conversion");
    await dialog.getByRole("button", { name: "Confirmer la conversion", exact: true }).click();
    await expect.poll(() => /^\/deals\/[a-f0-9-]{36}$/.test(new URL(page.url()).pathname)).toBe(true);
    const did = new URL(page.url()).pathname.split("/")[2];
    const deal = await (await page.request.get(`/api/v1/deals/${did}`)).json();
    expect(deal.projects[0].external_name).toBe("Projet synthétique qualifié");
    expect(deal.purchase_reasons).toEqual(["residence"]);
    expect(deal.client_snapshot.languages).toEqual(["french", "english"]);
    expect(deal.contact.id).toBe(first.contact.id);
    expect(deal.active_reservation).toBeNull();
    await expect(page.getByRole("heading", { name: deal.title, exact: true })).toBeVisible();
    await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    await page.goto(`/leads/${eid}`);
    await expect(page.getByRole("link", { name: "Ouvrir l’affaire", exact: true })).toBeVisible();
    expect((await (await page.request.get("/api/v1/enquiries")).json()).total).toBe(0);
    expect((await (await page.request.get("/api/v1/enquiries?status=converted")).json()).total).toBe(1);
    expect(errors, JSON.stringify({ failedRequests }, null, 2)).toEqual([]);
  } finally { await removeActor(actor); }
});
