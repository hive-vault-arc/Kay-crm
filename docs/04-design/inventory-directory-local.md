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

Remaining P0/P4 gaps are explicit: the prototype's programme preparation/marketing
phase has no persisted equivalent yet; programme desktop Cards/List still needs
parity; property category presentation retains the inherited multiselect; and
project-kind URL Back/Forward synchronization needs reconciliation. No business
default, migration or final completion is inferred from this slice.

Frontend Taste's app-screen guidance now applies under Ali's2026-10-28 instruction:
grouped fields, consistent spacing, honest states and phone filter sheets. The
selected KAY identity/layout supersedes a new style draw or generic house palette.
No browser inspector or screenshot pass is claimed under the existing app-access
restriction. Original-machine mandatory skills remain unavailable; AFTER timing
and final owner acceptance remain. No real DB/service/private configuration,
real records, app-access workaround, migration, main/push/merge or deployment.
