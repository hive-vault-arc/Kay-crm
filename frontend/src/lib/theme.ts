import type { CSSProperties } from "react";
import tokens from "../../../branding/kay-ui-tokens.json";
import riviera from "../../../branding/riviera/kay-riviera.tokens.json";

type Variables = CSSProperties & Record<`--${string}`, string>;
const kebab = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const themeVariables: Variables = {};

type TokenTree = { [key: string]: unknown };
function resolve(value: string, visited = new Set<string>()): string {
  const match = /^\{(tokens\.[\w.]+)\}$/.exec(value);
  if (!match) return value;
  const path = match[1];
  if (visited.has(path)) throw new Error(`Cyclic design token: ${path}`);
  visited.add(path);
  const token = path.split(".").slice(1).reduce<unknown>((node, key) =>
    node && typeof node === "object" ? (node as TokenTree)[key] : undefined,
  riviera.tokens) as { value?: unknown } | undefined;
  if (!token || !["string", "number"].includes(typeof token.value))
    throw new Error(`Missing design token: ${path}`);
  return resolve(String(token.value), visited);
}

function exportRiviera(tree: TokenTree, path: string[] = []) {
  if ("value" in tree) {
    themeVariables[`--riviera-${path.map(kebab).join("-")}`] = resolve(String(tree.value));
    return;
  }
  for (const [key, value] of Object.entries(tree))
    if (value && typeof value === "object") exportRiviera(value as TokenTree, [...path, key]);
}
exportRiviera(riviera.tokens);

for (const [group, values] of Object.entries(tokens.color)) {
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string") {
      themeVariables[`--${kebab(group)}-${kebab(name)}`] = resolve(value);
    } else {
      for (const [role, color] of Object.entries(value)) {
        if (typeof color === "string")
          themeVariables[`--${kebab(group)}-${kebab(name)}-${kebab(role)}`] =
            resolve(color);
      }
    }
  }
}
for (const [group, values] of Object.entries({
  radius: tokens.radiusPx,
  control: tokens.controlPx,
  layout: tokens.layoutPx,
})) {
  for (const [name, value] of Object.entries(values))
    themeVariables[`--${group}-${kebab(name)}`] = `${value / 16}rem`;
}

// Preserve the shared Tailwind/shadcn semantic API while sourcing it from the
// owner-selected Riviera token set.
const rivieraRoles: Record<string, string> = {
  "brand-gold": "--riviera-color-brand-default",
  "surface-canvas": "--riviera-color-canvas",
  "surface-content": "--riviera-color-surface",
  "surface-overlay": "--riviera-color-surface",
  "surface-sidebar": "--riviera-color-sidebar-background",
  "surface-sidebar-foreground": "--riviera-color-sidebar-label",
  "content-primary": "--riviera-color-ink",
  "content-secondary": "--riviera-color-muted",
  "content-inverse": "--riviera-color-white",
  "content-link": "--riviera-color-gold-text",
  "neutral-border-subtle": "--riviera-color-divider",
  "neutral-border-strong": "--riviera-color-control-border",
  "neutral-surface-muted": "--riviera-color-surface-beige",
  "selection-background": "--riviera-color-interactive-selection-background",
  "selection-foreground": "--riviera-color-interactive-selection-foreground",
  "navigation-selected-background": "--riviera-color-sidebar-active",
  "navigation-selected-foreground": "--riviera-color-sidebar-active-label",
  "action-primary-background": "--riviera-color-brand-default",
  "action-primary-hover": "--riviera-color-brand-hover",
  "action-primary-pressed": "--riviera-color-brand-pressed",
  "action-primary-foreground": "--riviera-color-brand-foreground",
  "action-creation-background": "--riviera-color-brand-default",
  "action-creation-hover": "--riviera-color-brand-hover",
  "action-creation-pressed": "--riviera-color-brand-pressed",
  "action-creation-foreground": "--riviera-color-brand-foreground",
  "action-secondary-background": "--riviera-color-interactive-secondary-default",
  "action-secondary-hover": "--riviera-color-interactive-secondary-hover",
  "action-secondary-foreground": "--riviera-color-ink",
  "action-focus-ring": "--riviera-color-focus-light",
  "status-success-foreground": "--riviera-color-semantic-success-foreground",
  "status-success-background": "--riviera-color-semantic-success-background",
  "status-warning-foreground": "--riviera-color-semantic-warning-foreground",
  "status-warning-background": "--riviera-color-semantic-warning-background",
  "status-danger-foreground": "--riviera-color-semantic-danger-foreground",
  "status-danger-background": "--riviera-color-semantic-danger-background",
  "status-info-foreground": "--riviera-color-semantic-info-foreground",
  "status-info-background": "--riviera-color-semantic-info-background",
  "status-neutral-foreground": "--riviera-color-semantic-neutral-foreground",
  "status-neutral-background": "--riviera-color-semantic-neutral-background",
  "status-purple-foreground": "--riviera-color-kpi-requests-foreground",
  "status-purple-background": "--riviera-color-kpi-requests-badge",
  "status-teal-foreground": "--riviera-color-kpi-receipts-foreground",
  "status-teal-background": "--riviera-color-kpi-receipts-badge",
  "chart-series1": "--riviera-color-stage-blue-fill",
  "chart-series2": "--riviera-color-stage-cyan-fill",
  "chart-series3": "--riviera-color-stage-yellow-fill",
  "chart-series4": "--riviera-color-stage-purple-fill",
  "chart-series5": "--riviera-color-stage-green-fill",
};
for (const [name, value] of Object.entries(rivieraRoles))
  themeVariables[`--${name}`] = `var(${value})`;

themeVariables["--radius-small"] = "var(--riviera-radius-icon-tile)";
themeVariables["--radius-medium"] = "var(--riviera-radius-control)";
themeVariables["--radius-large"] = "var(--riviera-radius-panel)";
