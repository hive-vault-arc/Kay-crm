import { mkdir } from "node:fs/promises";
import { test, expect, clearActorContext, createActor, removeActor, signIn } from "../helpers/auth";
import { testControl } from "../helpers/api-process";

test("holiday confirmation and unread correction reach staff inbox across sessions", async ({ browser, page, actor }) => {
  test.skip(process.env.HOLIDAYS_ENABLED !== "true", "Requires the isolated holiday feature flag");
  test.setTimeout(120_000);
  const member = await createActor("agent");
  const phone = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, ignoreHTTPSErrors: true,
  });
  const staff = await phone.newPage();
  const capture = "output/playwright/holiday-reminders";
  try {
    const fixture = await testControl("fixture", { action: "holiday-demo" }) as { date: string; processed: number };
    expect(fixture.processed).toBe(2);
    await signIn(page, actor);
    await signIn(staff, member);
    await expect(page.locator('[data-realtime-status="connected"]')).toBeAttached();
    await expect(staff.locator('[data-realtime-status="connected"]')).toBeAttached();

    await staff.getByRole("button", { name: "Ouvrir les notifications", exact: true }).click();
    await expect(staff.getByText("Date prévisionnelle", { exact: false })).toBeVisible();
    await staff.getByRole("dialog", { name: "Notifications", exact: true }).getByRole("button", { name: /^Tout voir/ }).click();
    const inbox = staff.getByRole("region", { name: "Notifications internes" });
    const reminder = inbox.getByRole("article").filter({ hasText: "Aïd de contrôle" });
    await expect(reminder).toContainText("Date prévisionnelle");
    await reminder.getByRole("button", { name: "Marquer comme lue" }).click();
    await expect(reminder).toContainText("Lue");

    await page.goto("/settings");
    await page.getByRole("link", { name: "Jours fériés", exact: true }).click();
    const holiday = page.getByRole("article").filter({ hasText: "Aïd de contrôle" });
    await expect(holiday).toContainText("Date prévisionnelle");
    await mkdir(capture, { recursive: true });
    await page.screenshot({ path: `${capture}/settings.png` });
    await holiday.getByRole("button", { name: "Confirmer · Aïd de contrôle" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirmer la date officielle" });
    await expect(dialog.getByLabel("Premier jour")).toHaveValue(fixture.date);
    await dialog.getByLabel("Premier jour").fill(fixture.date.replace(/18$/, "19"));
    await dialog.getByLabel("Dernier jour (facultatif)").fill(fixture.date.replace(/18$/, "20"));
    await dialog.getByLabel("Lien du communiqué officiel").fill("https://habous.gov.ma/fr/annonce-synthetique");
    await dialog.getByRole("button", { name: "Enregistrer la date" }).click();
    await expect(dialog).toBeHidden();
    await expect(holiday).toContainText("Confirmée par l’administration");

    await expect(reminder).toContainText("Date corrigée", { timeout: 20_000 });
    await expect(reminder).not.toContainText("Date prévisionnelle");
    await expect(reminder.getByRole("button", { name: "Marquer comme lue" })).toBeVisible();
    await expect(reminder.getByRole("link")).toHaveCount(0);
    await expect(inbox.getByText("1 non lue(s)", { exact: true })).toBeVisible();
    expect(await staff.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await staff.screenshot({ path: `${capture}/inbox-mobile.png` });
    await staff.goto("/settings/holidays");
    await expect(staff.getByRole("heading", { name: "Accès non autorisé" })).toBeVisible();
    expect((await staff.request.get("/api/v1/work/holidays")).status()).toBe(403);
  } finally {
    await phone.close();
    await clearActorContext(page);
    await removeActor(member);
  }
});
