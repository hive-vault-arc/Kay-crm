# Iconsax: library reference for KAY

Status: reference collected 2026-10-15; subsequent Iconsax migration authorized under D33 on 2026-10-16  
Date: 2026-10-15 collection; 2026-10-16 migration  
Confirmed request: the original collection request was documentation-only. Khalid subsequently authorized full icon migration, not subscriptions, premium assets or an MCP connection.  
Implementation: selected verified official Free linear SVGs behind KAY's typed SSR-safe React layer; no runtime Iconsax package. Current evidence is in [migration.md](migration.md); original collection evidence below remains historical.  
References: [Iconsax](https://iconsax.io/), [official documentation](https://docs.iconsax.io/), [KAY decisions](../../../decisions.md), [component guide](../../04-design/ui-components.md), [design system](../../04-design/design-system.md), and [coding standards](../../01-working-agreements/coding-standards.md).

This is an original, locally readable implementation guide and source index, not a mirror of the upstream website or an archive of its icon assets. Follow the linked official pages for the full documentation and current terms. Documentation and product-interface language are separate: this guide is English; KAY's labels remain French.

## 1. What Iconsax provides

Iconsax is an icon library and selection/export platform, not a replacement for shadcn/ui, Tailwind CSS, or Bklit charts. The current official documentation describes the V2 platform, with free and paid assets. The platform version is distinct from the npm package version. [Official introduction](https://docs.iconsax.io/)

The catalogue has six visual styles, straight/rounded treatments, and a 24-by-24 design grid. Animated assets are a separate premium offering, including Lottie JSON and GIF exports. Not every asset or variant is necessarily available in every delivery format or plan. [Icon-library documentation](https://docs.iconsax.io/features/icon-library)

| Style | General visual character |
|---|---|
| Linear | Stroke-based outlines |
| Outline | A distinct outlined treatment; inspect the actual glyph |
| Bold | Filled forms with stronger visual weight |
| Bulk | Layered forms with differentiated emphasis |
| Two-tone | Multiple visual tones within the glyph |
| Broken | Deliberate gaps in linework |

In the official web-component API, the corresponding style strings are lowercase: `linear`, `outline`, `bold`, `bulk`, `twotone`, and `broken`. Do not copy prop names or capitalization from an unrelated React wrapper.

## 2. Official documentation map

| Need | Official source |
|---|---|
| Product overview | [Introduction](https://docs.iconsax.io/) |
| Browse and select icons | [Icons browser](https://app.iconsax.io/), [Getting Started](https://docs.iconsax.io/getting-started) |
| Styles, formats, and collection structure | [Icon Library](https://docs.iconsax.io/features/icon-library) |
| Search, filters, customization, and export | [Iconsax Platform](https://docs.iconsax.io/features/iconsax-platform) |
| Framework/export options | [Integration overview](https://docs.iconsax.io/integrations/intro) |
| Official npm installation and API | [Web-component package](https://docs.iconsax.io/npm/web-component) |
| AI-assisted discovery | [MCP integration](https://docs.iconsax.io/mcp/ai-integration) |
| Usage rights | [License summary](https://docs.iconsax.io/license-and-terms/license), [full usage manifesto](https://docs.iconsax.io/license-and-terms/usage-manifesto) |
| Attribution | [Attribution guide](https://docs.iconsax.io/license-and-terms/atribution-guide) |
| Published package metadata | [npm registry](https://registry.npmjs.org/iconsax), [version 0.1.1](https://registry.npmjs.org/iconsax/0.1.1) |

## 3. Finding and downloading icons

Start in the official browser. Search for a concept, filter by free/premium access and category, select a style, and preview the actual result. The platform also exposes static/animated and straight/rounded filters. Clicking a glyph opens customization; the selection workspace supports grouped export. [Platform guide](https://docs.iconsax.io/features/iconsax-platform)

For a small first selection:

1. Filter to assets covered by your intended license.
2. Search for a familiar action or object, rather than a decorative metaphor.
3. Compare candidates at their actual display size.
4. Keep a consistent style across a screen.
5. Export only the selected assets and retain their provenance.

Downloads can include SVG, raster formats, font icons, or framework-oriented code. The getting-started guide also explains the official Figma workflow and selection downloads. Account requirements depend on the feature; verify the chosen plan rather than assuming premium capabilities are free. [Getting Started](https://docs.iconsax.io/getting-started)

Suggested KAY search terms, not verified export identifiers:

| CRM context | Search concepts |
|---|---|
| Dashboard | dashboard, chart, activity |
| Leads and contacts | user, people, call, message |
| Deals | document, handshake, receipt |
| Projects and physical units | building, home, location, map |
| Visits | calendar, clock, car |
| Settings and users | setting, profile, security |
| Common actions | search, filter, add, edit, trash, download |

Verify the exact name/style in the selected export or package manifest. A search term is not a promise that a component with that name exists.

## 4. Integration choices

| Delivery method | When to consider it | Boundary to verify |
|---|---|---|
| Official SVG or React-code export | A small, explicit set of shared application icons | Asset terms, SVG safety, accessibility, and consistent props |
| Official `iconsax` npm package | The documented `<iconsax-icon>` custom element | Browser registration, TypeScript, hydration, and JSON asset delivery |
| Font export | An explicitly justified font-based integration | Additional CSS/font loading and accessible naming |
| Older ecosystem React packages | Only after an independent package review | Provenance, maintenance, license, API, and React compatibility |

The current official npm guide documents a custom element, not named React exports such as `import { Home } from "iconsax"`. Do not install a similarly named package on the assumption that it implements the same API. The official integration overview separately describes code/export workflows. [Integration overview](https://docs.iconsax.io/integrations/intro), [npm guide](https://docs.iconsax.io/npm/web-component)

**Adopted for the subsequent D33 migration:** selected reviewed local SVG/React exports behind shared semantic components for predictable server rendering. The web-component option below remains a reference, not the installed integration.

## 5. Official npm package: installation and basic API

The npm registry reported these values on 2026-10-15:

| Field | Observed value |
|---|---|
| Package | `iconsax` |
| Latest dist-tag | `0.1.1` |
| Publication date for that version | 2026-07-14 UTC |
| Node engine | `>=18.0.0` |
| Package entry | `./dist/index.js` |
| Exported manifest | `iconsax/manifest.json` |
| Metadata license field | `MIT`; see the separate asset-licensing cautions below |

Source: [publisher's npm registry metadata](https://registry.npmjs.org/iconsax/0.1.1). Recheck before adoption; these values do not mean the dependency has been installed in KAY.

After a future integration is approved, run from `frontend/`:

```bash
npm install --save-exact iconsax@0.1.1
```

Commit the resulting dependency declaration and npm lockfile after review. This collection task did not run that command.

Register the package in a browser-only entry point, then use its custom element. This is illustrative HTML, not a tested Next.js component:

```html
<iconsax-icon name="home" type="linear" size="24" color="currentColor"></iconsax-icon>
```

| Attribute | Purpose |
|---|---|
| `name` | Required icon identifier |
| `type` | One of the six lowercase style strings; defaults to `linear` |
| `size` | Pixel size; defaults to `24` |
| `color` | CSS color; defaults to `currentColor` |
| `pro` | Presence selects the premium registry |

Source: [official package API](https://docs.iconsax.io/npm/web-component).

### Next.js and TypeScript cautions

The published [0.1.1 browser entry](https://unpkg.com/iconsax@0.1.1/dist/index.js) declares a class extending `HTMLElement` at module evaluation. Only its final custom-element registration is guarded. **Do not import this entry at module scope in server-executed code.** The documentation's general SSR claim is not proof that this entry is safe to evaluate in Node.

For a future Next.js implementation:

- Perform browser registration from a client-only lifecycle/dynamic-loading boundary. A `"use client"` label alone does not justify an untested top-level import of a browser-only dependency.
- Keep the registration boundary small; do not turn the entire application into a client component for icons.
- Add precise React/TypeScript custom-element declarations if required. Do not silence errors with `any` or disabled checking.
- Check development and production builds, hydration, repeat navigation, and React Strict Mode.
- The free loader fetches a manifest and per-category JSON using module-relative URLs. Prove those assets are emitted and served correctly by Next.js/Vercel; do not assume installing the package handles this automatically.
- Reserve icon geometry so loading cannot shift labels or navigation.
- Do not rely on silent style fallback: inspect that the requested variant actually renders.

These cautions come from static package inspection, not an executed KAY integration. Framework background: [Next.js client boundaries](https://nextjs.org/docs/app/api-reference/directives/use-client), [React custom elements](https://react.dev/reference/react-dom/components#custom-html-elements).

## 6. Premium icons and synchronization

The official workflow resolves premium assets during development, saves `iconsax-pro.icons.json`, and registers that local data through `registerProIcons`. It does not require exposing an account key to application users. [Official premium workflow](https://docs.iconsax.io/npm/web-component)

After installing the reviewed package, and only with a valid entitlement:

```bash
npx --no-install iconsax sync --src ./src
```

Supply `IX_PRO_KEY` through a private process environment or an approved secret mechanism, not a literal command-line key. The official CLI documents this environment variable. No key was requested, stored, or used for this reference.

Future adoption checks:

- Confirm the scanner discovers the actual source patterns used by KAY's wrapper; a runtime-computed name may not be statically discoverable.
- Review the generated JSON before committing it and confirm its permitted repository/client distribution.
- Register assets only in the safe browser boundary if using this package.
- Keep API keys out of source, `NEXT_PUBLIC_*`, browser bundles, screenshots, logs, and chat.
- Test the built application without an Iconsax runtime API connection.
- Distinguish technical asset persistence from legal usage permission; resolve conflicting terms with Iconsax before premium client delivery.

## 7. Licensing and provenance

The current platform uses proprietary Free/Premium terms. Its license summary permits commercial integration under conditions, distinguishes ordinary end products from redistributable kits/templates, restricts standalone redistribution, and addresses individual/team access. Preserve required notices and establish the applicable entitlement before adoption. [License summary](https://docs.iconsax.io/license-and-terms/license)

The npm metadata's `MIT` field does **not** establish that all platform or premium assets have unrestricted MIT rights. Record the package version, exact asset origin, style, acquisition date, and applicable terms separately. This is a provenance checklist, not legal clearance.

The full manifesto describes the V1/V2 transition and current downloads. Do not infer permission for new downloads or packs from an older library's license label. [Usage manifesto](https://docs.iconsax.io/license-and-terms/usage-manifesto)

Upstream material contains inconsistencies: some descriptive pages still request attribution broadly; the license/attribution pages distinguish product types. Premium documentation also differs in how it describes continued use after cancellation. Resolve material uncertainty with the publisher instead of treating runtime behavior as licensing authority. [Attribution guide](https://docs.iconsax.io/license-and-terms/atribution-guide), [license summary](https://docs.iconsax.io/license-and-terms/license)

Do not mirror the full icon catalogue into this documentation folder or ship a standalone premium SVG collection to the client. Preserve the applicable notices with any future integrated assets.

## 8. Optional AI/MCP reference

Iconsax documents an HTTP MCP endpoint at `https://app.iconsax.io/api/mcp` for searching icons, retrieving SVG/code, and listing categories. Free access and authenticated premium tools are described separately. This guide records the capability only; no MCP server was connected or configured. [Official MCP documentation](https://docs.iconsax.io/mcp/ai-integration)

If separately approved later, use neutral icon-search concepts, never CRM records, private documents, credentials, or customer data. Keep premium tokens in an approved secret store. Client setup is tool-specific; do not assume another assistant's JSON configuration works unchanged in this environment.

## 9. Applying the reference to KAY

At collection time D29 selected Lucide. Khalid's subsequent explicit D33 request
supersedes that icon baseline. All current consumers now import KAY's semantic
Iconsax layer; the unused Lucide dependency is removed. The official runtime
package is not installed: only selected licensed Free asset paths are integrated.
[Migration, source integrity, coverage and actual checks](migration.md).

Adoption requirements applied by the D33 implementation:

1. Record the migration decision, licensing outcome, selected style, and intended scope.
2. Define shared semantic icons for navigation/actions instead of copying SVG markup across features.
3. Preserve shadcn/ui controls, Tailwind styling, Bklit charts, existing tokens, French labels, and component geometry.
4. Use `currentColor` and semantic state tokens where appropriate; do not introduce hard-coded catalogue/demo colors.
5. Keep destructive actions tied to the existing destructive semantics, not an arbitrary icon palette.
6. Hide decorative icons from assistive technology; give icon-only controls an accessible French name and preserve keyboard/touch targets.
7. Do not replace KAY's logo with an icon or use icons as the sole indication of status.
8. Avoid a partial migration that leaves visually conflicting families across shared controls without an explicit transition plan.

Related project contracts: [DESIGN.md](../../../DESIGN.md), [design system](../../04-design/design-system.md), [UI components](../../04-design/ui-components.md), [styling](../../04-design/styling.md), [UI skill rules](../../03-planning/ui-skill-rules.md), and [security check](../../SECURITY_CHECK.md).

## 10. Verification and future acceptance

Collection evidence:

- Official introduction, getting-started, library/platform, integration, package, licensing, attribution, and MCP pages reviewed.
- Published npm metadata and the 0.1.1 entry point inspected without installing or executing the package.
- Documentation links and scope consistency checked; no icon assets or upstream documentation pages mirrored.
- Application dependencies, lockfiles, branding tokens, screens, database, and infrastructure unchanged.

Future implementation must verify: lint/typecheck/build, correct emitted assets, no hydration warnings, missing-icon behavior, accessible naming, inherited colors, responsive/touch geometry, and actual visible browser behavior. Include a production-build check with the intended asset policy; choose static exports if the package cannot meet it reliably.

**Application, browser, package compatibility, and licensing approval: not executed/obtained by this documentation task.** Use the existing [QA register](../../QA_COMMANDS.md) for real implementation commands and evidence, not as a claim that these proposed integration steps already pass.
