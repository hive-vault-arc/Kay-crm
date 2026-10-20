# KAY QA command register

## Full-size private property photo viewer — 2026-10-20

Frontend `npm.cmd run typecheck`, lint, build, security:check and 72/72 units
pass. The first headed photo browser attempt failed waiting for a clean scan
because KAY's ClamAV container was stopped, not because of the viewer. After
`docker compose -f backend/compose.clamav.yaml up -d` became healthy, the
headed development Chrome case passed 1/1; the final compiled Chrome case
passed 1/1 in 52.5s after the 320px control adjustment. The latter opens two synthetic WebP photos, checks
previous/next and keyboard arrows, Escape/focus return, single-photo disabled
arrows, mobile 390px and 320px geometry, a simulated private-transfer failure/retry,
archive/cap and agent read-only access. Desktop/mobile viewer screenshots were
inspected, including the final 320px frame; `impeccable.cmd detect --json` returned `[]`. System-first Riviera geometry and an icon-only narrow-screen control were used; design-taste-frontend's marketing workflow was excluded for this dense CRM surface. AFTER audit: [AFTER040](../anti-slop/audit-040-2026-10-20.md), with no aesthetic-only change. Runtime dependency
audit found zero issues; the existing nine dev-only findings remain under the
dated approved exception. No backend code or migration changed in this slice.
The prior hosted full-browser run also exposed a stale shell assertion: the
edge-mounted sidebar toggle intentionally protrudes outside the rail, so
`aside.scrollWidth` is not the interior-overflow measure. The test now measures
`.sidebar-scroll` on desktop and the drawer itself on mobile, while retaining
the document-width check. The focused compiled headed case passed 1/1 after
that correction; the full hosted integration must pass on the final commit.

## Inventory record icons and shell scroll isolation — 2026-10-19

Frontend `npm.cmd run typecheck`, lint, 72/72 units and final build pass.
Headed Chrome: inventory-design selected journey 1/1; full shell 7/7; inventory
and development reviews 2/2 at 320–1440px and real 200% zoom. Earlier shell
reruns exposed an edge-toggle pointer overlap and then a pre-hydration screenshot
warning; both were fixed before the final pass. Final Impeccable detector `[]`.
No backend/database migration, production change, or publication in this slice.
See [execution](03-planning/inventory-design-refresh-2026-10-19.md#record-details-and-stationary-shell-follow-up-owner-request-2026-10-19).

## Private property photos — 2026-10-19

Backend explicit `backend/.venv/Scripts/python.exe`, isolated PostgreSQL test
target at head0029 and healthy pinned ClamAV:
`-m pytest tests/test_property_photos.py tests/test_files.py
tests/test_file_edges.py tests/test_inventory_migration.py -q --tb=short
--maxfail=1` — **35 passed/96.01s**. Ruff check/format on affected file
modules/tests and mypy `app/files` pass. Migration 0029 is additive; `alembic
check` found no operations on both migrated isolated and local development
targets. Local development advanced from 0026 to 0029 after target/OID checks;
no hosted database was touched.

Frontend: `npm.cmd run typecheck`, lint, build and existing 72/72 unit tests
pass. Headed isolated Chrome `npm.cmd run test:chrome --
tests/e2e/property-photos.spec.ts --workers=1 --max-failures=1` — **1 passed/
57.6s** on the final photo UI: browser PNG→WebP conversion, actual private
upload/scan/preview, refreshed header thumbnail, 10-photo limit, archive,
mobile no-overflow and agent read-only. The existing eight-photo project
directory case passes with WebP fixtures. Synthetic desktop/mobile captures
were inspected; `impeccable.cmd detect --json` returned `[]`; see
[AFTER036](../anti-slop/audit-036-2026-10-19.md). This is scoped verification,
not a full-product or production release gate.

## Inventory creation wizards — 2026-10-19

[Follow-up ledger](03-planning/inventory-design-refresh-2026-10-19.md): creation-only, three-step adaptive programme/property/unit forms; no schema or production change. `frontend/`: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:unit` (72/72), and `npm.cmd run build` pass. Headed isolated Chrome `npm.cmd run test:chrome -- tests/e2e/inventory.spec.ts tests/e2e/developments.spec.ts tests/review/inventory-design.chrome.spec.ts --workers=1 --max-failures=1` passes 14/14 (5.4m) on final UI source; the later dedicated review passes 3/3, including keyboard/optional-promoter/cancel. `backend/` explicit venv `-m pytest tests/test_inventory.py tests/test_developments.py -q --tb=short --maxfail=2` passes 30/30. Final layout detector `[]`, desktop/mobile (320/360/1440) synthetic captures inspected. Earlier failed aggregate runs exposed a premature Next→submit browser-default action; the fix and regression assertion are retained in the ledger. No full-product or hosted release gate is claimed.

## Inventory form/detail design — 2026-10-19

UI-only [execution](03-planning/inventory-design-refresh-2026-10-19.md): `frontend/` `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:unit` (72/72), final `npm.cmd run build` all pass. Headed isolated Chrome `npm.cmd run test:chrome -- tests/e2e/inventory.spec.ts tests/e2e/developments.spec.ts --workers=1 --max-failures=1`: clean final 12/12 in 5.1m. Existing inventory/development reviews 2/2 and new final design case 1/1 pass. Earlier failures (agent edit visibility, marketing-name heading) and corrections are retained in the ledger. Desktop/mobile synthetic captures inspected; final layout detector `[]`. No production data or migration touched.

## Commercial property category — 2026-10-19

Backend explicit venv, isolated test DB head0028: `-m pytest tests/test_inventory.py tests/test_inventory_edges.py tests/test_developments.py tests/test_property_facets.py tests/test_requirements.py tests/test_inventory_migration.py -q --tb=short --maxfail=2` — 77 passed/103.31s. First run against isolated head0027 failed two category inserts as expected; `APP_ENVIRONMENT=test -m app.cli.inspect_database` confirmed database/OID, then `-m alembic upgrade head` advanced only the isolated test target. Ruff check/format all and mypy app pass. `-m alembic check` still fails on pre-existing 0027 Lead/Deal archive metadata drift; no 0028 operation is listed.

Frontend: `npm.cmd run test:unit` — 72 passed; `npm.cmd run typecheck`, lint, build and security:check pass (zero runtime vulnerabilities; nine dev-only findings under existing dated exception). `npm.cmd run test:chrome -- tests/e2e/inventory.spec.ts --grep 'all standalone categories' --max-failures=1` — 1 visible Chrome pass/42.3s using the guarded isolated stack. `npm.cmd run test:chrome -- tests/e2e/projects-reference.spec.ts --grep 'eight real synthetic photos' --max-failures=1` — 1 visible Chrome pass/1.2m after the fifth-category assertion update. Synthetic desktop/mobile captures inspected. Publication/hosted CI evidence follows in the [D40 ledger](03-planning/commercial-properties-2026-10-19.md).

Full backend attempt: 241 passed/3 failed (two ClamAV-unavailable tests, one pre-existing 0027 metadata drift); after starting the pinned healthy ClamAV, the two file cases pass. A second run excluding only the first drift assertion reaches 556 passed/3 failed/1 deselected before `--maxfail=3`; all three failures are the same 0027 `alembic check` drift. Neither run is a full pass. The first exact-commit manual GitHub integration run was cancelled after an additional browser assertion needed alignment with the fifth category; rerun on the final commit, not counted as passed.

Follow-up on the commercial PR: mapped the already-migrated 0027 Lead/Deal archive columns, foreign keys, checks and indexes in ORM metadata. Explicit test environment `-m alembic check` now reports no operations; Ruff check/format and mypy pass. The first `-m pytest --cov=app -q --tb=short -x` attempt reached 186 pass/1 fail because the project ClamAV container was stopped; after `docker compose -f backend/compose.clamav.yaml up -d` reported healthy, the same complete suite passed 843/843 in 1138.10 s with 94% coverage. Frontend lint, typecheck, build and 72/72 units pass. Hosted exact-head regression and publication remain separate gates.

## Combined CRM regression/publication (2026-10-18)

The [complete chronological ledger](03-planning/full-regression-publication-2026-10-18.md)
retains failed attempts, corrections and actual boundaries. Initial latency
failures are preserved below; the owner-directed repair subsequently passes the
unchanged load gate. Final source still requires full exact-head regressions;
actual hosted outcomes are recorded in [PR15](https://github.com/hive-vault-arc/Kay-crm/pull/15).

| Location | Actual command/check | Result |
|---|---|---|
| backend | `.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3 --cov=app --cov-report=term:skip-covered` |820 passed18m11s,94% coverage before final count-query optimization; real PostgreSQL/ClamAV/recovery, serial lease |
| backend | `.venv/Scripts/python.exe -m pytest -q --tb=short tests/test_lead_counts.py tests/test_contacts.py tests/test_lead_conversion.py tests/test_benchmark_qualification.py tests/test_benchmark_totals.py tests/test_unit_selection.py --maxfail=2` |67 passed60.64s after optimization; scoped total/status/filter/conversion and exact legacy/current benchmark distributions |
| backend | explicit venv `-m ruff check .`, `-m ruff format --check .`, `-m mypy app`, `-m tests.unit_runner` |Pass;328 formatted files/186 typed application files;234 units,602 DB-gated tests deliberately deselected; unit subset is not additive to full-suite counts |
| frontend | `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run build` |Pass;71 units; production build after filter-hook fix;45 semantic icons/319 buttons,0 guard violations |
| frontend | compiled `playwright.acceptance.config.ts`, complete batches and affected reruns |169 distinct passing variants:112 Chrome and19 each Edge/mobile Chromium/mobile WebKit; initial matrix was not green, intermittent startup/WebKit observations remain disclosed |
| frontend | compiled `playwright.final-chrome.config.ts`, affected rerun; supplemental `tests/review/iconsax.chrome.spec.ts` |4 native final cases and3 Iconsax cases pass; actual200% zoom, touch, keyboard, synthetic recovery and visual inspection |
| frontend | `npm.cmd run test:e2e -- --project=chrome --grep 'live shadcn/RHF/Zod/table' --max-failures=1` |Development-only component case1/1 pass48.6s |
| backend | Initial guarded benchmark `APP_ENVIRONMENT=benchmark`; explicit venv `-m alembic upgrade head`, `-m benchmarks.plans`, `-m benchmarks.run` |Benchmark-only upgrade0022→0026, unchanged100/200000/20000 counts;18 plans; pre-repair3924 completed/0 failures/62.553s but p95 ordinary max2117.471ms/dashboard3340.722ms: FAIL retained, limits1000/2000ms unchanged |
| backend | Owner-directed repair: `.venv/Scripts/python.exe -m pytest -q --tb=short tests/test_reports.py tests/test_report_edges.py tests/test_lead_counts.py tests/test_contacts.py --maxfail=2` |49 passed61.80s; includes3 new populated/private role cases requiring one metric SQL statement and exact dashboard/drill parity, decimal correction and concurrent transfer |
| backend | Repaired `APP_ENVIRONMENT=benchmark`; `.venv/Scripts/python.exe -m benchmarks.run`, independent full-volume runs |6964/6575/7026 completed,0 measured failures,100 users/4 workers/>60s; latest p95 ordinary max322.455ms/dashboard574.745ms PASS. Intermediate97-user setup failure retained with new diagnostics, never counted as a measured pass; no retries/target/timeout/pool relaxation |
| frontend | compiled acceptance config, Chrome `project-permissions.spec.ts --repeat-each=3 --max-failures=2` |6/6 pass2.9m; actual PATCH200/persisted name/briefing added after baseline hosted programme-label failure; cause not claimed fixed, full exact-head hosted browser pass still required |
| root/frontend | repository/index/private-value checks, redacted staged/full-history Gitleaks, actionlint, repository-only sprint validator; bundle scanner and sanitized report audit |8404 indexed/0 forbidden/7 known private values/0 matches;1195 links/22 sprints/41 AT/13 Mermaid/12 JSON valid;586 JS/0 configured secrets;0 detailed input-bearing report steps |

Baselinebc686c1 automatic CI passes; manual backend836 passed737.60s but browser
75 passed/1 failed/39 not run17.8m. Complete local839-test regression is running
after the performance repair. New automatic CI and manual disposable database/
browser integration must run on the final published head; their eventual results
belong in the live PR. No main merge or remote migration is claimed by this
checkpoint. Existing npm
runtime audit is clean;9 inherited development-only findings retain the approved
expiring exception, not a clean full audit. No physical-device/human approval.

## Projects photo directory reference (2026-10-18)

D39's [scoped ledger](03-planning/projects-reference-refresh.md) records the
supplied-image comparison, test-only generated assets, actual failures and
completion audit. No migration, real inventory seed, commit or push.

| Location | Actual command/check | Result |
|---|---|---|
| backend | `.venv/Scripts/python.exe -m pytest tests/test_property_facets.py tests/test_inventory.py tests/test_inventory_edges.py tests/test_project_permissions.py -q --tb=short` |51 passed66.51s; serial exclusive isolated lease |
| backend | scoped Ruff on inventory contracts/queries/router and new facet test; `.venv/Scripts/python.exe -m mypy app/inventory` |Pass;24 typed files |
| frontend | `npm.cmd run test:unit`; `npm.cmd run lint`; `KAY_UI_CHECKS=1 npm.cmd run build` |66 units; lint/types/build pass; separate.next-e2e preserves live.next |
| frontend | `PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome -- tests/e2e/projects-reference.spec.ts tests/e2e/inventory.spec.ts --workers=1 --max-failures=1` |9 passed3.3m;7 existing inventory cases and2 Projects cases, including actual uploads/ClamAV/permits, owner privacy, campaigns, touch/native200%, outage/retry and expired authority |
| frontend | `npm.cmd run test:chrome -- tests/e2e/projects-reference.spec.ts tests/e2e/filter-rail.spec.ts --grep 'projects reference\|projects campaigns\|directory filters:' --workers=1 --max-failures=1` |Shared directory rail case passes; new all-categories-clear case exposed a loading race, fixed and rerun separately; failed attempt retained in ledger |
| root | one `impeccable.cmd detect --json` over five changed UI targets |[]; AFTER032 and main-agent source/visual review, no human approval implied |
| backend | `.venv/Scripts/python.exe -m benchmarks.catalog` |126 paths/159 operations; API catalogue schema hash updated |

The SP08 mixed-hierarchy/reused-template Chrome case also passes17.4s. Final
post-correction confirmation, privacy and cleanup results follow in the ledger;
these scoped checks do not claim full-product or all-browser certification.

Final `tests/e2e/projects-reference.spec.ts --workers=1 --max-failures=1`
passes2/2 in1.4m after the category loading correction and independent photo
capture session.11 distinct cases pass across the recorded runs, not one final
11-case invocation. Final bundle scan4 roots/577 JS/0 configured secret matches;
report2 JSON/2 empty result arrays/0 detailed. Guarded isolated users/business/
file/job/notification counts0; worker stopped, temporary ClamAV stopped with its
volume preserved. CA-verified3100/8100 return200. No push.

## Calendar reference and Iconsax visit types (2026-10-18)

D38's [scoped ledger](03-planning/calendar-reference-refresh.md) records the
reference comparison, exact facets, synthetic cleanup and retained failures.
No schema migration, real development seed, commit or push.

| Location | Actual command/check | Result |
|---|---|---|
| backend | `.venv/Scripts/python.exe -m pytest tests/test_calendar_filters.py tests/test_schedule.py tests/test_schedule_edges.py tests/test_schedule_http.py -q --tb=short` |40 passed51.52s; serial exclusive isolated lease |
| backend | `.venv/Scripts/python.exe -m ruff check app/schedule tests/test_calendar_filters.py`; `.venv/Scripts/python.exe -m mypy app/schedule` |Pass;11 typed files |
| frontend | `npm.cmd run test:unit`; lint; typecheck; `KAY_UI_CHECKS=1 npm.cmd run build` |61 units/all gates pass; build uses separate.next-e2e |
| frontend | `PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts tests/e2e/schedule.spec.ts --workers=1 --max-failures=1` |6 passed3.1m; real facets/views, all booking lifecycles, capacity/lunch/overlap, copied-ID/role denial, metadata-free busy, interrupted retry |
| frontend | `npm.cmd run test:chrome -- tests/e2e/calendar-reference.spec.ts tests/e2e/filter-rail.spec.ts --grep 'calendar\|lead filter rail' --workers=1 --max-failures=1` |4 passed1.6m; reference/touch/native200%, outage/retry, overlap/overnight, incumbent filter validation/focus/agent privacy |
| root | `impeccable.cmd detect --json` on seven changed calendar/shared/shell/CSS files |[]; one invocation, AFTER031 |
| backend | `.venv/Scripts/python.exe -m benchmarks.catalog` |126 paths/159 operations, schema hash refreshed in API catalogue |

Final lint/build after the optional-status focus correction pass. The client
scan checks4 roots/561 JS with0 configured facade/signing-secret occurrences.
Final confirmation/privacy/cleanup are recorded in the ledger; human visual
review and full-product/all-browser certification remain separate.

Final `tests/e2e/calendar-reference.spec.ts --workers=1 --max-failures=1` passes
3/3 in1.3m, including optional-status keyboard focus and every added toolbar
action. Together with four booking and one incumbent rail case,8 distinct headed
checks pass. The prior route-heading expectation failure is retained in the
ledger. Final privacy report2 JSON/3 empty result arrays/0 detailed; isolated
rows0 after cleanup, only.last-run.json, no profiles/traces/videos. CA-verified
3100/8100 return200;8000 remains untouched. Dependency check0 runtime/9 inherited
dev-only findings under the existing expiring exception. No push.

## Staff setup and deletion (2026-10-18)

The [scoped ledger](03-planning/staff-onboarding-deletion.md) records D37 and
preserved early failures. No commit/push. Both owner-approved local migrations
0025 and0026 preserve original-row fingerprints across69 tables; no real user
was deleted. Port8000 remains unrelated and untouched.

| Location | Actual command/check | Result |
|---|---|---|
| backend | `.venv/Scripts/python.exe -m pytest tests/test_staff_deletion.py tests/test_users.py tests/test_auth.py tests/test_first_admin.py -q --tb=short` |51 passed55.37s |
| backend | `.venv/Scripts/python.exe -m pytest tests/test_scoped_activities.py tests/test_ownership.py tests/test_isolation_migrations.py tests/test_discovery_http_migration.py -q --tb=short` |46 passed96.43s |
| backend | scoped Ruff; mypy app/identity app/discovery/audit.py | Pass;12 typed files |
| frontend | `npm.cmd run test:unit`; lint; typecheck; `KAY_UI_CHECKS=1 npm.cmd run build` |56 units and all gates pass; separate.next-e2e preserves running dev.next |
| frontend | `PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome -- tests/e2e/users.spec.ts tests/review/users.chrome.spec.ts --workers=1 --max-failures=2` |7/7 headed Chrome in3.0m; serial isolated stack |
| frontend | `npm.cmd run security:check` |0 runtime vulnerabilities;9 inherited dev-only findings under approved exception, not a clean full audit |
| frontend | `node scripts/scan-client-secrets.mjs`; `powershell -NoProfile -File scripts/audit-report.ps1` | Initial final-stack scan4 roots/549 JS/0 matches; seven-case report3 JSON/7 empty arrays/0 detailed |
| root | `impeccable.cmd detect --json` on four changed user components |[]; one invocation |

Final `tests/review/users.chrome.spec.ts --workers=1 --max-failures=1` confirmation
passes2/2 in52.3s after stale-copy/capture corrections. Lint/separate build pass;
final privacy scan remains549 JS/0 matches and report2 JSON/2 empty step arrays/
0 detailed arrays. Root validator passes1286 local links and diff whitespace
checks pass. Isolated synthetic rows are cleaned; CA-verified3100/8100 return200.
AFTER030 has no new aesthetic-only finding. This is scoped technical acceptance,
not a full-product aggregate or human design approval.

## Scoped Lead/Deal activities (2026-10-18)

[Scope, complete commands, failures and limits](03-planning/lead-deal-activities.md).
From backend, explicit `.venv/Scripts/python.exe`, test environment and serial
isolated lease: `-m pytest tests/test_scoped_activities.py -q --tb=short` passes
22/22 in35.41s. The conversion/qualification-history/ownership/isolation-migration/
reports command in the ledger passes55/55 in94.40s.77 distinct scoped PostgreSQL
cases, not a complete backend aggregate. Scoped Ruff and mypy7 files pass.

Frontend `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run test:unit`
(53/53) and `KAY_UI_CHECKS=1 npm.cmd run build` pass. On the real running3100/
8100 stack, `PLAYWRIGHT_BASE_URL=https://localhost:3100 npm.cmd run test:chrome --
tests/e2e/scoped-activities.spec.ts tests/e2e/record-facts.spec.ts --grep
'activities:|native 200%'` passes4/4 in1.2m. Literal PowerShell environment
assignments must be separate commands, not prefixed shell-style syntax.
Six320–1600px settled geometries give minimum sampled contrast5.6407:1,44px
measured controls, no page overflow; native200% zoom, touch/keyboard/scroll pass.

Corrected four-target detector exits0 with[]; first wrong-prefix path invocation
inspected nothing and is not counted. Client scan4 roots/540 JS/0 secret matches;
report3 JSON/4 empty result arrays/0 detailed arrays. Existing user frontend
and restarted isolated supervisor remain;8000 untouched. Local development
revision0024 has not been upgraded without the pending explicit approval.

Final `docs/03-planning/validate-sprints.ps1` exits0:22 sprints/1284 local links/
41 acceptance mappings/13 diagrams/12 valid API examples. Scoped diff checks
pass. Read-only ORM-mapped isolated counts confirm0 users/contacts/enquiries/
deals/timeline entries after normal fixture teardown. No full-suite or human
acceptance claim is inferred from these scoped results.

## CRM reference fidelity correction (2026-10-18)

The owner rejected the preceding visual refinement; its technical checks are
historical, not screenshot acceptance. [Current ledger](03-planning/crm-reference-fidelity.md).
The latest production build passes, lint passes (43 icons/42 consumers/153 sites;
309 buttons/99 files;0 violations), and unit tests pass49/49. The client scan
passes:4 roots/503 browser JS/0 configured facade or signing-key occurrences.
The documentation validator passes22 sprints/1283 links/41 acceptance mappings/
13 diagrams/12 API examples. One bounded14-target detector run exits0 with `[]`.
The latest compiled headed Chrome reference case passes1/1 (33.0s); all four
1600px surfaces and all six mobile surface/filter captures were opened. Real
filters, current-page selection, follow-up creation and320–1600px geometry/
contrast pass. The broad final25-case run passes24/25 in9.8m; the lone failure
measures Radix's hidden16px checkbox input instead of its clickable44px label.
The assertion now measures both through that label, without removing containment
or44px checks; the full filter suite rerun passes2/2 in1.5m. All25 distinct
selected cases have passing final-source evidence, not one all-green25-case run.
Both record tests pass, including native200% zoom, and all5 shell cases pass.
Final build uses the existing separate `.next-e2e` output with `KAY_UI_CHECKS=1`
while the owner runs development mode on3100. Final privacy:4 roots/531 JS/0
configured secret matches;2 report JSON/2 empty result arrays/0 detailed arrays;
only `.last-run.json` remains in test-results. [AFTER028](../anti-slop/audit-028-2026-10-18.md)
has0 new aesthetic-only findings. No full-product or human acceptance claim.

## Lead/Deal screenshot refinement (2026-10-18)

[Scoped evidence and retained first-run failure](03-planning/leads-deals-interface-refresh.md#owner-screenshot-refinement-2026-10-18).
`npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` and
`npm.cmd run test:unit` pass (49/49). Visible installed Chrome, serial on the
isolated lease: `tests/e2e/record-facts.spec.ts` 2/2, including actual200% zoom
and geometry through1600px; `tests/e2e/filter-rail.spec.ts` 2/2 on the final
rerun, including scoped requests, mobile/keyboard/touch and314px Lead/Deal rails
at1600px. The first full filter run had one breakpoint focus failure; the
isolated rerun and subsequent full rerun passed. One seven-target Impeccable
detector invocation exits0 with `[]`; [AFTER027](../anti-slop/audit-027-2026-10-18.md)
records0 new aesthetic-only findings. This is scoped browser evidence, not the
complete CRM, cross-browser or product-acceptance gate. Sprint/documentation
validation passes (22 sprints,1280 local links/anchors,41 mappings,13 diagrams,
12 API examples). The scoped diff check is clean; whole-tree `git diff --check`
still flags two trailing-space lines in `decisions.md`, outside this refinement.

## Riviera shared branding (2026-10-18)

[Scope and current verification ledger](04-design/riviera-execution.md).
Frontend `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:unit`
(49/49) and `npm.cmd run build` pass. Headed Chrome Riviera route verification
passes1/1 across17 routes at1440/360; shell verification passes5/5, including
keyboard sidebar collapse/reopen and mobile navigation. One detector run exits0
with `[]`; AFTER026 has0 new numbered findings. The first route run exposed a
measurement race before the chart ResizeObserver settled; the helper was corrected
and the full route check passed. See the ledger for screenshots, scope and limits.

Additional isolated compiled-Chrome reruns give passing evidence for12 distinct
targeted Riviera/action/performance/account/list/header cases, including actual
200% zoom. These are scoped successful reruns, not one all-green full-CRM suite.
Final normal build, lint, typecheck and49 units passed; client scan checked500
browser JS files with0 configured secret matches. The ledger retains earlier
failures, test synchronization/profile-path repairs and unexecuted suite limits.

## Lead/Deal frontend interface refinement (2026-10-17)

[Eight-surface scope and current evidence](03-planning/leads-deals-interface-refresh.md).
New frontend-only request, with explicit create/edit scope. Earlier backend/
qualification results below are historical, not rerun or claimed for this slice.

- Frontend `npm.cmd run lint`, direct `tsc.cmd --noEmit --incremental false`,
  `npm.cmd run build`, and `npm.cmd run test:unit`: pass,45/45 units. Icons:
  43 exports/37 consumers/151 sites/0 violations. Buttons:296/96 files/0 violations.
- With scoped/restored `KAY_E2E_PRODUCTION=1`, visible installed Chrome runs
  existing qualification, filter-rail, record-facts, leads, deals,
  list-header-actions and project-interest specs:20/20 passed in6.6m. It retains
  actual200% zoom, touch/keyboard,320–1920 geometry, scoped denial, draft/conflict
  recovery and exact real commands. Opt-in captures use interface group/round2.
- Same production-style two qualification specs on `edge`, `firefox`, `webkit`,
  serial with capture disabled:6/6 passed in1.9m. This is a cross-browser spot
  check, not a claim of the complete20-case matrix on every browser.
- Final opened evidence:36 files, all eight surfaces at390/1440/1920, plus
  desktop/mobile full-page companions for records/forms. Builder used two visual
  rounds and one nested-container correction batch. One15-target Impeccable
  detector run exits0 with `[]`. Fresh no-history role-equivalent review: `ship`
  for the full eight-surface scope; a fresh role-equivalent documenter completes
  the incumbent-system comparison, sampling12 final frames across all eight
  surfaces and3 V3 originals. Both handoffs are recorded in the scoped ledger.
- Client privacy scan:4 roots/416 JS/0 configured facade or signing-secret
  matches.20-case report audit:9 JSON/20 empty step arrays/0 detailed arrays.
  Final6-case report:3 JSON/6 empty step arrays/0 detailed arrays; only
  `.last-run.json`,0 retained profile/zoom directories and0 isolated-test
  listeners on3100/8100/8101/8001.
  Repository check:8250 indexed/0 forbidden or oversized/14 ignore probes.
  Docs check:22 specs/1266 links/41 mappings/13 Mermaid pairs/12 JSON,pass.

No populated-development database write/reset, backend source change, dependency,
commit, push or deployment is performed for this interface request. Synthetic
tests use the existing exclusive isolated lease and explicit backend/.venv.

## Lead/Deal reference alignment (2026-10-17, local verification complete)

[Current requirements, retained failures and evidence](03-planning/leads-deals-immoworld-alignment.md).
Only synthetic isolated data; backend commands use backend/.venv explicitly.

Final full backend command is terminal, exit0:775 passed975.95s (16:15),94%
configured application coverage (9115 statements/592 missed; CLI modules remain
excluded by the existing coverage configuration). All132 distinct broad Chrome
cases and12 cross-browser core journeys have passing evidence through the retained
runs, plus the separate dev-only1/1 and current stronger installed-Chrome1/1.
No single all-green broad-browser invocation is fabricated.

Final static checks pass:Ruff317 files, mypy182 modules, pip check, frontend
lint/direct TypeScript and45 units. Dependency audit:0 runtime vulnerabilities;
9 existing dev-only findings use the approved exception expiring2026-11-15.
Post-run privacy:4 client roots/395 JS/0 configured facade or signing-secret
matches; latest report2 JSON/1 empty step array/0 detailed arrays;0 retained
zoom/profile directories and0 listeners on3100/8100/8101/8001. A guarded READ ONLY
test-target inspection finds head0024 and0 users/contacts/leads/deals/jobs/outbox.
Reference comparison and the requirement-by-requirement source/layout audit are
complete. No real-data migration, publication, deployment or new load claim.

### Retained execution checkpoints (historical)

Browser verification is now closed for this task's planned scope. Final installed
visible Chrome stronger Lead case passes1/1 in27.8s, in addition to132 distinct
broad Chrome cases,12 distinct cross-browser core journeys and the separate
development-only check through the documented runs. Latest report2 JSON/1 empty
step array/0 detailed arrays; no retained zoom/profile directories. The current
complete backend command is running serially:
`backend/.venv/Scripts/python.exe -m pytest -q --tb=short --maxfail=3 --cov=app
--cov-report=term:skip-covered` (from backend/, executable `.venv/Scripts/python.exe`).
Its result and final requirement/security/artifact audit are still open.

Current browser closure:stronger Lead case passes3/3 Chromium/Edge/Firefox in1.1m
and3/3 repeated WebKit in1.1m; unchanged manual/catalogue cases passed on all4
profiles in the earlier12-case command. Thus all12 distinct cross-browser cases
have current passing evidence, not a clean first invocation. Dev-only shadcn/RHF/
Zod/table loading/empty/invalid/error/recovery passes1/1 in45.9s. Both reports
audit2 JSON entries,3/1 step arrays respectively,0 detailed arrays. A final native
Chrome run of the strengthened Lead case is live before the full backend aggregate.
Docs22 specs/1167 links/41 mappings/13 Mermaid pairs/12 JSON, repository8250/0/14
and diff checks pass. Final backend and requirement/artifact audit remain open.

Current WebKit Lead case passes3 serial repetitions in1.1m after strengthening
visible readiness:loaded record/profile, enabled programme chooser before Escape/
mode change, and exact derived deal heading/settled panels before leaving. Every
page error remains a failure. Diagnostics correlated transport events with cancelled
background requests; simple caught HTTP/HTTPS/stream abort probes did not reproduce,
so no general browser root-cause/CORS claim. No app change. Latest report2 JSON/
3 step arrays/0 detailed arrays; fresh lint/direct types pass. The stronger Lead
case is running on Chromium/Edge/Firefox; dev-only/backend aggregate/final audit
remain. Earlier one-off successful rerun was not accepted as an established fix.

Cross-browser command is terminal11 passed/1 failed3.4m. All business assertions
pass, but WebKit Lead reports one opaque page error. Its handler now records
only safe exception name/React code/ID-redacted route, still failing on every
page error. No app change or ignored-error filter. The isolated WebKit rerun
passes1/1 in32.8s; a3-repeat serial diagnostic is live. Initial report4 JSON/
12 step arrays/0 detailed arrays; single rerun2 JSON/1 array/0 detailed arrays.
Do not claim a known root cause or a clean first12-case invocation.

Current broad Chrome coverage is complete across the recorded continuation chain:
57+19+33+8+13+2 distinct cases=132, not a single all-green invocation. The final
2-case native File/Work command passes2/2 in2.8m. It retains real scan/recovery/
EICAR/bytes/private denial and task/inbox/retry/roles/touch/200% with corrected
modal/colour measurement helpers. Report3 JSON/2 step arrays/0 detailed arrays;
zero retained zoom/profile directories. Expanded actual1/2/3 project persistence/
replay/order/history test passes3/3 in3.63s. The12 compiled core journeys across
Chromium/Edge/Firefox/WebKit are now running serially. Development-only, current
full backend aggregate and final audit remain open; no deployment is claimed.

Latest4-case command is terminal2 passed/2 failed4.0m. Both extra cases pass.
Real scanner lease recovery now completes; the File case instead reaches its
archive-modal capture, whose guard incorrectly demanded an unhidden background
notification button. It now includes the hidden shell marker without changing
Radix isolation or password guards. Work diagnostics prove the1.404 result came
from parsing OKLab/alpha as RGB; its sampler now resolves actual sRGB pixels and
composites ancestor backgrounds, retaining4.5:1. No app style changes. Lint/direct
types pass; report5 JSON/4 step arrays/0 detailed arrays. A normal2-case corrected
native run is active;130/132 broad cases remain proved until it succeeds.

Current terminal coverage: the15-case continuation ended13 passed/2 failed in
12.4m. Across the57+19+33+8+13 separately recorded passes,130 of132 broad cases
have passing evidence; native File retry and Work remain. Report audit13 JSON/
15 step arrays/0 detailed arrays. A normal4-case rerun includes both failures
and the extra current dashboard-zoom/private-derived-title cases. The two extras
pass; scanner's90-second lease recovery and Work element-level contrast diagnosis
are pending. Work retains4.5:1 and adds only non-text-bearing colour diagnostics.
The backend manual-deal persistence test now covers actual1/2/3 project commits
and replay/order/history; Ruff passes, but these expanded cases need execution.

Live15-case update: corrected login and native outcome (including API403) pass;
ownership, restored stack and reporting also pass. File retry still failed at30s.
Actual worker source explains its90-second fenced lease; the native test now
uses the existing E2e retry200-or409 protocol and120-second recovery bound,
without changing worker/fencing code. That correction needs a separate rerun.
Latest lint/direct types pass. Current client audit:4 roots/391 JS/1 configured
facade secret/0 matches/1 signing secret/0 matches. The current writer is live.

Latest23-case continuation is terminal8 passed/3 failed/12 not run7.7m, exit1.
Deal native scan, Lead native lists/privacy and real200% login cleanup pass.
The retained failures now identify a5-second scanner-retry expectation, the
login page's additional Contact glyph, and the retired pre-D34 inventory banner.
Retry now allows the existing30-second real-scan bound; the icon inventory also
covers that page-level note. The outcome test proves the permitted agent edit
link while checking absent stock actions and a real403 for the manager-reviewed
external-outcome body. No application source/authority changes. Fresh lint/direct
types pass; report20 JSON/11 step arrays/0 detailed arrays. All3 failures plus12
never-run cases are selected in the normal15-case compiled continuation.

Fresh independent checks:45 frontend units pass; Ruff317 files, mypy182 modules,
pip check, docs22 specs/1167 links/41 mappings/13 Mermaid pairs/12 JSON samples,
repository8250 indexed files/0 forbidden/14 ignore probes and16 CI-policy units
pass. Dependency audit:0 runtime,9 existing dev-only findings under the approved
exception expiring2026-11-15; this is not a clean full audit.

Current continuation: the56-case process is terminal, exit1 with33 passed,
3 failed and20 not run in15.5m. Its report audit finds33 JSON entries/36 step
arrays/0 detailed arrays. Two native upload cases now explicitly start their
required worker after earlier recovery/discovery cases stop it; quarantine,
real scan verdict and byte checks remain. The login SSR/no-JavaScript inventory
now expects the owner-approved forward/development glyphs and checks every
rendered duplicate. Fresh lint/direct TypeScript passes. Read-only discovery
proves23 remaining cases (all3 failures plus20 never run); their normal guarded
compiled Chrome continuation is running. Earlier passes remain separate evidence.

Latest continuation:75-case command is terminal19 passed/3 failed/53 not run
10.5m; report privacy42 JSON/22 step arrays/0 detailed arrays. Its restored/report
title and semantic-selected-icon test corrections all pass in the live56-case
continuation (all3 failed plus53 never run), now5 passed/51 pending. Actual200%
Lead/Deal record facts passed17.5s and left zero disposable record-facts profiles;
the new mobile nine-state prospect capture is opened/inspected. The strengthened
private-derived-title case and dashboard zoom cleanup need extra reruns, followed
by cross-browser12 cases, the dev-only case and the current backend aggregate.

Current broad writer update: the132-case compiled command is terminal with
57 passed/3 failed/72 not run in17.9m. Its three test corrections (responsive
image-load wait, Provenance inventory mapping and actual rich-column defaults)
now all pass at the start of the75-case continuation. Read-only discovery proved
that continuation includes every collected failure and every never-run case.
It is still running;57 plus75 is coverage accounting, not a claimed single green
command. Test-owned persistent zoom profiles gain validated finally cleanup;
lint/direct TypeScript passes. The blocked manual cleanup was not retried, and
the old disposable profile is no longer present after normal harness startup.

Latest continuation: the full compiled Chrome process is terminal, exit1 with
39 passed/5 failed/88 not run in15.0m. Its corrected fixtures, restored technical
Provenance filter and bounded reflow assertion still require fresh browser runs.
The completion audit also corrects the prospect chart's old three-state omission
with exact pre-pagination `status_counts` for all states. Affected backend contact,
conversion and count tests pass43/43 in44.47s; fresh frontend lint/direct TypeScript
and45 unit tests pass. Build and browser results below are historical until the
new run is recorded; no complete browser pass is claimed.

Corrected focused compiled Chrome: the first11-case selection retained8 passes,
2 failures and1 not run; the corrected remaining3 cases pass3/3 in2.0m. This
covers service stop/restart+320–1440 reflow, actual nine-state pipeline counts,
and native signed intake with the390px mobile Provenance filter. Archive-count
extension passes1/1 in2.25s. Pure units217/555 deselected3.25s; Ruff317 files and
mypy182 modules pass. Report privacy4 JSON/3 step arrays/0 detailed arrays.
The full132-case compiled Chrome command is freshly running with max-failures3;
its result and separate development-only case remain pending.

- Backend `-m pytest --unit-only -q --tb=short --maxfail=1`:217 passed3.35s,
  554 cases deselected, not passed. `mypy.exe app`:182 source files pass.
- Frontend lint/typecheck,44 unit tests and production build pass after the
  reviewer correction batch; inventories43 icons/30 consumers/138 sites and
  296 buttons/96 files,0 violations.
- Compiled visible Chrome8-case qualification/lead/deal/native/filter/action
  selection:8 passed4.7m,0 skipped. Includes real200% DPR2→4/1427→713px,
  native touch/states/denied/private files and retained old/new profile history.
  The first broad attempt had5 passes/1 helper load-timing failure, then the
  complete corrected selection passed; no assertion was dropped.
- `npm.cmd run test:chrome -- e2e/project-interest.spec.ts --reporter=list
  --max-failures=1`, temporary `KAY_E2E_PRODUCTION=1`:1 passed29.2s. Real
  catalogue programme+standalone manual interests and standalone Lead conversion
  reuse exact parents/client and leave offering/reservation unset.
- Client scan:4 roots/391 JS/0 configured facade-secret matches/1 signing key/
  0 signing matches. Private report audit:4 JSON entries/4 step arrays/0 detailed
  arrays. Captures are opt-in, post-login synthetic and ignored.
- One Impeccable detector:exit0/JSON `[]`; fresh generic reviewer substitute
  scored3 specified fixes resolved, `ship` at that fix-list scope. Documentation
  handoff is complete. No second detector or unapproved aesthetic-only fix.

The documenter comparison is complete in
[the scoped system check](../.impeccable/leads-deals-system-check.md), with
pre-existing global DESIGN format/sidecar drift preserved. AFTER024 reports0
new numbered aesthetic-only findings and no audit-only source fix.

The complete backend run first stopped39 passed/1 scanner write-boundary
assertion failure, then171 passed/1 stale D34 hierarchy-permission expectation.
Exact protocol bytes/verdict guards and the already-approved project authority
are now tested without changing application permission or scanner code. The
focused development-edge/manual-deal command passes11/11 in28.41s. A pure
selector correction prevents slash-containing parameter values from hiding
reviewed units; current `-m pytest --unit-only -q --tb=short --maxfail=1` passes
217 in3.53s with552 deselected. Earlier196/565 is historical and does not mean
all565 deselections were integration tests. Six new selector regressions pass.

The next complete run stopped213 passed/3 failed in242.01s: a retired title
fixture and two populated-downgrade fixture assumptions. The corrected three
cases pass3/3 in26.14s. Historical migration fixtures now seed their old schema
before upgrade, preserving original fact/history and later workflow assertions.
A broader focused command passes13/14 in134.80s; its additive phone provenance
comparison is corrected on both snapshots. The complete769-case backend run is
executing and collected that test before the final comparison correction, so a
corrected affected rerun remains required. Backend Ruff315 files/mypy182 modules,
fresh frontend lint/typecheck/44 units and client/report privacy scans pass.
The generated API catalogue is125 paths/155 operations. Repository-only docs
validation passes22 specs/1167 links/41 mappings/13 Mermaid pairs/10 JSON examples;
git diff --check passes. Full acceptance remains open. No development/production
migration, reference modification, commit, push or hosted rollout.

Final backend result for the command above:768 passed/1 failed957.68s. The sole
failure was the import comparison collected before its final correction. The
corrected affected command (qualification migration, two new bounded generator
cases, conversion, qualification history, the failed import case and strengthened
real restore) passes30/30 in75.08s. Actual70-table recovery preserves the converted
Lead and refuses cleanup-flag detachment outside the test DB. Fresh pure units:
217 passed/554 deselected3.35s; Ruff/check/format316 files/mypy182 modules pass.
Fresh production build passes. The full-size benchmark was not rerun/reset.

Native Chrome discovery is now explicitly scoped to E2E/review specs, preventing
Node TLS units from being collected as browser tests. --list succeeds133 tests/
60 files. The complete compiled run is executing with132 selected, excluding only
the separately required development-only `live shadcn` case. Normal private/list/
HTML reporters remain enabled. No complete browser result is claimed yet.

## Agent project creation/editing (2026-10-17)

Backend explicit-venv `-m pytest tests/test_project_permissions.py
tests/test_inventory.py tests/test_inventory_edges.py tests/test_developments.py
-q --tb=short -x`: final53/53 passed,0 skipped,73.11s, isolated synthetic PG.
Ruff/check+format268 files and mypy178 modules pass; database-independent runner
154 passed/533 deselected/3.98s. Frontend lint/typecheck/build pass. Compiled
visible Chrome selection on project-permissions.spec.ts/inventory.spec.ts/
developments.spec.ts, grep `Project permissions:|SP08: mixed hierarchy|SP07
AT-06/08/27/31:`, passes4/4,0 skipped,2.3m. Initial3-pass/1-fixture422 run is
retained; fixture corrected without relaxing schemas.1440/390px screenshots
opened, no horizontal page overflow. No production connection, deployment or
push; full release integration matrix not executed/not passed for this change.
[Commands, permissions, security and limitations](06-delivery-and-operations/agent-project-permissions.md).

## Production server-only frontend facade (2026-10-16)

From `frontend/`: `npm.cmd run test:unit` passes 39/39, 0 skipped, 857.52ms final
run; `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd run build` pass.
An initial lint error rejected the test harness's variable name `module`; rename
to `loadedModule` resolves it without disabling any rule. The build uses unchanged
application source after that harness-only correction. Units compile actual
server TypeScript in memory and exercise local synthetic TLS plus config/auth
guards, without real API/database access. No DB/scanner service is started.

`node scripts/scan-client-secrets.mjs`: 4 roots/349 browser JS files/0 configured
facade or signing-secret occurrences. `npm.cmd run security:check`: runtime 0,
full 9 inherited dev-only packages under the same approved exception expiring
2026-11-15; no dependency or lock change and no clean-full-audit claim.
Hosted frontend quality now runs the 39 units, with unchanged required-job count
and manual integration policy. [Exact commands and limitations](06-delivery-and-operations/production-api-facade.md).
Complete database/browser integration is not executed/not passed for this patch,
and remains required on synthetic disposable targets before real customer data.

## Production private antivirus host (2026-10-16)

Backend `./scripts/kay.ps1 -Task check`: Ruff/format pass, 301 formatted files,
178 strict typed modules. Additional venv Ruff checks for the two Linux smoke
scripts pass. `.venv/Scripts/python.exe -m tests.unit_runner`: 154 passed,
513 deselected in 6.92s. Real database connections are refused before collection;
scanner tests deny real DNS/socket connections and use synthetic protocol peers.
Production API lifespan and worker configuration retain verified PostgreSQL TLS
and use the configured private ClamAV DNS hostname. Malformed inputs and DNS/
refusal/timeout/protocol failure paths pass without value-bearing diagnostics or
clean-on-failure fallback. [Scope and commands](06-delivery-and-operations/production-antivirus.md).

Linux automatic CI now supplies synthetic private scanner DNS to both managed
configuration probes. Hosted results must pass before protected-main promotion;
local units are not a hosted or real-scanner deployment pass. Complete manual DB,
browser and real-ClamAV integration is **not executed, not passed** for this patch,
and remains required before real customer data. No production connection.

## DigitalOcean public PostgreSQL CA (2026-10-16)

Bundled supplied public-only certificate, byte-identical SHA-256, with shared
pre-settings CA checks in both managed launchers. Backend `./scripts/kay.ps1
-Task check` passes Ruff/format/mypy178; both Linux probe scripts pass Ruff/
format. Venv `-m tests.unit_runner`:105 passed,503 deselected,0 skipped,3.58s.
Two non-root read-only/offline Linux probes resolve the exact intended CA path;
real API startup/live200/unavailable503/shutdown and worker configuration/engine
inspection pass, not real queue processing. Both launchers reject an invalid CA
before settings with exactly the safe variable/code diagnostic. Initial probe
import-path/HTTPError cleanup failures are corrected and retained in the record.
Final Linux probe reports no warnings/errors. Public-bundle redacted Gitleaks
scan0 findings; required-check policy8/8 and repository documentation checks pass.
No production connection, deployment, hosted CI, commit or push. Live API/worker
paths **not confirmed** without their console output. Full database/browser
release tests **not executed/not passed**, still required before customer data.
[Exact configuration, commands, evidence and limitations](06-delivery-and-operations/digitalocean-postgres-ca.md).

## Dashboard header-control removal (2026-10-16)

Frontend lint/typecheck/build pass with no reported warnings/errors. Compiled
headed Chrome selection on `dashboard-header.spec.ts` and `discovery.spec.ts`,
grep `Dashboard header:|SP19 AT22/24/29`, passes4/4,0 skipped,1.5m. Both circled
controls and empty action wrapper absent;320–1440px/native200% have no overflow.
Direct audit200, agent403, keyboard/touch Back and search/focus still pass; the
affected search/export/archive/audit regression passes. Captures inspected.
Current button inventory284 sites/94 files/0 violations. Test servers stopped;
no backend/CI edit, production access, commit or push. Separate full database
integration/release workflow not executed/not passed and still required before
real customer data.

## App-wide semantic action buttons (2026-10-16)

Frontend lint/typecheck/build pass with no reported warnings/errors. New
`npm.cmd run buttons:check` (also in lint) reports285 Button sites in95 files:
276 typed action mappings,5 existing icon buttons,4 explicit numeric/chart
exceptions,0 violations. Icons:43 exports/28 consumers/113 sites/3 chart roots
excluded/0 violations. Final compiled headed selection passes9/9,0 skipped,
4.2m.52 route-width checks on26 actual routes, primitive SSR/styled anchors,
mobile/touch/keyboard/native200%, real creation/proposal/stage/auth lifecycle,
recovery/denial and all43 glyphs/offline checks pass. Actual minimum normal-text
contrast5.536:1; controls44px; no horizontal overflow or unexpected main-review
console/page errors. Prior fixture/selector failures and the real Radix
composition/width corrections are retained in the evidence, not called passed.

Final additional import/Next-SSR selection passes2/2,0 skipped,1.0m: actual
import confirmation return/icon/focus, atomic commit/mapping and role denial;
real HTML before hydration, JavaScript-disabled rendering and authenticated
shell. Eleven focused cases pass across the two final selections. Final lint/
typecheck rerun passes; no runtime or backend change follows the final build.

This is local UI-only validation. The complete manual database integration/
release workflow is not executed or passed; it remains a pre-customer-data gate.
No backend/workflow edit, production access, commit, push or deployment.

## Lead/Deal Iconsax fact layout (2026-10-16)

Final frontend lint/typecheck/build pass,0 reported warnings/errors. Initial
compiled headed selection passes4 existing operation regressions, then fails1
new broad alert selector and leaves1 not run (1.9m). Main-scoped assertion fixes
the hidden Next route-announcer ambiguity; focused rerun passes2/2 (1.3m).
After the single summary-link alignment correction and rebuilt app, final
`record-facts.spec.ts` plus the exact-offering case from `deals.spec.ts` passes
3/3,0 skipped (1.7m). Seven distinct focused cases pass across those selections,
not a claimed complete suite.320–1440px, keyboard/touch, native200%, real
creation/edit/proposal/stage/retry/conflict and scoped denial are covered.
Actual normal-text contrast minimum6.045:1,44px controls,0 horizontal overflow
and0 unexpected page/console errors in the main layout case. Safe captures and
geometry stay ignored. No backend or CI edit, production test, commit or push.

## Performance dashboard: neutral KPIs, funnels and agent stacks (2026-10-16)

Final frontend lint/typecheck/build pass, no reported warnings/errors. Compiled
headed selection on performance-layout.spec.ts/reports.spec.ts/
review/reports.chrome.spec.ts/dashboard-header.spec.ts first passes6 with1
contrast-helper failure,3.6m. CSS Color4/alpha normalization fixes the diagnostic
without reducing4.5:1; one batched layout correction aligns funnel panels and
reduces contributor-chart whitespace. Final affected performance-layout.spec.ts
and review/reports.chrome.spec.ts rerun passes2/2,0 skipped,2.3m. Real API/table/
funnel/stack parity, eleven-contributor browser pagination, agent/private/finance
scope, dates and states, keyboard/touch,320–1440px and native200% pass.
Observed contrast minimum5.536:1,44px controls and0 unexpected page/console errors.
This is local UI-only evidence, not a full database release workflow result.

## Dashboard local-service widget removal (2026-10-16)

Frontend lint/typecheck/build pass with no reported warnings/errors. Compiled
headed Chrome selection of dashboard-header.spec.ts/integration.spec.ts/
review/chrome.spec.ts with grep
`Dashboard header:|SP-02: real HTTPS|AT-23: visible Chrome` passes5/5,0 skipped,
1.7m. Status/retry and automatic browser health probe removed; actual health
endpoint assertions and real API outage/restart/report recovery retained.
320–1440px, native200% zoom, keyboard/touch and agent/audit checks pass; actual
desktop/mobile captures opened. This UI change remains local, not pushed or
deployed, and is not a full release-suite result.

## Local dashboard city-header refinement (2026-10-16)

Frontend lint/typecheck/build pass with no reported warnings/errors. From
`frontend/`, `KAY_E2E_PRODUCTION=1 npm.cmd run test:chrome -- tests/e2e/dashboard-header.spec.ts --reporter=list --max-failures=1`
passes3/3,0 skipped,52.9s. Visible isolated Chrome checks320–1440px, image-edge
coverage,44px actions, keyboard/touch, audit/agent permissions, synthetic health
failure/recovery and native200% zoom. Actual captures opened. Final project
listeners/service processes0; shared PostgreSQL preserved. UI only, local and
unpublished; not a whole-product or release-suite result.

## Local login Iconsax refinement (2026-10-16)

Frontend lint, typecheck and production build pass. Compiled headed Chrome
selection on iconsax.chrome.spec.ts/auth.spec.ts/chrome.spec.ts with grep
`Iconsax:|Iconsax login:|AT-23/39: keyboard|AT-37/38 scoped|SP-03: visible login`
passes6/6,0 skipped,1.2m; zoom-only evidence correction rerun1/1 passes18.8s.
Current29-export SSR/no-JS/hydration/offline glyph checks, real auth/retry/password
change,320–1440 geometry, keyboard and native200% zoom pass. Screenshots opened,
calculated contrast recorded, test listeners/service processes0. No push,
deployment, backend changes or newly claimed whole-product verification.

## Pinned managed Python startup (2026-10-16)

The supplied import-time venv rejection is reproduced before repair. Final
explicit-venv runtime/serve/packaging/foundation selection32/32 passes10.33s;
Ruff check/format five changed Python files and strict mypy177 modules pass.
Real isolated Linux Uvicorn startup/liveness200/unavailable dependency503/graceful
shutdown passes locally and in the new required Linux CI job. Existing local
compiled headed Chrome HTTPS readiness/outage/restart integration passes1/1,
13.8s case/27.1s total, against the current unpublished UI and repaired backend.
No UI source change is part of this hotfix. Required PR run38889658338 passes
repository/frontend/Linux,529 backend tests,79 browser cases and the aggregate.
The separate push run's first attempt hit the existing Deal helper's5s navigation
predicate; that failure is retained, not attributed to a proven runtime defect.
Only its failed browser/aggregate jobs are rerun. GitHub subsequently reports the
successful PR aggregate as required; a normal protected squash merge publishes
`656bef6` through [PR9](https://github.com/hive-vault-arc/Kay-crm/pull/9), with no
admin bypass or policy/test change. Post-merge run38892622183 and the duplicate
push rerun remain in progress at handoff, not claimed as passes. This is not
observed DigitalOcean readiness. Local main/UI bases fast-forward to the merged
fix; uncommitted diff and untracked list compare exactly equal before/after.
[Published scope, exact commands, security and cloud configuration limits](06-delivery-and-operations/digitalocean-runtime-fix.md).
This shared register remains local with the unrelated uncommitted UI notes;
the standalone deployment record is included in the narrow hotfix publication.

## Left directory search/filter rails (2026-10-16)

Final frontend lint/typecheck/build pass, no lint/build warnings. Compiled isolated
headed Chrome selection passes7/7 in3.0m: two new rail cases plus five existing/
extended regressions. Five directories at320/360/768/1024/1279/1280/1440px;
actual filter requests, all existing selectors, drafts, selected-agent remount,
invalid feedback in view, focus trap/breakpoint transfer, roles, touch, table
scrolling,51-Lead/11-Deal pages and actual200% zoom. Initial fixture/route races,
focus correction and interrupted guessed-option test remain disclosed, not
counted as passes. Native review collects0 unexpected console/page errors.
Client scan4 roots/352 JS/0 configured-secret/signing-key occurrences. Exact
commands, five-view coverage, inspected captures and during-work antislop gate.
No full backend/browser matrix or deployment is inferred.
Final project service listeners/processes0; shared PostgreSQL and Codex execution
helpers preserved. Changes remain local/uncommitted/unpushed.

## Gold creation and compact list-header utilities (2026-10-16)

Final frontend `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`:
exit0, no warnings. First real compiled headed Chrome selection6/6 pass2.2m:
two new action/permission/touch cases, actual Lead and Deal creation/list
regressions, filtered CSV generation/download and native zoom. After the bounded
8px utility-padding adjustment, fresh affected confirmation3/3 pass1.4m, including
both list creation links at actual200% Chrome zoom. Counts overlap; this is not
nine independent cases or a new full backend/browser certification.

## Pure-black sidebar refinement (2026-10-16)

Only the shared sidebar surface token changes from charcoal to `#000000`;
desktop and mobile receive it together. Frontend lint/typecheck/build pass,
without warnings. Compiled headed Chrome account-footer cases plus the existing
native200% zoom review pass4/4 in1.1m. Five widths, long names, short drawer,
touch/keyboard logout, pending/failure/retry and exact black/retained selection
colors are verified; six fresh synthetic captures inspected. All other theme
values match HEAD structurally.

## Sidebar account footer refinement (2026-10-16)

Frontend `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd run build`
all exit0, without lint/build warnings. The compiled headed Chrome selection
passes13/13 in3.1m: three new account-footer cases plus ten existing shell/auth,
logout-race and native review cases, including actual200% zoom. This is focused
UI evidence, not a rerun of the whole backend/CRM matrix.
The settled-capture confirmation repeats the three new cases:3/3 pass51.4s;
subsequent lint/typecheck pass. Project service listeners/processes finish at0.

## Standard requirements and DigitalOcean detection metadata (2026-10-16)

The full pinned runtime list moves to `backend/requirements.txt` without changing
any dependency version/hash. The old `requirements.lock` is a hash-enforcing
compatibility include. Existing Python pin3.14.3 remains, and the lock generator
writes the conventional filename. Repository safety now requires its presence.
Recovery's code manifest additionally includes the canonical filename; its new
regression first fails for the missing path and passes after correction.
Focused packaging/Uvicorn checks: final10/10 passed2.61s; Ruff check/format4 files
and strict mypy177 modules pass. Both conventional/compatibility requirement
files pass pip's real hash-enforcing dry-run; the runtime audit via the compatibility
include finds no known vulnerabilities. A byte-for-byte comparison preserves
the former full lock's pins/hashes, changing only its generated output filename
comment. Full hosted CI/PR checks still determine main publication.
See [detection scope and runtime blockers](06-delivery-and-operations/digitalocean-detection.md).
No cloud detection/build/deployment success is inferred from local packaging tests.

## Direct Uvicorn and trusted development browser (2026-10-16)

This is a focused startup repair, not a new full-CRM certification. Source changes
were first verified locally on `fix/direct-uvicorn-local-startup`; the subsequent
authorized detection/publication request includes them through protected CI/PR.

| Command/check | Actual result |
|---|---|
| backend explicit-venv `uvicorn.exe app.main:app --reload` | Starts without the missing-attribute error; HTTP liveness200 |
| Same direct Uvicorn with SSL key/cert, custom Windows loop and no access log | HTTPS liveness200; actual StatReload shutdown/restart/startup verified |
| frontend `npm.cmd run dev` on3000 | Trusted Windows HTTPS login200; facade real PostgreSQL readiness200; direct API readiness without facade403 |
| backend explicit-venv `python.exe -m pytest tests/test_serve.py tests/test_foundation.py -q --tb=short --maxfail=1` | Final14/14 passed9.38s, serial after browser completion |
| backend Ruff check/format on main.py and test_serve.py; mypy app | Pass;2 formatted files/177 modules |
| frontend `npm.cmd run test:chrome -- tests/e2e/integration.spec.ts --max-failures=1` | Final1/1 passed28.7s total; real facade/outage/restart/HMR; conflicting NO_COLOR removed only within that test shell |
| frontend `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` | All exit0; dev server stopped before production build;27 icons/21 consumers/40 sites/0 violations |
| Windows default chain + visible Chrome and in-app browser | Known local CA explicitly approved/imported only to CurrentUser; real login form hydrated with no certificate bypass |

An attempted pytest overlap correctly refused the browser's existing isolated
lease before fixture writes; it is not counted as a pass. The final serial rerun
above passes. [Scope, commands and retained limitations](06-delivery-and-operations/local-startup-execution.md#direct-uvicorn-and-approved-currentuser-trust).

## GitHub CI preparation (2026-10-16)

Run from project root unless stated otherwise. Actual hosted runs and corrected
failures are in [CI execution](06-delivery-and-operations/github-ci-execution.md),
not inferred from a workflow file. Main requires the successful aggregate check.

| Command | Verified local result |
|---|---|
| `node .github/scripts/repository-check.mjs` |8181 indexed files/zero forbidden or oversized paths/13 ignore probes at c3e5909 |
| `node .github/scripts/check-tools.mjs gitleaks` |Full published history, zero leaks after narrow public-example review |
| `node .github/scripts/check-tools.mjs actionlint` |Pass |
| `node --test .github/scripts/dependency-policy.test.mjs` |8/8 pass, including fail-closed runtime/new/expiry cases |
| `npm run security:check` (frontend/) |Runtime0;9 existing dev-tool findings use the explicitly approved expiring exception |
| `.venv/Scripts/python.exe -m pytest tests/test_ci_setup.py -q --tb=short` (backend/) |6/6 pass1.78s |
| `npm run lint`, `npm run typecheck`, `npm run build` (frontend/) |Pass; fresh Ubuntu hosted frontend also passes |
| `.venv/Scripts/python.exe -m ruff check .`, `ruff format --check .`, `mypy app`, `pip check` (backend/) |Pass;288 formatted files/177 application modules/no broken requirements |
| `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1 -RepositoryOnly` |22 sprints/1127 repository links before final policy links/41 acceptance mappings/13 Mermaid pairs/10 JSON samples |

Backend current collection508; compiled Chromium79 cases. Counts are discovery,
not a pass until the hosted complete results are recorded. Earlier failed native
scanner setup/tests remain failures, not skipped or relabelled as accepted.

Final local corrections: CI setup/identity/observer15/15 passed1.22s; real
recovery test1/1 passed23.78s, retaining the fixed local identity guard. Compiled
Chromium focused export/retry/protected-files3/3 passed1.8m. Final private-value
index check8185 blobs/seven values/zero matches. Hosted complete outcomes are
published by the [required workflow](https://github.com/hive-vault-arc/Kay-crm/actions/workflows/ci.yml),
not inferred from these focused local results.

## Iconsax UI-only migration (2026-10-16)

[Coverage/license](reference/iconsax/migration.md) and
[actual execution ledger](reference/iconsax/execution.md). Final lint (including
`npm run icons:check`), typecheck and production build pass.18 unique headed
Chrome cases have passing evidence across corrected commands:initial16/17,
corrected3/3 (including2 overlapping icon tests), development1/1. Not a fresh
full cross-browser matrix.55 composition captures plus glyph fixture and2
development-state captures;0 unexpected composition errors/external icon
requests. SSR/no-JS/offline vector checks pass. The ledger retains the initial
false-positive assertion and exact reproducible commands, scope and cleanup.

## Approved V3 UI-only verification (2026-10-16)

These are fresh redesign checks, distinct from historical SP-22 results below.
Run npm from frontend/. Compiled checks temporarily set KAY_E2E_PRODUCTION=1,
restore the previous value and propagate the real exit code. The development-only
foundation case explicitly unsets that flag. Test writers remain serial under
the isolated test lease. Freeze frontend/src, public assets and manifests as
well as backend sources throughout backup/recovery checks.

| Boundary | Actual command | Result |
|---|---|---|
| Final frontend | npm run lint; npm run typecheck; npm run build | exit0; build n1_H8AryVi9k9f4trftmy |
| Route/context inventory | node scripts/ui-coverage.mjs |29 route files/168 form-tab-dialog-panel sites plus111 overlapping regions/disclosures in71 files; all mapped in coverage |
| Compiled native V3/deals/discovery | npm run test:chrome -- tests/review/v3.chrome.spec.ts tests/review/deals.chrome.spec.ts tests/review/discovery.chrome.spec.ts --max-failures=2 |4/4 pass3.4m on preceding geometry-identical build; later aria descriptions recaptured below |
| Remaining native workflows | npm run test:chrome -- tests/review/reports.chrome.spec.ts tests/review/schedule.chrome.spec.ts tests/review/finance.chrome.spec.ts tests/review/imports.chrome.spec.ts tests/review/intake.chrome.spec.ts tests/review/leads.chrome.spec.ts tests/review/inventory.chrome.spec.ts tests/e2e/integration.spec.ts --max-failures=2 |7/8 pass4.9m; obsolete inventory table assertion corrected, failure retained |
| Final V3/inventory rerun | npm run test:chrome -- tests/review/v3.chrome.spec.ts tests/review/inventory.chrome.spec.ts --grep 'nine compositions\|SP07 visible Chrome' --max-failures=1 |2/2 pass2.1m; all55 settled final frames,0 unexpected browser errors |
| Development-only shared/error boundary | npm run test:chrome -- tests/e2e/foundation.spec.ts --grep 'live shadcn' --max-failures=1 |1/1 pass23.5s; separate .next-e2e output |
| Corrected Chrome and shell | npm run test:e2e -- tests/e2e/leads.spec.ts tests/e2e/users.spec.ts tests/e2e/shell.spec.ts --config=playwright.acceptance.config.ts --project=chrome-final --grep 'international identities\|create, pending denial\|@shell' --max-failures=2 |5/6 pass1.3m; staff pending-read/reload race retained, then corrected below |
| Final staff lifecycle | npm run test:e2e -- tests/e2e/users.spec.ts --config=playwright.acceptance.config.ts --project=chrome-final --grep 'create, pending denial' --max-failures=1 |1/1 pass27.3s; original401/reload assertions retained |
| Remaining selected variants | npm run test:e2e -- --config=playwright.acceptance.config.ts --project=edge-final --project=mobile-chromium-final --project=mobile-webkit-final --grep $v3Remaining --max-failures=2 |47/47 pass18.3m; exact regex/list/reproduction in execution |
| Client privacy | node scripts/scan-client-secrets.mjs |4 roots/313 browser JS/0 configured facade/signing-secret occurrences |
| Report privacy | powershell -NoProfile -File scripts/audit-report.ps1 |20 JSON/47 empty step arrays/0 detailed input-bearing arrays |

13 unique native/integration/foundation cases pass across corrected commands,
not one clean invocation. Desktop/mobile touch, keyboard, actual200% zoom,
reduced motion and six widths are exercised. Lowest measured native text contrast
5.4997:1; controls at least44px; intentional named grid/table scroll does not
create page overflow. All9 reference PNG hashes and272 backend source hashes
match baseline;17 original forms retain87 field-site signatures.

The earlier full134-case attempt is50 passed/3 failed/81 not run and remains a
failed attempt. A focused77-case Chrome/Edge/mobile Chromium/mobile WebKit
selection plus corrected affected checks passes across commands:28 retained
passes, corrected Chrome Lead/staff,47 remaining variants, plus4 shell cases =81
unique passing variants. The failed selected attempt was28/3/46 not run; the
No pending result is counted as passed. Native Chrome is155.0.8059.79; no physical device, actual
Safari, fresh backend/load suite, production or human acceptance is claimed.
Nonfatal inherited Windows Proactor10054 shutdown warnings remain disclosed.

## SP-22 final local verified commands (2026-10-16)

[Live results and corrected attempts](03-planning/sprints/sp-22-execution.md),
[repeatable procedure](06-delivery-and-operations/local-final-acceptance.md).
Backend commands below run from backend/ with its explicit venv; npm from frontend/.
No pending browser/load result is included as passed.

Final result supersedes the initial records below without erasing failures.
All486 distinct backend cases and134 compiled browser variants have passing
evidence across complete/corrected/affected commands, not one clean invocation.
The explicit4-process100-user configuration passes; default1 did not.

| Final boundary | Actual command | Result |
|---|---|---|
| Affected permissions/current merge/reporting | .venv/Scripts/python.exe -m pytest -q --tb=line --maxfail=2 -k 'scope or private or transfer or merge or revok or collaborator or permission or attribution or role or current or denial or denied or test_report' |124 passed/358 deselected244.90s |
| Final aggregate correctness | .venv/Scripts/python.exe -m pytest tests/test_reports.py tests/test_report_edges.py -q --tb=line --maxfail=1 |14 passed21.22s |
| Bounded ordinary CLI workers | .venv/Scripts/python.exe -m pytest tests/test_serve.py -q --tb=line --maxfail=1 |4 passed1.91s; current collection486 |
| Final Python quality | .venv/Scripts/python.exe -m ruff check .; -m ruff format --check .; -m mypy app | exit0;281 files/177 modules |
| Final frontend | npm run lint; npm run typecheck; npm run build | exit0;h1B7-HZDzQ3xLkUBgLSC1 |
| Complete compiled matrix | KAY_E2E_PRODUCTION=1; npm run test:e2e -- --config=playwright.acceptance.config.ts --max-failures=3 |130 original business+4 focus variants pass across original/corrected commands; retained failures/stop counts in ledger |
| Final intake fix | npm run test:e2e -- tests/e2e/intake.spec.ts --config=playwright.acceptance.config.ts --project=chrome-final --project=mobile-webkit-final --max-failures=1 |2/2 pass1.4m on compiled app |
| Native review | npm run test:chrome -- tests/review/acceptance.chrome.spec.ts tests/review/chrome.spec.ts tests/review/intake.chrome.spec.ts --max-failures=2 |5/5 pass3.2m |
| Rebuilt shell/navigation | npm run test:chrome -- tests/review/acceptance.chrome.spec.ts tests/e2e/shell.spec.ts --grep 'SP22 visible final families\|French entry\|sheet keyboard' --max-failures=1 |3/3 pass1.1m |
| Development-only component | npm run test:e2e -- --project=chrome --grep 'live shadcn/RHF/Zod/table' --max-failures=1 |1/1 pass27.6s; KAY_E2E_PRODUCTION unset |
| Final-source restored native | npm run test:chrome -- tests/review/acceptance.chrome.spec.ts --grep 'visible recovered record' --max-failures=1 |1/1 pass1.2m; RPO3.774s/restore3.795s/incident→verified35.976s |
| Formal full-volume load | APP_ENVIRONMENT=benchmark; .venv/Scripts/python.exe -m benchmarks.run |4 API processes/100 users/6285 completed/0 errors/60.261s; ordinary p95max630.064ms/dashboard1314.907ms, exit0; two prior failures retained |
| Privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 |4 roots/285 JS/0 configured-secret matches; final2JSON/1 empty step array/0 detailed arrays |

All compiled/native commands set KAY_E2E_PRODUCTION=1 temporarily except the
explicit development case, restore its previous value and propagate the real
exit code. No physical iOS/Android/actual website/production approval. AFTER022
records inherited LOW1 visual-fidelity choice unselected; product review pending.
Development unchanged; isolated synthetic cleanup/shutdown and exact source
fingerprint are recorded in the execution ledger. No new lock/dependency version.

| Boundary | Actual command | Observed result |
|---|---|---|
| Complete backend | .venv/Scripts/python.exe -m pytest -q --tb=line --maxfail=3 --cov=app --cov-report=term:skip-covered | Initial479 passed/2 failed/1 teardown error in1003.47s; corrected below, not one clean complete invocation |
| Corrected migration, cumulative merge, current recovery | .venv/Scripts/python.exe -m pytest tests/test_discovery_http_migration.py tests/test_work_process_migration.py tests/test_final_acceptance.py tests/test_recovery.py -q --tb=line --maxfail=2 --cov=app --cov-append --cov-report=term:skip-covered | 23 passed/183.83s; zero skipped; then-current482 inventory passes across corrected runs; strengthened final merge/unknown-FK rerun2/2 in6.28s;4 later CLI cases recorded above |
| Python quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app | Exit0;280 formatted files/177 typed modules |
| Frontend locked install/build | npm ci; npm run lint; npm run typecheck; npm run build | Exit0;715 added/716 audited; build rbxR11v57oBt-naHtoypJ;9 inherited HIGH dev-tool entries |
| Fresh backend install | Fresh-copy .venv hashed requirements-dev.lock install, --no-deps --no-build-isolation editable install; pip check; .venv/Scripts/python.exe -m benchmarks.freshcheck | Exit0; no broken requirements; real fresh lifespan/live200/database ready200/anonymous ready403; no .env copied |
| Actual OpenAPI inventory | .venv/Scripts/python.exe -m benchmarks.catalog | Exit0;OpenAPI3.1.0/123 paths/153 operations; exact SHA256 and full catalogue linked in ledger |
| Documentation preclosure | powershell -NoProfile -File docs/03-planning/validate-sprints.ps1 (root) | Exit0;22 sprints/1204 links/41 AT mappings/13 Mermaid pairs/10 JSON examples; final rerun follows final documentation |

## SP-21 focused verified commands (2026-10-16)

Backend cwd backend/, explicit .venv; frontend cwd frontend/. Exact environment,
corrected attempts, timings and limits: [execution](03-planning/sprints/sp-21-execution.md).
Browser commands temporarily set KAY_E2E_PRODUCTION=1 and propagate npm exit codes.

| Boundary | Actual command | Final result |
|---|---|---|
| Recovery/foundation | .venv/Scripts/python.exe -m pytest tests/test_recovery.py tests/test_foundation.py -q --tb=line -x -s | 22 passed / 99.70s / zero skipped |
| Added real drain race | .venv/Scripts/python.exe -m pytest tests/test_recovery.py -k concurrent_pause -q --tb=line -x | 1 passed / 4.61s / 15 deliberately deselected; 23 distinct cases across commands |
| Python quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app | Exit0; 272 formatted files / 177 typed modules |
| Schema | .venv/Scripts/python.exe -m alembic check | No new operations; head0022 unchanged, no migration added |
| Frontend | npm run lint; npm run typecheck; npm run build | Exit0; build v91FEgd-yN7dS7wBB9-Hm, shipping UI unchanged |
| Compiled restored Chrome | npm run test:e2e -- tests/e2e/recovery.spec.ts --project=chrome --max-failures=1 | Final1/1, 1.1m case / 1.3m total |
| Visible native Chrome | npm run test:chrome -- tests/review/recovery.chrome.spec.ts --max-failures=1 | Final1/1, 1.1m case / 1.3m total; 11 inspected captures |
| Privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 | 4 roots / 285 JS / 0 configured-secret matches; 2 JSON / 0 detailed arrays |

Real PostgreSQL18.2 dump/restore, all69 table digests, files/scan states, old
sessions/permits/bootstrap denial, worker replay, current-authority and target
guards, maintenance interruption/concurrency and controlled-clock30-day expiry
pass. Final native point age4.072028s / incident-to-browser verification43.133s
at stated synthetic volume, not intended-volume/production/offsite certification.
Six widths320–1440, keyboard/native touch, min6.113:1, ≥44px controls, no overflow
or unexpected page/console errors. AFTER021 has0 new aesthetic findings; no UI
source edits/detector. Preserve prior valid unchanged zoom/motion evidence.
No new dependencies/audit/coverage/full-suite/five-browser claim. Windows teardown
WinError10054 callbacks remain disclosed. [Operator runbook](06-delivery-and-operations/local-backup-recovery.md).

## SP-20 focused verified commands

Cwd backend/ for explicit venv commands; frontend/ for npm/scripts. Versions:
Python3.14.3/FastAPI0.143.1/SQLAlchemy2.1.4/Alembic1.20.0/Ruff0.17.0/mypy1.20.2/
pytest9.1.1; Node24.13.1/npm11.8.0/Next16.4.0/React19.3.1/Playwright1.64.1,
native Chrome155.0.8059.79. [Execution/limits](03-planning/sprints/sp-20-execution.md).

| Boundary | Actual command | Result |
|---|---|---|
| Focused backend/API/PG/affected ownership | .venv/Scripts/python.exe -m pytest tests/test_intake.py tests/test_intake_process.py tests/test_intake_migration.py tests/test_ownership.py -k 'intake or same_scope_merge or collaboration_transfer or history_immutable' -q --tb=line -x |19 pass/10 deselected/0 skipped56.21s |
| Backend quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app |exit0;262 files/169 modules |
| Frontend full baseline | npm run lint; npm run typecheck; npm run build |exit0 |
| Final narrow F1 patch | npx eslint src/features/intake/website-form.tsx tests/review/intake-body.chrome.spec.ts --max-warnings=0; npm run typecheck; npm run build |exit0; shipping build pFQv5uidqUuJVIgkip1ty |
| Final compiled Chrome | npm run test:e2e -- tests/e2e/intake.spec.ts --project=chrome --max-failures=1 |1/1 pass28.8s/42.4total,0 skipped |
| Full native Chrome | npm run test:chrome -- tests/review/intake.chrome.spec.ts --max-failures=1 |1/1 pass45.5s/59.2total,0 skipped |
| Zoom evidence only | npm run test:chrome -- tests/review/intake-zoom.chrome.spec.ts --max-failures=1 |1/1 pass5.9s/18.5total; validated full frame |
| Real413 recovery | npm run test:chrome -- tests/review/intake-body.chrome.spec.ts --max-failures=1 |final1/1 pass24.5s/37.8total; named mobile evidence repaired and reopened |
| Development additive migration | .venv/Scripts/python.exe -m alembic upgrade head; .venv/Scripts/python.exe -m alembic check |guarded0021->0022/no drift, no reset;66 record tables0 rows/bootstrap unset |
| Privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 |4 roots/285JS,0 facade/signing matches;2JSON/1step array/0 detailed arrays |
| Ignore | guarded git check-ignore/git ls-files twelve exact paths |12 ignored/0 tracked |

Browser invocations temporarily set KAY_E2E_PRODUCTION=1 and restore it.
Current pytest selection includes populated migration, separate-connection races,
real worker kill/restart, signature/time/body/rate/replay and source provenance.
Full native covers six widths320–1440, actual200%,44px targets, minimum6.113:1,
keyboard/touch/states/denied; new F1 scenario uses actual413, not a mocked response.
No full CRM/five-browser/load/backup/coverage claim. No dependency/lock changes;
retain prior valid dependency-audit limits. Historical SP19 section below is
not a current claim that SP20 remains pending.

## SP-19 focused verified commands

Cwd backend/ for explicit .venv commands; cwd frontend/ for npm/scripts.
No dependency/lock change; versions actually read: Python3.14.3, FastAPI0.143.1,
SQLAlchemy2.1.4, Alembic1.20.0, Ruff0.17.0, mypy1.20.2, pytest9.1.1;
Node24.13.1/npm11.8.0, Next16.4.0/React19.3.1/Playwright1.64.1.
Native Chrome155.0.8059.79. Results are scoped SP-19, not fullCRM.

| Boundary | Actual command | Actual result |
|---|---|---|
| Focused backend/affected cases | .venv/Scripts/python.exe -m pytest tests/test_discovery.py tests/test_discovery_http_migration.py tests/test_discovery_plans.py tests/test_contacts.py tests/test_ownership.py tests/test_developments.py -k 'discovery or scoped_filters or archive_restore or restore_repairs' -q --tb=short -x -s |27 passed37.76s/51 deliberately deselected/0 skipped |
| Positive deal/document scope | .venv/Scripts/python.exe -m pytest tests/test_discovery.py -k deal_and_deal_document -q --tb=short -x |1 passed2.03s/20 deselected |
| Closed-input retention guard | .venv/Scripts/python.exe -m pytest tests/test_discovery_http_migration.py -k retention_cli -q --tb=short -x |1 passed3.48s/2 deselected; no purge opened/no traceback |
| Backend quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app |all exit0;246 formatted files/157 typed modules |
| Frontend | npm run lint; npm run typecheck; npm run build |all exit0; build dmDV0B-5rTHNPUklvY25E |
| Final compiled Chrome | npm run test:e2e -- tests/e2e/discovery.spec.ts --project=chrome --max-failures=1 |2/2 passed44.7s,0 skipped; same-key loss retry and later explicit fresh export |
| Final visible Chrome | npm run test:chrome -- tests/review/discovery.chrome.spec.ts --max-failures=1 |1/1 passed29.0s/39.6s total,0 skipped; interrupted download actual retry, scopes/lifecycle/audit/states/keyboard/touch/zoom |
| Isolated migration | .venv/Scripts/python.exe -m alembic upgrade head; .venv/Scripts/python.exe -m alembic check |populated0019 preservation/downgrade refusal tests; final0021/no drift |
| Development migration | same Alembic commands after exact identity/head guard |additive0019→0021, OID109060, no reset;67 tables/64 record tables0 rows/bootstrap unset/default schedule |
| Client/report privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 |4 roots/284 JS/0 configured-secret matches;2 JSON/2 step arrays/0 detailed arrays |
| Ignore boundary | guarded git check-ignore/git ls-files ten-path probe |10 ignored/0 tracked |

29 distinct backend cases are established across the27+1+1 commands, not claimed
as a single29-case invocation. Built browser commands temporarily set
KAY_E2E_PRODUCTION=1 and restore its prior value. Two main visual batches,
16 final original+2 canonical images individually opened/valid; native200%
DPR2→4,width1427→713, six widths320–1440,44px controls/no overflow, minimum6.113:1.
Exact injected two network aborts/one403 separated from unexpected errors0;
nonfatal Windows10054 teardown callbacks disclosed. Earlier queued deadline
failure and other corrections remain in [execution](03-planning/sprints/sp-19-execution.md).
No sleep/assertion relaxation or fabricated diagnosis.

One detector exit0/[], [AFTER019](../anti-slop/audit-019-2026-10-15.md)0 new
findings, fresh independent finish ship and documenter preserve incumbent
DESIGN; only shared Sheet closeLabel note added. Inherited missing metadata,
broader V3/human acceptance, SP-20–22, real-device/five-browser/full-load/recovery
and protected-history retention remain separate. No real-data export/purge.
Retain SP-17 runtime audit0/full9 inherited HIGH dev-toolchain findings and latest
valid Python lock evidence; no new audit/dependency upgrade claim.

Guarded testOID109061 cleanup removed1 synthetic residual row/27 orphan objects;
final repeat0/0 leaves64 record tables0 rows/bootstrap unset. Project listeners
3000/8000/3100/8100/8101/3310 and identified project service processes0; shared
PostgreSQL5432 preserved. Final app/migration fingerprint431 files SHA256
2AD224E52DE375C6867D645AB1B1C5C297E53FA487025A2E3F542AA1F47B1F44.


Status: SP-01–SP-20 scoped technical gates verified; product reviews/full-product gates pending
Date: 2026-10-16  
Confirmed context: Next.js, FastAPI/PostgreSQL, Alembic, Ruff/mypy/pytest and full-stack Playwright exist; Locust is installed but no load scenario/run exists yet.  
Execution evidence: [SP-01](03-planning/sprints/sp-01-evidence.md), [SP-02](03-planning/sprints/sp-02-evidence.md), [SP-03](03-planning/sprints/sp-03-evidence.md), [SP-04](03-planning/sprints/sp-04-evidence.md), [SP-05](03-planning/sprints/sp-05-evidence.md), [SP-06](03-planning/sprints/sp-06-evidence.md), [SP-07](03-planning/sprints/sp-07-evidence.md), [SP-08](03-planning/sprints/sp-08-evidence.md), [SP-09](03-planning/sprints/sp-09-evidence.md) and [SP-10](03-planning/sprints/sp-10-evidence.md),2026-10-14–15 UTC. Product/design approval is independent.
References: [agent instructions](../AGENTS.md), [harness](HARNESS.md), [acceptance tests](05-quality/acceptance-tests.md), [release procedure](06-delivery-and-operations/release-and-recovery.md), KV `Agentic Coding/Templates/Project QA Command List Template.md`.

Frontend commands run from `frontend/`; Python commands run from `backend/` with
its explicit `.venv/Scripts/python.exe`. Windows, Node 24.13.1/npm 11.8.0,
Playwright 1.64.1, Python 3.14.3 and PostgreSQL 18.2 were verified. See the backend
README/locks for package versions. CI, later business/load/recovery workflows remain
unconfigured; local bootstrap/authentication now exist in SP-03. Unimplemented
scenarios are not passing results.

| Check | Current exact command | Last verified result / boundary |
|---|---|---|
| Historical SP-09 failed Docker preflight | `docker version`; `docker desktop start`; `docker desktop stop --timeout 20`; `docker desktop start --detach --timeout 30` | 2026-10-15: blocked,not accepted. CLI29.7.2/Desktop4.89.0 start acknowledges but Ingest runtime socket rename fails; Linux engine pipe remains absent. No image/scanner/scan run. No Docker reset, state deletion, upgrade or elevated repair. See [SP-09 preflight](03-planning/sprints/sp-09-evidence.md). |
| Frontend install and dev | `npm ci`; `npm run dev` | Locked reinstall verified in SP-01 (674 packages); unchanged dependency tree. SP-02 dev wrapper serves HTTPS localhost:3000 with the shared ignored certificate. Configure/start the backend first for real readiness. |
| Frontend lint and typecheck | `npm run lint`; `npm run typecheck` | 2026-10-15 SP-08: both exit0; zero lint warnings, generated Next routes and strict TypeScript after record-keyed editor correction and explicit rejection-boundary test synchronization. |
| Frontend build and production start | `npm run build`; `npm run start` | 2026-10-15 SP-08: optimized build exit0,ID 0mZyw9I1IbVqz57TCdg3n;23 displayed routes,24 app-path entries including global-error. Built HTTPS3100 smoke21/21,zero skipped,3.6m. Ordinary dev HTTPS3000 restored; explicit-CA login200,anonymous developments401/no-store and streamed protected programme login redirect checked. Isolated dev tests use .next-e2e. |
| Backend venv/install | `py -3.14 -m venv .venv`; `.venv/Scripts/python.exe -m pip install --require-hashes -r requirements-dev.lock`; `.venv/Scripts/python.exe -m pip install --no-deps --no-build-isolation -e .` | 2026-10-14: exit 0, Python 3.14.3 .venv; runtime and dev hash locks installed. `-m pip check` exit 0. Only venv creation uses base Python. |
| Backend lint/format/types | `.venv/Scripts/python.exe -m ruff check .`; `-m ruff format --check .`; `-m mypy app` (or `scripts/kay.ps1 -Task check`) | 2026-10-15 SP-08: all exit0;91 Python files formatted,57 app modules strict mypy. |
| Backend unit and PostgreSQL integration | `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x` | 2026-10-15 SP-08:163/163 passed,zero skipped,203.09s,96% coverage. All earlier workflows plus mixed hierarchy, scoped unit pages, type independence, whole sale/rental terms/withdrawal/replacement, target identity/ownership/availability, private links/briefing, separate-connection races/current-role denial, versions/retry/rollback, merge provenance and populated0008→0009 preservation. Failed intermediate attempts/corrected reruns remain in evidence. |
| Private setup/inspection | `scripts/kay.ps1 -Task setup`; `-Task inspect -Environment development` (also test/benchmark/recovery) | 2026-10-14: exit 0. Read supplied secret privately, verified installation/connection, created only missing separate targets. Identities and unchanged unrelated development catalog recorded in SP-02 evidence; no reset. |
| Alembic migration check | `scripts/kay.ps1 -Task migrate -Environment test`; same for development; `$env:APP_ENVIRONMENT='test'; .venv/Scripts/python.exe -m alembic check` (also development); restore prior environment | 2026-10-15 SP-08: reviewed0009_development_hierarchy; both targets head0009,27 tables. Development OID109060,test109061,cluster7607060034405909976 and unrelated catalog hash unchanged. Isolated empty down/base/up, populated0008→0009 standalone/campaign/history preservation, direct SQL target/hierarchy constraints and nonempty/development downgrade refusal pass. No new metadata operations on either target; development never reset. |
| HTTPS API startup/smoke | `.venv/Scripts/python.exe -m app.cli.serve`; in another terminal `-m app.cli.smoke` | 2026-10-15 SP-08: final development API restarted on localhost:8000 HTTPS; explicit CA, live/ready, missing-authority403, no-store and untrusted-CA refusal pass. No global TLS bypass/system trust change. |
| First-administrator bootstrap and initial handoff | `scripts/kay.ps1 -Task bootstrap` or `.venv/Scripts/python.exe -m app.cli.bootstrap_admin`, from an interactive terminal in backend/ | 2026-10-14 SP-03/SP-04: real hidden TTY success/weak/mismatch/interrupt/repeat; non-TTY/argument/echo-fallback refusal and real PostgreSQL atomicity/races pass. Staff creation/handoff/reset/restricted change/fresh login verified synthetically. Actual administrator chooses their own password; no real/default account created. Actual staff delivery remains a human operation. |
| Playwright browser installation | `npx playwright install chromium firefox webkit` | 2026-10-14: exit 0; Chromium 156.0.8078.4/rev 1248, Firefox 157/rev 1555, WebKit 27.2/rev 2370 installed. Chrome/Edge channels use installed browsers. |
| Playwright E2E | `npm run test:e2e -- --grep 'SP08\|SP07\|SP06\|@shell' --max-failures=1`; corrected remaining targets `--project=firefox --project=webkit` with the same grep | 2026-10-15 SP-08:105 distinct affected cases verified across five targets. Original command:66 passed/1 Firefox validation-message failure/38 not run,14.2m,not clean. Its63 completed Chromium/Chrome/Edge cases plus the corrected complete Firefox/WebKit42/42,zero skipped,15.3m cover21 per target,including25 new SP08 cases. Application source unchanged by the explicit POST422-before-message synchronization. Earlier interrupted100-case command and genuine record-key fix are retained in evidence; no mock business success. |
| Visible isolated Chrome sprint review | `npm run test:chrome -- --grep 'SP08 visible\|SP07 visible\|SP08 AT-23' --max-failures=1` | 2026-10-15 SP-08: refreshed5/5 pass,zero skipped,1.7m; actual hierarchy/units/template/briefing, prior standalone inventory, outage/invalid/record-switch checks.320/360/768/1024/1440,keyboard/touch,long labels and applicable states; actual200% edit,DPR2→4,width1427→713,overflowfalse,2854x1702 viewport. Main-agent inspection16 refreshed SP08 captures; AFTER008:0 HIGH/0 MEDIUM/1 optional LOW pending Khalid's selection. No audit-only fix; product/design review pending. |
| Built-server browser smoke | After `npm run build`, temporarily set KAY_E2E_PRODUCTION=1; `npm run test:e2e -- --project=chrome --grep 'SP08\|SP07\|SP06\|@shell' --max-failures=1`; restore previous variable | 2026-10-15 SP-08:21/21 passed,zero skipped,3.6m. Build 0mZyw9I1IbVqz57TCdg3n on HTTPS3100 with isolated API/PostgreSQL and synthetic actors. All five SP08 cases plus seven inventory,five ownership and four shell regressions. Local optimized build quality,not deployment. |
| Locust load run | Not configured | Record dataset, users, duration, p95 result, and environment. |
| Runtime dependency audit | `npm audit --omit=dev` | 2026-10-15 SP-08: exit0,zero runtime vulnerabilities. Full audit still nine HIGH inherited development-only entries; no new dependency or forced incompatible downgrade. |
| Python dependency audits | `.venv/Scripts/python.exe -m pip_audit --no-deps --disable-pip -r requirements.lock`; repeat for requirements-dev.lock | 2026-10-15 SP-08: both exit0,no known vulnerabilities; pip check exit0. Hash locks unchanged; no dependency added. |
| Full dependency audit | `npm audit` (also JSON metadata inspection) | 2026-10-15 SP-08: **not clean**,exit1,nine inherited HIGH development-tree entries;0 critical/moderate/low. GHSA-vfj7-8cjw-p6xm in shadcn/Next ESLint tooling remains. Unsafe forced downgrades not applied; trusted-local-input exposure/residual risk retained in evidence. No dependency added. |
| Repeatable private client scan | `node scripts/scan-client-secrets.mjs` from frontend/ | 2026-10-15 SP-08 final output:4 static roots,246 JS files,zero configured facade-secret occurrences; value never printed. |
| Repeatable report privacy check | `powershell -NoProfile -File scripts/audit-report.ps1` from frontend/ | 2026-10-15 SP-08 final built report:5 JSON entries,21 result step arrays,0 detailed arrays. Corrected Firefox/WebKit report5/42/0; failed original5/67/0. Unknown/no-result or detailed input-bearing report shapes fail closed; only counts emitted. |
| Secret exclusion and scoped security review | git check-ignore/git ls-files for private paths; SECURITY_CHECK.md; private client scan and report audit; identity/lease-guarded synthetic cleanup | 2026-10-15 SP-08: private configs/note/venv/local data/captures/reports ignored,0 private tracked files.246 browser JS/0 configured secret; final report21 arrays/0 detailed. Only.last-run.json in test-results,no failure/profile/trace/video. Test ports closed before exclusive lease and guarded isolated cleanup;25 test record tables empty/bootstrapunset. Development's25 record tables inspected read-only,empty/bootstrapunset; never reset. Synthetic fixtures can be recreated by tests. |
| Documentation links and traceability | `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` | 2026-10-15 SP-10 final closure: exit0;22 sprints,41 AT mappings,13 synchronized Mermaid pairs,9 valid JSON examples; final link count in SP-10 evidence. SP-10 has22 checked/0 unchecked criteria; product review pending. Documentation validation does not itself run application tests. Historical preflight counts/blocker remain in execution records. |

Update a result only after inspecting the manifest or CI config and running the real command. Record failures as failures. Run focused checks after relevant changes, then the [local sprint technical gate](03-planning/local-roadmap.md#required-technical-exit-gate) and complete SP-22 local regression. Future deployment is outside these sprints. The [acceptance scenarios](05-quality/acceptance-tests.md) define what to test; this register says how to run implemented checks.

SP-01 remains frontend-only historically; SP-02 adds foundation integration, not
business data, backup/restore or load-test acceptance. SP-03 verifies scoped
authentication; remaining business/restore/load gates are unconfigured. WebKit/touch is not actual iPhone/Safari support.
Product reviews remain pending Khalid.

## SP-09 current verification (2026-10-15 UTC)

The earlier Docker failure row is historical. Khalid's resumed Docker-ready
request established a real Linux engine and scanner; do not infer that its old
blocked state describes the implemented files now. [SP-09 evidence](03-planning/sprints/sp-09-evidence.md)
retains failed attempts and the final acceptance boundary.

| Check | Exact command/directory | Actual current result |
|---|---|---|
| Real antivirus | backend: `docker compose -f compose.clamav.yaml up -d`; `docker compose -f compose.clamav.yaml ps` | Scoped healthy loopback3310, ClamAV1.5.4, pinned digest/signature cache; real clean/controlled rejection, no application fake verdict |
| File worker | backend: `.venv/Scripts/python.exe -m app.cli.worker` (`--once` for one bounded run) | Separate actual worker exercised by browser supervisor; outage/restart/durable claim/fence/retry tests. Ordinary development launch instructions in backend README |
| Orphan reconciliation | backend: `.venv/Scripts/python.exe -m app.cli.file_maintenance` | One-hour grace, active-permit/committed-state guard; at most100 removals, never committed evidence; isolated regression includes100 retained prefix objects |
| Backend quality | backend venv: `-m ruff check .`; `-m ruff format --check .`; `-m mypy app` | All exit0;110 formatted Python files,70 strict app modules |
| Backend full suite | backend venv: `-m pytest --cov=app -q --tb=short -x` |192/192 passed255.91s, zero skipped,94% coverage; real PostgreSQL and ClamAV |
| Migrations/drift | backend: `scripts/kay.ps1 -Task migrate -Environment development`; corresponding test command; venv `-m alembic check` in each selected environment, restoring prior value | Both34 tables/head0011_file_session_binding, no new upgrade operations; additive only, identity/catalog unchanged, development never reset/seeded |
| Frontend quality/build | frontend: `npm run lint`; `npm run typecheck`; `npm run build` | Exit0 after final archived-contact correction; final application build `CBCln6jwbn_knc5PpdqMY` |
| Focused actual files | frontend: `npm run test:e2e -- --project=chrome --grep SP09 --max-failures=1` | Initial2/2 passed1.2m; later matrix reruns current source on all configured projects |
| Headed file review | frontend: `npm run test:chrome -- --grep 'SP09 visible Chrome' --max-failures=1` | Final1/1 passed (1.2m test/1.4m total reported),15 refreshed native captures; archived-contact copy/retained clean read, keyboard/native picker/progress/interruption/roles/touch/320–1440px/actual200% |
| Cumulative regression | frontend: `npm run test:e2e -- --grep 'SP09\|SP08\|SP07\|SP06\|@shell' --max-failures=1` | Final115/115 passed43.2m,zero skipped;23 cases each Chromium/Chrome/Edge/Firefox/WebKit. Earlier failed attempts retained in evidence. Full report6 JSON/115 result arrays/0 detailed arrays |
| Optimized-build regression smoke | frontend: temporarily set `KAY_E2E_PRODUCTION=1`, run `npm run test:e2e -- --project=chrome --grep 'SP09\|SP08\|SP07\|SP06\|@shell' --max-failures=1`, restore prior environment |23/23 passed,zero skipped,5.7m; final compiled HTTPS frontend3100 and actual isolated API/PostgreSQL/ClamAV/worker.203 source fingerprints unchanged; local build check, not deployment/load/recovery |
| Python audits/install health | backend venv: `-m pip_audit --no-deps --disable-pip -r requirements.lock`; repeat dev lock; `-m pip check` | Both0 known vulnerabilities/exit0; pip check exit0; Pillow12.3.0/pypdf6.20.1 exact hash locks |
| Frontend audits | frontend: `npm audit --omit=dev`; `npm audit --json` | Runtime0; full audit retains9 inherited HIGH development-only entries, GHSA-vfj7-8cjw-p6xm, no forced incompatible downgrade |
| UI skills/AFTER | one `impeccable.cmd detect --json` on six changed UI files; manual/pixel/contrast review | Detector `[]`; AFTER009:0 HIGH/0 MEDIUM/0 LOW, no aesthetic-only fix; independent finish reviewer ship, required documenter no changes, DESIGN/tokens preserved |
| Privacy and artifacts | Configured-secret-only scan of browser output; inspect safe HTML-report metadata, ignored/tracked paths and test-results |253 browser JS/4 roots/0 facade-secret matches; final built report6 JSON/23 step arrays/0 detailed arrays; only `.last-run.json` in test-results, no temporary profiles/traces/videos/error contexts; private paths ignored/0 tracked |
| Guarded cleanup and shutdown | Verified test-target advisory lease and existing fixture helper/maintenance; `docker compose -f compose.clamav.yaml stop`; listener/process count checks |32 test record tables empty/bootstrap unset; development read-only empty inspection;1 transient test login-rate counter and17 old synthetic orphan objects removed. Project processes/ports0, ClamAV exited/cache retained, shared PostgreSQL and unrelated Docker resources preserved |

The final matrix, built-server smoke, post-run privacy/cleanup and documentation
gates pass for this local slice; the [execution record](03-planning/sprints/sp-09-evidence.md)
retains actual attempts, corrected failures and limitations. At that SP-09
checkpoint, SP-10–SP-22 remained pending; the SP-10 results below supersede that
scope. Full-product/load/recovery and Khalid's product/design acceptance remain pending.

## SP-10 final verification (2026-10-15 UTC)

Implementation is technically accepted within its recorded local scope.
[SP-10 evidence](03-planning/sprints/sp-10-evidence.md) retains failed attempts
and final gates/limits. No new package/lock dependency or chart is added.

| Check | Exact command/directory | Actual current result |
|---|---|---|
| Backend quality | backend explicit venv: `-m ruff check .`; `-m ruff format --check .`; `-m mypy app` | Exit0;121 formatted Python files,78 strict app modules |
| Backend full suite | backend venv: `-m pytest --cov=app -q --tb=short -x` |223/223 passed357.56s,zero skipped,94% coverage; actual PostgreSQL/ClamAV, all earlier modules and new requirement/shortlist/merge/migration/race cases |
| Focused backend | backend venv: `-m pytest tests/test_requirements.py tests/test_inventory_edges.py tests/test_development_edges.py -q --tb=short -x` |39/39 passed66.25s,zero skipped; earlier failed assertions/corrected runs retained |
| Migration/identity | backend: `scripts/kay.ps1 -Task inspect -Environment development`; `-Task migrate -Environment development`; explicit-venv `-m alembic check` and `-m app.cli.inspect_database` in development/test, restore prior environment and preserve exit | Dev34→38 tables/head0011→0012; both final38/head0012/no drift. OIDs109060/109061,cluster7607060034405909976,catalog SHA unchanged. Additive only; no dev reset/seed |
| Frontend quality/build | frontend: `npm run lint`; `npm run typecheck`; `npm run build` | Exit0, final optimized build `eCCqBWaV9DSQJZnhOZPD-`,23 displayed routes/24 app-path entries;219 source fingerprints recorded |
| Focused browser | frontend: `npm run test:e2e -- --grep SP10 --max-failures=1` | Final10/10 pass3.8m,zero skipped, two cases each across all five projects; persistent one-search selection after pointer movement included |
| Visible Chrome | frontend: `npm run test:chrome -- --grep 'SP10 visible Chrome' --max-failures=1` | Final1/1 pass54.4s test/1.1m total;16 refreshed/inspected native captures,2 independent searches/actual unit target,current409/outage/keyboard/touch/320–1440/actual200%/denied/archive; settled removal focus and native-touch selected-state switching pass |
| Five-browser regression | frontend: `npm run test:e2e -- --grep 'SP10\|SP09\|SP08\|SP07\|SP06\|SP05\|@shell' --max-failures=1`; affected same command with `--project=webkit` |160 distinct cases verified:128 in four complete projects,plus32/32 WebKit rerun12.2m,zero skipped. First command stopped134 pass/1 SP09 scanner-wait timeout/25 not run45.8m; unchanged focused1/1 and full WebKit pass. Root unproven, retained test-stability risk; no product/assertion/timeout loosened |
| Optimized-build smoke | frontend: temporary `KAY_E2E_PRODUCTION=1`, same grep with `--project=chrome`, restore prior environment and preserve inner exit status | Final32/32 pass7.8m,zero skipped,exit0; actual final built HTTPS frontend and isolated API/PostgreSQL/ClamAV/worker.219 application/migration source fingerprints unchanged after run; local smoke, not deployment/load/recovery |
| Python audits | backend venv: `-m pip_audit --no-deps --disable-pip -r requirements.lock`; same dev lock; `-m pip check` | All exit0,0 known vulnerabilities/no broken requirements; exact hash locks unchanged |
| Frontend audits | frontend: `npm audit --omit=dev --json`; `npm audit --json` | Runtimeexit0/0 findings; fullexit1/9 inherited HIGH development-tool entries, no forced incompatible change |
| UI skill/AFTER | installed `impeccable.cmd detect --json` on actual changed targets; manual/native/contrast check |[]; AFTER010 has0 new aesthetic findings, no audit-only fix; initial wrong Lead path corrected separately. Full review's one P2 persistent-selection finding fixed; same reviewer verdict ship/resolved, all16 captures valid. Documenter adds one narrow component fact; DESIGN/tokens preserved |
| Privacy | frontend: `node scripts/scan-client-secrets.mjs`; `powershell -NoProfile -File scripts/audit-report.ps1`; ignored/tracked artifact check |4 roots/260 browser JS/0 configured facade-secret occurrences; final report8 JSON/32 result arrays/0 detailed arrays.8 private paths ignored/0 tracked; only .last-run.json in test-results, no temporary profiles/traces/videos/error contexts |
| Guarded cleanup/shutdown | Explicit-venv test identity/exclusive advisory lease; count-only inspections, existing `tests.identity_support.clear_identity`/`app.files.reconcile.reconcile`; `docker compose -f compose.clamav.yaml stop`; listener/process counts | Both38 tables/head0012; test36 record tables empty/bootstrap unset after removing1 transient rate bucket and17 old uncommitted synthetic orphan objects; one-hour grace retained. Development read-only empty/unset, no reset/seed. Project listeners/processes/supervisors0; ClamAV stopped/cache retained; shared PostgreSQL and unrelated resources preserved |
| Documentation | root: `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` | Exit0;1050 local links/anchors including70 approved skill links;22 sprints/41 AT mappings/13 synchronized Mermaid pairs/9 JSON examples. SP-10 22 checked/0 unchecked; source contracts and traceability updated, product review pending |

At the SP-10 handoff, SP-11–SP-22, full-product/load/recovery, actual Safari/devices and Khalid's
product/design acceptance remain separate and pending.

## SP-11 execution (2026-10-15, technically accepted locally)

| Boundary | Actual command | Observed result |
|---|---|---|
| Backend quality | backend explicit venv: `-m ruff format --check app tests alembic`; `-m ruff check app tests alembic`; `-m mypy app` | Exit0;137 formatted files/90 app modules, reviewed frozen0013 migration |
| Backend full regression | backend: `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x` | Final263/263 passed424.85s,zero skipped,95% coverage; real PostgreSQL/ClamAV. New research-intent preflight covers both directions without freezing uncommitted deals |
| Frontend quality/build | frontend: `npm run lint`; `npm run typecheck`; `npm run build` | All exit0 after selected punctuation and research-conflict copy corrections; Next16.4.0 compile1.218s/TypeScript2.8s; final test-only correction lint/types pass |
| Isolated migration and development upgrade | backend: venv Alembic upgrade/check; `scripts/kay.ps1 -Task inspect/migrate -Environment development` |0013;38→42 tables; no drift, same development OID/cluster/unrelated catalogue; final read-only40 record tables empty/bootstrap unset; no seed/reset |
| Five browsers | frontend: `npm run test:e2e -- tests/e2e/deals.spec.ts --workers=1 --max-failures=1` | Post-copy20/20 pass7.1m,zero skipped/exit0 after punctuation/token/actual401 corrections; new upstream-conflict branch receives final five-target rerun below |
| Expanded optimized Chrome regression | frontend: temporary `KAY_E2E_PRODUCTION=1`; `npm run test:e2e -- --project=chrome --grep 'SP11\|SP10\|SP09\|SP08\|SP07\|SP06\|SP05\|@shell' --workers=1 --max-failures=1` |32 pass/1 obsolete shell-placeholder failure/3 unrun8.9m; test corrected. All36 selected cases verified through32 unchanged passes plus4 corrected shell Chrome passes below, not one clean36 invocation. Earlier10-pass/1 scanner-recovery deadline failure retained |
| Final affected five-target compiled rerun | frontend: temporary `KAY_E2E_PRODUCTION=1`; `npm run test:e2e -- --grep 'SP11: permitted requirement\|@shell' --workers=1 --max-failures=1`; restore prior environment/preserve inner exit |25/25 pass4.9m,zero skipped/exit0: updated research intent-conflict and4 shell cases on each target. Final build qbGMKlVgwNIMmIwh04jfr and246 source fingerprints unchanged |
| Headed Chrome | frontend: `npm run test:chrome -- tests/review/deals.chrome.spec.ts --max-failures=1` | Final post-copy1/1 pass1.4m;16 valid final native captures. Earlier timing/width evidence defects corrected; actual keyboard/touch/200%/roles/states/private clean bytes pass |
| Dependencies | Python venv pip_audit both locks/pip check; frontend npm audit runtime/full | Python/runtime0; full frontend retains9 inherited HIGH dev-tool entries/exit1 |
| UI finish / AFTER | native capture inspection, fresh Impeccable finish review/documenter, one detector run |16 valid native captures; finish ship including targeted final-copy confirmation; documenter No changes; AFTER011 finding1 explicitly selected and verified; no new system/asset |
| Privacy | frontend: `node scripts/scan-client-secrets.mjs`; `powershell -NoProfile -File scripts/audit-report.ps1`; ignored/tracked check |4 roots/275 browser JS/0 configured secret occurrences; final report3 JSON/25 result arrays/0 detailed arrays; only .last-run.json/0 temporary profiles;8 private paths ignored/0 tracked |
| Guarded cleanup/shutdown | backend explicit-venv exclusive_test_run/clear_identity/reconcile; inspect/Alembic check; `docker compose -f compose.clamav.yaml stop`; listener/process counts |1 residual synthetic row removed/0 old orphan objects removed,40 record tables empty/bootstrap unset. Dev read-only preserved. Distinct OIDs109060/109061,42 tables/head0013/no drift/same catalogue.6 project ports/owned process tree/backend CLI counts0; ClamAV stopped/cache retained, shared PostgreSQL preserved |
| Documentation validation | root: `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` | Exit0;1058 links including70 approved skill links,22 sprints/41 AT mappings/13 Mermaid pairs/9 JSON examples; SP-11 22 checked/0 unchecked |

[Execution ledger](03-planning/sprints/sp-11-evidence.md) retains failed selectors,
corrections and remaining risks. SP-11 is technically accepted; product review and SP-12–SP-22 remain pending.

## SP-12 final verification (2026-10-15 UTC)

[Execution ledger](03-planning/sprints/sp-12-execution.md) retains corrected
attempts, original/final build fingerprints and scoped acceptance. All Python
commands use `backend/.venv/Scripts/python.exe`; all DB-writing suites run
serially under the verified isolated-target lease. Browser commands below use
the actual HTTPS frontend/API/PostgreSQL/ClamAV stack and synthetic fixtures.

| Boundary | Actual command or repeatable manifest selection | Observed result |
|---|---|---|
| Backend quality | backend venv: `-m ruff check .`; `-m ruff format --check .`; `-m mypy app` | Exit0;145 formatted files/92 app modules |
| Full backend | backend venv: `-m pytest --cov=app --cov-report=term-missing -q --tb=short` |284 passed446.16s,95% coverage,0 failed/0 skipped |
| Final SP-12 backend | backend venv: `-m pytest tests/test_reservations.py tests/test_reservation_migration.py tests/test_reservation_http.py -q --tb=short` |23 passed46.66s,0 skipped; full284 plus focused23 cover286 current cases, not one286 invocation |
| Migration/identity | backend venv: `-m alembic check`; `-m app.cli.inspect_database` in development/test, restore prior APP_ENVIRONMENT | Both43 tables/head0014/no drift; OIDs109060/109061/same cluster/catalogue. Development additive42→43, never seeded/reset |
| Frontend quality/build | frontend: `npm run lint`; `npm run typecheck`; `npm run build` | Exit0 on final copy; build vdAiKy5eJbtZ70GZWIiJ0 and250 app/migration fingerprints unchanged through final tests |
| Five-target expanded | frontend `npm run test:e2e`, select deals.spec.ts and reservations.spec.ts, one worker |35/35 passed10.5m,0 skipped on initial candidate |
| Broader optimized Chrome | frontend `npm run test:e2e`, Chrome programme/files/inventory/requirements/four shell selection |8/8 passed2.8m,0 skipped; one non-fatal Windows pipe10054 warning retained |
| Final affected matrix | frontend `npm run test:e2e`, SP12 selection on all five projects, one worker; temporary KAY_E2E_PRODUCTION=1 restored with inner exit |15/15 passed5.6m,0 skipped/exit0; final compiled build |
| Visible Chrome | frontend: `npm run test:chrome -- tests/review/reservations.chrome.spec.ts --max-failures=1` | Final1/1 passed44.7s,12 valid final native captures; keyboard/touch/focus/320–1440/actual200%/contrast/no horizontal overflow/denied/conflict/error/retry |
| Dependencies | backend venv pip_audit runtime/dev locks and pip check; frontend npm audit runtime/full | Python32/102 dependencies0 known vulnerabilities, pip check clean; npm runtime0, full9 inherited HIGH dev-tool entries; no package change |
| UI finish | Single detector on10 changed targets, AFTER012, fresh finish reviewer and documenter |Detector[];0 new aesthetic findings; ship/no material fixes in scoped interface; documenter No changes, existing DESIGN/tokens retained |
| Privacy | frontend: `node scripts/scan-client-secrets.mjs`; `powershell -NoProfile -File scripts/audit-report.ps1`; representative per-path git check-ignore/ls-files |4 roots/275 browser JS/0 configured-secret matches; report2 JSON/15 result arrays/0 detailed arrays;8 paths ignored/0 tracked; only .last-run.json,0 temporary profiles/traces/videos |
| Guarded cleanup/shutdown | backend venv assert_isolated/exclusive_test_run/clear_identity/reconcile; `docker compose -f compose.clamav.yaml stop`; read-only listener/process checks |1 residual synthetic row/0 old orphan objects removed; both41 record tables empty/bootstrap unset.6 project ports/owned project processes0; ClamAV stopped/cache retained; shared PostgreSQL preserved |
| Documentation | root: `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`; `git diff --check` | Exit0;1067 links/anchors including70 skill links,22 sprints/41 mappings/13 synchronized Mermaid pairs/9 JSON examples. SP-12 22 checked/0 unchecked; untracked repository contents preserved, no stage/commit |

Runtime: Node24.13.1/npm11.8.0/Python3.14.3/Playwright1.64.1; actual targets
Chromium156.0.8078.4, Chrome155.0.8059.79, Edge155.0.4283.45, Firefox157.0,
WebKit27.2. Actual200% browser zoom is not CSS emulation; WebKit/touch is not
real-device Safari. Product review, SP-13–SP-22 and whole-product/load/recovery/
production acceptance remain pending. Earlier section statuses are historical.

## SP-14 final verification (2026-10-15 UTC)

Use [the execution ledger](03-planning/sprints/sp-14-execution.md) for attempts,
final gate status and limits. All Python commands use `backend/.venv/Scripts/python.exe`;
all database-writing suites remain serial under the verified isolated lease.
Browser commands temporarily set `KAY_E2E_PRODUCTION=1`, restore its prior value
and preserve the inner exit status; these are local compiled-stack checks.

| Boundary | Actual command / working directory | Current observed result |
|---|---|---|
| Backend quality | backend venv `-m ruff format --check .`; `-m ruff check .`; `-m mypy app`; `-m pip check` | Exit0:179 formatted files,113 strict app modules, no broken requirements |
| Expanded scheduling | backend venv `-m pytest tests/test_schedule.py tests/test_schedule_edges.py tests/test_schedule_http.py tests/test_schedule_migration.py -q --tb=short -x` |31/31 passed57.98s, real PostgreSQL/strict HTTP/rollback/replay/races/migration; included in final full suite |
| Initial full backend | backend venv `-m pytest --cov=app --cov-report=term-missing -q --tb=short -x` |348/348 passed770.84s,94% coverage,0 skipped before lifecycle correction/new race; not called final-source full acceptance |
| Final full backend | backend venv `-m pytest --cov=app --cov-report=term-missing -q --tb=short -x` |349/349 passed685.01s,94% coverage,0 failed/0 skipped/exit0; current lifecycle correction and policy/booking race included, real PostgreSQL/ClamAV |
| Frontend quality/build | frontend `npm run lint`; `npm run typecheck`; `npm run build` | Exit0; current application build0leBHja-rs4ZKz21C7tSq; post-harness lint/types also pass |
| Headed native workflow | frontend `npm run test:chrome -- tests/review/schedule.chrome.spec.ts --max-failures=1` | Final1/1 passed48.3s test/1.1m total,0 skipped;23 native captures independently valid, two main inspection batches, real touch/keyboard/200%/settings/retained outage/version recovery |
| Inherited restart correction | frontend `npm run test:e2e -- tests/e2e/ownership.spec.ts --project=chrome --grep 'note lost acknowledgement' --repeat-each=3 --max-failures=1` |3/3 passed59.5s after supervisor waits for real CA-verified TLS liveness and exact owned-tree stop; original readiness assertion unchanged. Initial matrix14 pass/1 fail/50 unrun retained |
| Clean five-target matrix | frontend `npm run test:e2e -- tests/e2e/schedule.spec.ts tests/e2e/ownership.spec.ts tests/e2e/shell.spec.ts --max-failures=1` |65/65 passed21.7m,0 failed/0 skipped/exit0; original recovery and new scheduling on every target;291 application hashes unchanged |
| Broader compiled Chrome | frontend `npm run test:e2e -- --project=chrome --grep 'SP11\|SP12\|SP13\|SP08: mixed hierarchy\|SP09 AT-06/26/35\|SP07 AT-06/08/27/31\|SP10 AT-07/08/36' --max-failures=1` |14/14 passed5.3m,0 failed/0 skipped/exit0; pipeline/reservations/outcomes/hierarchy/real protected files/inventory/requirements. One non-fatal Windows10054 callback warning retained |
| Final schemas | backend venv `-m app.cli.inspect_database`; `-m alembic check` with development then test environment/restoration |Both56 tables/head0016/no drift; distinct OIDs109060/109061, same cluster/unrelated catalogue. Development additive48→56/no seed/reset; isolated populated migration/retained-history downgrade refusal pass |
| Dependencies | backend venv pip_audit both hash locks/pip check; frontend npm audit runtime/full | Python0 known/pip check clean; npm runtime0, full9 inherited HIGH dev-tool entries/exit1, no forced update |
| UI finish | one detector on19 changed targets; AFTER014; fresh finish reviewer/documenter |Detector[];0 new aesthetic findings; ship at inspected UI scope/all23 captures valid; one factual component-guide addition, DESIGN/tokens preserved; inherited PRODUCT/design.json drift remains |
| Final privacy | frontend `node scripts/scan-client-secrets.mjs`; root per-path git check-ignore/ls-files |4 roots/283 browser JS/0 configured-secret matches;10 checked private/generated paths ignored/0 tracked |
| Report privacy | frontend `powershell -NoProfile -File scripts/audit-report.ps1` |Post-matrix4 JSON/65 result arrays/0 detailed; final broader report8 JSON/14 result arrays/0 detailed. Only.last-run.json in test-results |
| Development HTTPS smoke | explicit-venv owned temporary `-m app.cli.serve`, then `-m app.cli.smoke`; exact owned tree stopped in finally |Exit0: explicit CA/live/ready/direct denial/no-store/untrusted CA refused; port8000 returns to0 listeners, no record writes |
| Final cleanup/shutdown | Explicit-venv isolated identity/lease/root guards, existing clear_identity/reconcile helpers; root `docker compose -f backend/compose.clamav.yaml stop`; Get-NetTCPConnection/root-identified service process checks |0 residual synthetic rows/0 old orphan objects removed;53 test record tables empty/bootstrap unset, policy version1/capacity2/editor unset/no hours. Six project ports/service processes0, ClamAV exited143 on stop/cache retained, shared PostgreSQL5432 and unrelated resources preserved |
| Final documentation | root `powershell -NoProfile -File docs/03-planning/validate-sprints.ps1`; `git diff --check`; count SP-14 criteria | Exit0:22 sprints,1090 local links/anchors including70 installed-skill links,41 acceptance mappings,13 synchronized Mermaid pairs,9 valid JSON examples;25 checked/0 unchecked. Git has17 untracked entries/0 tracked changes; diff check is not a tracked application diff review |

SP-14 is technically accepted within this verified local slice. The execution
ledger preserves failed attempts and fixes; no required failed/skipped check is
called passed. Human product/design review, SP-15–SP-22, full-product, real-device,
load, backup/recovery and production gates remain pending. The full npm audit is
not clean; no forced dependency downgrade or generic metadata repair was made.

## SP-13 current scoped verification (2026-10-15 UTC)

Read [the execution record](03-planning/sprints/sp-13-execution.md) for retained
failed/interrupted attempts and remaining limits. Nothing in this section claims
whole-product or Khalid's product acceptance.

| Gate | Actual command/directory | Actual final result |
|---|---|---|
| Backend quality | backend venv `-m ruff check .`; `-m ruff format --check .`; `-m mypy app` | Ruff/check pass;162 Python files/102 strict application modules |
| Backend full | backend `.venv/Scripts/python.exe -m pytest --cov=app --cov-report=term-missing -q --tb=short` |318/318 pass681.74s,94% coverage,0 failed/0 skipped |
| Affected backend | backend venv `-m pytest tests/test_outcomes.py tests/test_outcome_edges.py tests/test_outcome_hierarchy.py tests/test_outcome_sql.py tests/test_outcome_migration.py tests/test_outcome_http.py tests/test_deal_edges.py -q --tb=short -x` |51/51 pass127.65s,0 skipped; included in the clean full318 run |
| Additive migration | backend venv `-m app.cli.inspect_database`; `-m alembic upgrade head`; `-m alembic check` with explicit development environment/restoration |0015 applied,43→48 tables, no drift; OID109060/cluster/unrelated catalogue unchanged; no seed/reset. Isolated populated migration and retained-history downgrade refusal pass |
| Frontend quality | frontend `npm run lint`; `npm run typecheck`; `npm run build` | All exit0 after closed-deal attachment-message correction; optimized build `7M8Dzh4lJCpDJgX2UM3FC` |
| Dependencies | backend venv pip check and both pip_audit hash locks; frontend npm audit runtime/full | Python0 known vulnerabilities/pip check clean; npm runtime0/full9 inherited HIGH development-tool advisories, no package change |
| Five-target compiled workflow | Temporarily KAY_E2E_PRODUCTION=1; frontend `npm run test:e2e -- tests/e2e/deals.spec.ts tests/e2e/reservations.spec.ts tests/e2e/outcomes.spec.ts --max-failures=1`; restore previous value/inner exit |50/50 passed17.4m,0 skipped:10 each Chromium/Chrome/Edge/Firefox/WebKit, including15 SP-13 and35 prior cases |
| Broader compiled Chrome | Same temporary environment; frontend `npm run test:e2e -- --project=chrome --grep 'SP08: mixed hierarchy\|SP09 AT-06/26/35\|SP07 AT-06/08/27/31\|SP10 AT-07/08/36\|@shell' --max-failures=1` |8/8 passed2.8m,0 skipped; real files/ClamAV, inventory/hierarchy/requirements/four shell cases. Non-fatal Windows Proactor10054 retained |
| Visible Chrome | Same compiled environment; frontend `npm run test:chrome -- tests/review/outcomes.chrome.spec.ts --grep 'SP13 visible Chrome' --max-failures=1`; separately grep 'SP13 settled desktop context evidence' | Final full1/1 pass1.5m; settled/refresh1/1 pass33.0s.16 valid native captures, keyboard/touch/320–1440/actual200%/retained input/roles;0 unexpected page/console errors |
| UI finish | Required skills, two main batched inspections and one evidence-only context repair, one detector/AFTER013, fresh independent reviewer/documenter | Detector[]/zero new aesthetic findings; fresh UI reviewer ship, documenter No system changes; inherited metadata drift retained |
| Privacy | frontend scan-client-secrets.mjs/audit-report.ps1; per-path ignored/tracked and test-results inspection |4 roots/277 browser JS/0 configured-secret matches; matrix report4 JSON/50 arrays/0 detailed; broader report6 JSON/8 arrays/0 detailed.10 paths ignored/0 tracked; only.last-run.json, no profiles/traces/videos |
| Final isolation/shutdown | backend venv assert_isolated/exclusive_test_run/clear_identity/reconcile, Alembic check and inspect_database; Compose stop; listener/process counts |0 residual synthetic rows/0 old orphan objects removed;46 test record tables empty/bootstrap unset. Both48 tables/head0015/no drift, unchanged distinct database identities/catalogue.6 project ports/root-identified processes0; ClamAV stopped/cache retained; shared PostgreSQL5432 preserved |
| Documentation | root validate-sprints.ps1 and git diff --check |1078 links/22 sprints/41 AT mappings/13 synchronized Mermaid pairs/9 JSON examples pass; SP-13 23 checked/0 unchecked; no stage/commit |

Final build7M8Dzh4lJCpDJgX2UM3FC;266 app/migration files retain SHA256
`10C6FFBD1A1BA5939DA42F586970521F493B03DA2D2DDF2CF91393FE84E605A1`
through final tests/cleanup. Product review and SP-14–SP-22 remain pending. Full
npm audit is not clean (9 inherited HIGH development-only advisories); generic
design metadata persistence fails on pre-existing missing PRODUCT/design.json,
reported outside this extension's repair scope. These are not claimed fixed.

## SP-15 verification (2026-10-15 UTC)

Technical acceptance is complete locally in [execution](03-planning/sprints/sp-15-execution.md).
Commands below are real manifests/venv commands, not presumed successes.
From frontend, temporarily set KAY_E2E_PRODUCTION=1 for compiled browser commands;
restore its previous value and preserve the command exit status. All writing
fixtures are serial under the isolated lease; never run them on development.

| Boundary | Reproducible command / working directory | Final observed result |
|---|---|---|
| Backend quality | backend explicit venv: -m ruff check app tests alembic; -m ruff format --check app tests alembic; -m mypy app | Exit0,196 formatted files/125 strict app modules |
| Focused backend | backend explicit venv: -m pytest tests/test_work.py tests/test_work_edges.py tests/test_work_http.py tests/test_work_process_migration.py tests/test_schedule_migration.py -q --tb=short -x |23/23 passed68.16s before extra delivery parameter; stronger synchronized claim/delivery selection3/3 in4.09s; all latest variants included in full suite, not added again |
| Full backend | backend explicit venv: -m pytest --cov=app --cov-report=term-missing -q --tb=short -x |372/372 passed727.34s(12:07),94% coverage,0 failed/0 skipped/exit0; real PostgreSQL/ClamAV, worker crash/restart, races, strict HTTP and populated migration |
| Frontend quality | frontend npm run lint; npm run typecheck; npm run build | Exit0; final build S5SnyXhT5J3phRg8k_fNM; post-test-source lint/types also pass |
| Native Chrome | frontend npm run test:chrome -- review/work.chrome.spec.ts --max-failures=1 | Final2/2 passed1.2m,0 skipped;23 refreshed valid captures, two main inspection rounds, actual200%, native touch/keyboard and retained failure/version states |
| Initial five-target attempt | frontend npm run test:e2e -- tests/e2e/work.spec.ts tests/e2e/schedule.spec.ts tests/e2e/ownership.spec.ts tests/e2e/shell.spec.ts --max-failures=1 |79 passed/1 WebKit responsive failure/5 unrun24.9m; original error assertion retained. This was85 collected before the new fifth work case, not a clean pass |
| Responsive correction | frontend npm run test:e2e -- tests/e2e/shell.spec.ts --project=webkit --grep 'responsive widths' --repeat-each=3 --max-failures=1 |3/3 passed49.5s after awaiting actual loaded calendar/dashboard reads; no app/CORS change, sleep, retry or console suppression. Earlier reproduction1 pass/1 fail/1 unrun retained |
| Final affected five-target checks | frontend npm run test:e2e -- tests/e2e/work.spec.ts tests/e2e/shell.spec.ts --max-failures=1 |45/45 passed10.3m,0 failed/0 skipped, including new deal-context task edit/cancel and previously unrun WebKit cases |
| Staff role regression | frontend npm run test:e2e -- tests/e2e/auth.spec.ts --grep 'AT-39' --max-failures=1 |5/5 passed1.6m,0 skipped, all five targets;95 distinct affected five-target variants covered across corrected commands, not one clean95 invocation |
| Broader compiled Chrome | frontend npm run test:e2e -- --project=chrome --grep 'SP11\|SP12\|SP13\|SP08: mixed hierarchy\|SP09 AT-06/26/35\|SP07 AT-06/08/27/31\|SP10 AT-07/08/36' --max-failures=1 |14/14 passed5.2m,0 skipped;109 distinct browser variants across commands. One non-fatal Windows10054 callback warning retained |
| Operator worker | backend .venv/Scripts/python.exe -m app.cli.worker --once or --status | Actual --once/process restart/status assertions pass in isolated focused tests; status exposes aggregate counts only |
| Python dependencies | backend explicit venv: -m pip check; -m pip_audit --no-deps --disable-pip -r requirements.lock; same dev lock | All exit0/no known vulnerabilities; no lock change |
| Frontend audit | frontend npm audit --omit=dev; npm audit --json | Runtime0/exit0; full9 inherited HIGH development-tool entries/exit1, no forced update |
| UI finish | Required UI skills/references, one detector across19 targets, AFTER015, fresh reviewer/documenter | Detector[];0 new aesthetic findings; French-copy scored fix resolved, all25 refreshed originals/canonical captures valid. Factual component section only, incumbent DESIGN/tokens preserved; inherited generic metadata drift remains |
| Client/private-path privacy | frontend node scripts/scan-client-secrets.mjs; root per-path git check-ignore/ls-files |4 roots/281 browser JS/0 configured-secret matches;10 private/generated paths ignored/0 tracked |
| Report privacy | frontend powershell -NoProfile -File scripts/audit-report.ps1 | Final affected report3 JSON/45 result arrays/0 detailed; final broader8 JSON/14 arrays/0 detailed. Only.last-run.json remains in test-results |
| Final schemas | backend explicit venv: -m app.cli.inspect_database; development -m alembic upgrade head; -m alembic check for development/test with environment restoration | Both59 tables/head0017/no drift; additive development56→59/no seed/reset; distinct verified OIDs109060/109061, same cluster/unrelated catalogue retained |
| Development HTTPS smoke | backend explicit-venv owned temporary -m app.cli.serve, CA-verified liveness then -m app.cli.smoke; exact owned tree stopped in finally | Exit0: explicit CA, live/ready, direct403, no-store/untrusted CA refused; port8000 released. Development worker --status exits0 with aggregate empty jobs/undispatched0 |
| Final isolation/shutdown | backend explicit-venv isolated identity/lease/test-root/synthetic guards, clear_identity/reconcile and read-only development counts; root docker compose -f backend/compose.clamav.yaml stop; listener/process metadata checks |0 residual rows/0 old orphan files; both56 record tables empty/bootstrap unset; intrinsic policy version1/capacity2/editor unset/no hours. Six project ports/service processes0, ClamAV exited143/cache retained; shared PostgreSQL5432/unrelated resources preserved |
| Final documentation | root powershell -NoProfile -File docs/03-planning/validate-sprints.ps1; git diff --check; sprint criterion/status counts | Exit0:22 sprints/1102 local links including70 installed-skill links/41 AT mappings/13 synchronized Mermaid pairs/9 valid JSON examples; SP-15:23 checked/0 unchecked. Git has17 untracked entries/0 tracked changes, so diff check is not tracked application diff-review evidence |

Final build S5SnyXhT5J3phRg8k_fNM and311 app/migration files retain SHA256
52723F0DA8A7CC238F2217457A4EA63D0642B603F0948192828A95EE2508D7F2 through
the serial tests/migration/smoke/cleanup. SP-15 is technically accepted locally;
Khalid's product/design review remains pending. The full npm audit is not clean,
generic metadata drift is not repaired, and no real-device/load/recovery/
production/full-product acceptance is inferred. SP-16–SP-22 remain unstarted.

## SP-16 focused verification (2026-10-15 UTC)

Khalid requests necessary-only testing. The shared gate permits relevant suites
and retained recent evidence for untouched boundaries. Do not interpret this
section as a fresh full372-test baseline, full browser matrix or SP-22 acceptance.
Current closure and corrected attempts: [SP-16 execution](03-planning/sprints/sp-16-execution.md).
Use frontend/ for npm commands, backend/ for explicit venv commands. Temporarily
set KAY_E2E_PRODUCTION=1 for compiled browser commands, restore its prior value
and preserve exit status. DB writers remain serial under the isolated lease.

| Boundary | Actual command | Verified result |
|---|---|---|
| Backend quality | .venv/Scripts/python.exe -m ruff check .; -m ruff format --check .; -m mypy app | All exit0;211 formatted files/132 strict app modules |
| Focused finance plus affected outcomes | .venv/Scripts/python.exe -m pytest tests/test_finance.py tests/test_finance_edges.py tests/test_finance_http.py tests/test_finance_migration.py tests/test_outcomes.py tests/test_outcome_edges.py tests/test_outcome_sql.py -q --tb=short -x |46/46 passed79.77s,0 failed/0 skipped;23 new finance and23 affected existing variants |
| Frontend quality | npm run lint; npm run typecheck; npm run build | Exit0; optimized build; no dependency/token/style-system change |
| Five-target finance | npm run test:e2e -- tests/e2e/finance.spec.ts --max-failures=1 |10/10 passed3.5m,0 skipped; exact terms/recognition/partial/excess/corrections/reopen/agent denial, committed response loss and stale-version recovery |
| Final affected Chrome after copy/validation batch | npm run test:e2e -- tests/e2e/finance.spec.ts --project=chrome --max-failures=1 |2/2 passed44.7s; retained five-target flow evidence, not another final10-case invocation |
| Visible Chrome | npm run test:chrome -- review/finance.chrome.spec.ts --max-failures=1 |1/1 passed38.2s before final independent-review copy finding; native14 captures/keyboard/touch/invalid-field focus, six widths/actual200%,0 unexpected errors. Final one-sentence correction rerun recorded in execution |
| Schema migration/drift | Explicit venv -m alembic upgrade head; -m alembic check; -m app.cli.inspect_database on each verified target with environment restoration | Both63 tables/head0018/no new operations. Development additive59→63/no seed/reset; distinct OIDs109060/109061, same verified cluster/unrelated catalogue |
| Development HTTPS | Explicit-venv owned temporary app.cli.serve then app.cli.smoke, explicit local CA; owned tree stopped in finally | Exit0: live/ready/direct403/no-store/untrusted CA refused |
| Isolation cleanup | Explicit venv isolated identity/cluster/private-root/advisory/synthetic guards, clear_identity/reconcile; read-only development counts | Test1 residual synthetic row removed,0 orphan objects; both60 record tables/0 rows/bootstrap unset. Development policy1/capacity2/no editor/hours/lunch |
| Client/report/private paths | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1; per-path git check-ignore/ls-files |4 roots/282 JS/0 secret matches;2 report JSON/1 result array/0 detailed;10 paths ignored/0 tracked. Final refreshed report check follows closure |
| UI skills | Required complete reads/references, one detector12 targets, AFTER016, fresh finish review/documenter | Detector[]; AFTER0 new aesthetic findings. Independent functional-copy finding is corrected/scored separately; no second detector or audit-only aesthetic change |

Actual runtime: Node24.13.1/npm11.8.0, Python3.14.3, FastAPI0.143.1,
SQLAlchemy2.1.4, pytest9.1.1, Ruff0.17.0, mypy1.20.2, headed Chrome155.0.8059.79;
existing Playwright1.64.1/PostgreSQL18.2 installation retained. No packages added.
Recent unchanged-lock SP-15 audit evidence is retained: npm runtime0/full9
inherited HIGH dev-tool entries, Python locks0 known findings. Not rerun or fixed
by this sprint. Real antivirus/file paths are untouched; the finance proof test
uses labelled metadata, not a new scan. Product/device/load/recovery/production
and full-product acceptance remain separate and pending.

Final SP-16 review correction: build2sQCC1Lb3eIrWjWd7hTMQ,327 app/migration
files SHA256 D5122B15B9E8E6C4CE5C77E1A3D022A5D8D629166A7046C7016EF3C57BAA16CB.
Only one stale pipeline guidance sentence changed after the full UI review.
Frontend lint/types/build pass, corrected headed1/1 passes39.0s/0 skipped/
0 unexpected errors. All14 originals+2 canonical images refreshed/valid;
reviewer scores its single fix resolved and returns ship at that limited scope.
Two failed measurement-only attempts counted the hidden file input instead of
its actual chooser hit target; the final test measures the explicit proxy and
retains44px/contrast/overflow/console assertions. No second detector or full
backend/browser rerun after this copy-only change. Latest client/report privacy
still4 roots/282 JS/0 secret matches and2 JSON/1 result array/0 detailed arrays.
Final guarded cleanup again removes1 synthetic row and leaves60 test record
tables empty; development read-only counts60/0/bootstrap unset. Earlier schema/
backend/behavior results remain valid for their unchanged boundaries.

Closure: fresh documenter completes its factual SP-16 component section and
outcome without changing DESIGN/tokens/source. Final documentation command
powershell -NoProfile -File docs/03-planning/validate-sprints.ps1 exits0:
22 sprints/1110 local links (70 installed-skill links)/41 AT mappings/13 Mermaid
pairs/10 valid JSON examples. SP-16 has23 checked/0 unchecked criteria; technical
acceptance complete locally, product review pending. git diff --check exits0,
but17 untracked entries/0 tracked changes are not a tracked diff-review claim.
Six project ports and identified service processes0; ClamAV exited/cache retained,
shared PostgreSQL5432 preserved. SP-17–SP-22 remain unstarted.

## SP-17 focused reporting verification (2026-10-15 UTC)

The user requests necessary-only tests. Retain valid recent untouched-boundary
evidence; the complete final CRM/load/recovery suite remains SP-22. See
[SP-17 execution](03-planning/sprints/sp-17-execution.md) for corrected attempts,
final review/source/capture status and privacy/isolation closure.

Run npm in frontend/, Python in backend/ via .venv/Scripts/python.exe. Compiled
browser commands temporarily set KAY_E2E_PRODUCTION=1, restore its previous value
and propagate the real exit code. All DB writers remain serial under the lease.

| Boundary | Actual command | Result |
|---|---|---|
| Python quality | .venv/Scripts/python.exe -m ruff check .; -m ruff format --check .; -m mypy app | exit0;218 formatted files/137 strict modules |
| Focused new reports/affected outcomes/finance HTTP | .venv/Scripts/python.exe -m pytest tests/test_reports.py tests/test_report_edges.py tests/test_outcomes.py tests/test_finance_http.py -q --tb=short -x -s |22/22 passed33.65s,0 skipped;14 new+8 affected variants |
| Query/index probe | Synthetic1000 timeline actions in test_report_edges; EXPLAIN ANALYZE BUFFERS FORMAT JSON |1000 returned/Nested Loop/2.534ms final run; not full load/p95 |
| Frontend quality | npm run lint; npm run typecheck; npm run build | exit0, final built version and review fix in execution |
| Five-target compiled reporting | npm run test:e2e -- tests/e2e/reports.spec.ts --max-failures=1 |10/10 passed3.2m before scoped accessibility corrections; no final full matrix rerun claim |
| Affected compiled Chrome | npm run test:e2e -- tests/e2e/reports.spec.ts --project=chrome --max-failures=1 |Final F1 2/2 passed47.3s,0 skipped |
| Visible Chrome | npm run test:chrome -- review/reports.chrome.spec.ts --max-failures=1 | Final F1 workflow1/1 passed41.0s (53.1s with startup),0 skipped;11 native captures plus2 canonical copies |
| Schema | .venv/Scripts/python.exe -m alembic check/current, both verified environments | no new operations;both head0018; no migration created |
| Dependencies/privacy | npm audit --omit=dev --json; npm audit --json; node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 | runtime0/full9 inherited HIGH dev-tool chain;4 roots/285 JS/0 secret matches; detailed report arrays0 |
| UI gate | Required skills, bounded visual batches, one detector, AFTER017 and independent F1 verdict/documenter | detector[]; F1 resolved/ship; documenter recorded; AFTER017 optional LOW1 unselected |

Pinned runtime remains Node24.13.1/npm11.8.0, Python3.14.3/FastAPI0.143.1/
SQLAlchemy2.1.4, Playwright1.64.1, headed Chrome155.0.8059.79/PostgreSQL18.2.
Registry-required exact dependencies: visx4.0.0, motion14.3.0, d3-array3.2.4,
@number-flow/react0.6.2. Local Bklit MIT source retained; scoped registry-only lint
exceptions documented, application rules unchanged. Python locks unchanged.
No product approval, actual-device/Safari, whole-product, production, deployment
or SP-22 performance/recovery acceptance is inferred.

Final SP-17 closure: guarded cleanup removes1 synthetic row/0 orphan objects,
leaving60 test record tables empty/bootstrap unset. Read-only development stays
60/0/bootstrap unset, policy1/capacity2/no editor/hours/lunch. Six project ports
and root-identified service processes0; ClamAV exited143/cache retained/shared
PostgreSQL5432 preserved. Source393-file SHA256 remains
7E3ABF9F418883B31B2A2A173E90C51D59A3E823C801C2C7FB5F2B9F1CAB0AED.
Root validate-sprints.ps1 exits0:22 sprints/1123 local links/41 AT mappings/
13 Mermaid pairs/10 JSON examples;23 checked/0 unchecked SP-17 criteria.
git diff --check exits0, but17 untracked entries/0 tracked changes are not a
tracked application-diff review. SP-18–SP-22 and human product review remain.

## SP-18 necessary-only contact import checks (2026-10-15 UTC)

Commands below are actual results, not fullCRM/SP-22 acceptance. Backend cwd
backend/, explicit .venv interpreter; frontend cwd frontend/, compiled browser
commands temporarily set KAY_E2E_PRODUCTION=1 and restore its prior value.

| Boundary | Actual command | Result |
|---|---|---|
| Focused backend + affected identity/history | .venv/Scripts/python.exe -m pytest tests/test_imports.py tests/test_import_http_migration.py tests/test_contacts.py tests/test_ownership.py -q --tb=short -x -s |61/61 passed110.43s,0 skipped:16 new+45 affected existing cases |
| Strengthened interruption/guards | .venv/Scripts/python.exe -m pytest tests/test_imports.py tests/test_import_http_migration.py -q --tb=short -x -s |16/16 passed42.05s, including501-contact multi-chunk pre/postcommit recovery |
| Final uniform permit denial | .venv/Scripts/python.exe -m pytest tests/test_import_http_migration.py -q --tb=short -x -s |3/3 passed23.02s; overlaps previous counts |
| Backend quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app |all exit0;231 formatted files/147 typed modules |
| Frontend | npm run lint; npm run typecheck; npm run build |all exit0, final build KDcVSGWqFB2pc9tcjQcfF |
| Compiled import + affected ordinary contact | npm run test:e2e -- tests/e2e/imports.spec.ts tests/e2e/leads.spec.ts --project=chrome --grep 'SP18\|SP05 AT-03/23/39' --max-failures=1 |4/4 passed1.3m,0 skipped before final refresh-only fix |
| Final affected compiled import | npm run test:e2e -- tests/e2e/imports.spec.ts --project=chrome --max-failures=1 |2/2 passed59.1s,0 skipped, same-key committed-loss recovery/phone claim/repreview |
| Final visible Chrome | npm run test:chrome -- tests/review/imports.chrome.spec.ts --max-failures=1 |1/1 passed30.1s (42.5s total),0 skipped; native cancellation/retry, correction, approval, roles, states, keyboard/touch/zoom |
| Migration | .venv/Scripts/python.exe -m alembic upgrade head; .venv/Scripts/python.exe -m alembic check |populated0018 preservation and downgrade refusal isolated tests pass; additive development0019, no drift; both66 tables/63 record tables |
| Client privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 |4 roots/285 JS/0 configured-secret matches;2 JSON/2 step arrays/0 detailed arrays |
| Ignored artifacts | git check-ignore and git ls-files via guarded10-path probe |10 ignored/0 tracked |

Chrome155.0.8059.79; six widths320/360/390/768/1024/1440; actual200% zoom
DPR2→4,width1427→713; visible controls≥44px, no horizontal overflow, measured
final minimum contrast5.814:1. Unexpected page/console errors0; exact injected
GET abort/403 separated. Nonfatal Windows Proactor10054 connection-close callbacks
remain disclosed.12 original+2 canonical captures individually opened/validated.
One detector exit0/[] and [AFTER018](../anti-slop/audit-018-2026-10-15.md) records
0 new aesthetic-only findings. Fresh finish/documenter results in
[execution](03-planning/sprints/sp-18-execution.md), not inferred from filenames.

No dependency/lock changes. Retain SP-17 runtime audit0/full9 inherited HIGH
dev-toolchain results and latest valid Python lock audit, not fresh scans.
50,000-row parser0.138/0.278s boundaries are not50,000-contact commit throughput
or load acceptance. No actual phone/Safari/five-browser/full-suite rerun.
Read-only development remains0 records/bootstrap unset/default schedule policy.
Guarded cleanup testOID109061 removes1 synthetic residual row/28 orphan objects,
leaves63 record tables0 rows/bootstrap unset. Six project ports/service processes0,
shared PostgreSQL5432 preserved. Fingerprint410 app/migration files SHA256
0C3FADAFE00C22194998B60806B4833F6AB47EC90685CB14325EA82244E3FCF3.

Final SP-18 closure: fresh full finish review ship/no material fixes, factual
documenter complete; inherited missing metadata and broader V3 acceptance remain
outside this extension. Root validate-sprints.ps1 exit0:22 sprints/1169 links/
41 AT mappings/13 Mermaid pairs/10 API JSON examples. SP-18 checklist23 checked/
0 unchecked; git diff --check exit0 with17 untracked roots/0 tracked changes.
Project listeners/service processes0, shared PostgreSQL preserved. Technical
acceptance is scoped to SP-18, not human review or completeCRM acceptance.

## Local startup repair checks (2026-10-16)

[Startup execution](06-delivery-and-operations/local-startup-execution.md) records
the exact commands and scope: lint/typecheck/build pass, six-path Ruff checks,
four-module mypy and11/11 focused runtime/static-proxy tests pass. Manual dev
and compiled HTTPS startup produced no terminal warnings/errors; CA-verified
health checks and30 aborted connections passed. Final compiled headed Chrome
integration/intake2/2 pass; earlier shell/file/Iconsax selections and normal CRM
development/HMR pass. Separate simulator development hydration fails and remains
disclosed; do not treat those diagnostic runs as passing. Windows CA trust and
interactive administrator bootstrap are user-controlled, not silently performed.
The [runbook](06-delivery-and-operations/local-startup.md) recommends compiled
frontend mode for the complete local workflow. No full-product certification.

## UI refinements publication (2026-10-16)

The [publication record](06-delivery-and-operations/ui-refinements-publication.md)
records the owner's current push authorization, full scope, existing surface
coverage and the exact compiled headed Chrome selection. Fresh checks from
`frontend/`: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build` and
`npm.cmd run security:check` pass. Runtime audit has 0 vulnerabilities; the existing
full-audit dev-only advisory retains its approved expiring exception, not a clean
full-audit claim. Inventories: 284 buttons / 94 files and 43 Iconsax exports, both
with 0 violations.

Selected visible Chrome tests pass 7/7 in 4.5 minutes, 0 skipped, on the guarded
synthetic local stack: account footer/logout recovery, shared semantic actions,
route-family controls/dialogs, dashboard header/direct audit, populated directory
filters, neutral KPI/funnel/agent charts and paired Lead/Deal facts. Fresh desktop
and mobile captures were visually inspected. `git diff --cached --check`, staged
redacted Gitleaks, repository/index checks and repository-only documentation
validation pass. Hosted candidate CI must independently pass before main merge.

The complete manual database/backend/browser release workflow is **not executed,
not passed** by this publication. It remains required before customer-data release
on isolated synthetic targets, never production. No production database access,
real account creation or whole-product certification is implied.

## Login composition preview (2026-10-16)

The historical login refinement covered local `/login` alignment. From `frontend/`,
`npm.cmd run lint`, `.\node_modules\.bin\tsc.cmd --noEmit --incremental false`
and `npm.cmd run security:check` pass. From the repository root,
`powershell -NoProfile -File docs/03-planning/validate-sprints.ps1` and
`git diff --check` pass. Runtime dependency audit: 0 vulnerabilities; 9 existing
dev-only findings use the approved expiring exception. Production build was not
run while the user's Next.js dev server was active on the shared `.next` directory.

Visible Playwright on local HTTPS: desktop 1672px, tablet 1024px and mobile 375px
captures saved under ignored `frontend/output/playwright/` and visually opened.
At 320/375/768/1024/1440/1672px, document scroll width equals client width.
Tab reaches the email field; password visibility toggles both ways; empty
submission shows French client validation and issues no auth API request. Mailto
target is `contact@hivevaultarc.com`; console has 0 errors/0 warnings. No
credentials, backend changes, test actors or database writes. Product/design
acceptance is pending; this is not whole-product or production-release acceptance.

## Login compact-frame follow-up (2026-10-17)

The compact-frame refinement supersedes the earlier 98rem desktop screenshot.
The historical review recorded 2048 × 1152 and 375px full-page captures in ignored
`frontend/output/playwright/`. At 2048 × 1152, 1440 × 900, 1024 × 900 and
768 × 900, the page fits the viewport; widths 320/375/768/1024/1280/1440/2048
have no horizontal overflow. The 1280 × 720 viewport scrolls vertically to keep
all content reachable. Inputs are 48px, visibility control 44px, and submit
56px. Keyboard Space toggles password visibility in both directions; empty
submission shows client-side French validation with no auth POST. Browser
console: 0 errors and 0 warnings. Existing focused visible-Chrome test
`npm.cmd run test:chrome -- tests/review/chrome.spec.ts --grep "SP-03: visible login" --max-failures=1 --reporter=list`
passes 1/1 in 48.4s on the isolated synthetic test target; it covers responsive
login geometry, keyboard, invalid feedback, synthetic sign-in and cleanup.

From `frontend/`, lint passes: 43 semantic icons / 28 consumers / 118 sites and
284 buttons checked, 0 violations. Direct TypeScript check
`node_modules/.bin/tsc.cmd --noEmit --incremental false` exits 0. Security check:
0 runtime vulnerabilities; 9 full-tree dev-only findings remain under the
approved `GHSA-vfj7-8cjw-p6xm` exception through 2026-11-15; this is not a clean
full audit. From the repository root, sprint validation passes with 1260 local
links/anchors, 22 sprint specs, 41 acceptance mappings, 13 synchronized Mermaid
pairs and 10 valid API examples; `git diff --check` exits 0. Production build was
not run while local Next.js development used the shared `.next` directory. No
credential entry, database write, test actor, backend/API/session change or
publication; product/design review remains pending.
