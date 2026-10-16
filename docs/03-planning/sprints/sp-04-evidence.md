# SP-04 execution evidence

Status: technically_accepted for local SP-04; product/design review pending
Date: 2026-10-14

## Outcome and pre-implementation case

C01/C13/C14, BR-01/02/06, AT-01/02/38 and scoped AT-23. Implement only
administrator staff management, retaining SP-03 bootstrap/authentication.
No real staff, external delivery, production access, SP-05 or scheduling settings.
Read: sprint, root/domain instructions, index/scope/decisions, W01, permissions,
business rules, identity API/data/architecture, bootstrap runbook, acceptance,
coding standards, harness, QA, lessons, security, design/screen/component sources.

Focused real-stack E2E defined before implementation: synthetic administrator
opens Settings and numbered users, creates a named agent, sees the generated
credential once, verifies pending login denial, confirms fictional in-person
handoff, signs in restricted, changes password, signs in freshly, then disables
the account and verifies the old session fails. Complement with manager/agent
copied URL and direct API denial, reset wrong/correct administrator password,
expired/lost display recovery, role revocation, stale versions, safe retries,
interruption/rollback and competing last-administrator mutations in PostgreSQL.
No browser input snapshots, traces, videos or automatic screenshots; one-time
secrets must also be cleared before any explicit visual capture.

## Implementation proposals

- Serialize account commands on the singleton agency row, then lock actor/target
  users in UUID order and recheck current authorization. This keeps last-admin
  decisions and actor demotion/reset races consistent.
- Use expected versions and actor-scoped idempotency receipts. Never persist a
  plaintext credential to satisfy replay: create/reset replay returns a safe
  ONE_TIME_RESULT_UNAVAILABLE conflict, requiring password-confirmed reset if
  the first response was lost. Non-secret command results can replay safely.
- Only a final-password active administrator counts as the durable last-admin
  safeguard, so an expiring temporary administrator cannot strand the team.
- Edit name/email/role; deactivate with its dedicated command. Reactivation of
  disabled staff uses reset followed by confirmed handoff, not a state bypass.

## UI skills and direction

Read the complete installed antislop, design-system-ops (and geometry/anatomy/
responsive/visual references), design-taste-frontend, responsive standards,
uncodixfy, React performance and Playwright instructions. No skill bundle added.
Design-taste excludes these admin/table/multi-step product surfaces; no marketing
composition, image generation, alternate library or forced animation applies.
Reading this as: named staff administration for KAY administrators, in the
existing quiet light workroom language, ENERGY 1 / RHYTHM 1 / MOTION 1.
Reuse the shared shell/PageHeader/DataState/DataTable, shadcn primitives,
semantic theme, form width, 8px rhythm and project breakpoints. No charts needed.
Antislop runs AFTER the completed UI; numbered aesthetic fixes need Khalid's
selection. Functional/accessibility fixes remain required. Product review pending.

## Verification

Execution results below are scoped to local SP-04; SP-03 evidence remains
historical. Final technical gates pass; no product/design approval is inferred.

### Executed so far

- Backend explicit venv Python 3.14.3: `-m ruff check .`, `-m ruff format --check .`,
  `-m mypy app` (26 modules), `-m pip check`: exit 0. `-m pytest --cov=app -q --tb=short`:
  **60/60**, zero skipped, 93.86s, 97% runtime coverage. Thirteen SP-04 cases/variants
  plus all 47 earlier cases. CLI remains separately exercised by actual ConPTY.
- Final strengthened backend rerun: **62/62**, zero skipped, 86.82s, still 97%
  runtime coverage. Fifteen SP-04 cases/variants plus the earlier 47. The extra
  probes prove a waiting actor demoted before lock release cannot commit an
  administrator action, and a repeated reset never reissues/retrieves plaintext
  or duplicates the reset audit/version effects.
- Real migrations: test suite upgrades/downgrades/upgrades 0003, preserves unknown
  probe, rejects unknown/unversioned/development aliases; Alembic check reports no
  new operations. Development inspected before/after, moved 0002 → 0003 without
  account seeding or resets. Cluster 7607060034405909976 / development OID 109060;
  unrelated catalogue hash remains
  `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
- Frontend `npm run lint`, `npm run typecheck`, `npm run build`: exit 0, strict
  build with 11 manifest entries, including the four new dynamic settings routes.
- Clean full `npm run test:e2e`: **95/95**, zero skipped, 20.3m. Nineteen cases
  each on Chromium, installed Chrome, installed Edge, Firefox and native Windows
  WebKit. Includes all 14 previous cases plus five staff lifecycle/recovery/role/
  failure/pagination cases. Test servers use real isolated PostgreSQL, FastAPI
  HTTPS/facade and Next HTTPS, with no mock auth/business responses.
- Final frontend lint/typecheck/build rerun after the pagination/editor and test
  privacy corrections also exits 0. Private client scan expanded to production
  and nested development static roots passes **162 JavaScript files** with no
  configured facade secret; only count/result printed. The earlier top-level-only
  scan's wording was corrected in SP-03 evidence, not called complete dev coverage.
- Initial focused Chrome run 2/4 failed on harness synchronization (not field
  cleanup completion and prior actor cookie). Corrected rerun **4/4** passed,
  1.3m. Subsequent real-row pagination and visual tests join the final gate.
- Initial reset-interruption test failed to raise; corrected actual after-flush
  interruption now passes in the 60-case full suite. No failure is counted as pass.
- Official Zod and SQLAlchemy 2.1 docs were reviewed; linked RHF page returned 403
  and TanStack latest introduction returned 404. Existing pinned RHF/Zod/TanStack
  integration and installed types, plus vendored shadcn sources, were inspected.
  No dependency or alternative library was installed. No production access.
- Broader run exposed the stale SP-02 unknown-route assertion (`/users` is now
  implemented); changed its probe to `/not-implemented`. Stopped that run rather
  than claim acceptance. The focused headed integration plus new visual review
  pass **2/2**, 39.7s. Manual interruption also left disposable test actors:
  supervisor startup now invokes the existing identity-guarded synthetic cleanup,
  refusing any non-synthetic account or development target before writes. The
  clean full matrix is restarted after this correction, not counted prematurely.
- Review caught a current-page pagination edge case: reselecting the same page
  cleared the result without refetch. Current page is now explicitly disabled and
  navigate is a no-op for the same number; regression asserts that state. Editor
  is keyed by account UUID to prevent old form state surviving a route-ID change.

## Security boundary record

SECURITY_CHECK applies to identity, authorization, migrations, audit, retry data,
one-time displays and diagnostics. Backend authorization is authoritative.

| Boundary | Implemented checks/evidence |
|---|---|
| Administrator/current state | Every list/detail/command checks current full-session role. Transactions lock/re-read actor after waiting. Manager/agent direct-route and copied-URL cases; restricted sessions denied; self-password reset refuses the other-user path. |
| Temporary credentials | CSPRNG 192-bit password, Argon2id hash only, 24h expiry/pending gate, audited explicit handoff, restricted first session, change and fresh login. Expired activated proof cannot continue. Wrong admin password leaves target unchanged. |
| Revocation/attribution | Edit, disable and reset revoke sessions atomically; no DELETE endpoint, foreign keys restrict actor deletion. Tests preserve historical actor/target IDs and previous sessions/credential after interrupted reset. |
| Last administrator/races | Two separate PostgreSQL callers observed waiting at a held agency lock; competing disable AND demotion leave one durable active administrator. Temporary administrators do not satisfy the safeguard. |
| Retry/interruption | Versioned actor/key receipts use HMAC request digests, safe result projection, never plaintext. Same key/different body conflicts; create/reset replay cannot retrieve the password; non-secret replay does not duplicate changes. Actual after-flush interruption rolls back. |
| Transport/input | Facade authority, exact Origin, session-bound CSRF, strict named/versioned/reset schemas, UUID routes/keys, bounded bodies/responses, controlled headers and explicit verified CA. No public signup/bootstrap/proxy/delete or generic state patch. |
| Output/logs | GET projections and receipts omit plaintext/hashes. Safe error codes/French messages, no submitted password/error diagnostics. Private fields cleared before explicit capture; no trace/video/automatic screenshot/AI input snapshot/detailed report step. Final report inspection remains part of handoff. |
| Migrations/secrets | Guarded real identities; isolated up/down/up; development before/after unrelated-catalog hash unchanged. Private note/env/runtime/captures/reports are ignored and not tracked. No credential copied to docs or command arguments. |
| Records/files/finance/import/website/workers/restore | N/A: no such product workflow added. Permit invalidation after account changes and full restore/recovery remain later-sprint variants, not accepted by inference. |

Runtime npm audit reports zero vulnerabilities; both hash-locked Python audits
report no known vulnerabilities. Existing nine development-tool advisories remain
a residual from SP-01; no dependency change/forced downgrade in SP-04.
Actual staff identity/in-person delivery, actual Safari/devices, least-privilege
production configuration and deployment/privacy approvals remain separate.

Source-size review: users.py stays below 300 lines. Its command function retains
the cohesive locked transaction/replay/commit boundary; UserForm shares the named
fields for create/edit, and UserActions owns one consistent confirmation/command
state across its three actions. No speculative cross-product abstraction added.

## UI system and visual review

The current empty login and supplied KAY reference logo were viewed before UI
changes. Existing identity/text treatment is preserved; no new asset or font.
New standard primitives derive from the pinned shadcn New York NativeSelect and
AlertDialog sources; Radix handles focus/semantics, Tailwind handles styling.
Form controls reuse h-field (48px), buttons min-h-control (44px), page shell
16/24/32px gutters, max-w-reading and max-w-entry, 4/8/16/24/32px gaps and semantic
colors. Dialog viewport clearance is a shared primitive's one-rem bound, with
height limited to the usable viewport and a scrollable body, not feature offsets.
No new custom CSS or charts; Bklit N/A. The fixed shell and navigation collapse
remain unchanged except the now-functional administrator Settings destination.

Reasons: a table compares role/state while keeping identity first; one shared form
keeps create/edit fields consistent; separate dangerous access controls distinguish
identity edits from deactivation. A bounded confirmation names the target and
effect, defaults to Cancel, contains focus and restores it on Escape. Temporary
password instructions explain the unusual delivery/recovery contract. Warning,
success and destructive colors denote actual state/effect, never decoration.

Focused headed review: desktop 1440x900; widths 320/360/768/1024/1440 with real
long French name; controls >=44px and dialog bounds inside each 900px viewport;
touch 360x800 Settings sheet navigation, list, edit, empty reset dialog, Cancel and
deactivation. Role changes and full credential flow run through the E2E cases.
Page/console-error collection in the focused review is empty. Safe captures viewed
individually under ignored frontend/output/playwright: sp04-users-desktop,
sp04-edit-desktop, sp04-disable-desktop, sp04-users-mobile, sp04-edit-mobile,
sp04-reset-mobile-empty, sp04-disabled-mobile. No credential display was captured.
Full-page overlay captures can extend in document coordinates; actual dialog
bounds/interaction are checked in the live viewport, not inferred from PNG height.
Final clean-fixture captures and actual 200% zoom were checked again in the final
headed gate before the AFTER audit.

Contrast recalculated from actual reused tokens: body/ivory 14.08:1, secondary
6.11, primary button 14.94, destructive button 6.52, warning/ivory 5.85,
success/ivory 5.81, danger/ivory 7.29, focus/white 6.50, input border/white 4.54.
This is token evidence plus screenshot/interaction review, not a claim of an
assistive-technology user study or real-device Safari certification.

## Final gates and handoff

Verified runtime versions: Node 24.13.1/npm 11.8.0, Next 16.4.0, React 19.3.1,
Tailwind 4.3.3, TypeScript 5.9.3, Playwright 1.64.1, RHF 7.90.0, Zod 4.6.7,
TanStack Table 8.21.3, Radix 1.8.1; Python 3.14.3, FastAPI 0.143.1,
SQLAlchemy 2.1.4, Alembic 1.20.0, Pydantic 2.14.1, Argon2-cffi 25.1.0,
Psycopg 3.3.6, pytest 9.1.1, Ruff 0.17.0, mypy 1.20.2; PostgreSQL 18.2.
Fresh isolated browser launches confirm Chromium 156.0.8078.4,
Chrome 155.0.8059.79, Edge 155.0.4283.45, Firefox 157.0 and WebKit 27.2.
No dependency/lockfile upgrade was needed in SP-04.

- `npm run test:chrome`: **22/22** passed, zero skipped, 3.8m. Installed isolated
  headed Chrome, all 19 E2E cases plus three visual reviews. Final clean-fixture
  screenshots were viewed again; user list contains only the two current review
  actors. Real 200% zoom: DPR 2→4, CSS viewport 1427→713, overflow false, create
  validation focus/controls worked. The high-DPI PNG crop is supplemental.
- Built HTTPS: after the successful build, set `KAY_E2E_PRODUCTION=1`, run
  `npm run test:e2e -- --project=chrome --grep 'SP04|protected redirect|restricted change|auth outage|@shell'`,
  then remove the environment variable. **12/12** passed, zero skipped, 1.9m.
  This covers all staff cases plus earlier auth/shell/real outage regressions
  against the built app and real isolated API/database, not a deployment.
- Final HTML report's embedded ZIP inspected privately: **12** result step arrays,
  **0** nonempty/detailed input-bearing arrays. Final test-results contains only
  `.last-run.json`, no failure context, trace, video, screenshot or zoom profile.
  Explicit safe PNGs remain in ignored output/playwright, never a credential view.
- Scoped security review complete: positive/negative identity/role/Origin/CSRF,
  current-state/race, last-admin, retry, interruption, hash/projection/log, migration
  and artifact checks above. No real data, external send, production access,
  secret disclosure, new dependency, commit or push.
- [AFTER audit 004](../../../anti-slop/audit-004-2026-10-14.md): HIGH 0 / MEDIUM 0 /
  LOW 1. Finding 1 proposes clearer mobile identity-column allocation for long
  names. It is pending Khalid's selection; no audit-only fix or approval was
  invented. Functional/accessibility checks pass independently. This is not an
  unqualified aesthetic approval.
- Guarded final synthetic test cleanup completed. Read-only counts afterward:
  development **0 users / 0 sessions / bootstrap marker unset**; isolated test
  likewise **0 / 0 / unset**. Development was not reset. No real administrator
  or staff account was seeded. First administrator remains a human operation.

Changed implementation boundaries: backend identity models/contracts/services/
router, 0003 migration, safe error/composition/body bound, isolated fixtures and
15 staff test variants; frontend four settings routes, shared users form/list/
commands/one-time display, NativeSelect/AlertDialog, typed facade/client/error/
safe-return/nav integration, five staff E2E and visible/zoom review extensions.
Contracts, runbook, QA, traceability and lessons are reconciled with these checks.

No remaining known in-scope functional defect. Remaining: Khalid's product/design
review and optional selection of audit finding 1, actual staff identity/in-person
handoff, real Safari/devices/assistive-technology testing, existing nine high
development-tool advisories, later least-privilege/network/privacy/deployment and
business/file/restore gates. SP-05 is not started.

First safe action from the project root: in an interactive terminal run
`backend/scripts/kay.ps1 -Task bootstrap` if not already initialized, choose your
own password privately at the hidden prompts, sign in at `https://localhost:3000`,
then open Paramètres → Tous les utilisateurs for local review. Never put the
password in chat, arguments, environment, files or screenshots. Reuse the existing
account if initialized; never reset development to bootstrap again.

Final handoff checks: both development/test are at 0003_user_administration on
distinct OIDs 109060/109061 in the recorded cluster; Alembic check again reports
no new operations and the unrelated catalog hash is unchanged. Restarted app
serves HTTPS localhost:3000/8000 on loopback; explicit-CA API smoke passes,
login returns 200, signed-out dashboard/users emit safe login redirects, and the
unauthenticated users facade returns 401. Next streamed redirects can have status
200, so the HTTP probe checks the safe redirect marker/destination too. Browser
redirect behavior is separately verified. Test ports 3100/8100/8101 are stopped.
Final expanded scan after restarting dev checks **165** client JavaScript files
across all four static roots, no configured facade secret and no value printed.
Private paths remain ignored/not tracked. Documentation validator passes **991**
local links (70 skill links), 22 sprints, 41 AT mappings, 13 Mermaid pairs and nine
JSON examples. SP-04 has zero unchecked task/acceptance/technical-exit boxes.
