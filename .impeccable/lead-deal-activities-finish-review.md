# Lead/Deal activities: scoped finish review

2026-10-18. Main-agent source/visual review, not an independent reviewer or
Khalid's product acceptance. Verdict: technical slice ready; development
migration requires the pending explicit approval. No production release verdict.

Inspected the exact final synthetic captures under
frontend/output/playwright/scoped-activities: lead-desktop, deal-desktop,
origin-desktop, deal-mobile, activity-form-mobile and archived-read-only.
Desktop1600px shows all seven columns; narrower widths keep a named keyboard
scroll region, visible instruction and full text. Mobile creation wraps actions
within the form and retains visible focus. The separated origin table has no
Add button and retains the exact Lead text/author/date. Existing version and
operational panels remain below, rather than being replaced by the example UI.

No material visual defect in this inspected slice. Source and browser evidence
confirm current authority, one-context manual entries, text-only rendering,
atomic same-key retry and no duplicated origin entries. Six320–1600 geometries
and native200% Chrome checks pass; sampled contrast≥5.6407:1 and controls≥44px.
Four final visible Chrome cases pass. This does not certify physical devices,
all browsers or the full CRM. AFTER029 adds no aesthetic-only finding/fix.

Documentation: API/model/screen/acceptance/traceability and QA/security records
describe the new behavior. DESIGN.md and its existing tokens need no change:
the component uses the current Riviera world; no new shipping raster, font,
palette, chart, CSS recipe or dependency was introduced. Historical/global
metadata was not silently repaired. New scoped surface context is persisted.
