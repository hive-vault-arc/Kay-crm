import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { loadServer } from "./load-server.mjs";

const source = JSON.parse(readFileSync(new URL("../../../branding/riviera/kay-riviera.tokens.json", import.meta.url), "utf8"));
const roles = JSON.parse(readFileSync(new URL("../../../branding/kay-ui-tokens.json", import.meta.url), "utf8"));
function load(tokens = source) {
  return loadServer("src/lib/theme.ts", { modules: {
    "../../../branding/kay-ui-tokens.json": { default: roles },
    "../../../branding/riviera/kay-riviera.tokens.json": { default: tokens },
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

test("Riviera exports all 191 supplied tokens and resolves existing application roles", () => {
  const values = load();
  const value = key => {
    const result = values[key];
    const alias = /^var\((--[\w-]+)\)$/.exec(result);
    return alias ? value(alias[1]) : result;
  };
  assert.equal(Object.keys(values).filter(key => key.startsWith("--riviera-")).length, 191);
  assert.equal(value("--surface-canvas"), "#FAF8F4");
  assert.equal(value("--surface-content"), "#FFFDF8");
  assert.equal(value("--surface-sidebar"), "#121512");
  assert.equal(value("--action-creation-background"), "#D8AA45");
  assert.equal(new Set([1, 2, 3, 4, 5].map(index => value(`--chart-series${index}`))).size, 5);
  assert.ok(["10px", "0.625rem"].includes(value("--radius-medium")));
  assert.equal(value("--control-touch-target"), "2.75rem");
  assert.ok(Object.values(values).every(value => !value.includes("{tokens.")));
});

test("Riviera independently meets every declared opaque text and control contrast pair", () => {
  const values = load();
  assert.equal(source.validation.contrastPairs.length, 60);
  for (const pair of source.validation.contrastPairs) {
    const a = luminance(values[variable(pair.foreground)]);
    const b = luminance(values[variable(pair.background)]);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= pair.minimum, pair.name);
  }
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
