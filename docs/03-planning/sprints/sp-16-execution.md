# SP-16 execution record

Status: technically_accepted at the scoped local SP-16 boundary
Date: 2026-10-15
Product review: pending Khalid, independently of technical acceptance

## Defined outcome and focused E2E before implementation

Implement C09/C08/C13/C14, BR-13/14/15 and AT-13/14/15/23 variants in the
existing French KAY deal detail. Khalid confirmed a manager/administrator-only
Finance tab: optional fixed/percentage commissions with an explicit base,
separate recognition, partial receipts, explained corrections retaining originals,
and financial review after reopening. Ordinary deal closing remains commission-free.

Focused synthetic E2E: manager opens a permitted deal, creates an expected fixed
commission10000.00 MAD with explicit base, recognizes it, records2500.00 and sees
7500.00 remaining.7500.01 is rejected without a receipt; correct the first receipt
with a reason and verify original/replacement/current balance. Exercise percentage
ROUND_HALF_UP, reopen with retained finance/review, agent UI/API denial, retained
failure draft/idempotent retry and deliberate stale-version comparison.

## Safety and implementation boundaries

Use existing backend/.venv explicitly for all Python/tools/migrations/subprocesses,
authorized ignored configuration and real isolated PostgreSQL. Never reset/seed
development, print credentials or use real client records. All DB-writing suites
remain serial under the shared advisory lease. Preserve unrelated untracked files.
No banking/payroll/accounting, external messaging, new broker, chart or dependency.

Money is strict decimal text/Decimal/numeric, never a binary float. Preserve exact
base/rate, calculate with sufficient Decimal precision and round the final MAD
amount once using ROUND_HALF_UP. Balance is derived, never directly editable.
Current manager/administrator authority must hold after waits and before replay.
Use row/version locks, immutable revisions/receipts, linked corrections and atomic
audit/retry receipts. Agent ordinary deal data must contain no finance fields/counts.

Technical proposals to verify: current commission snapshots use append-only
revisions; receipt corrections append a replacement or explicit void linked to the
original. Reopening appends a review request without changing financial terms or
receipts. A reasoned commission correction can acknowledge this review. Explicit
amount/base/rate/date precision/ranges are transport/storage limits, not new business
policy. Document concrete bounds with implementation evidence.

## Focused verification plan

Khalid explicitly requests faster, necessary-only tests. The shared gate permits
relevant suites and retaining recent evidence for untouched boundaries. Therefore:
run finance unit/API/PostgreSQL/migration/race/retry tests and existing affected
outcome/reopen tests, not the full372-test baseline or unrelated file/calendar
matrices. Run backend Ruff/format/mypy, frontend lint/types/one optimized build,
focused finance real-stack browser cases on configured targets and one interacting
visible Chrome workflow with desktop/mobile/states/keyboard/touch/actual200%.
Run changed-surface privacy/security checks, additive schema checks and guarded
cleanup/shutdown. Rerun only failures or affected code after a correction. SP-22
still owns the complete applicable suite; do not imply it ran here.

## UI applicability

Required antislop/design-system-ops/design-taste-frontend read completely with
applicable references; design-taste marketing/concept/assets exclude this dense
product/admin finance surface. DSO owns incumbent geometry; Antislop remains AFTER.
Impeccable Operate is an ordinary narrow existing-world extension. Context already
ran in this chat; no repeat, generic metadata repair, new world/comp/seed exercise.
Use shared shadcn/Tailwind controls, local system sans and existing semantic tokens.
Bklit N/A without charts. Required fresh finish reviewer/documenter remain scoped
handoffs, not product approval. Two main visual batches maximum, one detector only.

## Implementation and focused checks

The concrete [finance contract](../../04-design/commissions-local.md) records the
strict wire shapes, exact bounds/rounding policy, derived leaf-receipt balance,
immutable correction/void links, current-role authorization and reopen review.
New backend app/finance (seven files), four-table0018 migration and matching
frontend features/finance (eight files) extend the existing deal detail/facade.
No dependency/token/CSS/chart, worker/broker or generic editable balance is added.
Guarded synthetic fixture cleanup now deletes finance before its retained parents.
The cohesive atomic apply function exceeds50 lines: its explicit command branches
share one head/revision/receipt transaction; separating one-line wrappers would
obscure that invariant. Routes/projections/authority/calculation remain separate.

Initial backend16/16 passed17.32s; expanded22/22 passed39.53s,0 skipped.
These are incremental overlapping checks, not38 distinct tests. They include
Decimal edges, HTTP/session/CSRF/agent denial, two actual blocked connections,
over-collection, revoked authority before old retry, rollback/retry, retained
won-reopen facts, raw SQL immutability/balance and populated0017→0018 upgrade.
The later administrator/proof/archive/merge case uses clearly labelled synthetic
metadata only; it is not a new antivirus scan. Recent SP-15 real ClamAV/file
boundary evidence is retained because those implementation paths are untouched.

Frontend lint/typecheck/optimized build pass. Initial focused Chrome2/2 passed
50.5s; five-target finance10/10 passed3.5m (Chromium/Chrome/Edge/Firefox/WebKit),
0 failed/0 skipped. Actual actions cover optional closing, exact percentage,
recognition,2500 partial receipt/7500 balance, rejected7500.01, retained correction,
reopen review, agent UI/API denial, committed-response-loss same-key retry and
deliberate stale-version comparison with retained input. No legacy full matrix
or372-case backend suite was rerun or claimed as a fresh SP-16 result.

First headed attempt reached denial then failed a strict test selector matching
both the intended alert and Next's hidden route announcer. Narrowing to the actual
French denial preserves the assertion; corrected headed1/1 passed38.8s (25.4s
case), Chrome155.0.8059.79,0 unexpected console/page errors. Deliberate endpoint
409/connection abort/403 are separately recorded. Real geometry: contrast minimum
5.814:1, controls≥44px, dialog24px, page/dialog overflow0;320/360/390/768/1024/1440,
native touch, keyboard Enter/Tab/Escape and focus return. Actual200% measured
DPR2→4 and innerWidth1427→713; no CSS scaling or injected screenshot pixels.

Main visual batch1 opened all14 captures. It found a material financial-copy
ambiguity: a receipt event displayed the commission snapshot amount directly
after its event label. The final batch labels that amount explicitly as commission,
and improves first-invalid-field focus plus separate/associated receipt versus
correction reasons. A clipped CDP full-document zoom capture is invalid evidence;
the final review uses a native viewport capture instead. This is capture repair,
not evidence of a page overflow (the real geometry assertion passed).

The additional backend fixture first omitted the required manager-selected primary
agent, then put that field on the wrong outer enquiry shape; both failed attempts
had20 passing/1 failing and stopped before remaining cases. The fixture now uses
the actual agent create workflow. No application authorization or validation was
relaxed. Corrected final focused backend/browser results follow below.

## Final focused verification and safe local state

All commands use real manifests and backend/.venv/Scripts/python.exe. Final
backend command from backend/:

    .venv/Scripts/python.exe -m pytest tests/test_finance.py tests/test_finance_edges.py tests/test_finance_http.py tests/test_finance_migration.py tests/test_outcomes.py tests/test_outcome_edges.py tests/test_outcome_sql.py -q --tb=short -x

Result46/46 passed79.77s,0 failed/0 skipped. This includes23 new finance cases
and23 relevant existing outcome/reopen variants; no full-suite coverage claim.
Ruff check/format-check exit0 (211 files); strict mypy app exit0 (132 modules).
Frontend npm run lint/typecheck/build all exit0. After the functional batch,
compiled Chrome finance2/2 passes44.7s and headed1/1 passes38.2s. All14 captures
are refreshed/validated in main batch2; repaired actual200% viewport2854x1702 is
valid. No remaining builder polish/detector loop. One detector12 targets returns[].
[AFTER016](../../../anti-slop/audit-016-2026-10-15.md) records0 new aesthetic
findings, explicit per-item UI gate and actual control results. Fresh independent
finish review/documentation remains separate until its outcome is recorded.

Build nHgjg13i2SL1cXdPtpXo5 and327 application/migration files retain SHA256
107DB3ABD518B7F857BFB137363C2D0BC2F31896439BA8EEDF3EF28C401147FE.
No source change occurs during final migrations/smoke/cleanup. No new dependency;
recent SP-15 npm runtime0/full9 inherited HIGH development-only advisories and
Python locks0 known findings are retained unchanged, not claimed freshly rerun.

Guarded development preflight: OID109060,59 tables/head0017,56 old record tables/
0 rows/bootstrap unset. Additive0017→0018 preserves all existing tables and adds
four,63 total/60 record tables. Development and isolated test OID109061 both pass
alembic check (no new upgrade operations), head0018_commissions_collections and
inspect_database. Cluster7607060034405909976 and unrelated catalogue SHA256
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 unchanged.
No development reset, seed or record export. Populated isolated upgrade and
history-bearing downgrade refusal pass in the focused tests.

Owned temporary development HTTPS smoke exits0: explicit CA, live/ready,
direct403, no-store and untrusted-CA refusal. Only that process tree is stopped
in finally. Final guarded isolated cleanup verifies exact target/cluster/private
test root, advisory lease and synthetic-only guard:1 residual synthetic row
removed,0 old orphan objects,60 record tables/0 rows/bootstrap unset. Read-only
development counts also60/0/bootstrap unset; policy version1/capacity2/editor
unset, no working/lunch rows. No development record was removed.

Privacy: final browser report2 JSON/1 result array/0 detailed arrays; only
.last-run.json remains in test-results. Client scan4 roots/282 JS/0 configured
facade-secret matches. All10 checked private/generated paths ignored/0 tracked.
Human product/design review, real-device Safari/assistive technology, production,
load, recovery and complete CRM acceptance remain pending. Generic PRODUCT/
design.json metadata drift is inherited, not repaired or called complete.

## Independent review correction

The fresh full UI review validates all16 originals/canonical files and returns
fix for one P2 functional-copy finding: the ordinary pipeline still describes
commissions as future SP-16 work. Replace only that sentence with current
role-appropriate optional-finance guidance; correct adjacent visit/task copy is
preserved. No layout, permission, accounting rule or aesthetic-only change.
Rebuild/source hashes and same-path recaptures supersede the earlier build below.
No second detector or broad builder polish is run. A verdict pass scores only
this fix, not a new whole-surface approval.

The added agent-page geometry assertion initially counted the existing clipped
sr-only native file input as a1×1px touch control. Source confirms tabindex=-1
and the visible “Choisir un fichier” button proxy. Geometry now excludes CSS
zero-clipped elements, still measures every actual rendered button/input/select/
textarea, and retains the ≥44px assertion. No file UI/CSS or console assertion
is relaxed. The failed run is retained; the corrected headed result follows.

Final measurement explicitly resolves that sr-only tabindex=-1 file input to
its visible same-fieldset chooser button; missing proxy would still measure
the original1px input and fail. The intermediate generic CSS clip check did
not recognize the framework's clipping implementation and failed identically;
it was replaced, not represented as a passing rerun. Actual visible-target44px,
contrast, overflow and console assertions are retained.

Final lint/types/build exit0. Corrected headed1/1 passes39.0s (26.3s case),0
failed/0 skipped/0 unexpected errors. The new agent guidance is visibly asserted;
only its one sentence changed in application source. All14 images refreshed and
opened again for capture validity, not another builder polish round. Build
2sQCC1Lb3eIrWjWd7hTMQ;327 source/migration files SHA256
D5122B15B9E8E6C4CE5C77E1A3D022A5D8D629166A7046C7016EF3C57BAA16CB.
The earlier46-case backend/10-case five-target/2-case final Chrome gates remain
valid for unchanged behavior; no full rerun is inferred after this copy-only fix.
The fresh reviewer receives a one-item scored verdict request over the updated
evidence. Generic metadata drift/human approval remain outside that verdict.

## Technical acceptance and handoff

SP-16 is technically accepted locally on2026-10-15 UTC. The fresh review preserves
its full five-section evaluation, validates all16 refreshed files and scores its
single requested fix RESOLVED/ship. This is a scoped verdict, not a new full-surface
or human approval. The fresh [documenter](../../../.impeccable/sp16-documenter.md)
compares current source/canonical samples against the incumbent system and adds
only factual [component composition](../../04-design/ui-components.md#sp-16-optional-commission-and-collection-composition).
DESIGN/tokens/application source remain unchanged by documentation. Missing
PRODUCT/design.json and stale pre-installation system prose are disclosed, not
repaired or called a passing generic metadata gate.

Final46 focused backend cases,10 retained five-target variants, final affected
Chrome2/2, final headed1/1, lint/types/build, Ruff/mypy, exact PostgreSQL schema/
migration/retention, scoped security/privacy, cleanup and documentation gates pass
at their recorded boundaries. No required failed/skipped check is represented as
passed. The failed fixture/selector/measurement attempts and corrected reruns are
retained. Full-product suites, load/recovery/production and human/device approval
remain pending; no claim that the whole CRM is100% complete.

Six project ports3000/8000/3100/8100/8101/3310 and root-identified project service
processes finish at0. ClamAV remains exited143/cache retained; it was not needed
or restarted for this slice. Shared PostgreSQL5432 (2 listeners), unrelated
containers/services and development records are preserved. Final guarded test
cleanup leaves60 record tables empty; development likewise60/0/bootstrap unset.
Privacy remains0 configured-secret matches/0 detailed report arrays/10 ignored
private/generated paths, with only.last-run.json in test-results.

The current contract/API/data-model/screen-map/security/traceability/QA/index/
roadmap/backlog are synchronized. No Git staging/commit/reset was performed;
17 untracked root entries/0 tracked changes make git diff --check insufficient
as a tracked application-diff review. All edits preserve unrelated user files.
Next safe product action: review optional finance in the existing French deal
detail. SP-17 may proceed after this technical exit under its own request; it
has not started. Product acceptance authority remains Khalid.

Final documentation validation exits0:22 sprints,1110 local links/anchors
(including70 installed-skill links),41 acceptance mappings,13 synchronized
Mermaid pairs and10 valid API JSON examples. SP-16 has23 checked/0 unchecked
criteria. git diff --check exits0 with the untracked-worktree limitation above.
The required fresh documenter writes only its outcome and one factual component
section; no subsequent application/system change. Final source hash remains
D5122B15B9E8E6C4CE5C77E1A3D022A5D8D629166A7046C7016EF3C57BAA16CB.
