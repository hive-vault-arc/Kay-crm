import { mkdir, writeFile } from "node:fs/promises";
import { test, expect, signIn, createActor, removeActor, clearActorContext } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { fillDeal, saveDeal } from "../helpers/deals";
import { createDevelopment, createBlock, createFloor, createType, createUnit } from "../helpers/developments";
import { geometry } from "../helpers/report-review";
import { restoredJourney } from "../helpers/recovery";

test.use({ hasTouch: true });

test("SP22 visible final families: real French controls, touch, keyboard and reduced motion", async ({ page, actor }) => {
  test.setTimeout(180000);
  const agent = await createActor("agent");
  try {
  await mkdir("output/playwright", { recursive: true });
  const errors: string[] = [], measurements: unknown[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
  async function capture(name: string) {
    await expect(page.getByText(/à venir|sera ajoutée|seront disponibles/)).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    expect(await page.locator('input[type="password"], [data-private-credential]').evaluateAll(fields => fields.every(field => !(field as HTMLInputElement).value))).toBe(true);
    const cdp = await page.context().newCDPSession(page);
    try {
      await page.evaluate(() => scrollTo(0, 0));
      const bounds = await page.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight }));
      const image = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true, clip: { x: 0, y: 0, ...bounds, scale: 1 } });
      await writeFile(`output/playwright/sp22-${name}.png`, Buffer.from(image.data, "base64"));
    } finally { await cdp.detach(); }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/login"); await capture("login-desktop");
  await signIn(page, actor);
  await capture("dashboard-empty-desktop");
  await page.goto("/settings/users"); await expect(page.getByRole("table")).toBeVisible();
  await capture("users-desktop");
  await page.goto("/settings/users/new"); await expect(page.getByLabel("Nom complet", { exact: true })).toBeEnabled();
  await capture("staff-form-desktop");
  await clearActorContext(page); await signIn(page, agent);
  await page.goto("/leads/new"); await expect(page.getByLabel("Nom du contact", { exact: true })).toBeEnabled();
  await capture("lead-form-desktop");
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); measurements.push(await geometry(page));
  }
  await page.setViewportSize({ width: 390, height: 844 }); await capture("lead-form-mobile");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).tap();
  const nav = page.getByRole("dialog", { name: "Navigation KAY", exact: true });
  await expect(nav).toBeVisible(); await capture("navigation-mobile");
  await nav.getByRole("link", { name: "Prospects", exact: true }).focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Prospects", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const lead = await createLead(page, "SP22 revue synthétique");
  await capture("lead-detail-desktop");
  await page.getByRole("link", { name: "Créer une affaire", exact: true }).click();
  await expect(page.getByRole("form", { name: "Nouvelle affaire", exact: true })).toBeVisible();
  await capture("deal-form-desktop");
  await fillDeal(page, "SP22 affaire de revue synthétique"); await saveDeal(page);
  await capture("deal-detail-desktop");
  await page.goto("/deals"); await expect(page.getByRole("link", { name: "SP22 affaire de revue synthétique", exact: true })).toBeVisible();
  await capture("deals-list-desktop");
  await page.goto("/leads"); await expect(page.getByRole("link", { name: "SP22 revue synthétique", exact: true })).toBeVisible();
  await capture("leads-list-desktop");
  await clearActorContext(page); await signIn(page, actor);
  const development = await createDevelopment(page);
  await createBlock(page); await createFloor(page); await createType(page); await createUnit(page, development.id);
  await capture("unit-detail-desktop");
  await page.goto(`/projects/${development.id}`); await expect(page.getByRole("tab", { name: "Aperçu", exact: true })).toBeEnabled();
  await capture("project-detail-desktop");
  await page.goto("/projects"); await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
  await expect(page.locator(`a[href="/projects/${development.id}"]`).first()).toBeVisible();
  await capture("projects-list-desktop");
  await page.goto("/visits"); await expect(page.getByRole("heading", { level: 1, name: "Calendrier des visites", exact: true })).toBeVisible();
  await capture("calendar-empty-desktop");
  await page.setViewportSize({ width: 390, height: 844 }); await capture("calendar-empty-mobile");
  await page.goto(`/leads/${lead}`); await expect(page.getByRole("link", { name: "SP22 revue synthétique", exact: true })).toBeVisible();
  measurements.push(await geometry(page)); await capture("lead-detail-mobile");
  expect(errors).toEqual([]);
  console.info("SP22_VISUAL_CHECK", JSON.stringify({ measurements, reducedMotion: true, unexpectedErrors: errors.length }));
  } finally { await clearActorContext(page); await removeActor(agent); }
});

test("SP22 visible recovered record, document, finance and denied-state families", async ({ page, baseURL }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await restoredJourney(page, baseURL!, true, "sp22-restored");
});
