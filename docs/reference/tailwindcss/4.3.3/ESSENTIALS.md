# Tailwind CSS: KAY offline playbook

Status: original, condensed learning reference; not a substitute for the official API pages  
Date: 2026-10-14  
Confirmed decision: Tailwind CSS supplies the default styling for KAY's Next.js interface; custom CSS is exceptional.  
Technical proposal: use these patterns during feature implementation, then consult the [official-page index](INDEX.md) for exact utilities and version-specific behavior.  
References: [KAY styling guide](../../../04-design/styling.md), [official Tailwind documentation](https://tailwindcss.com/docs), [full page index](INDEX.md).

## Mental model

Tailwind provides small, composable CSS utilities. A class describes one concern, such as `grid`, `gap-4`, or `text-sm`. Prefix a utility with a variant for a condition: `md:grid-cols-2` at a breakpoint, `focus-visible:ring-2` for keyboard focus, or `disabled:opacity-50` for a disabled control. The build scans source files for complete class tokens and emits the matching CSS. See [utility-first styling](https://tailwindcss.com/docs/styling-with-utility-classes), [variants](https://tailwindcss.com/docs/hover-focus-and-other-states), and [class detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).

For KAY, compose utilities in feature components and shadcn/ui's copied controls. Reuse an interface pattern through a component or an explicit variant map. Avoid constructing utility names from runtime string fragments; the scanner will not see a complete class. Keep an approved set of complete classes in source, or use validated CSS variables for truly dynamic values.

## Utility families

| Family | What to use it for in KAY | Official reference |
|---|---|---|
| Layout and positioning | App shell, sticky toolbars, clipped media, overlays, visibility and stacking | [Display](https://tailwindcss.com/docs/display), [position](https://tailwindcss.com/docs/position), [overflow](https://tailwindcss.com/docs/overflow), [z-index](https://tailwindcss.com/docs/z-index) |
| Flexbox and grid | Navigation, form rows, card collections, responsive detail panels | [Flex direction](https://tailwindcss.com/docs/flex-direction), [grid columns](https://tailwindcss.com/docs/grid-template-columns), [gap](https://tailwindcss.com/docs/gap), [alignment](https://tailwindcss.com/docs/align-items) |
| Spacing | Consistent padding and margins from the approved scale | [Padding](https://tailwindcss.com/docs/padding), [margin](https://tailwindcss.com/docs/margin) |
| Sizing | Readable content widths, safe minimum sizes, full-height app shell | [Width](https://tailwindcss.com/docs/width), [max-width](https://tailwindcss.com/docs/max-width), [min-height](https://tailwindcss.com/docs/min-height) |
| Typography | Screen hierarchy, labels, amounts, tabular numerals, long text | [Font size](https://tailwindcss.com/docs/font-size), [font weight](https://tailwindcss.com/docs/font-weight), [line height](https://tailwindcss.com/docs/line-height), [numeric variants](https://tailwindcss.com/docs/font-variant-numeric) |
| Backgrounds and borders | Surfaces, separators, focus rings, status panels | [Background color](https://tailwindcss.com/docs/background-color), [border color](https://tailwindcss.com/docs/border-color), [radius](https://tailwindcss.com/docs/border-radius), [outline](https://tailwindcss.com/docs/outline-width) |
| Effects and filters | Restrained elevation or media treatments only when the design calls for them | [Box shadow](https://tailwindcss.com/docs/box-shadow), [opacity](https://tailwindcss.com/docs/opacity), [filter](https://tailwindcss.com/docs/filter) |
| Tables | Contact, property, import, and transaction lists; keep semantic table markup | [Table layout](https://tailwindcss.com/docs/table-layout), [border collapse](https://tailwindcss.com/docs/border-collapse) |
| Transitions and transforms | State change without obscuring critical information | [Transitions](https://tailwindcss.com/docs/transition-property), [animation](https://tailwindcss.com/docs/animation), [transform](https://tailwindcss.com/docs/transform) |
| Interactivity | Pointer behavior, touch/scroll affordances, caret and selection | [Cursor](https://tailwindcss.com/docs/cursor), [touch action](https://tailwindcss.com/docs/touch-action), [scroll margin](https://tailwindcss.com/docs/scroll-margin) |
| SVG and accessibility | Icon fill/stroke and forced-color compatibility | [Fill](https://tailwindcss.com/docs/fill), [stroke](https://tailwindcss.com/docs/stroke), [forced-color adjust](https://tailwindcss.com/docs/forced-color-adjust) |

The [full index](INDEX.md) enumerates every individual utility topic in the pinned source, including less common properties not shown in this summary.

## Responsive design and states

Author the base layout for narrow screens. Add breakpoint variants where the content actually needs a different arrangement, and verify real widths rather than assuming a device label equals a breakpoint. Container-query or arbitrary variants may help a reusable panel, but require a concrete layout reason. See [responsive design](https://tailwindcss.com/docs/responsive-design).

For controls, plan `focus-visible`, hover, disabled, invalid, and selected appearance alongside default appearance. Some hover variants apply only where hover is supported. Check focus and error styles in the browser, with keyboard and touch, not merely in a screenshot. If KAY decides to support dark mode, choose a single source of truth for the mode and map all semantic tokens consistently; [dark mode](https://tailwindcss.com/docs/dark-mode) documents media- and selector-driven approaches.

## Theme and limited CSS exceptions

Tailwind v4's [theme variables](https://tailwindcss.com/docs/theme) can define project values that become utilities. The stylesheet still needs `@import "tailwindcss";`. shadcn/ui uses semantic CSS variables, and Bklit expects chart variables; mapping those to approved KAY tokens is a normal, narrow CSS use. Keep the mapping centralized. Use [custom styles](https://tailwindcss.com/docs/adding-custom-styles) or a [custom utility](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities) only for a real gap, and leave a reason in the feature review.

Avoid using `@apply` to recreate a conventional component stylesheet by default. A small adapter for a third-party integration can be justified, but its owner and scope should be clear. Arbitrary values help one-off cases; repeated values belong in the shared token system. Do not use `!important` to hide conflicting design rules without finding the source of the conflict.

## Integration and verification

Follow the [Next.js/PostCSS setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs) inside the future app. Inspect what Next.js or shadcn/ui already generated before adding configuration. The official [Preflight](https://tailwindcss.com/docs/preflight) reset affects default element styles, so explicitly style headings, lists, tables, form controls, and content rendered from external text where needed.

Before merging a frontend feature, build production CSS and check that every conditional style appears, including uncommon states. Review mobile and desktop layout, keyboard focus, touch, zoom, contrast, empty/error states, and reduced motion. Use Playwright visual and interaction checks when the application exists. No application tests have been run for this documentation work.
