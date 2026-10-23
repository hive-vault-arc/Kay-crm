import path from "node:path";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { test, expect, createActor, removeActor, signIn, clearActorContext } from "../helpers/auth";
import { staffCommand } from "../helpers/leads";
import { geometry } from "../helpers/report-review";
import { apiProcess } from "../helpers/api-process";

test("calendar reference: populated office, car and no-car visits", async ({ page, browser, baseURL }, info) => {
  test.setTimeout(240_000);
  const actor = await createActor("administrator", false, "SP06 calendrier synthétique");
  const agent = await createActor("agent", false, "SP06 agent calendrier synthétique");
  try {
    await page.setViewportSize({ width: 1586, height: 992 }); await signIn(page, actor);
    const policy = await (await page.request.get("/api/v1/visit-schedule/policy")).json();
    const body = { expected_version: policy.version, company_car_capacity_per_hour: 2,
      working_windows: Array.from({ length: 5 }, (_, i) => ({ weekday: i + 1, start_local: "08:00", end_local: "18:00" })),
      lunch_breaks: Array.from({ length: 5 }, (_, i) => ({ weekday: i + 1, start_local: "13:00", end_local: "14:00" })),
    };
    const preview = await staffCommand(page, "visit-schedule/policy/preview", body);
    expect(preview.status()).toBe(200);
    const saved = await staffCommand(page, "visit-schedule/policy", { ...body, preview_hash: (await preview.json()).preview_hash }, "PUT");
    expect(saved.status()).toBe(200);
    await clearActorContext(page); await signIn(page, agent);
    const created = await staffCommand(page, "enquiries", {
      new_contact: { name: "Client calendrier synthétique", type: "person", phones: [{ number: "+212600090002", label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", nationality: "MA", languages: ["french"] },
      message: "Demande synthétique calendrier", source: "phone", initial_budget: "500.000 DH - 1.000.000 DH", campaign_source: "facebook",
    });
    expect(created.status()).toBe(200);
    const leadId = (await created.json()).id;
    const contact = (await (await page.request.get(`/api/v1/enquiries/${leadId}`)).json()).contact.id;
    for (const [day, hour, type, title, confirmed] of [
      ["2026-10-19", "10", "company_car", "Visite synthétique avec véhicule", true],
      ["2026-10-20", "14", "without_company_car", "Visite synthétique sans véhicule", false],
      ["2026-10-21", "11", "office", "Rendez-vous synthétique au bureau", true],
      ["2026-10-23", "15", "office", "Suivi synthétique au bureau", false],
    ] as const) {
      const resolve = async (hour: string) => (await (await page.request.get(`/api/v1/calendar/local-time?local=${day}T${hour}:00`)).json()).choices[0].instant;
      const result = await staffCommand(page, "visits", { contact_id: contact, title, type, start_at: await resolve(hour), end_at: await resolve(String(Number(hour) + 1)), location: "Lieu synthétique de démonstration", participant_ids: [agent.id], overlap_reason: "", deal_id: null, property_id: null, status: "scheduled" });
      expect(result.status()).toBe(200);
      if (confirmed) {
        const response = await staffCommand(page, `visits/${(await result.json()).id}/confirm`, { expected_version: 1, reason: "Confirmation synthétique" });
        expect(response.status()).toBe(200);
      }
    }
    await page.goto("/visits");
    await page.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
    await expect(page.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready); await mkdir("output/playwright/calendar-reference", { recursive: true });
    await page.screenshot({ path: "output/playwright/calendar-reference/desktop.png", fullPage: true });
    const grid = page.getByRole("region", { name: "Grille horaire de la semaine, défilement horizontal et vertical", exact: true });
    await expect(grid.locator("a.calendar-visit")).toHaveCount(4);
    for (const [type, icon, count] of [["company_car", "car", 1], ["without_company_car", "contacts", 1], ["office", "development", 2]] as const) {
      const cards = grid.locator(`a[data-visit-kind="${type}"]`);
      await expect(cards).toHaveCount(count);
      await expect(cards.locator(`svg[data-kay-icon="${icon}"]`)).toHaveCount(count);
    }
    const periodBox = await page.locator(".calendar-period").boundingBox();
    const tabsBox = await page.getByRole("tablist", { name: "Présentation du calendrier" }).boundingBox();
    expect(Math.abs(periodBox!.y - tabsBox!.y)).toBeLessThan(12);
    await page.getByRole("checkbox", { name: "Au bureau", exact: true }).uncheck();
    await expect(page.getByText("2 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await expect(grid.locator("a.calendar-visit")).toHaveCount(2);
    await page.getByRole("checkbox", { name: "Au bureau", exact: true }).check();
    for (const name of ["Au bureau", "Sans véhicule de société", "Avec véhicule de société"]) await page.getByRole("checkbox", { name, exact: true }).uncheck();
    await expect(page.getByText("Aucune visite ne correspond aux filtres sélectionnés.", { exact: true })).toBeVisible();
    for (const name of ["Au bureau", "Sans véhicule de société", "Avec véhicule de société"]) await page.getByRole("checkbox", { name, exact: true }).check();
    await page.getByRole("checkbox", { name: "Planifiée", exact: true }).uncheck();
    await expect(page.getByText("2 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await expect(grid.locator("a[data-status=confirmed]")).toHaveCount(2);
    await page.getByRole("checkbox", { name: "Planifiée", exact: true }).check();
    await page.getByRole("tab", { name: "Agenda", exact: true }).click();
    await expect(page.locator(".calendar-agenda-visit")).toHaveCount(4);
    await page.getByRole("tab", { name: "Par type", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Avec véhicule de société", exact: true })).toBeVisible();
    await expect(page.locator(".calendar-agenda-visit")).toHaveCount(4);
    await page.getByRole("tab", { name: "Semaine", exact: true }).click();
    await page.getByRole("button", { name: "Règles et disponibilités", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Règles et disponibilités", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Règles et disponibilités", exact: true }).first()).toBeFocused();
    await page.getByRole("button", { name: "Semaine suivante", exact: true }).click();
    await expect(page.getByText("0 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Semaine précédente", exact: true }).click();
    await expect(page.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mois suivant", exact: true }).click();
    await expect(page.getByRole("heading", { name: /novembre 2026/i })).toBeVisible();
    await page.getByRole("button", { name: "Mois précédent", exact: true }).click();
    await page.getByRole("button", { name: "Semaine du 19 octobre 2026", exact: true }).click();
    await expect(page.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    const lunchRules = page.getByRole("button", { name: "Règles et disponibilités", exact: true }).last();
    await lunchRules.click(); await expect(page.getByRole("dialog", { name: "Règles et disponibilités", exact: true })).toBeVisible();
    await page.keyboard.press("Escape"); await expect(lunchRules).toBeFocused();
    await page.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
    const today = (await (await page.request.get("/api/v1/calendar/context")).json()).today;
    await expect(page.getByLabel("Semaine contenant le", { exact: true })).toHaveValue(today);
    await page.getByRole("link", { name: "Planifier une visite", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Planifier une visite", exact: true })).toBeVisible();
    await page.goto("/visits"); await page.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
    await expect(page.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    for (const width of [320, 360, 768, 1024, 1440, 1586]) {
      await page.setViewportSize({ width, height: 992 }); await geometry(page);
    }
    await page.setViewportSize({ width: 360, height: 844 });
    await expect(page.getByRole("region", { name: "Calendrier de la semaine", exact: true })).toBeVisible();
    await page.screenshot({ path: "output/playwright/calendar-reference/mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Afficher les filtres", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await geometry(page);
    await page.screenshot({ path: "output/playwright/calendar-reference/mobile-filters.png", fullPage: true });
    await page.keyboard.press("Escape");
    const touch = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 360, height: 844 }, hasTouch: true });
    try {
      const phone = await touch.newPage(); await signIn(phone, agent); await phone.goto("/visits");
      await phone.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
      await expect(phone.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
      await phone.getByRole("button", { name: "Afficher les filtres", exact: true }).tap();
      await phone.getByRole("checkbox", { name: "Au bureau", exact: true }).tap();
      await expect(phone.getByRole("checkbox", { name: "Au bureau", exact: true })).not.toBeChecked();
      await phone.getByRole("button", { name: "Fermer les filtres", exact: true }).tap();
      await expect(phone.locator(".calendar-agenda-visit")).toHaveCount(2); await geometry(phone);
      await phone.locator(".calendar-agenda-visit").first().getByRole("link").tap();
      await expect(phone.getByRole("heading", { name: "Historique de la visite", exact: true })).toBeVisible();
    } finally { await touch.close(); }
    const profile = info.outputPath("calendar-zoom-profile");
    const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    let zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] });
    try {
      let zoomPage = zoom.pages()[0]; await signIn(zoomPage, agent);
      const baseline = await zoomPage.evaluate(() => devicePixelRatio); await zoom.close();
      const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8"));
      prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
      await writeFile(prefsPath, JSON.stringify(prefs));
      zoom = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoomPage = zoom.pages()[0];
      await zoomPage.goto("/visits"); await zoomPage.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
      await expect(zoomPage.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
      expect(await zoomPage.evaluate(() => devicePixelRatio) / baseline).toBeCloseTo(2, 1); const measured = await geometry(zoomPage);
      await zoomPage.getByRole("button", { name: "Afficher les filtres", exact: true }).focus(); await zoomPage.keyboard.press("Enter");
      await expect(zoomPage.getByRole("dialog")).toBeVisible(); await zoomPage.keyboard.press("Escape");
      await expect(zoomPage.getByRole("button", { name: "Afficher les filtres", exact: true })).toBeFocused();
      await expect(zoomPage.locator('input[type="password"], [data-private-credential]')).toHaveCount(0); await zoomPage.bringToFront();
      const cdp = await zoom.newCDPSession(zoomPage);
      try { const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: false }); await writeFile("output/playwright/calendar-reference/native-zoom-200.png", Buffer.from(shot.data, "base64")); } finally { await cdp.detach(); }
      await writeFile("output/playwright/calendar-reference/geometry.json", JSON.stringify({ nativeZoom: 2, width: measured.width, minimumContrast: measured.minimumContrast, horizontalOverflow: measured.overflow, controlsUnder44: measured.controls.filter(control => control.width < 44 || control.height < 44).length }));
    } finally {
      await zoom.close(); expect(path.resolve(profile).startsWith(path.resolve("test-results") + path.sep)).toBe(true); expect(path.basename(profile)).toBe("calendar-zoom-profile"); await rm(profile, { recursive: true, force: true });
    }
  } finally { await clearActorContext(page); await removeActor(agent); await removeActor(actor); }
});

test("calendar real loading, empty week and backend outage/retry", async ({ page }) => {
  test.setTimeout(120_000);
  const actor = await createActor("agent", false, "SP06 calendrier états synthétiques");
  let release = () => {};
  try {
    await signIn(page, actor); await page.goto("/visits");
    await expect(page.getByText("0 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/v1/visits?**", async route => { await held; await route.continue(); });
    await page.getByRole("button", { name: "Actualiser les visites", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Chargement des visites…" })).toBeVisible();
    release(); await expect(page.getByText("0 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await page.unroute("**/api/v1/visits?**");
    await apiProcess("stop");
    await page.getByRole("button", { name: "Actualiser les visites", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "service local est indisponible" })).toBeVisible();
    await apiProcess("start"); await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(page.getByText("0 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
  } finally { release(); await apiProcess("start"); await clearActorContext(page); await removeActor(actor); }
});

test("calendar overlap lanes, short overnight visits and detail access stay reachable", async ({ page }) => {
  test.setTimeout(120_000);
  const agent = await createActor("agent", false, "SP06 calendrier chevauchements synthétiques");
  try {
    await page.setViewportSize({ width: 1440, height: 992 }); await signIn(page, agent);
    const created = await staffCommand(page, "enquiries", {
      new_contact: { name: "Client chevauchements synthétique", type: "person", phones: [{ number: "+212600090003", label: "Principal", is_primary: true }], emails: [], roles: ["buyer"], country: "MA", languages: ["french"] },
      message: "Demande synthétique de contrôle", source: "phone", initial_budget: "500000", campaign_source: "facebook",
    });
    expect(created.status()).toBe(200);
    const contact = (await (await page.request.get(`/api/v1/enquiries/${(await created.json()).id}`)).json()).contact.id;
    const resolve = async (local: string) => (await (await page.request.get(`/api/v1/calendar/local-time?local=${local}`)).json()).choices[0].instant;
    for (const [title, start, end] of [
      ...Array.from({ length: 4 }, (_, index) => [`Chevauchement synthétique ${index}`, "2026-10-19T10:00", "2026-10-19T11:00"]),
      ["Courte visite nocturne synthétique", "2026-10-19T23:55", "2026-10-20T00:05"],
    ]) {
      const result = await staffCommand(page, "visits", { contact_id: contact, title, type: "office", start_at: await resolve(start), end_at: await resolve(end), location: "Lieu synthétique", participant_ids: [agent.id], overlap_reason: "Chevauchement synthétique délibéré", deal_id: null, property_id: null, status: title.endsWith("3") ? "draft" : "scheduled" });
      expect(result.status()).toBe(200);
    }
    await page.goto("/visits"); await page.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
    await expect(page.getByText("5 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    const grid = page.getByRole("region", { name: "Grille horaire de la semaine, défilement horizontal et vertical", exact: true });
    await expect(grid.locator("a.calendar-visit")).toHaveCount(6);
    const overlaps = grid.getByRole("link", { name: /^Chevauchement synthétique/ });
    const boxes = await overlaps.evaluateAll(links => links.map(link => { const { x, y, width, height } = link.getBoundingClientRect(); return { x, y, width, height }; }));
    for (const box of boxes) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    for (let index = 1; index < boxes.length; index++) expect(boxes[index].x).toBeGreaterThanOrEqual(boxes[index - 1].x + boxes[index - 1].width - 1);
    const overnight = grid.getByRole("link", { name: /^Courte visite nocturne synthétique/ });
    await expect(overnight).toHaveCount(2);
    for (const visit of await overnight.all()) { await visit.scrollIntoViewIfNeeded(); const box = (await visit.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44); }
    await overnight.first().click(); await expect(page.getByRole("heading", { name: "Historique de la visite", exact: true })).toBeVisible();
    await page.goto("/visits"); await page.getByLabel("Semaine contenant le", { exact: true }).fill("2026-10-19");
    const draft = page.getByRole("checkbox", { name: "Brouillon", exact: true });
    await expect(draft).toBeChecked(); await draft.focus(); await page.keyboard.press("Space");
    await expect(page.getByText("4 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    await expect(draft).not.toBeChecked(); await expect(draft).toBeFocused();
    await page.keyboard.press("Space"); await expect(page.getByText("5 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
  } finally { await clearActorContext(page); await removeActor(agent); }
});
