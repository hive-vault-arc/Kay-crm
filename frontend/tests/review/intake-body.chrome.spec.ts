import { mkdir } from "node:fs/promises";
import { test, expect, clearActorContext } from "../helpers/auth";
import { testControl } from "../helpers/api-process";
import { geometry } from "../helpers/report-review";
import { clearIntake, fillWebsite, intakeFixture, simulatorOrigin } from "../helpers/intake";

test("SP20 413 correction: real UTF-8 byte cap preserves editable draft and short-message retry", async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", () => errors.push("PAGE_ERROR"));
  page.on("console", message => { if (message.type() === "error" && !message.text().includes("status of 413")) errors.push("CONSOLE_ERROR"); });
  try {
    await intakeFixture(page); await fillWebsite(page);
    await page.getByLabel("Message (facultatif)", { exact: true }).fill("界".repeat(3000));
    const rejected = page.waitForResponse(response => response.url() === simulatorOrigin + "/submit" && response.status() === 413);
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click(); await rejected;
    const alert = page.getByRole("alert").filter({ hasText: "Raccourcissez le message" });
    await expect(alert).toBeVisible();
    await expect(page.getByLabel("Nom complet", { exact: true })).toBeEnabled();
    await expect(page.getByLabel("Message (facultatif)", { exact: true })).toHaveValue("界".repeat(3000));
    await expect(page.locator("dd")).toHaveCount(0);
    await mkdir("output/playwright", { recursive: true });
    for (const [name, width, height] of [["mobile", 390, 844], ["desktop", 1440, 1000]] as const) {
      await page.setViewportSize({ width, height }); await geometry(page);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => { scrollTo(0, 0); resolve(); }))));
      const cdp = await page.context().newCDPSession(page);
      try {
        const metrics = await cdp.send("Page.getLayoutMetrics"), dom = await page.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight }));
        const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: dom.width, height: dom.height, scale: 1 } });
        expect(metrics.cssLayoutViewport.clientWidth).toBeLessThanOrEqual(dom.width);
        await (await import("node:fs/promises")).writeFile(`output/playwright/sp20-body-error-${name}.png`, Buffer.from(shot.data, "base64"));
      } finally { await cdp.detach(); }
    }
    await page.getByLabel("Message (facultatif)", { exact: true }).fill("SP20 message synthétique raccourci");
    await page.getByRole("button", { name: "Envoyer la demande", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("En attente de traitement");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "output/playwright/sp20-body-corrected-mobile.png", fullPage: true });
    await testControl("worker-start");
    await expect.poll(async () => { await page.getByRole("button", { name: "Actualiser le suivi", exact: true }).click(); return page.getByRole("status").innerText(); }, { timeout: 15000 }).toBe("Demande traitée");
    expect(errors).toEqual([]);
  } finally { await clearActorContext(page); await clearIntake(); }
});
