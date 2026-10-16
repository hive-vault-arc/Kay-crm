import { mkdir, writeFile } from "node:fs/promises";
import { test, expect, signIn, clearActorContext, removeActor, type TestActor } from "../helpers/auth";
import { reportFixture } from "../helpers/reports";
import { configureSchedule, commandVisit } from "../helpers/schedule";
import { geometry } from "../helpers/report-review";
import { uploadFile, syntheticFile } from "../helpers/files";
import { testControl } from "../helpers/api-process";
import { inspectIcons } from "../helpers/icons";

test.use({ hasTouch: true });

test("Approved V3: nine compositions, unpictured routes and contextual panels", async ({ page, actor }) => {
  test.setTimeout(420000);
  const actors: TestActor[] = [], captures: string[] = [], errors: string[] = [];
  const output = process.env.KAY_ICON_REVIEW === "1" ? "output/playwright/iconsax" : "output/playwright/v3";
  const iconCoverage: { capture: string; icons: string[] }[] = [], externalIcons: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (/iconsax|unpkg|jsdelivr/.test(url.hostname)) externalIcons.push(url.hostname); });
  await mkdir(output, { recursive: true });
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => {
    if (message.type() !== "error" || /status of (403|404)\b/.test(message.text())) return;
    const attribute = message.text().match(/<[^>]+> attribute[^\n]{0,140}/)?.[0];
    const code = message.text().match(/net::ERR_[A-Z_]+|status of [0-9]{3}/)?.[0] ?? "UNCLASSIFIED";
    errors.push(attribute ?? `${code}:${new URL(message.location().url || "https://localhost").pathname}`);
  });
  async function capture(name: string, full = false) {
    await expect(page.locator('[role="status"]').filter({ hasText: /Chargement|Vérification|Résolution/ })).toHaveCount(0);
    expect(await page.locator('input[type="password"], [data-private-credential]').evaluateAll(fields => fields.every(field => !(field as HTMLInputElement).value))).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => [...document.images].filter(img => {
      const box = img.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.top < innerHeight && box.bottom > 0 && img.checkVisibility();
    }).every(img => img.complete && img.naturalWidth > 0));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].filter(img => {
        const box = img.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.top < innerHeight && box.bottom > 0 && img.checkVisibility();
      }).map(img => img.decode()));
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    // The restricted password-change page intentionally has no interface icons.
    iconCoverage.push({ capture: name, icons: await inspectIcons(page, name === "change-password" ? 0 : 1) });
    await page.screenshot({ path: `${output}/${name}.png`, fullPage: full, animations: "disabled" });
    captures.push(name);
  }
  async function visit(path: string, name: string, full = false) {
    await page.goto(path); await expect(page.locator("main h1")).toBeVisible(); await capture(name, full); await geometry(page);
  }
  try {
    await page.setViewportSize({ width: 1586, height: 992 });
    await page.goto("/login"); await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled(); await capture("01-login");
    await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click(); await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
    const data = await reportFixture(page, actors);
    await clearActorContext(page); await signIn(page, actor);
    await visit("/dashboard", "02-dashboard");
    const wonBar = page.getByRole("region", { name: "Pipeline des affaires", exact: true }).locator('svg rect[fill="var(--status-success-foreground)"]');
    await expect(wonBar).toHaveCount(1); await expect(wonBar).toBeVisible(); expect(Number(await wonBar.getAttribute("width"))).toBeGreaterThan(0); expect(errors).toEqual([]);
    await visit("/leads", "03-leads"); await expect(page.locator("tbody a").first()).toHaveAccessibleDescription(/\+\d/); await visit("/deals", "03-deals");
    await page.setViewportSize({ width: 1502, height: 1047 }); await visit("/leads/new", "04-lead-form", true);
    const enquiries = await (await page.request.get(`/api/v1/enquiries?contact_id=${data.contact}`)).json(); const lead = enquiries.items[0].id as string;
    await page.setViewportSize({ width: 1045, height: 1505 }); await visit(`/leads/${lead}`, "05-lead-record", true);
    const facts = page.locator("main dl").first(); expect(await facts.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)).toBe(1);
    await page.setViewportSize({ width: 1586, height: 992 });
    await page.goto("/settings/working-hours"); await configureSchedule(page);
    await commandVisit(page, data.agent.id, data.contact, { type: "office", title: "V3 visite bureau synthétique", start_at: "2030-01-07T09:00:00Z", end_at: "2030-01-07T10:00:00Z" });
    await commandVisit(page, data.agent.id, data.contact, { title: "V3 visite véhicule synthétique", start_at: "2030-01-07T14:00:00Z", end_at: "2030-01-07T15:00:00Z" });
    await page.goto("/visits"); await page.getByLabel("Semaine contenant le", { exact: true }).fill("2030-01-07"); await expect(page.getByText("2 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible(); await capture("06-calendar"); await geometry(page);
    for (let i = 0; i < 3; i++) await commandVisit(page, data.agent.id, data.contact, { type: "office", title: `V3 chevauchement synthétique ${i + 1}`, start_at: "2030-01-07T09:00:00Z", end_at: "2030-01-07T10:00:00Z" });
    await page.getByRole("button", { name: "Actualiser les visites", exact: true }).click(); await expect(page.getByText("5 visite(s) accessible(s) cette semaine.", { exact: true })).toBeVisible();
    const denseGrid = page.getByRole("region", { name: "Grille horaire de la semaine, défilement horizontal et vertical", exact: true });
    const denseTargets = await denseGrid.getByRole("link").evaluateAll(links => links.map(link => ({ width: link.getBoundingClientRect().width, height: link.getBoundingClientRect().height })));
    expect(denseTargets).toHaveLength(5); expect(denseTargets.every(target => target.width >= 44 && target.height >= 44)).toBe(true); await capture("calendar-dense-overlap"); await geometry(page);
    await page.goto("/projects"); await page.getByRole("tab", { name: "Programmes immobiliers", exact: true }).click(); await expect(page.getByRole("link", { name: data.stock.reference, exact: true })).toBeVisible(); await capture("07-projects");
    await visit(`/projects/${data.stock.did}`, "08-project-record");
    await page.getByRole("tab", { name: "Unités", exact: true }).click(); await capture("08-project-units");
    await visit("/settings/users", "09-users"); await expect(page.locator("tbody a").first()).toHaveAccessibleDescription(/@example\.com/);
    for (const [path, name] of [
      ["/leads?view=contacts", "contacts-list"], ["/leads?view=import", "contact-import"], ["/leads?view=exports", "exports"],
      [`/leads/${lead}/edit`, "lead-edit"], [`/deals/new?contact_id=${data.contact}`, "deal-create"],
      [`/deals/${data.deal}`, "deal-record"], ["/projects/new", "project-create"], [`/projects/${data.stock.did}/edit`, "project-edit"],
      ["/projects/properties/new", "property-create"], [`/projects/properties/${data.stock.sid}`, "property-record"],
      [`/projects/properties/${data.stock.sid}/edit`, "property-edit"], ["/settings", "settings"],
      ["/settings/users/new", "staff-create"], [`/settings/users/${actor.id}/edit`, "staff-edit"],
      ["/settings/working-hours", "working-hours"], ["/dashboard?view=audit", "audit"],
      [`/visits/new?contact_id=${data.contact}`, "visit-create"], ["/change-password", "change-password"],
    ]) await visit(path, name);
    await visit(`/contacts/${data.contact}`, "contact-record");
    for (const label of ["Identité", "Demandes", "Historique", "Attributions", "Documents", "Recherches", "Affaires", "Tâches"]) {
      await page.getByRole("tab", { name: label, exact: true }).click(); await capture(`contact-tab-${label}`); await geometry(page);
    }
    await page.getByRole("button", { name: "Créer une tâche", exact: true }).click(); await capture("task-form"); await geometry(page);
    await page.goto(`/deals/${data.deal}`); await page.getByRole("tab", { name: "Finance", exact: true }).click(); await expect(page.getByText("Aucune commission pour cette affaire. Aucune saisie financière n’est requise pour la clôturer.", { exact: true })).toBeVisible(); await capture("finance-empty", true);
    await page.getByRole("button", { name: "Prévoir une commission", exact: true }).click(); await expect(page.getByRole("button", { name: "Enregistrer la commission prévue", exact: true })).toBeVisible(); await capture("commission-form", true); await geometry(page);
    await page.goto(`/projects/${data.stock.did}`);
    for (const label of ["Blocs et étages", "Types réutilisables", "Présentation", "Propriétaires", "Offres du programme", "Historique"]) {
      await page.getByRole("tab", { name: label, exact: true }).click(); await capture(`project-tab-${label}`); await geometry(page);
    }
    await page.getByRole("button", { name: "Rechercher", exact: true }).click(); await expect(page.getByRole("dialog", { name: "Recherche globale", exact: true })).toBeVisible(); await capture("global-search"); await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Ouvrir les notifications", exact: true }).click(); await expect(page.getByRole("dialog", { name: "Votre boîte de réception", exact: true })).toBeVisible(); await capture("notification-sheet"); await page.getByRole("button", { name: "Fermer les notifications", exact: true }).click();
    await page.goto("/leads/new");
    for (const width of [320, 360, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); await geometry(page); }
    await page.setViewportSize({ width: 390, height: 844 }); await capture("lead-form-mobile", true);
    await page.getByRole("button", { name: "Ouvrir la navigation", exact: true }).tap(); await capture("navigation-mobile");
    await page.getByRole("dialog", { name: "Navigation KAY", exact: true }).getByRole("link", { name: "Projets", exact: true }).tap(); await expect(page.locator("main h1")).toBeFocused(); await capture("inventory-mobile", true); await geometry(page);
    await visit("/dashboard", "dashboard-mobile", true); await visit(`/leads/${lead}`, "lead-record-mobile", true);
    await page.emulateMedia({ reducedMotion: "reduce" }); expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(errors).toEqual([]);
    expect(externalIcons).toEqual([]);
    await writeFile(`${output}/captures.json`, JSON.stringify({ captures, iconCoverage, externalIconRequests: externalIcons.length, unexpectedErrors: errors.length, reducedMotion: true, widths: [320, 360, 390, 768, 1024, 1440] }, null, 2));
    console.info("V3_REVIEW", JSON.stringify({ captures: captures.length, unexpectedErrors: errors.length }));
  } finally { await clearActorContext(page); for (const value of actors) await removeActor(value); }
});

test("Approved V3: inventory card uses only an authorized antivirus-clean real image", async ({ page, actor }) => {
  test.setTimeout(180000); const actors: TestActor[] = [];
  try {
    const data = await reportFixture(page, actors);
    await clearActorContext(page); await signIn(page, actor); await page.goto(`/projects/properties/${data.stock.sid}`);
    await testControl("worker-stop"); await uploadFile(page, await syntheticFile("clean", "V3 photographie synthétique.png"));
    const metadata = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/documents" && new URL(response.url()).searchParams.get("parent_id") === data.stock.sid);
    await page.goto("/projects"); expect((await metadata).status()).toBe(200);
    const pendingCard = page.getByRole("article").filter({ has: page.getByRole("link", { name: `${data.stock.reference}-VILLA`, exact: true }) }); await expect(pendingCard.locator("img")).toHaveCount(0);
    await page.goto(`/projects/properties/${data.stock.sid}`); await testControl("worker-start"); await expect(page.getByText("Analyse réussie", { exact: true })).toBeVisible({ timeout: 20000 });
    await page.goto("/projects"); const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: `${data.stock.reference}-VILLA`, exact: true }) });
    const image = card.locator('img[src^="blob:"]'); await expect(image).toBeVisible(); expect(await image.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.goto(`/projects/properties/${data.stock.sid}`); await expect(page.getByRole("button", { name: "Afficher V3 photographie synthétique.png", exact: true })).toBeEnabled();
  } finally { await testControl("worker-start"); await clearActorContext(page); for (const value of actors) await removeActor(value); }
});
