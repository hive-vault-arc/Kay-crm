import { test, expect, clearActorContext } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { changeLeadFilters } from "../helpers/leads";
import { clearIntake, fillWebsite, intakeFixture, simulatorOrigin, staffLogin } from "../helpers/intake";

test("SP20 AT22/30: separate signed form, durable retry, worker restart and scoped received Lead", async ({ page, baseURL }) => {
  test.setTimeout(90000);
  const pageErrors: { name: string; uuid: boolean; hydration: boolean }[] = [];
  page.on("pageerror", error => pageErrors.push({ name: error.name, uuid: error.message.includes("randomUUID"), hydration: /hydrat/i.test(error.message) }));
  try {
    const data = await intakeFixture(page);
    await fillWebsite(page);
    console.info("SP22_INTAKE_CAPABILITIES", JSON.stringify(await page.evaluate(() => ({ secure: isSecureContext, uuid: typeof crypto.randomUUID, timeout: typeof AbortSignal.timeout }))));
    let body = "", replay = "", forwarded = 0, aborted = 0;
    await page.route(simulatorOrigin + "/submit", async route => { forwarded++; body = route.request().postData()!; const result = await route.fetch(); expect(result.status()).toBe(202); expect(Object.keys(await result.json()).sort()).toEqual(["receipt_id", "state"]); await route.abort("connectionfailed"); aborted++; });
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
    try { await expect(page.getByRole("alert").filter({ hasText: "n’a pas pu être confirmé" })).toBeVisible({ timeout: 15000 }); }
    catch (failure) {
      console.info("SP22_INTAKE_DIAGNOSTIC", JSON.stringify({ forwarded, aborted, pageErrors, path: new URL(page.url()).pathname, busy: await page.getByRole("status").count(), formValid: await page.locator("form").evaluateAll(forms => forms.every(form => (form as HTMLFormElement).checkValidity())) }));
      throw failure;
    }
    await expect(page.getByLabel("Nom complet", { exact: true })).toBeDisabled();
    await page.unroute(simulatorOrigin + "/submit");
    await page.route(simulatorOrigin + "/submit", async route => { replay = route.request().postData()!; await route.continue(); });
    await page.getByRole("button", { name: "Réessayer le même envoi", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("En attente de traitement"); expect(replay).toBe(body);
    const receipt = await page.locator("dd").innerText();
    expect(await page.context().cookies(simulatorOrigin)).toEqual([]);
    expect(await page.locator("body").innerText()).not.toContain("SP20 identité privée");
    expect(await page.locator("select,input").count()).toBe(0);
    await testControl("worker-start");
    await expect.poll(async () => { await page.getByRole("button", { name: "Actualiser le suivi", exact: true }).click(); return await page.getByRole("status").innerText(); }, { timeout: 15000 }).toBe("Demande traitée");
    await expect(page.locator("dd")).toHaveText(receipt);
    await page.getByRole("button", { name: "Nouvelle demande", exact: true }).click();
    await fillWebsite(page); await page.unroute(simulatorOrigin + "/submit");
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Reçu de la demande", exact: true })).toBeVisible();
    await staffLogin(page, data.agent, baseURL!); await page.goto("/leads");
    await changeLeadFilters(page, async panel => {
      await panel.getByText("Filtres avancés", { exact: true }).click();
      await panel.getByText("Provenance", { exact: true }).first().click();
      await panel.getByLabel("Provenance", { exact: true }).selectOption("website");
    });
    await expect(page.getByRole("status").filter({ hasText: "2 demandes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "SP20 identité privée synthétique", exact: true })).toHaveCount(2);
    const rows = (await (await page.request.get("/api/v1/enquiries?source=website")).json()).items;
    expect(rows[0].contact.id).toBe(rows[1].contact.id); expect(rows[0].contact.name).toBe("SP20 identité privée synthétique"); expect(rows.every((r: { created_by_user_id: unknown }) => r.created_by_user_id === null)).toBe(true);
    await page.goto(`/contacts/${rows[0].contact.id}?tab=timeline`);
    await clearActorContext(page); await staffLogin(page, data.other, baseURL!); await page.goto("/leads");
    await expect(page.getByText("0 demande", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    expect((await page.request.get(`/api/v1/enquiries/${rows[0].id}`)).status()).toBe(404);
    await clearActorContext(page); await staffLogin(page, data.manager, baseURL!); await page.goto(`/leads/${rows[0].id}`);
    await expect(page.getByText("SP20 nouvelle demande web synthétique", { exact: true })).toBeVisible();
  } finally { try { await clearActorContext(page); } finally { await clearIntake(); } }
});
