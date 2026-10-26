import assert from "node:assert/strict";
import test from "node:test";
import { loadServer } from "./load-server.mjs";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const appearance = loadServer("src/lib/theme-preference.ts");
test("Appearance accepts only selected modes, follows system changes and cannot inject preference cookies", () => {
  for (const value of [undefined, null, {}, "", "DARK", "dark; Path=/api", "https://foreign.invalid"]) assert.equal(appearance.parseThemePreference(value), "system");
  for (const value of ["light", "dark", "system"]) assert.equal(appearance.parseThemePreference(value), value);
  assert.equal(appearance.resolveThemePreference("system", true), "dark");
  assert.equal(appearance.resolveThemePreference("system", false), "light");
  assert.equal(appearance.resolveThemePreference("light", true), "light");
  assert.equal(appearance.resolveThemePreference("dark", false), "dark");
  assert.equal(appearance.themePreferenceCookie("dark", true), "kay-ui-theme=dark; Path=/; Max-Age=31536000; SameSite=Lax; Secure");
  assert.equal(appearance.themePreferenceCookie("dark; injected=1", false), "kay-ui-theme=system; Path=/; Max-Age=31536000; SameSite=Lax");
});

test("Dedicated Contacts route requires current identity and forwards exactly its real role", async () => {
  const calls = [], jsx = (type, props) => ({ type, props });
  let identity = { state: "authenticated", profile: { user: { role: "agent" } } };
  const route = loadServer("src/app/(workspace)/contacts/page.tsx", { modules: {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@/features/auth/auth-frame": { AuthUnavailable: "unavailable" },
    "@/features/contacts/contact-directory": { ContactDirectory: "contacts" },
    "@/lib/auth/server": { requireIdentity: async path => { calls.push(path); return identity; } },
  } });
  const ready = await route.default();assert.equal(ready.type, "contacts");assert.equal(ready.props.role, "agent");
  identity = { state: "unavailable" };const denied = await route.default();assert.equal(denied.type, "unavailable");assert.equal(denied.props.path, "/contacts");assert.deepEqual(calls, ["/contacts", "/contacts"]);
});

test("Contacts directory is an internal return path without admitting foreign or ambiguous destinations", () => {
  const { safeReturnPath } = loadServer("src/lib/auth/contracts.ts");
  assert.equal(safeReturnPath("/contacts"), "/contacts");
  for (const value of ["//foreign.invalid/contacts", "https://foreign.invalid/contacts", "/contacts?return_to=https://foreign.invalid", "/contacts/../settings"]) assert.equal(safeReturnPath(value), "/dashboard");
});

test("Selected glyphs preserve every semantic export, source shape hash and accessible SVG contract", () => {
  const selected = JSON.parse(readFileSync(new URL("../../../branding/prototype/kay-glyphs.json", import.meta.url), "utf8"));
  const previous = JSON.parse(readFileSync(new URL("../../../docs/reference/iconsax/assets.json", import.meta.url), "utf8"));
  const icons = loadServer("src/components/icons/index.tsx", { modules: {
    react: { createElement }, "react/jsx-runtime": jsxRuntime,
    "../../../../branding/prototype/kay-glyphs.json": { default: selected },
  } });
  for (const item of previous.icons) assert.equal(typeof icons[item.export], "function", item.export);
  for (const item of selected.icons) {
    assert.equal(createHash("sha256").update(JSON.stringify(item.nodes)).digest("hex"), item.sha256);
    const html = renderToStaticMarkup(createElement(icons[item.export], { size: 20 }));
    assert.ok(html.includes('data-icon-family="lucide"'));assert.ok(html.includes('aria-hidden="true"'));assert.ok(html.includes('width="20"'));
    const labelled = renderToStaticMarkup(createElement(icons[item.export], { label: "Action test" }));
    assert.ok(labelled.includes('role="img"'));assert.ok(labelled.includes('aria-label="Action test"'));assert.ok(!labelled.includes('aria-hidden="true"'));
  }
});
