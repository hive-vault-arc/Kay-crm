import { createElement } from "react";
import { chromium } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, mkdir, writeFile, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { test, expect, signIn } from "../helpers/auth";
import * as Icons from "../../src/components/icons";
import { Checkbox } from "../../src/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../src/components/ui/radio-group";
import { NativeSelect } from "../../src/components/ui/native-select";
import { DataState } from "../../src/components/shared/data-state";
import { inspectIcons } from "../helpers/icons";

test("Iconsax: all verified glyphs SSR, accessibility, native controls and offline vectors", async ({ page }) => {
  const manifest = JSON.parse(await readFile("../docs/reference/iconsax/assets.json", "utf8")) as { icons: { export: string; semanticName: string; pathCount: number; viewBox: string }[] };
  const names = Object.keys(Icons).sort();
  expect(names).toEqual(manifest.icons.map(icon => icon.export).sort());
  expect(names).toHaveLength(43);
  const cells: string[] = [];
  for (const entry of manifest.icons) {
    const Component = Icons[entry.export as keyof typeof Icons];
    const html = renderToStaticMarkup(createElement(Component, { size: 24 }));
    expect(html).toContain('aria-hidden="true"'); expect(html).toContain('focusable="false"');
    expect(html).toContain(`data-kay-icon="${entry.semanticName}"`);
    expect(html).toContain(`viewBox="${entry.viewBox}"`);
    expect(html.match(/<path /g)).toHaveLength(entry.pathCount);
    expect(html).not.toMatch(/<script|<use|<image|<foreignObject|\bid=|href=|url\(/);
    const labelled = renderToStaticMarkup(createElement(Component, { label: "Repère synthétique" }));
    expect(labelled).toContain('role="img"'); expect(labelled).toContain('aria-label="Repère synthétique"');
    expect(labelled).not.toContain('aria-hidden=');
    cells.push(`<div class="cell">${html}<span>${entry.semanticName}</span></div>`);
  }
  const controls = renderToStaticMarkup(createElement("div", { className: "controls" },
    createElement(Checkbox, { defaultChecked: true, "aria-label": "Sélection synthétique" }),
    createElement(RadioGroup, { defaultValue: "sale", "aria-label": "Choix synthétique" },
      createElement(RadioGroupItem, { value: "sale", "aria-label": "Vente" })),
    createElement(NativeSelect, { "aria-label": "Filtre synthétique", defaultValue: "sale" },
      createElement("option", { value: "sale" }, "Vente")),
    createElement(DataState, { state: "empty", title: "Aucun dossier synthétique", description: "État vide de vérification." }),
    createElement(DataState, { state: "error", title: "Erreur synthétique", description: "État de vérification sans données réelles." }),
  ));
  const failures: string[] = [];
  page.on("request", () => failures.push("UNEXPECTED_ASSET_REQUEST"));
  await page.context().setOffline(true);
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.setContent(`<html lang="fr"><head><title>Vérification Iconsax synthétique</title><style>
    body{font:14px system-ui;color:#263d57;background:#fff;margin:32px}.icons{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px}.cell{display:flex;align-items:center;gap:12px;min-height:40px}.controls{display:grid;gap:16px;margin-top:32px}.controls svg{width:20px;height:20px}.controls [role=radio] svg{fill:currentColor}
  </style></head><body><h1>Iconsax : vérification synthétique</h1><div class="icons">${cells.join("")}</div>${controls}</body></html>`);
  const seen = await inspectIcons(page);
  expect(seen).toEqual(manifest.icons.map(icon => icon.semanticName).sort());
  expect(failures).toEqual([]);
  await mkdir("output/playwright/iconsax", { recursive: true });
  await page.screenshot({ path: "output/playwright/iconsax/00-verified-glyphs-and-controls.png", fullPage: true });
  await writeFile("output/playwright/iconsax/glyphs.json", JSON.stringify({ glyphs: seen, serverRendered: names.length, offlineAssetRequests: failures.length }, null, 2));
  await page.context().setOffline(false);
});

test("Iconsax: real Next HTML before hydration, disabled JavaScript and authenticated shell", async ({ page, browser, baseURL, actor }) => {
  const errors: string[] = [], remote: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error") errors.push("CONSOLE_ERROR"); });
  page.on("request", request => { if (/iconsax|unpkg|jsdelivr/.test(new URL(request.url()).hostname)) remote.push("EXTERNAL_ICON_REQUEST"); });
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  const loginIcons = ["email", "password", "sign-in", "contact", "contacts", "show-password"];
  const loginHtml = await response!.text();
  for (const name of loginIcons) expect(loginHtml).toContain(`data-kay-icon="${name}"`);
  await expect(page.getByRole("button", { name: "Afficher le mot de passe", exact: true })).toBeEnabled();
  expect(await inspectIcons(page)).toEqual([...loginIcons].sort());
  await mkdir("output/playwright/login-icons", { recursive: true });
  for (const width of [320, 360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ["Adresse e-mail", "Mot de passe"]) {
      const input = page.getByLabel(label, { exact: true });
      await expect(input).toHaveAccessibleName(label);
      expect(await input.evaluate(element => getComputedStyle(element).borderRadius)).toBe("10px");
      expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator("form label").evaluateAll(labels => labels.every(label => {
      const icon = label.querySelector("svg")!;
      return icon.getBoundingClientRect().width === 16 && getComputedStyle(label).gap === "8px";
    }))).toBe(true);
    for (const button of await page.locator("form button").all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if ([360, 768, 1440].includes(width))
      await page.screenshot({ path: `output/playwright/login-icons/login-${width}.png`, fullPage: true });
  }
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Adresse e-mail", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Mot de passe", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Afficher le mot de passe", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveAttribute("type", "text");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
  await expect(page.locator('svg[data-kay-icon="hide-password"]')).toBeVisible();
  await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
  const noJS = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, javaScriptEnabled: false, locale: "fr-FR" });
  try {
    const initial = await noJS.newPage(); await initial.goto("/login");
    for (const name of loginIcons) await expect(initial.locator(`svg[data-kay-icon="${name}"]`)).toBeVisible();
    expect(await initial.locator("svg path").count()).toBeGreaterThan(0);
  } finally { await noJS.close(); }
  await signIn(page, actor);
  const server = await page.request.get("/dashboard"); expect(server.status()).toBe(200);
  const html = await server.text();
  for (const name of ["dashboard", "contacts", "deal", "calendar", "property", "settings", "notification", "search"])
    expect(html).toContain(`data-kay-icon="${name}"`);
  await inspectIcons(page);
  expect(errors).toEqual([]); expect(remote).toEqual([]);
});

test("Iconsax login: actual 200% Chrome zoom keeps labels, icons and controls usable", async ({ baseURL }) => {
  await mkdir("test-results", { recursive: true });
  const profile = await mkdtemp(path.resolve("test-results/login-zoom-"));
  const options = { channel: "chrome", headless: false, ignoreHTTPSErrors: true, viewport: null, deviceScaleFactor: undefined, args: ["--window-size=1440,1000"] };
  let context = await chromium.launchPersistentContext(profile, options);
  let baselineRatio: number, baselineWidth: number;
  try {
    const page = context.pages()[0]; await page.goto(`${baseURL}/login`);
    baselineRatio = await page.evaluate(() => devicePixelRatio);
    baselineWidth = await page.evaluate(() => innerWidth);
  } finally { await context.close(); }
  const preferencesPath = path.join(profile, "Default", "Preferences");
  const preferences = JSON.parse(await readFile(preferencesPath, "utf8"));
  preferences.partition = { ...preferences.partition, default_zoom_level: { x: Math.log(2) / Math.log(1.2) } };
  await writeFile(preferencesPath, JSON.stringify(preferences));
  context = await chromium.launchPersistentContext(profile, options);
  try {
    const page = context.pages()[0];
    const failures: string[] = [];
    page.on("pageerror", () => failures.push("PAGE_ERROR"));
    page.on("console", message => { if (message.type() === "error") failures.push("CONSOLE_ERROR"); });
    await page.goto(`${baseURL}/login`);
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeEnabled();
    const measurement = await page.evaluate(() => ({ ratio: devicePixelRatio, width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth }));
    expect(measurement.ratio / baselineRatio!).toBeCloseTo(2, 1);
    expect(measurement.width).toBeLessThan(baselineWidth! * 0.6);
    expect(measurement.overflow).toBe(false);
    await inspectIcons(page, 6);
    await page.getByLabel("Mot de passe", { exact: true }).click();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Masquer le mot de passe", exact: true })).toBeFocused();
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Adresse e-mail", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Adresse e-mail", { exact: true })).toBeFocused();
    await mkdir("output/playwright/login-icons", { recursive: true });
    await page.bringToFront();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const session = await context.newCDPSession(page);
    try {
      const capture = await session.send("Page.captureScreenshot", { format: "png", fromSurface: false });
      await writeFile("output/playwright/login-icons/login-zoom-200.png", Buffer.from(capture.data, "base64"));
    } finally { await session.detach(); }
    expect(failures).toEqual([]);
  } finally { await context.close(); }
});
