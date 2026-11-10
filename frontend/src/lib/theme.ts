import type { CSSProperties } from "react";
import workspace from "../../../branding/prototype/kay-workspace.tokens.json";

type Variables = CSSProperties & Record<`--${string}`, string>;
const kebab = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const themeVariables: Variables = {};

// The reference owns appearance. Named adapters keep existing feature consumers stable.
for (const mode of ["light", "dark"] as const) {
  for (const [name, value] of Object.entries(workspace[mode])) {
    themeVariables[`--workspace-${mode}-${kebab(name)}`] = value;
  }
}
for (const [group, values] of Object.entries({
  "workspace-geometry": workspace.geometry,
  "workspace-type": workspace.type,
  motion: workspace.motion,
})) {
  for (const [name, value] of Object.entries(values)) {
    themeVariables[`--${group}-${kebab(name)}`] = value;
  }
}
for (const [group, values] of Object.entries({
  control: workspace.controlPx,
  layout: workspace.layoutPx,
})) {
  for (const [name, value] of Object.entries(values)) {
    themeVariables[`--${group}-${kebab(name)}`] = `${value / 16}rem`;
  }
}
const workspaceRoles: Record<string, string> = {
  "surface-canvas": "canvas", "surface-content": "panel", "surface-overlay": "menu",
  "surface-sidebar": "sidebar", "surface-sidebar-foreground": "ink",
  "content-primary": "ink", "content-secondary": "muted", "content-link": "ink",
  "neutral-border-subtle": "line", "neutral-border-strong": "line", "neutral-surface-muted": "field",
  "selection-background": "selected", "selection-foreground": "ink",
  "navigation-selected-background": "primary", "navigation-selected-foreground": "on-primary",
  "action-primary-background": "primary", "action-primary-hover": "primary-hover", "action-primary-pressed": "primary-pressed", "action-primary-foreground": "on-primary",
  "action-creation-background": "primary", "action-creation-hover": "primary-hover", "action-creation-pressed": "primary-pressed", "action-creation-foreground": "on-primary",
  "action-secondary-background": "field", "action-secondary-hover": "hover", "action-secondary-foreground": "ink", "action-focus-ring": "focus",
  "status-neutral-foreground": "neutral", "status-neutral-background": "neutral-background",
  "status-info-foreground": "info", "status-info-background": "info-background", "status-info-border": "info",
  "status-success-foreground": "success", "status-success-background": "success-background",
  "status-warning-foreground": "warning", "status-warning-background": "warning-background",
  "status-danger-foreground": "danger", "status-danger-background": "danger-background",
  "status-purple-foreground": "purple", "status-purple-background": "purple-background",
  "status-teal-foreground": "teal", "status-teal-background": "teal-background"
};
for (const [name, value] of Object.entries(workspaceRoles)) themeVariables[`--${name}`] = `var(--workspace-${value})`;

const referenceRoles: Record<string, string> = {
  "accent-highlight": "accent",
  "content-inverse": "on-primary",
  "surface-recess": "recess",
  "action-destructive-background": "destructive",
  "action-destructive-foreground": "light-on-primary",
  "action-destructive-hover": "destructive",
  "selection-indicator": "focus",
};
for (const [name, value] of Object.entries(referenceRoles)) {
  themeVariables[`--${name}`] = `var(--workspace-${value})`;
}
for (const [index, hue] of ["blue", "cyan", "yellow", "purple", "green"].entries()) {
  themeVariables[`--chart-series${index + 1}`] = `var(--workspace-stage-${hue})`;
}
for (const role of ["success", "warning", "danger", "neutral", "purple", "teal"]) {
  themeVariables[`--status-${role}-border`] = `var(--status-${role}-foreground)`;
}
themeVariables["--radius-small"] = "var(--workspace-geometry-inset-radius)";
themeVariables["--radius-medium"] = "var(--workspace-geometry-pill-radius)";
themeVariables["--radius-large"] = "var(--workspace-geometry-panel-radius)";
