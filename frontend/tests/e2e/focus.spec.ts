import { mkdir } from "node:fs/promises";
import { test, expect } from "../helpers/auth";

test("SP22: approved visible focus survives shadcn outline utilities", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const contrasts: number[] = [];
  for (const target of [page.getByLabel("Adresse e-mail", { exact: true }), page.getByRole("button", { name: "Se connecter", exact: true })]) {
    await target.focus();
    const state = await target.evaluate(element => {
      const style = getComputedStyle(element);
      function background(node: Element): string {
        const value = getComputedStyle(node).backgroundColor;
        return value !== "rgba(0, 0, 0, 0)" && value !== "transparent" ? value : node.parentElement ? background(node.parentElement) : "rgb(255, 255, 255)";
      }
      function luminance(color: string) {
        const values = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
        return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
      }
      const outline = luminance(style.outlineColor), adjacent = luminance(background(element.parentElement!));
      return { visible: element.matches(":focus-visible"), style: style.outlineStyle, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), contrast: (Math.max(outline, adjacent) + .05) / (Math.min(outline, adjacent) + .05) };
    });
    expect(state.visible).toBe(true);
    expect(state.style).toBe("solid");
    expect(state.width).toBeGreaterThanOrEqual(2);
    expect(state.offset).toBeGreaterThanOrEqual(2);
    expect(state.contrast).toBeGreaterThanOrEqual(3);
    contrasts.push(state.contrast);
  }
  await mkdir("output/playwright", { recursive: true });
  await page.screenshot({ path: `output/playwright/sp22-focus-${info.project.name}.png`, scale: "css" });
  console.info("SP22_FOCUS", JSON.stringify({ project: info.project.name, minimumContrast: Math.min(...contrasts), outline: "2px solid", offset: 4 }));
});
