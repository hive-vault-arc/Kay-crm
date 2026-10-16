# SP-10 execution record

Status: implemented; scoped technical acceptance 2026-10-15 UTC
Date: 2026-10-15 UTC
Product/design review: pending Khalid

## Final technical handoff

All22 SP-10 task/acceptance/technical-exit checkboxes are satisfied in their
implemented scope. Final build `eCCqBWaV9DSQJZnhOZPD-`, migration
`0012_requirements_shortlists`. No application/migration source changed after
the final build: all219 fingerprints match after the compiled smoke.

- Backend: explicit backend/.venv Python3.14.3; Ruff/format/mypy78 pass.
  Full pytest passes223/223,zero skipped,357.56s,94% coverage. Focused requirements
  and affected inventory/development edge tests pass39/39,66.25s. Real PostgreSQL,
  ClamAV, constraints, populated migration, races/revocation/retry/rollback and
  exact large-decimal comparisons are exercised.
- Frontend: lint/typecheck/optimized build exit0. Broad five-target evidence
  covers160 distinct cases through four complete projects plus the corrected
  complete WebKit rerun, not one clean160-case invocation. Latest-source SP10
  rerun passes10/10,zero skipped,3.8m across all five projects.
- Final compiled HTTPS smoke: temporarily set `KAY_E2E_PRODUCTION=1`, run
  `npm run test:e2e -- --project=chrome --grep 'SP10|SP09|SP08|SP07|SP06|SP05|@shell'
  --max-failures=1`, restore the prior environment while preserving the inner
  exit status. **32/32 pass,zero skipped,7.8m,exit0**, including real scanner
  recovery with200 pending_scan followed by clean, and previous contact/inventory/
  hierarchy/ownership/shell workflows. This uses the final built frontend with
  the actual isolated API/PostgreSQL/worker, not a deployment or load test.
- Final headed Chrome passes1/1,zero skipped,54.4s test/1.1m total. All16 refreshed
  native captures were opened by main and the independent reviewer. Actual200%
  zoom (DPR2→4,CSS1427→713,no overflow),320–1440px,keyboard/native touch, two
  independent searches, target navigation, loading/empty/invalid/error/denied/
  conflict/read-only states, retained outage drafts and settled removal focus
  pass. Persistent current-search state has exactly one pressed/checkmarked row
  after pointer movement and touch switching; unexpected console/page errors0.
- Required UI reads/system-first composition/exclusions and antislop AFTER010
  recorded:0 new aesthetic findings, no audit-only fix. Full finish review found
  one functional P2 selected-state issue; the same reviewer's final verdict is
  ship/P2 resolved, all16 captures valid, no visible regression from that fix.
  This verdict covers that scored correction, not whole-product or human approval.
  Documenter adds one narrow persistent-selection fact; DESIGN/tokens unchanged.
- Final compiled report audit:8 JSON entries/32 result step arrays/0 detailed
  arrays. Browser output scan:4 roots/260 JS files/0 configured facade-secret
  matches. Private configuration/captures/reports/test state:8 checked ignored
  paths,0 tracked. Only `.last-run.json` remains in test-results; no temporary
  profile/trace/video/error context. Python lock audits/pip check and frontend
  runtime audit pass; full npm audit retains9 inherited HIGH development-tool
  findings. No forced incompatible dependency change or clean-full-tree claim.
- Guarded test cleanup verifies live identity OID109061/cluster7607060034405909976
  and acquires the exclusive advisory lease. All36 record tables are empty apart
  from one transient login-rate bucket before cleanup; remove only that bucket,
  recheck empty, then reset the synthetic bootstrap marker with the existing
  isolated helper. Final36 empty/bootstrap unset/head0012/38 tables. Existing
  reconciliation removes17 old uncommitted synthetic file objects in one batch;
  recent objects remain protected by the one-hour grace. These fixtures can be
  regenerated; no committed document or development record is deleted.
- Development read-only inspection: OID109060,38 tables/head0012,36 record tables
  empty/bootstrap unset. Earlier pre/post identity/catalog and both no-drift
  checks pass. No development reset/seed, real-data action or production access.
- Normal runner shutdown leaves0 app listeners; stop only the KAY ClamAV Compose
  service, retaining its cache/volume. Final listeners3000/3100/8000/8100/8101/3310
  are0; project-path processes0/test supervisors0. Shared PostgreSQL5432 remains
  listening; unrelated Docker resources are not changed.
- Documentation validator exits0:22 sprints,1050 local links/anchors (70 approved
  skill links),41 acceptance mappings,13 synchronized Mermaid pairs,9 valid JSON
  examples. Runtime commands/contracts/traceability/security and sprint status
  are updated. No Git staging/commit or automatic SP-11 start.

Remaining risks: the original SP-09/WebKit20-second scanner-wait timeout is
unproven and did not recur in the unchanged isolated case or complete32-case
WebKit rerun. Retain it as test stability, not a root-cause-fixed claim. Windows
asyncio connection-reset callback warnings occur during intentional interrupted
transfers; passing tests are not a warning-free claim. The9 inherited HIGH npm
development-tool entries remain disclosed. Parser/shortlist/body bounds remain
technical proposals, not silently confirmed new business rules.

Khalid's product/design review is pending. Actual Safari/physical devices and
assistive-technology user testing, measured load/recovery, deployment and
SP-11–SP-22 remain unverified/unstarted; the entire CRM is not complete. Next safe
action: human workflow review; later sprint implementation requires a further request.

The following ledger preserves chronological attempts, including then-pending
gates and failed/interrupted runs. This final handoff supersedes their status;
no failed or unexecuted attempt is relabeled as passed.

## Task and acceptance plan

Implement C03/C04/C13, BR-06/07/08 and scoped AT-07/08/36/23 using the
SP-10 specification and existing local stack. SP-09 is technically accepted;
no later deal/reservation/dashboard/import/deployment work is authorized here.
Use only synthetic data and the verified isolated PostgreSQL target for tests.
Every Python execution uses backend/.venv. Fixture-writing suites stay serial.

Focused E2E defined before implementation: create two independent contact
searches (sale and rental), keep unknown distinct from false/zero and required
distinct from preferred, filter actual standalone/unit/whole-development
offerings, compare11999.99/month exactly to143999.88/year without changing
original terms, add/update feedback/remove a precise offering and verify its
target link. A second actor cannot read/write the private requirement. Include
invalid input, stale versions, same-key retry, real response interruption,
archive/history and current authority after a transfer/merge.

Backend gates: strict bodies/query/CSRF/facade/current scope, Decimal/numeric,
FK/uniqueness/type/finite guards; separate-connection conflict/revocation/retry
and rollback; isolated empty/populated migration and downgrade protection;
Ruff/format/mypy/full pytest, then real browser tests and headed Chrome.
Frontend gates: lint/typecheck/build; actual running UI at320/360/768/1024/1440,
keyboard/touch/actual200%, long French labels, applicable loading/empty/error/
denied/conflict/success/read-only states, native captures and privacy checks.
Finish with built-server smoke, dependency/client/report audits, guarded
synthetic cleanup, technical checklists and documentation validation.

## Implementation proposals

Strict typed criteria cover category, location, area, rooms, parking and elevator;
each has required/preferred importance and an explicit nullable unknown value.
Money stays a decimal string; rental budgets keep their original period and
receive exact annual equivalents. Bounded manual filters do not rank matches or
reserve stock. A shortlist must name an actual offering with the requirement's
intent and the version the user reviewed. Existing entries keep their offering
identity when inventory changes or is archived; no reusable type is selectable.
These wire shapes/technical bounds are implementation proposals, not new scope
or confirmed business rules. Product review remains independent.

### Retained broad-browser interruption

The first160-case command stopped after45.8m:134 passed,1 failed,25 not run.
All32 cases in each Chromium/Chrome/Edge/Firefox passed. WebKit's second SP-09
file case timed out waiting20s for a clean verdict after restarting its actual
worker. No SP-10 case had failed. ClamAV remained healthy; the supervisor emitted
its fail-closed lease-loss message during teardown. The failed report privacy
audit passes8 JSON entries/135 result step arrays/0 detailed arrays.

An unchanged isolated rerun of that exact WebKit case passed1/1,27.5s test/52.7s
total, zero skipped. This does not establish the original cause. Source review
shows safe90-second fenced worker leases and a409 active-scan guard; a killed
in-flight retry is a plausible explanation, not proven from the lost fixture.
No product code/lease/authorization/antivirus assertion or timeout was changed.
The test now explicitly observes its real retry-scan response and logs only
status, safe error code and version state, so a recurrence is diagnosable without
printing file/token/user data. A complete affected32-case WebKit rerun is underway.
Do not describe these attempts as a clean160-case command or hide the timeout.
Windows asyncio connection-reset warnings were also observed during deliberate
transfer cancellation; corresponding passing checks are not warning-free claims.

The complete affected WebKit rerun passes32/32,zero skipped,12.2m. Its real
retry-scan acknowledgement is200,pending_scan, then the required actual clean
verdict/download/archive assertions pass with the unchanged20-second UI bound.
Final WebKit report audit8 JSON/32 result arrays/0 detailed arrays passes.
Together with the four complete32-case projects above, this verifies160 distinct
selected cases across five targets; it is not one clean160-case invocation.
The original transient timeout is not reproduced or claimed root-cause-fixed;
retain it as a test-stability risk. No SP-10/application source change was needed.
Final headed recapture/full review and built-server smoke remain open.

Final requested headed recapture passes1/1,zero skipped,59.2s test/1.2m total.
All16 unique native PNGs are newer than that run's start; main opened each once.
The settled removal image shows actual success, one remaining unit, enabled
controls and the fully framed keyboard focus ring. The workflow also visibly
creates two independent sale/rental searches and opens the exact physical-unit
target, then returns without changing its selection. Actual200% measurement
remainsDPR2→4,CSS1427→713,overflowfalse;320–1440/touch/current409/real API outage/
retry/denial/archive and unexpected console/page error count0 pass. Native
full-page contexts start at document top with2 searches and3 settled offerings.
Headed report privacy passes2 JSON/1 result array/0 detailed arrays.
The same fresh reviewer is now performing a full review over all refreshed
evidence, not a verdict-only pass.219 source fingerprints match the final build
before starting the32-case optimized HTTPS Chrome smoke; that command is running,
not yet accepted.

The refreshed full review returned `fix` for one P2 functional orientation issue:
list buttons exposed aria-pressed but their selected color came only from hover.
No newly identified audit-only aesthetic finding. Corrected in one scoped batch
using existing selected background/foreground/ring tokens and the existing
Lucide checkmark as a non-color cue, retaining aria-pressed and bounded wrapping.
New assertions require exactly one current search/checkmark and the existing
selected colors after pointer movement, desktop switching and native-touch
switching. No palette/token/kit/brand change or second detector.

The first compiled-build smoke was deliberately interrupted with Ctrl+C after11
observed passes, before this correction; it is not an accepted smoke result.
Its test listeners stopped before new tests. Final lint/typecheck/rebuild,
five-project SP10 rerun, same native captures/reviewer verdict and the final
compiled32-case smoke are now required. Earlier160 distinct regression results
remain evidence for untouched workflows; backend source/migrations are unchanged.

The correction's lint/typecheck/build all pass; final build is now
`eCCqBWaV9DSQJZnhOZPD-` (earlier ug9 build is superseded).219 source hashes show
only requirement-panel.tsx changed from that previous build. All10 focused SP10
cases across five configured browsers pass,zero skipped,3.8m, including the new
persistent-state/one-checkmark/color-after-pointer-movement assertions. Focused
report privacy passes2 JSON/10 result arrays/0 detailed arrays. New final-source
fingerprints are stored for post-smoke comparison. Documenter rechecked the last
correction and added one narrow persistent-selection fact to ui-components.md;
DESIGN/tokens/other documentation/product source untouched by that handoff.
The same headed workflow is now recapturing all original viewports/states and
checking native touch sale→rental switching before the reviewer's verdict.

Final-source headed confirmation passes1/1,zero skipped,54.4s test/1.1m total.
All16 original native captures were regenerated and main opened each. Desktop
and native-touch sale/rental switching retain exactly one pressed/checkmarked
search after the pointer leaves, using the existing accent/ring tokens. The
settled removal focus, real outage/409, actual200% and other prior state checks
remain passing. Headed report privacy passes2 JSON/1 result array/0 detailed
arrays. The same fresh reviewer returned `ship` on the verdict pass: its single
P2 is resolved, all16 captures valid, no visible regression from this correction.
This verdict scores that finding only; it is not full-product or human approval.
The documenter's final narrow component fact is now recorded in ui-components.md.
The fresh32-case compiled Chrome smoke is running on build
`eCCqBWaV9DSQJZnhOZPD-`; final acceptance still requires its actual completion,
post-run source/privacy checks and guarded cleanup. Earlier pending checkpoint
statements above are chronological history, not the current review disposition.

## UI skill applicability and direction

Read antislop core, design-system-ops plus its four applicable references and
design-taste-frontend completely. Retain Khalid's AFTER mode; no aesthetic-only
fix without his numbered selection. CRM forms/data lists are explicitly outside
design-taste's marketing surface scope. Also use Responsive Design Standards,
uncodixfy, React best practices and Impeccable Operate for the local extension.
No chart, new asset, visual-world replacement or component-library substitution.
Reading this as contact qualification for KAY agents in the incumbent light
white/ivory/charcoal/gold workroom, ENERGY1/RHYTHM1/MOTION1. Reuse Tabs, Button,
Input, Select, FormField/DataState and numbered pages; parent-owned gaps and
single-column mobile reflow follow existing tokens. Product truths come from
the existing contracts rather than a second PRODUCT.md. One context invocation
used a non-existent components/contact-record path; actual source is
frontend/src/features/contacts/contact-record.tsx, inspected directly, not a
reason to invent a new visual world or rerun context.

## Verification ledger

Initial implementation checkpoints (not final acceptance):

- Explicit-venv Ruff passes; strict mypy78 app modules passes.121 Python files
  formatted. Frontend typecheck and lint pass; first optimized build
  MzrgsyY5jnvlLk5-cV7lB succeeds with23 routes. Later corrections need final gates.
- Existing contacts/inventory49 tests pass61.36s. Focused SP-10 run28 tests
  pass43.27s; then SP-10/development38 pass58.62s, zero skipped.
- Retained failed attempts: standalone frozen-DDL compilation initially omitted
  the shared metadata registry and could not resolve a contact FK; importing
  app.db.models fixed the read-only compiler. No DDL ran in that failure.
- Initial SP-10 tests expected a guessed preview-error name rather than existing
  IMPACT_CHANGED (22 pass/1 fail); corrected the assertion. A subsequent fixture
  guessed a nonexistent collaborator author column (24 pass/1 fail); inspected
  the actual model and corrected the synthetic setup. Final28 pass above.
- New list projections initially used total_pages; corrected them to the
  established has_next/has_previous wire contract before browser verification.
- First full pytest stopped70 pass/1 fail98.91s: an SP-08 test still expected
  unit/standalone offering filters to be rejected. SP-10 explicitly implements
  these; updated that assertion to verify successful safe empty pages and added
  continued422 rejection of floor/unit_type. Full rerun still required.
- First focused Chrome run stopped1 fail/1 not run after35.6s: real unit/whole
  creation, exact comparisons and both shortlist additions ran, then the invalid
  template-ID probe was rejected by the facade's missing-feedback shape422
  before reaching the intended nonexistent-offering404. Added explicit null
  feedback to that probe; no product rule relaxed. Corrected rerun underway.
- Pinned KAY ClamAV service restarted with its retained signature cache and is
  healthy on loopback3310. No unrelated container or Docker state was changed.

Planned/currently-running checks are not passing results. Product review pending.

### Broader verification checkpoints

- The corrected focused Chrome command passed2/2, zero skipped,1.1m. It creates
  two actual searches, compares current unit/whole rents, edits feedback/removes
  a selection, denies an unrelated actor, interrupts a committed real response
  and explicitly reconciles a real409 without losing the draft.
- Full backend attempt2 stopped141 pass/1 fail227.68s: an older SP-07 strict-query
  assertion rejected q on offerings. SP-10 implements safe offering search;
  replaced it with a positive safe empty-page assertion and continued422 for
  owner_phone. SP-08 browser's old unit-filter rejection was similarly updated,
  retaining rejection of a reusable-type target. No permission boundary relaxed.
- Focused SP-10 plus both affected inventory edge modules pass39/39, zero
  skipped,66.25s. Large16-digit/2-decimal amounts compare exactly on an18-digit
  annual basis; FK/unique/intent constraints, retained withdrawn campaign links
  and current-scope receipt replay after transfer are included. Full rerun open.
- First headed review failed at retry because process-start acknowledgement is
  not API readiness. The actual outage correctly retained the form; added a
  safe auth/me200 readiness probe before retry rather than accepting a timeout.
  Corrected headed review passed1/1, zero skipped,1.0m test/1.3m total.
  Actual200% measuredDPR2→4 and CSS width1427→713, overflowfalse.320/360/768/
  1024/1440, touch, keyboard, long labels, private denial and archived read-only
  were exercised, with no unexpected console/page errors.
- First batched pixel inspection opened all14 native captures. Canonical full
  pages still showed a loading-offers footer; strengthen the capture boundary
  to require the actual3-offer result, not a sleep. Empty capture must also wait
  for its hydrated creation button. Target mobile-selected and archived shots
  at their named heading/explanation. The final confirmation adds explicit409
  comparison and removal-focus captures. These are capture/coverage corrections,
  not aesthetic changes or claimed final passes.
- New amount validation now has a French invalid-format message and accepts a
  decimal comma by normalizing only numeric UI input to a point. The final
  browser rerun includes a real invalid-letter budget case. No floats for money.

- Final complete backend command `.venv/Scripts/python.exe -m pytest --cov=app -q
  --tb=short -x` passes **223/223, zero skipped,357.56s,94% coverage** (3791
  statements). This includes actual PostgreSQL/ClamAV, all prior modules and
  SP-10 migration/SQL/race/revocation/rollback/large-decimal/history cases. It is
  one clean full run, not a composite of earlier stopped attempts. Ruff passes
  and strict mypy78 app modules passes; final frontend/browser gates remain open.

- Development migration verified against pre/post live identity: OID109060,
  cluster7607060034405909976 unchanged;34→38 tables, head0011→0012. Unrelated
  catalog SHA256 remains4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945.
  Only reviewed additive DDL applied; no development reset or seed.
- Expanded headed confirmation found a real focus-restoration defect after an
  asynchronous stale-version save (44.5s failed run). The next animation frame
  could run before React committed the replacement trigger. Replaced that
  assumption with a stable DOM-ref callback that focuses only when the trigger
  actually mounts. No sleep or weakened focus assertion. Rerun is required.

### Final-source verification and independent review

- Focus correction passed the next real409 save and removal assertions. That
  confirmation then stopped on an ambiguous repeated add button: editing had
  correctly recreated the selector with all levels. Bound the test to the exact
  whole-programme offering list item, not the first repeated button. Final headed
  command passed1/1, zero skipped,59.9s test/1.2m total. All16 unique native images
  refreshed; full-page desktop/mobile start at document top with3 settled offers.
- Final frontend lint/typecheck exit0. Optimized build exit0,ID
  `ug9C3WKKIVuVRv82mQcka`,23 displayed routes/24 app-path entries.219 application/
  migration/frontend source fingerprints recorded before broad regressions.
  Python quality rerun passes: Ruff,121 formatted files,mypy78 modules.
- Both environments' explicit-venv `-m alembic check` exit0: no new upgrade
  operations. Safe inspection confirms38 tables/head0012,developmentOID109060,
  testOID109061,cluster7607060034405909976 and unchanged unrelated catalog hash.
  Environment restoration preserves each inner exit status.
- Python runtime/dev lock audits and pip check all exit0, no known vulnerabilities
  or broken requirements. Frontend runtime audit0; full auditexit1 retains9 HIGH
  development-only entries in the existing tooling chain. Locks unchanged; no
  forced incompatible remediation and no claim the full dependency tree is clean.
- Mechanical detector returned[] on all actual changed UI targets. One initially
  supplied nonexistent leads/lead-record path warned; the actual Contacts source
  was scanned separately once with[]. No repeated detector/polish loop. Actual
  unchanged text pair contrast on ivory:secondary6.11,link6.13,success5.81,
  danger7.29; white on destructive6.52, all AA normal-text pass.
- Fresh independent finish reviewer opened all16 images and returned
  `recapture`, not visual approval: removal-focus image placed its heading flush
  to the viewport edge while controls still looked busy. Capture now requires
  settled success/one remaining item/enabled controls, keyboard-triggered removal,
  and a fully framed focused heading. No product code change was requested.
  A new full review is required after the serialized browser suite releases the
  database. Current five-browser regression command selects160 cases in7 files,
 32 cases per configured project; running is not a passing result.

## Security boundary record

Task: C03/C04/C13,BR-06/07/08,scopedAT-07/08/36/23. Security checked: yes for
implemented boundaries; final browser/privacy/isolated-cleanup gates pass as
recorded in the final technical handoff, with disclosed limits.
Reviewed permissions, security/data/API contracts, current session/facade/merge
policies and migration rules. No new authentication scheme, broker, public URL,
external integration, real-data action, production access or secret is introduced.

- Current PostgreSQL session/role and linked-contact access precede list/count/
  detail/write; aliases resolve the survivor. Unrelated actors receive safe404;
  archived M/A retain read-only access. Revocation is rechecked after lock waits
  and on same-key replay. Receipts retain typed result IDs/version and request
  digest, not cached private response snapshots.
- Strict typed bodies,32KiB cap,Origin/CSRF,duplicate/unknown query rejection,
  bounded pages and allowlisted facade paths include narrowly scoped DELETE.
  Shared offering projection includes only public inventory facts and true target
  identity, never protected owner/developer contact IDs or raw credentials.
- Separate-connection races, expected versions, reviewed offering version,
  requirement/offering intent consistency, unique links, FK/finite numeric/type/
  immutable identity guards and rollback are tested. Rental normalization uses
  Decimal/PostgreSQL numeric and frontend BigInt decimal-string formatting.
  Unsupported currency, zero/negative area, malformed/overflow values, template
  targets, stale versions and invalid query fields fail closed.
- Atomic audit/timeline records retain real actors; merge preview binds real
  searches and reparenting preserves independent IDs/origins/criteria/shortlists
  without collaborator union. Retained campaign/archive history remains linked.
- Real committed-response interruption retries once without duplication; actual
  conflict compares current data and retained draft before explicit resubmission.
  Denial hides stale detail. No automatic match/ranking, stock mutation/reservation,
  finance/export/email/deployment/backup promise is inferred.
- Full223 backend checks pass including prior real-antivirus/session/file gates.
  No secrets/real records in test prompts or capture fixtures. Browser traces and
  automatic input-bearing screenshots stay off. Final bundle/report scans pass,
  guarded isolated cleanup and owned-service shutdown complete; no production or
  real-data security acceptance is inferred.

## Documentation handoff and boundary

Impeccable's fresh documenter initially compared requirement forms/facts/panel, offering
selector/feedback, Contact/Lead consumers and merge impact to current API/data/
architecture/screen/component contracts and native desktop/mobile/selected/form/
archive captures. Result: no further durable component fact missing; no edit
needed then. After the finish review correction it added only the narrow fact
that current search treatment persists with aria-pressed, existing accent/ring
tokens, a non-color check and bounded wrapping. Palette, system typography,
shared geometry, shadcn/Tailwind composition
and states/no-shipping-assets preserve the incumbent system. DESIGN.md and
branding/Impeccable system files remain unchanged.

Pre-existing drift reported, not silently repaired or adopted as truth:
design-system.md retains pre-implementation app/theme wording, and the
ui-components status line still stops at SP-08 despite newer scoped sections.
Context metadata also does not recognize all existing visual implementation.
These are not reasons to create a second product authority or redesign the CRM.
The documenter did not run tests or grant visual/technical/product acceptance.

The final headed recapture also explicitly creates the second independent
sale search and opens the shortlisted physical-unit target before returning to
the rental search, as the sprint's visible Chrome checklist requires. This is
coverage of existing product behavior, not new application-source changes.

## Changed implementation boundaries

- Backend `app/requirements`: typed API contracts, four ORM tables, read/query
  projection, transactional commands/receipts and merge-link adapter. Existing
  current-contact/session/agency locking and audit/timeline policies are reused.
- `alembic/versions/0012_requirements_shortlists.py`: frozen reviewed additive
  SQL, constraints/triggers/indexes and safe downgrade refusal; no runtime ORM
  `create_all` or development data reset.
- Inventory contracts/router/selection: bounded real offering filters, safe
  target-level labels/links and exact numeric sale/annual-rental comparisons.
  Unknown inventory facts do not satisfy numeric bounds. Parking/elevator stay
  manual verification, not invented shared attributes or automatic exclusions.
- Contact merge/preview/history and identity audit constraints: real search
  impact, independent reparenting, immutable origin/actor and preserved retained
  shortlist/campaign history. No collaborator union or additional private access.
- Frontend `features/requirements` shared by Contact/Lead: strict facade/schema,
  RHF/Zod form, typed facts, paginated hierarchy/offering search, exact target and
  shortlist feedback. Existing API helpers add only the allowed DELETE verb.
  No dependency, chart, shipping image, CSS framework or global token change.
- Backend tests add31 focused cases (including parametrized invalid values),
  synthetic FK-ordered cleanup and new inventory-query expectations; browser
  tests add2 SP10 cases and one real headed state/role/accessibility workflow.
  Existing floor/type/private-field query rejection remains covered.
- Contracts/runbooks/evidence: API/data/architecture/screen/components, frontend/
  backend startup/testing, harness/security/traceability/QA and local sprint status.
  Each new application module stays below the300-line responsibility trigger;
  test fixtures/migrations remain reviewed under their documented exemption.

## Runtime identity and limits

Windows; Node24.13.1/npm11.8.0,Python3.14.3 explicit backend/.venv,
PostgreSQL18.2,Playwright1.64.1. Installed visible Chrome155.0.8059.79 and
Edge155.0.4283.45; bundled Chromium156.0.8078.4,Firefox157 and WebKit27.2.
Real KAY ClamAV1.5.4 uses its existing pinned digest/cache and loopback3310;
signature28150 dated2026-10-11, not a guarantee of current malware coverage.
No ordinary development server, account seed, real-data import or deployment.
Actual Safari/iPhone/Android and assistive-technology user testing, measured
load/recovery and later SP-11–SP-22 workflows remain unverified/outside this slice.
