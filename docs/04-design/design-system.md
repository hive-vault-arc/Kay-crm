# KAY interface design system

## Projects directory: D39, 2026-10-18

Central `layoutPx` roles define projectFilterPanel314, projectCover148,
projectCardMin240, projectSort176 and projectFilterMinHeight728px. The rail aligns
with two card rows; actual content may grow, never clip. Auto-fill/minmax adapts
the four-column target to available container width, with one shared mobile Sheet.
Category rows retain44px targets and flex anatomy despite older rail fieldset
grid defaults. Plain card surfaces, Riviera categorical dots/badges and current
semantic campaign states remain separate. Generated photos are isolated test
assets, not generic pictures assigned to real records. Native sorting is short
and readable; reset is available in both desktop rail and mobile Sheet. See
[contract/evidence](../03-planning/projects-reference-refresh.md).

## Calendar composition: D38, 2026-10-18

The owner-supplied calendar extends existing Riviera geometry only. The central
`layoutPx` tokens define rail288, hour64, day header88, time rail56, day minimum96,
overlap lane52, inset4, viewport offset240 and minimum scrolling height608px.
Runtime positions use rem units;52px lanes retain≥44px links after insets even
with multiple overlaps. Mini-month week targets remain44px, unlike the tighter
reference dates. The seven-day timeline scrolls locally; mobile automatically
uses the agenda and shared filter Sheet. Blue/purple/cyan categorical fills
identify office/no-car/company-car; status stays textual and independently
semantic. Existing Iconsax building/people/car and clock assets carry meaning,
not decoration. See [scope and evidence](../03-planning/calendar-reference-refresh.md).

## Current override: Riviera, 2026-10-18

The owner-selected [Riviera handoff](../../branding/riviera/README.md) is now the
palette/type authority. Its191 exact tokens resolve through the existing semantic
role mapping: ivory canvas, warm-white panels, honey actions, deep olive-charcoal
sidebar, dark-gold text/focus, separate feedback and categorical chart colors.
Fraunces/Manrope/DM Sans replace the older system/Satoshi guidance below. Shared
controls use10px corners, panels12px, touch targets remain≥44px. Keep existing
route layouts except the later owner-supplied `/dashboard` and Lead/Deal screenshot
compositions; retain compact16px CRM gutters, business fields, French labels and Iconsax.
The original handoff CSS is reference data, not another imported component kit.
Fonts are self-hosted through `next/font/local` with retained OFL notices;
[runtime formats and exact versions](../../branding/riviera/README.md#fonts-and-licenses)
are recorded separately. The desktop rail uses
224px expanded and a proposed72px collapsed width; its toggle and every
destination remain keyboard-accessible. Desktop global search stays in that
rail, with the responsive header keeping the same function on narrower screens.

Owner-provided Lead/Deal references (2026-10-18) supersede only the earlier
directory/detail geometry below. The latest correction uses a140px coastal
panorama, separate results toolbar,314px filter rail/12px gap from1280px,
seven default columns, contact/agent initials and semantic status pills. Embedded
contact lists remain inline and the single mobile Sheet remains. Details use a
large contact identity,346px cream contact rail beside the status/workflow region
from1280px, then stack below; Leads pair request/message with actual follow-up
and assignment. Central `crm*` layout tokens own the new reusable dimensions.
Values, links, actions, permissions and endpoint filters stay schema/API-defined;
no screenshot sample is shipped as application data. The owner rejected the
earlier proportion-only pass; [current evidence and limits](../03-planning/crm-reference-fidelity.md)
must be checked before claiming visual acceptance.

2026-10-17 Lead/Deal alignment adds `layoutPx.tableTextColumnMinWidth` (160px),
mapped to the semantic `min-w-table-text` utility. Use it for selected name,
project and budget cells in the rich Leads/Deals tables so horizontal scrolling
preserves readable words rather than squeezing project names to single letters.
The named scroll region, existing table minimum and keyboard access remain.
Qualified history reuses `RecordFacts`/its `data-summary` marker so the legacy
record-stack single-column rule does not override the paired fact layout.
The earlier qualification-alignment iteration used compact inline Lead/Deal
filters; the2026-10-18 screenshot correction above supersedes that composition
with the reference-shaped rail and separate toolbar. Contacts/Projects keep
their existing rail.
Qualified forms pair budget/source/intent/notes with the first project and
follow-up. Additional project interests use subsequent balanced grid rows,
not a growing right column beside an empty left column. Existing section,
control, gap and breakpoint tokens remain; no arbitrary spacer is introduced.

Status: Approved V3 visual target selected; shared token mapping exists, redesign verification pending  
Date: 2026-10-15  
Confirmed direction: KAY asked for a white/ivory-led 60–30–10 balance, visible colors for meaningful statuses, and consistently red destructive actions. shadcn/ui, Tailwind CSS, and Bklit UI are mandatory implementation choices; the palette below remains proposed.  
Technical proposals: the secondary and accent colors, exact hex values, semantic mapping, typography, geometry, and component recipes below.  
References: [KAY UI tokens](../../branding/kay-ui-tokens.json), [KEPVY branding guide](../../branding/README.md), [KAY logo references](../../branding/kay-logo-reference-flat.png), [decisions](../../decisions.md), [Tailwind guide](styling.md), [shadcn/ui guide](ui-components.md), [chart guide](charts.md), [C13 requirements](../../core-scope.md), [Adobe on 60–30–10](https://www.adobe.com/uk/creativecloud/design/discover/complementary-colors.html), [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [W3C use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), and [USWDS state tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/).

## Lead/Deal interface refinement,2026-10-17

The owner's current request supersedes the older inline-filter and stacked
record composition only on Lead/Deal list/detail/create/edit routes. These
routes use the full available shell width with16px safe insets. Full directories
reuse the existing256px left filter rail/24px gap at1280px and a single labelled
mobile Sheet below it; embedded contact lists remain inline. Detail panels pair
at1280px with one factual column per panel. Major form sections pair at1536px;
their nested contact/qualification grids use the existing64rem container
breakpoint so a wide viewport cannot squeeze fields inside a narrower panel.
KAY's palette, Iconsax, semantic controls, authority and unrelated route geometry
remain. No new global token, font, raster or dependency is introduced.
[Current scope and evidence](../03-planning/leads-deals-interface-refresh.md).

## Approved V3 visual target

Khalid selected the [nine Approved V3 screenshots](ui-reference/approved-v3/README.md) under [D32](../../decisions.md). Their route map and unpictured-page extension rules govern future appearance. Keep the city dashboard header, distinct KPI/pipeline colors, faded-villa login, neutral form/card surfaces, compact tables and vertically stacked record details. Where an older visual proposal below differs, follow V3 while preserving semantic accessibility and existing functional contracts. Reconcile exact geometry/color values centrally in the implementation; this documentation update changes no token JSON, CSS or application source. Earlier sprint checks are not proof of V3 compliance.

## Identity and design intent

Owner-requested directory layout,2026-10-16: shared `FilterResultsLayout` places
the existing search/filter form in a256px left rail (`layout.filterPanel`) with
a24px gap to `minmax(0,1fr)` results at the content-tested1280px breakpoint.
Below it, one labelled shadcn Sheet replaces the rail. There is one active form,
not hidden duplicates. Visible labels and single-column controls retain44px
targets; long rails scroll within the viewport. Wide tables keep named keyboard-
scrollable regions and show the helper when actual overflow exists, including
desktop widths. Contact-record lists retain their inline presentation. Existing
KAY tokens, gold creation/quiet utilities, black navigation and real handlers
remain authoritative. [Scope and evidence](ui-reference/approved-v3/filter-rail.md).

Owner-requested refinement,2026-10-16: `color.surface.sidebar` is pure black
`#000000`, matching the existing logo background, for both desktop navigation and
the mobile drawer. This explicitly overrides the older charcoal/black exclusions
below for this one surface. Main text/actions remain charcoal; gold selection,
white sidebar text, geometry and the account/logout footer are unchanged.

Owner-requested compact-space rule,2026-10-16: avoid large empty viewport bands
caused by arbitrary page-frame max widths or generous outer padding. Full-page
surfaces should use their available shell width; retain a narrow max-width only
for content whose reading/form legibility benefits from it. Keep small safe-area
insets and intentional internal rhythm, including 44px touch targets and dialog
clearance. This rule removes dead space, not all whitespace. The login refinement
below applies it to `/login`; other route-specific geometry remains governed by
Approved V3 and is reviewed when that surface changes.

KEPVY is the software product; KAY Real Estate is the customer and the intended visible identity for this team's workspace. The five existing branding pages specify a **KEPVY** rounded-K identity with white `#FFFFFF`, neutral dark grey `#272727`, soft beige `#F6ECDA`, and proposed Satoshi typography. The supplied **KAY** logo is a different, fine-line key-and-wordmark in cream/gold on black. Neither logo should be substituted for the other. This document adapts the neutral foundation to a KAY-facing CRM and proposes one restrained gold family because of KAY's supplied mark. It does not revise the KEPVY logo master or assert that KAY's raster artwork contains an exact flat gold hex.

The intended feeling is a quiet real-estate workroom: clear records and decisions first, the KAY identity present without competing with dense CRM data. A dark navigation rail can anchor the workspace; white content areas carry forms and tables; a small gold line or fill highlights the current place or a selected item. The logo's key geometry may inform a simple line divider or selected-state indicator, but not repeated decorative key icons. Data and workflow cues outrank decoration.

## 60–30–10 composition

Adobe describes 60–30–10 as a **balance heuristic**—dominant, secondary, accent—not an accessibility rule or an exact pixel quota. For the default *light* workspace:

| Share | Family | Where it belongs | Where it does not belong |
|---|---|---|---|
| About 60% | White `#FFFFFF`, warm ivory `#FAF8F4`, and the existing soft beige `#F6ECDA` | Main canvas, form/table surfaces, large breathing areas, occasional warm grouping | Beige is not the default text or a weak border on white |
| About 30% | Neutral dark grey `#272727` plus its neutral text/structure tones | Navigation rail, primary text, headings, principal actions, high-importance framing | Do not force 30% of every screen into a dark rectangle; text and structure have visual weight |
| At most about 10% | Proposed champagne gold `#C9A75C` and deep gold `#795821` | Active navigation cue, selected tab/filter, occasional important highlight, KAY brand detail | Not all buttons, charts, alerts, body text, or full-page backgrounds |

The percentages guide the *brand composition* of a typical screen. They do not limit semantic warning/success/danger colors or categorical chart colors, which are functional exceptions used only where data or state requires them. A dense record table may naturally have far less than 10% gold. Gold must never displace red on destructive actions or amber on warnings.

## Color source of truth

The exact proposed values live in [`branding/kay-ui-tokens.json`](../../branding/kay-ui-tokens.json). The first, third, and fourth base colors below come from the existing KEPVY guide; ivory and both gold values are KAY UI proposals. KAY's supplied logo uses a textured gold gradient, so the flat gold is an interpretation, **not** a sampled or approved logo color.

The token file separates base colors from the semantic `surface`, `content`, `selection`, `action`, `status`, and `chart` roles. Features should consume the role, not infer a meaning from a color name. For example, the canvas is `surface.canvas`, ordinary body text is `content.primary`, a selected navigation row is `selection.background` plus `selection.indicator`, and a dangerous action is `action.destructiveBackground`. The selected row also needs visible label treatment and `aria-current` or an equivalent programmatic state; a gold strip alone is insufficient.

| Token | Hex | Role and safe pairing |
|---|---|---|
| `brand.white` | `#FFFFFF` | Default content surface; pair with charcoal or other approved dark text |
| `brand.ivory` | `#FAF8F4` | Optional large canvas, not a text color |
| `brand.beige` | `#F6ECDA` | Warm selected/feature surface; use charcoal text and a visible selection cue |
| `brand.charcoal` | `#272727` | Navigation, headings, body text, primary button; use white text on filled surfaces |
| `brand.gold` | `#C9A75C` | Decorative accent or filled highlight with **charcoal** text; not small text on white |
| `brand.goldText` | `#795821` | Accessible small gold text, icons, and focus ring on white/ivory |
| `neutral.borderStrong` | `#767676` | Required control outline on white when the border identifies the control |
| `neutral.borderSubtle` | `#D8D4CC` | Decorative divider only; not the sole boundary of a required input |

Black `#000000` belongs to the supplied KAY logo reference background, not to the general application palette. Do not place the black-background raster logo on ivory or charcoal as if it had transparency. Preserve the original artwork and proportions; do not recolor its pixels, retype its wordmark, or add effects. Before production use, obtain a licensed/approved transparent vector master, minimum-size variants, and clear-space rules. Until then, use the supplied images only as references or on their original black background with descriptive alternative text. The [flat reference](../../branding/kay-logo-reference-flat.png) and [textured reference](../../branding/kay-logo-reference-textured.png) were copied from the user's supplied images; no image editing was performed.

### Contrast decisions

Calculated from the proposed flat hex values using the [W3C contrast formula](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); these are token-pair checks, **not** a rendered UI audit:

| Pair | Ratio | Intended use |
|---|---:|---|
| Charcoal on white | 14.94:1 | Main text, primary buttons reversed |
| Charcoal on ivory | 14.08:1 | Main text on warm canvas |
| Charcoal on beige | 12.75:1 | Selected/feature surface label |
| Charcoal on proposed gold | 6.52:1 | Gold-filled accent with dark label |
| Deep gold on white | 6.50:1 | Gold text or focus indicator |
| Champagne gold on white | **2.29:1** | **Never use for text or as the sole required control/state cue** |
| White on destructive red `#B4232F` | 6.52:1 | Destructive button label |

Target WCAG 2.2 AA: 4.5:1 for ordinary text, 3:1 for large text and meaningful non-text controls/state indicators. A 2 px visible focus ring should remain clear on adjacent surfaces; choose the deep-gold token, not light gold, for a white surface. Verify final components and any antialiasing, transparency, overlays, photos, disabled presentation, and dark variant in the browser. Never make color the only carrier of meaning: pair it with words, shape/icon where useful, and programmatic state.

## Semantic status colors

State colors are **not** part of the 10% brand accent. Use one color family per meaning, with its matching background, foreground, and border; the foreground/background pairs below exceed 4.5:1 by calculation. Labels in the French UI are examples, not replacements for the canonical workflow codes in the [data model](data-model.md).

| Meaning | Background / text / border | Example KAY uses | Contrast of text on fill |
|---|---|---|---:|
| Success | `#E8F5EE` / `#216E4E` / `#2E7D58` | Affaire gagnée; import committed; file scan passed | 5.50:1 |
| Warning | `#FFF4D9` / `#8C5400` / `#A56400` | Visit conflict; reservation needs review; due soon | 5.67:1 |
| Danger | `#FDEBEC` / `#A11D22` / `#C7313C` | Overdue; invalid/rejected file; blocking error | 6.73:1 |
| Info | `#EDF4FF` / `#1E5AA8` / `#2B64B1` | Pending review; import preview; processing in progress | 6.16:1 |
| Neutral | `#F2F3F5` / `#4B5563` / `#767676` | Draft, inactive, withdrawn, completed without a positive/negative judgment | 6.81:1 |

Use the meaning, not the entity name, to select a token. For example, an available offering is neutral or informational, a reservation conflict is warning, and a blocked permission or rejected upload is danger. A won deal is success; a lost deal is neutral unless the UI is specifically describing an error. `Pending antivirus scan` is info, **not** success. `Archived` is neutral. When statuses are shown in a list, show the full label (for example, “En retard”), not only a colored dot. Do not imply that a visual badge can override backend state or permissions.

## Actions, feedback, and safety

Current list-header exception,2026-10-16: Khalid requests gold creation actions
on Leads/Deals, with smaller/less prominent utilities. The opt-in shadcn Button
`creation` variant uses `action.creation*` tokens: KAY gold `#C9A75C`, charcoal
`#272727`, darker hover/pressed fills. `quiet` plus `size="compact"` gives adjacent
utilities transparent rest surfaces, normal-weight14px labels and8px inline
padding, preserving44px targets. `ListHeaderActions` separates creation from the
secondary group with16px, and keeps8px between secondary controls. Default
buttons elsewhere, including save/submit/export confirmations, are unchanged.
See [coverage and checks](ui-reference/approved-v3/list-header-actions.md).

| Role | Proposed treatment | Rule |
|---|---|---|
| Primary action | Charcoal fill, white label; darker hover/pressed tokens | One dominant action per region, e.g. “Enregistrer le client” |
| Secondary action | White fill, charcoal label, strong outline where needed; muted neutral hover | For routine alternatives such as “Annuler” or “Voir le détail” |
| Gold emphasis | Gold fill with charcoal label, or deep-gold text/underline | Only when it clarifies selection or a KAY-branded highlight; never the universal CTA style |
| Destructive action | Red `#B4232F` fill with white label, or red text/outline for a lower-emphasis entry | Use for “Supprimer”/irreversible action; separate from routine actions and require an appropriately explicit confirmation |
| Warning | White or pale-amber notice with amber heading/border and clear explanatory text | A warning is not a destructive button; the resolution action remains named by its actual effect |
| Disabled | Neutral treatment plus a reason when not obvious | Do not rely on reduced opacity alone to explain why an action is unavailable |

For a recoverable KAY client removal, prefer the accurate label “Archiver” over “Supprimer”. If a later workflow truly deletes data, use a destructive label and red treatment. A warning about a conflicting visit needs the conflict details and the required justification; it should not merely show an amber badge. A private contact duplicate needs a safe explanation and the responsible agent, not leaked client details. Destructive dialogs should state exactly what changes, keep Cancel easy to reach, and display the server outcome rather than assuming success after a click.

## Typography and content

The existing KEPVY guide proposes **Satoshi** Regular 400, Medium 500, and Bold 700. Reuse it for the KAY workspace only after the [publisher's license](https://www.fontshare.com/licenses) and font files are checked; it is not a claim about the KAY logo lettering. Until installed, use a system sans-serif fallback. The proposed scale follows the existing guide: display 48/56, page title 32/40, section title 20/28, body 16/24, labels 14/20, and supporting caption 12/16 px. Essential data, form help, and status labels should be at least 14 px. Prefer normal sentence case and natural spacing for French labels; retain accents, long names, international numbers, and MAD formatting without clipping.

Use plain action language: “Enregistrer”, “Réserver l’offre”, “Rouvrir l’affaire”, “Archiver le client”. Keep the same action name in the confirmation and result. A status badge never replaces the accompanying text, date, owner, or next step when those facts matter.

## Layout and component geometry

The running app maps these proposed reusable dimensions from the KAY token file;
they are not measurements of every screen. The 8px rhythm is primary, with 4px
for tight component interiors: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` px. Parent
containers own gaps; reusable components own their internal padding. Use space
to clarify hierarchy, not to create a broad blank page frame. Radius roles: 6px
for small controls, 10px for ordinary fields/cards, 14px only for large overlays.
Keep tables and data entry flatter and denser than promotional brand surfaces.

| Context | Proposed geometry and behavior |
|---|---|
| Mobile | 16 px shared-shell token gutter, one work column; route or sheet navigation; no page-level horizontal scrolling. Compact `/login` override: 8 px. |
| Tablet | 24 px shared-shell token gutter; one or two panes only when both remain useful. Compact `/login` override: 12 px. |
| Desktop | 28 px shared-shell token gutter and current 1440 px workspace cap; do not add narrower frame caps or extra outer padding without a legibility reason. Compact `/login` uses available width. |
| Forms | 40 px desktop / 48 px touch inputs, 8 px label gap, 4 px helper/error gap, 16 px between fields |
| Buttons | 40 px visible desktop height; at least 44 × 44 px non-overlapping touch hit area; 8 px icon/label gap |
| Tables | 48 px default row height, 12–16 px cell padding; prioritize name, status, responsible agent, and next action |
| Dialogs | 24 px desktop / 16 px mobile padding; scroll the body, keep title and actions reachable; preserve focus return |

The proposed desktop hierarchy is a dark left navigation rail, a quiet light header, then one main work surface. The [screen map](screen-map.md) fixes its Dashboard, Leads, Deals, Visit Calendar, Projects, and administrator-only Settings destinations, while the actual route count follows the approved local contextual placements. Do not turn each KPI, filter, and table subsection into an identically styled card. On narrow screens, keep the task's primary action available, place filters in a deliberate sheet or stacked region, and turn wide data into prioritized rows or a clearly labeled horizontal scroll region. Breakpoints follow content failure, not a fixed device label. Test at approximately 320, 360, 768, 1024, and 1440 px plus the actual failure widths, keyboard order, touch, 200% zoom, and long French text. The 44 px touch target is a KAY design goal; [WCAG 2.2 AA's minimum target rule](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) is 24 × 24 CSS px with specified exceptions.

For inventory, show the selected scope prominently: standalone property, whole development, block, floor, reusable type, or physical unit. A development explorer may show block/floor breadcrumbs and a unit table; non-apartment units may appear directly under the development. Never present a `unit_type` card as if it could be reserved. A whole-development offering and its child-unit offerings need visibly distinct labels, counts, and conflict/review statuses. In dense tables, keep category, unit reference, offering target level, availability, and current occupancy legible without relying on color alone. The same semantic status tokens apply to project-level and unit-level stock; do not invent a separate palette for each category.

## Shared components, Tailwind, and charts

Implement these values as semantic theme variables consumed through Tailwind v4 utilities, not raw hex values scattered across features. Tailwind is the mandatory primary styling system; scoped custom CSS remains possible under the [styling guide](styling.md). When the Next.js app exists, map the tokens to shadcn/ui's `background`, `foreground`, `primary`, `secondary`, `accent`, `destructive`, `muted`, `border`, `input`, `ring`, and `sidebar-*` variables. `primary` means the charcoal action, **not** KAY gold; `accent` can use gold or beige only with a readable foreground. Map `--chart-*` to the separate chart series tokens after checking Bklit's component expectations. No theme file or component has been installed yet.

Use shadcn/ui as the mandatory source for standard controls and build shared components from its primitives; add KAY-specific variants where behavior or meaning is reusable: `StatusBadge`, `MoneyValue`, `PageHeader`, `DataState`, `ConfirmAction`, `ProtectedFileState`, `InventoryScopeLabel`, and chart wrappers. Custom KAY components remain allowed when needed, without introducing a substitute UI kit. Avoid a shared component that hardcodes an entity's permissions or a decorative variant that only one screen uses. Every control needs its applicable rest, hover, pressed, focus, loading, disabled, selected, invalid, and denied behavior. Backend decisions remain authoritative.

Charts may need more than three category colors because data series are not brand decoration. The proposed order is charcoal, deep gold, blue, purple, and teal from the token file. Do not use green/red as generic series colors when those are already status signals; use direct labels, patterns or line styles, legends, tooltips, and a readable numeric table. Bklit is mandatory for every chart and renders approved, scope-filtered KPI data; it does not define the underlying metrics.

## Icons: current D33 contract

Iconsax replaces Lucide across the application, including local shadcn controls.
Use only `@/components/icons` semantic exports. Selected official Free linear
assets render inline on the server and inherit existing semantic colors.
Preserve V3 sizing classes, alignment, labelled controls and touch targets.
No theme, layout, logo, photograph or chart geometry is changed by this migration.
License notice, source integrity and coverage: [Iconsax migration](../reference/iconsax/migration.md).
Older Lucide references below describe D29's historical baseline, superseded
for icons only by D33.

The local [login refinement](ui-reference/approved-v3/login-icons.md) adds
semantic field/action/team icons and uses the existing large10px radius on
login controls. It does not restyle every Input/Button or change authentication.

## Decision and verification log

The [app-wide action-button refinement](ui-reference/approved-v3/action-buttons.md)
reuses existing palette/spacing/radius roles. Gold creation is now app-wide,
positive saves/confirmations use the existing success foreground as a filled
background with white text, and secondary controls retain neutral surfaces with
semantic16px icon accents. Gold/red/green filled actions inherit readable label
color; quiet/outline actions carry the semantic icon color. Standard8px icon gaps
and44px targets remain. Buttons may wrap long French labels within their parent
instead of leaking horizontal overflow. Existing caller-selected destructive,
quiet, compact, outline and link variants remain, apart from explicitly gold
creation. No new raw palette, font, chart role or component-kit dependency.

The [Lead/Deal detail refinement](ui-reference/approved-v3/record-facts.md) adds
opt-in `RecordFacts` / `RecordFact` definition lists. Summary labels use existing
16px semantic Iconsax icons,8px icon gaps,20px row gaps and32px column gutters.
At1280px the list has two fact columns; at640px each fact places its label/value
in a2:3 grid; below640px the value follows the label. Values wrap without fixed
heights. Neutral existing record sections remain vertically stacked; existing
`SectionHeading` icon tiles identify Contact, Demande and Affaire summaries.
Only these detail pages remove their52rem reading cap. All other record-stack
consumers and operation forms retain their existing layout. The summary opt-out
marker prevents the legacy single-column rule from overriding this composition.

The later [performance-dashboard refinement](ui-reference/approved-v3/performance-dashboard.md)
replaces filled KPI tiles with neutral grouped current/period cells, retaining
semantic icon/value accents. Equal-height pipeline panels contain current-count
distribution funnels with complete legends. Existing contributor totals use
Bklit stacked bars below; recorded actions span the row, then wins/contacts share
the next row. Exact tables, ten-contributor pagination and real drill-downs
remain. No new global token, daily metric, conversion denominator or API change.

The local [dashboard-header refinement](ui-reference/approved-v3/dashboard-header.md)
removes the city strip's outer border/radius and uses existing28/32 spacing steps
for112/128px responsive minimum heights. The same decorative photo fills the
strip with a static1.05 scale; its clipping/overlay and existing controls remain.
This applies only to `/dashboard` with the title `Tableau de bord`, not audit or
other shared PageHeader consumers. No new global token or card style is added.
The owner's subsequent requests remove local diagnostics and the audit shortcut
from that header. Only its title and description remain, without an empty action
wrapper for any role. The authorized audit view and API readiness/liveness
endpoints are retained; no replacement control or status badge is added.

2026-10-18 newer owner-supplied CRM screenshot overrides that earlier dashboard
composition: one full-width panoramic banner with solid-ivory title protection,
desktop notification/account actions, a compact server-scope/date/create toolbar,
and grouped live KPI cells above paired Bklit distribution funnels. Mobile retains
the global responsive utility bar and stacks the same authorized content. The
removed development-status and audit-shortcut controls remain removed; account
and notification actions are not audit/status replacements. API scope, live values,
inclusive date validation, French labels and the existing Lead destination remain.
See the current [implementation record](riviera-execution.md#dashboard-reference-correction-2026-10-18).

The approved [local roadmap](../03-planning/local-roadmap.md) selects these light tokens, Radix/New York, Lucide and system sans-serif for synthetic local work. Shadcn initialization and screen sprints can proceed on that basis. Final visual review, Satoshi licensing/files and a transparent vector logo master remain real-use validation; no dark theme is included. If dark mode is commissioned later, define and test its separate semantic mapping.

Documentation checks completed: the supplied assets and existing brand pages were viewed; the contrast pairs above were calculated from hex values; web guidance was reviewed. [SP-01 evidence](../03-planning/sprints/sp-01-evidence.md) adds the running shell, shared form/table foundations, mobile navigation, contrast, keyboard/touch/zoom and browser checks. It does not constitute full-system approval, logo-vector or font-license proof, actual iPhone/Safari validation, or assistive-technology user testing. Review the system against at least a real contact list/form, inventory detail, deal pipeline, visit-conflict dialog, dashboard chart, and mobile navigation before calling it approved.
