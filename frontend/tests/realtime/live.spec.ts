import { test, expect, signIn, clearActorContext, createActor, removeActor } from "../helpers/auth";
import { createLead, staffCommand } from "../helpers/leads";
import { createTaskApi } from "../helpers/work";
import { apiProcess } from "../helpers/api-process";
import { dealBody } from "../helpers/deals";

test("live Lead detail/list refresh and protected draft over real WSS", async ({ page }) => {
  test.setTimeout(150_000);
  const actor = await createActor("agent");
  try {
  await signIn(page, actor, "/leads");
  const id = await createLead(page, "Prospect synthétique temps réel", "+212600004239");
  await expect(page.locator('[data-realtime-status="connected"]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute("data-live-refresh", "automatic");
  await expect(page.locator('button[data-live-refresh="true"]:visible')).toHaveCount(0);
  const other = await page.context().newPage();
  await other.goto(`/leads/${id}`);
  await page.bringToFront();
  async function update(message: string) {
    const current = await (await page.request.get(`/api/v1/enquiries/${id}`)).json();
    const result = await staffCommand(other, `enquiries/${id}`, {
      expected_version: current.version, message, status: current.status,
      initial_budget: current.initial_budget, campaign_source: current.campaign_source,
      rating: current.rating,
    }, "PATCH");
    expect(result.status()).toBe(200);
  }
  await update("Note synthétique reçue automatiquement");
  await expect(page.getByText("Note synthétique reçue automatiquement", { exact: true })).toBeVisible();
  await apiProcess("stop");
  await expect(page.locator('[data-realtime-status="offline"]')).toHaveCount(1);
  await expect(page.locator('html')).not.toHaveAttribute("data-live-refresh", "automatic");
  await apiProcess("start");
  await expect(page.locator('[data-realtime-status="connected"]')).toHaveCount(1);
  await update("Note synthétique après reconnexion");
  await expect(page.getByText("Note synthétique après reconnexion", { exact: true })).toBeVisible();
  await page.goto(`/leads/${id}/edit`);
  const draft = page.locator("textarea").first();
  await draft.fill("Brouillon synthétique à conserver");
  await update("Modification synthétique concurrente");
  await expect(page.getByText("Des données ont changé. Votre saisie est conservée pendant la modification.", { exact: false })).toBeVisible();
  await expect(draft).toHaveValue("Brouillon synthétique à conserver");
  await page.goto("/leads");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-realtime-status="connected"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "output/playwright/realtime-mobile.png", animations: "disabled" });
  await other.close();
  await clearActorContext(page);
  } finally {
    await clearActorContext(page);
    await removeActor(actor);
  }
});

test("authenticated consultation routes retain live delivery on desktop and mobile", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("response", response => {
    if (new URL(response.url()).pathname === "/api/v1/realtime/tickets" && response.status() !== 200)
      console.log("Realtime ticket HTTP status", response.status());
  });
  const agent = await createActor("agent"), admin = await createActor("administrator");
  try {
    await signIn(page, agent, "/leads");
    const lid = await createLead(page, "Dossier synthétique de navigation", "+212600004241");
    const lead = await (await page.request.get(`/api/v1/enquiries/${lid}`)).json();
    const response = await staffCommand(page, "deals", dealBody(lead.contact.id));
    expect(response.status()).toBe(200);
    const did = (await response.json()).id;
    await clearActorContext(page); await signIn(page, admin);
    const routes = ["/dashboard", "/dashboard?view=audit", "/leads", `/leads/${lid}`,
      "/deals", `/deals/${did}`, `/deals/${did}?tab=finance`, `/contacts/${lead.contact.id}`,
      "/visits", "/projects", `/leads/${lid}/documents`, "/leads?view=import",
      "/notifications", "/settings/users", "/settings/working-hours"];
    for (const [index, route] of routes.entries()) {
      await page.setViewportSize(index % 2 ? { width: 390, height: 844 } : { width: 1440, height: 900 });
      await page.goto(route);
      await expect(page.locator('[data-realtime-status="connected"]'), `Live route ${route}`).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 900 }); await page.goto("/notifications");
    await expect(page.locator('[data-realtime-status="connected"]')).toHaveCount(1);
    await page.screenshot({ path: "output/playwright/realtime-desktop.png", animations: "disabled" });
  } finally {
    await clearActorContext(page); await removeActor(agent); await removeActor(admin);
  }
});

test("browser push requires opt-in, delivers a generic alert and can be disabled", async ({ playwright, baseURL }) => {
  test.setTimeout(240_000);
  // Chrome does not support PushManager in the usual incognito test context.
  const context = await playwright.chromium.launchPersistentContext("", {
    channel: "chrome", headless: false, ignoreHTTPSErrors: true, baseURL,
    locale: "fr-FR", timezoneId: "Africa/Casablanca",
    ignoreDefaultArgs: ["--disable-background-networking"],
  });
  const page = await context.newPage();
  const actor = await createActor("agent");
  try {
    await page.context().grantPermissions(["notifications"]);
    await signIn(page, actor, "/leads");
    await page.goto("/notifications");
    const enable = page.getByRole("button", { name: "Activer les notifications système", exact: true });
    await expect(enable).toBeEnabled({ timeout: 30_000 });
    expect((await (await page.request.get("/api/v1/realtime/push")).json()).subscribed).toBe(false);
    await page.evaluate(() => {
      const original = PushManager.prototype.subscribe;
      PushManager.prototype.subscribe = async function(options) {
        try { return await original.call(this, options); }
        catch (error) {
          document.documentElement.dataset.pushFailure = error instanceof DOMException ? error.name : "unknown";
          throw error;
        }
      };
    });
    await enable.click();
    const disable = page.getByRole("button", { name: "Désactiver les notifications système", exact: true });
    try { await expect(disable).toBeEnabled({ timeout: 45_000 }); }
    catch (error) {
      console.log("Push diagnostic:", await page.evaluate(() => ({
        browserError: document.documentElement.dataset.pushFailure ?? "none",
        permission: Notification.permission,
        notices: Array.from(document.querySelectorAll('[role="status"]')).map(el => el.textContent),
      })));
      throw error;
    }
    expect((await (await page.request.get("/api/v1/realtime/push")).json()).subscribed).toBe(true);
    const lid = await createLead(page, "Contact synthétique push", "+212600004240");
    const lead = await (await page.request.get(`/api/v1/enquiries/${lid}`)).json();
    const clock = await (await page.request.get("/api/v1/work/context")).json();
    const due = new Date(Date.parse(clock.now) - 60_000); due.setUTCSeconds(0, 0);
    await createTaskApi(page, actor.id, lead.contact.id, due);
    await expect.poll(async () => (await (await page.request.get("/api/v1/notifications")).json()).total).toBe(1);
    // Leave the CRM entirely; the worker must deliver after the presence window.
    await page.goto("/manifest.webmanifest");
    await expect.poll(() => page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (await registration.getNotifications()).map(item => item.title);
    }), { timeout: 150_000, intervals: [2000] }).toEqual(["Nouvelle notification KAY"]);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      (await registration.getNotifications()).forEach(item => item.close());
    });
    await page.goto("/notifications");
    await expect(disable).toBeEnabled();
    await disable.focus(); await page.keyboard.press("Enter");
    await expect(enable).toBeEnabled();
    expect((await (await page.request.get("/api/v1/realtime/push")).json()).subscribed).toBe(false);
  } finally { await clearActorContext(page); await removeActor(actor); await context.close(); }
});
