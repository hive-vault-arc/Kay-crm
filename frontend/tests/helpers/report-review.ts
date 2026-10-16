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
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const normalizedColors = new Set<string>();
    function rgba(color: string) {
      if (!color.startsWith("rgb")) normalizedColors.add(color);
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
    }
    function composite(front: number[], back: number[]) { return front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3])); }
    function luminance(color: number[]) { const v = color.slice(0, 3).map(n => { const x = n / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return v[0] * .2126 + v[1] * .7152 + v[2] * .0722; }
    function background(el: Element): number[] {
      const color = rgba(getComputedStyle(el).backgroundColor);
      return color[3] === 1 ? color : [...composite(color, el.parentElement ? background(el.parentElement) : [255, 255, 255]), 1];
    }
    const controls = [...root.querySelectorAll<HTMLElement>("button,input,select,textarea")].filter(visible).map(el => { const target = el.matches('input[type="file"].sr-only[tabindex="-1"]') ? el.closest("fieldset")?.querySelector("button") ?? el : el.matches('[role="checkbox"],[role="radio"],input[type="checkbox"],input[type="radio"]') ? el.closest("label") ?? el : el; const r = target.getBoundingClientRect(); return { width: r.width, height: r.height, tag: el.tagName, id: el.id, slot: el.dataset.slot }; });
    const ratios = [...root.querySelectorAll<HTMLElement>("p,h1,h2,h3,label,button,a")].filter(el => visible(el) && el.textContent?.trim() && !el.hasAttribute("disabled")).map(el => { const backdrop = background(el), a = luminance(composite(rgba(getComputedStyle(el).color), backdrop)), b = luminance(backdrop); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); });
    const overflowElements = [...document.body.querySelectorAll<HTMLElement>("*")].filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== "fixed"; }).slice(0, 8).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "svg", width: el.getBoundingClientRect().width }));
    return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, overflowElements, dialogOverflow: root.scrollWidth > root.clientWidth, minimumContrast: Math.min(...ratios), normalizedColors: [...normalizedColors], controls, dialogPadding: document.querySelector('[role="alertdialog"]') ? getComputedStyle(root).padding : null };
  });
  expect(result.overflow, JSON.stringify({ width: result.width, elements: result.overflowElements })).toBe(false); expect(result.dialogOverflow).toBe(false); expect(result.minimumContrast).toBeGreaterThanOrEqual(4.5); expect(result.controls.filter(v => v.width < 44 || v.height < 44)).toEqual([]);
  return result;
}
