import { mkdir } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { expect, signedInTest as test, signIn, openWorkspaceAccount } from "../helpers/auth";

test.use({ actionTimeout: 15_000 });

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  browserErrors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
  page.on("console", (message) => {
    // Firefox's injected automation debugger can measure before CSS loads; not app code.
    if (message.type() === "warning" && message.text().includes('file: "debugger eval code"') &&
      message.text().includes("Layout was forced before the page was fully loaded")) return;
    if (["error", "warning"].includes(message.type())) messages.push(message.text());
  });
});
test.afterEach(({ page }) => { expect(browserErrors.get(page)).toEqual([]); });

test("AT-23/39: French entry and truthful authenticated navigation @shell", async ({
  page, actor,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("requestfailed", (request) => {
    // Next cancels superseded RSC navigations; only transport failures are defects.
    if (
      !/ABORTED|CANCELLED|NS_BINDING_ABORTED|cancelled/i.test(
        request.failure()?.errorText ?? "",
      )
    )
      failures.push(request.url());
  });
  await (await openWorkspaceAccount(page)).getByRole("button", { name: "Se déconnecter", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?signed_out=1$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Votre espace KAY",
  );
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
  await signIn(page, actor);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Tableau de bord",
  );
  await expect(
    page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Tableau de bord" }),
  ).toHaveAttribute("aria-current", "page");
  for (const [label, path] of [
    ["Prospects", "leads"],
    ["Affaires", "deals"],
    ["Tâches", "tasks"],
    ["Calendrier des visites", "visits"],
    ["Projets", "projects"],
    ["Contacts", "contacts"],
    ["Propriétaires", "owners"],
  ]) {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(label);
    await expect(
      page
        .getByRole("navigation", { name: "Navigation principale" })
        .getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    if (path === "leads") {
      await expect(page.getByRole("link", { name: "Nouveau prospect", exact: true })).toBeVisible();
      await expect(page.getByText("0 demande", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    } else if (path === "deals") {
      await expect(page.getByRole("link", { name: "Créer une affaire", exact: true })).toBeVisible();
      await expect(page.getByText("0 affaire", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    } else if (path === "projects") {
      await expect(page.getByRole("tab", { name: "Biens indépendants", exact: true })).toBeVisible();
      await expect(page.getByText("0 bien correspondant", { exact: true }).and(page.getByRole("status"))).toBeVisible();
    } else if (path === "visits") {
      await expect(page.getByRole("link", { name: "Planifier une visite", exact: true })).toBeVisible();
      await expect(page.getByText("0 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    } else if (path === "dashboard") {
      await expect(page.getByRole("region", { name: "Travail à faire", exact: true })).toBeVisible();
      await expect(page.getByText("0 notification(s) actuelle(s) non lue(s).", { exact: true })).toBeVisible();
      await expect(page.getByRole("region", { name: "Visites à renseigner", exact: true })).toBeVisible();
    }
    await expect(page.getByText(/à venir|sera ajoutée|seront disponibles/)).toHaveCount(0);
  }
  await page.getByRole("link", { name: "Aide", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Centre d’aide");
  await page.getByRole("link", { name: "Paramètres", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Paramètres",
  );
  await expect(page.getByRole("link", { name: "Gérer les utilisateurs", exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Tableau de bord", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(failures).toEqual([]);
});

test("desktop rail keeps all destinations and header search reachable @shell", async ({ page }) => {
  await mkdir("output/playwright/sidebar", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  const rail = page.locator("[data-kay-rail]");
  await expect.poll(async () => (await rail.boundingBox())?.width).toBe(96);
  for (const name of ["Tableau de bord", "Prospects", "Affaires", "Tâches", "Calendrier des visites", "Contacts", "Propriétaires", "Projets", "Aide", "Paramètres"]) {
    const link = rail.getByRole("link", { name, exact: true });
    await expect(link).toBeInViewport();
    await expect(link).toHaveAttribute("title", name);
    expect((await link.boundingBox())?.width).toBeGreaterThanOrEqual(44);
  }
  const search = page.getByRole("searchbox", { name: "Recherche globale", exact: true });
  await search.fill("Contrôle synthétique");
  const preview = page.getByRole("dialog", { name: "Suggestions de recherche", exact: true });
  await expect(preview).toBeVisible();
  await search.press("Escape");
  await expect(preview).not.toBeVisible();
  await expect(search).toBeFocused();
  await page.screenshot({ path: "output/playwright/sidebar/desktop.png" });
});

test("desktop rail fits short heights and phones use the navigation sheet @shell", async ({ page }) => {
  await page.goto("/dashboard");
  const rail = page.locator("[data-kay-rail]");
  for (const height of [900, 800, 720, 600]) {
    await page.setViewportSize({ width: 1440, height });
    await expect(rail.getByRole("link", { name: "Paramètres", exact: true })).toBeInViewport();
    expect(await rail.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(rail).toBeHidden();
  const trigger = page.getByRole("button", { name: "Ouvrir la navigation", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Navigation KAY", exact: true });
  await expect(drawer.getByRole("link", { name: "Projets", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("desktop rail stays in place while workspace pages scroll @shell", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/dashboard", "/settings/working-hours"]) {
    await page.goto(route);
    const rail = page.locator("[data-kay-rail]");
    await expect(rail).toBeVisible();
    const before = await rail.boundingBox();
    await page.locator("main").evaluate(element => { element.style.minHeight = "250vh"; });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const after = await rail.boundingBox();
    expect(before && after && Math.abs(after.y - before.y)).toBeLessThan(2);
    expect(await rail.evaluate(element => element.scrollTop)).toBe(0);
  }
});
test("AT-23: sheet keyboard, containment, Escape and focus return @shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dashboard");
  const trigger = page.getByRole("button", { name: "Ouvrir la navigation" });
  await expect(trigger).toBeEnabled();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Navigation KAY" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("link", { name: "Calendrier des visites" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Calendrier des visites",
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("AT-23: responsive widths, long French labels and touch geometry @shell", async ({
  page,
}) => {
  await expect(page.getByRole("button", { name: "Ouvrir les notifications", exact: true })).toBeEnabled();
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const colleagues = page.waitForResponse(response =>
      new URL(response.url()).pathname === "/api/v1/calendar/colleagues" && response.status() === 200);
    await page.goto("/visits");
    await (await colleagues).finished();
    await expect(page.getByRole("button", { name: "Actualiser les visites", exact: true })).toBeEnabled();
    const rulesTrigger = page.getByRole("button", { name: "Règles et disponibilités", exact: true }).and(page.locator('[aria-label="Règles et disponibilités"]'));
    await rulesTrigger.click();
    const rules = page.getByRole("dialog", { name: "Règles et disponibilités", exact: true });
    await expect(rules.getByText(/^Politique version/)).toBeVisible();
    expect(await rules.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(rules).toHaveCount(0);
    await expect(rulesTrigger).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (width <= 830) {
      const trigger = page.getByRole("button", {
        name: "Ouvrir la navigation",
      });
      const box = await trigger.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await trigger.click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("link", { name: "Calendrier des visites" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
  }
});

test("AT-23: unknown route recovery @shell", async ({ page }) => {
  await page.goto("/unknown-page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page introuvable",
  );
  await page
    .locator("#main-content")
    .getByRole("link", { name: "Revenir à l’entrée" })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
