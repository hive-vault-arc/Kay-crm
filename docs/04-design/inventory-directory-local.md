# Selected inventory directory ranges

Date: 2026-10-28. Branch: `codex/redesign`. This extends the selected inventory
directories without replacing their cards, hierarchy, permissions or stock rules.

## Query and comparison contract

The inherited query models already declare price, surface and room bounds. The
properties, developments and development-inventory route/facade allowlists now
accept the applicable fields, and their actual reads apply them before counting,
faceting and paging. No schema, migration, write or permission is introduced.

- Properties and physical units accept `min_comparison_mad`,
  `max_comparison_mad`, `min_area_sqm` and `min_rooms`.
- Developments accept the two price bounds only. These compare an offering of the
  whole development; a child's offering cannot qualify its parent.
- Both price bounds, offering kind and offering state must match the **same**
  offering. A cheap sale and an expensive rental cannot jointly satisfy a range.
- BR-08 retains exact decimal MAD: sale price, monthly ordinary rent multiplied
  by twelve, or yearly ordinary rent unchanged. Holiday rentals have no invented
  annual equivalent; they are excluded when a price bound is supplied. They still
  match their existing kind/state filters when no price bound is requested.
- Requested dimensions compare physical property facts, not reusable-type
  defaults. Missing price, area or rooms does not satisfy a requested bound.
- Price and area bounds are positive; room minimum is an integer from1 to1000.
  Minimum price cannot exceed maximum. Existing strict query validation remains.
- Current offering/archive behavior is retained, including explicit withdrawn
  offering queries. Current identity is checked before any business query.
  There is no owner/contact join or widening of private ownership access.

The frozen prototype compares raw holiday amounts despite its annual label.
This implementation retains the real comparison contract and explains the
holiday exclusion beside the fields instead of silently inventing a conversion.

## Selected presentation and recovery

All three directories use the common filter controller and existing selected
shadcn/Tailwind fields. Labels sit above inputs; one shared hint explains the
comparison, and errors name and associate the affected field. No new stylesheet,
component kit, chart or external dependency is introduced. Properties now use
the common reference filter frame instead of the old oversized workbench frame.
The default twenty-row page size has a matching native option.

Raw drafts retain decimal commas; validated queries normalize to decimal points.
Exact price ordering uses decimal strings and `BigInt`, never floating point.
Invalid drafts retain applied results/page and do not close the filter drawer.
Valid debounced or explicit application resets page once. Unit hierarchy deep
links initialize independently of defaults, count as active, and reset immediately.
Desktop property Cards/List preference survives the phone's cards-only override.

### Programme presentation and current route selection

The follow-up after8da316c uses one shared ProjectResultsView for both kinds:
count/status, Cards/List, sort and compact responsive overrides. One parent-owned
desktop preference survives kind switches and the phone's cards-only view.
Programmes now have a real numbered desktop list with their thumbnail/name,
reference/category, location, unit/availability counts and exact own-offer
amounts/states. The list's phone fallback reuses the existing image card, and
there is no added drawer table. No preparation/marketing phase is invented.

Project kind derives from current server route props, rather than a one-time
state initializer. Changes push the fixed internal kind route; Back/Forward
props can update the active tab and matching create action. Both directories
remain mounted, preserving filters and pages. No new storage or history shim
is added. Programme sort now has one toolbar home, and a one-page result omits
the redundant pager. Empty programme results provide reset; failed reads do
not report retained counts as current. The selected existing CSS is reused.

536 frontend units/lint/types/build/compiled history pass for this follow-up;
four additional actual controller/render/navigation cases cover these paths.
One browser journey for kind history, retained filters, desktop list and phone
cards is prepared/type-checked, not executed. Static Frontend Taste app lint
checks four changed UI sources with no findings. React derived-state guidance
applies; no new state-mirroring effect, dependency or backend change is added.
[Presentation evidence](../03-planning/design-migration-evidence/project-presentation-2026-10-28.json).

### Selected property category choices

The follow-up after3587553 replaces inherited checkbox rows/coloured markers
with the selected single-choice radio list and explicit Toutes. The existing
shadcn RadioGroup supplies keyboard/checked behavior; each associated label
remains at least44px tall. Toutes sends the existing canonical complete category
selection, not the API's empty selection. Choosing one category or Toutes retains
search, range and other criteria, and the shared controller resets page once.

Counts are the existing server category facets and `unfiltered_total` under the
other applied criteria. Missing counts stay unknown/disabled, never invented zero.
Legacy Maison appears when records use it; a selected Maison remains visible at
zero so another filter cannot make the selection disappear. Older multi/empty
query semantics remain accepted by the API. If such a selection is presented,
the UI states it explicitly instead of mislabelling it Toutes. No backend, grant,
storage, dependency, schema, migration or stylesheet changes.

539 frontend units pass, with three additional actual radio/controller recovery
cases and revised semantic model coverage. Lint/types/build/compiled history and
static app lint pass. Prepared photo/campaign browser journeys now use selected
radios, empty-category recovery, exact annual-price bounds, compact card links
and current programme labels; touch target geometry includes labelled radios.
They are updated/type-checked, not executed. Other historical native selectors
and actual keyboard/touch/zoom/focus acceptance remain pending.
[Category evidence](../03-planning/design-migration-evidence/property-category-2026-10-28.json).

## Evidence and outstanding reconciliation

532 frontend units pass, including12 new range/model/controller/facade cases.
Lint, types, Next16.4.2 build and compiled-history checks pass. Connection-forbidden
backend units pass476 with704 integration cases deselected;13 new pure/compiled
SQL/fully stubbed in-process ASGI cases cover these read paths. Ruff check/format
on nine changed Python paths and backend-configured mypy on219 sources pass.
Four PostgreSQL cases and one browser journey are prepared and type-checked,
not executed. Compiled SQL and stubbed routes do not prove real SQL results,
current authorization, native focus/spacing, touch, zoom or responsive behavior.
[Recorded evidence](../03-planning/design-migration-evidence/inventory-directory-2026-10-28.json).

The programme phase now has a source-level storage/API/UI/history slice with
prepared, unapplied migration0037; see the [phase contract](development-phase-local.md).
Selected category, desktop programme view and route synchronization source are
implemented above. Actual SQL/migration/native history/width/focus acceptance and
the full per-domain reconciliation remain pending.
No business default, migration or final completion is inferred from these slices.

Frontend Taste's app-screen guidance now applies under Ali's2026-10-28 instruction:
grouped fields, consistent spacing, honest states and phone filter sheets. The
selected KAY identity/layout supersedes a new style draw or generic house palette.
No browser inspector or screenshot pass is claimed under the existing app-access
restriction. Original-machine mandatory skills remain unavailable; AFTER timing
and final owner acceptance remain. No real DB/service/private configuration,
real records, app-access workaround, migration, main/push/merge or deployment.
