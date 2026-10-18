import { chromium, type Page } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, clearActorContext, signIn } from "../helpers/auth";
import { createLead } from "../helpers/leads";
import { convertLead } from "../helpers/deals";
import { geometry } from "../helpers/report-review";

const artifacts = path.resolve("output/playwright/record-facts");
const syntheticName = "SP05 contact synthétique au nom long pour vérifier les coordonnées et leur retour à la ligne";

async function capture(page: Page, name: string) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, `${name}.png`) });
}

async function factsGeometry(page: Page, width: number) {
  const layout = page.locator(".crm-record-layout").first();
  const left = (await layout.locator(":scope > [data-record-contact]").boundingBox())!;
  const right = (await layout.locator(":scope > .crm-record-primary").boundingBox())!;
  if (width >= 1280) {
    expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(1);
    expect(right.x).toBeGreaterThanOrEqual(left.x + left.width + 15);
    expect(right.width).toBeGreaterThanOrEqual(left.width * 1.6);
  } else {
    expect(Math.abs(left.x - right.x)).toBeLessThanOrEqual(1);
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height + 15);
  }
  const facts = page.locator(".record-facts:visible");
  for (const list of await facts.all()) {
    const stackedLabels = await list.evaluate(element => Boolean(element.closest(".crm-detail-facts")));
    const pairs = list.locator(":scope > div");
    const first = (await pairs.nth(0).boundingBox())!, second = (await pairs.nth(1).boundingBox())!;
    if (width >= 1280 && await list.getAttribute("data-columns") !== "1") {
      expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
      expect(second.x).toBeGreaterThan(first.x + first.width);
    } else {
      expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1);
      expect(second.y).toBeGreaterThan(first.y);
    }
    for (const pair of await pairs.all()) {
      const term = pair.locator("dt"), value = pair.locator("dd");
      await expect(term.locator('svg[data-icon-family="iconsax"][aria-hidden="true"]')).toHaveCount(1);
      await expect(term.locator("svg")).toHaveCSS("width", "16px");
      const labelBox = (await term.boundingBox())!, valueBox = (await value.boundingBox())!;
      if (width >= 640 && !stackedLabels) expect(valueBox.x).toBeGreaterThan(labelBox.x + labelBox.width);
      else expect(valueBox.y).toBeGreaterThan(labelBox.y);
      expect(await value.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      for (const link of await value.locator(":scope > a").all()) {
        await expect(link).toHaveCSS("align-items", "flex-start");
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
  return geometry(page);
}

test("Lead/Deal facts: Iconsax, paired desktop details, mobile, keyboard, touch and safe failures", async ({ page, browser, baseURL, actor }) => {
  test.setTimeout(180_000);
  const owner = await createActor("agent", false, "SP06 responsable synthétique au nom particulièrement long pour la vérification responsive");
  const failures: string[] = [];
  page.on("pageerror", () => failures.push("PAGE_ERROR"));
  page.on("console", message => {
    if (message.type() === "error" && !/^Failed to load resource: (net::ERR_FAILED|the server responded with a status of (404|503))/.test(message.text())) failures.push("CONSOLE_ERROR");
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await signIn(page, owner);
    const lead = await createLead(page, syntheticName);
    const detail = await (await page.request.get(`/api/v1/enquiries/${lead}`)).json();
    const contact = page.getByRole("region", { name: "Contact", exact: true });
    await expect(contact.locator("dd").nth(1)).toHaveText(detail.contact.primary_phone);
    await expect(contact.locator("dd").nth(2)).toHaveText("Non renseigné");
    await expect(page.getByRole("heading", { name: "Attribution de la demande", exact: true })).toHaveCount(0);
    const editLead = page.getByRole("link", { name: "Modifier le prospect", exact: true });
    await editLead.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    expect(await editLead.evaluate(element => element.matches(":focus-visible"))).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Description", { exact: true })).toBeEnabled();
    await page.getByRole("link", { name: "Voir le prospect", exact: true }).click();
    const deal = await convertLead(page, "SP11 projet synthétique aux informations réparties");
    const summary = page.getByRole("region", { name: "Contact et offre liée", exact: true });
    await expect(summary.getByRole("link", { name: "Voir la demande d’origine conservée", exact: true })).toHaveAttribute("href", `/leads/${lead}`);
    await expect(summary.locator("dd").filter({ hasText: "SP11 projet synthétique aux informations réparties" })).toBeVisible();
    const metrics = [];
    for (const [name, route] of [["lead", `/leads/${lead}`], ["deal", `/deals/${deal}`]]) {
      await page.goto(route); await expect(page.locator(".record-facts").first()).toBeVisible();
      for (const width of [320, 360, 768, 1024, 1280, 1440, 1600]) {
        await page.setViewportSize({ width, height: 1100 });
        metrics.push({ route: name, ...(await factsGeometry(page, width)) });
        if (width === 360 || width === 1440 || width === 1600) {
          await page.evaluate(() => scrollTo(0, 0)); await capture(page, `${name}-${width}`);
        }
      }
      const hold = Promise.withResolvers<void>();
      const apiRoute = `**/api/v1/${name === "lead" ? "enquiries" : "deals"}/${name === "lead" ? lead : deal}`;
      await page.route(apiRoute, async route => { await hold.promise; await route.fulfill({ status: 503, json: { error: { code: "DEPENDENCY_UNAVAILABLE" } } }); });
      try {
        await page.reload();
        await expect(page.getByRole("status").filter({ hasText: name === "lead" ? "Chargement de la demande…" : "Chargement de l’affaire…" })).toBeVisible();
        await capture(page, `${name}-loading`);
      } finally { hold.resolve(); }
      await expect(page.locator("main").getByRole("alert")).toBeVisible();
      await expect(page.locator(".record-facts")).toHaveCount(0);
      await capture(page, `${name}-error`);
      await page.unroute(apiRoute);
      await page.getByRole("button", { name: "Réessayer", exact: true }).click();
      await expect(page.locator(".record-facts").first()).toBeVisible();
    }
    const editDeal = page.getByRole("button", { name: "Modifier l’affaire et la prochaine action", exact: true });
    await editDeal.click();
    await expect(page.getByRole("form", { name: "Modifier l’affaire", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Annuler les modifications", exact: true }).click();
    await expect(editDeal).toBeFocused();
    const touch = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 360, height: 900 }, ignoreHTTPSErrors: true });
    try {
      await touch.addCookies(await page.context().cookies());
      const mobile = await touch.newPage();
      await mobile.goto(`/deals/${deal}`);
      await mobile.getByRole("link", { name: "Voir la demande d’origine conservée", exact: true }).tap();
      await expect(mobile.getByRole("heading", { level: 1, name: syntheticName, exact: true })).toBeVisible();
      await mobile.getByRole("link", { name: syntheticName, exact: true }).tap();
      await expect(mobile.getByRole("heading", { name: `Contact : ${syntheticName}`, exact: true })).toBeVisible();
    } finally { await touch.close(); }
    await clearActorContext(page); await signIn(page, actor);
    await page.goto(`/leads/${lead}`);
    await expect(page.getByRole("heading", { name: "Attribution de la demande", exact: true })).toBeVisible();
    await expect(page.getByLabel("Attribuer à un agent du contact", { exact: true })).toBeEnabled();
    await capture(page, "lead-administrator");
    await clearActorContext(page);
    const outsider = await createActor("agent");
    try {
      await signIn(page, outsider);
      for (const route of [`/leads/${lead}`, `/deals/${deal}`]) {
        await page.goto(route);
        await expect(page.locator("main").getByRole("alert")).toHaveText("Cette fiche est introuvable ou vous n’y avez plus accès.");
        await expect(page.locator(".record-facts")).toHaveCount(0);
        await expect(page.getByText(syntheticName, { exact: true })).toHaveCount(0);
      }
      await capture(page, "denied");
    } finally { await clearActorContext(page); await removeActor(outsider); }
    await writeFile(path.join(artifacts, "geometry.json"), JSON.stringify(metrics, null, 2));
    expect(failures).toEqual([]);
  } finally { await clearActorContext(page); await removeActor(owner); }
});

test("Lead/Deal facts: native 200% Chrome zoom reflows both records", async ({ baseURL }, testInfo) => {
  test.setTimeout(120_000);
  const owner = await createActor("agent");
  const profile = testInfo.outputPath("record-facts-zoom-profile");
  const options = { channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, ignoreHTTPSErrors: true, args: ["--window-size=1440,1000"] };
  let context!: Awaited<ReturnType<typeof chromium.launchPersistentContext>>;
  let baseline: { ratio: number; width: number }, lead: string, deal: string;
  try {
    context = await chromium.launchPersistentContext(profile, options);
    const page = context.pages()[0]; await page.goto(`${baseURL}/login`); await signIn(page, owner);
    lead = await createLead(page); deal = await convertLead(page);
    baseline = await page.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
    await context.close();
    const preferencesPath = path.join(profile, "Default", "Preferences");
    const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
    preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
    await writeFile(preferencesPath, JSON.stringify(preferences));
    context = await chromium.launchPersistentContext(profile, options);
    const zoomPage = context.pages()[0];
    for (const [name, route] of [["lead", `/leads/${lead}`], ["deal", `/deals/${deal}`]]) {
      await zoomPage.goto(`${baseURL}${route}`);
      await expect(zoomPage.locator(".record-facts").first()).toBeVisible();
      const measurement = await zoomPage.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth }));
      expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1);
      expect(measurement.width).toBeLessThan(baseline.width * .6);
      await factsGeometry(zoomPage, measurement.width);
      await zoomPage.locator(".record-facts").first().scrollIntoViewIfNeeded();
      await mkdir(artifacts, { recursive: true }); await zoomPage.bringToFront();
      const session = await context.newCDPSession(zoomPage);
      const shot = await session.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile(path.join(artifacts, `${name}-zoom-200.png`), Buffer.from(shot.data, "base64"));
      await session.detach();
    }
  } finally {
    await context?.close();
    expect(path.basename(profile)).toBe("record-facts-zoom-profile");
    expect(path.dirname(path.dirname(path.resolve(profile)))).toBe(path.resolve("test-results"));
    await rm(profile, { recursive: true, force: true });
    await removeActor(owner);
  }
});
