# SP-18 execution

Status: technically_accepted; scoped local gates passed; product review pending Khalid.
Date: 2026-10-15. Scope C11/C02/C13/C14, BR-03/04/20, AT-20/21/23.
SP-17's scoped technical gate is accepted. User requests necessary-only tests.

## Focused outcome and E2E defined before implementation

Keep French Leads and existing KAY tokens. M/A upload an exact-header UTF-8
contact CSV through a short-lived session-bound direct FastAPI permit. Preview
row numbers, eligible/skipped/invalid counts and agent assignments. Correct the
file or explicit row/fallback agent selections, preview again, then confirm
atomic approval. Raw data never enters URLs, logs, browser storage or public
files. Agent import access is forbidden before lookup.

Focused real-stack scenario: synthetic manager imports valid/existing/invalid
rows, sees blocked approval, resubmits corrected CSV, selects a fallback/row
agent, approves and opens the durable result. Simulate lost committed response
and retry the same batch/key without duplicates. A separate phone claim after
preview must create zero batch contacts and require a fresh preview. Exercise
strict transport, wrong role, stale/invalid agents, quotes/unicode/duplicate
phones, interruption before/after commit and real separate-connection races.
Check native Chrome, keyboard/touch, desktop/mobile/zoom and retained failure
states. Run focused new import and directly affected contact/migration checks;
retain valid untouched-boundary evidence, not the whole CRM suite.

## Technical proposals to verify

Use the documented20 MB/50,000-row limits and shared phone/email/role validators.
Any valid existing canonical phone skips its whole row; do not update or merge
an existing contact. Duplicate new phones within the batch block approval.
Rows without agent_email require an explicit selected active fallback; per-row
selection may override only assignment, not private identity fields. Corrected
file replacement creates a new batch, preserving original evidence.

Approval and current-role revalidation serialize with existing contact commands
on the agency lock, plus sorted phone advisory locks/global phone uniqueness.
Approval stores contacts, original assignment/history and durable batch result
in one transaction. Store original contact links as immutable import provenance;
merge must declare this historical link policy. Published raw objects remain
private and reconciliation must retain referenced batch evidence.

## UI scope and authority

Reading: operational French CSV correction/approval for KAY M/A inside Leads,
existing light workroom, ENERGY1/RHYTHM1/MOTION1. Required antislop/system-ops/
design-taste read; dense tables/multi-step forms exclude marketing concepts.
Impeccable inherits the existing surface; no new world/comp/seed/assets. Existing
shadcn/Tailwind controls and geometry; no chart, Bklit N/A. Responsive/React/
uncodixfy guidance supplements. Human workflow confirmation requested; backend
inspection/implementation may continue independently. AFTER audit waits for
completed UI; aesthetic-only fixes require Khalid's numbered selection.

## Boundaries

No inventory import, export, real-data import, production, external send, cloud
or SP-19+ work. Explicit backend venv for every command/subprocess. Verified
isolated DB lease for writers; serial pytest/browser fixtures. Preserve existing
untracked user tree, development contents and unrelated services. New additive
migration must be tested with populated existing facts before development use.
Actual commands, failures, corrections and final gate results follow below.

## Implementation and focused checks so far

Backend imports module now separates strict contracts/parser, role/batch access,
validation/hash projection, private upload, approval and routes. Migration0019
adds3 evidence tables and guards; contact merge registers immutable import
origins and reconciliation retains referenced raw files. Initial assignment,
true actor, notes, audit and durable result are atomic with contacts. One final
batch consistency check avoids quadratic per-row scans;1024 sorted advisory
buckets bound phone-lock memory while preserving existing agency serialization.
No runtime package or lockfile change. Corrected-file replacement is a new batch.

Frontend adds M/A-only contextual import inside Leads, standard CSV picker,
row-numbered errors/skips, active fallback/per-row agent selection, preview-bound
confirmation and durable result recovery. Existing shadcn/Tailwind geometry and
French shell reused, no new style/theme/token/chart/raster. Optional timeouts
are import-only; existing client/facade default deadlines stay unchanged.

From backend/ with explicit .venv/Scripts/python.exe:

- pytest tests/test_imports.py tests/test_import_http_migration.py
  tests/test_contacts.py tests/test_ownership.py -q --tb=short -x -s:
 61/61 passed110.43s,0 skipped (16 new import variants plus45 affected existing
  contact/ownership cases). No full CRM regression suite was run.
- Stronger final multi-chunk501-contact crash/retry and refined SQL guard suite:
  pytest tests/test_imports.py tests/test_import_http_migration.py
  -q --tb=short -x -s:16/16 passed42.05s. After uniform unknown-permit denial,
  affected HTTP/merge/migration3/3 passed23.02s. These overlap, not extra unique
  passes. Final Ruff check/format exit0:231 files; mypy147 modules exit0.
- UTF-8/BOM50,000-row parser accepts the boundary;50,001 rows and20MiB+1 reject.
  Actual synthetic parser timing0.138s in the61-case run and0.278s in the final
  focused rerun. This is parser capacity, not50,000 contact approval throughput
  or SP-22 full-product/load acceptance.
- Verified populated0018→0019 preserves existing contact/phone JSON exactly;
  Alembic check no drift; retained batch evidence refuses downgrade. Test-only
  empty downgrade/reapply under the exclusive lease refreshed the unshipped0019
  after its audit-action and trigger refinements. No development downgrade/reset.

From frontend/: lint/typecheck/build exit0, latest build
VMVCdBpk50LsxmnUE-n_5. Current browser/native results follow after completion.

## Corrected attempts retained

1. New import audit actions initially failed the existing audit allowlist. Extend
   its reviewed migration/model constraint, preserving all previous action
   prefixes, then reapply only the empty isolated unshipped schema. Tests pass.
2. Initial formatting/import/type/ref checks found long snippets, two type
   annotations and refs read during render. Format source, add explicit types
   and keep operation/uncertainty as state; wrapper lint remains fully enabled.
3. First browser fixture used SP18 names without the private harness's required
   SP06 synthetic prefix. It refused before UI setup; preserve the guard and fix
   fixture labels only. One failed/one unrun, not a passing browser result.
4. Next real browser completed correction/approval/reload/contact navigation;
   final denial assertion matched both its real paragraph and Next's empty
   route announcer. Scope the assertion to the expected error. One failed/one
   unrun; the legitimate403 is not hidden or called a clean invocation. A
   non-fatal Windows Proactor10054 callback during teardown remains disclosed.
5. Unknown approval response must not coexist with a definitive “nothing
   created” preview message. Required functional correction shows unknown
   outcome and hides stale row/count projections until read/retry; same frozen
   key/body preserved. A real committed-response-loss browser assertion covers
   this wording alongside idempotent recovery. New source build recorded above.
6. The ordinary contact-claim browser fixture initially omitted fields required
   by the existing strict frontend schema (type, phone label, emails, roles),
   returning422 after successful lost-response recovery. Correct the synthetic
   fixture, not the contract. Final two import flows then pass2/2 in1.1m.
7. An imported contact requires a distinct read-only csv_import source variant;
   reusing the manual-only read enum makes its record body unavailable even
   though the generic page heading renders. Extend only contact read labels/
   schema, keep manual enquiry/create sources strict, and strengthen the browser
   assertion to require actual imported contact name and “Import CSV”. A
   directly affected ordinary Lead create/edit case joins the final scoped run.
8. Explicitly clearing a per-row override must remain empty until repreview,
   not fall back to displaying its previous assignment. Use own-property checks
   for null selections; the browser asserts clearing then reselecting an agent.

At that checkpoint, Khalid explicitly confirmed the existing KAY workflow. The
fresh Impeccable finish review/documenter, bounded visual batches, AFTER audit,
final private path/report checks, migration into development, cleanup/shutdown
and documentation closure were pending; final results follow. Product review stays independent.

## Final compiled functional run

Frontend lint/typecheck/build exits0 at lpVIk-ZbNmMDQWE6XQWcY.
410 application/migration files SHA256
AC8236B102F1DC4F28E8510E3E5876D6732CC08377981A36628BFD0A750DF9C1.
Compiled HTTPS command (frontend/, temporary KAY_E2E_PRODUCTION=1/restored):
npm run test:e2e -- tests/e2e/imports.spec.ts tests/e2e/leads.spec.ts
--project=chrome --grep 'SP18|SP05 AT-03/23/39' --max-failures=1:
4/4 passed1.3m,0 skipped. Two import cases plus two affected ordinary contact/
Lead create/edit/strict-phone/retry/session cases. Actual imported name and
French provenance load; no mere generic-heading success claim. Same-key
committed-loss recovery, explicit whole-batch phone conflict/repreview and0-new
all-skipped approval pass. Earlier2/2 in1.1m is retained, not extra unique tests.
Non-fatal Windows Proactor10054 callbacks from deliberate connection closure
remain disclosed; final browser console checks belong to the headed run.

Read-only pre-migration development check: OID109060/same verified cluster,
63 tables/60 record tables/0 record rows/head0018. No development reset/write
before reviewed additive migration. User asked necessary-only checks: no full
five-browser matrix, old CRM suite or SP-22 load/recovery rerun is claimed.

## Final functional/native and environment closure

Final refresh-only correction: cancellation had mounted an awaiting-upload batch;
retrying the same file/batch completed preview but left that old query visible.
Increment a preview generation on upload/preview success and remount BatchReview.
No server transaction change. Necessary cancellation/retry assertion retained.
First native run failed only a duplicate hidden-notes selector, scoped to the
open details. The next executable attempt exposed the real stale-state defect
before new visual inspection; both corrected attempts remain failures, not passes.

Final lint/typecheck/build exit0 at KDcVSGWqFB2pc9tcjQcfF;410 app/migration files
SHA2560C3FADAFE00C22194998B60806B4833F6AB47EC90685CB14325EA82244E3FCF3.
Affected compiled command, frontend/, temporary KAY_E2E_PRODUCTION=1/restored:
npm run test:e2e -- tests/e2e/imports.spec.ts --project=chrome --max-failures=1:
2/2 pass59.1s (25.2s+21.4s cases),0 skipped. Earlier4/4 includes the two
unchanged ordinary contact cases; these are overlapping evidence, not6 unique.

npm run test:chrome -- tests/review/imports.chrome.spec.ts --max-failures=1:
1/1 passes30.1s (42.5s total),0 skipped. Real Chrome155.0.8059.79 on Windows,
manager/agent synthetic contexts. Wrong extension, transfer cancellation/retry,
mixed/corrected CSV, fallback/row selection+clear, format/row disclosure,
approval confirmation Enter/Escape/cancel/return focus, touch, report reload,
GET interruption/403/retry and actual role denial. Six widths320/360/390/768/1024/
1440 have no horizontal page/main/dialog overflow and controls≥44px; actual200%
Chrome zoom DPR2→4,width1427→713. Measured final text contrast≥5.814:1.
Expected exact GET abort and403 separated; unexpected page/console errors0.
Nonfatal Windows Proactor10054 teardown callbacks remain disclosed.

Main opens first6 originals in first visual batch and final12 originals plus2
canonical copies in second; each file shows its named state. No third aesthetic
hunt. Capture paths/dimensions/hashes in .impeccable/sp18-review-packet.md.
One final-source detector across changed UI/facade targets returns exit0/[];
.impeccable/sp18-detector.json. No second detector. AFTER018 per-item gate is
in anti-slop/audit-018-2026-10-15.md:0 new aesthetic-only findings, no selected
polish. Fresh independent review/documentation results follow separately.

Development verified before0019: OID109060,cluster7607060034405909976,
63 tables/60 record tables/0 record rows/head0018. Explicit venv
alembic upgrade head then alembic check exits0/no new operations. After:
66 tables/63 record tables/0 rows/head0019_atomic_contact_import. No reset,
seed, downgrade or development record deletion. Read-only model probe confirms
bootstrap unset, schedule policyv1/car capacity2/editor unset/no work/lunch rows.

Guarded exclusive-lease cleanup verifies test OID109061/same cluster and exact
backend/.local-data/files/test, never development. Removed1 synthetic residual
row and28 synthetic orphan objects;63 record tables now0 rows/bootstrap unset.
Reconcile uses a controlled+2h test clock after synthetic batches are removed,
not a production retention rule. Browser actor cleanup already removed its data.
Project ports3000/8000/3100/8100/8101/3310:0 listeners; identified project
node/Python services0. Shared PostgreSQL5432 preserved, not project-terminated.

Final scan-client-secrets.mjs:4 roots/285 browser JS/0 configured-secret matches.
Final audit-report.ps1:2 JSON/2 step arrays/0 detailed arrays.10 private/generated
paths ignored,0 tracked. Git remains17 untracked root entries/0 tracked changes,
no stage/commit/reset. git diff --check exits0; this does not inspect untracked
application code. Locked dependencies unchanged: retained runtime audit0 and
9 inherited HIGH dev-toolchain findings; no forced dependency upgrade. Python
lock audit's latest valid unaffected SP-15 evidence retained, not freshly claimed.

Actual executable versions: Node24.13.1/npm11.8.0,Python3.14.3,pytest9.1.1,
Alembic1.20.0,Ruff0.17.0,mypy1.20.2; Next16.4.0/React19.3.1,
Playwright1.64.1/PostgreSQL18.2. Backend uses .venv/Scripts/python.exe for every command.

## Final technical acceptance and handoff

Status technically_accepted2026-10-15 UTC.23/23 sprint criteria checked,
0 unchecked; no required failed/skipped gate is carried as a pass. Latest
application fingerprint unchanged after documentation-only closure.

Fresh no-history Impeccable finish reviewer returns disposition ship with all
five contract sections and no material fixes, after source/12 originals/2
canonical and9 V3 reference inspection. Main verifies its full report at
.impeccable/sp18-finish-review.md. Fresh no-history documenter compares source,
shared geometry and3 final captures, appends factual SP-18 ui-components.md
composition and records .impeccable/sp18-documenter.md. Main reads both writes.
DESIGN/tokens unchanged; inherited missing PRODUCT.md/design.json and older
preimplementation prose reported, not repaired or called passed. This is the
requested narrow existing-interface extension, not broader V3 implementation
certification. No substituted review, new world, shipping raster or asset debt.

Changed boundaries: backend imports vertical slice and0019; merge/reconciliation/
registry/router integration; strict Next relay and import feature; contact read
provenance distinct from manual choices; synthetic unit/API/migration/race/browser/
headed tests; concrete API/data/UI contracts, acceptance/traceability, security,
QA, screen map/skills, root guides/status and repeatable lessons. All original
unrelated files/user changes preserved. No Git commit or production operation.

Remaining: Khalid's product/design review; SP-19–SP-22; broader V3 work;
actual-device/Safari, fullCRM/five-browser regression, large commit throughput,
SP-22 load/recovery, real-data retention and production acceptance.9 inherited
HIGH development-toolchain audit findings remain; no new dependency or silent
forced upgrade. No inventory import/export/external sends added. The user asked
necessary-only tests, so scoped61-backend/affected compiled/headed checks are
reported honestly; they are not a100%-complete CRM claim.

Final root validate-sprints.ps1 exits0:22 sprints/1169 local links/41 AT mappings/
13 synchronized Mermaid pairs/10 valid API JSON examples. git diff --check
exits0. Final port/process probe again reports0 project listeners and0 identified
project service processes; shared PostgreSQL remains.17 untracked root entries/
0 tracked changes preserved. Documentation validation is not an application test.
