# Calendar reference refresh

2026-10-18. Active owner-requested goal. No commit or push.

Match the supplied calendar image while retaining KAY Riviera branding, existing
French routes, scoped visits, backend-authoritative Casablanca civil time,
working/lunch rules, capacity, and private colleague free/busy. Reference data
is not real CRM data; varied synthetic visits must prove the populated result.

## Acceptance and reference map

- Compact heading/create action, one toolbar with week range/arrows, Today,
  accessible-visits/free-busy choice, rules disclosure and Week/Agenda/By-type.
- Left mini-month with selected week/day, month navigation; type and status
  checkboxes with authoritative full-week scoped counts, plus actual lunch rules.
- Seven aligned day headers with large dates, hour rail, restrained day/lunch
  surfaces, blue office/purple no-car/cyan company-car event cards and real status.
- Correct duration placement, readable detail access and noncolliding overlap
  lanes; short/multi-day/late visits remain reachable, not silently clipped.
- Responsive filters and agenda, keyboard/touch/200% zoom, loading/empty/error/
  denied states and real working controls. Keep numbered server pages; no fake
  or current-page-only counts. Filters must work beyond page one.
- Synthetic office, car and no-car visits with varied statuses, times and titles
  for direct screenshot comparison at the reference1586x992 and mobile widths.
- Real backend/facade/browser tests, final screenshots opened and compared to
  the target, privacy/security evidence, AFTER audit and completion audit.

Reading: operational scheduling for the KAY team, existing Riviera world,
ENERGY1/RHYTHM1/MOTION1. Use design-system-ops, responsive and React guidance;
design-taste excludes dense CRM scheduling. Antislop remains AFTER. No generated
imagery, unrelated shell redesign, new calendar package or business state.

| Observation | System role | Mapping/action |
|---|---|---|
| 288px left planning rail /12px gap | calendar workbench | central calendar geometry tokens, responsive collapse |
| 64px hour rows,88px header | temporal grid | central hour/header geometry; data-driven position |
| Warm flat surfaces/honey navigation | KAY identity | existing Riviera aliases and shadcn buttons |
| Three event colours and icon/status | type identification | existing blue/purple/cyan Riviera categorical fills, readable ink |
| Mini dates smaller than44px | compact visual days |44px nonoverlapping targets; necessary accessibility difference |

Implementation and evidence are recorded below as completed. Product acceptance
remains separate. Do not mark this goal complete from tests alone: compare the
actual populated render against the supplied target and audit every item above.

## Implementation and reference comparison

D38 is limited to S09. Existing shadcn/Tailwind, FilterResultsLayout/Sheet,
NumberedPages and typed Iconsax compose the calendar. Optional shared-layout
props preserve incumbent defaults; calendar alone gets the288px rail and compact
shell spacing. Existing shell branding/header remain rather than cloning the
image's200px rail. All temporal geometry is central; event positions use rem,
connected overlap clusters, dynamic hour bounds and≥44px link targets. The52px
minimum lane corrects the post-inset hit area for four simultaneous visits.
The mini-month chooses a week with44px row targets; the native date input chooses
any day. These are intentional accessibility differences from the tighter image.

The requested semantic type icons are building for office, people for no-car,
and car for company-car. Clock/real status are separate. Car and clock came from
the integrity-verified official Iconsax0.1.1 archive; exact SVG hashes and the
equivalent car subpath combination are in the existing provenance manifest.
The temporary source tarball was removed; no package/dependency/lock changed.

Backend type/status selections are exact, bounded, combined before numbered
pagination. Zero-inclusive whole-range facets use the same scoped repeatable-read
snapshot before those selections. An empty selection means none, not all.
Colleague busy intervals reject type/status filters and return no facets/private
metadata. No migration, mutation rule, fleet feature or development seed.

Two main visual batches opened the baseline, supplied1586x992 image and final
populated desktop/mobile/filter captures. They show the matching toolbar,
mini-month/type/status rail, seven dates,64px hourly grid, policy lunch and four
real synthetic visits at Mon10/Tue14/Wed11/Fri15 in cyan/purple/blue with actual
confirmed/scheduled states. Existing Riviera fonts and shell remain. Native200%
was captured separately as accessibility evidence, not an aesthetic iteration.
All screenshots are synthetic post-login UI; no passwords or source client data.

Safe images: `frontend/output/playwright/calendar-reference/desktop.png`,
`mobile.png`, `mobile-filters.png`, `native-zoom-200.png`. The final native zoom
is2x baseline DPR,713 CSS-pixel viewport, minimum sampled contrast5.5399:1,
0 horizontal page overflow and0 controls under44px. Width checks also exercise
320/360/768/1024/1440/1586. Images remain ignored evidence, not shipping assets.

## Actual commands and retained failures

Backend, with its explicit venv and exclusive isolated lease:

- `.venv/Scripts/python.exe -m pytest tests/test_calendar_filters.py tests/test_schedule.py tests/test_schedule_edges.py tests/test_schedule_http.py -q --tb=short`:40 passed in51.52s.
- `.venv/Scripts/python.exe -m ruff check app/schedule tests/test_calendar_filters.py`:pass.
- `.venv/Scripts/python.exe -m mypy app/schedule`:11 files pass.

Frontend:

- `npm.cmd run test:unit`:61 passed, including exact/empty filters, facets,
  current-session forwarding, free/busy denial, dates and overlap packing.
- `npm.cmd run lint` and `npm.cmd run typecheck`:pass. Inventory:45 semantic
  icons/46 consumers/163 sites,318 buttons/102 files,0 violations.
- `KAY_UI_CHECKS=1 npm.cmd run build`:pass in separate.next-e2e while the user's
  development.next and3100 listener stay intact.
- With PLAYWRIGHT_BASE_URL=https://localhost:3100,
  `npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts tests/e2e/schedule.spec.ts --workers=1 --max-failures=1`:6/6 passed in3.1m.
- `npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts --grep 'overlap lanes' --workers=1 --max-failures=1`:1/1 passed17.3s after the lane correction.
- `npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts tests/e2e/filter-rail.spec.ts --grep 'calendar|lead filter rail' --workers=1 --max-failures=1`:4/4 passed1.6m, including the incumbent mobile validation/breakpoint-focus/agent-permission regression.

Early failures remain failures: strict synthetic actor-prefix enforcement; the
old generic Lead fixture missing current qualification/explicit admin assignment;
Pydantic after-validation accepting trimmed whitespace; cross-realm VM array
prototype expectations; mini-week Button inventory classification. Fixes use
valid synthetic agent-owned Leads, before-validation, normalized test comparisons
and a narrow reviewed data-control exception, never weaker product guards.
One leaked test actor from the prefix failure was identified by exact UUID and
removed through the guarded supervisor. The scope wrapper's full-width default
initially wrapped the toolbar; using a constrained parent fixed that reference
defect. Functional follow-up preserves optional-status checkbox focus while
fetching and tests draft filtering with Space; no audit-only polish was applied.

The supervisor lease was released for pytest and restarted before serial browser
fixtures. Port8000 was untouched. All visit/contact/account writes here are on
the proven isolated synthetic target and are cleaned by guarded fixtures.
The final confirmation, security and completion audit follow below.

## Final confirmation and security closure

Final `npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts --workers=1 --max-failures=1`
passes3/3 in1.3m on the real isolated stack. This adds both rules triggers with
Escape/focus return, Today, actual primary-create navigation and keyboard draft
filtering/focus during fetch. A preceding confirmation expected the form's
accessible name as the route heading; the actual established heading is
« Planifier une visite ». That test expectation was corrected, not the product.
The final three cases plus four booking cases and one incumbent filter case
constitute8 distinct passing headed checks, not repeated-run counts.

Final lint and separate production-mode build pass after the focus correction;
61 units are reconfirmed. `npm.cmd run security:check` reports0 runtime
vulnerabilities and9 inherited dev-only findings under the existing approved
exception expiring2026-11-15; this is not a clean full audit. Final
`node scripts/scan-client-secrets.mjs` checks4 roots/561 browser JS files with
0 configured facade/signing-secret occurrences.
`powershell -NoProfile -File scripts/audit-report.ps1` finds2 JSON entries,
3 empty result-step arrays and0 detailed arrays. Only.last-run.json remains in
test-results; no native profile, trace, video or input-bearing failure artifact.
Four inspected evidence/build paths are ignored and untracked. No new shipping
raster or external asset request. Main-agent finish review and AFTER031 are
recorded; no independent or human product acceptance is claimed.

Read-only proven-isolated inspection finds0 users/contacts/enquiries/deals/visits/
timeline rows after guarded fixture cleanup. CA-verified frontend3100/login and
API8100/liveness return200. The supervisor8101 remains running with its normal
lease; user's frontend PID21356 and unrelated8000/PID29676 remain untouched.
Read-only development Alembic check confirms0026_staff_deletion(head), already
applied under the prior explicit approval; this calendar requires no migration.
No retention CLI, development-record mutation, real seed, commit or push.

## Completion audit against the original goal and icon clarification

| Required outcome | Actual final evidence |
|---|---|
| Supplied reference with retained KAY identity | Actual source reference/baseline/final populated desktop and mobile opened; one toolbar,288px rail, seven dates/hours, lunch/type/status composition; existing Riviera shell/type.44px mini-week and retained224px shell differences explained above. |
| Existing icon library, no emojis | Actual SVG assertions for building/people/car on all4 reference cards; clock/status glyphs from the same verified Iconsax layer. |
| Varied synthetic visits | Four reference visits across three types/two statuses/four days; separate five-visit overlap/overnight/draft scenario, all through real API/facade and guarded cleanup. |
| Real filters/views/counts | Type/status/none selections, Week/Agenda/Par type, date/week/month/Today/rules/create/detail;52-record backend test verifies full-range facets and post-filter numbered pages. |
| Hard scheduling/privacy retained |40 backend cases plus four real browser booking cases cover actual rules/lifecycle/retry; outsider/scoped detail and metadata-free colleague busy remain denied/safe. |
| Responsive and failure states | Six widths, actual touch, keyboard/Escape/focus, native200%; real held request/loading, empty week/filter, stopped API503/restart/retry, overlap/short/overnight links. |
| Tests, visual/security review and handoff |61 units,40 backend,8 distinct headed Chrome cases; lint/types/build, one detector[], AFTER031, finish review, privacy scan/cleanup and current documentation. No production/full-product/human-approval claim. |

The scoped owner goal is technically complete. Human visual/product review
remains Khalid's; no further implementation work is required for this request.

Final root `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`
passes22 sprints/1289 local links/41 acceptance mappings/13 synchronized Mermaid
pairs/12 API examples. `git diff --check` passes. These checks validate
documentation/whitespace only, not additional application coverage.
