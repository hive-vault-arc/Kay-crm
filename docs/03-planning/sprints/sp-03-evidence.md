# SP-03 execution evidence

Status: technically_accepted, local SP-03 scope
Date: 2026-10-14
Product review: pending Khalid

## Focused case defined before implementation

C01/C13/C14, BR-01/02/29, AT-37 and scoped AT-02/23/26/39:
an intended administrator uses a real hidden double TTY prompt against a migrated
isolated installation. Exactly one account, credential, marker and non-secret
audit event commit. Non-TTY, invalid input, repeat, interruption and two concurrent
connections leave no partial/second administrator. A synthetic account signs in
through the HTTPS same-origin facade, refreshes a protected route, signs out and
cannot revisit it. Inspect cookie attributes without recording values. Exercise
generic invalid login, rate limiting, current account/credential state, expired
and revoked sessions, origin/CSRF denial, restricted password change and fresh
login. Preserve SP-01/02 shell, mobile navigation and real outage/recovery cases.

Allowed: identity migration/services/CLI/API, French auth forms and guards,
isolated fixtures/tests, documentation. No staff administration, production,
real-data operation, public bootstrap, seed account or external messaging.
The real first administrator chooses their own password interactively; no real
account or password is invented by this implementation.

## Implementation proposals to verify

- Argon2id via argon2-cffi; opaque 256-bit session tokens stored only as SHA-256
  hashes, seven-day absolute expiry. Domain-separated HMAC CSRF proof is bound
  to each session and held only transiently in browser memory.
- PostgreSQL atomic login counters: five attempts per normalized identity per
  fifteen minutes and a separate generous global facade budget. Counter keys
  are HMAC digests, not raw identity/IP. These thresholds are technical proposals,
  not new KAY business rules. Bound password input to 1,024 characters and auth
  JSON bodies to 8 KiB to bound resource usage.
- Host-only Secure/HttpOnly/SameSite=Lax cookie, no browser token persistence.
  Backend checks current role, active/handoff/credential state on every request.
- Browser traces/videos/automatic screenshots are disabled for secret-bearing
  flows. Explicit screenshots contain empty fields or post-login synthetic UI.
  Detailed API steps are omitted before HTML serialization because fill-step
  titles can also contain credentials even without a trace.

## UI skill plan

Read antislop, design-system-ops and design-taste-frontend completely. Reading
this as a quiet French KAY workroom for internal staff, preserving the existing
Radix/New York shadcn/Tailwind light-token system. ENERGY/RHYTHM/MOTION 1/1/1.
Design-taste marketing heroes, generated assets, typography/theme changes and
motion are inapplicable to the authenticated dashboard/admin/form surfaces.
Reuse shared fields, buttons, alerts, spacing, page headers and navigation.
The completed desktop/mobile/keyboard/touch/zoom evidence and
[AFTER audit 003](../../../anti-slop/audit-003-2026-10-14.md) are recorded below.

## Results

Backend quality, isolated PostgreSQL/migrations, lint/types/build and the complete
five-browser E2E gate pass. Visible Chrome, production-mode and AFTER-audit exit
evidence is finalized below; technical acceptance is not inferred from setup alone.

From `frontend/`, `npm run test:e2e` passed **70/70**, zero skipped, across
Chromium, installed Chrome/Edge, Firefox and WebKit in 12.3 minutes. An additional
`npm run test:e2e -- --grep 'keyboard form validation'` passed **5/5** in 55.7s,
explicitly delaying (not mocking) the real login request to verify disabled fields,
pending submit, keyboard action, safe generic failure and retry in every engine.
The final source also passes `npm run lint`, `npm run typecheck`, `npm run build`.
The build has seven route entries (`/`, `/_not-found`, `/[section]`,
`/api/v1/[...path]`, `/login`, `/change-password`, `/ui-checks`); auth/private
routes are dynamic and `/ui-checks` remains development-only and authenticated.

## Implementation and verified foundation

- `backend/app/identity/`: shared bootstrap service, Argon2id, atomic persistent
  sign-in budgets, current-session/role/credential checks and four auth handlers.
  `backend/app/cli/bootstrap_admin.py` requires real interactive hidden input;
  arguments/non-TTY/echo fallback refuse safely. The PowerShell `bootstrap` task
  uses the explicit project interpreter and does not accept a password parameter.
- `0002_identity`: six application-owned tables, empty agency only. Development
  downgrade is refused. The existing migration guard still rejects a development
  alias, unknown revision and nonempty unversioned database. Isolated up/down/up
  preserves an unrelated probe table; `alembic check` reports no new operations.
- French login/change-password forms reuse shadcn Form/Input/Button/Alert,
  RHF/Zod, current KAY layout/tokens and focus patterns. Per-page server guards
  preserve exact allowlisted return destinations; layout alone is not authority.
  Full navigation after sign-in/out clears client-route state. Browser proof is
  only the protected cookie; me-derived CSRF is transient, never RSC props/storage.
- Session monitoring handles absolute expiry, focus/visibility and restored pages.
  Current authorization is checked close to every page/API data request; redundant
  route-change polling was removed. Background requests are bounded and cancelled
  on unmount. An outage does not masquerade as session revocation.
- Test-only supervisor IPC creates/deletes UUID-namespaced actors through the
  explicit venv after resolving the isolated database identity. No bootstrap or
  fixture endpoint exists in either application. Passwords are runtime-random,
  not committed fixtures; credentials do not enter process arguments/environment.

Runtime verified: Node 24.13.1/npm 11.8.0, Next 16.4.0/React 19.3.1,
Tailwind 4.3.3/TypeScript 5.9.3/Playwright 1.64.1; Python 3.14.3 in
`backend/.venv`, FastAPI 0.143.1, SQLAlchemy 2.1.4, Alembic 1.20.0,
Pydantic 2.14.1, Argon2-cffi 25.1.0, pywinpty 3.0.5, pytest 9.1.1,
Ruff 0.17.0/mypy 1.20.2. Existing runtime and dev hash locks were regenerated
and installed; `pip check`, both Python audits and runtime npm audit pass.
The full npm audit still has the nine previously recorded high development-tool
entries; no forced downgrade or runtime vulnerability is hidden by that result.

Browser executables: Chromium 156.0.8078.4, installed Chrome 155.0.8059.79,
installed Edge 155.0.4283.45, Firefox 157.0 and WebKit 27.2.

Database verification: development OID 109060, test OID 109061, cluster
7607060034405909976, both at `0002_identity`. Unrelated catalog digest remains
`4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`.
Read-only development check: zero users and incomplete bootstrap, deliberately
ready for the intended administrator's hidden-prompt command. No development
reset/default administrator occurred. Benchmark/recovery targets remain separate.

From `backend/`, `.venv/Scripts/python.exe -m pytest --cov=app -q --tb=short`
passed **47/47**, zero skipped, 97% runtime coverage (CLI excluded from coverage,
but explicitly exercised in real ConPTY tests). Cases include 11/12-character
policy, invalid identity, real hidden-TTY success/weak/mismatch/interrupt/repeat,
non-TTY/argument/echo-fallback refusal, atomic bootstrap interruption and races,
existing-user/marker refusal, origin/facade/CSRF denial, generic bad sign-in,
current role/account/credential/temporary state, expiry/revocation, restricted
change/fresh sign-in, concurrent and interrupted password change, rate-limit race,
safe errors/logs, migrations and prior SP-02 regression.
Final role predicates explicitly preserve administrator inheritance of manager
business authority while rejecting manager/agent access to administrator-only
operations; all three roles have direct PostgreSQL-backed tests.
Ruff check/format, strict mypy (23 modules), lint/types/optimized build also pass.

## Defects corrected and platform limits

- Real ConPTY requires Return, not a CRLF pair; fixed the test keyboard input.
  No alternate non-interactive password intake was added to the CLI.
- Hydration could replace values typed before controls were ready. Auth inputs
  are disabled until hydrated and during submission; browser helpers wait for
  hydration, page load and real readiness before starting another navigation.
- Assertions must distinguish the actual form alert from Next's route announcer.
  Primitive URL polling and privacy teardown avoid input-bearing failure context.
- A generated failure diagnostic briefly captured an ephemeral synthetic password
  before the stronger privacy guard was installed. The actor was removed, and
  clean-output reruns replace those artifacts. No real credential was used. This
  correction is recorded in AGENT_LESSONS and the high-risk root rule; do not
  claim the initial diagnostic was safe or preserve it in delivery evidence.
- Dual-stack localhost connection failure produced a Next/Node AggregateError
  during an actual API outage. The verified IPv4 loopback family is now explicit
  in server HTTPS transport; hostname/CA verification stays enabled. Focused real
  outage/recovery checks pass with no false success or false cookie expiry.
- Native Windows WebKit reports SameSite=None even when the server sends Lax.
  A separate non-secret HTTPS probe reproduced this for canonical/lowercase Lax;
  [Playwright's own tests](https://github.com/microsoft/playwright/blob/main/tests/library/browsercontext-cookies.spec.ts#L110)
  explicitly mark this native-Windows reporting limitation. Every target checks
  the actual Lax Set-Cookie header without its value; Chrome/Edge/Chromium/Firefox
  additionally report Lax. WebKit still exercises sign-in/refresh/revocation and
  CSRF, but this is not proof of native Safari SameSite enforcement. Actual
  iPhone/Safari and assistive-technology user testing remain outside local emulation.
- Earlier broad-run failures are not accepted results. A 12-case focused
  Firefox/WebKit rerun passed after fixes; final full-stack and visible review
  results are recorded below when complete. No application console warning/error
  is broadly filtered to obtain a pass.

## UI system and visual verification record

The three required skills were read completely from the installed paths linked in
the sprint. Design-system-ops references read: spacing/layout, component anatomy,
responsive/accessibility and visual quality. Existing responsive, React performance,
uncodixfy and Playwright guidance was also applied, without installing extra skill
bundles. The supplied KAY logo reference and running pre-change login were viewed.
The auth surfaces extend the existing light system, not a brand redesign.

| Surface / task | System reuse / applicability |
|---|---|
| S01 login and SC01 change-password | Existing entry width 32rem, page gutters 16/24/32px, parent grid gap-8 and related form gap-6; shared shadcn Form/Input/Button/Alert. Fluid single column, 48px fields and 44px buttons; no new CSS/geometry tokens. |
| S02 initial dashboard / authenticated sidebar | Existing 240px desktop rail and 1,024px sheet breakpoint, page header/data state/real service status; current role determines safe empty copy and administrator-only unavailable Settings label. No chart/KPI/fictional record. |
| Mobile own-password access and logout | Existing Sheet/Button/Link anatomy, Escape/containment/focus return, visible 44px actions; password change is available through both rail and sheet. |
| Denied, pending and failure states | Explicit French validation, pending disabled controls, generic auth error, rate limit, session redirect, service failure/retry, denied Settings and restricted change/fresh sign-in. No false save or manufactured empty database response on failure. |
| Design-taste exclusions | Dashboard, admin/table and multi-step product surfaces are outside its stated scope. This one-task internal login uses form clarity/hierarchy only, not marketing heroes/assets/animation, alternate libraries or themes. KAY's light-only/system sans/Lucide choices override generic defaults. |
| Charts / imagery / destructive data action | N/A in this slice: no approved KPI dataset or chart, no new imagery/logo, no data-deletion control. Bklit remains mandatory when charts arrive in SP-17. Logout is not a destructive record operation. |

Contrast recalculated from the actual JSON tokens: primary body/canvas 14.08:1,
secondary/canvas 6.11:1, primary button 14.94:1, danger 6.73:1, focus/white 6.50:1,
input border/white 4.54:1 and restricted warning/canvas 5.85:1. No new palette,
remote font, theme toggle or custom CSS was introduced. Explicit desktop/mobile
captures, 200% zoom and AFTER audit are recorded below.

## Security boundary record

Task C01/C13/C14, BR-01/02/29; contracts read include permissions, W01, API/data/
architecture, SECURITY_CHECK, acceptance variants and bootstrap runbook.

| Boundary | Evidence / limit |
|---|---|
| Bootstrap and credentials | 47-test backend suite includes actual hidden ConPTY, refusal states, PostgreSQL lock/race/rollback and Argon2id. Exactly one complete account or none. No public route/default/startup seed or real administrator created. |
| Sessions, role and restricted state | Random hashed proof, database absolute-seven-day constraint, current account/role/version/credential/handoff/temporary expiry, logout and all-session password-change revocation. Interrupted/racing change remains atomic. |
| Facade, Origin and CSRF | Denied direct calls, wrong/missing Origin, missing/forged/other-session CSRF; allowlisted paths/fields only. Server-only facade secret and explicit CA; IPv4 loopback is verified, not a TLS-verification bypass. |
| Logs and browser evidence | Fixed safe errors/audit shapes, redaction assertions that do not echo a leaked value on failure; snapshots/steps/traces suppressed as described. Git exclusion verified for private note, .env, .local-data and browser artifacts. Client-chunk scan reads the configured secret privately and prints only a safe count/result. |
| Data/migrations | Real resolved isolated identity before fixture DDL, no SQLite, preserved unrelated catalog and guarded revisions. Development identity downgrade refused. App-owned schema matches metadata. |
| Outage/retry | Actual API stop/restart, no cookie-clearing 503, no private shell while server identity cannot be checked, explicit retry and eventual real recovery. |
| Other permission/file/finance/import/connector/restore boundaries | N/A for implementation: no such product route or record is added. Later AT-02/26/38/39 variants remain assigned to their sprints; this does not accept full scenarios or production privacy/deployment controls. |

Residual local risks: the pre-existing PostgreSQL installation role is privileged
and PostgreSQL service networking was not reconfigured; application listeners are
loopback-only. The private development CA is not installed into system trust.
Real-data retention/deployment/least privilege and actual Safari/device validation
remain separate, alongside the existing nine development-tool advisories.

## Final browser, visual and delivery evidence

- `npm run test:chrome`: **16/16** passed, zero skipped, 2.4 minutes, actual
  installed Chrome 155 headed in disposable contexts. Includes all auth/role/
  session/facade/outage cases plus desktop 1440x900, mobile touch 360x800,
  320/360/768/1024/1440 reflow, keyboard/focus and actual browser zoom.
- `npm run test:chrome -- --grep 'visible Chrome|visible login'`: **2/2** passed,
  39.1s, with additional rail/sheet own-password link clicks, touch logout,
  restricted-screen empty-field desktop/mobile captures and normal browser Back.
  This extends the two existing review cases rather than inventing another count
  of distinct product scenarios. Safe captures were viewed individually.
- Zoom: baseline DPR 2 and CSS width 1427; 200% DPR 4 and width 713; overflow false.
  Ready/recheck, menu, Escape/focus return, logout and empty login worked at zoom.
  The Windows high-DPI PNG crop is supplemental, not substituted for interaction
  and viewport measurements.
- Built-app HTTPS smoke: after `npm run build`, set `KAY_E2E_PRODUCTION=1` and run
  `npm run test:e2e -- --project=chrome --grep 'protected redirect|restricted change|auth outage|@shell'`,
  then remove that environment variable. **7/7** passed, zero skipped, 56.5s.
  The real local production-mode Next HTTPS wrapper talks to the isolated real
  API/database; cookies, refresh, logout/replay, restricted change, outage/retry,
  protected navigation, keyboard/sheet and responsive shell work in the build.
- HTML report privacy inspection decoded its embedded ZIP **without printing
  values**: seven result step arrays, zero detailed/input-bearing steps. Only
  `.last-run.json` remains in the final test-results directory: no trace, video,
  screenshot-on-failure or error-context artifact. Explicit safe PNGs live in
  ignored output/playwright. This verifies the final report guard, not the
  unsafe initial diagnostic described above.
- Historical client-chunk scan: 22 JavaScript chunks in top-level static outputs
  checked privately against the configured facade secret, no match; no secret
  value printed. Git check-ignore confirms private note/env/runtime/captures are
  ignored; git ls-files for those private paths is empty. No commit/push occurred.
  Correction during SP-04: this historical scan did not descend into Next 16's
  nested dev/static roots. The expanded scan of both production and development
  trees is recorded in [SP-04 evidence](sp-04-evidence.md); do not treat the earlier
  count as complete development-bundle coverage.
- [AFTER audit 003](../../../anti-slop/audit-003-2026-10-14.md): HIGH 0 / MEDIUM 0 /
  LOW 0 numbered aesthetic findings; no audit-only fixes or Khalid approval.
  Current product/design review remains pending.

New bootstrap and own-password-change race tests also hold the relevant row in a
separate PostgreSQL connection and observe **two actual lock waiters** in
pg_stat_activity before release. They do not count two sequential thread calls as
evidence of lock contention. The full backend suite is rerun after this harness
strengthening; the result remains 47 passing cases with 97% runtime coverage.

## Handoff

Final read-only handoff checks on 2026-10-14: development and isolated test
databases each have zero users, zero sessions and an unset bootstrap marker.
The restarted local HTTPS services are ready on ports 3000 and 8000; the backend
TLS/readiness smoke passes, `/login` returns 200 and signed-out `/dashboard`
emits the safe login redirect. Next's streamed HTML response can carry that
redirect with HTTP 200, so the final HTTP probe checks the redirect marker and
destination, not only a 307/308 status. The earlier real-browser redirect tests
remain authoritative. Test service ports 3100, 8100 and 8101 are stopped.
The final documentation validator passes 981 local links, 70 approved skill
links, 22 sprint records, 41 AT mappings, 13 Mermaid pairs and nine JSON examples.

No remaining known in-scope functional defect after the final reruns. The first
administrator has deliberately not been invented or seeded. From an interactive
terminal in `backend/`, run `scripts/kay.ps1 -Task bootstrap`, choose your own
password at the hidden prompts and sign in at `https://localhost:3000`.
Do not put that password in arguments, environment, files, screenshots or chat.
SP-04 staff management/handoff is not started. Deployment, real-data use, actual
devices/Safari and Khalid's product/design review remain separate.
