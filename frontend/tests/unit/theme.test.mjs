import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { loadServer } from "./load-server.mjs";

const source = JSON.parse(readFileSync(new URL("../../../branding/riviera/kay-riviera.tokens.json", import.meta.url), "utf8"));
const roles = JSON.parse(readFileSync(new URL("../../../branding/kay-ui-tokens.json", import.meta.url), "utf8"));
const workspace = JSON.parse(readFileSync(new URL("../../../branding/prototype/kay-workspace.tokens.json", import.meta.url), "utf8"));
function load(tokens = source) {
  return loadServer("src/lib/theme.ts", { modules: {
    "../../../branding/kay-ui-tokens.json": { default: roles },
    "../../../branding/riviera/kay-riviera.tokens.json": { default: tokens },
    "../../../branding/prototype/kay-workspace.tokens.json": { default: workspace },
  } }).themeVariables;
}
const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
function variable(reference) {
  return `--riviera-${reference.slice(8, -1).split(".").map(kebab).join("-")}`;
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test("Selected workspace replaces visual roles while retaining all191 historical token exports", () => {
  const values = load();
  const value = key => {
    const result = values[key];
    const alias = /^var\((--[\w-]+)\)$/.exec(result);
    return alias ? value(alias[1]) : result;
  };
  assert.equal(Object.keys(values).filter(key => key.startsWith("--riviera-")).length, 191);
  assert.equal(values["--surface-canvas"], "var(--workspace-canvas)");
  assert.equal(values["--surface-content"], "var(--workspace-panel)");
  assert.equal(values["--surface-sidebar"], "var(--workspace-sidebar)");
  assert.equal(values["--action-creation-background"], "var(--workspace-primary)");
  assert.equal(values["--workspace-light-canvas"], "#f6f7f9");
  assert.equal(values["--workspace-light-primary"], "#20221e");
  assert.equal(new Set([1, 2, 3, 4, 5].map(index => value(`--chart-series${index}`))).size, 5);
  assert.equal(value("--radius-medium"), "999px");
  assert.equal(value("--control-touch-target"), "2.75rem");
  assert.ok(Object.values(values).every(value => !value.includes("{tokens.")));
});

test("Historical Riviera token provenance retains its declared opaque contrast pairs", () => {
  const values = load();
  assert.equal(source.validation.contrastPairs.length, 60);
  for (const pair of source.validation.contrastPairs) {
    const a = luminance(values[variable(pair.foreground)]);
    const b = luminance(values[variable(pair.background)]);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= pair.minimum, pair.name);
  }
});

test("Selected light/dark text and actions have legible opaque contrast and distinct geometry/color namespaces", () => {
  const values = load();
  for (const mode of ["light", "dark"]) {
    const palette = workspace[mode];
    for (const [foreground, background, minimum] of [["ink", "paper", 4.5], ["muted", "paper", 4.5], ["onPrimary", "primary", 4.5]]) {
      const a = luminance(palette[foreground]), b = luminance(palette[background]);
      assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= minimum, `${mode} ${foreground}/${background}`);
    }
  }
  assert.equal(values["--workspace-geometry-header"], "80px");
  assert.equal(values["--workspace-light-header"], "#dfe5ed");
  assert.equal(values["--workspace-geometry-rail-width"], "96px");
  assert.equal(values["--workspace-light-sidebar"], "rgb(246 247 249 / 36%)");
  const css = readFileSync(new URL("../../src/app/workspace.css", import.meta.url), "utf8");
  assert.ok(css.includes(":root[data-theme=system]"));
  assert.ok(css.includes("--workspace-primary:var(--workspace-dark-primary)"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes("prefers-reduced-transparency"));
});

test("Riviera rejects missing and cyclic aliases instead of emitting broken CSS", () => {
  const missing = structuredClone(source);
  missing.tokens.color.brand.foreground.value = "{tokens.color.missing}";
  assert.throws(() => load(missing), /Missing design token/);
  const cyclic = structuredClone(source);
  cyclic.tokens.color.brand.foreground.value = "{tokens.color.brand.foreground}";
  assert.throws(() => load(cyclic), /Cyclic design token/);
});

test("Riviera runtime font files match all three user-specified version pins", () => {
  const fontkit = createRequire(import.meta.url)("next/dist/compiled/@next/font/dist/fontkit/index.js").default;
  const layout = readFileSync(new URL("../../src/app/layout.tsx", import.meta.url), "utf8");
  for (const [family, version] of [["manrope", "4.505"], ["fraunces", "1.000"], ["dmSans", "4.004"]]) {
    const file = new RegExp(`const ${family} = localFont\\(\\{ src: "([^\"]+)"`).exec(layout)?.[1];
    assert.ok(file, `${family} uses a local font source`);
    const font = fontkit(readFileSync(new URL(`../../src/app/${file}`, import.meta.url)));
    assert.ok(font.version.startsWith(`Version ${version}`), `${family} matches ${version}`);
  }
});
