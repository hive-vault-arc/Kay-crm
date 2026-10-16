# SP-08 execution record

Status: technically accepted; all24 scoped sprint criteria checked; product review pending  
Date: 2026-10-15  
Product/design review: pending Khalid

## Final technical gate

All applicable scoped technical gates pass. Khalid's product/design review is
separate and remains pending. Nine inherited development-tool advisories and
the optional audit finding below are not represented as clean/approved results.
All commands run on2026-10-15 UTC using synthetic isolated fixtures.

| Boundary | Latest inspected result |
|---|---|
| Frontend | Lint/typecheck/build exit0. Build `0mZyw9I1IbVqz57TCdg3n`;23 displayed routes,24 app-path entries. No application change after this build. |
| Backend | `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short -x`:163 passed,zero skipped,203.09s,96% coverage. Ruff check/format exit0,91 files; strict mypy57 modules pass. |
| PostgreSQL | Both verified targets at0009/27 tables; no new Alembic operations. Cluster/OIDs/unrelated catalog fingerprint preserved. Empty down/base/up, populated0008 upgrade, SQL constraints and unsafe downgrade refusal pass. |
| Five-target coverage |105 distinct affected cases verified:63 completed Chromium/Chrome/Edge cases plus corrected Firefox/WebKit42/42,zero skipped,15.3m. The failed original command is retained below,not relabeled clean. |
| Visible Chrome |5/5 pass,zero skipped,1.7m. Main-agent inspection16 SP08 captures; real200% edit,320–1440px,touch/keyboard/states/gutters. AFTER008:0 HIGH/0 MEDIUM/1 optional LOW,unselected. |
| Optimized HTTPS smoke |21/21 selected Chrome cases pass,zero skipped,3.6m,against unchanged build on HTTPS3100/API8100 and isolated PostgreSQL. KAY_E2E_PRODUCTION=1 was restored afterward. |
| Dependency/security | npm runtime0; both Python lock audits/pip check exit0. Full npm audit remains9 inherited HIGH development-only advisories,exit1,not clean. No new dependencies/forced downgrade. |
| Diagnostics/privacy | Final built report5 JSON/21 step arrays/0 detailed arrays; five-target rerun5/42/0. Client scan4 roots/246 JS/0 configured-secret occurrences. Only.last-run.json remains in test-results; no auth snapshot/trace/video/profile.16 explicit safe SP08 captures remain ignored. |
| Development | Refreshed API8000 and frontend3000 running. Explicit-CA smoke passes; login200, anonymous developments401/no-store, protected programme login redirect. Read-only25 record tables empty/bootstrapunset; no reset or seeded account. |
| Final isolated cleanup | Test ports3100/8100/8101 closed first; identity guard and exclusive51505005 lease acquired. Existing synthetic-only helper clears test fixtures;25 record tables empty/bootstrapunset. Development was inspected read-only,never cleared. Fixtures can be recreated by rerunning tests. |

The final backend suite also includes individually foreign floor/type rejection
and whole-programme rental11999.99×12=143999.88, annual edit12345.67,
immutable campaign target, withdrawal/replacement and retained history.

## Outcome and focused case defined before implementation

Implement the existing inventory's development hierarchy, not a second stock
system. AT-31/32: a manager creates a mixed development, two blocks, floors, a
reusable apartment type, two independent apartments and a direct land parcel.
Incomplete drafts save. Cross-development floor/type and missing apartment
hierarchy fail. Filter numbered actual units by block/floor/type/category/state;
default to available units. Edit the template and retain each unit's explicit
area, reference and independent campaign facts. Whole-development campaigns have
their own price and legal owners; a developer alone is not ownership evidence.

AT-35/36/41: an unrelated agent reads safe hierarchy and optional plain briefing,
not protected contact IDs, phones, notes or documents. Agent writes fail. Briefing
can be omitted/cleared without changing availability, unit history or permissions.
Cover stale versions, current-role revocation, duplicate retries, interrupted
acknowledgement, transaction rollback and actual PostgreSQL races. Future
reservations/outcomes/files/search/dashboard variants remain their owning sprints.

## Technical proposals for this implementation

- Briefing is nullable shared plain text, bounded to 10,000 Unicode characters;
  blank means null. React renders it as text, never HTML.
- Unit facts are explicit snapshots. Choosing a type may prefill an unsaved form
  only; editing a type never updates stored physical facts.
- Inventory target identity is immutable after any campaign reference. No blind
  reparenting, deletion or cascading archive of referenced stock is introduced.
- Hierarchy reads use separately numbered level pages and a numbered physical-unit
  page, not an unbounded nested response.

## UI skill workflow

Read completely: installed antislop, design-system-ops (and its four required
references), design-taste-frontend. Existing AFTER timing retained. Dense CRM
lists, hierarchy administration, detail tabs and forms are explicitly outside
design-taste's marketing surfaces; no hero/image/motion/new palette is applicable.
Use existing KAY geometry/semantic tokens, shadcn controls, Tailwind and Lucide.
No chart is required (Bklit remains mandatory when a chart is introduced).
React performance, uncodixfy, copywriting and Playwright guidance supplement the
project contracts. The sprint explicitly requires executable E2E files, so the
existing isolated Playwright test harness takes precedence over CLI-only defaults.

## Verification register

Commands use backend/.venv/Scripts/python.exe from backend/ and npm from frontend/.
Chronological checkpoints follow; the latest gate above supersedes incomplete
checkpoints without erasing failed commands:

- Guarded test inspection: PostgreSQL cluster7607060034405909976, test OID109061;
  revision0008/22 tables before migration,0009/27 afterward. Unrelated catalogue
  SHA256 remains4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945.
- `scripts/kay.ps1 -Task migrate -Environment test`: exit0;
  `APP_ENVIRONMENT=test` venv `-m alembic check`: no new upgrade operations.
- Focused `-m pytest tests/test_developments.py -q --tb=short -x`:8 passed,8.10s.
  `tests/test_development_edges.py`:3 passed,10.59s. Includes populated0008→0009.
- Affected SP07/new focused14 cases passed22.56s after compatibility correction.
- Strict mypy:57 modules pass. Frontend lint/typecheck pass. Optimized build passes
  with23 displayed routes; the final build identity is recorded below.
- First complete backend run:107 passed,1 stale SP07-contract assertion failed.
  `development_id` is now approved; the hostile extra-field check now uses an
  actually unapproved field. Old-revision migration fixtures now use revision-
  matched SQL rather than importing a newer ORM against an older schema.
- First Chrome attempt:1 passed,1 fixture setup failure,1 not run. The full case
  incorrectly created a Lead as administrator without an eligible agent; fixture
  now creates its synthetic owner contact as an agent before switching manager.
- Initial Unicode bound parametrization used a huge implicit pytest node ID;
  explicit ascii/unicode IDs fix the harness error. No input/secret was involved.

Earlier backend checkpoint after the additional empty-archive/restore, unknown-price,
multiple-owner and strict-offering-level checks:162 passed,zero skipped,198.79s,
96% coverage. Ruff check/format and strict mypy57 modules pass. Development
inspection/migration also passes: OID109060 remains unchanged,27 tables/head0009,
same unrelated catalogue hash; no reset or seeded data. Explicit-CA HTTPS smoke
passes live/ready, direct403, no-store and untrusted-CA refusal.

Headed `npm run test:chrome -- --grep 'SP08 visible|SP07 visible|SP08 AT-23'
--max-failures=1`:4/4 pass,zero skipped,1.7m. Includes corrected outage readiness,
invalid apartment/template focus, new visible hierarchy and earlier inventory.
New review32.8s; SP07 review33.1s. New form heights48px;320/client305/gutters16–289,
360/client345/gutters16–329. Widths768/1024/1440 also remain in parent gutters.
Real Chrome200%: DPR2→4,width1427→713,overflowfalse,2854×1702 viewport; edit saves.
14 initial native captures inspected by the main agent. Additional floor/unit-row
captures and a scrolled briefing capture are being refreshed for final evidence.

Read-only tooling audits: npm runtime0 vulnerabilities; full audit retains9 HIGH
development-only glob tooling entries (GHSA-vfj7-8cjw-p6xm),exit1,not a clean
audit. No new dependency or forced incompatible downgrade. Both Python hash-lock
audits report no known vulnerabilities; pip check passes. Versions rechecked:
Node24.13.1/npm11.8.0,Playwright1.64.1,Python3.14.3,FastAPI0.143.1,
SQLAlchemy2.1.4,PostgreSQL18.2. Existing Next16.4/React19.3.1/Tailwind4.3.3
manifests remain unchanged. Contrast checker (venv) on white: muted6.48:1,
link/focus6.50,input outline4.54,success6.17; no new palette is introduced.

At this checkpoint the five-browser affected workflows, refreshed visual review,
AFTER audit, built HTTPS smoke and final privacy/cleanup had not all completed.
Later results below supersede this progress note, not the failed attempts.

### Functional correction during source review

The affected browser matrix initially contained100 cases. That command was
intentionally interrupted after25 completed passes when
code review found a hierarchy editor lifetime problem; it is not a passing
matrix. A new real Chrome case failed before the fix: selecting B2 still showed
B1 in the input (17.8s). RHF defaults survived a target-prop change. Both hierarchy
editor sites are now keyed by selected record/new mode. The same case passes
afterward13.4s (24.2s harness), including block/floor/type switches and Create.
No database data or permission rule was changed by this correction. Final
source-frozen browser coverage must include all five SP08 cases on five targets.

Post-fix frontend lint/typecheck/build pass. Optimized build ID
`0mZyw9I1IbVqz57TCdg3n`,23 displayed routes. The refreshed headed command above
now passes5/5,zero skipped,1.7m: outage14.9s,invalid input6.1s,editor identity9.6s,
new visible review32.0s,SP07 visible regression30.6s. All16 native SP08 captures
include dedicated floor and actual-unit rows plus scrolled agent briefing.
Geometry and actual200% measurements remain the same. Final five-target matrix
had105 cases (21 per Chromium/Chrome/Edge/Firefox/WebKit) against this frozen
implementation; its actual failure and corrected coverage are recorded next.

That105-case command stopped with66 passes,1 Firefox validation-message failure,
38 not run and1 ancillary framework-summary error (14.2m), not a passing matrix.
The first21 cases on each of Chromium,
Chrome and Edge all passed. The invalid-apartment test now verifies the selected
category and waits for the actual POST rejection422 before asserting its French
message; it does not sleep, retry a mutation or mock success. The focused Firefox
case passes17.9s (29.8s harness). Application source/build is unchanged. A complete
42-case Firefox/WebKit affected rerun is required before accepting all105 distinct
cases across five targets; the failed original command remains in this record.

The complete Firefox/WebKit affected rerun passes42/42,zero skipped,15.3m.
Together with the63 unchanged completed Chromium/Chrome/Edge cases, this verifies
all105 distinct affected cases (21 per target), including all25 new SP08 cases.
This is composite coverage, not a relabeling of the failed105-case command.
Final rerun report privacy:5 JSON entries,42 result step arrays,0 detailed arrays.
The failed original report also passed privacy inspection:5/67/0 respectively.

The main agent has inspected all16 refreshed captures. The completed
[AFTER audit008](../../../anti-slop/audit-008-2026-10-15.md) records0 HIGH,
0 MEDIUM and1 optional LOW mobile-filter-density finding. No audit-only fix was
selected/applied; Khalid's selection and product/design review remain pending.
Final static rerun: frontend lint/typecheck exit0; backend check exit0 with91
formatted Python files and57 strict typed modules. Development Alembic check
reports no new operations. Build has24 app-path entries including global-error.
Installed Chrome155.0.8059.79 and Edge155.0.4283.45 were read from executable
metadata; pinned Playwright Chromium156.0.8078.4/rev1248,Firefox157/rev1555,
WebKit27.2/rev2370 remain the other matrix targets.

Earlier Chrome attempts also exposed a shared helper expecting the physical
"Offres" tab on the deliberately distinct "Offres du programme" page; the helper
now accepts that explicit label. A later run passed both business cases but
failed the outage retry because process start preceded API readiness. The real
readiness poll corrects that test synchronization; headed outage verification
then passes. Initial format/type checks were not clean; typed ORM unions and
SQL formatting were corrected before the final Ruff/mypy pass. None of those
failed/incomplete commands is relabeled as a clean final run.

## Implementation inventory and framework references

Revision0009 adds development/development_owner/block/floor/unit_type; extends
physical property links/rooms, offering target XOR, typed history/receipts/audit.
RESTRICT FKs retain referenced records. Template edits update no property facts.
Existing inventory commands/projections/receipts/owner and campaign controls are
extended. Contacts merge policy now covers developer and legal-owner links,
binds their versions in impact previews and preserves owner origins/true actors.
No test-only bypass is added to product code.

Installed Next16.4 page/route-handler docs and RHF7.90 README read before code.
The official RHF get-started request returned403; installed guidance supplies the
matching form API. Official [TanStack v8](https://tanstack.com/table/v8/docs/introduction)
and [SQLAlchemy2.1.4 session guidance](https://docs.sqlalchemy.org/en/21/orm/session_basics.html)
were consulted. Existing per-request transactions/numbered pages remain authoritative.

## Security and scope

Synthetic isolated fixtures only. Reuse ignored local settings without exposing
secrets. Never reset development. Preserve PostgreSQL sessions, CSRF, explicit
facade routes, current authority, immutable actors/origins, agency-first locks,
and the exclusive pytest/browser fixture lease. No production access or real-data
operation, external message, package substitution or future option is authorized.

## Security boundary record

Scope: C04/C11/C13/C14, BR06/25/26/27/31; project records, private contact links,
typed migrations, facade/input bounds, authorization, retry and true-actor history.
Root rules, permissions, security/privacy, API/data contracts and SECURITY_CHECK
were read. Existing revocable PostgreSQL sessions/CSRF/explicit TLS trust remain.

- Allowed: active staff read shared facts, numbered counts/levels/units and
  non-secret briefing; only current M/A mutate hierarchy, owners and campaigns.
- Denied: agent writes, missing facade proof/CSRF, duplicate/unknown query/body
  fields, invalid/cross-development floor/type, template/floor/block stock targets,
  dual/absent offering target, referenced reparenting and cascading archive.
- Private boundary: developer/owners expose only explicit marketing text unless
  current separate Contacts scope permits id/name. No private phones/notes/files
  enter briefing automatically, inventory search/counts or shared merge history.
  Direct private Contacts reads remain404. Plain script-shaped briefing renders
  as text; a real browser asserts no script-created window property.
- Integrity: target-level positive price/legal owners, real apartment structure,
  finite amounts, partial campaign uniqueness, immutable origins/actors/history,
  same-transaction audit and HMAC-bound typed receipts. Template changes leave
  unit facts/campaigns unchanged. Contact merge preserves origin and survivor
  display, advances affected aggregates and grants no new staff scope.
- Concurrency/interruption: two observed independent PostgreSQL lock waiters,
  current-role revocation after waiting, stale aggregate/campaign versions,
  transaction rollback and same-key retry are covered. Actual API stop/start and
  lost acknowledgements preserve drafts and do not duplicate committed edits.
- Migration: resolved isolated target, empty down/base/up, populated0008 upgrade,
  strict SQL constraints and nonempty downgrade refusal pass. Development identity
  and unrelated catalogue are preserved; no destructive reset/real-data repair.
- Diagnostics: random synthetic accounts only; no auth screenshots/traces/video,
  configured secrets or record bodies printed. Final client scan246/0; built
  report5 JSON/21 step arrays/0 detailed. Private configs/note/venv/local data,
  reports/captures are ignored with0 private tracked files. Only.last-run metadata
  remains in test-results. Test ports closed before identity/lease-guarded
  synthetic cleanup;25 record tables empty/bootstrapunset. Development's25 record
  tables were inspected read-only and remain empty/bootstrapunset; no reset.

N/A in this slice, not passing claims: file permits/antivirus/cloud storage,
finance/import/export, real website/external messaging, worker/outbox, deals/
reservations/outcomes/overlap, load and backup/recovery. Their owning sprints
remain required. Actual devices, software keyboard and assistive-tech users are
not verified here. Scoped application security and final privacy checks pass.
Full npm audit remains9 inherited HIGH development-tool advisories,not clean;
runtime npm and both Python lock audits are clean. No dependency was added.

## Handoff

Found: SP-07's shared inventory/receipt/owner/campaign/merge boundaries were the
correct extension point. Changed: hierarchy/types/physical links, optional safe
briefing, separate whole-development offerings, API/UI/tests and linked contracts.
Verified: the final table above and [QA register](../../QA_COMMANDS.md). Fixed
functional defects and failed intermediate runs remain in the chronological record.
Security checked: current roles/scope, strict transport/input, SQL target integrity,
real races/retry/rollback, merge provenance, TLS, privacy and isolated cleanup.
Lessons saved: revision-matched fixtures, API readiness, bounded evidence,
record-keyed forms and observing rejection before its presentation.

Final documentation validation first rejected a shortened UI evidence-table
label. Restoring the required "UI skills and AFTER audit" label fixes the
documentation contract; the validator was not weakened. Corrected final result
is recorded in the QA register.

Remains: Khalid's independent product/design review and optional
[AFTER008 finding1](../../../anti-slop/audit-008-2026-10-15.md). No aesthetic-only
change was selected. Actual iPhone/Safari/software keyboard/assistive-tech users,
later core modules, full-product/load/recovery and deployment are not accepted.
Local app runs at HTTPS localhost:3000/8000; real administrator bootstrap remains
the user's private interactive operation. SP-09 is not started by this handoff.
