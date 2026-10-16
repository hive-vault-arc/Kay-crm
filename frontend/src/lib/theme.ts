import type { CSSProperties } from "react";
import tokens from "../../../branding/kay-ui-tokens.json";

type Variables = CSSProperties & Record<`--${string}`, string>;
const kebab = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
export const themeVariables: Variables = {};

for (const [group, values] of Object.entries(tokens.color)) {
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === "string") {
      themeVariables[`--${kebab(group)}-${kebab(name)}`] = value;
    } else {
      for (const [role, color] of Object.entries(value)) {
        if (typeof color === "string")
          themeVariables[`--${kebab(group)}-${kebab(name)}-${kebab(role)}`] =
            color;
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
