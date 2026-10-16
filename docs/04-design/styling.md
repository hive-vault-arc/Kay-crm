# KAY styling with Tailwind CSS

Status: SP-01 Tailwind 4.3.3 and light token mapping implemented; later feature checks pending  
Date: 2026-10-14  
Confirmed decision: Tailwind CSS is KAY's mandatory primary styling system. Custom CSS is allowed only for a specific, justified need that utilities do not cover well; no substitute CSS framework or parallel default styling system.  
Accepted local default: existing light tokens, Radix/New York and system sans-serif; final brand/font approval is later validation. Dark mode is outside the local roadmap.  
References: [decision register](../../decisions.md), [KAY design system](design-system.md), [token file](../../branding/kay-ui-tokens.json), [shadcn/ui guide](ui-components.md), [Bklit chart guide](charts.md), [Tailwind reference](../reference/tailwindcss/4.3.3/README.md), [official Next.js installation](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Working rule

Use Tailwind utility classes for ordinary layout, spacing, sizing, typography, color, borders, states, responsive behavior, and motion on every frontend feature. Keep those classes close to the component they style. Reuse a real interface pattern by extracting a React component or variant, especially when it carries behavior or accessibility, instead of maintaining a second stylesheet of renamed utility combinations. shadcn/ui components are copied into the app and can be adapted with Tailwind classes; Bklit charts should consume the same approved design tokens.

Custom CSS remains appropriate for the Tailwind import and theme variables, shadcn/ui semantic tokens, Bklit's `--chart-*` variables, a small global base rule, or a narrowly scoped integration/style that is awkward or impossible to express clearly with utilities. Add a short reason next to each non-obvious exception and keep it owned by the relevant component or theme layer. Do not introduce Sass, CSS Modules, CSS-in-JS, another CSS framework, or a broad collection of hand-written component selectors as another default styling system. This is a KAY project rule, not a limitation of Tailwind itself.

The approved local roadmap selects the existing [design-system](design-system.md) light tokens for implementation. Use semantic surface, foreground, border, focus and status roles; preserve focus/contrast and non-color labels. Default Tailwind/shadcn/chart demo colors do not replace those tokens. Final brand/font validation remains a separate real-use review.

## Installed foundation and installation reference

SP-01 installed Tailwind and its PostCSS plugin at 4.3.3 in `frontend/`, with one global import in `frontend/src/app/globals.css`. `frontend/src/lib/theme.ts` maps the root JSON into semantic variables; narrow base/focus/safe-area/reduced-motion CSS is documented in source. The [execution record](../03-planning/sprints/sp-01-evidence.md) contains verified commands. The [official Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs) illustrates the PostCSS integration:

```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

Add `@tailwindcss/postcss` to `postcss.config.mjs`, then import Tailwind once from the app's global stylesheet:

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

```css
@import "tailwindcss";
```

Ensure the root Next.js layout imports that stylesheet. If the app generator already configured Tailwind, inspect the generated files and avoid a second import or duplicate PostCSS plugin. Versions are now pinned in the frontend manifest/lockfile; the generic snippet above is reference, not the exact SP-01 command history. Recheck version-matched guidance before a later upgrade.

## Implementation conventions

| Concern | KAY convention |
|---|---|
| Repeated styling | Extract an accessible component or a small, explicit variant map when it represents the same UI pattern. Do not abstract a one-off class list only to make it shorter. |
| Conditional styles | Use complete class strings in source. Tailwind's scanner cannot discover classes assembled from fragments such as `bg-${color}-600`. Map allowed variants to complete classes. |
| Theme and tokens | Put approved tokens in one deliberate theme layer; use Tailwind v4 `@theme` where a token should generate utilities, and CSS custom properties where shadcn/ui or Bklit expects them. Document mappings and any light/dark variants. |
| Responsive UI | Start with the small-screen layout, then add breakpoint variants as content needs them. Check desktop and mobile tables, dialogs, forms, charts, and navigation for overflow, touch targets, and zoom. |
| Interactive states | Specify hover, keyboard focus, disabled, invalid, loading, and selected states where relevant. Hover alone is insufficient for touch or keyboard users. |
| Motion | Use motion only where it clarifies state; respect `prefers-reduced-motion`. |
| Arbitrary values | Use sparingly for genuine one-offs. Promote repeated values to an approved token instead of proliferating near-identical values. |
| Dynamic API values | Do not turn untrusted input into class fragments. For genuinely runtime CSS values, validate them and use a CSS custom property or a narrowly scoped inline style. |
| Custom CSS | Keep it near the owning integration or in the small global theme layer. Explain why Tailwind utilities or component variants were unsuitable. |

For exact behavior, consult the official pages on [utility classes](https://tailwindcss.com/docs/styling-with-utility-classes), [class detection](https://tailwindcss.com/docs/detecting-classes-in-source-files), [responsive variants](https://tailwindcss.com/docs/responsive-design), [states](https://tailwindcss.com/docs/hover-focus-and-other-states), [theme variables](https://tailwindcss.com/docs/theme), [custom styles](https://tailwindcss.com/docs/adding-custom-styles), and [dark mode](https://tailwindcss.com/docs/dark-mode). The [full topic index](../reference/tailwindcss/4.3.3/INDEX.md) covers the entire documentation navigation, including individual utility references.

SP-05 adds only the semantic `layoutPx.tableMinWidth` (896px) token and Tailwind
`--spacing-table` alias for the configurable Leads table. The labeled inner
scroller contains intentional horizontal overflow; the page and forms reflow.
Long contact-choice buttons wrap with at least the existing control minimum.
No new palette, typeface, motion system, chart library or standalone CSS layout.

## Quality checks for each frontend feature

SP-22 restores the existing2px/4px keyboard outline outside the base cascade
layer. shadcn utility-layer outline-none otherwise suppresses it, leaving a
50%-opacity shadow below the required3:1 boundary contrast. This narrow global
CSS exception enforces the existing deep-gold focus token and sidebar override;
it adds no palette, component, layout or chart rule. The rendered regression is
frontend/tests/e2e/focus.spec.ts; final results belong to the
[SP-22 ledger](../03-planning/sprints/sp-22-execution.md).

Review the component in French at mobile and desktop widths, Chrome and Edge desktop, Chrome and Safari mobile, keyboard and touch, and browser zoom. Include loading, empty, validation, denied, conflict, and error states when that feature needs them. Check production CSS output for missing conditional classes and verify screenshots/flows with Playwright. SP-01's applicable shell/shared-state checks passed; actual iPhone/Safari and later business features remain unverified. See [QA commands](../QA_COMMANDS.md) for reproducible checks and limits.
