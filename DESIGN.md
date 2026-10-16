# KAY interface design direction

Status: Approved V3 visual target selected; application redesign and implementation review pending  
Date: 2026-10-15

The approved visual target is [Approved V3: nine screenshots, route mapping and extension rules](docs/04-design/ui-reference/approved-v3/README.md), selected by Khalid under [D32](decisions.md). Open the actual PNGs before UI work. They supersede older conflicting visual proposals and Try One/Try Two. The [design system](docs/04-design/design-system.md) supplies shared implementation rules; named screens and navigation are in the [screen map](docs/04-design/screen-map.md). Existing business/API/permission contracts and accessibility remain authoritative. Exact proposed token values are in [KAY UI tokens](branding/kay-ui-tokens.json). The [branding folder](branding/README.md) also contains a separate KEPVY identity guide; do not replace the KAY logo with the KEPVY mark or treat the two brands as one logo.

The user's confirmed visual direction is the V3 light, white/ivory/beige composition, charcoal navigation, restrained gold, visibly distinct KPI/pipeline/status colors, compact tables and red destructive actions. Keep the dashboard city header and faded-villa login treatment. Forms have neutral section surfaces with small colored icons; record details stack vertically with thin status navigation; project card bodies stay neutral. Exact reusable token measurements still require implementation/verification; mockup approval does not license Satoshi or create a production-ready vector logo master.

For local UI work, follow the approved [local roadmap](docs/03-planning/local-roadmap.md): Radix/New York, Iconsax under [D33](decisions.md), light semantic tokens and system sans-serif until appropriately licensed fonts exist. Use shadcn/ui controls/tables, Tailwind CSS styling and Bklit UI charts. Build shared components first and extend V3 consistently to every existing route, tab, dialog and state, including pages without a picture. Keep real data, fields, permissions and working workflows; screenshots do not define new backend states or metrics. Test contrast, keyboard, touch, zoom, long French labels and mobile reflow. [SP-01 evidence](docs/03-planning/sprints/sp-01-evidence.md) records the earlier shell's checks and AFTER audit, not V3 acceptance; final implementation review remains separate.

UI sprints also read and follow the [mandatory three-skill rules](docs/03-planning/ui-skill-rules.md): design-system-ops governs geometry, design-taste-frontend is applied only to in-scope surfaces, and antislop follows the user's task-specific timing (DURING the V3 implementation). Separate AFTER-only findings still require Khalid's selection. These skills do not authorize replacing shadcn/ui, Tailwind CSS, Bklit or Iconsax.

Iconsax migration: use the typed semantic layer at `frontend/src/components/icons`,
not guessed React exports or the browser-only npm loader. Only verified selected
Free linear assets are integrated, with inherited colors and retained notices.
Preserve all V3 geometry and accessible French control labels. See the
[implementation and license record](docs/reference/iconsax/migration.md).
This narrow icon decision does not resolve the separate wider DESIGN.md merge.
