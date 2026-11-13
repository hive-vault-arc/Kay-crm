import { expect, type Page } from "@playwright/test";

export async function inspectIcons(page: Page, minimum = 1) {
  const icons = await page.locator("svg[data-kay-icon]").evaluateAll(elements => elements.filter(element => element.checkVisibility()).map(element => {
    const svg = element as SVGSVGElement, box = svg.getBoundingClientRect(), style = getComputedStyle(svg);
    const shapes = [...svg.querySelectorAll<SVGGraphicsElement>("path, circle, ellipse, line, polygon, polyline, rect")];
    const paint = svg.dataset.kayIcon === "whatsapp" ? "fill" : "stroke";
    return {
      name: svg.dataset.kayIcon!, family: svg.dataset.iconFamily, style: svg.dataset.iconStyle,
      decorative: svg.getAttribute("aria-hidden"), focusable: svg.getAttribute("focusable"),
      width: box.width, height: box.height, shapes: shapes.length,
      painted: shapes.some(shape => { const bounds = shape.getBBox(); return bounds.width > 0 || bounds.height > 0; }),
      inherits: svg.getAttribute(paint) === "currentColor" && shapes.every(shape => getComputedStyle(shape)[paint] === style.color),
      external: svg.querySelectorAll("use, image, foreignObject, script, [id]").length,
    };
  }));
  expect(icons.length).toBeGreaterThanOrEqual(minimum);
  for (const icon of icons) {
    const isWhatsApp = icon.name === "whatsapp";
    expect(icon.family).toBe(isWhatsApp ? "brand" : "lucide");
    expect(icon.style).toBe(isWhatsApp ? "filled" : "linear");
    expect(icon.decorative).toBe("true"); expect(icon.focusable).toBe("false");
    expect(icon.width).toBeGreaterThan(0); expect(icon.height).toBeGreaterThan(0);
    expect(icon.shapes).toBeGreaterThan(0); expect(icon.painted).toBe(true);
    expect(icon.inherits).toBe(true); expect(icon.external).toBe(0);
  }
  expect(await page.locator('svg[class*="lucide"]').count()).toBe(0);
  return [...new Set(icons.map(icon => icon.name))].sort();
}
