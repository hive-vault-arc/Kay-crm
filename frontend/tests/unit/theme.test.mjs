import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { loadServer } from "./load-server.mjs";

const tokenUrl = new URL("../../../branding/prototype/kay-workspace.tokens.json", import.meta.url);
const workspace = JSON.parse(readFileSync(tokenUrl, "utf8"));
const variables = loadServer("src/lib/theme.ts", { modules: {
  "../../../branding/prototype/kay-workspace.tokens.json": { default: workspace },
} }).themeVariables;
const app = new URL("../../src/app/", import.meta.url);
const css = readdirSync(app).filter(file => file.endsWith(".css"))
  .map(file => readFileSync(new URL(file, app), "utf8")).join("\n");

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("Reference mode values resolve through the existing semantic roles", () => {
  assert.deepEqual(Object.keys(workspace.light).sort(), Object.keys(workspace.dark).sort());
  assert.equal(variables["--surface-canvas"], "var(--workspace-canvas)");
  assert.equal(variables["--action-creation-background"], "var(--workspace-primary)");
  assert.equal(variables["--workspace-light-canvas"], "#f6f7f9");
  assert.equal(variables["--workspace-dark-canvas"], "#151719");
  assert.equal(variables["--workspace-light-primary"], "#20221e");
  assert.equal(variables["--workspace-dark-field"], "#303944");
  assert.equal(variables["--workspace-dark-info"], "#60a5fa");
  assert.equal(variables["--workspace-dark-purple"], "#c4b5fd");
  assert.equal(variables["--workspace-dark-teal"], "#5eead4");
  assert.equal(variables["--workspace-light-floating-edge"], "rgb(111 127 149 / 20%)");
  assert.equal(variables["--workspace-dark-floating-edge"], "rgb(184 196 214 / 20%)");
  assert.match(css, /:root\[data-theme=system\]/);
  assert.match(css, /--workspace-primary:var\(--workspace-dark-primary\)/);
});

test("Geometry and motion match the shared reference contract", () => {
  assert.equal(variables["--workspace-geometry-header"], "80px");
  assert.equal(variables["--workspace-geometry-mobile-header"], "64px");
  assert.equal(variables["--workspace-geometry-rail-width"], "96px");
  assert.equal(variables["--workspace-geometry-button-height"], "40px");
  assert.equal(variables["--workspace-geometry-touch"], "44px");
  assert.equal(variables["--workspace-geometry-panel-radius"], "24px");
  assert.equal(variables["--workspace-geometry-compact-radius"], "12px");
  assert.equal(variables["--workspace-type-page-weight"], "700");
  assert.equal(variables["--workspace-type-label-weight"], "550");
  assert.equal(variables["--workspace-type-table-heading-weight"], "600");
  assert.equal(variables["--motion-fast"], "260ms");
  assert.equal(variables["--motion-panel"], "420ms");
  assert.equal(variables["--motion-panel-exit"], "300ms");
  assert.equal(variables["--motion-ease"], "cubic-bezier(.22,1,.36,1)");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(css, /forced-colors/);
});

test("Component class merging preserves type roles beside semantic colors", () => {
  const { cn } = loadServer("src/lib/utils.ts", {
    modules: { clsx: { clsx }, "tailwind-merge": { extendTailwindMerge } },
  });
  assert.equal(cn("text-badge", "text-info"), "text-badge text-info");
  assert.equal(cn("text-label", "text-muted-foreground", "text-sm"), "text-muted-foreground text-sm");
  assert.equal(cn("rounded-checkbox", "rounded-full"), "rounded-full");
});

test("Shared token references resolve without the retired theme exports", () => {
  const cssDeclarations = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(match => match[1]));
  for (const source of [css, ...Object.values(variables)]) {
    for (const [, name] of source.matchAll(/var\((--(?:workspace|motion)-[\w-]+)/g)) {
      assert.ok(name in variables || cssDeclarations.has(name), name);
    }
  }
  assert.ok(Object.keys(variables).every(name => !name.startsWith("--riviera-")));
  assert.doesNotMatch(css, /--riviera-|--font-fraunces|--font-dm-sans/);
});

test("Shared opaque text and action pairs preserve legibility in both modes", () => {
  for (const mode of ["light", "dark"]) {
    for (const [foreground, background] of [["ink","paper"],["muted","paper"],["onPrimary","primary"]]) {
      const a = luminance(workspace[mode][foreground]);
      const b = luminance(workspace[mode][background]);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5, mode + " " + foreground);
    }
  }
});

test("The UI font, wordmark and atmosphere match the supplied reference assets", () => {
  const layout = readFileSync(new URL("layout.tsx", app), "utf8");
  assert.equal((layout.match(/localFont\(/g) || []).length, 1);
  assert.match(layout, /InterVariable\.woff2/);
  for (const [file, hash] of [
    ["../../src/fonts/InterVariable.woff2", "693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3"],
    ["../../public/images/workspace/kay-logo.svg", "53f3d214c0246d9c127b6225d35ba385e1b60ed6f7f284a1db36605fd5282327"],
    ["../../public/images/workspace/kay-pearl-atmosphere.png", "7c443fad9a68adb73d4b740e49b634f014ab2c72f9fb85da82b90a7eeb482c88"],
  ]) {
    assert.equal(createHash("sha256").update(readFileSync(new URL(file, import.meta.url))).digest("hex"), hash);
  }
});
