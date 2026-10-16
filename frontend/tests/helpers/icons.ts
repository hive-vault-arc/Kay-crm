import { expect, type Page } from "@playwright/test";

export async function inspectIcons(page: Page, minimum = 1) {
  const icons = await page.locator("svg[data-kay-icon]").evaluateAll(elements => elements.filter(element => element.checkVisibility()).map(element => {
    const svg = element as SVGSVGElement, box = svg.getBoundingClientRect(), style = getComputedStyle(svg);
    const paths = [...svg.querySelectorAll("path")];
    return {
      name: svg.dataset.kayIcon!, family: svg.dataset.iconFamily, style: svg.dataset.iconStyle,
      decorative: svg.getAttribute("aria-hidden"), focusable: svg.getAttribute("focusable"),
      width: box.width, height: box.height, paths: paths.length,
      painted: paths.some(path => { const bounds = path.getBBox(); return bounds.width > 0 || bounds.height > 0; }),
      inherits: paths.every(path => path.getAttribute("stroke") === "currentColor" && getComputedStyle(path).stroke === style.color),
      external: svg.querySelectorAll("use, image, foreignObject, script, [id]").length,
    };
  }));
  expect(icons.length).toBeGreaterThanOrEqual(minimum);
  for (const icon of icons) {
    expect(icon.family).toBe("iconsax"); expect(icon.style).toBe("linear");
    expect(icon.decorative).toBe("true"); expect(icon.focusable).toBe("false");
    expect(icon.width).toBeGreaterThan(0); expect(icon.height).toBeGreaterThan(0);
    expect(icon.paths).toBeGreaterThan(0); expect(icon.painted).toBe(true);
    expect(icon.inherits).toBe(true); expect(icon.external).toBe(0);
  }
  expect(await page.locator('svg[class*="lucide"]').count()).toBe(0);
  return [...new Set(icons.map(icon => icon.name))].sort();
}
