# SP-19 execution

Status: technically_accepted; scoped local gates passed; product review pending Khalid.
Date2026-10-15 UTC. C11/C14/C02/C04/C13, BR-04/06/21/23, AT-22/23/24/29.
SP-18 technically accepted. User requests necessary-only checks, not full CRM.

## Outcome and focused E2E defined before implementation

Existing French KAY interface: contextual scoped search dialog, numbered results
with explicit kinds; M/A Leads export action/status/protected download; reasoned
recoverable inventory lifecycle confirmations; M/A Dashboard audit context.
Settings remains administrator-only. Preserve all accepted contact lifecycle,
stock commitments, immutable business/financial evidence and true audit actors.

Synthetic real-stack scenario: manager searches across contact/enquiry/deal and
shared inventory/document names, agent sees only current private scope plus safe
inventory. Counts and deep empty pages obey the same scope/stable order. Manager
exports current filtered Leads, waits for PostgreSQL worker, downloads formula-
safe UTF-8 CSV with phones forced to text; revoked authority during generation
or before delivery denies bytes. Same request key and worker interruption cannot
duplicate results. Archive/restore a safe asset/contact, reject active stock/
unsafe parent archive and retain links/history. M/A inspect numbered audit;
agent denied before lookup. Controlled24-month security-only retention preserves
boundary/recent logs and every business/finance fact. Necessary migration,
backend/API/race/clock, compiled browser and visible Chrome/state/geometry checks.

## Proposed technical boundary

Reuse PostgreSQL outbox/job and private UUID storage, not a new broker/library.
Persist export request filters/retry identity, originating session, safe status,
generated-object hash/count and session-bound short-lived delivery permit.
Export only current-authority contacts/enquiries, no finance/notes/documents or
inventory export. Recheck originating session before generation/publication and
current requesting M/A before delivery. Fixed generated columns; formula-risk
cells and phones use apostrophe text prefix, never spreadsheet formulas.
Proposed output ceiling50,000 rows/20MiB, no silent truncation; documented failure.
Search is paged over safe typed projections with scope before count/projection;
hierarchy/type results navigate to actual inventory, never fictitious stock.
Measure query plans before choosing scoped indexes, no new DB extension assumed.
Retain conservative parent archive guard and no cascade. Security retention is
only named identity/user audit actions older than24 calendar months with no
business target; no automatic contact expiry or business/finance purge.

## Boundaries and work loop

No real-data export/import, production, external message, cloud, destructive
development action or SP-20+ implementation. All Python explicitly backend/.venv;
isolated DB writers serial under shared lease; populated migration before
additive development upgrade. Preserve existing untracked user tree, no commit.
Required antislop/system-ops/design-taste read; existing Operate1/1/1, dense
table/admin/form marketing exclusions. Responsive/React/uncodixfy/Impeccable
supplement. Narrow extensions, not shared-shell/V3 redesign or missing-metadata
repair. AFTER aesthetic fixes require numbered human selection. Fresh required
finish/documentation handoffs follow bounded batched native inspection.

Actual changes, commands, failures/corrections/results and remaining limits
will be recorded below; this plan is not passing verification evidence.

## Implementation and focused verification

New backend discovery contracts/search/audit/export metadata/CSV/worker/permit/
routes and explicit confirmation-only retention CLI. Migration0020 adds export
evidence, strict outbox typing and physical archive/current-stock guard;
0021 adds measured partial active-grant and stable audit indexes. Contacts
share their existing list query with CSV; private reconciliation retains
published exports. Existing contact lifecycle and conservative development
archive guard are reused, not replaced. Property/unit filters and protected
file authorization respect physical archival. No dependency/lock changes.
[Concrete contract](../../04-design/discovery-contract.md).

French header search Sheet, Leads/Contacts whole-filter export confirmation,
durable own-job status/download, inventory reason/version lifecycle, archive
filters and Dashboard M/A audit added. Account/schedule Settings remains admin.
No new visual identity, chart, raster, CSS framework or component kit.
Registered .impeccable/sp19-direction.md is confirmed incumbent Operate1/1/1;
mandatory three skills and relevant references read. Design-taste excludes
dense CRM table/admin/forms; Impeccable/responsive/React/uncodixfy supplement.
All9 approved PNGs and incumbent SP18 capture opened before UI work.

Backend final focused command from backend/:
.venv/Scripts/python.exe -m pytest tests/test_discovery.py
tests/test_discovery_http_migration.py tests/test_discovery_plans.py
tests/test_contacts.py tests/test_ownership.py tests/test_developments.py
-k 'discovery or scoped_filters or archive_restore or restore_repairs'
-q --tb=short -x -s
Result27 passed/51 deliberately deselected/0 skipped37.76s. The selected slice
includes12 formula values (including Unicode/control/BOM prefix), primary/
collaborator scope and immediate revocation, safe document names/counts/stable/
deep pages, filtered private CSV/phone text, lost key/worker fencing/retry/
byte limit, generation and delivery revocation, real archive-vs-campaign
race, safe property/contact/development lifecycle, exact leap24-month boundary,
strict facade/CSRF/query/Origin/binding/single-use transport, actual shared
worker CLI, populated0019 upgrade/facts preservation and downgrade refusal.
Earlier narrower passes are overlapping:19/34.96s,20/40.42s,22/40.64s, CLI1/4.99s.
Final Ruff check/format check/mypy pass:246 files/157 typed app modules.
Alembic isolated upgrade/check returns no new operations. No development
upgrade or retention execution is implied by isolated results.

First successful EXPLAIN ANALYZE/BUFFERS comparison used4,000 contacts/grants
(40 for searched actor) and4,000 audit events; selected indexes used.
Scope3.578→2.707ms and audit1.163→0.099ms. Original printed fixture count was
mislabelled1,000; SQL was4,000 and label is corrected. Probe/candidate DDL
rolled back. Final rerun already has migration0021 indexes, so its before/
after timings are warm-plan checks, not another improvement claim.15-second
timeout applies only to synthetic diagnostic fixture validation, not product
query settings or a broad volume benchmark.

## Corrected attempts, not waived failures

Direct-worker test found immediate dispatch availability could be later than
its claim clock; explicit available_at fixes first-pass readiness. Another
found autoflush clearing a running job's lease before state change; transition
now updates a valid state before authorization query. CSV byte accounting is
bounded/chunked, not repeated whole-file encoding. Retention action names now
match actual bootstrap/user operations. Deferred archive guard assertion must
include transaction commit, and privileged contact fixtures need an agent.
Plan fixture supplied explicit SQL version/phones, analyzed phone statistics
and bounded diagnostic timeout before flushing deferred constraints.
Index metadata uses a SQL descending expression, not a desc() SQL function.

Browser locator corrections distinguish contact/enquiry hits sharing a label
and Next's live route announcer from actual alerts. Export waiting observes
server state before UI refresh. One subsequent15-second queued deadline failed
without a captured worker cause; no arbitrary sleep or weakened assertion was
added. Authenticated test-only supervision now reports only safe worker
running/exit/allowlisted failure codes, never raw stderr or records.
Actual CLI1/1 and subsequent compiled2/2 and headed1/1 publish/download correctly;
the earlier intermittent failure remains disclosed, not invented as a diagnosed
product defect. Production worker/queue metadata remains authoritative.

Compiled discovery2/2 passed45.3s on Chrome before the final small retry/copy
corrections. First headed1/1 passed29.1s (40.9s total), native Chrome155.0.8059.79,
six widths320/360/390/768/1024/1440,44px controls/no overflow, minimum measured
contrast6.113:1, actual200% DPR2→4/width1427→713. Exact injected search GET abort/
403 separated from unexpected console/page errors0. Nonfatal Windows Proactor
10054 teardown callback disclosed.15 original+2 canonical images opened and
validated in first batched inspection. Archived message incorrectly described
manager role denial; state-specific restore guidance corrected. Final batch
also makes download retry perform a fresh protected transfer and clears a
successful export attempt key so a later deliberate identical-filter request
can create a fresh snapshot; uncertain-response retries keep the original key.
Final rebuilt browser captures/results, detector, AFTER audit, independent
finish/documenter and privacy/migration/shutdown closure follow below.

## Final closure

Final frontend lint/typecheck/build exit0, build dmDV0B-5rTHNPUklvY25E.
Compiled discovery2/2 passes44.7s,0 skipped: filtered real CSV download,
manager/agent counts, archived restoration, allowed/denied audit, committed-
response loss/replay, then a deliberate same-filter fresh snapshot. Final
headed1/1 passes29.0s (39.6s total),0 skipped, including interrupted download
and working fresh-permit Retry. Same native version/width/zoom/contrast as above;
two expected network aborts and one injected403, unexpected console/page errors0.
Final16 originals+2 canonical individually opened/validated in second batch;
no subsequent builder polish. One detector changed targets exit0/[].
[AFTER019](../../../anti-slop/audit-019-2026-10-15.md) records a per-item gate,
0 new findings and no aesthetic-only fix. Fresh no-history independent finish
review .impeccable/sp19-finish-review.md returns ship/no material fixes; all18
captures valid. Fresh documenter preserves DESIGN.md/system and records only
the reusable SheetContent.closeLabel note in ui-components.md. Pre-existing
PRODUCT.md/design.json absences remain disclosed, not silently repaired.
Khalid's product/design review is independently pending.

Two necessary strengthened backend checks pass on final code: explicit
positive private deal/deal-document names and scopes1/1 in2.03s; closed-input
retention CLI1/1 in3.48s. Together with27 above,29 distinct cases passed through
three commands, not one clean29-case invocation. CLI EOF/interrupt now fails
with RETENTION_CONFIRMATION_REQUIRED rather than an EOF traceback; no purge
session opens without confirmation. Final Ruff check/format/mypy exit0,
246 files/157 app modules. No broader suite/five-target/load run added.

Development precheck resolves exact cluster7607060034405909976/OID109060,
head0019/66 tables/63 record tables0 rows. A one-off wrapper initially passed a
URL rather than an Engine to identity resolution and stopped before DDL;
the post-schema probe then correctly refused the missing new table, and the
cleanup environment assertion refused development. Correct Engine and explicit
environment gates rerun: additive0020/0021 upgrade/check exit0/no drift,
67 tables/64 record tables0 rows, bootstrap unset, schedule version1/capacity2,
no editor/hours/lunch rows. No development reset, synthetic seed or retention
purge. Guarded testOID109061 cleanup removes1 synthetic residual row/27 orphan
objects, then final repeat0/0 verifies64 record tables0 rows/bootstrap unset.
These deletions concern only disposable isolated fixtures, not recoverable
user records or development data.

Privacy scan4 roots/284 browser JS/0 configured-secret occurrences. Private
report2 JSON/2 step arrays/0 detailed arrays.10 private/generated paths ignored/
0 tracked. No dependency/lock edits, real records, real-data CSV, external
messaging, cloud, production or antivirus bypass. Retain prior runtime audit0/
full9 inherited HIGH development-toolchain findings and latest valid Python lock
audit, not fresh dependency scans. No actual-device/Safari/fullCRM/SP-22 load/
backup/recovery or protected transaction/finance retention acceptance claim.

Final source fingerprint431 app/migration files SHA256
2AD224E52DE375C6867D645AB1B1C5C297E53FA487025A2E3F542AA1F47B1F44
(the only post-review app change handles retention CLI EOF; UI build unchanged).
Original untracked user tree preserved, no commit/stage/reset. Six project
ports3000/8000/3100/8100/8101/3310 and identified node/python project services0,
shared PostgreSQL5432 preserved. Updated contracts, API/data/screen mapping,
acceptance/traceability, security, QA, root guides and repeatable lesson.
Final documentation validator/checklist/Git whitespace results are appended
after the last documentation write. SP-20–SP-22 and product review remain open;
SP-19 technical acceptance is not100%-complete CRM acceptance.

Final docs validation exits0:22 sprints/1180 local links/41 AT mappings,
13 synchronized Mermaid sources/10 valid API JSON examples. SP-19 checklist
23 checked/0 unchecked. git diff --check exits0;17 normal git-status untracked
entries/0 tracked changes preserved (directory-only enumeration also reports
the existing empty output/ directory). Final fingerprint unchanged after docs.
