# KAY interface design system

The owner-supplied KAY prototype is the visual authority as of 2026-11-10.
Its source is the inner `kay` project in the supplied folder. Compare the
final stylesheet cascade loaded by `src/main.js`, the rendered light/dark
states and the matching viewport. [Design entry point](../../DESIGN.md)

| Layer | Source and rules |
| --- | --- |
| Tokens | [Workspace tokens](../../branding/prototype/kay-workspace.tokens.json) provide light/dark values, geometry, typography and motion. `frontend/src/lib/theme.ts` exports them through the existing semantic Tailwind roles. |
| Shared CSS | `workspace.css` owns theme resolution, the shell, atmosphere and overlay geometry. `workspace-primitives.css` owns shared control feedback, borders and scrollbars. `globals.css` maps Tailwind roles and retains the existing feature recipes for staged review. |
| Typography and icons | Inter Variable in all UI roles. Workspace titles use 19px/700, section titles 17px/650, labels 13px/550 and table headings 13px/600. The typed Lucide registry preserves the 1.85 stroke and reference shapes. Labelled actions use 16px glyphs and standard icon actions use 18px glyphs. |
| Materials | Pearl canvas `#f6f7f9` and graphite canvas `#151719`. Use the same pinned texture at 44% multiply in light mode and 36% screen with grayscale/inversion in dark mode. Outer glass uses a 1px edge, 24px radius and 18px blur. Nested controls use the selected solid fill. |
| Geometry | 96px rail, 80px desktop header, 48px rail controls, 88px rail navigation inset and 14px item gap. At 830px and below the header is 64px with 12px page insets. Keep the source's 20px field radius, pill buttons and 18px inset radius. |
| Controls | 40px desktop labelled buttons with 14px inline padding and 8px icon gap. Standard desktop fields are 40px high, with a 16px radius for multiline fields. Touch controls retain 44px hit targets. Text input edges appear on focus or validation. Selects and outline actions use a 1px line. Menus use 18px outer corners, with 12px on their items, pager buttons and table header ends. |
| Motion | The shared curve is `cubic-bezier(.22,1,.36,1)`. Controls transition for 260ms. Hover lifts 1.5px and scales to 1.01, while press scales to .985 for 120ms. Menus use 280/200ms with a -4px offset and .985 scale. Drawers use 420/300ms with 20/16px offsets. Route entrance uses 460ms and 6px. |
| Status and charts | Keep the existing reference badge palette and wire-role mappings. Shared chart colors resolve through the reference status families. Bklit charts keep real, role-scoped values. |

The source uses Motion 14.4.0, Lucide 1.59.0, Bklit/Visx and Lenis 1.3.27.
KAY uses the same Motion and Lenis versions. Motion reveals the four
dashboard KPI cards over 320ms with a 40ms stagger when the group mounts.
The cards continue to display their exact server values during the reveal.

Shared CSS owns route, menu, feedback and overlay motion. A centered dialog
travels 8px on entry and 6px on exit. Sheets travel from their attached edge.
Radix retains the portal through the exit when the primitive stays mounted.
It restores focus afterward. Record drawers notify their parent after this
lifecycle completes.

Lenis eases vertical wheel input over 600ms on fine-pointer desktops. It
uses the existing workspace page, overflowing tables or project grids, and
drawer bodies as scroll owners. Touch, keyboard, horizontal input, focused
fields and protected nested panes use native scrolling. Opening a modal or
enabling reduced motion interrupts inertia at the current scroll position.

The adapter dimensions in the token file keep existing feature layouts
connected to the shared system until their page review. The prototype's
demo records, standalone Vite app and business handlers are outside this
foundation. Each later component or page pass should compare normal, hover,
focus, pressed, disabled, loading, empty, error and open/close states where
applicable, in both themes and at desktop and phone widths.

Use opaque materials when reduced transparency is requested, preserve system
colors in forced-colors mode and suppress cosmetic motion when the user
requests reduced motion. Keep permission, keyboard and native scrolling
contracts during the staged review.

[Styling conventions](styling.md) · [Component guide](ui-components.md) ·
[Screen map](screen-map.md) · [Chart guide](charts.md)
