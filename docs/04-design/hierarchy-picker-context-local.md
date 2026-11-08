# Selected hierarchy picker context

Date: 2026-10-29. Branch: `codex/redesign`. Source/synthetic verification only;
actual SQL/native/owner acceptance remains pending.

## Existing hierarchy and block intent

The real Property stores development_id, optional floor_id and unit_type_id.
Its block is derived through Floor.block_id. Apartments require a floor and a
compatible reusable type; other supported units can remain directly attached to
their programme. The selected wizard keeps these existing fields and contracts.

The preceding field audit left block-only review semantics for follow-through.
Current source already refuses saving a selected block without a floor, with
an explicit choose-floor/remove-block message. Save validates all earlier steps,
even after a direct jump to review. New tests through the actual command owner
confirm0 dispatch before correction, then the saved floor-derived block. An
intentional direct-programme unit has no phantom block/floor. No new block field,
mandatory floor for every unit, or restriction on clickable steps is introduced.
Review describes a draft; it does not bypass the final write guard.

## Proven picker gap and correction

The shared LevelPicker serves the selected unit filter drawer and property/unit
wizard. It already rejected wrong page/size, duplicate IDs and oversized pages,
but accepted shape-valid rows belonging to another programme or block. The new
actual-component regression initially fails because that picker remains enabled.
This is a simulated response mismatch, not an observed backend scope failure.

Each page now also requires every row to match its requested parent: blocks and
reusable types use development_id; floors use block_id. A mixed/wrong-parent
page is refused as a whole. No row, retained label or misleading partial pager
is offered from it; change events, including synthetic/retained/clear events,
cannot adopt its choices. Existing dependency-error/retry components are reused.
The saved caller selection is not automatically discarded. A healthy current
retry restores the existing scoped choices. Metadata failure is503, never a
fabricated403; current denial still follows the existing denial callback.

Compatible type choices, complete programme counts, other-category disabled
options, selected labels on other pages and numbered paging remain. The previous
fixture is updated to include real parent IDs and a stable parent rather than
weakening the guard. Backend authority still validates the actual floor/type/
programme and current write eligibility. No API, schema, permission, persistence,
stock or backend production change.

## Selected composition and evidence

The same labelled shadcn NativeSelect, existing count/status, compact pager,
RecordError/retry and form/drawer placement remain. No new button, token, glyph,
stylesheet, breakpoint, motion, chart, library or selected prototype change.
Frontend Taste applies to truthful current choices/error states within this
composition; static app lint checks the one changed UI source with0 findings.
No new concept/assets or actual inspector. Original-machine mandatory skills
remain unavailable, and AFTER timing is preserved.

Focused40 cases pass. Full938 frontend units pass, six added: four picker tests
cover all three kinds, mixed pages/retry, parent changes, category/count/paging/
retained selection/denial; two actual wizard-owner cases confirm the existing
block/floor guard and intentional direct attachment. Lint/types/build/compiled
history pass. Backend573 units are retained from the unchanged prior boundary,
not rerun. An initial relative-path edit failure left the old fixture unchanged;
it was corrected before the final focused/full passes.

Two cases in frontend/tests/e2e/hierarchy-picker-context.spec.ts prepare390/1440
manager programme/block setup, a shape-valid simulated foreign read, disabled
choices, healthy retry and0 property POSTs when a selected block lacks its floor.
They are typechecked, **not run**. Trace/video/screenshots are off, fixtures are
synthetic, cleanup detached. They do not prove actual backend leakage or native
geometry. No new manual frame is created or claimed inspected.

No actual app/browser/HTTP/DB/account/private config/service/worker/scanner/
simulator/transfer access or workaround, migration, main/push/merge/deployment.
Actual SQL/legacy/races/rights/stock/file/native/device/focus/zoom/contrast/security/
CI/AFTER/product acceptance and migrations0036/0037 remain pending. Other exact
P0 fields/contexts/legacy selectors and P8 acceptance remain; full goal stays active.
Main and all254 frozen inputs are preserved.
[Evidence](../03-planning/design-migration-evidence/hierarchy-picker-context-2026-10-29.json).
