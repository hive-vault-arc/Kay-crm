import { mkdir } from "node:fs/promises";
import { test, expect, signIn, createActor, removeActor } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { dealBody } from "../helpers/deals";
import { geometry } from "../helpers/report-review";

test("Riviera: self-hosted fonts, live route families and responsive shared branding", async ({ page, actor }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
  await mkdir("output/playwright/riviera", { recursive: true });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await geometry(page);
    await expect(page.getByLabel("Adresse e-mail", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveValue("");
    await page.screenshot({ path: `output/playwright/riviera/login-${width}.png`, animations: "disabled" });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, actor);
  const owner = await createActor("agent");
  try {
  const leadResponse = await staffCommand(page, "enquiries", {
    new_contact: { name: "SP05 contact Riviera synthétique", type: "person", country: "MA", nationality: "MA", languages: ["french"], roles: ["buyer"], primary_agent_id: owner.id, phones: [{ number: "+12025550199", label: "Démonstration", is_primary: true }], emails: [] },
    source: "phone", status: "new", initial_budget: "500000", message: "Données synthétiques Riviera",
  });
  expect(leadResponse.status()).toBe(200);
  const createdLead = await leadResponse.json();
  const lead = createdLead.id, contact = createdLead.contact.id;
  const dealResponse = await staffCommand(page, "deals", dealBody(contact));
  expect(dealResponse.status()).toBe(200);
  const deal = (await dealResponse.json()).id;
  const projectResponse = await staffCommand(page, "developments", { reference: "SP-RIVIERA", name: "SP08 Riviera synthétique", category: "mixed", location: "Quartier de démonstration", briefing_text: null, developer_contact_id: null, developer_marketing_display: null });
  expect(projectResponse.status()).toBe(200);
  const project = (await projectResponse.json()).development_id;
  const routes: [string, string][] = [
    ["/dashboard", "dashboard"], ["/leads", "leads"], [`/leads/${lead}`, "lead-detail"],
    ["/leads/new", "lead-create"], [`/leads/${lead}/edit`, "lead-edit"],
    ["/deals", "deals"], [`/deals/${deal}`, "deal-detail"], ["/deals/new", "deal-create"],
    ["/projects", "projects"], [`/projects/${project}`, "project-detail"],
    ["/projects/new", "project-create"], ["/projects/properties/new", "property-create"],
    ["/visits", "visits"], ["/settings", "settings"], ["/settings/users", "users"],
    ["/settings/users/new", "user-create"], ["/settings/working-hours", "working-hours"],
  ];
  for (const [route, name] of routes) {
    await page.goto(route);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 248, 244)");
    await expect(page.locator("body")).toHaveCSS("font-family", /manrope/i);
    await expect(page.locator("main h1")).toHaveCSS("font-family", /fraunces/i);
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    await geometry(page);
    if (["dashboard", "leads", "lead-detail", "projects", "deal-detail"].includes(name))
      await page.screenshot({ path: `output/playwright/riviera/${name}-1440.png`, animations: "disabled" });
    await page.setViewportSize({ width: 360, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await geometry(page);
    if (["dashboard", "lead-detail", "projects"].includes(name))
      await page.screenshot({ path: `output/playwright/riviera/${name}-360.png`, animations: "disabled" });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map(entry => entry.name));
  expect(resources.filter(url => /fonts\.(googleapis|gstatic)\.com/.test(url))).toEqual([]);
  expect(errors).toEqual([]);
  } finally { await removeActor(owner); }
});
