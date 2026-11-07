import { randomUUID } from "node:crypto";
import { editPropertySchema, propertySchema, resultSchema } from "@/features/inventory/contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only. Real isolated persistence and native geometry are
// unproved until these two cases run through the existing supervisor.
for (const width of [390, 1440]) test(`Room orientation survives an unrelated selected edit at ${width}px`, async ({ page }) => {
  const actors: TestActor[] = [], written: (string | null | undefined)[] = [];
  try {
    const manager = await createActor("manager", false, "SP06 selected room fact manager"); actors.push(manager);
    await signIn(page, manager); await page.setViewportSize({ width, height: 900 });
    const created = await staffCommand(page, "properties", {
      reference: `SYN-ROOM-${randomUUID().slice(0, 8)}`.toUpperCase(), category: "room", marketing_name: "Synthetic original room title", location: null, area_sqm: "24.00", rooms: null,
      listing_details: { region: "Synthetic region", city: "Synthetic city", orientation: "north", bathrooms: 0, unit_floor: 0, amenities: [] },
      initial_offering: { kind: "rental", price_mad: "2500.00", price_period: "month", currency: "MAD" },
    });
    if (created.status() !== 200) throw new Error("SYNTHETIC_ROOM_CREATE_FAILED");
    const result = resultSchema.parse(await created.json()); if (!("property_id" in result)) throw new Error("SYNTHETIC_ROOM_RECEIPT_FAILED");
    const id = result.property_id;
    await page.goto(`/projects/properties/${id}/edit`);
    const form = page.getByRole("form", { name: "Modifier le bien", exact: true });
    await form.locator("#property-marketing_name").fill("Synthetic unrelated room title edit");
    await form.getByRole("button", { name: "Étape 3 sur 5 : Caractéristiques", exact: true }).click();
    await expect(form.locator("#property-orientation")).toHaveCount(0);
    await expect(form.locator("#property-bathrooms")).toHaveValue("0");
    await form.getByRole("button", { name: "Étape 5 sur 5 : Vérification", exact: true }).click();
    await expect(form.getByRole("complementary", { name: "Aperçu du dossier", exact: true }).getByText("Nord", { exact: true })).toBeVisible();
    await page.route(`**/api/v1/properties/${id}`, async route => {
      if (route.request().method() === "PATCH") written.push(editPropertySchema.parse(route.request().postDataJSON()).listing_details?.orientation);
      await route.fallback();
    });
    await form.getByRole("button", { name: "Enregistrer le bien", exact: true }).click();
    await expect(form).toHaveCount(0); expect(written.length === 1 && written[0] === "north").toBe(true);
    const response = await page.request.get(`/api/v1/properties/${id}`);
    if (response.status() !== 200) throw new Error("SYNTHETIC_ROOM_RESULT_FAILED");
    const current = propertySchema.parse(await response.json());
    expect(current.marketing_name === "Synthetic unrelated room title edit" && current.listing_details.orientation === "north" && current.listing_details.bathrooms === 0 && current.listing_details.unit_floor === 0).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); for (const actor of actors.reverse()) await removeActor(actor); }
});
