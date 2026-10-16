import { chromium, type Page } from "@playwright/test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test, expect, createActor, removeActor, signIn, clearActorContext, type TestActor } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { staffCommand } from "../helpers/leads";
import { commandVisit, setVisitTimes } from "../helpers/schedule";
import { createTaskApi, createTaskUi, openTasks, runReminders, workFixture } from "../helpers/work";

test("SP15 settled empty notification French copy", async ({ page }) => {
  test.setTimeout(120_000); const actors: TestActor[] = [];
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
  try {
    await mkdir(path.resolve("output/playwright"), { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await workFixture(page, actors); await page.goto("/dashboard");
    await expect(page.getByText("0 notification(s) actuelle(s) non lue(s).", { exact: true })).toBeVisible();
    await expect(page.getByText("Aucune notification actuelle pour ce filtre. Les rappels programmés apparaîtront ici à partir de leur échéance.", { exact: true })).toBeVisible();
    await capture(page, "empty-desktop", true);
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor); }
});

async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  if (!name.startsWith("loading")) await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await cdp.send("Page.getLayoutMetrics") : undefined;
    const width = await page.evaluate(() => innerWidth);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}) });
    const bytes = Buffer.from(shot.data, "base64");
    await writeFile(path.resolve(`output/playwright/sp15-${name}.png`), bytes);
    if (["dashboard-desktop", "dashboard-mobile"].includes(name)) await writeFile(path.resolve(`../.impeccable/review/${name.endsWith("desktop") ? "desktop" : "mobile"}.png`), bytes);
  } finally { await cdp.detach(); }
}

async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.querySelector('[role="alertdialog"]') ?? document.querySelector("main") ?? document.body;
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    function luminance(color: string) { const v = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(n => { const x = n / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }
    function background(el: Element): string { const color = getComputedStyle(el).backgroundColor; return color !== "rgba(0, 0, 0, 0)" && color !== "transparent" ? color : el.parentElement ? background(el.parentElement) : "rgb(255, 255, 255)"; }
    const controls = [...root.querySelectorAll<HTMLElement>("button,input,select,textarea")].filter(visible).map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; });
    const ratios = [...root.querySelectorAll<HTMLElement>("p,h1,h2,h3,label,button,a")].filter(el => visible(el) && el.textContent?.trim() && !el.hasAttribute("disabled")).map(el => { const a = luminance(getComputedStyle(el).color), b = luminance(background(el)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, dialogOverflow: root.scrollWidth > root.clientWidth, minimumContrast: Math.min(...ratios), controls, dialogPadding: document.querySelector('[role="alertdialog"]') ? getComputedStyle(root).padding : null };
  });
  expect(result.overflow).toBe(false); expect(result.dialogOverflow).toBe(false); expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5); expect(result.controls.filter(v => v.width < 44 || v.height < 44)).toEqual([]);
  return result;
}

test("SP15 visible Chrome: work, inbox, retained task recovery, roles and actual 200%", async ({ page, browser, baseURL }) => {
  test.setTimeout(420_000); page.setDefaultTimeout(25_000); const actors: TestActor[] = [];
  const mobileContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 }, hasTouch: true, locale: "fr-FR", timezoneId: "Africa/Casablanca" });
  const mobile = await mobileContext.newPage(), errors: string[] = [], expectedErrors: string[] = [], expectedEndpoints = new Set<string>();
  let profile: string | undefined, zoomContext: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined;
  function monitor(target: Page) { target.on("pageerror", () => errors.push("PAGE_ERROR")); target.on("console", message => { if (message.type() !== "error") return; const location = new URL(message.location().url || "https://localhost").pathname; const code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED"; if (expectedEndpoints.has(location) && /status of (403|404|409|503)|net::ERR_CONNECTION_FAILED/.test(code)) expectedErrors.push(code); else errors.push(`CONSOLE_ERROR:${code}`); }); }
  monitor(page); monitor(mobile);
  await mkdir(path.resolve("output/playwright"), { recursive: true }); await mkdir(path.resolve("../.impeccable/review"), { recursive: true });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const { agent, contactId, now } = await workFixture(page, actors);
    await page.goto("/dashboard"); await expect(page.getByText("0 notification(s) actuelle(s) non lue(s).", { exact: true })).toBeVisible(); await capture(page, "empty-desktop", true);
    await openTasks(page, contactId); await page.getByRole("button", { name: "Créer une tâche", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(page.getByLabel("Titre de la tâche", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click(); await expect(page.getByRole("alert").filter({ hasText: "Renseignez le titre" })).toBeVisible(); await capture(page, "invalid-desktop", true);
    await page.getByRole("button", { name: "Fermer le formulaire", exact: true }).click(); await expect(page.getByRole("button", { name: "Créer une tâche", exact: true })).toBeFocused();
    const tid = await createTaskUi(page, contactId, new Date(now.getTime() - 60_000), "SP15 préparer le dossier de visite et rappeler le contact pour confirmer les documents");
    await capture(page, "task-desktop", true);
    await page.getByRole("button", { name: "Modifier la tâche", exact: true }).click(); await capture(page, "form-desktop", true); const desktopGeometry = await geometry(page);
    await page.getByLabel("Titre de la tâche", { exact: true }).fill("SP15 préparation du dossier actualisée"); await page.getByRole("button", { name: "Enregistrer la tâche", exact: true }).click(); await expect(page.getByRole("button", { name: "Modifier la tâche", exact: true })).toBeFocused();
    await signIn(mobile, agent); await mobile.goto(`/contacts/${contactId}?task=${tid}`); await mobile.getByRole("button", { name: "Modifier la tâche", exact: true }).tap();
    await mobile.getByLabel("Titre de la tâche", { exact: true }).fill("SP15 brouillon conservé malgré l’interruption");
    expectedEndpoints.add(`/api/v1/tasks/${tid}`); await mobile.route(`**/api/v1/tasks/${tid}`, route => route.request().method() === "PATCH" ? route.abort("connectionfailed") : route.continue());
    await mobile.getByRole("button", { name: "Enregistrer la tâche", exact: true }).tap(); const failure = mobile.getByRole("alert").filter({ hasText: "service local est indisponible" }); await expect(failure).toBeVisible(); await failure.scrollIntoViewIfNeeded(); await capture(mobile, "error-mobile");
    await expect(mobile.getByLabel("Titre de la tâche", { exact: true })).toHaveValue("SP15 brouillon conservé malgré l’interruption"); await mobile.unroute(`**/api/v1/tasks/${tid}`); await mobile.getByRole("button", { name: "Enregistrer la tâche", exact: true }).tap(); await expect(mobile.getByRole("button", { name: "Modifier la tâche", exact: true })).toBeVisible();
    await mobile.getByRole("button", { name: "Modifier la tâche", exact: true }).tap(); const current = await (await mobile.request.get(`/api/v1/tasks/${tid}`)).json();
    const concurrent = { title: "SP15 version concurrente", notes: current.notes, owner_user_id: current.owner_user_id, due_at: current.due_at, deal_id: current.deal_id, property_id: current.property_id, expected_version: current.version };
    expect((await staffCommand(page, `tasks/${tid}`, concurrent, "PATCH")).status()).toBe(200);
    await mobile.getByRole("button", { name: "Enregistrer la tâche", exact: true }).tap(); await expect(mobile.getByRole("alert").filter({ hasText: "Cette fiche a changé" })).toBeVisible();
    await mobile.getByRole("button", { name: "Comparer la version actuelle", exact: true }).tap(); await expect(mobile.getByRole("region", { name: "Version actuelle de la tâche", exact: true })).toContainText("SP15 version concurrente"); await mobile.getByRole("region", { name: "Version actuelle de la tâche", exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "conflict-mobile");
    await mobile.getByRole("button", { name: "Conserver ma saisie avec cette version", exact: true }).tap(); await expect(mobile.getByLabel("Titre de la tâche", { exact: true })).toHaveValue("SP15 brouillon conservé malgré l’interruption");
    for (const width of [320, 360, 390, 768, 1024, 1440]) { await mobile.setViewportSize({ width, height: 900 }); await geometry(mobile); }
    await mobile.setViewportSize({ width: 320, height: 800 }); await capture(mobile, "narrow-320", true); await mobile.setViewportSize({ width: 390, height: 844 }); await capture(mobile, "form-mobile", true);
    await mobile.getByRole("button", { name: "Enregistrer la tâche", exact: true }).tap(); await expect(mobile.getByRole("button", { name: "Modifier la tâche", exact: true })).toBeVisible(); expectedEndpoints.delete(`/api/v1/tasks/${tid}`);
    await page.goto(`/contacts/${contactId}?task=${tid}`); await page.getByRole("button", { name: "Terminer la tâche", exact: true }).focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("alertdialog").getByRole("heading")).toBeFocused(); await page.keyboard.press("Tab"); await page.keyboard.press("Escape"); await expect(page.getByRole("alertdialog")).not.toBeVisible(); await expect(page.getByRole("button", { name: "Terminer la tâche", exact: true })).toBeFocused();
    await page.keyboard.press("Enter"); await capture(page, "confirm-desktop"); const dialogGeometry = await geometry(page); await page.getByRole("alertdialog").getByRole("button", { name: "Terminer la tâche", exact: true }).click(); await expect(page.getByRole("alertdialog")).not.toBeVisible(); await expect(page.getByRole("region", { name: "Tâche sélectionnée", exact: true }).getByRole("heading", { level: 3 })).toBeFocused(); await capture(page, "completed-desktop", true);
    await createTaskApi(page, agent.id, contactId, new Date(now.getTime() - 60_000)); await runReminders(now);
    await commandVisit(page, agent.id, contactId, { type: "office", title: "SP15 visite échue à renseigner", start_at: new Date(now.getTime() - 7200_000).toISOString(), end_at: new Date(now.getTime() - 3600_000).toISOString() });
    await page.goto("/dashboard"); await page.getByLabel("Période des tâches", { exact: true }).selectOption("overdue"); await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link")).toHaveCount(1); await expect(page.getByRole("heading", { name: "Échéance de tâche", exact: true })).toBeVisible(); await expect(page.getByRole("region", { name: "Visites à renseigner", exact: true }).getByRole("link")).toHaveCount(1); await capture(page, "dashboard-desktop", true); const workGeometry = await geometry(page);
    await mobile.goto("/dashboard"); await mobile.getByLabel("Période des tâches", { exact: true }).selectOption("overdue"); await expect(mobile.getByRole("heading", { name: "Échéance de tâche", exact: true })).toBeVisible(); await capture(mobile, "dashboard-mobile", true); await mobile.getByRole("region", { name: "Notifications internes", exact: true }).scrollIntoViewIfNeeded(); await capture(mobile, "inbox-mobile"); const mobileGeometry = await geometry(mobile);
    await mobile.getByRole("button", { name: "Marquer comme lue", exact: true }).tap(); await expect(mobile.getByRole("heading", { name: "Notifications internes", exact: true })).toBeFocused(); await mobile.getByLabel("Notifications affichées", { exact: true }).selectOption("unread"); await expect(mobile.getByRole("heading", { name: "Échéance de tâche", exact: true })).toHaveCount(0); await mobile.getByLabel("Notifications affichées", { exact: true }).selectOption("read"); await expect(mobile.getByRole("heading", { name: "Échéance de tâche", exact: true })).toBeVisible(); await mobile.getByRole("button", { name: "Actualiser les notifications", exact: true }).tap(); await expect(mobile.getByRole("heading", { name: "Échéance de tâche", exact: true })).toBeVisible(); await mobile.getByRole("button", { name: "Actualiser le suivi des visites", exact: true }).tap(); await expect(mobile.getByRole("region", { name: "Visites à renseigner", exact: true }).getByRole("link")).toHaveCount(1); await capture(mobile, "followup-mobile");
    expectedEndpoints.add("/api/v1/tasks"); await page.route("**/api/v1/tasks?**", route => route.abort("connectionfailed")); await page.getByRole("button", { name: "Actualiser le travail", exact: true }).click(); await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("alert")).toBeVisible(); await capture(page, "list-error-desktop", true); await page.unroute("**/api/v1/tasks?**"); await page.getByRole("button", { name: "Actualiser le travail", exact: true }).click(); await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link")).toHaveCount(1); expectedEndpoints.delete("/api/v1/tasks");
    const reminderVisit = await commandVisit(page, agent.id, contactId, { type: "office", title: "SP15 visite et rappel à replanifier" });
    await runReminders(new Date("2030-01-06T10:30:00Z")); await page.goto("/dashboard");
    let reminderItem = page.getByRole("region", { name: "Notifications internes", exact: true }).getByRole("listitem").filter({ hasText: "Rappel de visite : J-1" });
    await expect(reminderItem).toHaveCount(1); await capture(page, "reminder-desktop", true); await reminderItem.getByRole("link").click();
    await page.getByRole("button", { name: "Modifier ou replanifier la visite", exact: true }).click(); await setVisitTimes(page, "2030-01-09T10:30", "2030-01-09T11:30"); await page.getByRole("button", { name: "Replanifier la visite", exact: true }).click(); await expect(page.getByText("Visite enregistrée. Son historique et son auteur sont conservés.", { exact: true })).toBeVisible();
    await page.goto("/dashboard"); await expect(page.getByRole("heading", { name: "Rappel de visite : J-1", exact: true })).toHaveCount(0); await capture(page, "obsolete-reminder-desktop", true);
    expect((await runReminders(new Date("2030-01-08T10:30:00Z"))).processed).toBe(1); await page.getByRole("button", { name: "Actualiser les notifications", exact: true }).click();
    reminderItem = page.getByRole("region", { name: "Notifications internes", exact: true }).getByRole("listitem").filter({ hasText: "Rappel de visite : J-1" }); await expect(reminderItem).toHaveCount(1); await reminderItem.scrollIntoViewIfNeeded(); await capture(page, "rescheduled-reminder-desktop"); await reminderItem.getByRole("link").click(); await expect(page).toHaveURL(new RegExp(`/visits/${reminderVisit}$`));
    await page.getByRole("button", { name: "Annuler la visite", exact: true }).click(); await page.getByRole("alertdialog").getByLabel("Motif d’annulation (obligatoire)", { exact: true }).fill("SP15 contrôle de l’invalidation"); await page.getByRole("alertdialog").getByRole("button", { name: "Annuler la visite", exact: true }).click(); await expect(page.getByRole("alertdialog")).not.toBeVisible(); expect((await runReminders(new Date("2030-01-09T09:30:00Z"))).processed).toBe(0);
    await page.goto("/dashboard"); await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link")).toHaveCount(1); await expect(page.getByText("Chargement du travail…", { exact: true })).toHaveCount(0);
    let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/v1/tasks?**", async route => { await held; await route.continue(); }); await page.getByRole("button", { name: "Actualiser le travail", exact: true }).click(); await expect(page.getByText("Chargement du travail…", { exact: true })).toBeVisible(); await capture(page, "loading-desktop", true); const resumed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/tasks" && response.status() === 200); release(); await resumed; await expect(page.getByRole("region", { name: "Travail à faire", exact: true }).getByRole("link")).toHaveCount(1); await page.unroute("**/api/v1/tasks?**");
    const manager = await createActor("manager", false, "SP06 SP15 responsable d’équipe"); actors.push(manager); await clearActorContext(mobile); await signIn(mobile, manager); await mobile.goto(`/contacts/${contactId}?task=${tid}`); await expect(mobile.getByText("Tâche conservée en lecture seule. Son historique reste disponible.", { exact: true })).toBeVisible(); await capture(mobile, "manager-mobile", true);
    const outsider = await createActor("agent", false, "SP06 SP15 tiers sans accès"); actors.push(outsider); await clearActorContext(mobile); await signIn(mobile, outsider); expectedEndpoints.add(`/api/v1/contacts/${contactId}`); await mobile.goto(`/contacts/${contactId}?task=${tid}`); await expect(mobile.getByRole("alert").filter({ hasText: "introuvable" })).toBeVisible(); await capture(mobile, "denied-mobile", true); expectedEndpoints.delete(`/api/v1/contacts/${contactId}`);
    profile = await mkdtemp(path.resolve("test-results/sp15-zoom-")); const launch = { baseURL, ignoreHTTPSErrors: true, channel: "chrome", headless: false, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] } as const;
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); let zoom = zoomContext.pages()[0]; await signIn(zoom, agent); const baseline = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); await zoomContext.close(); zoomContext = undefined;
    const prefsPath = path.join(profile, "Default", "Preferences"), prefs = JSON.parse(await readFile(prefsPath, "utf8")); prefs.partition = { ...prefs.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } }; await writeFile(prefsPath, JSON.stringify(prefs));
    zoomContext = await chromium.launchPersistentContext(profile, { ...launch, args: [...launch.args] }); zoom = zoomContext.pages()[0]; monitor(zoom); await zoom.goto(`${baseURL}/dashboard`); await expect(zoom.getByText("0 notification(s) actuelle(s) non lue(s).", { exact: true })).toBeVisible(); const measurement = await zoom.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth })); expect(measurement.ratio / baseline.ratio).toBeCloseTo(2, 1); expect(measurement.width).toBeLessThan(baseline.width * .6); await geometry(zoom); await capture(zoom, "zoom-200");
    const second = (await (await page.request.get(`/api/v1/tasks?contact_id=${contactId}`)).json()).items.find((item: { status: string }) => item.status === "open"); await zoom.goto(`${baseURL}/contacts/${contactId}?task=${second.id}`); await zoom.getByRole("button", { name: "Modifier la tâche", exact: true }).click(); await zoom.getByLabel("Échéance de la tâche (heure de Casablanca)", { exact: true }).scrollIntoViewIfNeeded(); await geometry(zoom); await capture(zoom, "zoom-form-200");
    console.info("SP15 native observations", JSON.stringify({ desktopGeometry, dialogGeometry, workGeometry, mobileGeometry, baseline, measurement, expectedErrors, unexpectedErrors: errors })); expect(errors).toEqual([]);
  } finally {
    await zoomContext?.close(); if (profile) { expect(path.dirname(path.resolve(profile))).toBe(path.resolve("test-results")); expect(path.basename(profile)).toMatch(/^sp15-zoom-/); await rm(profile, { recursive: true, force: true }); }
    await mobileContext.close(); await clearActorContext(page); await testControl("worker-start"); for (const actor of actors) await removeActor(actor);
  }
});
