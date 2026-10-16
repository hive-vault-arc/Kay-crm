import type { Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "./auth";
export async function capture(page: Page, name: string, full = false) {
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  if (!name.startsWith("loading")) await expect(page.getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  const cdp = await page.context().newCDPSession(page);
  try {
    if (full) await page.evaluate(() => window.scrollTo(0, 0));
    const metrics = full ? await cdp.send("Page.getLayoutMetrics") : undefined;
    const width = await page.evaluate(() => innerWidth);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, ...(metrics ? { captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } } : {}) });
    const bytes = Buffer.from(shot.data, "base64");
    await writeFile(path.resolve(`output/playwright/sp17-${name}.png`), bytes);
    if (["reports-desktop", "reports-mobile"].includes(name)) await writeFile(path.resolve(`../.impeccable/review/${name.endsWith("desktop") ? "desktop" : "mobile"}.png`), bytes);
  } finally { await cdp.detach(); }
}

export async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const root = document.querySelector('[role="alertdialog"]') ?? document.querySelector("main") ?? document.body;
    const visible = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    function luminance(color: string) { const v = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(n => { const x = n / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }
    function background(el: Element): string { const color = getComputedStyle(el).backgroundColor; return color !== "rgba(0, 0, 0, 0)" && color !== "transparent" ? color : el.parentElement ? background(el.parentElement) : "rgb(255, 255, 255)"; }
    const controls = [...root.querySelectorAll<HTMLElement>("button,input,select,textarea")].filter(visible).map(el => { const target = el.matches('input[type="file"].sr-only[tabindex="-1"]') ? el.closest("fieldset")?.querySelector("button") ?? el : el.matches('[role="checkbox"],[role="radio"],input[type="checkbox"],input[type="radio"]') ? el.closest("label") ?? el : el; const r = target.getBoundingClientRect(); return { width: r.width, height: r.height, tag: el.tagName, id: el.id, slot: el.dataset.slot }; });
    const ratios = [...root.querySelectorAll<HTMLElement>("p,h1,h2,h3,label,button,a")].filter(el => visible(el) && el.textContent?.trim() && !el.hasAttribute("disabled")).map(el => { const a = luminance(getComputedStyle(el).color), b = luminance(background(el)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
    const overflowElements = [...document.body.querySelectorAll<HTMLElement>("*")].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).slice(0, 8).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "svg", width: el.getBoundingClientRect().width }));
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, overflowElements, dialogOverflow: root.scrollWidth > root.clientWidth, minimumContrast: Math.min(...ratios), controls, dialogPadding: document.querySelector('[role="alertdialog"]') ? getComputedStyle(root).padding : null };
  });
  expect(result.overflow, JSON.stringify({ width: result.width, elements: result.overflowElements })).toBe(false); expect(result.dialogOverflow).toBe(false); expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5); expect(result.controls.filter(v => v.width < 44 || v.height < 44)).toEqual([]);
  return result;
}
