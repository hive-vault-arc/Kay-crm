---
name: KAY Riviera
description: Owner-selected Riviera styling for KAY's existing French operational CRM.
colors:
  primary: "#D8AA45"
  primary-hover: "#E4BC62"
  primary-pressed: "#CC9C36"
  canvas: "#FAF8F4"
  surface: "#FFFDF8"
  ink: "#272727"
  muted: "#6B6257"
  gold-text: "#765A13"
  inverse: "#FFFFFF"
  sidebar: "#121512"
  sidebar-active: "#252D24"
  sidebar-label: "#F8F7F0"
  control-border: "#858779"
  divider: "#E5E0D6"
  success: "#235D37"
  success-background: "#E8F5DD"
  warning: "#825A14"
  warning-background: "#FFF1CF"
  danger: "#994A40"
  danger-background: "#FBEDEA"
  info: "#35647E"
  info-background: "#E8F1F7"
  stage-blue: "#3B82F6"
  stage-cyan: "#06B6D4"
  stage-yellow: "#FACC15"
  stage-purple: "#8B5CF6"
  stage-green: "#22C55E"
  stage-orange: "#F97316"
  stage-red: "#EF4444"
  stage-pink: "#EC4899"
  stage-slate: "#64748B"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(2rem, 1.6rem + 1vw, 2.75rem)"
    fontWeight: 550
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'opsz' 40, 'SOFT' 0, 'WONK' 0"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "24px"
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22.5px"
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  metadata:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  icon: "8px"
  control: "10px"
  panel: "12px"
spacing:
  unit: "4px"
  icon: "8px"
  compact: "12px"
  regular: "16px"
  section: "20px"
  page: "24px"
  large: "32px"
components:
  button-creation:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "48px"
  navigation-current:
    backgroundColor: "{colors.sidebar-active}"
    textColor: "{colors.inverse}"
    rounded: "{rounded.icon}"
    padding: "8px 12px"
  badge-success:
    backgroundColor: "{colors.success-background}"
    textColor: "{colors.success}"
    rounded: "{rounded.icon}"
    padding: "4px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

# KAY interface design direction

## Overview

**Creative North Star: "Riviera"**

Current owner-selected branding, 2026-10-18.

Khalid explicitly selected the supplied Riviera 1.1.0 handoff and confirmed
app-wide colors, fonts and shared component styling with existing layouts,
wording, Iconsax and real metrics retained. [Riviera source and implementation
mapping](branding/riviera/README.md) supersede conflicting older palette, font,
pure-black-sidebar and panel-border statements below. Warm ivory canvas,
warm-white surfaces, honey actions and olive-charcoal navigation carry the brand.
Fraunces550 titles, Manrope UI and DM Sans metadata are self-hosted OFL fonts.
The exact191 tokens are exported centrally; old application roles resolve to
them rather than maintaining independent palettes. Panels are quiet/borderless;
controls, focus and essential dividers keep visible boundaries. Approved V3 and
later owner-requested geometry remain the layout family, not the old colors.
The desktop rail collapses to a 72px implementation proposal, keeps every
destination accessibly named, and reuses the login villa/palm line art; global
search remains available in the rail and responsive header. No sample chart
allocations, icon-family switch, business copy or backend change is authorized.
ENERGY1 / RHYTHM1 / MOTION1. Human visual review is separate.

**Key Characteristics:**

- Supplied Riviera palette and licensed local fonts on existing CRM compositions.
- Quiet panels, visible control boundaries and explicit keyboard focus.
- French labels, semantic Iconsax and live authorized values.

## Colors

The frontmatter records reused current colors; the exact 191-token handoff and
all semantic aliases remain in the linked Riviera source. Honey identifies
primary/creation actions. Dark gold carries readable links and light-surface
focus. Feedback foreground/background pairs remain distinct from categorical
pipeline fills. The sidebar keeps its own light labels and dark-surface focus.

## Typography

Fraunces gives headings their supplied Riviera character; Manrope serves working
controls and body text; DM Sans serves compact metadata. The frontmatter records
the implemented page/section/body roles, rather than asserting every exported
handoff type role is used unchanged. Fraunces fixes opsz40, SOFT0 and WONK0.
[Verified runtime files](branding/riviera/README.md#fonts-and-licenses) are
Fraunces 1.000 WOFF2, Manrope 4.505 TTF and DM Sans 4.004 WOFF2.

## Layout

Preserve the existing route composition, compact Lead/Deal insets, paired forms,
named table scroll regions and responsive navigation. Shared controls keep at
least 44px targets. The later owner-supplied CRM dashboard screenshot overrides
the earlier two-column title/photo treatment: `/dashboard` uses a full-width
196px minimum panoramic banner, a solid-ivory-to-photo text fade, and working
notification/account controls at desktop widths. Its compact toolbar, grouped
live KPIs and paired pipelines remain responsive and role-scoped. The 224px
expanded rail comes from the handoff; 72px collapsed remains a documented
implementation proposal. No other historical route layout is inferred or
normalized by this branding record.

## Elevation & Depth

Warm-white panels sit quietly on the ivory canvas. The supplied panel shadow
adds restrained tonal separation; it is not a required control boundary.
Inputs, outlined actions and focus retain visible boundaries. Exact shadow and
motion extensions live in `.impeccable/design.json`.

## Shapes

Use the existing shared radius roles: icon tiles and badges, controls, and panels.
Circular KPI badges keep their supplied category identity; these do not make
ordinary fields or actions pill-shaped.

## Components

Creation and ordinary primary actions use honey with dark labels; save/positive
confirmation keeps semantic success and destructive actions keep danger.
Outlined alternatives use the warm-white surface and strong control border.
Current navigation uses a gold Iconsax tile, a light label and trailing chevron.
Status badges keep a written meaning. Panels and inputs retain their existing
responsive padding, disabled states and Radix/shadcn behavior. The companion
sidecar contains six self-contained previews of these actual shared recipes.

## Do's and Don'ts

### Do:

- Do consume shared Riviera semantic roles through Tailwind and existing components.
- Do preserve French labels, Iconsax, live scoped values and accessible states.
- Do keep the exact verified runtime font versions and original OFL notices.

### Don't:

- Don't convert reference sample people, allocations or counts into application data.
- Don't use categorical pipeline fills as semantic feedback colors.
- Don't infer human product acceptance from technical or finish-review evidence.

## Historical scope and evidence

2026-10-18 latest Lead/Deal screenshot correction: use the shared coastal
directory banner,314px desktop filter rail/12px gap, seven-column compact rows,
initials and semantic status pills. Details use the large identity header,
346px cream contact rail, coloured read-only status board and paired Lead
request/follow-up regions. The central `crm*` layout tokens own these dimensions;
the existing224px navigation and Riviera world remain. The earlier proportional
refinement was rejected by the owner and is not visual acceptance. See the
[current reference ledger and scoped verification](docs/03-planning/crm-reference-fidelity.md).

The dated material below retains earlier scope and verification context. The
current Riviera sections and source mapping above supersede conflicting palette,
type and shared panel/control styling statements; unrelated history is preserved.

Status: Approved V3 visual target selected; application redesign and implementation review pending  
Date: 2026-10-15

2026-10-17 subsequent owner-requested interface refinement supersedes the inline
filter presentation below. Leads and Deals use the existing left filter rail on
wide screens and its accessible Sheet on smaller screens. Their list, detail,
create and edit routes use the available workspace width with a small16px safe
inset, not the centered reading-width cap. The owner explicitly included create
and edit forms. Preserve KAY colours, the typed Iconsax layer, French labels,
all fields and backend behavior; refine borders, table headers, grouped detail
facts, compact form sections and action placement. Other routes retain their
existing page geometry. See [interface scope and evidence](docs/03-planning/leads-deals-interface-refresh.md).

2026-10-17 owner-requested Lead/Deal alignment takes precedence on those
surfaces: reproduce the IMMO World workflow and compact paired composition,
using the existing KAY palette, components and semantic geometry. Leads/Deals
now use inline filter toolbars rather than the earlier left rail; Contacts and
Projects retain their rail. Country, nationality, selectable calling codes,
multiple languages, budget and campaign source are now implemented facts, not
mockup-only exclusions. Conversion explicitly requires project, budget and
buying intent, without a free-title step. Forms pair qualification/notes with
the first project/follow-up; additional projects occupy balanced full-width
rows. Historical profile facts come from each saved snapshot, not the current
contact. Antislop retains Khalid's AFTER timing for aesthetic-only findings.
[Scope, verification and open acceptance](docs/03-planning/leads-deals-immoworld-alignment.md).
This is an established-world extension, not permission to replace the brand or
unrelated screens. Earlier refinements below retain their historical scope.

2026-10-16 publication authorization: the owner's latest push-to-main request
permits publishing the prepared UI refinements through the protected CI flow.
Earlier local-only/no-push notes record their preparation stage. They do not
override this later request. [Publication scope and evidence](docs/06-delivery-and-operations/ui-refinements-publication.md).

The approved visual target is [Approved V3: nine screenshots, route mapping and extension rules](docs/04-design/ui-reference/approved-v3/README.md), selected by Khalid under [D32](decisions.md). Open the actual PNGs before UI work. They supersede older conflicting visual proposals and Try One/Try Two. The [design system](docs/04-design/design-system.md) supplies shared implementation rules; named screens and navigation are in the [screen map](docs/04-design/screen-map.md). Existing business/API/permission contracts and accessibility remain authoritative. Exact proposed token values are in [KAY UI tokens](branding/kay-ui-tokens.json). The [branding folder](branding/README.md) also contains a separate KEPVY identity guide; do not replace the KAY logo with the KEPVY mark or treat the two brands as one logo.

The user's confirmed visual direction is the V3 light, white/ivory/beige composition, charcoal navigation, restrained gold, visibly distinct KPI/pipeline/status colors, compact tables and red destructive actions. Keep the dashboard city header and faded-villa login treatment. Forms have neutral section surfaces with small colored icons; record details stack vertically with thin status navigation; project card bodies stay neutral. Exact reusable token measurements still require implementation/verification; mockup approval does not license Satoshi or create a production-ready vector logo master.

2026-10-16 explicit sidebar refinement: Khalid requests pure black `#000000`
throughout the desktop sidebar and mobile navigation drawer to match the logo
background. `color.surface.sidebar` owns this override; gold selection, white
text, account/logout footer, main canvas, actions and all geometry stay unchanged.
This supersedes only the older charcoal-sidebar color, not the wider V3 direction.

2026-10-16 explicit list-action refinement: Leads/Deals creation links and the
Leads contact-directory creation link use the existing KAY gold `#C9A75C` with
charcoal labels. Adjacent list-header utilities are compact, borderless, normal
weight secondary actions with44px hit targets. This is an opt-in header hierarchy,
not a global recoloring of form submissions, confirmations or destructive actions.

2026-10-16 explicit directory-filter refinement: page search and existing filters
on Leads, Deals, Contacts and both Projects tabs sit in a left rail beside the
results, following Khalid's supplied layout examples. The shared256px rail uses
a24px results gap at1280px and above; narrower views use a labelled shadcn Sheet.
The global header search and contact-record embedded lists stay in place. Only
existing KAY filters are moved; reference-only fields/statuses are not features.
See the [coverage and verification record](docs/04-design/ui-reference/approved-v3/filter-rail.md).

2026-10-16 explicit dashboard-header refinement: only the circled city/title
strip becomes borderless and square-edged. Its existing height steps increase
by16px and the decorative city photo enlarges5% while covering the entire strip.
The readable overlay, content, actions, main-page gutters and all KPI/chart
surfaces stay unchanged. The photo does not become a whole-page background.
See the [scoped record](docs/04-design/ui-reference/approved-v3/dashboard-header.md).

2026-10-16 subsequent dashboard refinement: remove the development-oriented
local-service status and its manual retry control from the user-facing header.
The next explicit request also removes the `Journal d’audit` header shortcut;
the city header now contains only its title and description. Keep the direct
authorized audit view and normal dashboard error/retry states. Backend
liveness/readiness endpoints, HTTPS facade and monitoring remain unchanged.
This removes presentation, not a production-safety check or release requirement.

2026-10-16 subsequent performance-dashboard refinement: the owner's new reference
replaces the filled KPI tiles with a neutral, grouped current/selected-period
strip. Keep small semantic icon/value accents. Pipelines use funnel silhouettes
for current stage distributions, with exact legends and no conversion-rate
claim. Stacked contributor totals sit directly underneath; the owner confirmed
using existing API totals only, not new daily worked-Lead/Deal metrics. Tasks,
notifications, other metrics and follow-up remain available below. This is local
UI work, not a new Performance route or production release.
See [scope and verification](docs/04-design/ui-reference/approved-v3/performance-dashboard.md).

2026-10-18 owner-supplied dashboard screenshot refinement: the pictured banner
now spans the full content width with title/eyebrow over an ivory fade and live
notification/account sheets at desktop sizes; the ordinary global utility bar
remains on mobile. The toolbar exposes the server-authorized scope as read-only,
keeps the existing inclusive date filter and links to the existing Lead form.
Current versus selected-period KPIs and funnel distributions remain backed by
the existing scoped APIs. No screenshot counts, agents, statuses, daily series or
conversion metrics are copied. The older 2-column city-header note above is
historical; the [dashboard record](docs/04-design/ui-reference/approved-v3/dashboard-header.md)
contains the newer composition and evidence.

For local UI work, follow the approved [local roadmap](docs/03-planning/local-roadmap.md): Radix/New York, Iconsax under [D33](decisions.md), light semantic tokens and system sans-serif until appropriately licensed fonts exist. Use shadcn/ui controls/tables, Tailwind CSS styling and Bklit UI charts. Build shared components first and extend V3 consistently to every existing route, tab, dialog and state, including pages without a picture. Keep real data, fields, permissions and working workflows; screenshots do not define new backend states or metrics. Test contrast, keyboard, touch, zoom, long French labels and mobile reflow. [SP-01 evidence](docs/03-planning/sprints/sp-01-evidence.md) records the earlier shell's checks and AFTER audit, not V3 acceptance; final implementation review remains separate.

2026-10-16 explicit Lead/Deal detail refinement: retain vertically stacked record
sections, but present their summary facts in two left/right columns at wide
desktop widths. Each label has a semantic Iconsax icon and its value alongside;
narrow screens stack the facts and then their label/value rows. Existing fields,
links, actions, French copy and authority remain; reference-only country,
nationality, temperatures or inline-edit controls are not new KAY features.
This overrides only the older single-column summary presentation on these two
detail pages. See [scope and verification](docs/04-design/ui-reference/approved-v3/record-facts.md).

2026-10-16 subsequent app-wide button refinement: extend semantic Iconsax
action icons and colors throughout existing controls, forms, dialogs and route
families. Creation is KAY gold, save/positive confirmation uses existing success
green, destructive actions retain red, and neutral utilities use restrained
semantic icon accents. Dismissal stays neutral, distinct from cancelling a
business record. This explicitly extends the earlier list-only gold-creation
scope to existing creation buttons throughout the app; it does not recolor
cards/charts or introduce screenshot-only conversion/deletion/Excel features.
See [action coverage and verification](docs/04-design/ui-reference/approved-v3/action-buttons.md).

UI sprints also read and follow the [mandatory three-skill rules](docs/03-planning/ui-skill-rules.md): design-system-ops governs geometry, design-taste-frontend is applied only to in-scope surfaces, and antislop follows the user's task-specific timing (DURING the V3 implementation). Separate AFTER-only findings still require Khalid's selection. These skills do not authorize replacing shadcn/ui, Tailwind CSS, Bklit or Iconsax.

Iconsax migration: use the typed semantic layer at `frontend/src/components/icons`,
not guessed React exports or the browser-only npm loader. Only verified selected
Free linear assets are integrated, with inherited colors and retained notices.
Preserve all V3 geometry and accessible French control labels. See the
[implementation and license record](docs/reference/iconsax/migration.md).
This narrow icon decision does not resolve the separate wider DESIGN.md merge.

2026-10-16 explicit compact-space refinement: Khalid asks that screens stop
leaving broad unused areas around the left, right, top and bottom. Full-page
frames should use their available viewport/content width instead of an arbitrary
narrow cap or oversized offsets. Keep small safe edge insets and content-width
limits only where they improve reading or form usability. Preserve meaningful
internal rhythm, touch targets, dialog clearance and responsive behavior; this
is not a command to remove every gap. The `/login` frame is the first applied
surface: it now spans the viewport, keeps the approved three-panel composition,
and uses a shorter footer. Other route geometry remains subject to its own
visual review. See the [login compact-frame evidence](docs/04-design/ui-reference/approved-v3/login-layout.md).

2026-10-18 D38 calendar refinement: the supplied calendar image governs `/visits`
composition, not a replacement brand. Reuse Riviera fonts/surfaces, the existing
shell and shadcn controls; add the compact mini-month/type/status rail, weekly
grid and Agenda/Par type views. Existing Iconsax building/people/car glyphs, not
emojis, identify visit types. Full-week scoped counts and actual policy drive
the interface. Central geometry uses a288px rail,64px hour,88px day header,
56px time rail and52px minimum overlap lane before insets; controls retain44px
targets. Mini-month week rows are intentionally taller than the image for that
reason. Mobile uses the shared filter Sheet and chronological agenda. No calendar
package, chart, font, raster or business-rule change. See
[reference and evidence](docs/03-planning/calendar-reference-refresh.md).

2026-10-18 D39 Projects refinement: the supplied photo-directory image now
governs `/projects` standalone layout, superseding the older combined-toolbar/
three-card composition only there. Preserve Riviera and current programme/detail
flows. Use the314px warm filter rail, automatic type/status/category selection,
image-first cards with category/name/location/two current campaigns and Cards/List/
server sort. A240px central card minimum yields four columns at1677px, three where
space permits, then two/one. Photo covers use148px; controls remain44px. Actual
private clean previews, real whole-result facets and numbered pages replace
reference-only values. No public file URLs, photo stand-ins for real inventory,
new palette/font, chart or library. The compact44px utility header keeps global
notifications reachable rather than deleting them to reproduce the static image.
See [scope and evidence](docs/03-planning/projects-reference-refresh.md).
