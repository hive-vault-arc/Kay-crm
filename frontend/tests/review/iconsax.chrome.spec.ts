import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, mkdir, writeFile } from "node:fs/promises";
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
  expect(names).toHaveLength(27);
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
  expect(await response!.text()).toContain('data-kay-icon="show-password"');
  await expect(page.getByRole("button", { name: "Afficher le mot de passe", exact: true })).toBeEnabled();
  await inspectIcons(page);
  await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
  await expect(page.locator('svg[data-kay-icon="hide-password"]')).toBeVisible();
  await page.getByRole("button", { name: "Masquer le mot de passe", exact: true }).click();
  const noJS = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, javaScriptEnabled: false, locale: "fr-FR" });
  try {
    const initial = await noJS.newPage(); await initial.goto("/login");
    await expect(initial.locator('svg[data-kay-icon="show-password"]')).toBeVisible();
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
