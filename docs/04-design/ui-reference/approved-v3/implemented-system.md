# Approved V3 implemented interface system

Status: source-grounded implementation notes, 2026-10-16. These notes describe
the completed UI-only implementation at build `n1_H8AryVi9k9f4trftmy`; they do
not replace [DESIGN.md](../../../../DESIGN.md), approve its pending merge, or
record Khalid's product acceptance. The [execution ledger](execution.md) owns
command results and their limits; the [coverage ledger](coverage.md) owns the
route and contextual-surface review record.

## Subsequent icon migration

Khalid's D33 request replaces the Lucide baseline described in this historical
V3 build record with Iconsax. All geometry, tokens, brand assets, photos and
Bklit chart paths remain unchanged. [Current migration/provenance/verification](../../../reference/iconsax/migration.md)
owns that later evidence; the original build's results below are not relabelled
as Iconsax test results. The wider DESIGN.md merge remains separate.

## Overview

The implemented application follows the nine [Approved V3 compositions](README.md):
charcoal navigation with restrained gold selection, a compact white header,
light neutral work canvas, white tables and form sections, vertically stacked
record facts, meaningful state colors, a city dashboard band and a faded-villa
authentication scene. These elements serve an existing French real-estate CRM;
the implementation retains its data, fields, actions and permissions.

The source is the authority for the measurements below. The existing
[product pointer](../../../../PRODUCT.md) links the binding product contracts;
it creates no new specification. No new visual metaphor, font family, icon
family or product workshop was introduced by this documentation pass.

The implementation uses shadcn/ui source with Radix/New York anatomy, Tailwind
utilities and semantic CSS properties, Lucide icons, and the existing Bklit
chart source. Reusable KAY compositions live outside the primitive components.
The light theme is the approved scope; the presence of some inherited `dark:`
classes is not an implemented or accepted dark theme.

## Colors

[kay-ui-tokens.json](../../../../branding/kay-ui-tokens.json) supplies the color,
radius, control and layout primitives.
[theme.ts](../../../../frontend/src/lib/theme.ts) turns those groups into CSS
custom properties, placed on the root element by
[layout.tsx](../../../../frontend/src/app/layout.tsx).
[globals.css](../../../../frontend/src/app/globals.css) maps them to Tailwind
semantic roles. Consumers use roles such as `background`, `primary`, `ring`,
`info` and `sidebar-accent` rather than selecting an entity-specific palette.

| Implemented role | Source value | Use |
|---|---|---|
| Canvas | `surface.canvas` = `#F7F7F5` | Main light work area |
| Content / overlay | `#FFFFFF` | Forms, tables, cards, sheets and dialogs |
| Charcoal | `#272727` | Primary text, primary action and navigation rail |
| Secondary text | `#5E5E5E` | Supporting text and labels |
| Warm selection | `#F6ECDA` | Selected or warm contextual surface with charcoal text |
| Gold text / focus | `#795821` | Links, focus ring and selection indicator |
| Brand gold | `#C9A75C` | Restrained identity detail and sidebar focus; not small text on white |
| Selected navigation | `#413A2D` / `#F1D99F` | Background / readable foreground on the charcoal rail |
| Control outline | `#767676` | Input boundary |
| Subtle outline | `#D8D4CC` | Surface and table dividers |
| Muted surface | `#F4F2ED` | Quiet hover and grouping |
| Primary hover / pressed | `#3A3A3A` / `#171717` | Primary button feedback |
| Destructive action | `#B4232F` / `#FFFFFF` | Dangerous action fill / label |

The token file also retains brand ivory (`#FAF8F4`) and the original-logo black
(`#000000`). Brand ivory is not the active canvas value. Black belongs to the
supplied logo's opaque background, which the shared Brand component preserves.

| Semantic family | Background | Foreground | Border token |
|---|---|---|---|
| Success | `#E8F5EE` | `#216E4E` | `#2E7D58` |
| Warning | `#FFF4D9` | `#8C5400` | `#A56400` |
| Danger | `#FDEBEC` | `#A11D22` | `#C7313C` |
| Info | `#EDF4FF` | `#1E5AA8` | `#2B64B1` |
| Neutral | `#F2F3F5` | `#4B5563` | `#767676` |
| Purple | `#F1EDFA` | `#62439A` | `#9477C1` |
| Teal | `#E8F4F2` | `#23695F` | `#4B8E82` |

These families distinguish real states or categories and are accompanied by
text. The shared Badge uses the family's foreground/background and a low-opacity
current-color border; the explicit border tokens above are not a claim that
every badge consumes that border value. Dashboard highlights map Contacts to
info, Demandes to purple, active Affaires to warning, won outcomes to success,
and collections to teal. This is the implemented metric mapping, not a new
business-state definition.

Chart series tokens are charcoal (`#272727`), deep gold (`#795821`), blue
(`#1E5AA8`), purple (`#6A4EA1`) and teal (`#237561`). The pipeline composition
uses the corresponding semantic state families with direct labels and counts.
Brand accent limits do not erase these functional category distinctions.

## Typography

The active family is `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
sans-serif`, declared in `globals.css`. It preserves the accepted local fallback
and avoids claiming an installed or licensed Satoshi face. `theme.ts` does not
consume the token file's `typography` or `spacePx` groups. The JSON's Satoshi
family and 48/32/20px display/title/section proposals therefore must not be
documented as rendered typography.

| Observed shared role | Active source treatment | Purpose |
|---|---|---|
| Route / record title | `clamp(1.75rem, 1.5rem + 1vw, 2.375rem)`, line height 1.2; usually weight 700 | Responsive 28-38px identity; authentication uses weight 600 |
| Section heading | 18px, line height 1.5; weight 500-700 by component | Form, record and section hierarchy |
| Body | 14px with relaxed line height (1.625) | Dense operating interface |
| Input text | 16px below `md`, 14px from `md` | Readable mobile entry with compact desktop fields |
| Labels / navigation / controls | Usually 14px, weight 500 | Task and action identification |
| Caption / table heading / badge | 12px; badges use 16px line height | Secondary metadata and compact labelled states |
| Primary KPI value | 24px, weight 600, tabular numerals | Readable clickable metric value |

Long French labels and record names wrap within `min-width: 0` containers.
Actual identity is the title of record pages. Phone/e-mail sublines on shortened
record links have explicit accessible descriptions in the final source.
Supporting type is not a reason to shrink a required control's hit area.

## Layout

The source uses a 4px utility rhythm with reused gaps/padding of 8, 12, 16, 20,
24 and 32px. Parent grids/flex rows own section spacing; shared components own
their internal padding. These are observed utility values, not an assertion
that the JSON spacing object is injected into CSS.

| Shared geometry | Active implementation |
|---|---|
| Desktop rail | 224px, sticky, full dynamic viewport height; visible from `lg` (1024px) |
| Main work container | Maximum 1440px, centered within the area beside the rail |
| Page side gutters | 16px; 24px from 768px; 28px from 1024px; safe-area insets applied once by the shell |
| Header | White, minimum 68px, wrapping real search and session controls |
| Main page stack | 16px gap; 20px vertical padding, 24px from `md` |
| Button / icon hit geometry | Minimum 44px; icon button 44px square |
| Regular fields | 48px root field role; compact filter fields explicitly use 44px |
| Table geometry | 48px table-header token; 16px horizontal / 8px vertical cell padding; actual rows can grow with content |
| Wide table role | 896px minimum when a consuming table requests `min-w-table`; named local horizontal scroll, not page overflow |
| Standard content surface | 16px padding, 20px from `md` |
| Form surface | 16px padding, 24px from `md` |
| Compact filter toolbar | 12px padding, wrapping controls, named secondary disclosure |
| Alert dialog | 16px mobile / 24px from `sm`; maximum 32rem width and `100dvh - 2rem` height; scrollable content |
| Reading container | 52rem |

The 40px `buttonDesktop` and `inputDesktop` primitives remain in the token file
but do not describe the active shared Button/Input defaults. The touch-oriented
roles above are what their current source consumes.

There is also an inactive desktop field-height declaration: `globals.css`
declares `--control-input-touch: 2.75rem` from 64rem, but `theme.ts` sets that
property inline on the root element to 3rem. The inline value wins the CSS
cascade. The 44px desktop declaration is therefore not recorded as an effective
field measurement or a new invariant; the actual compact-toolbar rule sets
`h-control` directly.

From 1024px, the shell presents the rail and main content as a two-column grid.
Below it, a real Sheet contains navigation; the shell closes it on destination
selection and moves focus to the destination heading. Search moves to its own
full-width header row on narrow layouts. Tabs, headings and action rows wrap.
Form sections stack, inventory grids reduce columns, and the calendar switches
from its desktop week grid to a day-by-day agenda below `xl` (1280px).

Dense desktop calendar overlaps keep separate appointment lanes within a named,
keyboard-focusable local scroll region so each appointment can retain a 44px
target. Local table/calendar scrolling is intentional and distinct from page
overflow. Backend Casablanca civil-time resolution and real seven-day semantics
remain authoritative.

## Elevation & Depth

Work surfaces are primarily flat: white or muted fill, a subtle border, and
controlled spacing separate table, form and record regions. Main cards do not
receive a shared floating shadow. Modal dialogs and Sheets retain the existing
Tailwind `shadow-lg` treatment and a darkened overlay to identify a temporary
foreground task. Bklit tooltips retain their local chart-component treatment;
those values are not promoted into a new application-wide elevation scale.

Button/navigation/table feedback uses color transitions. Sheets retain their
existing 150ms open/closed animation classes. Bklit pipeline bars disable
animation for this composition. The global reduced-motion rule sets animation
and transition durations to zero. No new motion vocabulary is defined here.

The city and villa have light directional scrims to keep functional text and
forms legible over the image. This is a local image-overlay device, not a
general invitation to add gradients or glass surfaces.

## Shapes

The active small and medium radius roles both equal 6px; the large role equals
10px. Buttons, inputs, ordinary surfaces, tables and small icon tiles use the
6px roles. The authentication panel and alert dialogs use the 10px role.
Circular initial avatars and tiny semantic chart dots have their distinct
functional silhouettes; they do not make action buttons or record containers
pill-shaped. Record facts remain a vertical label/value stack rather than a
two-column private-contact panel.

## Components

| Shared component / pattern | Implemented anatomy and behavior |
|---|---|
| `PageHeader` | Real route or record identity, responsive bold title, explanation below it, existing actions alongside when space permits; wrapped on narrow screens |
| `AppShell` / `Navigation` | Charcoal rail, gold-toned selected row with `aria-current`, white search/session header, restricted Settings destination, mobile Sheet, skip link and destination focus |
| `Button` | shadcn CVA/Slot anatomy; primary, destructive, outline, secondary, ghost and link variants; min 44px; hover/pressed, visible focus, invalid and disabled states |
| `Input`, `NativeSelect`, `Textarea` | Shared neutral field geometry and strong boundary; real labels and validation association; focus, invalid, disabled and retained-input state supplied by existing forms |
| `Table` / `DataTable` | shadcn table structure plus existing TanStack behavior; caption, muted header, compact rows and row hover; labelled, focusable scroll region when supplied by the consumer |
| `Badge` | Source-owned shadcn-style CVA/Slot composition; seven semantic variants, text label and modest 6px corners; no invented workflow state |
| `Tabs` | Radix tabs, thin bottom selection rule, 44px triggers, wrapping row and visible focus; current supported tabs only |
| `RecordStatusStrip` | Thin read-only ordered list of supported statuses, `aria-current="step"` and an explicit screen-reader current-status phrase; it is not a transition control |
| `SectionHeading` / form surfaces | Meaningful 16px Lucide icon in a 32px semantic tile; neutral Contact/Demande and related sections; one contextual surface for task/finance forms rather than nested outlined cards |
| `DataState` / record state views | Loading status and skeleton rows; contextual error/retry; meaningful empty state; existing denied/not-found/conflict/success handling remains in feature components |
| `NumberedPages` | Existing numbered pagination and current scoped totals; no cursor-pagination replacement |
| Project identity / cards | Shallow thumbnail/identity/summary strip followed by compact tabs; separate physical-unit and whole-programme offering facts; neutral card bodies |
| `PipelineOverview` / Bklit reports | Real scoped current counts, directly labelled horizontal Bklit bars, text counts, zero/empty and loading/error paths; no implied conversion or date-cohort metric |
| `InventoryThumbnail` | Lazy observation, current non-archived clean image version from the authorized parent, existing private permit/byte-transfer path, temporary revoked blob URL and explicit loading/unavailable fallback |

Lucide remains the approved existing family. Icons identify the adjacent real
task: CalendarDays for visits, Handshake for affaires, House/Building2 for
inventory, Users for contacts, and section-specific field context. Decorative
icons are hidden from assistive technology; icon-only actions have accessible
names. The family was not selected anew for its library appearance.

The dashboard's compact KPI row, two pipeline panels and beginning of daily work
share the first desktop viewport; health/retry/audit controls sit in the city
header. Existing period controls and the current-versus-selected-period labels
remain. These layout choices do not change metric definitions or permissions.

The authentication family uses a left/top anchored single column, a maximum
42rem desktop panel and a faded villa background. The supplied logo is rendered
at its original 652:616 ratio on black. Unsupported support/privacy links are
not added simply because they appeared in a composition.

Asset provenance:

- `frontend/public/images/login-villa.png` is generated decorative imagery of
  an invented Moroccan Mediterranean villa; its embedded `impeccable:prompt`
  says it is never a property listing or advertisement. It has no people,
  listing text, logo or interface. AuthFrame supplies the fade in CSS.
- `frontend/public/images/dashboard-city.png` is a generated illustrative
  Casablanca panorama. Its embedded prompt excludes any claim about an exact
  view or inventory record, along with text, logos and interface. PageHeader
  supplies the legibility scrim in CSS.
- The shared `Brand` uses the owner-supplied 2026-10-16 Luxury Gold PNG on black
  and transparent Champagne Gold PNG for authentication. The earlier active logo
  is removed; [asset provenance and favicon coverage](../../../../branding/kay-logos.md)
  supersede the original screenshot's artwork only, not its layout.
- Inventory cards use authorized record files through `InventoryThumbnail`;
  neither generated scene supplies a record photograph. Missing, pending and
  failed previews remain honestly described.

## Do's and Don'ts

Do reuse the existing semantic mappings and shared shell, headers, control,
table, tab, section and state patterns. Do let real fields and French text grow
the layout. Do keep status labels and API-authorized numbers alongside color.
Do retain at least 44px effective controls, visible keyboard focus, meaningful
local scroll regions and reduced-motion behavior. Do keep neutral form/project
bodies and the compact route-controls-data sequence shown by V3.

Do not turn the token JSON's inactive typography proposals into installed-font
claims. Do not infer unsupported metrics, workflow transitions, routes or actions
from a screenshot. Do not replace private file transfer with public image URLs,
use decorative generated assets as inventory evidence, redraw the supplied logo,
or replace Lucide/shadcn/Tailwind/Bklit under an aesthetic preference. Do not claim
human acceptance from a reviewer verdict or successful automated checks.

Documentation limitation: the existing root DESIGN.md still has its earlier
implementation-pending status and AFTER wording. The current request explicitly
uses antislop DURING; separate AFTER-only findings still require selection.
The already-asked merge-versus-refresh choice has no answer, so DESIGN.md and a
paired `.impeccable/design.json` remain unchanged. This file is descriptive
implementation evidence, not a silent merge or a substitute canonical sidecar.

Not canonized: stale root status/timing, inactive proposed font/type values and
the overridden desktop field-height declaration are recorded as drift, not
future design rules. The missing licensed font files
and transparent/vector KAY master remain asset limitations. No audit-only fix,
new craft-floor prohibition or browser-verification claim is created here.
