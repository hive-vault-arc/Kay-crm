import { test, expect, signIn, clearActorContext } from "../helpers/auth";

// Prepared native integration boundary, not a replacement for real business-form
// CRUD/focus/touch cases. The only edited values here are synthetic DOM fixtures.
for (const mode of ["native", "classic"] as const) test(`History navigation retains a draft on cancel, confirms discard and blocks a pending command (${mode})`, async ({ page, actor }) => {
  try {
    if (mode === "classic") await page.addInitScript(() => { Object.defineProperty(window, "navigation", { value: undefined, configurable: true }); });
    await signIn(page, actor);
    await page.goto("/contacts");
    if (!await page.locator('a[href="/leads"]:visible').count()) await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).click();
    await page.locator('a[href="/leads"]:visible').first().click();
    await expect(page).toHaveURL(/\/leads$/);
    expect(await page.evaluate(() => {
      const navigation = (window as Window & { navigation?: EventTarget & { currentEntry?: unknown } }).navigation ?? window.__kayClassicHistoryV1;
      return Boolean(navigation?.currentEntry);
    })).toBe(true);
    const historyLength = await page.evaluate(() => history.length);
    await page.evaluate(() => {
      const form = document.createElement("form"), label = document.createElement("label"), input = document.createElement("input");
      form.dataset.syntheticDraft = "true"; form.dataset.draftManaged = ""; form.dataset.liveDirty = "true";
      label.htmlFor = input.id = "synthetic-history-draft"; label.textContent = "Brouillon synthétique de navigation"; input.value = "Saisie synthétique conservée";
      form.append(label, input); document.querySelector("main")!.append(form);
    });
    await page.getByLabel("Brouillon synthétique de navigation", { exact: true }).click();
    await page.evaluate(() => history.back());
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page).toHaveURL(/\/leads$/);
    await page.getByRole("button", { name: "Continuer la modification", exact: true }).click();
    await expect(page.getByLabel("Brouillon synthétique de navigation", { exact: true })).toHaveValue("Saisie synthétique conservée");
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await page.evaluate(() => history.back());
    await page.getByRole("button", { name: "Quitter sans enregistrer", exact: true }).click();
    await expect(page).toHaveURL(/\/contacts$/);
    await page.evaluate(() => history.forward());
    await expect(page).toHaveURL(/\/leads$/);
    await page.evaluate(mode => {
      document.querySelector('[data-synthetic-draft]')?.remove();
      const form = document.createElement("form"); form.dataset.syntheticDraft = "true"; form.dataset.draftManaged = ""; form.setAttribute("aria-busy", "true"); document.querySelector("main")!.append(form);
      const probe = { events: 0 }; (window as Window & { historyGuardProbe?: typeof probe }).historyGuardProbe = probe;
      if (mode === "native") (window as Window & { navigation?: EventTarget }).navigation!.addEventListener("navigate", () => { probe.events++; });
      else { const original = history.go.bind(history); history.go = delta => { probe.events++; original(delta); }; }
    }, mode);
    await page.evaluate(() => history.back());
    await expect.poll(() => page.evaluate(() => (window as Window & { historyGuardProbe?: { events: number } }).historyGuardProbe?.events ?? 0)).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/leads$/);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  } finally {
    await page.evaluate(() => { document.querySelector('[data-synthetic-draft]')?.remove(); }).catch(() => {});
    await clearActorContext(page);
  }
});
