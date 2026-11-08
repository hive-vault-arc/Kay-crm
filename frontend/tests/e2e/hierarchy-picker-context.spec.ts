import { randomUUID } from "node:crypto";
import { blocksSchema, developmentSchema } from "@/features/inventory/development-contracts";
import { clearActorContext, createActor, expect, removeActor, signIn, test, type TestActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

test.use({ trace: "off", video: "off", screenshot: "off" });

// Prepared/typechecked only: shape-valid wrong-parent data is a simulated read
// fault, not proof that the actual backend ever returned another context.
for (const width of [390, 1440]) test(`Unit picker rejects a foreign block and retains block intent at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = []; let writes = 0;
  try {
    const manager = await createActor("manager", false, "SP06 hierarchy picker manager"); actors.push(manager);
    await signIn(page, manager); await page.setViewportSize({ width, height: 900 });
    const reference = `SP10-${randomUUID().slice(0, 8)}`.toUpperCase();
    const created = await staffCommand(page, "developments", { reference, name: "Synthetic picker programme", category: "mixed", location: null, briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
    if (created.status() !== 200) throw new Error("SYNTHETIC_PICKER_PROGRAMME_FAILED");
    const id = (await created.json()).development_id as string;
    const opening = await page.request.get(`/api/v1/developments/${id}`);
    if (opening.status() !== 200) throw new Error("SYNTHETIC_PICKER_CONTEXT_FAILED");
    const current = developmentSchema.parse(await opening.json());
    const added = await staffCommand(page, `developments/${id}/blocks`, { expected_version: current.version, code: "B1", label: "Synthetic scoped block", display_order: 0 });
    if (added.status() !== 200) throw new Error("SYNTHETIC_PICKER_BLOCK_FAILED");
    const collection = await page.request.get(`/api/v1/developments/${id}/blocks`);
    if (collection.status() !== 200) throw new Error("SYNTHETIC_PICKER_BLOCK_READ_FAILED");
    const block = blocksSchema.parse(await collection.json()).items[0];
    if (!block || block.development_id !== id) throw new Error("SYNTHETIC_PICKER_BLOCK_SCOPE_FAILED");
    const pattern = `**/api/v1/developments/${id}/blocks?**`, foreign = { ...block, id: randomUUID(), development_id: randomUUID(), code: "FOREIGN", label: "Synthetic wrong programme block" };
    await page.route(pattern, route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [foreign], total: 1, page: 1, page_size: 25, has_next: false, has_previous: false }) }));
    page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/v1/properties") writes++; });
    await page.goto(`/projects/${id}?tab=units`); await page.getByRole("button", { name: "Créer une unité", exact: true }).click();
    const form = page.getByRole("form", { name: "Créer une unité", exact: true }), picker = form.getByLabel("Bloc de l’unité", { exact: true });
    await expect(picker).toBeDisabled(); await expect(form.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await expect(picker.getByRole("option")).toHaveCount(1);
    await page.unroute(pattern); await form.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(picker).toBeEnabled(); await picker.selectOption(block.id);
    await expect(form.getByLabel("Étage de l’unité", { exact: true })).toBeVisible();
    await form.locator("#property-category").selectOption("villa"); await form.locator("#property-reference").fill(`${reference}-UNIT`); await form.locator("#property-price_mad").fill("1000000");
    await form.getByRole("button", { name: "Étape 5 sur 5 : Vérification", exact: true }).click();
    await form.getByRole("button", { name: "Créer l’unité", exact: true }).click();
    await expect(form.getByRole("alert").filter({ hasText: "retirez le bloc" })).toBeVisible(); expect(writes).toBe(0);
    await expect(form.getByLabel("Bloc de l’unité", { exact: true })).toHaveValue(block.id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  } finally { await clearActorContext(page); for (const actor of actors.reverse()) await removeActor(actor); }
});
