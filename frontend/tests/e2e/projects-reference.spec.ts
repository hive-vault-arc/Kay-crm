import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chromium, request as apiRequest } from "@playwright/test";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { apiProcess, testControl } from "../helpers/api-process";
import { geometry } from "../helpers/report-review";

const fixtures = [
  ["oliviers", "Terrain des Oliviers", "land", "Secteur Ouest"],
  ["azur", "Appartement Azur", "apartment", "Secteur Littoral"],
  ["sable", "Villa Sable", "villa", "Secteur Jardin"],
  ["patio", "Appartement Patio", "apartment", "Secteur Centre"],
  ["solea", "Villa Soléa", "villa", "Secteur Colline"],
  ["cap", "Terrain du Cap", "land", "Secteur Littoral"],
  ["lumiere", "Appartement Lumière", "apartment", "Secteur Centre"],
  ["horizon", "Villa Horizon", "villa", "Secteur Ouest"],
] as const;

test("projects reference: eight real synthetic photos, cards and filters", async ({ page, browser, baseURL }, info) => {
  test.setTimeout(300_000);
  const manager = await createActor("administrator", false, "SP06 Administrateur");
  const transfer = await apiRequest.newContext({ ignoreHTTPSErrors: true });
  let throttledPermits = 0;
  page.on("response", response => { if (new URL(response.url()).pathname === "/api/v1/files/permits" && response.status() === 429) throttledPermits++; });
  try {
    await page.setViewportSize({ width: 1677, height: 938 }); await signIn(page, manager);
    await testControl("worker-start");
    for (const [index, [asset, name, category, location]] of fixtures.entries()) {
      const created = await staffCommand(page, "properties", { reference: `SP07-REF-${String(index + 1).padStart(2, "0")}`, category, marketing_name: name, location, area_sqm: "120" });
      expect(created.status()).toBe(200); const parent = (await created.json()).property_id;
      const source = await readFile(path.resolve(`tests/fixtures/projects-reference/${asset}.png`));
      const bytes = Buffer.from(await page.evaluate(async encoded => {
        const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        canvas.getContext("2d")!.drawImage(image, 0, 0); image.close();
        const webp = await new Promise<Blob>(resolve => canvas.toBlob((value: Blob | null) => resolve(value!), "image/webp", 0.82));
        return Array.from(new Uint8Array(await webp.arrayBuffer()));
      }, source.toString("base64")));
      const doc = await staffCommand(page, "documents", { parent_kind: "property", parent_id: parent, purpose: "photo", filename: `SP09 photo synthétique ${asset}.webp`, mime_type: "image/webp", size_bytes: bytes.length });
      expect(doc.status()).toBe(200); const document = await doc.json();
      const permitResponse = await staffCommand(page, "files/permits", { action: "upload", document_id: document.id, expected_version: document.version });
      expect(permitResponse.status()).toBe(200); const permit = await permitResponse.json();
      const identity = await (await page.request.get("/api/v1/auth/me")).json();
      const uploaded = await transfer.put(permit.transfer_url, { headers: { Origin: new URL(page.url()).origin, "X-File-Permit": permit.token, "X-File-Session": identity.csrf_token, "Content-Type": "image/webp" }, data: bytes });
      expect(uploaded.status()).toBe(200);
      await expect.poll(async () => (await (await page.request.get(`/api/v1/documents/${document.id}`)).json()).versions[0].state, { timeout: 60_000 }).toBe("clean");
    }
    await page.goto("/projects");
    await expect(page.locator("article")).toHaveCount(8);
    if (process.env.PROJECTS_BASELINE === "1") {
      await expect.poll(() => page.locator('article img[src^="blob:"]').count()).toBeGreaterThanOrEqual(1);
      await mkdir("output/playwright/projects-reference", { recursive: true });
      await page.screenshot({ path: "output/playwright/projects-reference/before.png", fullPage: true }); return;
    }
    await page.getByLabel("Trier par", { exact: true }).selectOption("reference");
    await expect.poll(async () => (await page.locator("article h2").first().textContent())?.trim()).toBe("Terrain des Oliviers");
    for (const card of await page.locator("article").all()) { await card.scrollIntoViewIfNeeded(); await expect(card.locator('img[src^="blob:"]')).toBeVisible({ timeout: 20_000 }); }
    await page.locator("article").first().scrollIntoViewIfNeeded();
    await page.evaluate(async () => { window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(resolve)); });
    await expect.poll(() => page.locator('article img[src^="blob:"]').count(), { timeout: 20_000 }).toBe(8);
    await page.evaluate(() => document.fonts.ready); await mkdir("output/playwright/projects-reference", { recursive: true });
    await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
    await page.screenshot({ path: "output/playwright/projects-reference/desktop.png", fullPage: true });
    const boxes = await page.locator("article").evaluateAll(cards => cards.map(card => card.getBoundingClientRect().toJSON()));
    expect(boxes.slice(0, 4).every(box => Math.abs(box.y - boxes[0].y) < 1)).toBe(true);
    expect(boxes[4].y).toBeGreaterThan(boxes[0].y + 100);
    await page.getByRole("checkbox", { name: "Villa", exact: true }).uncheck();
    await expect(page.locator("article")).toHaveCount(5);
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
    await expect(page.locator("article")).toHaveCount(8);
    const noCategories = page.waitForResponse(response => { const url = new URL(response.url()); return url.pathname === "/api/v1/properties" && url.searchParams.get("categories") === ""; }, { timeout: 15_000 });
    for (const name of ["Terrain", "Appartement", "Villa", "Local commercial"]) await page.getByRole("checkbox", { name, exact: true }).uncheck();
    expect((await noCategories).status()).toBe(200); await expect(page.getByRole("heading", { name: "Aucun bien correspondant", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click(); await expect(page.locator("article")).toHaveCount(8);
    await page.getByRole("tab", { name: "Liste", exact: true }).click();
    await expect(page.getByRole("table", { name: "Biens indépendants", exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Cartes", exact: true }).click();
    await page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true }).fill("Terrain");
    await expect(page.locator("article")).toHaveCount(2);
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click();
    await expect(page.locator("article")).toHaveCount(8);
    for (const width of [320, 360, 768, 1024, 1440, 1677]) { await page.setViewportSize({ width, height: 938 }); await geometry(page); }
    // Independent photo captures must not consume the rapid filter session's 30/min permit budget.
    await clearActorContext(page); await signIn(page, manager); await page.goto("/projects");
    await page.getByLabel("Trier par", { exact: true }).selectOption("reference");
    await expect(page.locator("article")).toHaveCount(8);
    await page.setViewportSize({ width: 360, height: 844 });
    for (const card of await page.locator("article").all()) { await card.scrollIntoViewIfNeeded(); await expect(card.locator('img[src^="blob:"]')).toBeVisible({ timeout: 20_000 }); }
    await page.evaluate(async () => { window.scrollTo(0, 0); await new Promise(resolve => requestAnimationFrame(resolve)); });
    await page.screenshot({ path: "output/playwright/projects-reference/mobile.png" });
    await page.getByRole("button", { name: "Afficher les filtres", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible(); await geometry(page);
    await page.screenshot({ path: "output/playwright/projects-reference/mobile-filters.png" });
    await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
    const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 844 }, hasTouch: true });
    try {
      const phone = await touch.newPage(); await signIn(phone, manager); await phone.goto("/projects");
      await expect(phone.locator("article")).toHaveCount(8); await phone.getByRole("button", { name: "Afficher les filtres", exact: true }).tap();
      await phone.getByRole("checkbox", { name: "Villa", exact: true }).tap();
      await phone.getByRole("button", { name: "Fermer les filtres", exact: true }).tap(); await expect(phone.locator("article")).toHaveCount(5);
      await phone.getByRole("button", { name: "Afficher les filtres", exact: true }).tap(); await phone.getByRole("button", { name: "Réinitialiser", exact: true }).tap();
      await phone.getByRole("button", { name: "Fermer les filtres", exact: true }).tap(); await expect(phone.locator("article")).toHaveCount(8);
      await phone.getByRole("link", { name: /^Ouvrir la fiche/ }).first().tap(); await expect(phone.getByRole("tab", { name: "Aperçu", exact: true })).toBeVisible();
    } finally { await touch.close(); }
    const profile = info.outputPath("projects-zoom-profile");
    const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    let zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    try {
      let zoomPage = zoom.pages()[0]; await signIn(zoomPage, manager); const baseline = await zoomPage.evaluate(() => devicePixelRatio); await zoom.close();
      const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8"));
      prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
      zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoomPage = zoom.pages()[0]; await zoomPage.goto("/projects");
      await expect(zoomPage.locator("article")).toHaveCount(8); expect(await zoomPage.evaluate(() => devicePixelRatio) / baseline).toBeCloseTo(2, 1);
      const measured = await geometry(zoomPage);
      await zoomPage.getByRole("button", { name: "Afficher les filtres", exact: true }).focus(); await zoomPage.keyboard.press("Enter");
      const villa = zoomPage.getByRole("checkbox", { name: "Villa", exact: true }); await villa.focus(); await zoomPage.keyboard.press("Space"); await expect(villa).not.toBeChecked();
      await zoomPage.keyboard.press("Escape"); await expect(zoomPage.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
      await expect(zoomPage.locator("article")).toHaveCount(5);
      await zoomPage.locator("article").first().scrollIntoViewIfNeeded();
      await expect(zoomPage.locator('article img[src^="blob:"]').first()).toBeVisible({ timeout: 20_000 });
      await expect(zoomPage.locator('input[type="password"], [data-private-credential]')).toHaveCount(0); await zoomPage.bringToFront();
      const cdp = await zoom.newCDPSession(zoomPage);
      try { const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false }); await writeFile("output/playwright/projects-reference/native-zoom-200.png", Buffer.from(shot.data, "base64")); } finally { await cdp.detach(); }
      await writeFile("output/playwright/projects-reference/geometry.json", JSON.stringify({ nativeZoom: 2, width: measured.width, minimumContrast: measured.minimumContrast, horizontalOverflow: measured.overflow, controlsUnder44: measured.controls.filter(control => control.width < 44 || control.height < 44).length, rapidFilterSessionThrottledPermits: throttledPermits }));
    } finally { await zoom.close(); expect(path.resolve(profile).startsWith(path.resolve("test-results") + path.sep)).toBe(true); expect(path.basename(profile)).toBe("projects-zoom-profile"); await rm(profile, { recursive: true, force: true }); }
  } finally { await transfer.dispose(); await testControl("worker-stop"); await clearActorContext(page); await removeActor(manager); }
});

test("projects campaigns, house category, numbered pages and real outage/retry", async ({ page }) => {
  test.setTimeout(150_000);
  const manager = await createActor("manager", false, "SP06 projets campagnes synthétiques"), agent = await createActor("agent", false, "SP06 projets lecture synthétique");
  let release = () => {};
  try {
    await page.setViewportSize({ width: 1440, height: 938 }); await signIn(page, manager);
    let house = "";
    for (let index = 0; index < 12; index++) {
      const result = await staffCommand(page, "properties", { reference: `SP07-PAG-${String(index).padStart(2, "0")}`, category: index ? "land" : "house", marketing_name: index ? `Terrain synthétique ${index}` : "Maison synthétique", location: "Lieu synthétique", area_sqm: null });
      expect(result.status()).toBe(200); if (!index) house = (await result.json()).property_id;
    }
    for (const kind of ["sale", "rental"] as const) {
      const current = await (await page.request.get(`/api/v1/properties/${house}`)).json();
      const result = await staffCommand(page, "offerings", { property_id: house, expected_property_version: current.version, kind, price_mad: kind === "sale" ? "1234567.89" : "9000.50", currency: "MAD", price_period: kind === "sale" ? null : "month", conditions: "Conditions synthétiques" }); expect(result.status()).toBe(200);
    }
    await page.goto("/projects"); await expect(page.locator("article")).toHaveCount(12);
    await page.getByLabel("Trier par", { exact: true }).selectOption("reference");
    await expect(page.locator("article").first().getByRole("heading", { name: "Maison synthétique", exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Maison", exact: true })).toBeChecked();
    await page.getByLabel("Type d’offre", { exact: true }).selectOption("rental"); await expect(page.locator("article")).toHaveCount(1);
    await expect(page.locator("article")).toContainText("Brouillon"); await expect(page.locator("article")).toContainText("Comparaison annuelle");
    await expect(page.locator("article")).toContainText(/9.000,50/); await expect(page.locator("article")).toContainText(/108.006,00/);
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click(); await expect(page.locator("article")).toHaveCount(12);
    await page.getByText("Filtres avancés des biens", { exact: true }).click(); await page.getByLabel("Biens par page", { exact: true }).selectOption("10");
    await expect(page.locator("article")).toHaveCount(10); await page.getByRole("navigation", { name: "Pages des biens", exact: true }).getByRole("button", { name: "Suivant", exact: true }).click(); await expect(page.locator("article")).toHaveCount(2);
    await page.getByRole("checkbox", { name: "Terrain", exact: true }).uncheck(); await expect(page.locator("article")).toHaveCount(1);
    await page.getByRole("button", { name: "Réinitialiser", exact: true }).click(); await expect(page.locator("article")).toHaveCount(12);
    const held = new Promise<void>(resolve => { release = resolve; }); await page.route("**/api/v1/properties?**", async route => { await held; await route.continue(); });
    await page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true }).fill("introuvable synthétique");
    await expect(page.getByRole("status", { name: "Chargement des cartes de biens", exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Terrain", exact: true })).toBeDisabled(); release();
    await expect(page.getByRole("heading", { name: "Aucun bien correspondant", exact: true })).toBeVisible(); await page.unroute("**/api/v1/properties?**");
    await apiProcess("stop"); await page.getByLabel("Rechercher un nom, une référence ou un lieu", { exact: true }).fill("indisponible");
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible(); await apiProcess("start"); await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aucun bien correspondant", exact: true })).toBeVisible();
    await clearActorContext(page); await signIn(page, agent); await page.goto("/projects"); await expect(page.locator("article")).toHaveCount(12);
    await page.getByLabel("Type d’offre", { exact: true }).selectOption("rental"); await expect(page.locator("article")).toHaveCount(1);
    const denial = await staffCommand(page, "offerings", { property_id: house, expected_property_version: 1, kind: "sale", price_mad: "1000", currency: "MAD", price_period: null, conditions: "Tentative synthétique interdite" }); expect(denial.status()).toBe(403);
    await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click(); await expect(page.getByText("0 programme(s) correspondant(s).", { exact: true })).toBeVisible(); await expect(page.getByRole("link", { name: "Créer un programme immobilier", exact: true })).toBeVisible();
  } finally { release(); await apiProcess("start"); await clearActorContext(page); await removeActor(agent); await removeActor(manager); }
});
