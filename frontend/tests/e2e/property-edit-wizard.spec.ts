import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { test, expect, createActor, removeActor, signIn } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { createProperty, propertyEditStep, savePropertyEdit } from "../helpers/inventory";
import { geometry } from "../helpers/report-review";

test("property edit: rich fields are prefilled, saved and reopened without changing offers", async ({ page }) => {
  test.setTimeout(180_000);
  const actor = await createActor("manager");
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  try {
    await signIn(page, actor);
    await page.goto("/projects");
    const reference = `EDIT-${randomUUID().slice(0, 8)}`.toUpperCase();
    const details = {
      condition: "good", address: "12 rue de contrôle synthétique", region: "Tanger-Tétouan-Al Hoceïma", city: "Tanger", district: "Centre", neighborhood: "Quartier synthétique", google_maps_url: "https://maps.app.goo.gl/example123",
      bedrooms: 3, bathrooms: 2, capacity: 6, minimum_nights: 2, age_band: "5_10", floor_type: "tile", unit_floor: 0, orientation: "south",
      amenities: ["garden", "terrace", "garage", "internet"], garden_area_sqm: "12.00", terrace_area_sqm: "8.50", garage_spaces: 1, description: "Description de contrôle synthétique.",
    };
    const created = await staffCommand(page, "properties", {
      reference, category: "apartment", marketing_name: "Appartement synthétique avec un titre existant de plus de cinquante caractères à conserver", location: null, area_sqm: "120.00", rooms: 5, listing_details: details,
      initial_offering: { kind: "holiday", price_mad: "950.00", price_period: "day", currency: "MAD" },
    });
    expect(created.status()).toBe(200);
    const { property_id: id } = await created.json();
    const before = await (await page.request.get(`/api/v1/properties/${id}`)).json();
    await page.goto(`/projects/properties/${id}/edit`);
    const form = page.getByRole("form", { name: "Modifier le bien", exact: true });
    await expect(form.locator("#property-reference")).toHaveValue(reference);
    await expect(form.locator("#property-marketing_name")).toHaveValue(before.marketing_name);
    await expect(form.getByRole("region", { name: "Offres conservées" })).toContainText("950");
    await expect(form.locator("#property-price_mad")).toHaveCount(0);
    await form.locator("#property-marketing_name").fill("Appartement synthétique révisé");
    await form.getByRole("button", { name: "Suivant", exact: true }).focus();
    await page.keyboard.press("Enter");
    for (const key of ["address", "region", "city", "district", "neighborhood", "google_maps_url"] as const) await expect(form.locator(`#property-${key}`)).toHaveValue(details[key]);
    await expect(form.locator("#property-location")).toHaveValue("");
    await form.locator("#property-google_maps_url").fill("https://example.com/not-maps");
    await form.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("Google Maps HTTPS");
    await form.locator("#property-google_maps_url").fill(details.google_maps_url);
    await form.locator("#property-city").fill("Tétouan");
    await propertyEditStep(page, 2);
    for (const [key, value] of Object.entries({ area_sqm: "120.00", rooms: "5", bedrooms: "3", bathrooms: "2", capacity: "6", minimum_nights: "2", condition: "good", age_band: "5_10", floor_type: "tile", unit_floor: "0", orientation: "south" })) await expect(form.locator(`#property-${key}`)).toHaveValue(value);
    await form.locator("#property-bedrooms").fill("4");
    await mkdir("output/playwright/property-edit", { recursive: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await geometry(page);
      if (width === 390 || width === 1440) await page.screenshot({ path: `output/playwright/property-edit/details-${width}.png`, fullPage: true });
    }
    await propertyEditStep(page, 3);
    await expect(form.getByRole("checkbox", { name: "Jardin", exact: true })).toBeChecked();
    await expect(form.getByRole("checkbox", { name: "Internet", exact: true })).toBeChecked();
    await expect(form.locator("#property-garden_area_sqm")).toHaveValue("12.00");
    await expect(form.locator("#property-terrace_area_sqm")).toHaveValue("8.50");
    await expect(form.locator("#property-garage_spaces")).toHaveValue("1");
    await expect(form.locator("#property-description")).toHaveValue(details.description);
    await form.locator("#property-garden_area_sqm").fill("");
    await form.getByRole("button", { name: "Suivant", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("surface du jardin");
    await form.getByRole("checkbox", { name: "Jardin", exact: true }).uncheck();
    await form.locator("#property-description").fill("Description synthétique révisée.");
    await propertyEditStep(page, 4);
    const [savedResponse] = await Promise.all([
      page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/properties/${id}` && response.request().method() === "PATCH"),
      form.getByRole("button", { name: "Enregistrer le bien", exact: true }).click(),
    ]);
    expect(savedResponse.status()).toBe(200);
    const sent = savedResponse.request().postDataJSON();
    expect(sent).not.toHaveProperty("initial_offering");
    await expect(page.getByRole("link", { name: "Modifier le bien", exact: true })).toBeVisible();
    const after = await (await page.request.get(`/api/v1/properties/${id}`)).json();
    expect(after.offerings).toEqual(before.offerings);
    expect(after.location).toBeNull();
    const expectedDetails = { ...before.listing_details, city: "Tétouan", bedrooms: 4, amenities: ["terrace", "garage", "internet"], description: "Description synthétique révisée." };
    delete expectedDetails.garden_area_sqm;
    expect(after.listing_details).toEqual(expectedDetails);
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await expect(form.locator("#property-marketing_name")).toHaveValue("Appartement synthétique révisé");
    await propertyEditStep(page, 2);
    await expect(form.locator("#property-bedrooms")).toHaveValue("4");
    await propertyEditStep(page, 3);
    await expect(form.getByRole("checkbox", { name: "Jardin", exact: true })).not.toBeChecked();
    await expect(form.locator("#property-description")).toHaveValue("Description synthétique révisée.");
    expect(errors).toEqual([]);
  } finally { await removeActor(actor); }
});

test("property edit: agents can edit legacy land with dynamic fields and cancel without writing", async ({ page }) => {
  const actor = await createActor("agent");
  try {
    await signIn(page, actor);
    const id = await createProperty(page, "land");
    const before = await (await page.request.get(`/api/v1/properties/${id}`)).json();
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    const form = page.getByRole("form", { name: "Modifier le bien", exact: true });
    await form.locator("#property-category").selectOption("office");
    await propertyEditStep(page, 2);
    await expect(form.locator("#property-bathrooms")).toBeVisible();
    await expect(form.locator("#property-unit_floor")).toBeVisible();
    await expect(form.locator("#property-bedrooms")).toHaveCount(0);
    await propertyEditStep(page, 0);
    await form.locator("#property-category").selectOption("land");
    await propertyEditStep(page, 2);
    await expect(form.locator("#property-bathrooms")).toHaveCount(0);
    await expect(form.locator("#property-unit_floor")).toHaveCount(0);
    await form.locator("#property-land_delivery").selectOption("titled");
    await form.locator("#property-land_status").selectOption("subdivided");
    await page.setViewportSize({ width: 320, height: 740 });
    await geometry(page);
    await savePropertyEdit(page);
    await expect(page.getByRole("link", { name: "Modifier le bien", exact: true })).toBeVisible();
    const after = await (await page.request.get(`/api/v1/properties/${id}`)).json();
    expect(after.listing_details.land_delivery).toBe("titled");
    expect(after.listing_details.land_status).toBe("subdivided");
    expect(after.area_sqm).toBeNull();
    expect(after.offerings).toEqual(before.offerings);
    await page.getByRole("link", { name: "Modifier le bien", exact: true }).click();
    await form.locator("#property-reference").fill("UNSAVED-SYNTHETIC");
    await form.getByRole("link", { name: "Annuler", exact: true }).click();
    await expect(page.getByRole("link", { name: "Modifier le bien", exact: true })).toBeVisible();
    expect((await (await page.request.get(`/api/v1/properties/${id}`)).json()).reference).toBe(after.reference);
  } finally { await removeActor(actor); }
});

test("property edit: native 200 percent zoom and touch keep the wizard usable", async ({ page, browser, baseURL }, info) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent");
  const profile = info.outputPath("property-edit-zoom-profile");
  const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
  let zoom: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  try {
    await signIn(page, actor);
    const id = await createProperty(page, "commercial");
    zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let current = zoom.pages()[0];
    await signIn(current, actor);
    const baseline = await current.evaluate(() => devicePixelRatio);
    await zoom.close();
    const preferencesPath = path.join(profile, "Default", "Preferences");
    const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
    preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(preferencesPath, JSON.stringify(preferences));
    zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    current = zoom.pages()[0];
    await current.goto(`/projects/properties/${id}/edit`);
    await propertyEditStep(current, 2);
    expect(await current.evaluate(() => devicePixelRatio) / baseline).toBeCloseTo(2, 1);
    await geometry(current);
    await mkdir("output/playwright/property-edit", { recursive: true });
    const cdp = await zoom.newCDPSession(current);
    try {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile("output/playwright/property-edit/native-zoom-200.png", Buffer.from(shot.data, "base64"));
    } finally { await cdp.detach(); }
    const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    try {
      const phone = await touch.newPage();
      await signIn(phone, actor);
      await phone.goto(`/projects/properties/${id}/edit`);
      const form = phone.getByRole("form", { name: "Modifier le bien", exact: true });
      await form.getByRole("button", { name: "Suivant", exact: true }).tap();
      await expect(form.locator("#property-city")).toBeVisible();
      await geometry(phone);
      await form.getByRole("button", { name: "Précédent", exact: true }).tap();
      await expect(form.locator("#property-reference")).toBeVisible();
    } finally { await touch.close(); }
  } finally {
    await zoom?.close();
    expect(path.resolve(profile).startsWith(path.resolve("test-results") + path.sep)).toBe(true);
    expect(path.basename(profile)).toBe("property-edit-zoom-profile");
    await rm(profile, { recursive: true, force: true });
    await removeActor(actor);
  }
});
