# SP-21 execution

Status: technically_accepted at the scoped local boundary. Date: 2026-10-16.
Product review: pending Khalid. C14/C13, BR02/06/23/24, AT25 and recovery
regressions AT02/26/37. User requests necessary-only, faster verification.

## Focused acceptance recorded before implementation

Create a synthetic coherent point from isolated test: completed bootstrap,
current/revoked sessions and file/import/export permits, private contact/deal,
development/unit/offering, clean/quarantined files, calendar/policy, finance,
committed import, website receipt and pending/fenced jobs. Use real PostgreSQL18
dump/restore and private file copies. Restore ONLY verified recovery database
and fixed recovery directory, compare all snapshot table counts/digests and file
hashes/states, then revoke sessions/permits and reconcile jobs without replaying
finance/import originals. Old cookie/permit/bootstrap must fail; fresh authorized
login traverses restored dashboard/contact/deal/project/files/calendar, unrelated
agent denied. Measure incident/point/open times and named hardware; RPO≤1h and
RTO≤4h for this measured synthetic exercise, not SP22 volume/production DR.

Negative focused tests: source/target alias and development refusal, malformed/
missing/corrupt or incompatible manifest/payload, path/reparse/ACL protection,
maintenance admission/drain and worker pause/release on interruption, overlapping
operations, controlled-clock30-day expiry, current-authority mismatch fails
closed. No development restore/reset, real-data export, production/cloud/new
broker/dependency or SP22 implementation. All Python uses backend/.venv.

Technical proposals: fixed environment-specific protected local backup root;
Windows current-user DPAPI encrypted bounded chunks and authenticated manifest;
30-minute scheduler with30-day point retention. Shared API/worker maintenance
gate plus explicit snapshot/table write pause. Restored services remain closed
until verification/revocation/reconciliation succeed. Current source authority
must be checked before opening: mismatch/unavailable authority blocks opening
instead of silently restoring revoked roles/grants. No automatic policy merging.

UI verification only: preserve existing French KAY interface and all tokens/
components/routes. Three required skills read; design-taste excludes dense CRM/
admin/table product surfaces. No design generation, marketing/comp/seed/raster,
no UI layout change or chart; Bklit unchanged. System-first smoke and AFTER audit
will record actual restored-stack visual/keyboard/touch/state evidence.

## Implementation and scope

Added backend/app/recovery/{private,maintenance,snapshot,store,postgres,service}.py
and app/cli/backup.py. Existing API streams, worker cycles and file maintenance
join the admission gate. The venv-only CLI creates, reports, schedules, restores,
resumes interrupted maintenance and extracts compatible code to a protected ZIP.
No public backup/restore route, model/migration, dependency/lock, shipping frontend
source or design-system change. service.py keeps the restore transaction and
maintenance ordering visible together; crypto/store/introspection/tool execution
are separate modules, rather than mechanically splitting the critical sequence.

The point contains an actual PostgreSQL 18 custom dump, every retained UUID file
object/partial, code/public assets/migrations and exact locks. SQL row counts and
SHA256 digests cover all 69 public tables. Source cluster/OID, revision, LSN,
code/lock fingerprint, timestamps and per-object hash/size bind the authenticated
manifest, published last. Protected DACL/current-user DPAPI/HMAC remain outside
public roots; no .env, private key or diagnostic credential output is archived.

An explicit intent denies new work, shared process leases drain complete API
streams/worker cycles, and table locks pause writes during the snapshot. A killed
owner leaves maintenance closed until the guarded dead-owner resume. Restore
preflights identity/isolation/compatibility/decryption and current authority
before target DDL; populated recovery requires explicit replacement. Unverified
recovery cannot serve. Sessions/permits are invalidated, running jobs fenced,
website sources disabled, originals/committed effects retained without replay.
See the [reproducible runbook](../../06-delivery-and-operations/local-backup-recovery.md).

## Environment and measured exercise

Dell XPS 16 / Dell 16 Premium DA16250, Intel Core Ultra 9 285H (16 cores/16 logical),
31.50 GiB RAM, Windows-11-10.0.26300-SP0. PostgreSQL server/pg_dump/pg_restore 18.2.
Python 3.14.3, FastAPI 0.143.1, SQLAlchemy 2.1.4, Alembic 1.20.0,
Ruff 0.17.0, mypy 1.20.2, pytest 9.1.1; Node 24.13.1/npm 11.8.0,
Next 16.4.0/React 19.3.1/Playwright 1.64.1; native Chrome 155.0.8059.79.
Real project-pinned ClamAV container was started locally with --pull never for
synthetic file scanning and stopped afterwards; no unrelated container changed.

Cluster 7607060034405909976: development kayrealestate OID109060,
test kayrealestate_test OID109061, recovery kayrealestate_recovery OID109063.
Development/test schema remains 0022_website_intake, 69 tables. Recovery began
empty and was cleared back to empty after the guarded synthetic exercise.
No development reset, restore, migration or real-data backup/export occurred.

Fixture: completed administrator bootstrap, primary/unrelated agents and current/
revoked sessions, private contact/Lead/deal, programme/block/floors/type/physical
unit/sale offering, policy/work/lunch windows and a 2030 company-car visit. One
recognized 10,000 MAD commission and 2,500 receipt preserve the 7,500 balance;
one committed CSV batch, processed website receipt and queued interrupted job
retain original identities/history. A real clean 77-byte PNG and unfinished
upload demonstrate clean versus non-downloadable state, with old single-use
permit. No infected-sample experiment is claimed. All table digests, FKs/SQL
guards and object hashes are compared before revocation/reconciliation.

Final core pytest observation: 69 tables, 20 retained private objects, RPO
3.473005 s, restore phase 5.4572834 s. Object count includes retained synthetic
orphan bytes from earlier attempts, not 20 business documents. Final compiled
browser: point age 5.134216 s, restore 5.5146894 s, incident-to-verified 36.100 s.
Final native browser: point age 4.072028 s, restore 4.5356117 s,
incident-to-verified 43.133 s. All meet the local ≤1-hour/≤4-hour objectives at
this stated synthetic volume. A deliberately post-point enquiry returns 404
after restore, proving the point cutline; all pre-point tables match. These are
not intended-volume, full-source-loss, production or independent-offsite results.

## Actual necessary-only commands and results

Backend cwd backend/, always explicit .venv. Frontend cwd frontend/, browser
commands temporarily set KAY_E2E_PRODUCTION=1 and restore its prior value. Final
PowerShell wrappers explicitly propagate npm exit codes. Database writers run
serially under the existing exclusive test lease.

| Boundary | Actual command | Result |
|---|---|---|
| Focused recovery + affected foundation | .venv/Scripts/python.exe -m pytest tests/test_recovery.py tests/test_foundation.py -q --tb=line -x -s | 22 passed in 99.70 s, zero skipped: 15 recovery + 7 foundation variants |
| Additional real drain race | .venv/Scripts/python.exe -m pytest tests/test_recovery.py -k concurrent_pause -q --tb=line -x | 1 passed in 4.61 s; 15 deliberately deselected, zero skipped; 23 distinct cases across these two commands, not one clean 23-case invocation |
| Backend quality | .venv/Scripts/python.exe -m ruff check .; .venv/Scripts/python.exe -m ruff format --check .; .venv/Scripts/python.exe -m mypy app | All exit0; 272 formatted files / 177 typed modules |
| Schema | .venv/Scripts/python.exe -m alembic check | Exit0, no new upgrade operations; no migration introduced |
| Frontend quality | npm run lint; npm run typecheck; npm run build | All exit0; final build v91FEgd-yN7dS7wBB9-Hm; no shipping UI edit afterwards |
| Compiled restored-stack Chrome | npm run test:e2e -- tests/e2e/recovery.spec.ts --project=chrome --max-failures=1 | Final 1/1 passed, 1.1 m case / 1.3 m total, zero skipped |
| Visible native Chrome | npm run test:chrome -- tests/review/recovery.chrome.spec.ts --max-failures=1 | Final 1/1 passed, 1.1 m case / 1.3 m total, zero skipped; keyboard/touch/roles/11 captures |
| Client/report privacy | node scripts/scan-client-secrets.mjs; powershell -NoProfile -File scripts/audit-report.ps1 | Exit0: 4 roots / 285 JS / 1 configured signing key / 0 configured-secret matches; 2 JSON / 1 step array / 0 detailed arrays |
| Protected private paths | Guarded git check-ignore/git ls-files probe | 14 exact private/generated paths ignored / 0 tracked |
| Windows protection | Get-Acl on test backup root and recovery staging | Both protected DACLs, 2 allow rules, 0 inherited rules; no different-account penetration test claimed |

Actual pg_dump/pg_restore operate through private temporary passfiles, no shell
and bounded safe output. Cases reject missing/tampered/corrupt manifests/payloads,
code/schema mismatch, path traversal/wrong crypto context and changed current
authority before DDL; aliases/development target refuse. Exact 30-day boundary
is retained and older points expire under a controlled clock, never business
history. Scheduler due control is a test stub of create, not a false second dump
claim; real point creation/restore is exercised separately by both service and CLI.

Admission tests cover nested ownership, exception cleanup, an actual concurrent
drain waiter blocked by an admitted process, rejection of new work and release.
An exact owned child is killed; pause persists, active-owner resume refuses,
dead-owner resume succeeds. HTTP pause gives 503/Retry-After while liveness is
200; public backup route is 404. Recovery worker CLI runs twice after restore:
one finance receipt, one committed import, one processed website receipt, no
running old fence or duplicate effects. Both previously revoked and active-at-point
cookies are rejected, old file permit is denied, and another bootstrap refuses.
Fresh agent/admin logins work; unrelated agent/copied private ID deny.

## UI skills, visual evidence and AFTER

Main agent read antislop, design-system-ops and design-taste-frontend completely,
with required visual/responsive/accessibility references, DESIGN/system/screen
map and all nine actual Approved V3 PNGs. Playwright skill used for the explicitly
required executable browser journey. This is verification-only, not frontend
generation/redesign: existing French auth/CRM/table/admin/detail surfaces and
shadcn/Tailwind/Bklit remain unchanged. Design-taste marketing concept, comp,
seed, QUALITY BAR and raster workflow are excluded by surface/task scope. No
Impeccable workflow or independent agent delegation was activated for this slice.
Existing missing PRODUCT/design.json and broader V3 drift are not silently fixed.

Final native captures sp21-{invalidated-login-desktop,dashboard-desktop,
contact-desktop,files-desktop,deal-desktop,project-desktop,visit-desktop,
calendar-desktop,finance-desktop,empty-dashboard-mobile,denied-mobile}.png live
in frontend/output/playwright. Main opened all 11 final original frames: complete
content/controls, no blank/transient/cropped frames, empty password fields only.
[Capture hashes/dimensions](../../../.impeccable/sp21-captures.json).
Contact widths 320/360/390/768/1024/1440 and mobile empty dashboard have no page/
content overflow, controls ≥44px and minimum measured contrast 6.113:1.
Native keyboard Enter and touch open the programme through its actual inventory
tab. Current authorized dashboard counts/links, clean file download, restored
unit 80.00m², visit/policy, finance balance and copied-ID denied UI are visible.
Unexpected page/console errors: 0; explicit expected 404s are narrowly separated.
No new 200% zoom/reduced-motion experiment: unchanged source retains prior SP20
and earlier valid evidence; no claim that this sprint reran every inherited state.

[AFTER021](../../../anti-slop/audit-021-2026-10-16.md) records R01–R38/C1–C5
applicability, zero new aesthetic-only findings and no unselected aesthetic fix.
Detector is N/A: no shipping UI file changed. No new palette/font/token/chart,
component kit, CSS, raster or visual world; earlier optional findings untouched.
This scoped restored-stack review is not Khalid's product/design approval.

## Corrected attempts and retained limits

- Fixture login tuple initially used expiry as token; corrected fixture, not auth.
- Sale offering fixture required no rental period; linked deal needed actual
  reviewed offering version. Corrected inputs, not product constraints.
- pg_restore initially collided with a caller-created public schema. Dump owns
  creation; caller now only drops the exact verified recovery schema IF EXISTS,
  enabling retry after interruption. Raw stderr/credentials were not published.
- Business-history immutability correctly blocked generic recovery test cleanup.
  Added exact cluster/OID/synthetic-only recovery cleanup, never weakened guards.
- Negative-point/retention attempts left 2 incomplete/invalid synthetic points.
  Preserved them recoverably in test/fault-evidence after exact containment and
  no-reparse checks, not blind expiry/deletion. Valid encrypted points retained.
- Browser controller initially omitted recovery-start/stop from its private
  allowlist; cleanup masked that failure. Corrected both and retained actual error.
- Browser expected nonexistent dashboard copy, then native navigation forgot the
  Programmes immobiliers tab. Corrected tests to current KAY behavior; final
  native rerun passes, no product layout changed. Settled captures wait for loads.
- Earlier PowerShell wrapper hid npm failure behind exit0. Final wrappers capture
  and return the actual code; failed attempts are not counted as passes.
- Nonfatal Windows asyncio Proactor WinError10054 teardown callbacks occurred
  while swapping API processes. They are disclosed despite successful reruns.

Same-account/laptop DPAPI is not portable key escrow or independent DR. Changed
or unavailable current source authority deliberately blocks automatic opening;
use a suitable newer point or separately approved security review, not a blind
offline permission merge. No total-source-loss cutover, source-authority merge,
intended-volume load/RTO, real-device/Safari, five-browser or full-suite rerun.
No new dependency audit/upgrade: retain latest valid lock evidence and SP17's
runtime0/full9 inherited HIGH dev-toolchain findings. No production, real-data,
external send, cloud provisioning or real website configuration. SP-22 remains
unimplemented and Khalid's product review remains pending.

## Closure

Guarded test OID109061 cleanup under exclusive lease: 0 residual rows removed,
26 synthetic orphan objects removed, 66 record tables now 0 rows/bootstrap unset.
Recovery OID109063 reset only after synthetic-account/identity checks; no live
development reset. Development OID109060 stays 69 tables/head0022, 66 record
tables 0 rows/bootstrap unset, policy version1/capacity2/no editor/hours/lunch.
Removal concerns synthetic test files only; private encrypted restore points
retain recoverable evidence, not a real-data retention approval.

Final source/app/migrations fingerprint: 454 files, SHA256
39807DC0F1645F191AF45E3F47EBD4E6C148E523896669F9E5754E8B3403C230.
No Git stage/commit: 17 pre-existing untracked root entries remain user-owned;
git diff --check alone cannot review an untracked application tree.
Final read-only identity probe: development/test69 tables/head0022, recovery0
tables, no maintenance flags, recovery-ready absent, test/recovery objects0 and
staging operations0. Protected synthetic test backup status:16 completed valid
points,0 incomplete/invalid active points, lagging false/requires_attention false;
2 fault points preserved separately, not deleted or counted as healthy points.

All project listeners3000/8000/8001/3100/8100/8101/8102/3310 and identified
project Node/Python service processes0. Owned ClamAV container stopped/exited;
signature cache/volumes and unrelated Docker services preserved. Shared
PostgreSQL5432 remains available. No launched long-running cmd/PowerShell service
helper remains. Synthetic rows/files were removed; encrypted points/fault evidence
remain recoverable under the protected ignored local test root.

Final root command powershell -NoProfile -File docs/03-planning/validate-sprints.ps1
passes:22 sprint specifications,1202 local links/anchors (70 installed-skill
links),41 acceptance mappings,13 synchronized Mermaid sources and10 valid API
JSON examples. git diff --check exit0 with the untracked-tree limitation above.
All22 SP-21 checkboxes checked/0 unchecked. No unresolved required scoped defect;
Khalid's product/design acceptance and SP-22 cumulative/full-volume acceptance
remain separate. Next safe action is product review or a separately requested
SP-22, not automatic production opening.
