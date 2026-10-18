# Lead/Deal system extension check

Date: 2026-10-17. Outcome: documentation complete for this ordinary extension
of the incumbent KAY system. This check records source and rendered evidence;
it is not full-product acceptance, a replacement visual world, or an independent
rerun of the workflow gate.

## Authority and boundary

The current owner override in [PRODUCT.md](../PRODUCT.md) and
[DESIGN.md](../DESIGN.md) establishes IMMO World workflow and compact Lead/Deal
composition with KAY colours, components and authority. The
[direction contract](leads-deals-direction.md) and
[surface brief](surfaces/frontend-src-features-contacts-lead-create-tsx.md)
classify the work as Operate, ENERGY 1 / RHYTHM 1 / MOTION 1, within the existing
world. French copy, MAD, system sans, shadcn/ui, Tailwind, Iconsax and canonical
contact/permission/stock rules remain the stated constraints. Antislop retains
the owner's AFTER timing; this check does not select or fix audit findings.

This documenter pass writes only this file. Existing PRODUCT.md, DESIGN.md,
tokens, stylesheets, components and unrelated documentation are preserved.

## Incumbent system checked

| Concern | Evidence and observed reuse |
|---|---|
| Palette and actions | `branding/kay-ui-tokens.json`, `frontend/src/lib/theme.ts`, `frontend/src/app/globals.css` and `frontend/src/components/ui/button.tsx`: light canvas, white surfaces, black navigation, gold creation, green save/confirmation, red destructive actions and semantic status roles. The scoped token/CSS diffs contain no new colour role. |
| Type | `globals.css` uses the system sans stack, existing fluid `text-page`, `text-section`, `text-sm` body and `text-xs` supporting text. Shared `input.tsx` retains `text-base` below `md` and `text-sm` above it. No font or type scale was added. Satoshi in the token proposal remains subject to the existing licence/install caveat; it is not the running font. |
| Form geometry | Existing `form-surface`, `gap-2/4/5`, `sm`/`lg` grids, `h-field` and `min-h-control` are reused. The source control tokens remain 44 px touch targets and 48 px touch inputs, with the existing desktop input override. No new spacer, radius or breakpoint is introduced by this slice. |
| Lists | Both lists use the existing `FilterResultsLayout` with `inline`, `ScrollableResultsTable`, `DataTable`, `min-w-table` and numbered pages. The toolbar override is local to Leads/Deals; it does not establish a new global filter layout. |
| Record facts | `frontend/src/components/shared/record-facts.tsx` renders `dl[data-summary]` with the existing `record-facts` utility. `globals.css` gives it one column, two at `xl`, with a 2:3 label/value split from `sm`. The marker keeps the older `record-stack dl:not([data-summary])` rule from flattening it. Lead/deal detail and qualification history reuse this pattern. |

The applicable incumbent design reference is
[docs/04-design/design-system.md](../docs/04-design/design-system.md), including
its scoped 2026-10-17 additions. The package manifest/lock diff is empty for
`frontend/package.json` and `frontend/package-lock.json`; this check found no
new component-kit dependency. No shipping raster was introduced by the slice
or this documentation pass.

## Exact semantic addition

The only new shared geometry found in the scoped token/CSS diff is
`layoutPx.tableTextColumnMinWidth: 160` in
`branding/kay-ui-tokens.json`. `frontend/src/lib/theme.ts` maps the pixel source
to `--layout-table-text-column-min-width: 10rem`; `globals.css` exposes
`--spacing-table-text: var(--layout-table-text-column-min-width)` to Tailwind.
The feature utility is `min-w-table-text`.

It is applied to name and budget cells in
`frontend/src/features/contacts/lead-list.tsx`, and client, project and budget
cells in `frontend/src/features/deals/deal-list.tsx`. It preserves readable
words in the existing horizontally scrollable table instead of compressing
project names to individual letters. The existing `layoutPx.tableMinWidth`
(896 px), named scroll region and pagination remain in use. This value is
already recorded in the incumbent design-system document; no duplicate token
authority is created here.

## Surface evidence checked

The pass read or searched the finished source at:

- `frontend/src/features/contacts/lead-create.tsx`, `lead-editor.tsx`,
  `lead-record.tsx`, `lead-list.tsx`, `contact-fields.tsx`,
  `qualification-inputs.tsx` and `lead-qualification-fields.tsx`.
- `frontend/src/features/deals/deal-form.tsx`, `deal-create.tsx`,
  `deal-record.tsx`, `deal-history.tsx`, `deal-list.tsx`, `convert-lead.tsx`
  and `project-picker.tsx`.

The contact form pairs identity/phones with residence/nationality/languages on
desktop and stacks in source order on mobile. The deal form pairs
budget/source/intent/notes with the first project, financing and follow-up;
additional projects use following balanced grid rows, with a lone second
project spanning that row. Conversion requires project, budget and buying
intent through existing controls and states that project interest does not
reserve stock. History reads client name, phones, calling code, e-mails,
residence, nationality and languages from each saved `client_snapshot`, then
renders qualification through `RecordFacts`.

All 20 PNG headers in
`frontend/output/playwright/leads-deals-alignment/round-02` were checked: ten
desktop/mobile pairs with 2880/780 image widths corresponding to the recorded
1440/390 CSS-pixel captures at DPR 2. The documenter opened these eight existing
files as samples: `lead-create-{1440,390}.png`,
`deal-list-{1440,390}.png`, `deal-edit-three-projects-{1440,390}.png` and
`deal-detail-{1440,390}.png`. They support the inherited palette/control
language, responsive stacking, readable scrolling table and balanced project
composition. Long detail captures were viewed at reduced scale; snapshot-field
completeness was checked in source rather than inferred from tiny text.

The [alignment record](../docs/03-planning/leads-deals-immoworld-alignment.md)
reports the fresh reviewer verdict `ship` after scoring the three listed fixes
resolved, and the current compiled eight-case browser selection passing 8/8.
It also records one detector run returning `[]`. These are recorded upstream
results, not commands re-executed by this documenter; the verdict's scope is the
listed fixes. This pass used no browser, database, install or deployment action.

## Preserved drift and completion limits

### Functional regression confirmation,2026-10-17

The restored advanced Provenance select reuses the existing Label/NativeSelect,
grid spacing,44px control role and inline filter form. Marketing Source remains
distinct. The reporting correction supplies all nine current Lead states to the
existing Bklit distribution and definition list with existing semantic colours;
no new visual primitive or system token. The corrected real Chrome selection
passes3/3 in2.0m, following8 passing project/discovery/intake workflows. Main opened
the fresh desktop pipeline, mobile Deal pipeline and received-Lead desktop/mobile
captures. The390px touch filter has no document overflow, contrast6.045 and44px
controls; the separate simulator still passes actual200% zoom. The explicit new
mobile Lead-pipeline capture is now opened and legible after its real nine-state
case passed; the paired-record/native200% cases also pass. This is functional/UI
confirmation, not a new aesthetic audit, detector run or broader reviewer ship
verdict. The prior global format-drift limitations below remain unchanged.

Root DESIGN.md already used a historical direction/index format before this
extension: its committed version opens with a Markdown title, has no normative
token frontmatter, and does not use document.md's eight canonical sections.
`.impeccable/design.json` is absent both from the current files and committed
tree. The wider design-system prose also retains historical statements such as
“No theme file or component has been installed yet” and an older Lucide roadmap
line, while the current D33 section and actual source establish Iconsax and
installed shared components. Those historical/format mismatches are reported,
not promoted into new rules or repaired by this scoped pass.

The token-bearing DESIGN.md plus schema-v2 sidecar requirement applies to new
worlds or approved system replacements/changes requiring their regeneration.
This handoff is an ordinary extension whose reusable geometry remains in the
existing KAY token/CSS/design-system authority. The documenter cannot truthfully
claim that the current root DESIGN.md and missing sidecar meet that global
format requirement, and the supplied write boundary does not authorize their
regeneration. This does not leave the ordinary-extension comparison incomplete;
a later explicitly scoped documentation refresh would address that format drift.

No visual defect or task-local composition has been canonized as a global
design rule. Full requirement acceptance, remaining cross-module regression,
the AFTER audit and Khalid's product review retain the separate status recorded
in the alignment ledger.
