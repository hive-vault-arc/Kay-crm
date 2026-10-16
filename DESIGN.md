# KAY interface design direction

Status: Approved V3 visual target selected; application redesign and implementation review pending  
Date: 2026-10-15

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
