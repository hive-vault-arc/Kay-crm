import { randomUUID } from "node:crypto";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";

// Prepared isolated workflow: no legal-property link is created by adding a role.
test("Owner reuse preserves canonical identity/assignment and opening an existing owner makes no further write", async ({ page }) => {
  const agent = await createActor("agent"), suffix = randomUUID().slice(0, 8), name = `Propriétaire réutilisé synthétique ${suffix}`;
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  try {
    await signIn(page, agent);
    const result = await staffCommand(page, "contacts", { name, type: "organization", phones: [{ number: `+212612${digits}`, label: "Principal conservé", is_primary: true }, { number: `+212613${digits}`, label: "Secondaire conservé", is_primary: false }], emails: [{ email: `synthetic-owner-${suffix}@example.com`, label: "Bureau conservé", is_primary: true }], roles: ["buyer", "developer"], country: "MA", nationality: "FR", languages: ["french", "darija"] });
    expect(result.status()).toBe(200);
    const original = await result.json();
    await page.goto("/owners/new");
    await page.getByLabel("Nom complet", { exact: true }).fill("Saisie synthétique à ne pas recopier");
    await page.getByLabel("Contact", { exact: true }).selectOption("existing");
    await page.getByLabel("Rechercher un contact accessible", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Rechercher", exact: true }).click();
    await page.getByRole("button", { name: `Choisir ${name}`, exact: true }).click();
    await expect(page.getByText("Rôle Propriétaire à ajouter", { exact: true })).toBeVisible();
    const patched = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/contacts/${original.id}` && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Ajouter le rôle Propriétaire", exact: true }).click();
    expect((await patched).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/owners/${original.id}$`));
    const saved = await (await page.request.get(`/api/v1/contacts/${original.id}`)).json();
    for (const field of ["name", "type", "phones", "emails", "country", "nationality", "languages", "primary_agent", "source", "source_submission_id", "created_by_user_id"]) expect(saved[field]).toEqual(original[field]);
    expect(saved.roles).toContain("owner"); expect(saved.roles).toContain("buyer"); expect(saved.roles).toContain("developer");
    const portfolio = await (await page.request.get(`/api/v1/contacts/${original.id}/portfolio`)).json(); expect(portfolio.total).toBe(0);
    await page.goto("/owners/new");
    await page.getByLabel("Contact", { exact: true }).selectOption("existing");
    await page.getByLabel("Rechercher un contact accessible", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Rechercher", exact: true }).click();
    await page.getByRole("button", { name: `Choisir ${name}`, exact: true }).click();
    let writes = 0;
    page.on("request", request => { if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()) && /^\/api\/v1\/contacts(?:\/[^/]+)?$/.test(new URL(request.url()).pathname)) writes++; });
    await page.getByRole("button", { name: "Ouvrir le propriétaire", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/owners/${original.id}$`)); expect(writes).toBe(0);
  } finally { await clearActorContext(page); await removeActor(agent); }
});
