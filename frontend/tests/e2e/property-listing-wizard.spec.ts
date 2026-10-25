import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { geometry } from "../helpers/report-review";

test("choosing a room supplies a valid monthly rental without touching the period", async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await test.step("Create an isolated agent", () => createActor("agent"));
  try {
    await test.step("Sign in to the compiled CRM", () => signIn(page, agent));
    await test.step("Open the property wizard", () => page.goto("/projects/properties/new"));
    const form = page.getByRole("form", { name: "Créer un bien indépendant" });
    const reference = `ROOM-${randomUUID().slice(0, 8)}`;
    const next = form.getByRole("button", { name: "Suivant", exact: true });
    await form.locator("#property-reference").fill(reference);
    await form.locator("#property-category").selectOption("room");
    await expect(form.getByRole("radio", { name: "Location", exact: true })).toBeChecked();
    await expect(form.locator("#property-period")).toHaveValue("month");
    await form.locator("#property-price_mad").fill("2500");
    await mkdir("output/playwright/local-bug-sweep", { recursive: true });
    for (const width of [1440, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await geometry(page);
      await page.screenshot({ path: `output/playwright/local-bug-sweep/room-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await next.click();
    await form.locator("#property-region").fill("Tanger-Tétouan-Al Hoceïma");
    await form.locator("#property-city").fill("Tanger");
    await next.click();
    await form.locator("#property-area_sqm").fill("20");
    await form.locator("#property-bathrooms").fill("1");
    await next.click(); await next.click();
    await form.getByRole("button", { name: "Créer le bien", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/projects\/properties\/[a-f0-9-]{36}$/);
    const response = await page.request.get(`/api/v1/properties/${new URL(page.url()).pathname.split("/").at(-1)}`);
    const saved = await response.json();
    expect(saved.category).toBe("room");
    expect(saved.offerings[0]).toMatchObject({ kind: "rental", price_period: "month", price_mad: "2500.00" });
  } finally { await removeActor(agent); }
});

test("category changes preserve a chosen rental period and normalize a forced market", async ({ page }) => {
  const agent = await createActor("agent");
  try {
    await signIn(page, agent);
    await page.goto("/projects/properties/new");
    const category = page.locator("#property-category");
    const period = page.locator("#property-period");
    await category.selectOption("room");
    await period.selectOption("year");
    await category.selectOption("apartment");
    await expect(period).toHaveValue("year");
    await category.selectOption("room");
    await expect(period).toHaveValue("year");
    await page.getByRole("radio", { name: "Location vacances" }).check();
    await expect(period).toHaveValue("day");
    await category.selectOption("land");
    await expect(page.getByRole("radio", { name: "Vente", exact: true })).toBeChecked();
    await expect(period).toHaveCount(0);
    await category.selectOption("room");
    await expect(period).toHaveValue("month");
  } finally { await removeActor(agent); }
});

test("a manager creates a holiday riad with a priced draft and an exact Maps link", async ({ page }) => {
  const manager = await createActor("manager");
  try {
    await signIn(page, manager);
    await page.goto("/projects/properties/new");
    const form = page.getByRole("form", { name: "Créer un bien indépendant" });
    const reference = `HOLIDAY-${randomUUID().slice(0, 8)}`.toUpperCase();
    const next = form.getByRole("button", { name: "Suivant", exact: true });
    await next.click();
    await expect(form.getByRole("alert")).toContainText("référence");
    await form.locator("#property-reference").fill(reference);
    await form.locator("#property-category").selectOption("riad");
    await form.getByRole("radio", { name: "Location vacances" }).check();
    await form.locator("#property-price_mad").fill("950");
    await form.locator("#property-period").selectOption("day");
    await next.click();
    await form.locator("#property-region").fill("Tanger-Tétouan-Al Hoceïma");
    await form.locator("#property-city").fill("Tanger");
    await form.locator("#property-google_maps_url").fill("https://maps.app.goo.gl/example123");
    await next.click();
    await form.locator("#property-area_sqm").fill("170");
    await form.locator("#property-rooms").fill("5");
    await form.locator("#property-bedrooms").fill("3");
    await form.locator("#property-bathrooms").fill("2");
    await form.locator("#property-capacity").fill("6");
    await form.locator("#property-minimum_nights").fill("2");
    await next.click();
    await form.getByText("Internet", { exact: true }).click();
    await next.click();
    await expect(form.getByText("Étape 5 sur 5")).toBeVisible();
    await form.getByRole("button", { name: "Créer le bien", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/projects\/properties\/[a-f0-9-]{36}$/);
    await expect(page.getByRole("heading", { name: reference, exact: true })).toBeVisible();
    await expect(page.locator("header.surface")).toContainText("Tanger");
    await expect(page.getByRole("link", { name: "Ouvrir dans Google Maps" })).toHaveAttribute("href", "https://maps.app.goo.gl/example123");
    await page.getByRole("tab", { name: "Offres", exact: true }).click();
    await expect(page.getByRole("region", { name: "Location vacances", exact: true })).toContainText("950");
    await expect(page.getByRole("region", { name: "Location", exact: true })).toContainText("Aucune campagne actuelle");
  } finally {
    await removeActor(manager);
  }
});

test("the narrow land form stays within the viewport and excludes residential fields", async ({ page }) => {
  const agent = await createActor("agent");
  try {
    await page.setViewportSize({ width: 320, height: 640 });
    await signIn(page, agent);
    await page.goto("/projects/properties/new");
    const form = page.getByRole("form", { name: "Créer un bien indépendant" });
    await form.locator("#property-reference").fill(`LAND-${randomUUID().slice(0, 8)}`);
    await form.locator("#property-category").selectOption("land");
    await form.locator("#property-price_mad").fill("850000");
    await form.getByRole("button", { name: "Suivant", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(form.getByText("Étape 2 sur 5")).toBeVisible();
    await form.locator("#property-region").fill("Tanger-Tétouan-Al Hoceïma");
    await form.locator("#property-city").fill("Tanger");
    await form.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(form.locator("#property-area_sqm")).toBeVisible();
    await expect(form.locator("#property-bedrooms")).toHaveCount(0);
    await expect(form.locator("#property-bathrooms")).toHaveCount(0);
    await expect(form.locator("#property-unit_floor")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  } finally {
    await removeActor(agent);
  }
});
