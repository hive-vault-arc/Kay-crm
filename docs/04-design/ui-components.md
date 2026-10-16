# KAY interface components: shadcn/ui working guide

Status: shadcn foundation and SP-03–SP-08 feature compositions implemented; later compositions remain planned  
Date: 2026-10-15  
Confirmed decision: shadcn/ui is the mandatory source for standard UI components in KAY's Next.js web interface; no substitute component kit.  
Accepted local choices: Radix/New York, Iconsax under D33, npm, existing light tokens and system sans-serif. Final real-use visual/font approval remains separate; see the local roadmap.  
References: [KAY architecture](architecture.md), [core scope](../../core-scope.md), [screen map](screen-map.md), [API contracts](api-contracts.md), [acceptance tests](../05-quality/acceptance-tests.md), [shared-component rules](../01-working-agreements/coding-standards.md), [KAY design system](design-system.md), [Tailwind styling guide](styling.md), [offline shadcn/ui snapshot](../reference/shadcn-ui/2026-10-14-954ce953/README.md), [official shadcn/ui docs](https://ui.shadcn.com/docs).

shadcn/ui distributes component source into the application. It is not a single imported component package. KAY can edit the copied components, but the team then owns their changes and must review upstream updates. Use a shadcn/ui component for each standard control it covers. Custom KAY-specific components are allowed where a control or domain composition is missing; build on shadcn/ui primitives where applicable, instead of importing another general-purpose UI kit. Tailwind CSS is KAY's styling system; see the [styling guide](styling.md) for custom-CSS limits. The offline snapshot is a reference only. Keep the eventual app's `components/ui/` code, `components.json`, design tokens, and feature components separate from `docs/reference/`.

## Current icon contract: Iconsax (D33)

Import semantic components and `KayIconProps` / `KayIconComponent` only from
`@/components/icons`. The shared layer embeds 26 verified official Free linear
SVG assets as 27 semantic components. It is ordinary server-renderable React,
with no hooks, browser globals, dynamic registration or asset requests. Do not
import the browser-only `iconsax` loader or guess named exports from a package.

All paths inherit `currentColor`; existing size utilities and control targets
are unchanged. Default SVG size is 24px; the typed size prop supports
12/16/20/24/32/48px, with existing Tailwind classes taking precedence.
Icons default to `aria-hidden` and are unfocusable. A meaningful standalone icon
uses the typed `label` prop, producing `role="img"` and an accessible name;
icon-only buttons retain their existing French labels. Check/close adapters use
the official inner marks, omitting frames already supplied by native controls.
No new icons were added to text-only actions.

`components.json` no longer declares the obsolete Lucide baseline. Iconsax is
not assumed to be a supported shadcn registry icon mapping: inspect every
generated/updated component and replace its interface glyphs with this layer
before accepting it. ESLint rejects direct Lucide/Iconsax package imports.
The pinned CLI, Radix components and Bklit chart geometry remain unchanged.
Historical sprint notes below describe the original implementation; their
Lucide references are superseded for current icons only by D33.

Retain [THIRD_PARTY_NOTICES](../../frontend/THIRD_PARTY_NOTICES.md) and its public
copy. Asset licenses are Iconsax Free proprietary terms, not the npm metadata's
MIT software license. [Migration coverage, provenance and checks](../reference/iconsax/migration.md).

## Installation and installed foundation

SP-01 created `frontend/` with Radix/New York, Lucide and shadcn CLI 4.21.5 pinned in its lockfile. Button, Sheet, Skeleton, Alert, Input, Label, Form and Table source is installed under `frontend/src/components/ui/`; shared KAY compositions are separate. The [execution record](../03-planning/sprints/sp-01-evidence.md) documents local adaptations and real tests. Run future additions inside `frontend/`, not in the documentation root. The [official Next.js guide](https://ui.shadcn.com/docs/installation/next) has separate paths for a new project and an existing one.

1. Create or open the Next.js app. Confirm Tailwind CSS, TypeScript, and the `@/*` import alias are configured. With a `src/` app, point the alias at `./src/*`.
2. Apply the approved local Radix/New York base/style, KAY's semantic Iconsax layer and light token mapping; verify them with a representative form, data table and mobile navigation. Record generated components.json and source evidence instead of asking again for the already-selected local choices.
3. For an existing app, run `npx shadcn@latest init`. If scaffolding the Next.js app through shadcn, the official command is `npx shadcn@latest init -t next`. Inspect the generated `components.json` and theme variables before accepting them as KAY design decisions.
4. Add only the components needed for the first implemented feature, for example `npx shadcn@latest add button field input`. Import the copied code from the generated `@/components/ui/...` path, adjusted to the chosen project structure.
5. Commit the generated source and lockfile with the feature. Pin the actual CLI and dependency versions in the implementation workflow rather than relying on `@latest` in repeatable builds.

These generic commands document the official workflow, not the exact SP-01 command history. SP-01 manually configured `components.json` and ran the pinned CLI's `add button sheet skeleton alert input label form table --yes`; see its execution record. Do not reinitialize over customized components. See the offline [installation page](../reference/shadcn-ui/2026-10-14-954ce953/apps/v4/content/docs/installation/next.mdx), [CLI reference](<../reference/shadcn-ui/2026-10-14-954ce953/apps/v4/content/docs/(root)/cli.mdx>), and [`components.json` reference](<../reference/shadcn-ui/2026-10-14-954ce953/apps/v4/content/docs/(root)/components-json.mdx>) for exact options and examples.

SP-19 adds the optional `SheetContent.closeLabel` accessible-name prop. A Sheet
used for a task other than navigation supplies that task's French close label;
global search uses « Fermer la recherche ». The existing default remains
« Fermer la navigation ». The shared close control (now Iconsax under D33), touch dimensions,
Radix semantics and focus behavior are retained. This is a reusable accessibility
API extension, not a new visual variant or geometry rule; see the
[discovery contract](discovery-contract.md) and
[documenter record](../../.impeccable/sp19-documenter.md).

## Find and evaluate components

SP-04 extends the installed primitives with NativeSelect and AlertDialog from
the pinned New York source. Local adaptations use KAY field/touch dimensions,
existing role colors, responsive dialog padding, one-rem viewport clearance and
a bounded scrollable dialog body. Radix owns semantics/focus containment/return;
no alternate kit or dependency was added. User forms reuse RHF/Zod/Form, and the
numbered account list reuses the shared TanStack/shadcn DataTable. Domain-specific
credential display and command composition stay under features/users; no chart
or new custom CSS is required. Visual results belong in [SP-04 evidence](../03-planning/sprints/sp-04-evidence.md).

On the official site, use [Components](https://ui.shadcn.com/docs/components) to inspect a component's examples, usage, installation command, and API notes. [Blocks](https://ui.shadcn.com/blocks) are larger compositions. The shadcn/ui [Charts](https://ui.shadcn.com/charts) page is reference material only: implement KAY charts with [Bklit UI](charts.md), not a second chart stack. The [Registry Directory](https://ui.shadcn.com/docs/directory) contains community work; its entries are not automatically approved as KAY components and need source and dependency review. The CLI can search and resolve documentation, for example `npx shadcn@latest search @shadcn -q "sidebar"` and `npx shadcn@latest docs button`. Use `npx shadcn@latest add --dry-run <name>` to inspect changes before adding a component. See the [CLI documentation](https://ui.shadcn.com/docs/cli).

Offline, use the [component-source directories](../reference/shadcn-ui/2026-10-14-954ce953/README.md#navigate-the-documentation). The MDX component pages and `apps/v4/examples/` show how to compose a control. Some pages rely on site-rendered previews, so use the live site when visual behavior matters.

## SP-05 component additions

Contact identity reuses Form/Input/NativeSelect/Button/AlertDialog/Sheet/Table,
RHF/Zod and TanStack. Checkbox, RadioGroup and Textarea derive from the pinned
shadcn New York source, retaining Radix and Lucide; no new UI library. Primary
phone/email selection, duplicate reuse, scoped contact/agent selectors,
numbered pagination and the column Sheet are KAY compositions of these parts.
Optional FormControl descriptionId retains the shared error-message association;
Table/DataTable scrollLabel makes only the named Leads overflow element a
keyboard-focusable region. Defaults preserve earlier tables.
See [SP-05 evidence](../03-planning/sprints/sp-05-evidence.md).

## SP-10 requirement and offering compositions

RequirementPanel is shared by Contact Recherches and Lead detail; feature-local
RequirementForm/Facts, OfferingSearch/Facts and DevelopmentFilter compose the
existing shadcn Form, Input, NativeSelect, Label, Button and shared numbered pages,
API errors, exact MAD formatter and LevelPicker. No new component kit, chart,
font, palette, layout token or custom CSS. Inline forms use RHF/Zod; list/detail
selection resets with the contact/requirement identity and preserves failed
drafts. Current-vs-draft comparison is explicit, with focus returned on closing
editing or removing an entry. Filter results and mutation notices announce state.

Only the current search is pressed: it retains the existing accent surface and
ring-colored border outside hover, with an aria-hidden check (now Iconsax) as a
non-color cue beside its bounded, wrapping label.

Safe target-level labels distinguish independent assets, physical units and
whole programmes. Original rent/conditions remain beside annual comparison;
template labels describe units but have no selectable offering identity. Native
programme/block/floor/type selects are separately paginated. Fields stack on
mobile with existing gap/control tokens; long labels wrap instead of leaking
horizontal scroll. Review evidence and technical limits are recorded in
[SP-10 execution](../03-planning/sprints/sp-10-evidence.md), not implied by reuse.

## Candidate components for KAY's core

SP-12 extends the existing deal detail with shadcn AlertDialog/Button/Label/
Textarea reservation and explicit-release confirmations. Exact target level,
current state and reviewed versions precede the action; only release has a
required reason. Busy commands lock competing local controls; failures preserve
the reason/retry key and offer an explicit current-facts refresh. Successful
commands reload embedded stock. Shared InventoryStatus adds safe parent/unit
overlap text, not another contact/deal identity. Existing tokens, flat sections,
responsive dialog scroll/focus, French labels and Tailwind remain authoritative;
no new component kit, stylesheet, chart, font or shipping raster. See
[SP-12 record](../03-planning/sprints/sp-12-execution.md) for executed evidence.

SP-08 composes programme/hierarchy/type/unit views from the installed Tabs, Table,
NativeSelect, Input/Label/Textarea and Button. The KAY LevelPicker is a bounded
numbered selector, not a second UI kit or an unbounded tree. Campaign, owner,
history, exact MAD and explicit version-comparison components now serve both
physical and whole-development targets. Plain briefing uses escaped React text.
No new primitive dependency, chart or custom layout CSS is required; Bklit remains
N/A without a chart. Visual/state evidence and the separate AFTER selection are
recorded in [SP-08](../03-planning/sprints/sp-08-evidence.md).

SP-06 adds Tabs from the pinned shadcn New York anatomy and the already installed
Radix package. KAY adaptation uses line selection, wrapping, semantic focus and
existing touch-height tokens. Contact history, ownership impact/confirmation,
manual entries and enquiry reassignment compose existing controls/AlertDialog;
no new component kit, chart, dependency, font, palette or layout stylesheet.
Merge uses the destructive action variant; reversible archive/restore remain
accurately labeled. Visual/state evidence is in [SP-06](../03-planning/sprints/sp-06-evidence.md).

This is a shortlist of shadcn/ui components for design exploration, not an installation manifest or a choice of UI libraries. Choose the needed components per vertical feature, after comparing their behavior with KAY's permissions and API contracts.

| KAY task | shadcn/ui starting points | KAY-specific work still required |
|---|---|---|
| Staff navigation on desktop and mobile | Sidebar, Breadcrumb, Sheet, Separator | Login-first entry and the [screen map](screen-map.md)'s Dashboard, Leads, Deals, Visit Calendar, Projects, and administrator-only Settings; French labels and responsive navigation |
| Leads, deals, developments, and physical units lists | Table, Pagination, Input, Select or Combobox, Checkbox, Dropdown Menu, Badge, Empty, Skeleton | Server-side scoped search/filter/pagination; user-configurable visible columns for leads and deals; separate project/unit result kinds and counts; authorization-aware rows, loading, denied, and conflict states. The Data Table page is a build guide using TanStack Table, not a one-command component. |
| Contact, requirement, development, unit-type, and property forms | Field, Input, Textarea, Select, Radio Group, Checkbox, Calendar or Date Picker, Alert | Validation from KAY rules; development/block/floor/type linkage; per-unit prices and status; international phone entry, MAD amounts, and API error mapping |
| Development explorer | Breadcrumb, Tabs, Accordion, Table, Badge, Sheet | Navigate development → block → floor → actual units, with direct units for non-apartment categories; a type groups matching units but is not bookable. Keep the selected scope and filters visible on mobile. |
| Duplicate and destructive decisions | Alert Dialog, Dialog, Sonner | Scope checks, explained warnings, deliberate confirmation, and server-side enforcement |
| Deal pipeline and reservations | Tabs, Card, Badge, Alert Dialog, Tooltip | Transition history, project/unit overlap warnings, manager-review state for partial developments, inventory effects, and true actor attribution |
| Visits, tasks, and reminders | Calendar, Popover, Dialog, Badge, Empty | `Africa/Casablanca` scheduling; three visit types, configured off-site work windows/lunch breaks, company-car capacity, free/busy visibility, conflict reasons, and durable reminders |
| Administrator settings | Table, Field, Input, Checkbox, Select, Alert Dialog | User management and database-backed working weekdays/windows, lunch breaks, and company-car capacity; preview existing-visit impact before schedule edits |
| KPI dashboard | Card, Table, Skeleton, and [Bklit UI charts](charts.md) | Exact KPI definitions, scope filtering, backend aggregation, and accessible chart summaries |
| Protected attachments | Input plus KAY-specific upload status and error UI | The FastAPI transfer permit, 20 MB limit, antivirus quarantine, and protected download are backend contracts; a UI component does not provide them. |

## Design-system and quality boundaries

Use semantic tokens such as background, foreground, primary, destructive, border, ring and sidebar-* from the [design system](design-system.md). The [local roadmap](../03-planning/local-roadmap.md) authorizes the existing light mapping for synthetic local implementation; default shadcn demo colors are not a replacement. Record Radix/New York/Lucide configuration and implementation evidence. Later final brand/font review remains separate.

Every selected control needs French copy, keyboard and touch operation, visible focus, appropriate contrast, zoom and mobile checks, and empty, loading, error, denied, and conflict behavior where applicable. Server-side FastAPI rules remain authoritative for permissions, privacy, inventory, finance, and file access. Playwright and acceptance scenarios should exercise composed KAY flows, not only isolated components.

When updating a copied component, compare local changes with upstream using the CLI's dry-run or diff options and review the resulting source. Do not overwrite a customized KAY component without checking its behavior and accessibility. The official registry directory includes third-party code; its presence there is not approval for KAY.

## SP-09 shared protected-file controls

`features/files/file-panel.tsx` composes existing shadcn Button/Input/Label and
AlertDialog with Tailwind semantic tokens and existing numbered pages/errors.
The French chooser triggers a real native file input; its selection is announced
without depending on the host browser's English native label. No new kit, CSS
framework, chart, font, image asset, global token or navigation was added.
`ProtectedFileState` exposes textual verdict/error states with a polite live
region, not color alone. Direct transfer helpers keep transient grants/proof
in operation memory and revoke preview URLs. Controls never substitute for
FastAPI authorization or actual clean verdicts. See
[SP-09 contract](api-contracts.md#sp-09-protected-file-wire-contract) and
[execution evidence](../03-planning/sprints/sp-09-evidence.md).

## SP-13 composition

The existing French deal record gains `OutcomePanel`, `StockReview` and numbered
`OutcomeHistory`, composed with incumbent shadcn AlertDialog/Button/Input/Label/
Textarea and NativeSelect primitives. Manager-only `ExternalOutcome` joins each
eligible inventory campaign. Target identity, stock effects and review boundaries
precede confirmation; dialog heading receives initial focus, Escape returns to
the trigger and errors retain input. Existing Tailwind semantic geometry and
status treatments are reused; there is no new kit, token, font, chart or CSS theme.
See [outcomes contract](outcomes-local.md) and
[verification record](../03-planning/sprints/sp-13-execution.md).

## SP-11 composition

features/deals composes the existing shadcn forms, buttons, inputs, native selects,
checkbox/Sheet, DataTable, numbered pages, contact/agent pickers, safe OfferingFacts
and private FilePanel. Pipeline is a wrapping semantic ordered list with textual
current-step/aria-current; proposal/history views are flat record sections.
Inline forms and explicit version comparison retain drafts in memory. Columns
store validated IDs/order only. No CSS/theme/token/font/chart/library or shipping
raster is added. French loading/empty/error/denied/conflict/read-only states reuse
the incumbent patterns. [Contract](deal-pipeline-local.md) and [verification](../03-planning/sprints/sp-11-evidence.md)
define the actual implemented boundary, not full-product or design approval.

## SP-14 scheduling composition

`features/schedule` composes the existing shadcn Button, Input, Label,
NativeSelect, Checkbox, Form, Textarea and AlertDialog with PageHeader,
ContactSelector, RecordError and numbered pages. The week view is seven flat
day sections at wide widths and a chronological agenda at narrow widths;
colleague busy mode lists intervals with its explicit privacy explanation.
This operational calendar is a KAY composition, not a chart. It reuses Tailwind
semantic tokens and the local system sans-serif without a new kit, chart,
font, palette, layout token, custom stylesheet, dependency or shipping raster.

Booking and rescheduling use native civil date/time fields with server-resolved
Casablanca offsets and an explicit repeated-hour choice. Availability feedback
separates hard limits from the ordinary overlap explanation. Existing dialog
focus/scroll behavior, associated field errors, pending controls, retained drafts
and deliberate current-version comparison remain visible. Administrator working
policy uses flat weekday/interval groups and an impact preview before save;
existing visits are explicitly preserved. These patterns document the source
composition; [scheduling contract](visit-scheduling-local.md) and
[SP-14 execution](../03-planning/sprints/sp-14-execution.md) hold the functional
rules and technical evidence. UI review does not imply completed technical gates
or Khalid's product/design approval.

## SP-15 task and internal-notification composition

`features/work` composes existing shadcn Button, Input, Label, NativeSelect,
Textarea and AlertDialog with RecordError, NumberedPages and the shared
server-resolved Casablanca LocalTimeField. The dashboard retains PageHeader and
service status, followed by flat task, internal-inbox and unresolved-visit
sections. Contact detail adds the Tâches tab; deal detail reuses the same
TaskPanel inline. Period/read filters, textual overdue/read/terminal states and
numbered pages use the incumbent controls and semantic Tailwind tokens.

Forms stay in the reading-width column, with stacked fields, wrapping actions
and long labels; task facts use two columns only from the existing small
breakpoint. Field groups, section gaps, touch dimensions, focus and scrollable
confirmation dialogs reuse the existing geometry. Failed edits retain the draft;
the current version, deadline and responsible person appear before an explicit
draft-preserving retry. Completion/cancellation retain task facts and true-actor
history, with terminal read-only feedback. Inbox links/totals come from the
current server response; the UI does not grant record access. Visit follow-up
opens the same visit rather than creating another appointment.

No new palette, font, token, kit, chart, stylesheet, dependency, navigation
destination or shipping raster is introduced. These are composition facts,
not a new visual system. The [task/reminder contract](tasks-reminders-local.md)
and [SP-15 execution](../03-planning/sprints/sp-15-execution.md) define functional
rules and verification; the [finish verdict](../../.impeccable/sp15-finish-review.md)
resolves its single French-copy finding at the supplied UI-evidence scope.
Neither this documentation nor that verdict establishes full technical acceptance
or Khalid's product/design approval.

## SP-16 optional commission and collection composition

`features/finance` adds Dossier/Finance tabs inside the existing deal record for
managers and administrators. Agents retain the ordinary dossier without finance
controls; backend authorization remains authoritative. FinancePanel,
CommissionRecord, TermsForm, ReceiptForm and FinanceConfirmation compose existing
shadcn Tabs, Button, Input, Label, NativeSelect, Textarea and AlertDialog with
RecordError, NumberedPages and the existing local-time formatter. There is no new
navigation destination, primitive, chart, kit, dependency or shipping raster.

The existing reading-width column retains deal facts before the tabs. Commission
selection, current terms/recognized balance, valid receipts and immutable history
are flat sections. Facts use two columns only from the existing small breakpoint;
fields stack, actions wrap and long French labels/reasons remain within the work
column. Section/field gaps, control dimensions, focus and scrollable dialog
geometry reuse the existing Tailwind semantic system. No palette, type role,
font, layout token or custom stylesheet is introduced.

Expected terms, recognition and receipt entry remain distinct decisions.
Confirmations show the affected amounts and retain originals; history explicitly
labels commission snapshot amounts separately from receipt amounts. Optional
proof selection reuses current clean deal/contact documents. Failed edits retain
drafts, associated field errors identify invalid inputs, and version conflicts
offer a deliberate current-facts comparison. Reopened commissions show a review
warning; archived contacts retain read-only financial facts. These statements
describe the composed interface, not an independent security certification.

The [commission contract](commissions-local.md) and
[SP-16 execution](../03-planning/sprints/sp-16-execution.md) define functional
rules and technical evidence. The [finish review](../../.impeccable/sp16-finish-review.md)
preserves its full review and resolves its single stale-guidance copy finding
on the final build; its `ship` covers that scored fix. The
[documenter record](../../.impeccable/sp16-documenter.md) records the incumbent
system comparison and inherited metadata drift. Technical acceptance and
Khalid's product/design approval remain independent.

## SP-17 scoped reporting composition

`features/reports` adds ReportDashboard before the existing work, internal-inbox
and visit-follow-up sections in WorkDashboard. PageHeader and service status
remain above this composition. Existing shadcn Button, Input, Label, NativeSelect
and Table compose flat indicator, chart, drill-down and exception sections with
RecordError, NumberedPages and exact MAD/date formatters. The indicator definition
list uses one column, then two from the existing small breakpoint; date fields
and actions wrap with the incumbent field, control and gap geometry.

Inclusive date fields distinguish current portfolio from selected-period results
and authored actions. The first successful server-resolved period becomes the
selected period and survives transient loading, error, denied and retry states;
report records still disappear when the read is unavailable. Scope and attribution
explanations precede the values. Numeric indicator buttons retain the existing
44px control target, and closing the inline drill-down returns focus to its
trigger. Drill-down selection carries the same resolved period and optional
contributor identity; backend scope remains authoritative.

Three lazy-loaded Bklit bar charts show contacts by current responsible person,
unreopened wins by responsible person at closure, and actions by their true
author. Each chart displays ten numbered points per page with the matching
exact numeric table and an action for the full metric's records. Focusing a
contributor button opens the Bklit tooltip, Escape dismisses it, and activation
opens that contributor's filtered records. Long labels wrap; counts are absolute
with no invented rate, trend or funnel. Operational count animations are disabled.

The reviewed Bklit registry source lives under `components/charts`; its
`--chart-*` mapping consumes existing KAY semantic colors. The shared chart-height
role in `globals.css` is 16rem; it introduces reusable geometry, not a new visual
identity. Registry SVG/portal integration has five scoped ESLint rule exceptions
under that directory only; KAY feature wrappers retain normal application rules.
Source, pinned dependencies and retained licenses are recorded in
[Bklit provenance](../../frontend/src/components/charts/PROVENANCE.md).
No new palette, font, general component kit, custom stylesheet or shipping raster
is introduced.

Exceptions remain a separate current-state section with its own filter, refresh
and numbered pages; they do not inherit the report period or mutate inventory
or deal outcomes. Existing work/inbox/follow-up sections remain available during
a report read failure. The [dashboard contract](dashboard-local.md) and
[SP-17 execution](../03-planning/sprints/sp-17-execution.md) define the functional
and technical boundary. The [finish review](../../.impeccable/sp17-finish-review.md)
preserves its original review and resolves F1's selected-period preservation;
its final `ship` covers that scored fix. Optional mobile table-density finding
A1 remains unselected and is not a reusable layout rule. Technical acceptance
and Khalid's product/design review remain separate.

## SP-18 atomic contact-import composition

`features/imports` composes ImportPanel, BatchReview and ImportRows inside
`/leads?view=import`, reached through the manager/administrator Leads action.
PageHeader and the return-to-Prospects link retain the existing context. Existing
shadcn Button, Input, Label and AlertDialog combine with AgentPicker, RecordError,
NumberedPages and semantic Tailwind tokens; backend authorization remains
authoritative.

The native CSV chooser has a French trigger, announced filename, expandable
format guidance and transfer progress/cancellation. Batch status and counts
precede flat, source-numbered rows. Each row shows its name, primary phone,
textual eligibility and effective agent; a disclosure exposes the remaining CSV
values. Row facts use two columns only from the existing small breakpoint;
fields stack, actions wrap and long French values remain within the work column.
The form and agent editors reuse the reading-width, field-gap and control roles.

Fallback and individual agent choices require a regenerated preview before page
changes or approval. Invalid rows block approval; skipped existing-phone rows
offer no assignment edit. One protected confirmation states the whole-batch
counts and effects, and returns focus to the approval trigger. Pending commands
lock competing controls. A corrected upload creates another batch; completed
same-batch transfer retries refresh the mounted review. Unknown approval results
offer current-state refresh or the same approval retry without claiming rollback.
Committed reports retain their date/counts and links to created contacts; denial
replaces private report content with the shared error state.

No new palette, type role, font, token, component kit, chart, stylesheet,
dependency, sidebar destination or shipping raster is introduced. These are
implemented composition facts, not a new visual system or V3 implementation
acceptance. The [import contract](contact-import-local.md),
[SP-18 execution](../03-planning/sprints/sp-18-execution.md) and
[finish review](../../.impeccable/sp18-finish-review.md) retain the functional,
technical and scoped visual evidence; Khalid's product/design review is separate.

## SP-20 local website receipt composition

`features/intake/website-form.tsx` composes the existing shadcn Button, Input,
Label and Textarea in the incumbent reading-width column. The local synthetic
warning precedes stacked fields; labels, help, fields and wrapping actions reuse
the existing Tailwind gaps, type roles, focus and control dimensions. Received
Leads retain the existing table/detail composition with the textual source
« Site web »; contact history renders the source's supplied author label.

An accepted request replaces the form with processing state, a wrapping opaque
receipt reference and explicit status refresh. Processing labels use the existing
info/success/danger foregrounds with words and status semantics. A follow-up error
retains the receipt; uncertain delivery retains the original submission for the
same-send retry. Validation and request-size rejection unlock the retained draft;
the size error specifically asks the user to shorten the message. A new-request
action appears after processing completes. Receipt references remain in page
memory, with visible guidance to preserve the reference before leaving.

This is an implemented state composition, not a new primitive or visual system.
No palette, type role, font, layout token, kit, chart, stylesheet, dependency or
shipping raster is introduced. The [intake contract](website-intake-local.md),
[SP-20 execution](../03-planning/sprints/sp-20-execution.md),
[finish review](../../.impeccable/sp20-finish-review.md) and
[documenter record](../../.impeccable/sp20-documenter.md) retain the functional,
technical and scoped visual evidence. Documentation is not a finish verdict,
broader V3 implementation acceptance or Khalid's product/design approval.
