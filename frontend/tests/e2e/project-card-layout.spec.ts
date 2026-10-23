import { mkdir } from "node:fs/promises";
import { type Page } from "@playwright/test";
import { test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { geometry } from "../helpers/report-review";

async function cardGeometry(page: Page, count: number) {
  await expect(page.locator("article.project-card")).toHaveCount(count);
  await page.evaluate(() => document.fonts.ready);
  const cards = await page.locator("article.project-card").evaluateAll(elements => elements.map(card => {
    const rect = card.getBoundingClientRect();
    const footer = card.querySelector<HTMLElement>(".project-card-link")!;
    const action = footer.getBoundingClientRect();
    return { width: rect.width, height: rect.height, footerWidth: action.width, footerHeight: action.height, bottomGap: rect.bottom - action.bottom, leftGap: action.left - rect.left, rightGap: rect.right - action.right };
  }));
  expect(Math.max(...cards.map(card => card.height)) - Math.min(...cards.map(card => card.height))).toBeLessThanOrEqual(1);
  expect(Math.max(...cards.map(card => card.width)) - Math.min(...cards.map(card => card.width))).toBeLessThanOrEqual(1);
  for (const card of cards) {
    expect(card.footerHeight).toBeGreaterThanOrEqual(44);
    expect(card.footerWidth).toBeGreaterThanOrEqual(card.width - 2);
    expect(Math.abs(card.bottomGap)).toBeLessThanOrEqual(1);
    expect(Math.abs(card.leftGap)).toBeLessThanOrEqual(1);
    expect(Math.abs(card.rightGap)).toBeLessThanOrEqual(1);
  }
  await geometry(page);
}

test("project cards: equal sizes and full-width hover, keyboard and touch footer", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const actor = await createActor("administrator", false, "SP06 Cartes synthétiques");
  const longLocation = `https://www.google.com/maps/place/${"quartier-synthetique-".repeat(20)}`;
  try {
    await page.setViewportSize({ width: 1920, height: 1000 }); await signIn(page, actor);
    for (let index = 0; index < 6; index++) {
      const response = await staffCommand(page, "properties", {
        reference: `SP07-CARD-${index}`, category: "apartment",
        marketing_name: index === 0 ? "Appartement de démonstration avec un titre volontairement long pour vérifier la régularité des cartes et la lisibilité de la navigation" : `Bien synthétique ${index}`,
        location: index === 0 ? longLocation : index % 2 ? null : "Quartier synthétique",
        area_sqm: "80", rooms: 3,
        ...(index === 1 ? { initial_offering: { kind: "sale", price_mad: "1250000.00", currency: "MAD", price_period: null } } : {}),
      });
      expect(response.status()).toBe(200);
    }
    await page.goto("/projects");
    await cardGeometry(page, 6);
    await expect(page.getByText(/1.250.000,00 MAD/)).toBeVisible();
    await expect(page.locator(".project-card-location span[title]").filter({ hasText: longLocation })).toHaveAttribute("title", longLocation);
    const footer = page.locator(".project-card-link").first();
    const href = await footer.getAttribute("href");
    const resting = await footer.evaluate(element => getComputedStyle(element).backgroundColor);
    await footer.hover();
    await expect.poll(() => footer.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(resting);
    await geometry(page);
    await mkdir("output/playwright/project-card-layout", { recursive: true });
    await page.screenshot({ path: "output/playwright/project-card-layout/desktop.png", fullPage: true });
    await page.mouse.move(0, 0); await footer.focus();
    await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
    await expect(footer).toBeFocused();
    expect(await footer.evaluate(element => Number.parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
    expect(await footer.evaluate(element => Number.parseFloat(getComputedStyle(element).outlineOffset))).toBeLessThan(0);
    await page.keyboard.press("Enter"); await expect(page).toHaveURL(new RegExp(`${href}$`));
    await page.goto("/projects");
    for (const width of [320, 360, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 1000 }); await cardGeometry(page, 6); }
    await page.setViewportSize({ width: 360, height: 844 });
    await page.screenshot({ path: "output/playwright/project-card-layout/mobile.png" });
    const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 844 }, hasTouch: true });
    try {
      const phone = await touch.newPage(); await signIn(phone, actor); await phone.goto("/projects");
      await expect(phone.locator(".project-card-link")).toHaveCount(6);
      const destination = await phone.locator(".project-card-link").first().getAttribute("href");
      await phone.locator(".project-card-link").first().tap(); await expect(phone).toHaveURL(new RegExp(`${destination}$`));
    } finally { await touch.close(); }
  } finally { await removeActor(actor); }
});

test("programme cards share the equal-height full-width footer", async ({ page }) => {
  const actor = await createActor("administrator", false, "SP06 Programmes synthétiques");
  try {
    await page.setViewportSize({ width: 1920, height: 1000 }); await signIn(page, actor);
    for (let index = 0; index < 4; index++) {
      const response = await staffCommand(page, "developments", {
        reference: `SP08-CARD-${index}`, category: "mixed",
        name: index === 0 ? "Programme immobilier de démonstration avec un nom long pour vérifier le pied de carte commun" : `Programme synthétique ${index}`,
        location: index === 0 ? "Quartier synthétique très détaillé ".repeat(10) : null,
        briefing_text: null, developer_contact_id: null, developer_marketing_display: null,
      });
      expect(response.status()).toBe(200);
    }
    await page.goto("/projects"); await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click();
    for (const width of [1920, 1440, 768, 360]) { await page.setViewportSize({ width, height: 1000 }); await cardGeometry(page, 4); }
    await page.setViewportSize({ width: 1920, height: 1000 });
    await mkdir("output/playwright/project-card-layout", { recursive: true });
    await page.screenshot({ path: "output/playwright/project-card-layout/programmes.png", fullPage: true });
    const footer = page.locator(".project-card-link").first(), href = await footer.getAttribute("href");
    await footer.click(); await expect(page).toHaveURL(new RegExp(`${href}$`));
  } finally { await removeActor(actor); }
});
