import { chromium, type Locator, type Page } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, clearActorContext, removeActor, signIn, type TestActor } from "../helpers/auth";
import { confirmFinance, fillReceipt, financeFixture, openFinance, saveCommission } from "../helpers/finance";

// Prepared for the isolated visible-Chrome supervisor. No runtime/visual result
// is inferred from source, typechecking or these future manual captures.
test.use({ trace: "off", video: "off", screenshot: "off" });

const drawer = (page: Page) => page.getByRole("dialog", { name: "Commissions et encaissements", exact: true });
const card = (page: Page, id: string) => drawer(page).locator(`[data-finance-id="${id}"]`);

async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  if (!name.startsWith("loading")) await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await cdp.send("Page.getLayoutMetrics") : undefined;
    const width = await page.evaluate(() => innerWidth);
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png", fromSurface: true,
      ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}),
    });
    // Do not overwrite the incumbent SP-16 or canonical review evidence.
    await writeFile(path.resolve(`output/playwright/redesign-finance-${name}.png`), Buffer.from(shot.data, "base64"));
  } finally { await cdp.detach(); }
}

async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const current = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)].find(visible);
    // A Sheet is portalled outside main. Measure the actual active surface,
    // preferring its nested confirmation, rather than the inert page behind it.
    const root = current('[role="alertdialog"]') ?? current('[role="dialog"]') ?? document.querySelector("main") ?? document.body;
    // Use the existing native-review canvas approach for CSS colors and alpha;
    // parsing numeric channels as RGB misreads color-mix/OKLCH serialization.
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("SYNTHETIC_FINANCE_COLOR_CONTEXT_MISSING");
    function rgba(color: string) {
      context!.clearRect(0, 0, 1, 1); context!.fillStyle = color; context!.fillRect(0, 0, 1, 1);
      const pixel = context!.getImageData(0, 0, 1, 1).data;
      return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
    }
    function composite(front: number[], back: number[]) { return front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3])); }
    function luminance(color: number[]) {
      const v = color.slice(0, 3).map(n => { const x = n / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; });
      return v[0] * .2126 + v[1] * .7152 + v[2] * .0722;
    }
    function background(el: Element): number[] {
      const color = rgba(getComputedStyle(el).backgroundColor);
      return color[3] === 1 ? color : [...composite(color, el.parentElement ? background(el.parentElement) : [255, 255, 255]), 1];
    }
    const controls = [...root.querySelectorAll<HTMLElement>("button,input,select,textarea")].filter(visible).map(el => {
      const target = el.matches('input[type="file"].sr-only[tabindex="-1"]') ? el.closest("fieldset")?.querySelector("button") ?? el : el;
      const r = target.getBoundingClientRect(); return { width: r.width, height: r.height };
    });
    const ratios = [...root.querySelectorAll<HTMLElement>('p,h1,h2,h3,label,button,a,dt,dd,[data-slot="badge"]')]
      .filter(el => visible(el) && el.textContent?.trim() && !el.hasAttribute("disabled"))
      .map(el => { const backdrop = background(el), a = luminance(composite(rgba(getComputedStyle(el).color), backdrop)), b = luminance(backdrop); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
    const body = root.querySelector<HTMLElement>(".kay-drawer-body");
    return {
      width: innerWidth, surface: root.getAttribute("role") ?? root.tagName.toLowerCase(),
      overflow: document.documentElement.scrollWidth > innerWidth, surfaceOverflow: root.scrollWidth > root.clientWidth,
      minimumContrast: Math.min(...ratios), contrastSamples: ratios.length, controls,
      surfacePadding: getComputedStyle(root).padding, bodyPadding: body ? getComputedStyle(body).padding : null,
    };
  });
  expect(result.overflow).toBe(false); expect(result.surfaceOverflow).toBe(false);
  expect(result.contrastSamples).toBeGreaterThan(0); expect(result.controls.length).toBeGreaterThan(0);
  expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5);
  expect(result.controls.filter(v => v.width < 44 || v.height < 44)).toEqual([]);
  return result;
}

async function fullWidthCard(value: Locator) {
  const width = await value.evaluate(el => {
    const body = el.closest<HTMLElement>(".kay-drawer-body");
    if (!body) throw new Error("SYNTHETIC_FINANCE_DRAWER_BODY_MISSING");
    const style = getComputedStyle(body), room = body.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return { actual: el.getBoundingClientRect().width, room };
  });
  expect(Math.abs(width.actual - width.room)).toBeLessThanOrEqual(2);
}

test("Selected Finance visible Chrome: inline cards, guarded recovery, touch, roles and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(300_000);
  const actors: TestActor[] = [], errors: string[] = [], expectedErrors: string[] = [], expectedEndpoints = new Set<string>();
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await mobileContext.newPage();
  let profile: string | undefined, zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  let releaseLoading: (() => void) | undefined;
  function monitor(target: Page) {
    target.on("pageerror", () => errors.push("PAGE_ERROR"));
    target.on("console", message => {
      if (message.type() !== "error") return;
      const endpoint = new URL(message.location().url || "https://localhost").pathname;
      const code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED";
      if (expectedEndpoints.has(endpoint) && /status of (403|409)|net::ERR_CONNECTION_FAILED/.test(code)) expectedErrors.push(code);
      else errors.push(`CONSOLE_ERROR:${code}`);
    });
  }
  await mkdir(path.resolve("output/playwright"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const data = await financeFixture(page, actors); monitor(page); monitor(mobile);
    await expect(drawer(page).getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Finance", exact: true })).toHaveCount(0);
    await expect(drawer(page).getByText("Aucune commission prévue. Une affaire peut se clôturer sans saisie financière.", { exact: true })).toBeVisible();
    await capture(page, "empty-desktop", true);

    const create = drawer(page).getByRole("button", { name: "Prévoir une commission", exact: true });
    await create.focus(); await page.keyboard.press("Enter");
    const form = drawer(page).getByRole("form", { name: "Nouvelle commission", exact: true });
    await expect(form.getByLabel("Mode de commission", { exact: true })).toBeFocused();
    await form.getByRole("button", { name: "Enregistrer la commission prévue", exact: true }).click();
    await expect(form.getByRole("alert").filter({ hasText: "Vérifiez les champs" })).toBeVisible();
    await expect(form.getByLabel("Base explicite (MAD)", { exact: true })).toBeFocused();
    await capture(page, "invalid-desktop", true);
    await form.getByLabel("Base explicite (MAD)", { exact: true }).fill("1000000");
    await form.getByLabel("Montant de commission (MAD)", { exact: true }).fill("10000");
    const formGeometry = await geometry(page); expect(formGeometry.surface).toBe("dialog"); await saveCommission(page);

    const recognition = drawer(page).getByRole("button", { name: "Reconnaître la commission", exact: true });
    await recognition.focus(); await page.keyboard.press("Enter");
    const recognitionForm = drawer(page).getByRole("form", { name: "Reconnaissance de commission", exact: true });
    await expect(page.getByRole("alertdialog").getByRole("heading")).toBeFocused();
    await page.keyboard.press("Tab"); await page.keyboard.press("Escape");
    await expect(page.getByRole("alertdialog")).not.toBeVisible();
    await expect(recognitionForm.getByRole("button", { name: "Reconnaître la commission", exact: true })).toBeFocused();
    await page.keyboard.press("Enter"); await capture(page, "confirm-desktop");
    const dialogGeometry = await geometry(page); expect(dialogGeometry.surface).toBe("alertdialog");
    await confirmFinance(page, "Reconnaître la commission");
    await fillReceipt(page); await drawer(page).getByRole("button", { name: "Vérifier l’encaissement", exact: true }).click();
    await confirmFinance(page, "Confirmer l’encaissement");

    const listResponse = await page.request.get(`/api/v1/deals/${data.dealId}/commissions`);
    if (listResponse.status() !== 200) throw new Error("SYNTHETIC_FINANCE_LIST_UNAVAILABLE");
    const list = await listResponse.json(), cid = list.items[0].id as string;
    const record = card(page, cid);
    await expect(record.getByText("7\u202f500,00 MAD", { exact: true })).toBeVisible();
    await expect(record.getByRole("region", { name: "Encaissements et corrections", exact: true }).getByRole("listitem")).toHaveCount(1);
    const history = drawer(page).getByRole("region", { name: "Historique financier", exact: true });
    await expect(history.locator("ol > li")).toHaveCount(3);
    await expect(history.getByText("10\u202f000,00 MAD", { exact: true })).toHaveCount(3);
    await fullWidthCard(record); await capture(page, "finance-desktop", true);
    const desktopGeometry = await geometry(page); expect(desktopGeometry.surface).toBe("dialog");

    await signIn(mobile, data.manager); await openFinance(mobile, data.dealId);
    await expect(card(mobile, cid)).toBeVisible(); await expect(drawer(mobile).getByRole("table")).toHaveCount(0);
    await fullWidthCard(card(mobile, cid)); await capture(mobile, "finance-mobile", true);
    await card(mobile, cid).getByRole("button", { name: "Ajouter un encaissement", exact: true }).tap();
    const receipt = drawer(mobile).getByRole("form", { name: "Nouvel encaissement", exact: true });
    await receipt.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).tap();
    await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toBeFocused();
    await receipt.getByLabel("Montant encaissé (MAD)", { exact: true }).fill("7500,01");
    await receipt.getByLabel("Date de réception", { exact: true }).fill("2026-10-15");
    await receipt.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).tap();
    await expect(receipt.getByLabel("Justification du versement", { exact: true })).toBeFocused();
    await expect(receipt.getByLabel("Justification du versement", { exact: true })).toHaveAttribute("aria-describedby", /reason-error$/);
    await receipt.getByLabel("Justification du versement", { exact: true }).fill("SP16 excès synthétique à refuser");
    await expect(receipt.getByText("Chargement des justificatifs…", { exact: true })).toHaveCount(0);
    for (const width of [320, 360, 390, 768, 1024, 1440]) { await mobile.setViewportSize({ width, height: 900 }); expect((await geometry(mobile)).surface).toBe("dialog"); }
    await mobile.setViewportSize({ width: 320, height: 800 }); await capture(mobile, "narrow-320", true);
    await mobile.setViewportSize({ width: 390, height: 844 }); await capture(mobile, "form-mobile", true);

    expectedEndpoints.add(`/api/v1/commissions/${cid}/receipts`);
    await receipt.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).tap();
    await confirmFinance(mobile, "Confirmer l’encaissement");
    const excess = receipt.getByRole("alert").filter({ hasText: "dépasse le solde" });
    await expect(excess).toBeVisible(); await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toHaveValue("7500,01");
    await excess.scrollIntoViewIfNeeded(); await capture(mobile, "excess-mobile");
    await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toBeDisabled();
    await receipt.getByRole("button", { name: "Comparer la version financière actuelle", exact: true }).tap();
    const accept = receipt.getByRole("button", { name: "Conserver ma saisie avec cette version", exact: true });
    await expect(accept).toBeEnabled(); await capture(mobile, "comparison-mobile"); await accept.tap();
    await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toHaveValue("7500,01");
    await receipt.getByLabel("Montant encaissé (MAD)", { exact: true }).fill("100");
    await mobile.route(`**/api/v1/commissions/${cid}/receipts`, route => route.request().method() === "POST" ? route.abort("connectionfailed") : route.continue());
    await receipt.getByRole("button", { name: "Vérifier l’encaissement", exact: true }).tap();
    await confirmFinance(mobile, "Confirmer l’encaissement");
    const unavailable = receipt.getByRole("alert").filter({ hasText: "service local est indisponible" });
    await expect(unavailable).toBeVisible(); await unavailable.scrollIntoViewIfNeeded(); await capture(mobile, "error-mobile");
    await expect(receipt).toHaveAttribute("data-write-recovery", "true");
    await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toHaveValue("100");
    await expect(receipt.getByLabel("Montant encaissé (MAD)", { exact: true })).toBeDisabled();
    await expect(receipt.getByRole("button", { name: "Réessayer la même opération", exact: true })).toBeVisible();
    await mobile.unroute(`**/api/v1/commissions/${cid}/receipts`);
    await receipt.getByRole("button", { name: "Annuler", exact: true }).tap();
    const leaving = mobile.getByRole("alertdialog", { name: "Quitter la modification ?", exact: true });
    await expect(leaving).toBeVisible(); await leaving.getByRole("button", { name: "Quitter le formulaire", exact: true }).tap();
    await expect(receipt).toHaveCount(0); await expect(card(mobile, cid)).toContainText("7\u202f500,00 MAD");

    await record.getByRole("button", { name: "Corriger cet encaissement", exact: true }).click();
    const correction = drawer(page).getByRole("form", { name: "Correction d’encaissement", exact: true });
    await correction.getByLabel("Montant encaissé (MAD)", { exact: true }).fill("2000");
    await correction.getByLabel("Motif de correction", { exact: true }).fill("SP16 correction motivée avec original conservé");
    await correction.getByRole("button", { name: "Vérifier la correction", exact: true }).click();
    await confirmFinance(page, "Confirmer la correction d’encaissement");
    await expect(record.getByText("8\u202f000,00 MAD", { exact: true })).toBeVisible();
    await expect(record.getByRole("region", { name: "Encaissements et corrections", exact: true }).getByRole("listitem")).toHaveCount(2);
    await fullWidthCard(record); await capture(page, "correction-desktop", true);

    const held = new Promise<void>(resolve => { releaseLoading = resolve; });
    await page.route(`**/api/v1/deals/${data.dealId}/commissions?**`, async route => { await held; await route.continue(); });
    await page.goto(`/deals/${data.dealId}?tab=finance`);
    await expect(drawer(page).getByText("Chargement des commissions…", { exact: true })).toBeVisible();
    await capture(page, "loading-desktop", true); releaseLoading!(); releaseLoading = undefined;
    await expect(card(page, cid)).toBeVisible(); await page.unroute(`**/api/v1/deals/${data.dealId}/commissions?**`);

    profile = await mkdtemp(path.resolve("test-results/redesign-finance-zoom-"));
    const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    let zoom = zoomContext.pages()[0]; await signIn(zoom, data.manager);
    const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
    await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8"));
    prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    zoom = zoomContext.pages()[0]; monitor(zoom); await openFinance(zoom, data.dealId); await expect(card(zoom, cid)).toBeVisible();
    const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
    expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * .6);
    const zoomGeometry = await geometry(zoom); expect(zoomGeometry.surface).toBe("dialog");
    await fullWidthCard(card(zoom, cid)); await card(zoom, cid).scrollIntoViewIfNeeded(); await capture(zoom, "zoom-200");

    expectedEndpoints.add(`/api/v1/deals/${data.dealId}/commissions`);
    await page.route(`**/api/v1/deals/${data.dealId}/commissions?**`, route => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN" } }) }));
    await page.goto(`/deals/${data.dealId}?tab=finance`);
    await expect(drawer(page).getByRole("alert").filter({ hasText: "Cette opération n’est pas autorisée" })).toBeVisible();
    await expect(drawer(page).locator("[data-finance-id]")).toHaveCount(0);
    await expect(drawer(page).getByRole("form")).toHaveCount(0);
    await capture(page, "denied-desktop", true); await page.unroute(`**/api/v1/deals/${data.dealId}/commissions?**`);

    await clearActorContext(mobile); await signIn(mobile, data.agent); await mobile.goto(`/deals/${data.dealId}?tab=finance`);
    await expect(mobile.getByRole("button", { name: "Voir la finance", exact: true })).toHaveCount(0);
    await expect(drawer(mobile)).toHaveCount(0); await expect(mobile.getByRole("tab", { name: "Finance", exact: true })).toHaveCount(0);
    await expect(mobile.getByRole("tablist", { name: "Rubriques de l’affaire", exact: true }).getByRole("tab")).toHaveText(["Aperçu", "Projets", "Activités", "Tâches", "Documents"]);
    for (const route of [`deals/${data.dealId}/commissions`, `deals/${data.dealId}/commission-creation-key`, `commissions/${cid}`]) expect((await mobile.request.get(`/api/v1/${route}`)).status()).toBe(403);
    await geometry(mobile); await capture(mobile, "agent-mobile", true);
    console.info("Selected Finance prepared native observations", JSON.stringify({ browserVersion: browser.version(), formGeometry, dialogGeometry, desktopGeometry, zoomGeometry, baseline, measurement, expectedErrors, unexpectedErrors: errors }));
    expect(errors).toEqual([]);
  } finally {
    releaseLoading?.();
    await zoomContext?.close();
    if (profile) {
      expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results"));
      expect(path.basename(profile)).toMatch(/^redesign-finance-zoom-/);
      await rm(profile, { recursive: true, force: true });
    }
    await mobileContext.close(); await clearActorContext(page);
    for (const actor of actors.reverse()) await removeActor(actor);
  }
});
