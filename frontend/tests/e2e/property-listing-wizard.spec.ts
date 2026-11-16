import { mkdir } from "node:fs/promises";
import { test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { geometry } from "../helpers/report-review";
import { inventorySection } from "../helpers/inventory";

test("choosing a room supplies a valid monthly rental without touching the period", async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await test.step("Create an isolated agent", () => createActor("agent"));
  try {
    await test.step("Sign in to the compiled CRM", () => signIn(page, agent));
    await test.step("Open the property wizard", () => page.goto("/projects/properties/new"));
    const form = page.getByRole("form", { name: "Créer un bien indépendant" });
    const next = form.getByRole("button", { name: "Suivant", exact: true });
    await expect(form.locator("#property-reference")).toHaveCount(0);
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
    const floor = form.getByRole("spinbutton", { name: "Étage", exact: true });
    await expect(floor).toHaveAttribute("step", "1");
    await expect(floor).not.toHaveAttribute("max");
    await floor.fill("37.5");
    await next.click();
    await expect(form.getByRole("alert")).toContainText("Indiquez un étage entier à partir de 0.");
    await floor.fill("37");
    await next.click(); await next.click();
    await form.getByRole("button", { name: "Créer le bien", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/projects\/properties\/[a-f0-9-]{36}$/);
    const response = await page.request.get(`/api/v1/properties/${new URL(page.url()).pathname.split("/").at(-1)}`);
    const saved = await response.json();
    expect(saved.category).toBe("room");
    expect(saved.listing_details.unit_floor).toBe(37);
    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Casablanca" }).format(new Date()).replaceAll("-", "");
    expect(saved.reference).toMatch(new RegExp(`^CHAMBRE-${today}-[A-F0-9]{12}$`));
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
    const title = "Résidence Al Qods";
    const next = form.getByRole("button", { name: "Suivant", exact: true });
    await next.click();
    await expect(form.getByRole("alert")).toContainText("prix en MAD");
    await expect(form.locator("#property-reference")).toHaveCount(0);
    await form.locator("#property-marketing_name").fill(title);
    await form.locator("#property-received_on").fill("2024-10-12");
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
    const floors = form.getByRole("spinbutton", { name: "Étages du bâtiment", exact: true });
    await expect(floors).toHaveAttribute("min", "1");
    await expect(floors).not.toHaveAttribute("max");
    await floors.fill("12");
    await next.click();
    await form.getByText("Internet", { exact: true }).click();
    await next.click();
    await expect(form.getByRole("navigation", { name: "Progression de la création", exact: true }).getByRole("button", { name: /^Étape 5 sur 5 :/ })).toHaveAttribute("aria-current", "step");
    await form.getByRole("button", { name: "Créer le bien", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/projects\/properties\/[a-f0-9-]{36}$/);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    const response = await page.request.get(`/api/v1/properties/${new URL(page.url()).pathname.split("/").at(-1)}`);
    const saved = await response.json();
    expect(saved.reference).toMatch(/^RESIDENCE-AL-QODS-20241012-[A-F0-9]{12}$/);
    expect(saved.listing_details.building_floors).toBe(12);
    await expect(inventorySection(page, "Informations du bien")).toContainText("Tanger");
    await expect(inventorySection(page, "Localisation").getByRole("link", { name: "Ouvrir Google Maps", exact: true })).toHaveAttribute("href", "https://maps.app.goo.gl/example123");
    const offers = inventorySection(page, "Offres");
    await expect(offers.locator(".kay-inventory-offer-summary")).toHaveCount(1);
    await expect(offers.getByText("Location vacances", { exact: true })).toBeVisible(); await expect(offers).toContainText("950");
    await expect(offers.getByText("Location", { exact: true })).toHaveCount(0);
    await expect(offers.getByRole("button", { name: "Créer une offre de location", exact: true })).toBeEnabled();
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
    await expect(form.locator("#property-reference")).toHaveCount(0);
    await form.locator("#property-category").selectOption("land");
    await form.locator("#property-price_mad").fill("850000");
    await form.getByRole("button", { name: "Suivant", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(form.getByRole("navigation", { name: "Progression de la création", exact: true }).getByRole("button", { name: /^Étape 2 sur 5 :/ })).toHaveAttribute("aria-current", "step");
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
