import { mkdir } from "node:fs/promises";
import { test, expect } from "../helpers/auth";

test("SP22: approved visible focus survives shadcn outline utilities", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const contrasts: number[] = [];
  for (const target of [page.getByLabel("Adresse e-mail", { exact: true }), page.getByRole("button", { name: "Se connecter", exact: true })]) {
    await target.focus();
    const readFocus = () => target.evaluate(element => {
      const style = getComputedStyle(element);
      function background(node: Element): string {
        const value = getComputedStyle(node).backgroundColor;
        return value !== "rgba(0, 0, 0, 0)" && value !== "transparent" ? value : node.parentElement ? background(node.parentElement) : "rgb(255, 255, 255)";
      }
      function luminance(color: string) {
        // Computed CSS can use oklch()/color(), not just legacy rgb(). Let the
        // browser convert the painted color to sRGB before checking WCAG contrast.
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d")!;
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        const values = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      }
      const outline = luminance(style.outlineColor), adjacent = luminance(background(element.parentElement!));
      return { tag: element.tagName, token: style.getPropertyValue("--action-focus-ring"), sidebar: Boolean(element.closest("[data-sidebar]")), color: style.outlineColor, background: background(element.parentElement!), visible: element.matches(":focus-visible"), style: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), contrast: (Math.max(outline, adjacent) + .05) / (Math.min(outline, adjacent) + .05) };
    });
    await expect.poll(async () => (await readFocus()).contrast).toBeGreaterThanOrEqual(3);
    const state = await readFocus();
    expect(state.visible).toBe(true);
    expect(state.style).toBe("solid");
    expect(state.width).toBeGreaterThanOrEqual(2);
    expect(state.offset).toBeGreaterThanOrEqual(2);
    expect(state.contrast, JSON.stringify(state)).toBeGreaterThanOrEqual(3);
    contrasts.push(state.contrast);
  }
  await mkdir("output/playwright", { recursive: true });
  await page.screenshot({ path: `output/playwright/sp22-focus-${info.project.name}.png`, scale: "css" });
  console.info("SP22_FOCUS", JSON.stringify({ project: info.project.name, minimumContrast: Math.min(...contrasts), outline: "2px solid", offset: 4 }));
});
