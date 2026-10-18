import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect } from "./auth";

// Opt-in, post-login synthetic records only; never enable automatic auth screenshots.
export async function captureQualificationPair(page: Page, surface: string) {
  if (process.env.KAY_ALIGNMENT_CAPTURE !== "1") return;
  await expect(page.locator('input[type="password"], [data-private-credential]')).toHaveCount(0);
  await expect(page.locator("main").getByRole("status").filter({ hasText: /Chargement|Vérification/ })).toHaveCount(0);
  const interfaceCapture = process.env.KAY_ALIGNMENT_CAPTURE_GROUP === "interface";
  const directory = path.resolve("output/playwright", interfaceCapture ? "leads-deals-interface" : "leads-deals-alignment", process.env.KAY_ALIGNMENT_CAPTURE_ROUND === "2" ? "round-02" : "round-01");
  await mkdir(directory, { recursive: true });
  const previous = page.viewportSize();
  try {
    for (const width of interfaceCapture ? [1440, 390, 1920] : [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (interfaceCapture) {
        const workspace = page.locator("main[data-crm-workspace]");
        await expect(workspace).toHaveCSS("max-width", "none");
        await expect(workspace).toHaveCSS("padding-left", "16px");
        await expect(workspace).toHaveCSS("padding-right", "16px");
        if (width >= 1280 && (surface.includes("edit") || surface.includes("create"))) {
          for (const label of ["Nom du contact", "Budget *"]) {
            const control = page.getByLabel(label, { exact: true });
            expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(240);
          }
        }
      }
      const dialog = page.getByRole("alertdialog");
      if (await dialog.count()) await dialog.evaluate(element => { element.scrollTop = 0; });
      const cdp = await page.context().newCDPSession(page);
      try {
        const metrics = await cdp.send("Page.getLayoutMetrics");
        const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: metrics.cssContentSize.height, scale: 1 } });
        await writeFile(path.join(directory, `${surface}-${width}.png`), Buffer.from(shot.data, "base64"));
      } finally { await cdp.detach(); }
      if (interfaceCapture && (surface.includes("detail") || surface.includes("edit") || surface.includes("create"))) {
        await page.screenshot({ path: path.join(directory, `${surface}-${width}-viewport.png`), animations: "disabled" });
      }
      if (await dialog.count() && await dialog.evaluate(element => element.scrollHeight > element.clientHeight)) {
        await dialog.evaluate(element => { element.scrollTop = element.scrollHeight; });
        await page.screenshot({ path: path.join(directory, `${surface}-${width}-bottom.png`), fullPage: true, animations: "disabled" });
      }
    }
  } finally { if (previous) await page.setViewportSize(previous); }
}
