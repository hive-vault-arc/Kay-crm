import { test, expect, signIn, clearActorContext, removeActor, type TestActor } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { createTaskApi, runReminders, workFixture } from "../helpers/work";

// Prepared for the isolated real stack. Source/unit checks do not execute this journey.
test("selected notification inbox: compact preview, exact recovery, full list and native touch", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000); const actors: TestActor[] = [], errors: string[] = [];
  const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" }), mobile = await touch.newPage();
  page.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR")); mobile.on("pageerror", () => errors.push("APPLICATION_PAGE_ERROR"));
  try {
    const { agent, contactId, now } = await workFixture(page, actors), due = new Date(now.getTime() + 20 * 60_000);
    for (let index = 0; index < 11; index++) await createTaskApi(page, agent.id, contactId, due, { title: `Notification synthétique ${index} · suivi du dossier et prochaines étapes` });
    expect((await runReminders(due)).processed).toBe(11); await page.goto("/dashboard");
    const trigger = page.getByRole("button", { name: "Ouvrir les notifications", exact: true }); await trigger.focus(); await page.keyboard.press("Enter");
    const popup = page.locator('.kay-notification-popover[role="dialog"]'); await expect(popup).toBeVisible(); await expect(popup.getByRole("heading", { name: "Notifications", exact: true })).toBeFocused(); await expect(page.locator('.kay-record-drawer')).toHaveCount(0); await expect(popup.locator(".kay-notification-preview-entry")).toHaveCount(10); await expect(popup.getByRole("button", { name: "Tout voir · 11", exact: true })).toBeVisible();
    for (const width of [320, 360, 390, 830, 1440]) {
      await page.setViewportSize({ width, height: 900 }); const box = await popup.boundingBox(); expect(box).not.toBeNull(); expect(box!.width).toBeLessThanOrEqual(Math.min(360, width - 24) + 1); expect(box!.x).toBeGreaterThanOrEqual(11); expect(box!.x + box!.width).toBeLessThanOrEqual(width - 11); await expect.poll(() => popup.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
    await popup.getByRole("group", { name: "Notifications affichées", exact: true }).getByRole("button", { name: "Non lues", exact: true }).click();
    const current = await (await page.request.get("/api/v1/notifications?state=unread&page=1&page_size=10")).json(), first = current.items[0] as { id: string; title: string }; let interrupt = true; const keys: (string | undefined)[] = [];
    await page.route(`**/api/v1/notifications/${first.id}/read`, async route => {
      keys.push(route.request().headers()["idempotency-key"]); if (!interrupt) return route.continue(); interrupt = false; const response = await route.fetch(); expect(response.status()).toBe(200); await route.abort("connectionfailed");
    });
    await popup.getByRole("button", { name: `Marquer comme lue · ${first.title}`, exact: true }).click(); await expect(popup.getByRole("button", { name: "Réessayer le marquage", exact: true })).toBeVisible(); const afterLost = await (await page.request.get("/api/v1/notifications?state=read&page=1&page_size=20")).json(); expect(afterLost.items.some((row: { id: string }) => row.id === first.id)).toBe(true);
    await popup.getByRole("button", { name: "Réessayer le marquage", exact: true }).click(); await expect(popup.locator(".kay-notification-preview-entry")).toHaveCount(10); await expect(popup.getByRole("group", { name: "Notifications affichées", exact: true }).getByRole("button", { name: "Non lues", exact: true })).toBeFocused(); expect(keys).toHaveLength(2); expect(keys[0]).toBeTruthy(); expect(keys[1]).toBe(keys[0]); await page.unroute(`**/api/v1/notifications/${first.id}/read`);
    const afterRetry = await (await page.request.get("/api/v1/notifications?state=read&page=1&page_size=20")).json(); expect(afterRetry.items.find((row: { id: string }) => row.id === first.id).read_at).toBe(afterLost.items.find((row: { id: string }) => row.id === first.id).read_at);
    await expect(trigger.getByRole("status", { name: "10 notifications non lues", exact: true })).toBeVisible(); await popup.getByRole("button", { name: "Tout voir · 10", exact: true }).click(); const full = page.locator('.kay-record-drawer[role="dialog"]'); await expect(full).toBeVisible(); await expect(full.getByRole("group", { name: "Notifications affichées", exact: true }).getByRole("button", { name: "Non lues", exact: true })).toHaveAttribute("aria-pressed", "true"); await expect(full.locator(".kay-record-entry")).toHaveCount(10); await expect(full.getByRole("table")).toHaveCount(0); await full.getByRole("button", { name: "Fermer : Notifications", exact: true }).click(); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(popup).toBeVisible(); await page.keyboard.press("Escape"); await expect(popup).toBeHidden(); await expect(trigger).toBeFocused();
    await signIn(mobile, agent); await mobile.goto("/dashboard"); const mobileTrigger = mobile.getByRole("button", { name: "Ouvrir les notifications", exact: true }); await mobileTrigger.tap(); const mobilePopup = mobile.locator('.kay-notification-popover[role="dialog"]'); await expect(mobilePopup).toBeVisible(); await expect(mobilePopup.locator(".kay-notification-preview-entry")).toHaveCount(10); await mobilePopup.getByRole("button", { name: "Lues", exact: true }).tap(); await expect(mobilePopup.locator(".kay-notification-preview-entry")).toHaveCount(1); await expect(mobilePopup.locator(".kay-notification-read-state")).toHaveText("Lue"); await mobilePopup.getByRole("button", { name: "Tout voir · 1", exact: true }).tap(); await expect(mobile.locator('.kay-record-drawer[role="dialog"]')).toBeVisible(); await mobile.getByRole("button", { name: "Fermer : Notifications", exact: true }).tap(); await expect(mobileTrigger).toBeFocused(); expect(errors).toEqual([]);
  } finally {
    await clearActorContext(mobile); await touch.close(); await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor);
  }
});
