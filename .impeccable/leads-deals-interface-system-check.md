# Lead/Deal interface system comparison

Date: 2026-10-17. Result: consistent ordinary extension of the existing KAY
visual system at the requested eight-surface scope. No design-system repair or
new global token is required by this refinement.

## Role, method and boundary

The harness exposes a generic agent rather than the named shipped
`impeccable-documenter`; this fresh documentation agent substitutes for that
role. Impeccable `reference/document.md` supplies the comparison method:
inspect token sources, theme mapping, shared components, feature composition
and rendered evidence. This is the ordinary-extension finish handoff in
`reference/new-work.md`, not the root-DESIGN regeneration workflow. That rule
preserves incumbent system files and reports pre-existing drift without
repairing it unasked.

The current owner request covers Lead and Deal list, detail, create and edit.
It is a frontend interface refinement after the earlier qualification alignment.
The confirmed left filters, compact frame, borders, icons and grouped record/
form sections extend the incumbent world. Mode remains Operate,
ENERGY 1 / RHYTHM 1 / MOTION 1. The owner's antislop AFTER timing remains;
this comparison does not select or implement aesthetic audit findings.

Only this document was created by this handoff. No source, token, stylesheet,
root DESIGN/PRODUCT, sidecar or other document was edited. No browser, server,
database, detector, test, dependency, commit, deployment or deletion operation
was run by the documenter. The main agent confirmed that Impeccable context
already ran once in the session; it was not rerun here.

## Evidence inspected

Read completely: root and frontend `AGENTS.md`; the interface review packet,
direction contract and independent finish-review record; `PRODUCT.md`;
`DESIGN.md`; `docs/04-design/design-system.md`;
`docs/03-planning/leads-deals-interface-refresh.md`; and Impeccable
`reference/document.md`. The matching surface brief and the relevant
ordinary-extension finish rule were also checked.

Feature source compared: contacts `lead-list.tsx`, `lead-record.tsx`,
`lead-create.tsx`, `lead-editor.tsx`, `contact-fields.tsx` and
`lead-qualification-fields.tsx`; deals `deal-list.tsx`, `deal-record.tsx` and
`deal-form.tsx`. Shared evidence includes `FilterResultsLayout`,
`PageHeader`, `SectionHeading`, `RecordFacts`/`RecordFact`,
`DirectoryColumnHeading`, `DataTable`, `ScrollableResultsTable` and the
shadcn-derived Button/Input/Table primitives. The shell's route opt-in,
`app/globals.css`, `lib/theme.ts` and `branding/kay-ui-tokens.json` establish
the actual mapping and scope.

Personally opened these 12 final captures under
`.impeccable/review/interface/`:

| Surface | Exact files opened |
|---|---|
| Lead directory | `lead-list-390.png`, `lead-list-1440.png`, `lead-list-1920.png` |
| Deal directory | `deal-list-1440.png` |
| Lead detail | `lead-detail-390-viewport.png`, `lead-detail-1440-viewport.png` |
| Deal detail | `deal-detail-1920-viewport.png` |
| Lead create | `lead-create-1920-viewport.png` |
| Lead edit | `lead-edit-1440-viewport.png` |
| Deal create | `deal-create-390-viewport.png`, `deal-create-1920-viewport.png` |
| Deal edit | `deal-edit-1440-viewport.png` |

Each sample shows the named surface/state from the document top, without a
blank, loading or wrong-surface region. The first-view companions keep form and
detail typography readable; source inspection establishes below-fold component
presence. The builder and independent reviewer separately validated all 36
required matrix files. This documenter sampled 12, not all 36.

For incumbent visual comparison, personally opened Approved V3 originals
`03-leads-and-deals-list.png`, `04-create-or-edit-lead.png` and
`05-lead-details.png`. Their palette, neutral section surfaces, restrained
status treatment and compact data language persist. Their older filter and
stacked-detail compositions are superseded on the scoped surfaces by the
current explicit request and direction contract.

## Observed system reuse

| System area | Observed source and rendered result |
|---|---|
| Palette | Token JSON feeds `themeVariables`, then semantic Tailwind variables. The captures retain the light canvas, white content, charcoal text, pure-black navigation, gold creation/selection and established status families. No feature-local raw palette replaces those roles. |
| Typography | `globals.css` retains the system-ui / Apple / Segoe UI sans stack, existing fluid page title, section/body/label utilities and sentence-case French copy. No font installation or new type scale appears. The historical Satoshi proposal is not treated as an installed face. |
| Spacing and shape | Existing 4px/8px rhythm supplies 8/12/16/24/32px interiors and gaps. The current mapped small/medium/large radii remain 6/6/10px. Shared 44px control targets and responsive fields remain in the existing primitives. |
| Depth and borders | White bordered surfaces and muted table headers remain flat. The scoped table and fact separators use the existing border color with reduced opacity. No new shadow, glow, backdrop material or surface palette appears. |
| Navigation and frame | `app-shell.tsx` opts `/leads` and `/deals` route families into `crm-gutter`, full available width and compact vertical spacing. The global header shares the same inset. The existing shell geometry remains the default for other families. |
| Filters and tables | Full directories use existing `FilterResultsLayout`: 256px rail, 24px results gap at 1280px, one labelled left Sheet below that breakpoint. Embedded contact lists keep its inline option. Existing TanStack/shadcn tables, column choice, numbered pagination, scoped totals and named keyboard-scroll regions remain. |
| Record facts | Existing definition-list components and semantic Iconsax labels remain. The new peer panels each request one fact column; narrow screens stack the panels and label/value rows. Header edit/conversion actions remain visible in the samples. |
| Forms and recovery | Existing field, label, checkbox, selector, textarea, validation and semantic action primitives remain. Source retains busy/denied/error states, stable command retry keys, explicit version reloads and draft-preservation messages. Create/edit retain their actual contact and qualification fields. |

The existing 160px `tableTextColumnMinWidth` / `min-w-table-text` role remains
on selected name, project and budget cells. The design-system document
attributes it to the earlier qualification alignment. It is incumbent evidence
for this refinement, not a newly extracted interface-refresh token.

Source also retains the real Lead requirement/assignment/conversion boundaries
and the Deal reservation, outcome/reopening, pipeline, proposals, task, history,
finance and private-file components. This is a source-presence observation,
not an independent behavioral or authorization test.

## New composition and shared API changes

The implementation adds shared `crm-*` recipes for these eight surfaces:
16px safe frame insets; 16px panel gaps; paired detail panels at 1280px; paired
major form sections at 1536px; compact 16px section padding; 12px table cell
insets; and bordered action groups. These reuse incumbent scale steps and
Tailwind breakpoints. The 50% table and 60% fact-divider border opacities are
recipe treatments of the existing border token, not new semantic colors.

`PageHeader` accepts a typed semantic icon; `SectionHeading` accepts compact
presentation; `RecordFacts` accepts one or two fact columns; and
`DirectoryColumnHeading` composes a labelled 16px Iconsax glyph with the
existing 8px gap. These shared component extensions reuse the incumbent type,
color, shape and spacing vocabulary.

The compact ContactFields and Deal qualification subgrids split when their
own container reaches Tailwind's existing 64rem threshold, rather than using
the viewport alone. The 1440px and 1920px samples show why: a narrower panel
keeps its fields readable even on a wide display. This is a scoped responsive
composition, not a new global field minimum or a mandate for unrelated forms.
The ledger's 240px desktop-control assertion is test evidence, not a token.

No new global palette, font, spacing, radius, control-height or
breakpoint value was identified. The recipes and API options above are
documented here at their actual scope; they do not canonize left filters,
paired details or paired forms as a universal KAY composition.

## Historical drift and verification limits

Root `DESIGN.md` predates the current Impeccable token-bearing format: it has
no YAML token frontmatter and does not use the canonical eight-section order.
`.impeccable/design.json` is absent. These are pre-existing documentation/tool
format drift. They were reported and preserved, not repaired during this
ordinary extension. The actual central token JSON and theme mapping remain
available and were inspected.

Older inline-filter, stacked-record, proposed geometry and installation-status
paragraphs remain historical. The explicit current interface-refinement
paragraph in DESIGN and the corresponding design-system section govern the
eight surfaces; current source/tokens establish implementation facts. None of
these older paragraphs authorizes undoing the requested rail/panel work, and
this comparison does not rewrite those historical records.

The inspected ledger records final lint, direct TypeScript, Next production
build and 45/45 unit passes, plus the compiled headed Chrome run passing
20/20 cases in 6.6 minutes, including native 200% zoom. The independent full
finish reviewer returned `ship` with no material fixes at all eight surfaces.
Its record correctly says cross-browser checks were pending at review time.
Subsequently, the main agent supplied terminal exit-0 evidence of 6/6
qualification spot checks passing in 1.9 minutes across installed Edge,
Firefox and WebKit, and confirmed no application edits after the reviewed
build/captures. Those results are supplied execution evidence; this documenter
did not rerun them. Browser automation is not physical-device validation.

Result: the finish documentation handoff is complete for this ordinary
extension. The independent `ship` remains scoped to the requested interface,
not whole-product approval, deployment readiness or Khalid's human acceptance.
Exact file created: `.impeccable/leads-deals-interface-system-check.md`.
