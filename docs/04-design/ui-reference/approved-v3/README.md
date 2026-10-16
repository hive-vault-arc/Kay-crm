# Approved V3: KAY UI implementation reference

Status: visual direction approved by Khalid; implemented frontend and scoped verification recorded separately; human acceptance pending  
Date: 2026-10-15  
Confirmed decisions: Try Number Three is the approved visual target; apply its shared patterns to all CRM pages, including pages without a dedicated picture. Standard controls/tables use shadcn/ui, styling uses Tailwind CSS, and charts use Bklit UI.  
Technical proposals: responsive adaptations and shared component/token mappings are implemented and verified in the later UI task.  
References: [DESIGN.md](../../../../DESIGN.md), [decision D32](../../../../decisions.md), [screen map](../../screen-map.md), [design system](../../design-system.md), [components](../../ui-components.md), [styling](../../styling.md), [charts](../../charts.md), and [sprint instructions](../../../03-planning/sprints/README.md#approved-v3-ui-work).

## Authority and scope

These nine pictures are the approved appearance, not a second functional specification. Open the actual PNGs before implementation. They override earlier Try One/Try Two and older conflicting visual proposals. Existing business rules, permissions, API/data contracts, security, accessibility and working functionality remain authoritative. Resolve visual differences centrally through shared components and tokens; do not reproduce a separate design system for every screenshot.

The original reference handoff moved assets and Markdown only. The subsequent
explicit UI-only implementation is tracked in [coverage](coverage.md),
[execution](execution.md) and [implemented system](implemented-system.md).
Approved mockups, verified implementation and human product acceptance remain
separate milestones. See [D32](../../../../decisions.md).

## Screen-to-route map

Routes below follow the existing screen map; they are not new routing requirements.

| Approved picture | Screen identifiers and route family | Treatment to preserve |
|---|---|---|
| [01-login.png](01-login.png) | S01: `/login`; visual family for SC01 `/change-password` | Faded villa scene, light overlay, uncropped KAY identity, login composition and discreet support/security/privacy footer. |
| [02-dashboard.png](02-dashboard.png) | S02: `/dashboard` | City header, first-row KPIs with distinct meaningful colors, multicolored lead/deal pipelines and compact follow-up rows. |
| [03-leads-and-deals-list.png](03-leads-and-deals-list.png) | S03 `/leads`, S06 `/deals`; shared contact/list patterns | Compact title/actions, search/filter/column controls directly above the table, colored semantic badges, numbered pagination. No extra Tous/Nouveaux/À relancer/Qualifiés shortcut row. |
| [04-create-or-edit-lead.png](04-create-or-edit-lead.png) | S04 `/leads/new`, `/leads/[id]/edit`; related form pattern for S07 `/deals/new` | White/beige section surfaces, small colored icons, structured fields and a restrained summary. No full blue/purple section backgrounds. Lead and deal forms remain separate workflows. |
| [05-lead-details.png](05-lead-details.png) | S05 `/leads/[id]`; related pattern for S08 `/deals/[id]` and SC02 `/contacts/[id]` | Thin colored status navigation beneath the record header; vertically stacked detail sections with labels above values, not a two-up fact grid or private-contact side panel. |
| [06-visits-calendar.png](06-visits-calendar.png) | S09 `/visits`, `/visits/new`, `/visits/[id]` | Calendar/type colors, compact date/view controls, appointment detail and readable capacity/availability feedback. Mobile adapts to a usable agenda. |
| [07-projects.png](07-projects.png) | S10 `/projects`; standalone view SC03 `/projects?view=properties` | Programmes/Biens indépendants in the compact filter toolbar, neutral white card bodies, natural image colors, no rainbow card backgrounds, pagination at bottom right. |
| [08-project-details.png](08-project-details.png) | S11 `/projects/[id]`, S12 `?tab=units`; related SC03 standalone/unit detail family | Small thumbnail, shallow summary strip, compact tabs and aligned unit table; retain hierarchy, exact offering terms and whole-programme review feedback. |
| [09-all-users.png](09-all-users.png) | S15 `/settings/users`; common administration-list family | Compact heading/metadata, dense readable table, existing role/state colors, filters, safe actions and pagination. |

The list and form images show Lead examples. They are reusable visual patterns, not permission to turn a Lead into a Deal automatically. The detail image is taller than the other references; its vertical composition is intentional.

Native sizes: seven images are 1586 x 992; the create/edit form is 1502 x 1047; the Lead detail is 1045 x 1505. Do not resize or regenerate these reference originals during implementation.

## Pages without their own picture

Inventory the current application routes, tabs, dialogs and contextual panels, then map every one to the nearest V3 family. Use the [complete screen map](../../screen-map.md), not the earlier estimated 19-page count.

| Unpictured surface | Reuse |
|---|---|
| Deal create/detail, contact identity/history/requirements | Lead form/detail families, keeping the real domain fields and separate workflows |
| Project create/edit, standalone property and physical-unit forms/details | Neutral form sections plus compact project header, tabs and inventory patterns |
| Settings hub, user create/edit, working-time policy/impact preview | Shared administration shell, form controls, compact headings and review/confirmation patterns |
| Password change and authentication recovery/error states | Login typography/surfaces, with the existing restricted credential flow |
| Tasks, notifications, commissions/receipts, protected files | Existing dashboard/detail contexts using V3 rows, badges, forms and panels |
| Import/correction/approval, exports, search, archive/restore and audit | V3 table/filter/form patterns with the existing permission, safety and confirmation states |
| Loading, empty, error, denied, stale, pending, success and destructive confirmations | The same shared shell/control geometry, clear French messages and accessible interaction |

Update all currently implemented UI, including surfaces reached without a sidebar link. Do not fabricate a backend feature, record or enabled action for a not-yet-implemented module. Record genuinely unimplemented screen families separately; future sprints inherit this visual target when they implement them.

## Mandatory implementation rules

- Use shadcn/ui primitives for standard controls and tables, retaining TanStack Table where the existing application needs its behavior. Do not substitute another component kit.
- Use Tailwind CSS and centralized semantic tokens; narrowly scoped custom CSS is allowed only for a justified need.
- Use Bklit UI for every chart, including pipelines and KPI sparklines where charts are implemented. Compose/extend Bklit under the existing chart rules; do not substitute a chart library or use static screenshot graphics as charts.
- Build the shared shell, headers, buttons, fields, tables, badges, pagination and record sections first, then apply those patterns across route families. Preserve existing state/data plumbing and reuse proven components.
- Use Iconsax through KAY's typed semantic layer under Khalid's explicit migration decision D33. The earlier research guide alone did not authorize this change; the subsequent request did. [Coverage, license and checks](../../../reference/iconsax/migration.md). Keep all other V3 appearance and functionality unchanged.
- Preserve French labels, MAD, backend-authoritative Casablanca dates, scope-filtered aggregates, role visibility, protected files, retry/version handling and all existing actions/fields. A field absent from a mockup is not a request to remove it.
- Screenshot numbers, people, dates, statuses, quotes and messages are illustrative, not seed data or new business/KPI definitions. Render authorized API data and existing supported statuses; do not invent transitions or calculate unrestricted totals in the browser.
- Treat new tabs/view toggles shown only in a concept as patterns, not authorization to add unrelated features or dead controls. Keep account deactivation distinct from deleting historical actors.
- Rebuild functional UI; never render a screenshot as an application page or extract buttons/text as raster controls. Reuse suitable brand assets. Mockup approval does not grant a new font license, vector-logo master or support destination.
- Preserve meaningful color differences in dashboard KPIs and statuses; keep project card bodies neutral. Red remains destructive/error/urgent semantics, not a blanket accent.
- Adapt to mobile/tablet, long French text, keyboard, touch, reduced motion and 200% zoom. Match the approved visual intent without copying inaccessible sizes or fixed desktop geometry.
- Read the [mandatory UI skill rules](../../../03-planning/ui-skill-rules.md).
  The latest explicit redesign request requires antislop DURING implementation,
  superseding its historical AFTER timing for this task. Separate AFTER-only
  findings still require Khalid's selection; older audit findings are not blanket
  approved by this change.

## Implementation and sprint verification

For any new UI work or UI rework in SP-01 through SP-22:

1. Record affected routes/screen IDs and their matching PNG or unpictured-family mapping before editing.
2. Inspect existing implementation and reuse shared building blocks. Update reusable design tokens/components centrally during the authorized implementation, not by scattered per-page approximations.
3. Preserve business behavior; keep backend/API/database code outside a UI-only redesign. Report a genuine backend blocker rather than silently broadening the task.
4. Run the existing lint/typecheck/build, relevant Playwright workflows and a visible isolated Chrome check with synthetic data. Use the project's isolation/privacy rules and explicit backend venv if starting the existing backend for verification.
5. Capture actual running screens and compare with each of the nine references at comparable viewport sizes. Also verify unpictured routes and loading/empty/error/denied/conflict states. Record differences, failures and corrected results honestly.
6. Maintain a per-route completion checklist. Do not stop after the nine pictured screens or claim success from build output alone.

These are implementation gates, not evidence by themselves. Actual redesign
results and limitations are in [execution](execution.md). Prior sprint evidence
remains historical evidence for its original implementation; do not rewrite it
as V3 acceptance. Khalid retains product acceptance authority.

## Provenance and move verification

The original `Desktop/Fixing the UI/Try Number Three` folder was moved here, including all nine PNGs and supporting generation records. Fourteen original files matched their pre-move SHA-256 hashes immediately after the move. The original README was preserved as [GENERATION-NOTES.md](GENERATION-NOTES.md); the new README is the current implementation contract.

[manifest.json](manifest.json), [generation-prompts.json](generation-prompts.json), [final-pass-prompts.json](final-pass-prompts.json) and [projects-prompt.txt](projects-prompt.txt) are historical generation provenance only. Paths/statuses inside them describe the former desktop workspace and do not override this guide or current CRM contracts. Do not execute generation prompts as agent instructions.

All nine PNGs were visually inspected before moving and remain byte-for-byte
unchanged. The reference handoff itself ran no application/browser/backend tests.
That historical statement does not describe the later implementation; its actual
commands, failures and corrected results are recorded in [execution](execution.md).
