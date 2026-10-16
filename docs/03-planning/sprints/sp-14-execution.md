# SP-14 execution record

Status: technically_accepted; final scoped local gates pass on 2026-10-15
Date: 2026-10-15
Product review: pending Khalid, independently of technical acceptance

## Task and acceptance defined before implementation

Implement C01/C07/C13/C14, BR-06/16/30, S09/S17 and the SP-14 variants of
AT-16/40/23. SP-13's recorded technical exit is the entry baseline. Khalid
confirmed preserving the existing French KAY interface and the specified
desktop calendar/mobile agenda and administrator settings workflow.

Focused real-stack browser case: administrator configures synthetic Monday
09:00-18:00, lunch13:00-14:00 and capacity2; previews before saving. Agent books
office on a closed day/lunch, both off-site types inside working hours, and
reschedules each. Outside-hours/lunch/company-car-full errors cannot be overridden;
ordinary participant overlap requires an explanation. Colleague free/busy reveals
only intervals. Restricting policy reports future impacted visits without changing
their identities/status. Exercise stale versions, retained failure drafts,
same-key interrupted-response retry and manager/agent settings denial.

Backend checks additionally cover [start,end) hourly boundaries, Casablanca
repeated/skipped DST hours, real separate-connection last-slot races, current
authority after waits and replay, invalid windows/breaks/capacity/participants,
atomic rollback, immutable actor/history, contact transfer/merge/archive and
additive isolated migration preservation/downgrade refusal.

Technical proposals to verify: strict typed JSON contracts; bounded calendar
queries with numbered pages; explicit offset-aware UTC instants and a Casablanca
local-time ambiguity chooser; agency/current-user/policy/visit lock order;
append-only typed visit/policy history and existing scoped timeline/audit;
drafts hold no capacity and do not promise booking. No default working days.

## Scope, prerequisites and controls

Read-first: AGENTS, README, core scope, decisions, relevant business rules,
permissions/workflows, architecture/data/API/screen/acceptance contracts,
engineering/harness/QA/lessons/security, local roadmap and UI skill rules.
Use explicit backend/.venv for every Python execution. Reuse ignored authorized
local configuration without disclosing credentials. Verify database identities
before migration; never reset development. Database-writing suites run serially
under the existing51505005 test lease. Synthetic data only.

UI reads: antislop, design-system-ops and design-taste-frontend completely,
applicable geometry references, Impeccable new-work/Operate, responsive,
uncodixfy, React and Playwright guidance. Established operational-world extension,
not a redesign: design-taste's dense/admin/calendar/form exclusions apply;
marketing heroes/assets, concept tournament, comp, seed and QUALITY BAR are N/A.
Impeccable context already ran in this chat session; do not rerun or silently
initialize missing PRODUCT/design.json. Preserve shadcn/Tailwind/Lucide tokens;
calendar/agenda is a KAY composition, not a chart (Bklit N/A).
Antislop remains AFTER; no unselected aesthetic-only fixes.

No SP-15 reminder delivery, fleet allocation, production/cloud/real-data work,
external messages or expanded optional scope. Stop for genuinely new authority
or two/three focused fix cycles yielding no information.

## Verification ledger (chronological attempts; final closure below)

At initialization all SP-14 gates were pending: backend quality/full tests, PostgreSQL migration/races,
frontend lint/typecheck/build, five-target real-stack E2E, visible Chrome with
native desktop/mobile/state/keyboard/touch/200% evidence, security/privacy,
AFTER audit, fresh finish reviewer/documenter and documentation validation.
Do not mark sprint checkboxes accepted until the applicable evidence exists.

### Recorded attempts (not final acceptance)

- Read-only development baseline: kayrealestate/OID109060, cluster
  7607060034405909976,48 tables/head0015. Isolated test OID109061 is distinct;
 0016 adds8 tables, observed56/head0016. Unrelated catalogue hash remains
 `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
- Explicit-venv initial focused run:2 passed, cleanup FK error. Policy editor
  reference must be cleared before deleting a synthetic user; corrected helper.
- Next focused run:13 passed/1 fixture result-key error; corrected to the shared
  canonical contact-result helper. Subsequent scheduling15/15 passed23.97s.
- Migration+schedule16/16 passed45.10s, including populated0015 preservation
  and retained-history downgrade refusal. Expanded schedule/edges/HTTP/migration
  command:30/30 passed65.00s. Full regression on the final candidate is pending.
- Initial compiled Chrome run failed before product interaction because the
  existing private fixture accepts SP06-prefixed synthetic display names. Test
  input corrected without weakening its guard. Rerun:4/4 passed1.9m, covering
  all three types/reschedule/lifecycle, hard versus explained conflicts,
  administrator/settings/free-busy privacy and committed-response retry.
  Subsequent archived-contact/participant/version recovery additions require
  the final browser rerun; the earlier result is not presented as that rerun.
- Frontend lint/typecheck/build pass; latest candidate build
 `qoVRU5WuZmhn6IVZ29eZj`. Backend Ruff179 formatted files and strict mypy113
  modules pass after formatting corrections. Real headed review is pending.
- Both explicit-venv Python hash-lock audits report0 known vulnerabilities;
  pip check clean. npm runtime audit0; full npm audit retains9 inherited HIGH
  development-tool entries, not clean. tzdata2026.5 is now explicitly declared;
  both existing hash locks were regenerated with piptools, not global Python.
- Inspected timezone mismatch: Python tzdata2026.5, Node tzdata2025c and shared
  PostgreSQL differ for2026-10-15. Backend local resolution/projections avoid
  relying on those older client/database civil rules. No shared installation
  changed. See [the concrete contract](../../04-design/visit-scheduling-local.md).

Current runtime observations: Node24.13.1/npm11.8.0, Python3.14.3,
FastAPI0.143.1/SQLAlchemy2.1.4/Alembic1.20.0, pytest9.1.1,
Ruff0.17.0/mypy1.20.2/tzdata2026.5. Earlier SP-13 device/runtime observations
remain historical until the new browser targets are actually exercised.

### Subsequent verified checkpoints

Development additive migration0016 completed:48→56 tables, OID109060 and the
unrelated catalogue unchanged; Alembic check reports no new upgrade operations.
Isolated test remains OID109061/head0016. No development reset or staff seed.

First full explicit-venv command (`-m pytest --cov=app --cov-report=term-missing
-q --tb=short -x`):348/348 passed770.84s,94% coverage,0 failed/0 skipped. This is
the pre-lifecycle-correction baseline, not the final-source full rerun. Subsequent
review separated completion/cancellation outcome reasons from the prior overlap
explanation and bounded availability previews to the actual7-day visit limit.
The expanded affected command (schedule, edges, HTTP, migration):31/31 passed
57.98s, including a synchronized policy restriction versus booking, preserved
terminal overlap explanation and real booking over the skipped DST hour.

Frontend functional recovery now includes archived-contact read-only rendering,
removal of old ineligible participants after transfer, explicit draft-preserving
version comparison, terminal-dialog focus fallback and disabling refresh during
editing. Lint/types/build and the real browser gates must cover the final source.
No visual inspection round, detector, AFTER audit or finish handoff has run yet.

The explicit-venv editable package was reinstalled with `--no-deps
--no-build-isolation`; pip check/audits remain required at final handoff. Both
hash-lock audits already report no known vulnerabilities. Node runtime audit0,
full9 HIGH dev-tool advisories remain open. Real ClamAV is healthy on loopback3310
for inherited file regressions; its cache and shared PostgreSQL will be preserved
when project services are stopped at completion.

### Headed review corrections before visual inspection

The first native geometry attempt incorrectly measured Radix's hidden checkbox
proxy rather than its clickable label. The corrected assertion covers both the
visible button and native proxy through the same real44px label target; it does
not exempt an undersized visible control. A subsequent actual calendar check
found the shared single-digit numbered page button37.63px wide. Its local shared
composition now applies the existing `min-w-control` token. The next touch
assertion incorrectly selected the first eligible colleague, an unchecked
administrator, rather than the visit's selected agent. Native event diagnostics
proved the label correctly toggled that box. The test now names the exact actor
and asserts its initial checked state. Explicit stable Checkbox id/Label htmlFor
was retained as the standard accessible association; it is not falsely credited
with fixing the test's wrong-actor selection.
These are functional/accessibility corrections, not AFTER aesthetic selections.
Each failed invocation is retained, not counted as a passed workflow. No main
batched visual inspection has run yet; final native evidence must be complete.

The post-pagination lint/typecheck/build command passes; final source also needs
the participant-association build and real workflow rerun. Backend final quality
passes: Ruff179 files formatted/check clean, mypy113 modules, pip check clean.

### First valid headed checkpoint and main visual round

Compiled build `0leBHja-rs4ZKz21C7tSq`: headed workflow1/1 passes44.9s test,
59.4s total,0 skipped.20 native CDP captures were all opened in one main batched
inspection. Empty/configured policy, create, actual pending request, confirmation,
required cancellation reason, hard lunch, explained overlap, desktop calendar,
mobile agenda/detail, retained outage,320px, repeated/skipped hours, policy impact,
role/private denial, safe busy and actual200% show their named states.
Canonical desktop/mobile hashes match their native calendar counterparts.
No new UI source defect or aesthetic rewrite was selected in that inspection.

Measurements: settings minimum text contrast5.814:1, calendar6.113:1,
dialog6.484:1; minimum control target44px, desktop dialog padding24px,
horizontal page/dialog overflow0 across320/360/390/768/1024/1440. Actual Chrome
zoom DPR2→4 and innerWidth1427→713, not CSS simulation. Unexpected page/console
errors0; exact deliberate overlap409, reschedule network abort and private404
are recorded separately, not ignored general errors. Selected participant label
native touch, Enter/Tab/Escape/focus return and terminal heading focus pass.

One detector on19 changed source targets returns[]/exit0, saved to
`.impeccable/sp14-detector.json`; no second detector. The five-target65-case
schedule/ownership/shell matrix is running serially. Before final handoff, the
headed evidence will additionally cover administrator settings at320/390/768,
the explicit busy refresh and a readable scrolled200% form capture. This is
closing named coverage gaps, not another styling pass. AFTER/fresh reviews and
the final backend full regression are still pending.

### Final main UI evidence and separate inherited restart investigation

The expanded headed case passes1/1,48.3s test/1.1m total,0 skipped on the same
compiled build. All23 refreshed native files were opened in the second/final
main inspection. Added actual administrator settings320/390/768, busy refresh,
stale version409/current comparison preserving the draft and a scrolled200%
form capture pass without a UI source change. Canonical hashes match. AFTER014
has0 new aesthetic findings. The required fresh independent finish reviewer is
working from the complete packet; no main-thread self-approval or new polishing.

The initial65-case matrix stopped14 passed/1 failed/50 unrun4.9m. The inherited
SP-06 contact-history outage case saw readiness503 after restarting its API and
failed the original5s polling assertion. An unchanged focused Chrome rerun
reproduced13.3s; no timeout or product assertion was weakened. Bounded diagnostic
observations now compare direct liveness and facade readiness while retaining
that original failing assertion. Final clean matrix/full backend still required.
Python hash-lock audits again report0 known vulnerabilities; npm runtime0,
full9 inherited HIGH development-tool advisories remain, not a clean full audit.

The diagnostic variant passed the original assertion, but its extra liveness
request changed polling timing, so it is not called an unchanged clean rerun.
A separate lease-guarded direct HTTPS/PostgreSQL startup probe measured4466ms
and1718ms. Source inspection confirms the private supervisor acknowledged spawn
before HTTPS listening and its stop acknowledgement could precede completion of
the Windows tree-kill command. The supervisor now waits for CA-verified bounded
real liveness (10s fail-closed limit within its existing15s control deadline)
and exact owned-tree termination. It does not seed, mock success or relax the
original same-origin readiness assertion. Diagnostic test changes were removed;
the original case is being repeated three times, then the clean matrix reruns.
This is a test-process lifecycle correction, not a claimed product startup SLA.

The original unchanged contact-history recovery case now passes3/3 consecutive
compiled Chrome repeats59.5s total,0 skipped. The complete65-case five-target
matrix is rerunning. Supervisor SHA256:
`A6FC2B965448B2388C41AEF330E4EF1EEE5619A58C13FB87B1B997767AE1D081`.
No diagnostic instrumentation remains in the existing test. Application source
and compiled UI remain unchanged from the23 captures.

Fresh full UI finish review returns **ship** at its actual supplied interface
scope: all23 captures valid, canonical hashes match, no material fixes. Generic
persistence still fails on pre-existing absent PRODUCT/design.json; scoped
incumbent persistence passes. The documenter adds one factual scheduling
composition section to ui-components.md and its report, preserving DESIGN,
tokens and implementation. No human product/design approval or full technical
pass is inferred. Reports: `.impeccable/sp14-finish-review.md` and
`.impeccable/sp14-documenter.md`.

Engineering review triggers: the command/apply functions intentionally keep the
single transaction's authority, version, capacity, participants, history and
receipt ordering together; splitting them into tiny wrappers would obscure the
atomic boundary. Policy/rules/records/queries/router remain separate modules.
Long migration SQL and acceptance fixture files are explicit migration/test
exceptions, not new giant production services. Revision0016 was frozen before
development publication; later lifecycle corrections changed application code,
not the applied DDL. No framework, broker or shared-runtime replacement.

Privacy checkpoint: configured facade-secret scan4 roots/283 browser JS/0
matches; direction-contract phrases match0 source/static/server-app artifacts.
10 representative private/generated paths are ignored and0 tracked. These are
bounded scans, not a claim of arbitrary-secret detection or a final report audit.

## Security boundary review

The current backend's expanded31-case scheduling command passed before the
browser-only harness changes. The final full backend/real-file regressions are
still separate gates. No credentials or raw private records enter this ledger.

| Boundary | Concrete verified case / retained limit |
|---|---|
| Current permission | Agent/manager policy writes denied; copied private visit IDs/history excluded; contact scope before counts/pages; transfer/archive/replay and current role after a real lock wait tested. Participation grants no extra access. |
| Strict transport | Real session/facade/Origin/CSRF, bounded bodies/pages/periods, unknown-field/duplicate-query rejection, UUID retry identity and safe404/409 projections tested in test_schedule_http.py and strict-input cases. |
| Transaction integrity | Two synchronized real last-slot waiters yield one success; policy restriction versus booking serializes and requires fresh review when needed. Before-commit rollback and committed-response same-key replay leave one visit/event, not partial participants or duplicates. |
| Scheduling authority | Both off-site work/lunch gates and car-only agency capacity recheck on mutation; ordinary explanations cannot override them. Draft/terminal exclusion, exact half-open hour endpoints and real repeated/skipped DST booking tested. |
| Retention/provenance | Immutable original organizer/contact/actor snapshots, matching per-version events/participants, raw-SQL history/window negatives, merge preview binding/reparenting and retained-history downgrade refusal tested. Development is never reset or seeded. |
| Private/shared data | Busy items have exactly start_at/end_at/busy; safe capacity numbers expose no title/contact/address/private identifier. Strict server-only frontend projection and bounded client/artifact scans supplement, not replace, backend authority. |
| Explicit exclusions | No external message, real-data import/export, fleet assignment, reminder consumer, production role/ACL assessment, load/RPO/RTO result or real-device Safari/assistive-technology certification is claimed. |

Preserve the actual policy/advisory/dependency risks and product-review status
when recording final technical acceptance; this review is not a whole-CRM seal.

## Clean matrix checkpoint

The complete compiled schedule/ownership/shell rerun passes65/65 in21.7m,
0 failed/0 skipped, exit0.13 cases per actual configured target: Chromium,
Chrome, Edge, Firefox, WebKit. This supersedes the failed attempt as the clean
result without erasing that attempt. Original inherited recovery assertion
passes on every target after the supervisor lifecycle correction.
Post-matrix HTML report privacy audit:4 JSON entries/65 result step arrays/
0 detailed arrays; test-results contains only .last-run.json.291 application/
migration source hashes remain unchanged through the run:
`6BCEB5FB6BA0B2096C41C463CBE0739A8480C854346D7FE3AD9F08A4400CC77E`.

Actual installed targets were launched and queried separately after the matrix:
Chromium156.0.8078.4, Chrome155.0.8059.79, Edge155.0.4283.45, Firefox157.0,
WebKit27.2, with Node24.13.1/Playwright1.64.1. These are local engines, not
real-device Safari. Real development HTTPS smoke also passes with explicit CA,
direct readiness denial, database readiness, no-store and untrusted-CA refusal.
Its exact owned temporary8000 process was stopped; no development record write.
Read-only development count:53 business record tables/0 rows/bootstrap unset,
intrinsic policy version1/capacity2/editor unset/no work or lunch rows.

The declared broader Chrome selection lists14 cases in7 files. It is running
before the final full explicit-venv backend regression in one serialized shell;
the backend starts only if Chrome exits0. No database-writing overlap. Final
technical acceptance, cleanup/shutdown and documentation gates remain pending.

Broader Chrome progress: the actual private/shared clean/rejected file case
passes43.2s with healthy real ClamAV. A non-fatal Windows Proactor connection-reset
10054 callback warning follows the file case, as seen in earlier scoped local
evidence. Its cause is not asserted; no exception handler/assertion was relaxed
or logging suppressed. The subsequent inventory/outcome cases pass. Final
broader/full results remain required; this warning is retained as a local risk.

The complete broader compiled Chrome selection passes14/14 in5.3m,0 failed/
0 skipped/exit0: four SP-11, three SP-12, three SP-13, and one each hierarchy,
real protected files, inventory and requirements. The one non-fatal Windows10054
warning above remains recorded, not suppressed or called a failed assertion.
The final full backend command has started only after browser supervisor teardown.

Final runtime metadata observations: Python3.14.3, FastAPI0.143.1,
SQLAlchemy2.1.4, Alembic1.20.0, pytest9.1.1, Ruff0.17.0, mypy1.20.2,
tzdata2026.5, psycopg3.3.6, Pydantic2.14.1, Uvicorn0.54.0. Shared PostgreSQL
reports18.2 on unchanged development OID109060. Actual container daemon reports
ClamAV1.5.4/definitions28154 dated2026-10-15 06:24:22; this is a local observation,
not production signature-freshness or deployment certification. The image remains
the pinned project Compose image and the service was healthy for regressions.
No global Python install or shared database timezone/runtime update was performed.

## Final technical closure (2026-10-15 UTC)

All applicable SP-14 local technical gates pass. The chronological pending/failed
entries above are retained as attempts, not the current acceptance status.
Product/design review remains pending Khalid. SP-15–SP-22 are not implemented.

- Final full backend: from backend, explicit `.venv/Scripts/python.exe -m pytest
  --cov=app --cov-report=term-missing -q --tb=short -x`, 349/349 passed in 685.01s,
  0 failed/0 skipped/exit0, 94% coverage (5566 statements/335 missed). Includes
  the expanded 31 scheduling cases and all earlier modules, real PostgreSQL,
  ClamAV, migrations and synchronized separate-connection races. This is the
  final-source result, superseding the initial348-case baseline.
- Final frontend: lint/typecheck/optimized build pass; build
  `0leBHja-rs4ZKz21C7tSq` is the actual compiled stack used for clean 65/65
  five-target checks in 21.7m, broader Chrome 14/14 in 5.3m and final headed 1/1.
  All final commands exit0/0 skipped. The separate original restart case also
  passes3/3 after the test-only lifecycle fix. App source was not changed to
  make a readiness assertion pass.
- UI: all23 final native captures inspected in the final main batch; geometry,
  keyboard/native touch/actual200%, loading/empty/invalid/hard conflict/ordinary
  explanation/denial/outage/version-retry states pass. The required skills kept
  this within the existing KAY interface: no new palette/font/library, existing
  geometry/tokens/shadcn primitives, custom calendar as an operational composition,
  Bklit N/A. One detector `[]`, AFTER014 zero new aesthetic findings, fresh UI
  finish reviewer ship and factual documenter section. No human approval inferred.
- After pytest released the isolated lease, the identity/root-guarded existing
  synthetic cleanup/reconcile helper removed0 rows/0 old orphan objects. All53
  record tables empty/bootstrap unset, singleton policy version1/capacity2/editor
  unset/no work or lunch rows. Development was inspected, never reset or seeded.
- Final explicit-venv inspect_database and Alembic check both exit0 for development
  and test:56 tables/head0016_visit_calendar/no new upgrade operations. Development
  OID109060/test109061, cluster7607060034405909976 and unrelated catalogue hash
  `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
  unchanged. Development48→56 additive migration and isolated populated migration
  preservation/downgrade-refusal evidence remain valid.
- Final privacy: configured-secret scan4 roots/283 browser JS/0 matches; latest
  broader HTML report8 JSON entries/14 result step arrays/0 detailed arrays.
  test-results contains only .last-run.json;10 representative private/generated
  paths ignored/0 tracked. No real credentials/private records in evidence.
- `docker compose -f backend/compose.clamav.yaml stop` exits0. Container exited143
  after the requested stop, cache/volume retained. Six project ports3000/8000/
  3100/8100/8101/3310 have0 listeners and root-identified service processes0.
  Shared PostgreSQL5432 remains listening; unrelated Docker/apps preserved.
- Final291 application/migration files retain SHA256
  `6BCEB5FB6BA0B2096C41C463CBE0739A8480C854346D7FE3AD9F08A4400CC77E`;
  test supervisor retains
  `A6FC2B965448B2388C41AEF330E4EF1EEE5619A58C13FB87B1B997767AE1D081`.
  No rebuild with an untested replacement build ID, stage, commit or reset.

Retained non-blocking local risks are explicit: full npm audit9 inherited HIGH
development-tool entries (runtime0, Python locks0 known); one non-fatal Windows
Proactor10054 callback warning in the passing real-file browser regression;
pre-existing absent generic Impeccable PRODUCT/design.json metadata. No suppression,
forced dependency downgrade or broad repair. Backend civil-time authority avoids
the observed stale Node/PostgreSQL zone rules, but future timezone/runtime updates
and Linux/production deployment need their own verification. No real-device
Safari, assistive-technology, load, RPO/RTO, backup/restore, external website or
whole-product acceptance is claimed. SP-15 reminders and later modules remain out.

Final documentation validation exits0:22 sprint specifications,1090 local links/
anchors (including70 approved installed-skill links),41 acceptance mappings,
13 synchronized Mermaid pairs and9 valid API JSON examples. SP-14 has25 checked/
0 unchecked criteria. `git diff --check` exits0, but the repository has17 untracked
entries/0 tracked changes, so that is not a meaningful tracked application diff
audit. All existing untracked/user files are preserved; nothing staged or committed.
The [QA register](../../QA_COMMANDS.md#sp-14-final-verification-2026-10-15-utc)
is the repeatable command index. The copywriting check kept final claims tied to
observed commands/results; it did not authorize an aesthetic change or alter UI.
